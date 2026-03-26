// Supabase Edge Function: manage-users
// Admin-only CRUD for auth users. Requires is_admin in app_metadata.
//
// Deploy:
//   npx supabase@latest functions deploy manage-users --no-verify-jwt
//
// Actions (POST body):
//   { action: 'list' }
//   { action: 'update', userId, fullName, email, isAdmin }
//   { action: 'delete', userId }

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

    // Verify caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')
    const jwt     = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    if (payload?.app_metadata?.is_admin !== true) throw new Error('Forbidden')

    const { action, userId, fullName, email, isAdmin } = await req.json()
    const adminUrl = `${supabaseUrl}/auth/v1/admin/users`
    const headers  = {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type':  'application/json',
    }

    if (action === 'list') {
      const res  = await fetch(`${adminUrl}?page=1&per_page=200`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to list users')
      return ok(data.users ?? data)
    }

    if (action === 'update') {
      if (!userId) throw new Error('Missing userId')
      const body: Record<string, any> = {}
      if (email    !== undefined) body.email = email
      if (fullName !== undefined) body.user_metadata = { full_name: fullName }
      if (isAdmin  !== undefined) body.app_metadata  = { is_admin: isAdmin }

      console.log('update body:', JSON.stringify(body))
      const res  = await fetch(`${adminUrl}/${userId}`, {
        method: 'PUT', headers, body: JSON.stringify(body),
      })
      const data = await res.json()
      console.log('auth api response:', res.status, JSON.stringify(data))
      if (!res.ok) throw new Error(data.message || data.msg || JSON.stringify(data))
      return ok(data)
    }

    if (action === 'delete') {
      if (!userId) throw new Error('Missing userId')
      const res = await fetch(`${adminUrl}/${userId}`, { method: 'DELETE', headers })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to delete user')
      }
      return ok({ deleted: true })
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('manage-users error:', message)
    const status  = message === 'Unauthorized' || message === 'Forbidden' ? 403 : 400
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

function ok(data: unknown) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
