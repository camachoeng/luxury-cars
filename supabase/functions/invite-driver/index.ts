// Supabase Edge Function: invite-driver
// Sends a Supabase Auth invite email to a driver so they can set their password
// and access the driver portal. Admin-only.
//
// Deploy:
//   npx supabase@latest functions deploy invite-driver --no-verify-jwt
//
// Secrets required:
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

    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: authHeader },
    })
    const userData = await userRes.json()
    if (!userData?.app_metadata?.is_admin) throw new Error('Admin access required')

    const { driverId, redirectTo } = await req.json()
    if (!driverId)    throw new Error('Missing driverId')
    if (!redirectTo)  throw new Error('Missing redirectTo')

    // Fetch driver email
    const driverRes = await fetch(
      `${supabaseUrl}/rest/v1/drivers?id=eq.${driverId}&select=id,name,email`,
      { headers }
    )
    const drivers = await driverRes.json()
    const driver  = drivers?.[0]

    if (!driver)       throw new Error('Driver not found')
    if (!driver.email) throw new Error('Driver has no email on file')

    // Send invite via Supabase Auth Admin API
    const inviteRes = await fetch(
      `${supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method:  'POST',
        headers,
        body: JSON.stringify({ email: driver.email }),
      }
    )

    if (!inviteRes.ok) {
      const text = await inviteRes.text()
      // Supabase returns 422 if the user already exists — treat as success
      if (inviteRes.status !== 422) {
        throw new Error(`Invite failed (${inviteRes.status}): ${text}`)
      }
      // User already has an account — send a password reset instead
      const resetRes = await fetch(
        `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ email: driver.email }),
        }
      )
      if (!resetRes.ok) {
        const resetText = await resetRes.text()
        throw new Error(`Password reset failed: ${resetText}`)
      }
      return new Response(
        JSON.stringify({ ok: true, message: 'Account exists — password reset email sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, message: `Invite sent to ${driver.email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
