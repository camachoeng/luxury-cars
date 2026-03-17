-- Migration: add driver_id to bookings + admin RLS policy for driver assignment
-- Run in Supabase SQL Editor.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL;
