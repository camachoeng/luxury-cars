// Supabase Edge Function: create-setup-intent
// Creates a Stripe Customer + SetupIntent so the frontend can save a card.
// The saved PaymentMethod is charged later by the admin after vehicle assignment.
//
// Deploy:
//   supabase login
//   supabase link --project-ref potmbqylkkbxovgaaerq
//   supabase functions deploy create-setup-intent
//
// Set secrets (Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY = sk_live_... (or sk_test_... for testing)

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    // Decode user info from JWT payload (no verification needed — Supabase validates upstream)
    const jwt = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userEmail: string = payload.email
    const userId: string   = payload.sub
    if (!userEmail) throw new Error('No email in token')

    // Create a Stripe Customer for this booking session.
    // One customer per SetupIntent keeps things simple — the admin sees customer + PM in the dashboard.
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { supabase_user_id: userId },
    })

    const setupIntent = await stripe.setupIntents.create({
      customer:             customer.id,
      payment_method_types: ['card'],
      usage:                'off_session',  // allows charging without the customer present
    })

    return new Response(
      JSON.stringify({
        clientSecret: setupIntent.client_secret,
        customerId:   customer.id,
      }),
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
