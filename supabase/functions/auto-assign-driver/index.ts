// Supabase Edge Function: auto-assign-driver
// Finds the next available driver by priority and sends them an Accept/Decline email.
// Called automatically after a booking is saved (checkout.js) and by driver-respond
// when a driver declines (to advance the chain to the next driver).
//
// Deploy:
//   npx supabase@latest functions deploy auto-assign-driver --no-verify-jwt
//
// Secrets required:
//   BREVO_API_KEY             = xkeysib-xxxxxxxxxxxx
//   FROM_EMAIL                = camachoengrandy@gmail.com
//   ADMIN_EMAIL               = camachoengrandy@gmail.com
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apiKey      = Deno.env.get('BREVO_API_KEY')
    const fromEmail   = Deno.env.get('FROM_EMAIL')  || 'camachoengrandy@gmail.com'
    const adminEmail  = Deno.env.get('ADMIN_EMAIL') || 'camachoengrandy@gmail.com'

    if (!apiKey) throw new Error('Missing BREVO_API_KEY secret')

    const { bookingId } = await req.json()
    if (!bookingId) throw new Error('Missing bookingId')

    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

    // ── 1. Fetch the booking ──────────────────────────────────────────────────
    const bookingRes = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`, { headers })
    const bookings   = await bookingRes.json()
    const booking    = bookings?.[0]
    if (!booking) throw new Error('Booking not found')

    // ── 2. Compute assignment deadline (booking time − 2 h, Houston/UTC) ─────
    const now              = new Date()
    const bookingUTC       = houstonToUTC(booking.trip_date, booking.trip_time)
    const assignDeadline   = new Date(bookingUTC.getTime() - 2 * 60 * 60 * 1000)

    // If we've already passed the assignment deadline, skip straight to admin
    if (assignDeadline <= now) {
      await sendEmail(
        apiKey, fromEmail, adminEmail, 'YMV Limo Admin',
        buildAdminFallbackEmail(booking, true),
        `⚠ Manual Assignment Required – ${booking.booking_ref} | YMV Limo`,
      )
      return new Response(
        JSON.stringify({ ok: true, message: 'Past assignment deadline — admin notified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Request expires at whichever is sooner: 2 h from now, or the assignment deadline
    const expiresAt = new Date(Math.min(
      now.getTime() + 2 * 60 * 60 * 1000,
      assignDeadline.getTime(),
    ))

    // ── 3. Mark expired pending requests for this booking ────────────────────
    await fetch(
      `${supabaseUrl}/rest/v1/assignment_requests?booking_id=eq.${bookingId}&status=eq.pending&expires_at=lt.${now.toISOString()}`,
      { method: 'PATCH', headers, body: JSON.stringify({ status: 'expired' }) }
    )

    // ── 4. Check if someone already accepted — nothing to do ─────────────────
    const acceptedRes = await fetch(
      `${supabaseUrl}/rest/v1/assignment_requests?booking_id=eq.${bookingId}&status=eq.accepted&select=id`,
      { headers }
    )
    const accepted = await acceptedRes.json()
    if (accepted?.length > 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'Already assigned' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── 5. Get IDs of drivers who already declined, accepted, or expired ─────
    const doneRes = await fetch(
      `${supabaseUrl}/rest/v1/assignment_requests?booking_id=eq.${bookingId}&status=in.(accepted,declined,expired)&select=driver_id`,
      { headers }
    )
    const doneRows: { driver_id: string }[] = await doneRes.json()
    const doneIds = doneRows.map(r => r.driver_id)

    // ── 6. Find next eligible driver (available, active, has email, by priority) ──
    const driversRes = await fetch(
      `${supabaseUrl}/rest/v1/drivers?is_active=eq.true&is_available=eq.true&email=not.is.null&select=id,name,email,vehicle_id,priority&order=priority.asc`,
      { headers }
    )
    const allDrivers: { id: string; name: string; email: string; vehicle_id: string | null; priority: number }[] = await driversRes.json()
    const nextDriver = allDrivers.find(d => !doneIds.includes(d.id))

    // ── 7. No available driver found → email admin ───────────────────────────
    if (!nextDriver) {
      await sendEmail(
        apiKey, fromEmail, adminEmail, 'YMV Limo Admin',
        buildAdminFallbackEmail(booking, false),
        `⚠ Manual Assignment Required – ${booking.booking_ref} | YMV Limo`,
      )
      return new Response(
        JSON.stringify({ ok: true, message: 'No available driver — admin notified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── 8. Create assignment_request record with computed expiry ─────────────
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/assignment_requests`, {
      method:  'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        booking_id: bookingId,
        driver_id:  nextDriver.id,
        expires_at: expiresAt.toISOString(),
      }),
    })
    const insertRows = await insertRes.json()
    const request    = insertRows?.[0]
    if (!request) throw new Error('Failed to create assignment request')

    // ── 9. Fetch vehicle name if the driver has one ───────────────────────────
    let vehicleName = 'To be confirmed'
    if (nextDriver.vehicle_id) {
      const vRes = await fetch(
        `${supabaseUrl}/rest/v1/vehicles?id=eq.${nextDriver.vehicle_id}&select=name`,
        { headers }
      )
      const vehicles = await vRes.json()
      if (vehicles?.[0]?.name) vehicleName = vehicles[0].name
    }

    // ── 10. Build accept/decline URLs ─────────────────────────────────────────
    const respondBase = `${supabaseUrl}/functions/v1/driver-respond`
    const acceptUrl   = `${respondBase}?token=${request.token}&response=yes`
    const declineUrl  = `${respondBase}?token=${request.token}&response=no`

    // ── 11. Send email to driver ──────────────────────────────────────────────
    const html = buildDriverRequestEmail({
      booking, driver: nextDriver, vehicleName, acceptUrl, declineUrl, expiresAt,
    })
    await sendEmail(apiKey, fromEmail, nextDriver.email, nextDriver.name, html, `Trip Request – ${booking.booking_ref} | YMV Limo`)

    return new Response(
      JSON.stringify({ ok: true, driverName: nextDriver.name }),
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

// ── Houston (America/Chicago) local time → UTC ────────────────────────────────
// Tries UTC-5 (CDT) and UTC-6 (CST); picks whichever round-trips correctly.

function houstonToUTC(tripDate: string, tripTime: string): Date {
  const [y, m, d]   = tripDate.split('-').map(Number)
  const [h, min]    = (tripTime || '00:00').split(':').map(Number)
  const fmt = (candidate: Date) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(candidate)

  for (const offsetH of [5, 6]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, h + offsetH, min))
    const [fh, fm]  = fmt(candidate).split(':').map(Number)
    if (fh === h && fm === min) return candidate
  }
  return new Date(Date.UTC(y, m - 1, d, h + 6, min)) // fallback: CST
}

