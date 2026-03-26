// Supabase Edge Function: notify-client
// Sends a booking confirmation email to the client when a driver and vehicle
// are assigned by the admin.
//
// Deploy:
//   npx supabase@latest functions deploy notify-client --no-verify-jwt
//
// Secrets required (shared with other notify-* functions):
//   RESEND_API_KEY            = re_xxxxxxxxxxxx
//   FROM_EMAIL                = bookings@ymvlimo.com  (or onboarding@resend.dev for testing)
//   SUPABASE_URL              = (auto-injected by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY = (auto-injected by Supabase)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey    = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!apiKey) throw new Error('Missing RESEND_API_KEY secret')

    const { bookingId, driverId, vehicleId } = await req.json()
    console.log('notify-client invoked:', { bookingId, driverId, vehicleId })
    if (!bookingId) throw new Error('Missing bookingId')

    // Fetch booking, driver, and vehicle in parallel
    const [bookingRes, driverRes, vehicleRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      }),
      driverId
        ? fetch(`${supabaseUrl}/rest/v1/drivers?id=eq.${driverId}&select=name,phone,email`, {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          })
        : Promise.resolve(null),
      vehicleId
        ? fetch(`${supabaseUrl}/rest/v1/vehicles?id=eq.${vehicleId}&select=name,class,image`, {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          })
        : Promise.resolve(null),
    ])

    const bookings = await bookingRes.json()
    const booking  = bookings?.[0]
    console.log('booking found:', !!booking, '| passenger_email:', booking?.passenger_email)
    if (!booking) throw new Error('Booking not found')
    if (!booking.passenger_email) throw new Error('Booking has no passenger email')

    const drivers  = driverRes  ? await driverRes.json()  : []
    const vehicles = vehicleRes ? await vehicleRes.json() : []
    const driver   = drivers?.[0]  ?? null
    const vehicle  = vehicles?.[0] ?? null

    const subject = `Your YMV Limo ride is confirmed – ${booking.booking_ref}`
    const html    = buildEmailHtml({ booking, driver, vehicle })

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `YMV Limo <${fromEmail}>`,
        to:      [booking.passenger_email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Resend rejected:', res.status, text)
      throw new Error(`Resend error ${res.status}: ${text}`)
    }

    console.log('Email sent to:', booking.passenger_email)
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('notify-client failed:', message)
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// ── Email builder ─────────────────────────────────────────────────────────────

function buildEmailHtml({ booking, driver, vehicle }: {
  booking: Record<string, any>
  driver:  Record<string, any> | null
  vehicle: Record<string, any> | null
}): string {
  const isHourly = booking.dropoff?.startsWith('Hourly')

  const dateStr = booking.trip_date
    ? new Date(`${booking.trip_date}T${booking.trip_time || '00:00'}`)
        .toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : booking.trip_date

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

  const tripRows = isHourly
    ? [
        row('Service',  'Hourly Charter'),
        row('Pickup',   booking.pickup || '—'),
        row('Duration', booking.dropoff?.replace('Hourly – ', '') || '—'),
        row('Date',     dateStr),
      ]
    : [
        row('Service', 'Intercity Transfer'),
        row('From',    booking.pickup  || '—'),
        row('To',      booking.dropoff || '—'),
        row('Date',    dateStr),
      ]

  const driverRows = driver
    ? [
        row('Name',  driver.name  || '—'),
        row('Phone', driver.phone || '—'),
      ]
    : [row('Driver', 'Will be confirmed shortly')]

  const vehicleRows = vehicle
    ? [
        row('Vehicle', vehicle.name  || '—'),
        row('Class',   vehicle.class || '—'),
      ]
    : [row('Vehicle', 'Will be confirmed shortly')]

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table style="max-width:560px;margin:32px auto;padding:0 16px;width:100%;border-collapse:collapse">
    <tr>
      <td>
        <!-- Header -->
        <div style="text-align:center;padding:32px 0 24px">
          <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Your ride is confirmed</p>
        </div>

        <!-- Greeting -->
        <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;text-align:center">
          Hi <strong>${booking.passenger_name || 'there'}</strong>, your booking is confirmed and your chauffeur has been assigned.
        </p>

        <!-- Ref badge -->
        <div style="text-align:center;margin:20px 0 24px">
          <span style="display:inline-block;background:#1e2535;border:1px solid #c5a059;border-radius:6px;padding:6px 20px;font-size:16px;font-weight:700;color:#c5a059;letter-spacing:.06em">
            ${booking.booking_ref}
          </span>
        </div>

        ${section('Trip Details', tripRows.join(''))}
        ${section('Your Chauffeur', driverRows.join(''))}
        ${section('Your Vehicle', vehicleRows.join(''))}

        <!-- Contact note -->
        <div style="margin-top:24px;background:#1e2535;border-left:3px solid #c5a059;border-radius:4px;padding:12px 16px">
          <p style="margin:0;font-size:12px;color:#9ca3af">
            Your driver will be at the pickup location <strong style="color:#f3f4f6">15 minutes before</strong> the scheduled time.
            For any questions, contact us via
            <a href="https://wa.me/18587335033" style="color:#c5a059;text-decoration:none">WhatsApp</a> or call
            <a href="tel:+18587335033" style="color:#c5a059;text-decoration:none">+1 858 733 5033</a>.
          </p>
        </div>

        <!-- Footer -->
        <p style="text-align:center;margin:32px 0 0;font-size:11px;color:#4b5563">
          YMV Limo · Houston, TX ·
          <a href="https://camachoeng.github.io/luxury-cars/pages/my-bookings.html" style="color:#c5a059;text-decoration:none">View my bookings</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
