import { useEffect, useRef, useState } from 'react'
import { listAudioInputs } from '../../lib/ducking.js'
import { Slider } from './boothParts.jsx'

// Live input (DJ): the DJ mixer's output comes into this laptop and is ducked like YouTube.
// MusicPlayer owns the connection; this panel shows the device picker, meter and volume.
export default function LiveInput({ started, live, connecting, onConnect, onDisconnect, volume, onVolume }) {
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const meterRef = useRef(null)

  // Device names only show after the browser has asked for microphone permission once.
  useEffect(() => {
    if (!started) return
    let alive = true
    const load = () =>
      listAudioInputs().then(list => {
        if (alive) setDevices(list)
      })
    load()
    navigator.mediaDevices?.addEventListener?.('devicechange', load)
    return () => {
      alive = false
      navigator.mediaDevices?.removeEventListener?.('devicechange', load)
    }
  }, [started, live])

  // Input meter, drawn straight to the DOM every frame so React does not re-render 60 times a second.
  useEffect(() => {
    if (!live) return
    let frame = 0
    const draw = () => {
      const peak = Math.min(1, live.meter())
      if (meterRef.current) {
        meterRef.current.style.transform = `scaleX(${peak})`
        meterRef.current.dataset.clip = peak > 0.98 ? 'true' : 'false'
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [live])

  return (
    <div className="booth-live">
      <p className="booth-hint">
        Connect the DJ mixer&apos;s master out to this laptop through a USB audio interface. Send this laptop&apos;s
        output to the sound system, not back into the DJ mixer, or the sound will loop and squeal.
      </p>

      <label className="booth-field">
        <span className="booth-field__label">Audio input</span>
        <select
          value={deviceId}
          onChange={event => setDeviceId(event.target.value)}
          disabled={!started || !!live || connecting}
        >
          <option value="">Default input</option>
          {devices
            .filter(device => device.id && device.id !== 'default')
            .map(device => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
        </select>
      </label>

      {live ? (
        <button type="button" className="booth-btn" onClick={onDisconnect}>
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          className="booth-btn booth-btn--primary"
          onClick={() => onConnect(deviceId)}
          disabled={!started || connecting}
        >
          {connecting ? 'Connecting...' : 'Connect live input'}
        </button>
      )}

      <div className="booth-now-track" aria-live="polite">
        <span className="booth-now-track__label">Now playing</span>
        <span className="booth-now-track__title">{live ? `Live · ${live.label}` : 'Live input is off'}</span>
      </div>

      <div className="booth-meter" aria-hidden="true">
        <span ref={meterRef} className="booth-meter__bar" />
      </div>

      <Slider
        id="live-volume"
        label="Music volume"
        value={Math.round(volume * 100)}
        min={0}
        max={100}
        format={value => `${value}%`}
        onChange={value => onVolume(value / 100)}
      />
    </div>
  )
}
