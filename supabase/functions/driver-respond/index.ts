// Supabase Edge Function: driver-respond
// Handles the Accept / Decline links from the driver assignment email.
// Called via GET from the driver's email client — no JWT required.
// Redirects to static pages on the YMV site so the browser always renders properly.
//
// Deploy:
//   npx supabase@latest functions deploy driver-respond --no-verify-jwt
//
// Secrets required:
//   SITE_URL                  = https://camachoeng.github.io/luxury-cars
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

  const url      = new URL(req.url)
  const token    = url.searchParams.get('token')
  const response = url.searchParams.get('response') // 'yes' | 'no'

  const siteUrl = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '')

  function redirect(page: string, params?: Record<string, string>): Response {
    const dest = new URL(`${siteUrl}/${page}`)
    if (params) Object.entries(params).forEach(([k, v]) => dest.searchParams.set(k, v))
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: dest.toString() } })
  }

  if (!token || !response) {
    return redirect('trip-error.html', { t: 'Invalid Link', m: 'This link is invalid or incomplete.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const headers     = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  try {
    // ── Fetch the assignment request by token ───────────────────────────────
    const reqRes = await fetch(
      `${supabaseUrl}/rest/v1/assignment_requests?token=eq.${token}&select=*`,
      { headers }
    )
    const rows: Record<string, any>[] = await reqRes.json()
    const request = rows?.[0]

    if (!request) {
      return redirect('trip-error.html', { t: 'Link Not Found', m: 'This link is not valid. It may have already been used.' })
    }

    if (request.status === 'accepted') {
      return redirect('trip-accepted.html')
    }

    if (request.status === 'declined') {
      return redirect('trip-declined.html')
    }

    if (request.status === 'expired' || new Date(request.expires_at) < new Date()) {
      if (request.status === 'pending') {
        await fetch(
          `${supabaseUrl}/rest/v1/assignment_requests?id=eq.${request.id}`,
          { method: 'PATCH', headers, body: JSON.stringify({ status: 'expired', responded_at: new Date().toISOString() }) }
        )
        // Advance the chain to the next driver now that this one is confirmed expired
        fetch(`${supabaseUrl}/functions/v1/auto-assign-driver`, {
          method: 'POST', headers,
          body: JSON.stringify({ bookingId: request.booking_id }),
        }).catch(() => {})
      }
      return redirect('trip-error.html', { t: 'Link Expired', m: 'This request has expired. The trip may have been assigned to another driver.' })
    }

    const now = new Date().toISOString()

    if (response === 'yes') {
      // ── ACCEPT ─────────────────────────────────────────────────────────────

      const driverRes = await fetch(
        `${supabaseUrl}/rest/v1/drivers?id=eq.${request.driver_id}&select=vehicle_id,name`,
        { headers }
      )
      const drivers = await driverRes.json()
      const driver  = drivers?.[0]

      await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${request.booking_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ driver_id: request.driver_id, vehicle_id: driver?.vehicle_id || null, status: 'confirmed' }),
      })

      await fetch(`${supabaseUrl}/rest/v1/assignment_requests?id=eq.${request.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ status: 'accepted', responded_at: now })
      })

      await fetch(`${supabaseUrl}/rest/v1/assignment_requests?booking_id=eq.${request.booking_id}&status=eq.pending&id=neq.${request.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ status: 'expired', responded_at: now })
      })

      // Detect reassignment: any prior requests exist for this booking besides the current one
      const priorRes = await fetch(
        `${supabaseUrl}/rest/v1/assignment_requests?booking_id=eq.${request.booking_id}&id=neq.${request.id}&select=id&limit=1`,
        { headers }
      )
      const priorRows = await priorRes.json()
      const isReassignment = Array.isArray(priorRows) && priorRows.length > 0

      fetch(`${supabaseUrl}/functions/v1/notify-client`, {
        method: 'POST', headers,
        body: JSON.stringify({
          bookingId:       request.booking_id,
          driverId:        request.driver_id,
          vehicleId:       driver?.vehicle_id || null,
          type:            isReassignment ? 'reassignment' : 'assignment',
        }),
      }).catch(() => {})

      fetch(`${supabaseUrl}/functions/v1/notify-driver`, {
        method: 'POST', headers,
        body: JSON.stringify({ bookingId: request.booking_id, driverId: request.driver_id }),
      }).catch(() => {})

      return redirect('trip-accepted.html')

    } else {
      // ── DECLINE ─────────────────────────────────────────────────────────────

      await fetch(`${supabaseUrl}/rest/v1/assignment_requests?id=eq.${request.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ status: 'declined', responded_at: now })
      })

      fetch(`${supabaseUrl}/functions/v1/auto-assign-driver`, {
        method: 'POST', headers,
        body: JSON.stringify({ bookingId: request.booking_id }),
      }).catch(() => {})

      return redirect('trip-declined.html')
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return redirect('trip-error.html', { t: 'Something Went Wrong', m: msg })
  }
})
