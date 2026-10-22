import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q'

// Open access: no sign-in. Every write goes through a cgh_ SQL function.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

export const DEV_CHAT_URL = 'https://claude.ai/code/session_01XKjdfQUbKMrdERMAdgLonp'
// Claude project used for the research behind the app. The button appears once the link is set.
export const RESEARCH_URL = import.meta.env.VITE_RESEARCH_URL || ''

export function must({ data, error }) {
  if (error) throw error
  return data
}

export const rpc = (fn, args) => supabase.rpc(fn, args).then(must)
