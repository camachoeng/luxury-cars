-- Add 'completed' status for when driver marks the client as dropped off.
-- Also adds reminder_sent_at to prevent duplicate 30-min reminder sends.
--
-- Run in Supabase SQL Editor.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