// ── Send email via Brevo ──────────────────────────────────────────────────────

async function sendEmail(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  toName: string,
  html: string,
  subject?: string,
) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: 'YMV Limo', email: fromEmail },
      to:          [{ email: toEmail, name: toName }],
      subject:     subject || 'YMV Limo Notification',
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Brevo error ${res.status}: ${text}`)
  }
}

// ── Email: driver trip request ────────────────────────────────────────────────

function buildDriverRequestEmail({ booking, driver, vehicleName, acceptUrl, declineUrl, expiresAt }: {
  booking:     Record<string, any>
  driver:      Record<string, any>
  vehicleName: string
  acceptUrl:   string
  declineUrl:  string
  expiresAt:   Date
}): string {
  const isHourly = booking.dropoff?.startsWith('Hourly')

  const dateStr = booking.trip_date
    ? new Date(`${booking.trip_date}T${booking.trip_time || '00:00'}`)
        .toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : booking.trip_date

  // Show 60 min normally; show actual minutes only when the deadline is tighter
  const minutesLeft = Math.floor((expiresAt.getTime() - Date.now()) / 60000)
  const expiryMin   = Math.min(60, minutesLeft)

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
    ? [row('Service', 'Hourly Charter'), row('Pickup', booking.pickup || '—'), row('Duration', booking.dropoff?.replace('Hourly – ', '') || '—'), row('Date', dateStr)]
    : [row('Service', 'Intercity Transfer'), row('From', booking.pickup || '—'), row('To', booking.dropoff || '—'), row('Date', dateStr)]

  const urgentBanner = isUrgent ? `
      <div style="background:#7f1d1d;border:1px solid #ef4444;border-radius:6px;padding:10px 16px;margin-bottom:20px;text-align:center">
        <p style="margin:0;font-size:13px;font-weight:700;color:#fca5a5">
          ⚡ Urgent — you have ${expiryStr} to respond
        </p>
      </div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table style="max-width:560px;margin:32px auto;padding:0 16px;width:100%;border-collapse:collapse">
    <tr><td>

      <!-- Header -->
      <div style="text-align:center;padding:32px 0 24px">
        <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280">New trip request — your response needed</p>
      </div>

      <!-- Greeting -->
      <p style="margin:0 0 20px;font-size:15px;color:#e2e8f0;text-align:center">
        Hi <strong>${driver.name}</strong>, a new trip is available. Please confirm if you can take it.
      </p>

      <!-- Ref badge -->
      <div style="text-align:center;margin-bottom:24px">
        <span style="display:inline-block;background:#1e2535;border:1px solid #c5a059;border-radius:6px;padding:6px 20px;font-size:16px;font-weight:700;color:#c5a059;letter-spacing:.06em">
          ${booking.booking_ref}
        </span>
      </div>

      ${section('Trip Details', [...tripRows, row('Vehicle', vehicleName)].join(''))}
      ${section('Passenger', [
        row('Name',       booking.passenger_name  || '—'),
        row('Phone',      booking.passenger_phone || '—'),
        row('Party size', `${booking.passenger_count ?? 1} passenger${(booking.passenger_count ?? 1) !== 1 ? 's' : ''}`),
        ...(booking.special_instructions ? [row('Notes', booking.special_instructions)] : []),
      ].join(''))}

      <!-- Action buttons -->
      <div style="text-align:center;margin:32px 0 24px;display:flex;gap:16px;justify-content:center">
        <a href="${acceptUrl}"
           style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;letter-spacing:.02em">
          ✓ Accept Trip
        </a>
        <a href="${declineUrl}"
           style="display:inline-block;background:#1e2535;color:#9ca3af;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;border:1px solid #374151;letter-spacing:.02em">
          ✗ Decline
        </a>
      </div>

      <!-- Expiry notice -->
      <div style="background:#1e2535;border-left:3px solid #c5a059;border-radius:4px;padding:12px 16px;margin-bottom:24px">
        <p style="margin:0;font-size:12px;color:#9ca3af">
          This request expires in <strong style="color:#f3f4f6">${expiryMin} minutes</strong>.
          If you do not respond, the trip will be offered to the next available driver.
        </p>
      </div>

      <!-- Footer -->
      <p style="text-align:center;margin:32px 0 0;font-size:11px;color:#4b5563">
        YMV Limo · Houston, TX · Reply to this email if you have questions.
      </p>

    </td></tr>
  </table>
