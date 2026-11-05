import { useEffect, useState } from 'react'
import { DUCKER_DEFAULTS as D } from '../../lib/duckerConfig.js'
import {
  autoConnectDucker,
  closeDucker,
  connectDucker,
  disconnectDucker,
  getDuckerState,
  isValidPairCode,
  normalizePairCode,
  restoreNow,
  savedPairCode,
  sendConfig,
  sendValue,
  subscribeDucker,
  testDucker,
} from '../../lib/ducker.js'

// The CheerSpot Ducker app on the DJ's MacBook turns rekordbox down while a cheer plays. This panel
// pairs the booth with it (the code the app shows), shows whether it is reachable, and holds the
// calibration tools for soundcheck. Without it, the booth works exactly as before.

function chipFor(state, now) {
  const fresh = state.connected && state.status && now - state.statusAt <= D.offlineAfterMs
  if (!fresh) return { tone: 'off', label: 'Ducker: offline' }
  if (state.status.ready) return { tone: 'ok', label: 'Ducker: tersambung' }
  return { tone: 'warn', label: 'Ducker: MIDI belum siap' }
}

function toCc(text) {
  if (String(text).trim() === '') return null
  const n = Number(text)
  return Number.isInteger(n) && n >= D.ccMin && n <= D.ccMax ? n : NaN
}

