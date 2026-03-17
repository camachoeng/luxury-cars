// Supabase Edge Function: charge-booking
// Admin-only. Creates and confirms a Stripe PaymentIntent off-session
// using the saved card on file for the given booking.
//
// Deploy:
//   supabase functions deploy charge-booking --no-verify-jwt
//
// Required secrets (already set if create-setup-intent is deployed):
//   STRIPE_SECRET_KEY        = sk_live_... (or sk_test_...)
//   SUPABASE_URL             = (auto-injected by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY = (auto-injected by Supabase)

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth: admin only ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const jwt     = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    if (!payload.user_metadata?.is_admin) throw new Error('Admin access required')

    // ── Params ──
    const { bookingId, amountCents } = await req.json()
    if (!bookingId)                    throw new Error('bookingId is required')
    if (!amountCents || amountCents <= 0) throw new Error('amountCents must be a positive integer')

    // ── Fetch booking ──
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('stripe_customer_id, stripe_payment_method_id, charged_at, booking_ref')
      .eq('id', bookingId)
      .single()

    if (fetchErr || !booking)               throw new Error('Booking not found')
    if (booking.charged_at)                 throw new Error('Booking has already been charged')
    if (!booking.stripe_payment_method_id)  throw new Error('No payment method on file for this booking')

    // ── Charge off-session ──
    const paymentIntent = await stripe.paymentIntents.create({
      amount:         amountCents,
      currency:       'usd',
      customer:       booking.stripe_customer_id,
      payment_method: booking.stripe_payment_method_id,
      description:    `YMV Limo — Booking ${booking.booking_ref}`,
      confirm:        true,
      off_session:    true,
    })

    // ── Persist result ──
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        charged_at:               new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updateErr) throw new Error('Charge succeeded but failed to update booking: ' + updateErr.message)

    return new Response(
      JSON.stringify({ success: true, paymentIntentId: paymentIntent.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
