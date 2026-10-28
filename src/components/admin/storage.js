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

// Like readSaved, but in localStorage: survives closing the tab and the browser.
export function readKept(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function keepValue(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable; the value just won't survive a restart.
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
