// Supabase Edge Function: notify-reminder
// Called by pg_cron every 5 minutes.
// Finds confirmed bookings whose trip starts in ~30 min and sends
// reminder emails to both the driver and the client.
//
// Deploy:
//   npx supabase@latest functions deploy notify-reminder --no-verify-jwt
//
// Secrets required:
//   BREVO_API_KEY             = xkeysib-xxxxxxxxxxxx
//   FROM_EMAIL                = camachoengrandy@gmail.com
//   SUPABASE_URL              = (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY = (auto-injected)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Convert a Houston date + time string to a UTC Date.
// Uses America/Chicago offset: CDT = UTC-5 (Mar–Nov), CST = UTC-6 (Nov–Mar).
function houstonToUTC(dateStr: string, timeStr: string): Date {
  const dt    = new Date(`${dateStr}T${timeStr.substring(0, 5)}:00`)
  const month = dt.getMonth()
  const offset = (month >= 2 && month <= 10) ? 5 : 6
  return new Date(dt.getTime() + offset * 60 * 60 * 1000)
}

async function sendEmail(
  apiKey: string, fromEmail: string,
  toEmail: string, toName: string,
  subject: string, html: string,
): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: 'YMV Limo', email: fromEmail },
      to:          [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const apiKey      = Deno.env.get('BREVO_API_KEY')
  const fromEmail   = Deno.env.get('FROM_EMAIL') || 'camachoengrandy@gmail.com'
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const headers     = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing BREVO_API_KEY' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const now     = new Date()
    // 20–40 min window covers the 5-min cron granularity with margin for drift
    const cutLow  = new Date(now.getTime() + 20 * 60 * 1000)
    const cutHigh = new Date(now.getTime() + 40 * 60 * 1000)

    // Fetch confirmed bookings for today + tomorrow that haven't been reminded yet
    const today    = now.toISOString().slice(0, 10)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const bRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?status=eq.confirmed&reminder_sent_at=is.null` +
      `&trip_date=gte.${today}&trip_date=lte.${tomorrow}` +
      `&select=id,booking_ref,trip_date,trip_time,pickup,dropoff,passenger_name,passenger_email,driver_id,vehicle_id`,
      { headers },
    )
    const bookings: Record<string, any>[] = await bRes.json()

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0

    for (const booking of bookings) {
      if (!booking.trip_date || !booking.trip_time) continue

      const tripUTC = houstonToUTC(booking.trip_date, booking.trip_time)
      if (tripUTC < cutLow || tripUTC > cutHigh) continue

      // Mark reminder_sent_at first to prevent duplicate sends on concurrent cron runs
      await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${booking.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ reminder_sent_at: now.toISOString() }),
      })

      // Fetch driver + vehicle in parallel
      const [driverRes, vehicleRes] = await Promise.all([
        booking.driver_id
          ? fetch(`${supabaseUrl}/rest/v1/drivers?id=eq.${booking.driver_id}&select=name,phone,email`, { headers })
          : Promise.resolve(null),
        booking.vehicle_id
          ? fetch(`${supabaseUrl}/rest/v1/vehicles?id=eq.${booking.vehicle_id}&select=name,class`, { headers })
          : Promise.resolve(null),
      ])
      const driver  = driverRes  ? (await driverRes.json())?.[0]  ?? null : null
      const vehicle = vehicleRes ? (await vehicleRes.json())?.[0] ?? null : null

      const tasks: Promise<void>[] = []

      if (booking.passenger_email) {
        tasks.push(
          sendEmail(
            apiKey, fromEmail,
            booking.passenger_email, booking.passenger_name || '',
            `Your ride starts in 30 minutes \u2013 ${booking.booking_ref} | YMV Limo`,
            buildClientReminderHtml(booking, driver, vehicle),
          ).catch(e => console.error('Client reminder failed:', e.message))
        )
      }

      if (driver?.email) {
        tasks.push(
          sendEmail(
            apiKey, fromEmail,
            driver.email, driver.name || '',
            `Trip reminder \u2013 ${booking.booking_ref} starts in 30 minutes`,
            buildDriverReminderHtml(booking, driver),
          ).catch(e => console.error('Driver reminder failed:', e.message))
        )
      }

      await Promise.all(tasks)
      sent++
      console.log('Reminder sent for:', booking.booking_ref)
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('notify-reminder failed:', message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ── Shared email helpers ───────────────────────────────────────────────────────

const row = (label: string, value: string) =>
  `<tr>
    <td style="padding:8px 12px;color:#9ca3af;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
    <td style="padding:8px 12px;color:#f3f4f6;font-size:13px;vertical-align:top">${value}</td>
  </tr>`

const section = (title: string, rows: string) =>
  `<p style="margin:24px 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#c5a059">${title}</p>
   <table style="width:100%;border-collapse:collapse;background:#1e2535;border-radius:8px;overflow:hidden">
     ${rows}
   </table>`

function wrapper(content: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table style="max-width:560px;margin:32px auto;padding:0 16px;width:100%;border-collapse:collapse">
    <tr><td>${content}</td></tr>
  </table>
</body></html>`
}

