// Per-tab convenience for the admin console: keeps the login and the open page across a refresh.
// sessionStorage can be blocked or full, so every access is wrapped and falls back to memory.
export function readSaved(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveValue(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable; the value just won't survive a refresh.
  }
}
