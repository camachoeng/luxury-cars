-- Schedule advance-expired-assignments every 5 minutes via pg_cron + pg_net.
--
-- Prerequisites (Supabase Dashboard → Database → Extensions):
--   1. Enable pg_cron
--   2. Enable pg_net
--
-- Run this in Supabase SQL Editor.

select cron.schedule(
  'advance-expired-assignments',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://potmbqylkkbxovgaaerq.supabase.co/functions/v1/advance-expired-assignments',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);
