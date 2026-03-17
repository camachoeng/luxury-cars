-- Migration: create drivers table + admin RLS policies for vehicles
-- Run in Supabase SQL Editor.

-- ── Drivers table ──
CREATE TABLE IF NOT EXISTS drivers (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name           TEXT NOT NULL,
  phone          TEXT,
  license_number TEXT,
  vehicle_id     TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage drivers"
  ON drivers FOR ALL TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- ── Vehicle admin policies (add + update from admin dashboard) ──
CREATE POLICY "Admins can insert vehicles"
  ON vehicles FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update vehicles"
  ON vehicles FOR UPDATE TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
