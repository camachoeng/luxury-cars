// Supabase Edge Function: notify-driver
// Sends a booking assignment email to the driver via Resend.
// Called by the admin dashboard after a driver is assigned to a booking.
//
// Deploy:
//   npx supabase@latest functions deploy notify-driver --no-verify-jwt
//
// Secrets required (shared with notify-admin):
//   RESEND_API_KEY       = re_xxxxxxxxxxxx
//   FROM_EMAIL           = bookings@ymvlimo.com  (or onboarding@resend.dev for testing)
//   SUPABASE_URL         = (auto-injected by Supabase)
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
    const apiKey   = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!apiKey) throw new Error('Missing RESEND_API_KEY secret')

    const { bookingId, driverId } = await req.json()
    if (!bookingId || !driverId) throw new Error('Missing bookingId or driverId')

    // Fetch booking + driver using service role (bypasses RLS)
    const [bookingRes, driverRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      }),
      fetch(`${supabaseUrl}/rest/v1/drivers?id=eq.${driverId}&select=*`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      }),
    ])

    const [bookings, drivers] = await Promise.all([bookingRes.json(), driverRes.json()])
    const booking = bookings?.[0]
    const driver  = drivers?.[0]

    if (!booking) throw new Error('Booking not found')
    if (!driver)  throw new Error('Driver not found')
    if (!driver.email) {
      // No email on file — skip silently
      return new Response(JSON.stringify({ ok: false, error: 'Driver has no email on file' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch vehicle name if assigned
    let vehicleName = 'To be confirmed'
    if (booking.vehicle_id) {
      const vRes  = await fetch(`${supabaseUrl}/rest/v1/vehicles?id=eq.${booking.vehicle_id}&select=name`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      })
      const vehicles = await vRes.json()
      if (vehicles?.[0]?.name) vehicleName = vehicles[0].name
    }

    const subject = `New Assignment – ${booking.booking_ref} | YMV Limo`
    const html    = buildEmailHtml({ booking, driver, vehicleName })

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `YMV Limo <${fromEmail}>`,
        to:      [driver.email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Resend error ${res.status}: ${text}`)
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// ── Email builder ─────────────────────────────────────────────────────────────

function buildEmailHtml({ booking, driver, vehicleName }: {
  booking: Record<string, any>
  driver:  Record<string, any>
  vehicleName: string
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
        row('Service',  'Intercity Transfer'),
        row('From',     booking.pickup  || '—'),
        row('To',       booking.dropoff || '—'),
        row('Date',     dateStr),
      ]

  const passengerRows = [
    row('Name',        booking.passenger_name  || '—'),
    row('Phone',       booking.passenger_phone || '—'),
    row('Party size',  `${booking.passenger_count ?? 1} passenger${(booking.passenger_count ?? 1) !== 1 ? 's' : ''}`),
    ...(booking.special_instructions ? [row('Notes', booking.special_instructions)] : []),
  ]

  // Preferences
  const prefs = booking.preferences as Record<string, any> | null
  const prefRows: string[] = []
  if (prefs) {
    const refreshments: string[] = []
    if (prefs.water) refreshments.push('Water')
    if (prefs.soda)  refreshments.push('Soda')
    if (prefs.chips) refreshments.push('Chips')
    if (prefs.gum)   refreshments.push('Gum')
    if (refreshments.length)  prefRows.push(row('Refreshments', refreshments.join(', ')))
    if (prefs.music)          prefRows.push(row('Music',        prefs.music))
    if (prefs.temperature)    prefRows.push(row('Temperature',  prefs.temperature))
    if (prefs.driver)         prefRows.push(row('Driver style', prefs.driver))
  }

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
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280">You have been assigned a new trip</p>
        </div>

        <!-- Greeting -->
        <p style="margin:0 0 20px;font-size:15px;color:#e2e8f0;text-align:center">
          Hi <strong>${driver.name}</strong>, here are the details for your upcoming assignment.
        </p>

        <!-- Ref badge -->
        <div style="text-align:center;margin-bottom:24px">
          <span style="display:inline-block;background:#1e2535;border:1px solid #c5a059;border-radius:6px;padding:6px 20px;font-size:16px;font-weight:700;color:#c5a059;letter-spacing:.06em">
            ${booking.booking_ref}
          </span>
        </div>

        ${section('Trip Details', [...tripRows, row('Vehicle', vehicleName)].join(''))}
        ${section('Passenger', passengerRows.join(''))}
        ${prefRows.length ? section('Passenger Preferences', prefRows.join('')) : ''}

        <!-- Notice -->
        <div style="margin-top:24px;background:#1e2535;border-left:3px solid #c5a059;border-radius:4px;padding:12px 16px">
          <p style="margin:0;font-size:12px;color:#9ca3af">
            Please arrive <strong style="color:#f3f4f6">15 minutes early</strong>. Wear your uniform and ensure the vehicle is clean before pickup.
            Contact the office if you have any questions.
          </p>
        </div>

        <!-- Footer -->
        <p style="text-align:center;margin:32px 0 0;font-size:11px;color:#4b5563">
          YMV Limo · Houston, TX · This message was sent automatically when you were assigned to a booking.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