export default function DuckerPanel() {
  const [state, setState] = useState(getDuckerState)
  const [now, setNow] = useState(() => Date.now())
  const [code, setCode] = useState(savedPairCode)
  const [codeError, setCodeError] = useState('')
  const [normalValue, setNormalValue] = useState('')
  const [duckValue, setDuckValue] = useState('')
  const [calError, setCalError] = useState('')
  const [probe, setProbe] = useState(D.sendValueStart)
  const [note, setNote] = useState('')

  useEffect(() => subscribeDucker(setState), [])

  // Reconnect after a refresh if the operator was connected; leave the channel when the booth closes.
  useEffect(() => {
    autoConnectDucker()
    return () => closeDucker()
  }, [])

  // Re-check every second, so the chip turns grey once the app has been quiet for too long.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), D.uiTickMs)
    return () => clearInterval(timer)
  }, [])

  // Fill the calibration fields from the app's settings the first time they arrive.
  const config = state.status?.config
  useEffect(() => {
    if (!config) return
    setNormalValue(value => (value === '' && config.normalValue != null ? String(config.normalValue) : value))
    setDuckValue(value => (value === '' && config.duckValue != null ? String(config.duckValue) : value))
  }, [config])

  const chip = chipFor(state, now)
  const online = chip.tone !== 'off'
  const joined = state.connected && state.channelStatus === 'SUBSCRIBED'
  const ccValue = state.status?.ccValue

  const flash = text => {
    setNote(text)
    setTimeout(() => setNote(current => (current === text ? '' : current)), D.noteShowMs)
  }

  const connect = event => {
    event.preventDefault()
    const next = normalizePairCode(code)
    if (!isValidPairCode(next)) {
      setCodeError('Kode harus 8 karakter: huruf A–Z dan angka 2–9, tanpa O, 0, I, 1.')
      return
    }
    setCodeError('')
    setCode(next)
    const result = connectDucker(next)
    if (!result.ok) setCodeError(result.error === 'no-supabase' ? 'Supabase belum dikonfigurasi di situs ini.' : 'Kode tidak valid.')
  }

  const saveCalibration = () => {
    const normal = toCc(normalValue)
    const duck = toCc(duckValue)
    if (Number.isNaN(normal) || Number.isNaN(duck)) {
      setCalError(`Isi angka bulat ${D.ccMin}–${D.ccMax}.`)
      return
    }
    setCalError('')
    const next = {}
    if (normal !== null) next.normalValue = normal
    if (duck !== null) next.duckValue = duck
    if (sendConfig(next)) flash('Kalibrasi dikirim ke Ducker.')
  }

  return (
    <section className="booth-panel booth-ducker" aria-labelledby="booth-ducker-title">
      <header className="booth-panel__head">
        <h2 id="booth-ducker-title">Ducker DJ</h2>
        <span className={`booth-ducker__chip is-${chip.tone}`} role="status" aria-live="polite">
          {chip.label}
        </span>
      </header>

      <form className="booth-url" onSubmit={connect}>
        <label className="booth-field">
          <span className="booth-field__label">Kode pairing</span>
          <input
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Kode 8 karakter dari app Ducker"
            value={code}
            onChange={event => {
              setCode(event.target.value.toUpperCase())
              setCodeError('')
            }}
            disabled={state.connected}
            aria-invalid={!!codeError}
          />
        </label>
        {/* Different keys: reusing one <button> would turn the Disconnect click into a form submit
            the moment it becomes Connect, and the booth would connect again straight away. */}
        {state.connected ? (
          <button
            key="disconnect"
            type="button"
            className="booth-btn"
            onClick={event => {
              event.preventDefault()
              disconnectDucker()
            }}
          >
            Putuskan
          </button>
        ) : (
          <button key="connect" type="submit" className="booth-btn booth-btn--primary">
            Sambungkan
          </button>
        )}
      </form>
      {codeError && <p className="booth-error" role="alert">{codeError}</p>}

      {state.connected && (
        <p className="booth-hint">
          {online
            ? `${state.appVersion ? `App ${state.appVersion}` : 'App'} · ${state.status.ducked ? 'musik sedang dikecilkan' : 'musik normal'}`
            : joined
              ? 'Menunggu status dari app Ducker. Pastikan app berjalan di MacBook DJ dengan kode yang sama.'
              : 'Menyambung ke channel...'}
        </p>
      )}
      {state.lastError && now - state.lastError.at < D.errorShowMs && (
        <p className="booth-error" role="alert">
          Ducker: {state.lastError.message || state.lastError.code}
        </p>
      )}

      <div className="booth-ducker__actions">
        <button type="button" className="booth-btn" onClick={() => testDucker() && flash('Tes ducking dikirim.')} disabled={!online}>
          Tes ducking
        </button>
        <button type="button" className="booth-btn" onClick={() => restoreNow() && flash('Perintah kembalikan volume dikirim.')} disabled={!joined}>
          Kembalikan volume sekarang
        </button>
      </div>
      {note && <p className="booth-hint" role="status">{note}</p>}

      <details className="booth-ducker__cal">
        <summary>Kalibrasi (saat soundcheck)</summary>
        <div className="booth-ducker__calbody">
          <p className="booth-hint">
            Mengubah Master Level rekordbox langsung. Pakai hanya saat soundcheck sambil mendengar dari sound system.
          </p>
          <p className="booth-ducker__cc">
            CC sekarang: <strong>{ccValue ?? '–'}</strong>
          </p>

          <div className="booth-ducker__row">
            <label className="booth-field">
              <span className="booth-field__label">Nilai normal (CC)</span>
              <input type="number" inputMode="numeric" min={D.ccMin} max={D.ccMax} step={1} value={normalValue} onChange={event => setNormalValue(event.target.value)} />
            </label>
            <label className="booth-field">
              <span className="booth-field__label">Nilai duck (CC)</span>
              <input type="number" inputMode="numeric" min={D.ccMin} max={D.ccMax} step={1} value={duckValue} onChange={event => setDuckValue(event.target.value)} />
            </label>
            <button type="button" className="booth-btn" onClick={saveCalibration} disabled={!online}>
              Simpan
            </button>
          </div>
          {calError && <p className="booth-error" role="alert">{calError}</p>}

          <div className="booth-ducker__row">
            <label className="booth-slider booth-ducker__probe">
              <span className="booth-slider__row">
                <span className="booth-slider__label">Kirim nilai</span>
                <span className="booth-slider__value">{probe}</span>
              </span>
              <input type="range" min={D.ccMin} max={D.ccMax} step={1} value={probe} onChange={event => setProbe(Number(event.target.value))} />
            </label>
            <button type="button" className="booth-btn" onClick={() => sendValue(probe)} disabled={!online}>
              Kirim
            </button>
          </div>
        </div>
      </details>
    </section>
  )
}
