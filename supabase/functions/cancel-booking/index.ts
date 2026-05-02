// Supabase Edge Function: cancel-booking
// Called by the client to cancel their own booking.
// Computes the cancellation fee server-side based on admin_settings,
// writes status='cancelled', cancelled_at, cancel_fee, then auto-charges
// the saved card via Stripe if a fee applies.
//
// Deploy:
//   npx supabase@latest functions deploy cancel-booking --no-verify-jwt
//
// Secrets:
//   STRIPE_SECRET_KEY         = sk_live_...  (optional — skips charge if missing)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the caller's JWT to get their user id
    const authHeader = req.headers.get('Authorization') || ''
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: authHeader },
    })
    if (!userRes.ok) throw new Error('Unauthorized')
    const { id: userId } = await userRes.json()
    if (!userId) throw new Error('Unauthorized')

    const { bookingId } = await req.json()
    if (!bookingId) throw new Error('Missing bookingId')

    // Fetch the booking (service role to bypass RLS)
    const bookingRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const bookings = await bookingRes.json()
    const booking  = bookings?.[0]

    console.log('booking:', booking?.id, '| status:', booking?.status, '| user_id:', booking?.user_id, '| caller:', userId)

    if (!booking)               throw new Error('Booking not found')
    if (booking.user_id !== userId) throw new Error('Forbidden')
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new Error(`Booking cannot be cancelled (status: ${booking.status})`)
    }

    const now = new Date()

    // Interpret trip date+time as Houston local time (America/Chicago, handles DST)
    const chicagoNow  = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const offsetMs    = now.getTime() - chicagoNow.getTime()
    const tripLocal   = new Date(`${booking.trip_date}T${booking.trip_time || '00:00'}:00`)
    const tripUtc     = new Date(tripLocal.getTime() + offsetMs)
    const hoursToTrip = (tripUtc.getTime() - now.getTime()) / (1000 * 60 * 60)

    console.log('hoursToTrip:', hoursToTrip.toFixed(2))
    if (hoursToTrip <= 0) throw new Error(`Trip has already passed`)

    // Fetch cancellation settings
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/admin_settings?key=in.(cancellation_fee,late_cancel_percent,late_cancel_window_hours)&select=key,value`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const settingsRows: { key: string; value: string }[] = await settingsRes.json()
    const settings: Record<string, number> = {}
    for (const row of settingsRows) settings[row.key] = parseFloat(row.value)

    const flatFee  = settings['cancellation_fee']         ?? 20
    const latePct  = settings['late_cancel_percent']      ?? 50
    const windowHrs = settings['late_cancel_window_hours'] ?? 6
    const fare     = parseFloat(booking.fare_total) || 0

    const cancelFee = hoursToTrip <= windowHrs
      ? parseFloat((fare * latePct / 100).toFixed(2))
      : flatFee

    // Update the booking
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          status:       'cancelled',
          cancelled_at: now.toISOString(),
          cancel_fee:   cancelFee,
        }),
      }
    )
    if (!updateRes.ok) {
      const text = await updateRes.text()
      console.error('DB update failed:', updateRes.status, text)
      throw new Error(`DB update failed: ${text}`)
    }
    console.log('Booking cancelled successfully, cancelFee:', cancelFee)

    // ── Auto-charge cancellation fee via Stripe ───────────────────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (cancelFee > 0 && stripeKey && booking.stripe_payment_method_id) {
      try {
        const stripe = new Stripe(stripeKey, {
          apiVersion: '2024-06-20',
          httpClient: Stripe.createFetchHttpClient(),
        })
        const amountCents = Math.round(cancelFee * 100)
        const description = hoursToTrip <= windowHrs
          ? `YMV Limo — Late cancellation fee (${latePct}% of fare) — ${booking.booking_ref}`
          : `YMV Limo — Cancellation admin fee — ${booking.booking_ref}`

        const pi = await stripe.paymentIntents.create({
          amount:         amountCents,
          currency:       'usd',
          customer:       booking.stripe_customer_id,
          payment_method: booking.stripe_payment_method_id,
          description,
          confirm:        true,
          off_session:    true,
        })

        await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
          method: 'PATCH',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stripe_payment_intent_id: pi.id,
            charged_at:               now.toISOString(),
            charged_amount:           cancelFee,
          }),
        })
        console.log('Cancellation fee charged:', cancelFee, 'for', booking.booking_ref)
      } catch (stripeErr) {
        // Log but don't fail — the cancellation itself succeeded
        console.error('Stripe charge failed for cancellation:', stripeErr instanceof Error ? stripeErr.message : stripeErr)
      }
    }

    // Notify client (non-blocking — don't fail the cancellation if email fails)
    fetch(`${supabaseUrl}/functions/v1/notify-client`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId, type: 'cancellation', cancelFee }),
    }).catch(e => console.warn('notify-client (cancellation) failed:', e))

    return new Response(
      JSON.stringify({ ok: true, cancelFee, hoursToTrip: parseFloat(hoursToTrip.toFixed(1)) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status  = ['Unauthorized', 'Forbidden'].includes(message) ? 403 : 400
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
