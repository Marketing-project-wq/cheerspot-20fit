import { useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useT } from '../lib/i18n.jsx'

export default function Landing() {
  const { t, toggleLang, lang } = useT()

  useEffect(() => {
    document.title = 'CheerSpot by 20FIT'
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    if (!supabase) {
      console.warn('[CheerSpot] Supabase env vars are empty. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
      return
    }

    // Lightweight query just to confirm the URL and key work.
    supabase
      .from('__connection_check__')
      .select('*', { head: true })
      .then(({ error }) => {
        // A missing table still means the request reached Supabase with valid credentials.
        if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
          console.error('[CheerSpot] Supabase connection error:', error.message)
        } else {
          console.log('Supabase connected')
        }
      })
  }, [])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <button
        type="button"
        onClick={toggleLang}
        title={t('nav.toggleTitle')}
        aria-label={t('nav.toggleTitle')}
        className="self-end rounded-full border border-neutral-700 px-3 py-1 text-sm"
      >
        {t('nav.toggleLabel')}
      </button>

      <h1 className="max-w-md text-3xl font-bold leading-tight sm:text-4xl">
        {t('landing.headline')}
      </h1>
      <p className="text-sm text-neutral-500" lang={lang}>
        {t('placeholder.note')}
      </p>
    </main>
  )
}
