import { useState } from 'react'
import { useT } from '../../lib/i18n.jsx'
import { signIn, signOut, staffRole } from '../../lib/auth.js'
import { STRINGS, pick } from './strings.js'
import { AlertIcon, ArrowIcon, CheckIcon, EyeIcon, EyeOffIcon, LockIcon } from './icons.jsx'
import { LangSwitch, Logo } from './shared.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AdminLogin({ onSuccess }) {
  const { lang, setLang } = useT()
  const S = STRINGS[lang] || STRINGS.id
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [info, setInfo] = useState(null)
  const [shake, setShake] = useState(false)
  const fail = key => {
    setErr(key)
    setLoading(false)
    setShake(true)
  }

  const submit = async e => {
    e.preventDefault()
    if (loading) return
    if (!email.trim() || !pass) return fail('errEmpty')
    if (email.includes('@') && !EMAIL_RE.test(email.trim())) return fail('errEmail')
    setLoading(true)
    setErr(null)
    setInfo(null)
    try {
      const session = await signIn(email.trim(), pass)
      const role = staffRole(session)
      // Accounts without a staff role can sign in to Supabase but must not see moderation.
      if (!role) {
        await signOut()
        return fail('errWrong')
      }
      onSuccess(role)
    } catch {
      fail('errWrong')
    }
  }

  const inputErr = err ? ' is-error' : ''

  return (
    <main className="adm-login">
      <div className="adm-login__panel">
        <div className="adm-login__top">
          <Logo className="adm-logo--login" />
          <LangSwitch lang={lang} onChange={setLang} />
        </div>

        <div className="adm-login__body">
          <form
            className={`adm-login__form${shake ? ' is-shaking' : ''}`}
            onSubmit={submit}
            onAnimationEnd={e => {
              if (e.target === e.currentTarget) setShake(false)
            }}
            noValidate
          >
            <div className="adm-login__heading">
              <h1 className="adm-login__title">{S.title}</h1>
              <p className="adm-login__sub">{S.sub}</p>
            </div>

            <div className="adm-field">
              <label className="adm-field__label" htmlFor="adm-email">
                {S.emailLbl}
              </label>
              <input
                id="adm-email"
                type="text"
                className={`adm-input${inputErr}`}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                value={email}
                placeholder={S.userPh}
                onChange={e => {
                  setEmail(e.target.value)
                  setErr(null)
                }}
              />
            </div>

            <div className="adm-field">
              <div className="adm-field__head">
                <label className="adm-field__label" htmlFor="adm-pass">
                  {S.passLbl}
                </label>
                <button
                  type="button"
                  className="adm-link"
                  onClick={() => {
                    setInfo('forgotInfo')
                    setErr(null)
                  }}
                >
                  {S.forgot}
                </button>
              </div>
              <div className="adm-pass">
                <input
                  id="adm-pass"
                  type={showPass ? 'text' : 'password'}
                  className={`adm-input adm-input--pass${inputErr}`}
                  autoComplete="current-password"
                  value={pass}
                  placeholder="••••••••"
                  onChange={e => {
                    setPass(e.target.value)
                    setErr(null)
                  }}
                />
                <button
                  type="button"
                  className="adm-eye"
                  aria-label={S.showPass}
                  onClick={() => setShowPass(v => !v)}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {err && (
              <div role="alert" className="adm-alert">
                <AlertIcon />
                <span>{S[err]}</span>
              </div>
            )}
            {info && <div className="adm-info">{S[info]}</div>}

            <button type="button" className="adm-remember" aria-pressed={remember} onClick={() => setRemember(v => !v)}>
              <span className={`adm-check${remember ? ' is-on' : ''}`}>
                {remember && <CheckIcon size={13} strokeWidth={3.5} stroke="#FFFFFF" />}
              </span>
              {S.remember}
            </button>

            <button type="submit" className="adm-submit" disabled={loading}>
              {loading && <span className="adm-spin" />}
              <span>{loading ? S.loading : S.login}</span>
              {!loading && <ArrowIcon />}
            </button>

            <div className="adm-secure">
              <LockIcon />
              <span>{S.secure}</span>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
