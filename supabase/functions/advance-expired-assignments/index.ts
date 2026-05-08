// Supabase Edge Function: advance-expired-assignments
// Finds all pending bookings whose latest assignment_request has expired
// and calls auto-assign-driver for each, advancing the chain to the next driver.
//
// Scheduled via pg_cron every 5 minutes — see migration:
//   supabase/migrations/schedule_advance_expired_assignments.sql
//
// Deploy:
//   npx supabase@latest functions deploy advance-expired-assignments --no-verify-jwt

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const headers     = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  // Find all expired pending requests — one per booking, only the ones still in 'pending' status
  const res = await fetch(
    `${supabaseUrl}/rest/v1/assignment_requests?status=eq.pending&expires_at=lt.${new Date().toISOString()}&select=booking_id`,
    { headers }
  )
  const rows: { booking_id: string }[] = await res.json()

  // Deduplicate booking IDs
  const bookingIds = [...new Set(rows.map(r => r.booking_id))]

  const results: { bookingId: string; ok: boolean; error?: string }[] = []

  for (const bookingId of bookingIds) {
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/auto-assign-driver`, {
        method: 'POST', headers,
        body: JSON.stringify({ bookingId }),
      })
      const data = await r.json()
      results.push({ bookingId, ok: data?.ok ?? true })
    } catch (err) {
      results.push({ bookingId, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return new Response(JSON.stringify({ advanced: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
