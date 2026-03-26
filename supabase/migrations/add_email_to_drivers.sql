-- Add email column to drivers table for booking notifications
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email TEXT;
