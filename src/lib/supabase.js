import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const REMEMBER_KEY = 'cz-remember'

// "Remember me" for staff sign-in. On: the session lives in localStorage and survives a restart.
// Off: it lives in sessionStorage and ends when the browser tab closes.
export function setRememberSession(remember) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    // Storage blocked: Supabase falls back to memory for this tab.
  }
}

const sessionStore = {
  getItem(key) {
    try {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      const remember = localStorage.getItem(REMEMBER_KEY) !== '0'
      ;(remember ? localStorage : sessionStorage).setItem(key, value)
      ;(remember ? sessionStorage : localStorage).removeItem(key)
    } catch {
      // Ignore: the session stays in memory.
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      // Ignore.
    }
  },
}

// createClient throws on empty values, so export null instead and let callers check.
export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { storage: sessionStore } }) : null
