-- Trip event log: records each driver status update during a trip.
-- event_type sequence: arrived → picked_up → on_way → dropped_off
--                   or arrived → no_show
--
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS trip_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id  TEXT        REFERENCES drivers(id),
  event_type TEXT        NOT NULL
    CHECK (event_type IN ('arrived', 'picked_up', 'on_way', 'dropped_off', 'no_show')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_events_booking_id_idx ON trip_events(booking_id);

ALTER TABLE trip_events ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions) can do everything
CREATE POLICY "Service role full access on trip_events"
  ON trip_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Drivers can read events for bookings they are assigned to
CREATE POLICY "Drivers can read own trip events"
  ON trip_events FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN   drivers d ON d.id = b.driver_id
      WHERE  d.email = (auth.jwt() ->> 'email')
    )
  );

-- Admins can read all events
CREATE POLICY "Admins can read all trip events"
  ON trip_events FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
