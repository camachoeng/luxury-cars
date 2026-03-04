import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[LuxuryDrive] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — create a .env file (see .env.example)')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