function tripDateStr(booking: Record<string, any>): string {
  return booking.trip_date
    ? new Date(`${booking.trip_date}T${booking.trip_time || '00:00'}`)
        .toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : '&#8212;'
}

// ── Client reminder ────────────────────────────────────────────────────────────

function buildClientReminderHtml(
  booking: Record<string, any>,
  driver:  Record<string, any> | null,
  vehicle: Record<string, any> | null,
): string {
  const isHourly = booking.dropoff?.startsWith('Hourly')
  const tripRows = isHourly
    ? [row('Service', 'Hourly Charter'), row('Pickup', booking.pickup || '&#8212;'), row('Duration', booking.dropoff?.replace('Hourly \u2013 ', '') || '&#8212;')]
    : [row('Service', 'Intercity Transfer'), row('From', booking.pickup || '&#8212;'), row('To', booking.dropoff || '&#8212;')]

  return wrapper(`
    <div style="text-align:center;padding:32px 0 20px">
      <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Your ride is almost here</p>
    </div>
    <div style="background:#14291a;border:1px solid #22c55e;border-radius:8px;padding:14px 20px;text-align:center;margin-bottom:20px">
      <p style="margin:0;font-size:32px;font-weight:800;color:#22c55e">30 min</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">Your chauffeur arrives at the pickup location in approximately 30 minutes</p>
    </div>
    <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;text-align:center">
      Hi <strong>${booking.passenger_name || 'there'}</strong>, please be ready for your upcoming trip.
    </p>
    ${section('Trip Details', [...tripRows, row('Date', tripDateStr(booking))].join(''))}
    ${driver ? section('Your Chauffeur', [
      row('Name',  driver.name  || '&#8212;'),
      row('Phone', driver.phone || '&#8212;'),
    ].join('')) : ''}
    ${vehicle ? section('Your Vehicle', [
      row('Vehicle', vehicle.name  || '&#8212;'),
      row('Class',   vehicle.class || '&#8212;'),
    ].join('')) : ''}
    <div style="margin-top:24px;background:#1e2535;border-left:3px solid #22c55e;border-radius:4px;padding:12px 16px">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Your driver will be at the pickup location 15 minutes before the scheduled time.
        Questions? <a href="https://wa.me/18587335033" style="color:#c5a059;text-decoration:none">WhatsApp</a> or
        <a href="tel:+18587335033" style="color:#c5a059;text-decoration:none">+1 858 733 5033</a>.
      </p>
    </div>
    <p style="text-align:center;margin:32px 0 0;font-size:11px;color:#4b5563">
      YMV Limo &middot; Houston, TX &middot;
      <a href="https://camachoeng.github.io/luxury-cars/pages/my-bookings.html" style="color:#c5a059;text-decoration:none">My Bookings</a>
    </p>
  `)
}

// ── Driver reminder ────────────────────────────────────────────────────────────

function buildDriverReminderHtml(booking: Record<string, any>, driver: Record<string, any>): string {
  const isHourly = booking.dropoff?.startsWith('Hourly')
  const tripRows = isHourly
    ? [row('Service', 'Hourly Charter'), row('Pickup', booking.pickup || '&#8212;'), row('Duration', booking.dropoff?.replace('Hourly \u2013 ', '') || '&#8212;')]
    : [row('Service', 'Intercity Transfer'), row('From', booking.pickup || '&#8212;'), row('To', booking.dropoff || '&#8212;')]

  return wrapper(`
    <div style="text-align:center;padding:32px 0 20px">
      <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Trip reminder</p>
    </div>
    <div style="background:#1e2535;border-left:3px solid #c5a059;border-radius:4px;padding:14px 20px;margin-bottom:20px;text-align:center">
      <p style="margin:0;font-size:32px;font-weight:800;color:#c5a059">30 min</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">Your trip starts in approximately 30 minutes</p>
    </div>
    <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;text-align:center">
      Hi <strong>${driver.name}</strong>, here is your reminder for the upcoming assignment.
    </p>
    ${section('Trip Details', [...tripRows, row('Date', tripDateStr(booking))].join(''))}
    ${section('Passenger', [
      row('Ref',       booking.booking_ref || '&#8212;'),
      row('Name',      booking.passenger_name  || '&#8212;'),
      row('Phone',     booking.passenger_phone || '&#8212;'),
      row('Passengers', String(booking.passenger_count ?? 1)),
    ].join(''))}
    <div style="margin-top:24px;background:#1e2535;border-left:3px solid #c5a059;border-radius:4px;padding:12px 16px">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Please arrive <strong style="color:#f3f4f6">15 minutes early</strong>. Wear your uniform and ensure the vehicle is clean before pickup.
      </p>
    </div>
    <p style="text-align:center;margin:32px 0 0;font-size:11px;color:#4b5563">
      YMV Limo &middot; Houston, TX &middot; Automated trip reminder.
    </p>
  `)
}
