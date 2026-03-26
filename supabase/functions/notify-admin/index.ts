// Supabase Edge Function: notify-admin
// Sends a booking notification email to the admin via Resend.
//
// Deploy:
//   supabase functions deploy notify-admin --no-verify-jwt
//
// Set secrets (Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  = re_xxxxxxxxxxxx   (from resend.com → API Keys)
//   ADMIN_EMAIL     = your@email.com    (where you want to receive notifications)
//   FROM_EMAIL      = bookings@ymvlimo.com  (must be a verified Resend sender)
//                     Use "onboarding@resend.dev" for testing before domain setup

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey     = Deno.env.get('RESEND_API_KEY')
    const adminEmail = Deno.env.get('ADMIN_EMAIL')
    const fromEmail  = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'

    if (!apiKey || !adminEmail) {
      throw new Error('Missing RESEND_API_KEY or ADMIN_EMAIL secret')
    }

    const body = await req.json()
    const { booking, search, preferences, specialInstructions, passengerCount } = body

    const subject = `New Booking – ${booking.booking_ref} | ${booking.passenger_name}`
    const html    = buildEmailHtml({ booking, search, preferences, specialInstructions, passengerCount })

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `YMV Limo Bookings <${fromEmail}>`,
        to:      [adminEmail],
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
    // Always return 200 — notification failure must never block booking confirmation
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// ── Email builder ─────────────────────────────────────────────────────────────

interface BookingPayload {
  booking: Record<string, any>
  search: Record<string, any>
  preferences: Record<string, any>
  specialInstructions?: string
  passengerCount?: number
}

function buildEmailHtml({ booking, search, preferences, specialInstructions, passengerCount }: BookingPayload): string {
  const isHourly = search?.serviceType === 'hourly'

  const dateStr = booking.trip_date
    ? new Date(`${booking.trip_date}T${booking.trip_time || '00:00'}`)
        .toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : booking.trip_date

  const fareStr = booking.fare_total != null
    ? `$${Number(booking.fare_total).toFixed(2)}`
    : 'TBD'

  // Refreshments
  const refreshments: string[] = []
  if (preferences?.water) refreshments.push('Water')
  if (preferences?.soda)  refreshments.push('Soda')
  if (preferences?.chips) refreshments.push('Chips')
  if (preferences?.gum)   refreshments.push('Gum')

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
        row('Duration', `${search.hours}h`),
        row('Date',     dateStr),
      ]
    : [
        row('Service',  'Intercity Transfer'),
        row('From',     booking.pickup || '—'),
        row('To',       booking.dropoff || '—'),
        row('Date',     dateStr),
        ...(search.distanceMiles ? [row('Distance', `${Number(search.distanceMiles).toFixed(1)} mi  ·  ${search.durationText || ''}`)] : []),
      ]

  const passengerRows = [
    row('Name',       booking.passenger_name  || '—'),
    row('Phone',      booking.passenger_phone || '—'),
    row('Email',      booking.passenger_email || '—'),
    row('Party size', `${passengerCount ?? 1} passenger${(passengerCount ?? 1) !== 1 ? 's' : ''}`),
    row('Fare',       fareStr),
  ]

  const prefRows = [
    ...(refreshments.length            ? [row('Refreshments', refreshments.join(', '))]         : []),
    ...(preferences?.music             ? [row('Music',        preferences.music)]                : []),
    ...(preferences?.temperature       ? [row('Temperature',  preferences.temperature)]          : []),
    ...(preferences?.driver            ? [row('Driver style', preferences.driver)]               : []),
    ...(specialInstructions            ? [row('Notes',        specialInstructions)]              : []),
  ]

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
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280">New Booking Received</p>
        </div>

        <!-- Ref badge -->
        <div style="text-align:center;margin-bottom:24px">
          <span style="display:inline-block;background:#1e2535;border:1px solid #c5a059;border-radius:6px;padding:6px 20px;font-size:16px;font-weight:700;color:#c5a059;letter-spacing:.06em">
            ${booking.booking_ref}
          </span>
        </div>

        ${section('Trip Details', tripRows.join(''))}
        ${section('Passenger', passengerRows.join(''))}
        ${prefRows.length ? section('Preferences', prefRows.join('')) : ''}

        <!-- Footer -->
        <p style="text-align:center;margin:32px 0 0;font-size:11px;color:#4b5563">
          YMV Limo · Houston, TX · Manage bookings in the
          <a href="https://camachoeng.github.io/luxury-cars/pages/admin.html" style="color:#c5a059;text-decoration:none">Admin Dashboard</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
