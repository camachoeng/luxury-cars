-- Migration: add Stripe charge columns to bookings
-- Run on both dev and prod via Supabase SQL Editor.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS charged_at               TIMESTAMPTZ;
