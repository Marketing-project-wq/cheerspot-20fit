// "In-app" mode: CheerSpot opened inside the my20fit app's webview (from its banner).
// That webview has no microphone permission. On iPhone, asking for the mic there makes iOS kill
// the app, and on Android the request is refused. So in this mode the site never touches the mic,
// and every way into recording sends the visitor to the phone's browser instead.
//
// The webview opens links to other hosts in the phone's browser, so recording goes through the
// my20fit redirector (another host), which forwards to https://cheerspot.20fit.id + `next`.
// target="_blank" and window.open do not work in the iOS webview, so plain links only.

const IN_APP_PARAM = 'src'
const IN_APP_VALUE = 'my20fit_app'
const IN_APP_KEY = 'cheerspot_in_app'

// Added to the link into the browser, so the browser page knows the visitor came from the app.
// Deliberately not src=my20fit_app: that would turn on in-app mode in the browser too.
const FROM_APP_PARAM = 'from'
const FROM_APP_KEY = 'cheerspot_from_app'

const REDIRECTOR = 'https://my.20fit.id/b/2da77106-6955-4b94-8993-7c6366d075af'

// sessionStorage can be blocked in some webviews; the in-memory copy still lasts for this page load.
const memory = {}

function read(key) {
  try {
    if (sessionStorage.getItem(key) === '1') return true
  } catch {
    // Blocked storage: fall back to memory.
  }
  return memory[key] === true
}

function remember(key) {
  memory[key] = true
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    // Blocked storage: memory still holds it for this page load.
  }
}

// Reads ?src=my20fit_app / ?from=my20fit_app from the address and remembers them for this session,
// so they still count after moving to another page where the query is gone.
// Called once in main.jsx, before the app renders, so nothing can ask for the mic first.
export function detectInApp() {
  const params = new URLSearchParams(window.location.search)
  if (params.get(IN_APP_PARAM) === IN_APP_VALUE) remember(IN_APP_KEY)
  if (params.get(FROM_APP_PARAM) === IN_APP_VALUE) remember(FROM_APP_KEY)
}

// Fallback for links put in the app without ?src=my20fit_app (e.g. a plain /cheer link): spot an
// app webview from its user agent. iOS app webviews (WKWebView) leave out the "Safari/" token that
// Safari, Chrome, Firefox and the other iOS browsers all send; Android WebView adds "; wv)".
// In-app browsers of apps that have their own mic access keep the normal flow, as before.
const OWN_MIC_APPS = /Instagram|FBAN|FBAV|FB_IAB|Line\/|musical_ly|BytedanceWebview|TikTok/i

export function isAppWebview(ua = navigator.userAgent) {
  if (OWN_MIC_APPS.test(ua)) return false
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (ios) return /AppleWebKit/.test(ua) && !/Safari\//.test(ua)
  return /Android/.test(ua) && /; wv\)/.test(ua)
}

// True inside the my20fit app webview: never ask for the mic.
export function isInApp() {
  return read(IN_APP_KEY) || isAppWebview()
}

// True in the phone's browser after being sent there from the app.
export function cameFromApp() {
  return read(FROM_APP_KEY)
}

// Link that leaves the webview and opens `path` (on cheerspot.20fit.id) in the phone's browser.
// `src` is dropped so the browser page is not in in-app mode; `from` is added so it can say
// "you can go back to the app" once the cheer is sent.
export function browserUrl(path = '/cheer') {
  const url = new URL(path, 'https://cheerspot.20fit.id')
  url.searchParams.delete(IN_APP_PARAM)
  url.searchParams.set(FROM_APP_PARAM, IN_APP_VALUE)
  const next = url.pathname + url.search
  return `${REDIRECTOR}?next=${encodeURIComponent(next)}`
}
