// Supabase Edge Function: driver-respond
// Handles the Accept / Decline links from the driver assignment email.
// Called via GET from the driver's email client — no JWT required.
// Returns an HTML page (not JSON) so the driver sees a clean confirmation.
//
// Deploy:
//   npx supabase@latest functions deploy driver-respond --no-verify-jwt
//
// Secrets required:
//   SUPABASE_URL              = (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY = (auto-injected)

Deno.serve(async (req) => {
  const url      = new URL(req.url)
  const token    = url.searchParams.get('token')
  const response = url.searchParams.get('response') // 'yes' | 'no'

  if (!token || !response) {
    return htmlPage('Invalid Link', 'This link is invalid or incomplete.', 'error')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const siteUrl     = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '')
  const portalUrl   = siteUrl ? `${siteUrl}/pages/driver.html` : null
  const headers     = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  // ── Fetch the assignment request by token ─────────────────────────────────
  const reqRes = await fetch(
    `${supabaseUrl}/rest/v1/assignment_requests?token=eq.${token}&select=*`,
    { headers }
  )
  const rows: Record<string, any>[] = await reqRes.json()
  const request = rows?.[0]

  if (!request) {
    return htmlPage('Link Not Found', 'This link is not valid. It may have already been used.', 'error')
  }

  if (request.status === 'accepted') {
    return htmlPage('Already Accepted', 'You already accepted this trip. Check your email for the full assignment details.', 'info')
  }

  if (request.status === 'declined') {
    return htmlPage('Already Declined', 'You already declined this trip.', 'info')
  }

  if (request.status === 'expired' || new Date(request.expires_at) < new Date()) {
    // Mark as expired if not already
    if (request.status === 'pending') {
      await fetch(
        `${supabaseUrl}/rest/v1/assignment_requests?id=eq.${request.id}`,
        { method: 'PATCH', headers, body: JSON.stringify({ status: 'expired', responded_at: new Date().toISOString() }) }
      )
    }
    return htmlPage('Link Expired', 'This request has expired. The trip may have been assigned to another driver.', 'error')
  }

  const now = new Date().toISOString()

  if (response === 'yes') {
    // ── ACCEPT ──────────────────────────────────────────────────────────────

    // Fetch driver's vehicle_id for the booking update
    const driverRes = await fetch(
      `${supabaseUrl}/rest/v1/drivers?id=eq.${request.driver_id}&select=vehicle_id,name`,
      { headers }
    )
    const drivers = await driverRes.json()
    const driver  = drivers?.[0]

    // Update the booking: assign driver + vehicle, set status to confirmed
    await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${request.booking_id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          driver_id:  request.driver_id,
          vehicle_id: driver?.vehicle_id || null,
          status:     'confirmed',
        }),
      }
    )

    // Mark this request as accepted
    await fetch(
      `${supabaseUrl}/rest/v1/assignment_requests?id=eq.${request.id}`,
      { method: 'PATCH', headers, body: JSON.stringify({ status: 'accepted', responded_at: now }) }
    )

    // Expire all other pending requests for this booking (other drivers in the chain)
    await fetch(
      `${supabaseUrl}/rest/v1/assignment_requests?booking_id=eq.${request.booking_id}&status=eq.pending&id=neq.${request.id}`,
      { method: 'PATCH', headers, body: JSON.stringify({ status: 'expired', responded_at: now }) }
    )

    // Notify client (fire-and-forget)
    fetch(`${supabaseUrl}/functions/v1/notify-client`, {
      method:  'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: request.booking_id, driverId: request.driver_id, type: 'assignment' }),
    }).catch(() => {})

    // Notify driver with full assignment details (fire-and-forget)
    fetch(`${supabaseUrl}/functions/v1/notify-driver`, {
      method:  'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: request.booking_id, driverId: request.driver_id }),
    }).catch(() => {})

    return htmlPage(
      'Trip Accepted!',
      `You have been assigned to this trip. A full confirmation with all details has been sent to your email.`,
      'success',
      portalUrl,
    )

  } else {
    // ── DECLINE ─────────────────────────────────────────────────────────────

    // Mark this request as declined
    await fetch(
      `${supabaseUrl}/rest/v1/assignment_requests?id=eq.${request.id}`,
      { method: 'PATCH', headers, body: JSON.stringify({ status: 'declined', responded_at: now }) }
    )

    // Advance the chain: call auto-assign-driver for the next driver
    fetch(`${supabaseUrl}/functions/v1/auto-assign-driver`, {
      method:  'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: request.booking_id }),
    }).catch(() => {})

    return htmlPage(
      'Response Recorded',
      "Thanks for letting us know. We'll offer this trip to the next available driver.",
      'info',
      portalUrl,
    )
  }
})

// ── HTML response page ────────────────────────────────────────────────────────

function htmlPage(
  title:     string,
  message:   string,
  type:      'success' | 'info' | 'error',
  portalUrl: string | null = null,
): Response {
  const colors = {
    success: { border: '#16a34a', icon: '✓', iconColor: '#4ade80', badge: 'Trip Confirmed' },
    info:    { border: '#c5a059', icon: 'ℹ', iconColor: '#c5a059', badge: 'Noted'          },
    error:   { border: '#ef4444', icon: '!', iconColor: '#f87171', badge: 'Unavailable'    },
  }
  const c = colors[type]

  // On success: auto-redirect to driver portal after 3 s
  const autoRedirect = (type === 'success' && portalUrl)
    ? `<meta http-equiv="refresh" content="3;url=${portalUrl}">`
    : ''

  const redirectNote = (type === 'success' && portalUrl)
    ? `<p style="margin:0 0 20px;font-size:12px;color:#6b7280">Redirecting to your portal in 3 seconds…</p>`
    : ''

  const portalBtn = portalUrl
    ? `<a href="${portalUrl}"
         style="display:inline-block;background:#1152d4;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;letter-spacing:.02em;margin-bottom:24px">
         Go to Driver Portal
       </a>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${autoRedirect}
  <title>${title} — YMV Limo</title>
</head>
<body style="margin:0;padding:0;background:#0a0f16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center">
  <div style="max-width:420px;width:100%;margin:32px 16px;text-align:center">

    <!-- Icon -->
    <div style="width:72px;height:72px;border-radius:50%;border:2px solid ${c.border};margin:0 auto 24px;display:flex;align-items:center;justify-content:center;font-size:32px;color:${c.iconColor}">
      ${c.icon}
    </div>

    <!-- Brand -->
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f3f4f6">
      YMV <span style="color:#c5a059">Limo</span>
    </p>

    <!-- Badge -->
    <span style="display:inline-block;background:#1e2535;border:1px solid ${c.border};border-radius:20px;padding:3px 14px;font-size:11px;font-weight:700;color:${c.iconColor};letter-spacing:.06em;text-transform:uppercase;margin-bottom:20px">
      ${c.badge}
    </span>

    <!-- Title -->
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f3f4f6">${title}</h1>

    <!-- Message -->
    <p style="margin:0 0 16px;font-size:15px;color:#9ca3af;line-height:1.6">${message}</p>

    ${redirectNote}
    ${portalBtn}

    <!-- Footer -->
    <p style="font-size:11px;color:#4b5563">YMV Limo · Houston, TX · You may close this tab.</p>
  </div>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
