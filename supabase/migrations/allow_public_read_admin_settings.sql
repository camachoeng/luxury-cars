-- Allow unauthenticated users to read admin_settings
-- Needed so the fare estimate on the landing page can fetch rate_per_mile.

CREATE POLICY IF NOT EXISTS "Public can read admin_settings"
  ON admin_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);
