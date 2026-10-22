import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const DEV_CHAT_URL = 'https://claude.ai/code/session_01XKjdfQUbKMrdERMAdgLonp'

// Reads the public auth settings to know whether Google sign-in is enabled.
export async function googleEnabled() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
  if (!res.ok) throw new Error('settings')
  const json = await res.json()
  return Boolean(json?.external?.google)
}

export function must({ data, error }) {
  if (error) throw error
  return data
}
