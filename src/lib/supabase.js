import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// createClient throws on empty values, so export null instead and let callers check.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
