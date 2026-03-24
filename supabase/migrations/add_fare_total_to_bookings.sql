-- Add fare_total column to bookings
-- Stores the calculated fare (subtotal + gratuity) at time of booking
-- Used to pre-fill the admin charge input

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fare_total NUMERIC(10, 2);
