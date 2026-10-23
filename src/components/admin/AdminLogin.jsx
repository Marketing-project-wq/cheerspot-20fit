import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useT } from '../../lib/i18n.jsx'
import { LOGIN_ROLES, STRINGS, pick } from './strings.js'
import { AlertIcon, ArrowIcon, CheckIcon, EyeIcon, EyeOffIcon, LockIcon } from './icons.jsx'
import { LangSwitch, Logo } from './shared.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Role comes from ?role= first, then the role picked on screen. The username never decides it,
// so "admin" as a username still lands in moderation when Superadmin is selected.
function resolveRole(picked, urlRole) {
  if (urlRole === 'admin' || urlRole === 'super') return urlRole
  return picked
}

export default function AdminLogin({ onSuccess }) {
  const { lang, setLang } = useT()
  const S = STRINGS[lang] || STRINGS.id
  const [params] = useSearchParams()
  const [picked, setPicked] = useState('super')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [info, setInfo] = useState(null)
  const [shake, setShake] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const fail = key => {
    setErr(key)
    setLoading(false)
    setShake(true)
  }

  const submit = e => {
    e.preventDefault()
    if (loading) return
    if (!email.trim() || !pass) return fail('errEmpty')
    if (email.includes('@') && !EMAIL_RE.test(email.trim())) return fail('errEmail')
    setLoading(true)
    setErr(null)
    setInfo(null)
    clearTimeout(timer.current)
    // TODO(supabase): replace this local check with supabase.auth.signInWithPassword and read the role from the staff profile.
    timer.current = setTimeout(() => {
      // Local stand-in: any input passes once the password is at least 6 characters, as the design's flow does.
      if (pass.length < 6) return fail('errWrong')
      onSuccess(resolveRole(picked, params.get('role')))
    }, 1100)
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
              <span className="adm-field__label" id="adm-role-lbl">
                {S.roleLbl}
              </span>
              <div className="adm-roles" role="group" aria-labelledby="adm-role-lbl">
                {LOGIN_ROLES.map(r => {
                  const on = picked === r.key
                  return (
                    <button
                      key={r.key}
                      type="button"
                      aria-pressed={on}
                      className={`adm-role${on ? ' is-on' : ''}`}
                      onClick={() => setPicked(r.key)}
                    >
                      <strong>{pick(r.label, lang)}</strong>
                      <span>{pick(r.desc, lang)}</span>
                    </button>
                  )
                })}
              </div>
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
