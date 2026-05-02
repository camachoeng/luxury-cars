// Supabase Edge Function: log-trip-event
// Called by the driver portal when the driver updates their trip status.
// Records the event in trip_events and triggers downstream actions:
//   dropped_off → auto-charge Stripe + send review request email to client
//   no_show     → update booking status + charge full fare + send no-show email
//
// Deploy:
//   npx supabase@latest functions deploy log-trip-event --no-verify-jwt
//
// Secrets required:
//   STRIPE_SECRET_KEY         = sk_live_...  (optional — skips charge if missing)
//   BREVO_API_KEY             = xkeysib-xxxxxxxxxxxx
//   FROM_EMAIL                = camachoengrandy@gmail.com
//   SUPABASE_URL              = (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY = (auto-injected)

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_EVENTS = ['arrived', 'picked_up', 'on_way', 'dropped_off', 'no_show'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const stripeKey   = Deno.env.get('STRIPE_SECRET_KEY')
  const headers     = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  try {
    // ── 1. Authenticate driver via Supabase JWT ───────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const jwt   = authHeader.replace('Bearer ', '')
    const parts = jwt.split('.')
    if (parts.length !== 3) throw new Error('Invalid JWT format')
    const payload   = JSON.parse(atob(parts[1]))
    const userEmail = payload.email as string | undefined
    if (!userEmail) throw new Error('Could not extract email from token')

    // ── 2. Parse and validate body ────────────────────────────────────────────
    const { bookingId, eventType, notes } = await req.json()
    if (!bookingId)                         throw new Error('Missing bookingId')
    if (!VALID_EVENTS.includes(eventType))  throw new Error(`Invalid eventType: ${eventType}`)

    // ── 3. Look up driver by email ────────────────────────────────────────────
    const driverRes = await fetch(
      `${supabaseUrl}/rest/v1/drivers?email=eq.${encodeURIComponent(userEmail)}&select=id,name`,
      { headers },
    )
    const drivers: Record<string, any>[] = await driverRes.json()
    const driver = drivers?.[0]
    if (!driver) throw new Error('No driver account associated with this user')

    // ── 4. Fetch booking and verify assignment ────────────────────────────────
    const bookingRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      { headers },
    )
    const bookings: Record<string, any>[] = await bookingRes.json()
    const booking = bookings?.[0]
    if (!booking)                        throw new Error('Booking not found')
    if (booking.driver_id !== driver.id) throw new Error('You are not assigned to this booking')
    if (['completed', 'cancelled'].includes(booking.status)) {
      throw new Error('This booking is already closed')
    }

    // ── 5. Insert trip event ──────────────────────────────────────────────────
    const eventRes = await fetch(`${supabaseUrl}/rest/v1/trip_events`, {
      method:  'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        booking_id: bookingId,
        driver_id:  driver.id,
        event_type: eventType,
        notes:      notes || null,
      }),
    })
    if (!eventRes.ok) {
      const text = await eventRes.text()
      throw new Error(`Failed to log event: ${text}`)
    }

    // ── 6. Terminal event: dropped_off ────────────────────────────────────────
    if (eventType === 'dropped_off') {
      await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'completed' }),
      })

      // Auto-charge via Stripe (non-blocking — log failure, don't throw)
      if (stripeKey && !booking.charged_at && booking.stripe_payment_method_id && booking.fare_total) {
        try {
          const stripe = new Stripe(stripeKey, {
            apiVersion:  '2024-06-20',
            httpClient:  Stripe.createFetchHttpClient(),
          })
          const amountCents = Math.round(Number(booking.fare_total) * 100)
          const pi = await stripe.paymentIntents.create({
            amount:         amountCents,
            currency:       'usd',
            customer:       booking.stripe_customer_id,
            payment_method: booking.stripe_payment_method_id,
            description:    `YMV Limo \u2014 ${booking.booking_ref}`,
            confirm:        true,
            off_session:    true,
          })
          await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
            method: 'PATCH', headers,
            body: JSON.stringify({
              stripe_payment_intent_id: pi.id,
              charged_at:               new Date().toISOString(),
              charged_amount:           amountCents / 100,
            }),
          })
          console.log('Charged', booking.booking_ref, '$' + (amountCents / 100).toFixed(2))
        } catch (stripeErr) {
          console.error('Stripe charge failed on drop-off:', stripeErr instanceof Error ? stripeErr.message : stripeErr)
        }
      }

      // Send review request email (non-blocking)
      fetch(`${supabaseUrl}/functions/v1/notify-client`, {
        method: 'POST', headers,
        body: JSON.stringify({ bookingId, type: 'review_request' }),
      }).catch(e => console.error('Review request email failed:', e))
    }

    // ── 7. Terminal event: no_show ────────────────────────────────────────────
    if (eventType === 'no_show') {
      await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'no_show' }),
      })

      // Auto-charge full fare
      if (stripeKey && !booking.charged_at && booking.stripe_payment_method_id && booking.fare_total) {
        try {
          const stripe = new Stripe(stripeKey, {
            apiVersion:  '2024-06-20',
            httpClient:  Stripe.createFetchHttpClient(),
          })
          const amountCents = Math.round(Number(booking.fare_total) * 100)
          const pi = await stripe.paymentIntents.create({
            amount:         amountCents,
            currency:       'usd',
            customer:       booking.stripe_customer_id,
            payment_method: booking.stripe_payment_method_id,
            description:    `YMV Limo \u2014 No-show \u2014 ${booking.booking_ref}`,
            confirm:        true,
            off_session:    true,
          })
          await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
            method: 'PATCH', headers,
            body: JSON.stringify({
              stripe_payment_intent_id: pi.id,
              charged_at:               new Date().toISOString(),
              charged_amount:           amountCents / 100,
            }),
          })
          console.log('No-show charge for', booking.booking_ref)
        } catch (stripeErr) {
          console.error('Stripe charge failed on no-show:', stripeErr instanceof Error ? stripeErr.message : stripeErr)
        }
      }

      // Send no-show notification email to client (non-blocking)
      fetch(`${supabaseUrl}/functions/v1/notify-client`, {
        method: 'POST', headers,
        body: JSON.stringify({ bookingId, type: 'no_show' }),
      }).catch(e => console.error('No-show email failed:', e))
    }

    return new Response(
      JSON.stringify({ ok: true, eventType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('log-trip-event failed:', message)
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
