-- Add cancellation tracking columns to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_fee    NUMERIC(10,2);
