-- Spanish description for vehicles, shown when UI language is set to ES
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS description_es TEXT;
