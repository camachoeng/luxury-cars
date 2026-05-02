-- Schedule 30-minute reminder emails via pg_cron + pg_net.
--
-- Prerequisites (Supabase Dashboard → Database → Extensions):
--   1. pg_cron  (already enabled for advance-expired-assignments)
--   2. pg_net   (already enabled)
--
-- Run this in Supabase SQL Editor.

select cron.schedule(
  'send-trip-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://potmbqylkkbxovgaaerq.supabase.co/functions/v1/notify-reminder',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);
