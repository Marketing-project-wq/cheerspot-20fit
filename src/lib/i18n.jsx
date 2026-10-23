import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import id from '../locales/id.json'
import en from '../locales/en.json'

const dictionaries = { id, en }
const STORAGE_KEY = 'cheerspot-lang'

function detectLanguage() {
  return navigator.language?.toLowerCase().startsWith('id') ? 'id' : 'en'
}

function readSavedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved in dictionaries ? saved : null
  } catch {
    return null
  }
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Storage can be blocked (private mode); the choice just won't persist.
  }
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => readSavedLanguage() ?? detectLanguage())

  const setLang = useCallback((next) => {
    setLangState(next)
    saveLanguage(next)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'id' ? 'en' : 'id')
  }, [lang, setLang])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => {
    const dict = dictionaries[lang]
    const t = (key) => dict[key] ?? dictionaries.en[key] ?? key
    return { lang, setLang, toggleLang, t }
  }, [lang, setLang, toggleLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>')
  return ctx
}
