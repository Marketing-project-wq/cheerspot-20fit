import { useCallback, useEffect, useState } from 'react'
import { createDjAccount, listDjAccounts, removeDjAccount, resetDjPassword } from '../../lib/staff.js'
import { pick } from './strings.js'

// Superadmin page: create DJ / booth operator accounts, reset their password, remove them.
const T = {
  title: ['Akun DJ', 'DJ accounts'],
  sub: ['Buat akun untuk DJ dan operator booth. Mereka masuk di halaman /dj.', 'Create accounts for DJs and booth operators. They sign in at /dj.'],
  newTitle: ['Akun baru', 'New account'],
  name: ['Nama', 'Name'],
  namePh: ['mis. DJ Rio', 'e.g. DJ Rio'],
  email: ['Email', 'Email'],
  pass: ['Kata sandi', 'Password'],
  passPh: ['minimal 8 karakter', 'at least 8 characters'],
  gen: ['Buat acak', 'Generate'],
  create: ['Buat akun', 'Create account'],
  creating: ['Membuat…', 'Creating…'],
  made: ['Akun siap. Kirim data ini ke DJ, kata sandi tidak ditampilkan lagi.', 'Account ready. Send these to the DJ; the password is not shown again.'],
  copy: ['Salin', 'Copy'],
  copied: ['Tersalin', 'Copied'],
  list: ['Akun aktif', 'Active accounts'],
  loading: ['Memuat…', 'Loading…'],
  empty: ['Belum ada akun DJ.', 'No DJ accounts yet.'],
  lastIn: ['Terakhir masuk', 'Last sign-in'],
  never: ['belum pernah', 'never'],
  reset: ['Reset sandi', 'Reset password'],
  remove: ['Hapus', 'Remove'],
  confirmRemove: ['Hapus akun {email}? DJ ini tidak bisa masuk lagi.', 'Remove {email}? This DJ can no longer sign in.'],
  newPass: ['Kata sandi baru untuk {email}:', 'New password for {email}:'],
  errLoad: ['Daftar akun tidak bisa dimuat. Coba lagi.', 'Could not load accounts. Try again.'],
  email_taken: ['Email ini sudah dipakai di sistem 20FIT lain. Pakai email lain.', 'This email is already used by another 20FIT system. Use another email.'],
  weak_password: ['Kata sandi minimal 8 karakter.', 'Password needs at least 8 characters.'],
  invalid_email: ['Format email belum benar.', 'That email doesn’t look right.'],
  failed: ['Gagal. Coba lagi.', 'Something went wrong. Try again.'],
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomPassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

function formatDate(value, lang) {
  if (!value) return null
  return new Date(value).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function DjAccountsPanel({ lang }) {
  const t = key => pick(T[key] || T.failed, lang)
  const [accounts, setAccounts] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  // Credentials shown once after create or reset, so the superadmin can pass them on.
  const [shown, setShown] = useState(null)
  const [copied, setCopied] = useState(false)
  const [rowBusy, setRowBusy] = useState(null)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      setAccounts(await listDjAccounts())
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const show = creds => {
    setShown(creds)
    setCopied(false)
  }

  const submit = async e => {
    e.preventDefault()
    if (busy) return
    setFormError('')
    if (form.password.length < 8) return setFormError('weak_password')
    setBusy(true)
    try {
      await createDjAccount(form)
      show({ email: form.email.trim().toLowerCase(), password: form.password })
      setForm({ name: '', email: '', password: '' })
      load()
    } catch (err) {
      setFormError(T[err.code] ? err.code : 'failed')
    } finally {
      setBusy(false)
    }
  }

  const reset = async account => {
    const password = randomPassword()
    setRowBusy(account.id)
    try {
      await resetDjPassword(account.id, password)
      show({ email: account.email, password })
    } catch {
      window.alert(t('failed'))
    } finally {
      setRowBusy(null)
    }
  }

  const remove = async account => {
    if (!window.confirm(t('confirmRemove').replace('{email}', account.email))) return
    setRowBusy(account.id)
    try {
      await removeDjAccount(account.id)
      if (shown?.email === account.email) setShown(null)
      load()
    } catch {
      window.alert(t('failed'))
    } finally {
      setRowBusy(null)
    }
  }

  const copyCreds = () => {
    const text = `CheerSpot DJ Booth\n${window.location.origin}/dj\nEmail: ${shown.email}\nPassword: ${shown.password}`
    navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {})
  }

  return (
    <div className="adm-page adm-page--list">
      <header className="adm-list__head">
        <h1 className="adm-title">{t('title')}</h1>
        <p className="adm-sub">{t('sub')}</p>
      </header>

      <div className="adm-settings">
        <form className="adm-card-plain" onSubmit={submit} noValidate>
          <span className="adm-settings__title">{t('newTitle')}</span>
          <div className="adm-djform">
            <label className="adm-djform__field">
              <span>{t('name')}</span>
              <input
                className="adm-input-plain"
                value={form.name}
                placeholder={t('namePh')}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="adm-djform__field">
              <span>{t('email')}</span>
              <input
                type="email"
                className="adm-input-plain"
                autoCapitalize="none"
                autoComplete="off"
                value={form.email}
                placeholder="nama@20fit.id"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="adm-djform__field">
              <span>{t('pass')}</span>
              <div className="adm-add">
                <input
                  className="adm-input-plain"
                  autoComplete="new-password"
                  value={form.password}
                  placeholder={t('passPh')}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button type="button" className="adm-btn-dark-sm" onClick={() => setForm(f => ({ ...f, password: randomPassword() }))}>
                  {t('gen')}
                </button>
              </div>
            </label>
          </div>
          {formError && (
            <p className="adm-djform__error" role="alert">
              {t(formError)}
            </p>
          )}
          <button type="submit" className="adm-btn-dark-sm adm-djform__submit" disabled={busy || !form.email.trim()}>
            {busy ? t('creating') : t('create')}
          </button>
        </form>

        {shown && (
          <div className="adm-card-plain adm-djcreds" role="status">
            <span className="adm-settings__sub">{t('made')}</span>
            <code>
              {shown.email}
              <br />
              {shown.password}
            </code>
            <button type="button" className="adm-btn-dark-sm" onClick={copyCreds}>
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
        )}

        <span className="adm-settings__title adm-djlist__title">{t('list')}</span>
        {loadError && <p className="adm-djform__error">{t('errLoad')}</p>}
        {!accounts && !loadError && <p className="adm-settings__sub">{t('loading')}</p>}
        {accounts?.length === 0 && <p className="adm-settings__sub">{t('empty')}</p>}
        {accounts?.map(account => (
          <div key={account.id} className="adm-card-plain adm-card-plain--row">
            <div className="adm-settings__text">
              <span className="adm-settings__title">{account.name || account.email}</span>
              <span className="adm-settings__sub">
                {account.email} · {t('lastIn')}: {formatDate(account.lastSignInAt, lang) || t('never')}
              </span>
            </div>
            <button type="button" className="adm-btn-dark-sm" disabled={rowBusy === account.id} onClick={() => reset(account)}>
              {t('reset')}
            </button>
            <button
              type="button"
              className="adm-btn-dark-sm adm-btn-danger-sm"
              disabled={rowBusy === account.id}
              onClick={() => remove(account)}
            >
              {t('remove')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