</body>
</html>`
}

// ── Email: admin fallback when no driver accepts ──────────────────────────────

function buildAdminFallbackEmail(booking: Record<string, any>, pastDeadline: boolean): string {
  const isHourly = booking.dropoff?.startsWith('Hourly')
  const dateStr  = booking.trip_date
    ? new Date(`${booking.trip_date}T${booking.trip_time || '00:00'}`)
        .toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : booking.trip_date

  const tripSummary = isHourly
    ? `Hourly Charter — ${booking.pickup} for ${booking.dropoff?.replace('Hourly – ', '')}`
    : `${booking.pickup} → ${booking.dropoff}`

  const reason = pastDeadline
    ? 'The 2-hour assignment window has passed. Assign a driver immediately or contact the client.'
    : 'All available drivers have declined or did not respond. Please assign a driver manually from the admin dashboard.'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table style="max-width:560px;margin:32px auto;padding:0 16px;width:100%;border-collapse:collapse">
    <tr><td>

      <div style="text-align:center;padding:32px 0 24px">
        <p style="margin:0;font-size:22px;font-weight:700;color:#f3f4f6">YMV <span style="color:#c5a059">Limo</span></p>
        <p style="margin:4px 0 0;font-size:13px;color:#ef4444">⚠ No driver assigned — action required</p>
      </div>

      <div style="background:#1e2535;border:1px solid #ef4444;border-radius:8px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#f87171">Booking without driver</p>
        <p style="margin:0 0 4px;font-size:14px;color:#f3f4f6;font-weight:700">${booking.booking_ref}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af">${booking.passenger_name} · ${booking.passenger_phone || booking.passenger_email}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af">${tripSummary}</p>
        <p style="margin:0;font-size:13px;color:#9ca3af">${dateStr}</p>
      </div>

      <p style="font-size:13px;color:#9ca3af;text-align:center">${reason}</p>

      <p style="text-align:center;margin:32px 0 0;font-size:11px;color:#4b5563">
        YMV Limo · Houston, TX
      </p>

    </td></tr>
  </table>
</body>
</html>`
}
