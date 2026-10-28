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
  username: ['Username', 'Username'],
  userHint: ['huruf kecil, angka, titik, minus · 3–32 karakter', 'lowercase letters, numbers, dot, dash · 3–32 characters'],
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
  confirmRemove: ['Hapus akun {user}? DJ ini tidak bisa masuk lagi.', 'Remove {user}? This DJ can no longer sign in.'],
  errLoad: ['Daftar akun tidak bisa dimuat. Coba lagi.', 'Could not load accounts. Try again.'],
  username_taken: ['Username ini sudah dipakai. Pilih username lain.', 'That username is taken. Pick another one.'],
  weak_password: ['Kata sandi minimal 8 karakter.', 'Password needs at least 8 characters.'],
  invalid_username: ['Username 3–32 karakter: huruf kecil, angka, titik, minus, atau garis bawah.', 'Username: 3–32 lowercase letters, numbers, dot, dash or underscore.'],
  failed: ['Gagal. Coba lagi.', 'Something went wrong. Try again.'],
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomPassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

// Suggests a username from the display name: "DJ Mandiri x JHR" becomes "dj-mandiri-x-jhr".
function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/

function formatDate(value, lang) {
  if (!value) return null
  return new Date(value).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function DjAccountsPanel({ lang }) {
  const t = key => pick(T[key] || T.failed, lang)
  const [accounts, setAccounts] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  // The username follows the name until the superadmin edits it by hand.
  const [userEdited, setUserEdited] = useState(false)
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
    const username = form.username.trim().toLowerCase()
    if (!USERNAME_RE.test(username)) return setFormError('invalid_username')
    if (form.password.length < 8) return setFormError('weak_password')
    setBusy(true)
    try {
      await createDjAccount({ ...form, username })
      show({ username, password: form.password })
      setForm({ name: '', username: '', password: '' })
      setUserEdited(false)
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
      show({ username: account.username, password })
    } catch {
      window.alert(t('failed'))
    } finally {
      setRowBusy(null)
    }
  }

  const remove = async account => {
    if (!window.confirm(t('confirmRemove').replace('{user}', account.username))) return
    setRowBusy(account.id)
    try {
      await removeDjAccount(account.id)
      if (shown?.username === account.username) setShown(null)
      load()
    } catch {
      window.alert(t('failed'))
    } finally {
      setRowBusy(null)
    }
  }

  const copyCreds = () => {
    const text = `CheerSpot DJ Booth\n${window.location.origin}/dj\nUsername: ${shown.username}\nPassword: ${shown.password}`
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
                onChange={e => {
                  const name = e.target.value
                  setForm(f => ({ ...f, name, username: userEdited ? f.username : slugify(name) }))
                }}
              />
            </label>
            <label className="adm-djform__field">
              <span>{t('username')}</span>
              <input
                className="adm-input-plain"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                value={form.username}
                placeholder="dj-rio"
                onChange={e => {
                  setUserEdited(true)
                  setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, '-') }))
                }}
              />
              <small className="adm-djform__hint">{t('userHint')}</small>
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
          <button type="submit" className="adm-btn-dark-sm adm-djform__submit" disabled={busy || !form.username.trim()}>
            {busy ? t('creating') : t('create')}
          </button>
        </form>

        {shown && (
          <div className="adm-card-plain adm-djcreds" role="status">
            <span className="adm-settings__sub">{t('made')}</span>
            <code>
              Username: {shown.username}
              <br />
              Password: {shown.password}
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
              <span className="adm-settings__title">{account.name || account.username}</span>
              <span className="adm-settings__sub">
                {account.username} · {t('lastIn')}: {formatDate(account.lastSignInAt, lang) || t('never')}
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
