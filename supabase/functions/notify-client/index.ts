// Supabase Edge Function: notify-client
// Sends transactional emails to the client for:
//   type=assignment   → driver assigned (existing flow)
//   type=no_show      → admin marked no-show, full fare will be charged
//   type=cancellation → client cancelled, fee will be charged
//
// Deploy:
//   npx supabase@latest functions deploy notify-client --no-verify-jwt
//
// Secrets required:
//   BREVO_API_KEY             = xkeysib-xxxxxxxxxxxx
//   FROM_EMAIL                = camachoengrandy@gmail.com
//   FROM_NAME                 = YMV Limo  (optional)
//   SUPABASE_URL              = (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY = (auto-injected)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey    = Deno.env.get('BREVO_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'camachoengrandy@gmail.com'
    const fromName  = Deno.env.get('FROM_NAME')  || 'YMV Limo'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!apiKey) throw new Error('Missing BREVO_API_KEY secret')

    const { bookingId, driverId, vehicleId, type = 'assignment', cancelFee } = await req.json()
    console.log('notify-client invoked:', { bookingId, type })
    if (!bookingId) throw new Error('Missing bookingId')

    // Fetch booking
    const bookingRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const bookings = await bookingRes.json()
    const booking  = bookings?.[0]
    if (!booking) throw new Error('Booking not found')
    if (!booking.passenger_email) throw new Error('Booking has no passenger email')

    // For assignment emails, also fetch driver + vehicle
    let driver:  Record<string, any> | null = null
    let vehicle: Record<string, any> | null = null

    if (type === 'assignment') {
      const [driverRes, vehicleRes] = await Promise.all([
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
      if (driverRes)  driver  = (await driverRes.json())?.[0]  ?? null
      if (vehicleRes) vehicle = (await vehicleRes.json())?.[0] ?? null
    }

    const { subject, html } = buildEmail({ booking, driver, vehicle, type, cancelFee })

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { 'api-key': apiKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: fromName, email: fromEmail },
        to:          [{ email: booking.passenger_email, name: booking.passenger_name || '' }],
        subject,
        htmlContent: html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Brevo error:', res.status, text)
      throw new Error(`Brevo error ${res.status}: ${text}`)
    }

    console.log('Email sent to:', booking.passenger_email, '| type:', type)
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('notify-client failed:', message)
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ── Dispatcher ────────────────────────────────────────────────────────────────

function buildEmail({ booking, driver, vehicle, type, cancelFee }: {
  booking:   Record<string, any>
  driver:    Record<string, any> | null
  vehicle:   Record<string, any> | null
  type:      string
  cancelFee?: number
}): { subject: string; html: string } {
  if (type === 'no_show') {
    return {
      subject: `No-show recorded – ${booking.booking_ref} | YMV Limo`,
      html:    buildNoShowHtml(booking),
    }
  }
  if (type === 'cancellation') {
    return {
      subject: `Booking cancelled – ${booking.booking_ref} | YMV Limo`,
      html:    buildCancellationHtml(booking, cancelFee ?? 0),
    }
  }
  if (type === 'reassignment') {
    return {
      subject: `Driver update for your trip – ${booking.booking_ref} | YMV Limo`,
      html:    buildAssignmentHtml(booking, driver, vehicle, true),
    }
  }
  if (type === 'review_request') {
    return {
      subject: `How was your ride? – ${booking.booking_ref} | YMV Limo`,
      html:    buildReviewRequestHtml(booking),
    }
  }
  // default: assignment
  return {
    subject: `Your YMV Limo ride is confirmed – ${booking.booking_ref}`,
    html:    buildAssignmentHtml(booking, driver, vehicle, false),
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

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

function tripDateStr(booking: Record<string, any>) {
  return booking.trip_date
    ? new Date(`${booking.trip_date}T${booking.trip_time || '00:00'}`)
        .toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : booking.trip_date
}

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table style="max-width:560px;margin:32px auto;padding:0 16px;width:100%;border-collapse:collapse">
    <tr><td>${content}</td></tr>
  </table>
</body>
</html>`
}

function refBadge(ref: string) {
  return `<div style="text-align:center;margin:20px 0 24px">
    <span style="display:inline-block;background:#1e2535;border:1px solid #c5a059;border-radius:6px;padding:6px 20px;font-size:16px;font-weight:700;color:#c5a059;letter-spacing:.06em">${ref}</span>
  </div>`
}

function footer() {
  return `<p style="text-align:center;margin:32px 0 0;font-size:11px;color:#4b5563">
    YMV Limo · Houston, TX ·
    <a href="https://camachoeng.github.io/luxury-cars/pages/my-bookings.html" style="color:#c5a059;text-decoration:none">View my bookings</a>
  </p>`
}

// ── Assignment email ──────────────────────────────────────────────────────────

function buildAssignmentHtml(
  booking:        Record<string, any>,
  driver:         Record<string, any> | null,
  vehicle:        Record<string, any> | null,
  isReassignment: boolean = false,
): string {
  const isHourly = booking.dropoff?.startsWith('Hourly')
  const dateStr  = tripDateStr(booking)

  const tripRows = isHourly
    ? [row('Service', 'Hourly Charter'), row('Pickup', booking.pickup || '—'), row('Duration', booking.dropoff?.replace('Hourly – ', '') || '—'), row('Date', dateStr)]
    : [row('Service', 'Intercity Transfer'), row('From', booking.pickup || '—'), row('To', booking.dropoff || '—'), row('Date', dateStr)]

  const driverRows  = driver  ? [row('Name', driver.name || '—'), row('Phone', driver.phone || '—')] : [row('Driver', 'Will be confirmed shortly')]
  const vehicleRows = vehicle ? [row('Vehicle', vehicle.name || '—'), row('Class', vehicle.class || '—')] : [row('Vehicle', 'Will be confirmed shortly')]

  const subtitle = isReassignment ? 'Your driver has been updated' : 'Your ride is confirmed'
  const intro    = isReassignment
    ? `Hi <strong>${booking.passenger_name || 'there'}</strong>, we've assigned a new driver to your upcoming trip. Please review the updated details below.`
    : `Hi <strong>${booking.passenger_name || 'there'}</strong>, your booking is confirmed and your chauffeur has been assigned.`

  return emailWrapper(`
    <div style="text-align:center;padding:32px 0 24px">
      <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${subtitle}</p>
    </div>
    ${isReassignment ? `<div style="background:#1e2535;border-left:3px solid #c5a059;border-radius:4px;padding:10px 16px;margin-bottom:20px;text-align:center"><p style="margin:0;font-size:12px;color:#c5a059;font-weight:700">Driver Update Notice</p></div>` : ''}
    <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;text-align:center">
      ${intro}
    </p>
    ${refBadge(booking.booking_ref)}
    ${section('Trip Details',   tripRows.join(''))}
    ${section('Your Chauffeur', driverRows.join(''))}
    ${section('Your Vehicle',   vehicleRows.join(''))}
    <div style="margin-top:24px;background:#1e2535;border-left:3px solid #c5a059;border-radius:4px;padding:12px 16px">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Your driver will be at the pickup location <strong style="color:#f3f4f6">15 minutes before</strong> the scheduled time.
        For questions, contact us via <a href="https://wa.me/18587335033" style="color:#c5a059;text-decoration:none">WhatsApp</a> or call <a href="tel:+18587335033" style="color:#c5a059;text-decoration:none">+1 858 733 5033</a>.
      </p>
    </div>
    <div style="margin-top:12px;background:#1e2535;border-radius:4px;padding:12px 16px">
      <p style="margin:0;font-size:11px;color:#6b7280">
        <strong style="color:#9ca3af">Cancellation policy:</strong>
        Cancellations more than 6 hours before pickup incur a $20 admin fee.
        Cancellations within 6 hours of pickup are charged 50% of the fare.
        No-shows are charged the full fare.
        You can cancel anytime from your <a href="https://camachoeng.github.io/luxury-cars/pages/my-bookings.html" style="color:#c5a059;text-decoration:none">My Bookings</a> page.
      </p>
    </div>
    <div style="margin-top:16px;text-align:center">
      <a href="https://camachoeng.github.io/luxury-cars/pages/my-bookings.html"
         style="display:inline-block;border:1px solid #4b5563;border-radius:6px;padding:9px 22px;font-size:12px;color:#9ca3af;text-decoration:none">
        Manage or cancel this booking &rarr;
      </a>
    </div>
    ${footer()}
  `)
}

// ── No-show email ─────────────────────────────────────────────────────────────

function buildNoShowHtml(booking: Record<string, any>): string {
  const dateStr = tripDateStr(booking)
  const fare    = booking.fare_total != null ? `$${Number(booking.fare_total).toFixed(2)}` : 'the full estimated fare'

  return emailWrapper(`
    <div style="text-align:center;padding:32px 0 24px">
      <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
      <p style="margin:4px 0 0;font-size:13px;color:#ef4444">No-show recorded</p>
    </div>
    <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;text-align:center">
      Hi <strong>${booking.passenger_name || 'there'}</strong>, our driver was present at the scheduled pickup but the passenger was not found.
    </p>
    ${refBadge(booking.booking_ref)}
    ${section('Trip Details', [
      row('From',  booking.pickup  || '—'),
      row('To',    booking.dropoff || '—'),
      row('Date',  dateStr),
    ].join(''))}
    <div style="margin-top:24px;background:#1e2535;border-left:3px solid #ef4444;border-radius:4px;padding:12px 16px">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        Per our <strong style="color:#f3f4f6">no-show policy</strong>, the full fare of
        <strong style="color:#ef4444">${fare}</strong> will be charged to your card on file.
        If you believe this is an error, please contact us immediately via
        <a href="https://wa.me/18587335033" style="color:#c5a059;text-decoration:none">WhatsApp</a> or
        <a href="tel:+18587335033" style="color:#c5a059;text-decoration:none">+1 858 733 5033</a>.
      </p>
    </div>
    ${footer()}
  `)
}

// ── Review request email ──────────────────────────────────────────────────────

function buildReviewRequestHtml(booking: Record<string, any>): string {
  const ref        = booking.booking_ref || ''
  const reviewUrl  = `https://camachoeng.github.io/luxury-cars/pages/reviews.html?ref=${encodeURIComponent(ref)}`

  return emailWrapper(`
    <div style="text-align:center;padding:32px 0 24px">
      <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Your trip is complete</p>
    </div>
    <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;text-align:center">
      Hi <strong>${booking.passenger_name || 'there'}</strong>, thank you for riding with us! We hope your experience was exceptional.
    </p>
    ${refBadge(ref)}
    <div style="background:#1e2535;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
      <p style="margin:0 0 6px;font-size:13px;color:#9ca3af">How was your experience?</p>
      <p style="margin:0 0 20px;font-size:24px;color:#c5a059">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
      <a href="${reviewUrl}"
         style="display:inline-block;background:#c5a059;color:#0a0f16;border-radius:8px;padding:13px 32px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.02em">
        Leave a Review
      </a>
    </div>
    <div style="background:#1e2535;border-radius:4px;padding:14px 16px">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        Your review helps future passengers and motivates our team. It only takes 30 seconds.
      </p>
    </div>
    ${footer()}
  `)
}

// ── Cancellation email ────────────────────────────────────────────────────────

function buildCancellationHtml(booking: Record<string, any>, cancelFee: number): string {
  const dateStr = tripDateStr(booking)
  const feeStr  = `$${cancelFee.toFixed(2)}`

  return emailWrapper(`
    <div style="text-align:center;padding:32px 0 24px">
      <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Booking cancelled</p>
    </div>
    <p style="margin:0 0 8px;font-size:15px;color:#e2e8f0;text-align:center">
      Hi <strong>${booking.passenger_name || 'there'}</strong>, your booking has been cancelled as requested.
    </p>
    ${refBadge(booking.booking_ref)}
    ${section('Cancelled Trip', [
      row('From',  booking.pickup  || '—'),
      row('To',    booking.dropoff || '—'),
      row('Date',  dateStr),
    ].join(''))}
    <div style="margin-top:24px;background:#1e2535;border-left:3px solid #c5a059;border-radius:4px;padding:12px 16px">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        A cancellation fee of <strong style="color:#c5a059">${feeStr}</strong> will be charged to your card on file
        per our cancellation policy. If you have questions, contact us via
        <a href="https://wa.me/18587335033" style="color:#c5a059;text-decoration:none">WhatsApp</a> or
        <a href="tel:+18587335033" style="color:#c5a059;text-decoration:none">+1 858 733 5033</a>.
      </p>
    </div>
    ${footer()}
  `)
}
