-- ============================================================
-- YMV Limo — Complete Database Schema
-- Run this in full in a fresh Supabase project SQL Editor.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  class         TEXT,
  brand         TEXT,
  seats         INT         DEFAULT 4,
  bags          INT         DEFAULT 3,
  image         TEXT,
  badge         TEXT,
  badge_color   TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  price_per_mile NUMERIC(10,2) DEFAULT 4.00,
  price_per_hour NUMERIC(10,2) DEFAULT 95.00,
  features      TEXT[]      DEFAULT '{}',
  feature_icons TEXT[]      DEFAULT '{}',
  description   TEXT,
  description_es TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active vehicles"
  ON vehicles FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can read all vehicles"
  ON vehicles FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can insert vehicles"
  ON vehicles FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update vehicles"
  ON vehicles FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);


-- ============================================================
-- DRIVERS
-- Note: id is TEXT (matches prod — created before UUID default was standardized)
-- ============================================================
CREATE TABLE drivers (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name           TEXT        NOT NULL,
  phone          TEXT,
  email          TEXT,
  license_number TEXT,
  vehicle_id     UUID        REFERENCES vehicles(id) ON DELETE SET NULL,
  notes          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  is_available   BOOLEAN     NOT NULL DEFAULT true,
  priority       INT         NOT NULL DEFAULT 99,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all drivers"
  ON drivers FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can insert drivers"
  ON drivers FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update drivers"
  ON drivers FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete drivers"
  ON drivers FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Drivers can read their own record (matched by email for portal)
CREATE POLICY "Drivers can read own record"
  ON drivers FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Drivers can update their own availability
CREATE POLICY "Drivers can update own availability"
  ON drivers FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));


-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref               TEXT        NOT NULL UNIQUE,
  user_id                   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id                UUID        REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id                 TEXT        REFERENCES drivers(id) ON DELETE SET NULL,
  pickup                    TEXT,
  dropoff                   TEXT,
  trip_date                 TEXT,
  trip_time                 TEXT,
  passenger_name            TEXT,
  passenger_email           TEXT,
  passenger_phone           TEXT,
  passenger_count           INT         DEFAULT 1,
  special_instructions      TEXT,
  preferences               JSONB,
  fare_total                NUMERIC(10,2),
  status                    TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','no_show','completed')),
  -- Stripe
  stripe_setup_intent_id    TEXT,
  stripe_payment_method_id  TEXT,
  stripe_customer_id        TEXT,
  stripe_payment_intent_id  TEXT,
  charged_at                TIMESTAMPTZ,
  charged_amount            NUMERIC(10,2),
  -- Cancellation
  cancelled_at              TIMESTAMPTZ,
  cancel_fee                NUMERIC(10,2),
  -- Reminders
  reminder_sent_at          TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can read their own bookings
CREATE POLICY "Users can read own bookings"
  ON bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own bookings
CREATE POLICY "Users can insert own bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all bookings
CREATE POLICY "Admins can read all bookings"
  ON bookings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Admins can update bookings
CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Admins can delete bookings
CREATE POLICY "Admins can delete bookings"
  ON bookings FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Drivers can read bookings assigned to them
CREATE POLICY "Drivers can read own assigned bookings"
  ON bookings FOR SELECT TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE email = (auth.jwt() ->> 'email')
    )
  );


-- ============================================================
-- VEHICLE AVAILABILITY
-- ============================================================
CREATE TABLE vehicle_availability (
  vehicle_id  UUID  NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  trip_date   TEXT  NOT NULL,
  trip_time   TEXT  NOT NULL,
  PRIMARY KEY (vehicle_id, trip_date, trip_time)
);

ALTER TABLE vehicle_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage availability"
  ON vehicle_availability FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Authenticated users can read availability"
  ON vehicle_availability FOR SELECT TO authenticated
  USING (true);


-- ============================================================
-- ASSIGNMENT REQUESTS
-- ============================================================
CREATE TABLE assignment_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id    TEXT        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  token        TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX assignment_requests_booking_id_idx ON assignment_requests(booking_id);
CREATE INDEX assignment_requests_token_idx      ON assignment_requests(token);

ALTER TABLE assignment_requests ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions) handles all mutations — anon can read by token
CREATE POLICY "Anon can read assignment request by token"
  ON assignment_requests FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can read all assignment requests"
  ON assignment_requests FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);


-- ============================================================
-- ADMIN SETTINGS
-- ============================================================
CREATE TABLE admin_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  label      TEXT,
  unit       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings"
  ON admin_settings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update settings"
  ON admin_settings FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Anon + authenticated can read settings (needed by landing page fare estimate)
CREATE POLICY "Public can read settings"
  ON admin_settings FOR SELECT TO anon, authenticated
  USING (true);

-- Seed default values
INSERT INTO admin_settings (key, value, label, unit) VALUES
  ('cancellation_fee',         '20',   'Admin Fee for Any Cancellation',           '$'),
  ('late_cancel_percent',      '50',   'Late Cancellation Fee',                    '%'),
  ('late_cancel_window_hours', '6',    'Late Cancel Window (hours before pickup)',  'hrs'),
  ('no_show_wait_minutes',     '30',   'No-Show Wait Time',                        'min'),
  ('driver_early_arrival_min', '15',   'Driver Arrives Early',                     'min'),
  ('rate_per_hour',            '100',  'Hourly Rate',                              '$/hr'),
  ('rate_per_mile',            '4.00', 'Per-Mile Rate',                            '$/mi'),
  ('gratuity_percent',         '20',   'Default Gratuity',                         '%'),
  ('hourly_min_hours',         '2',    'Minimum Hours (hourly bookings)',           'hrs'),
  ('hourly_mile_cap',          '30',   'Miles Included Per Hour',                  'mi/hr')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT        NOT NULL,
  booking_ref TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved reviews"
  ON reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Users can submit reviews"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all reviews"
  ON reviews FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update reviews"
  ON reviews FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);


-- ============================================================
-- TRIP EVENTS
-- ============================================================
CREATE TABLE trip_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id  TEXT        REFERENCES drivers(id),
  event_type TEXT        NOT NULL
    CHECK (event_type IN ('arrived','picked_up','on_way','dropped_off','no_show')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX trip_events_booking_id_idx ON trip_events(booking_id);

ALTER TABLE trip_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on trip_events"
  ON trip_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Drivers can read own trip events"
  ON trip_events FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN   drivers d ON d.id = b.driver_id
      WHERE  d.email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can read all trip events"
  ON trip_events FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);


-- ============================================================
-- ADMIN: set is_admin flag on your account
-- Replace the email below, then run this block separately
-- after creating your admin user account.
-- ============================================================
-- UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
--   WHERE email = 'camachoengrandy@gmail.com';
