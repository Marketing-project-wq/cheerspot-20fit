import { useState } from 'react'
import { COPY, SUCCESS_VARIANTS } from './copy.js'
import { ButtonMicIcon, VariantIcon } from './icons.jsx'
import { LOGO_URL } from '../../lib/brand.js'
import CheerStatus from './CheerStatus.jsx'

const FX_COLORS = ['#BF0000', '#FFFFFF', '#FF4545', '#FFFFFF', '#BF0000']

// Confetti and ring layout is fixed, so compute it once
const FX_RINGS = [0, 1, 2]
const FX_PARTICLES = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.3
  const d = 80 + ((i * 37) % 34)
  const big = i % 3 === 0
  return {
    i,
    w: big ? 8 : 6,
    h: big ? 8 : 14,
    radius: big ? '50%' : 2,
    color: FX_COLORS[i % FX_COLORS.length],
    dx: Math.round(Math.cos(a) * d * 1.45) + 'px',
    dy: Math.round(Math.sin(a) * d * 0.9) + 'px',
    rot: ((i * 47) % 360) + 'deg',
    delay: (i % 7) * 0.32 + 's',
  }
})

// Split trailing emoji off the title so it can be set smaller
const TRAIL = /[\s‍️\p{Extended_Pictographic}]+$/u
const EMOJI_TAIL = /[‍️\p{Extended_Pictographic}]+(?:\s*[‍️\p{Extended_Pictographic}]+)*$/u

export default function SuccessScreen({ lang, athlete, sent, onAgain }) {
  // A random variant per success, like the design's default
  const [v] = useState(() => 1 + Math.floor(Math.random() * 5))
  const item = SUCCESS_VARIANTS[v]
  const copy = item[lang]
  const name = (athlete || '').trim() || (lang === 'en' ? 'Athlete' : 'Atlet')
  const titleMain = copy.t.replace(TRAIL, '')
  const titleEmoji = (copy.t.match(EMOJI_TAIL) || [''])[0].replace(/\s+/g, '')
  const parts = copy.b.split('{n}')

  return (
    <div className="cz-app">
      <div className="cz-success-top">
        <img src={LOGO_URL} alt={COPY.ariaLogo[lang]} className="cz-logo" style={{ height: 24 }} />
      </div>

      <div className="cz-s-visual">
        <div className="cz-s-fx" aria-hidden="true">
          {FX_RINGS.map((i) => (
            <div key={'r' + i} className="cz-s-ring" style={{ animationDelay: i * 0.8 + 's' }} />
          ))}
          {FX_PARTICLES.map((p) => (
            <span
              key={'c' + p.i}
              className="cz-s-confetti"
              style={{
                width: p.w,
                height: p.h,
                borderRadius: p.radius,
                background: p.color,
                '--dx': p.dx,
                '--dy': p.dy,
                '--r': p.rot,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
        <div className="cz-s-badge">
          <div className="cz-s-icon">
            <VariantIcon kind={item.icon} />
          </div>
        </div>
      </div>

      <div className="cz-s-text">
        <h1 className="cz-s-title">
          {titleMain}
          <span className="cz-s-emoji">{titleEmoji}</span>
        </h1>
        <p className="cz-s-body">
          {parts.map((text, i) => (
            <span key={i}>
              {text}
              {i < parts.length - 1 && <strong>{name}</strong>}
            </span>
          ))}
        </p>
      </div>

      <div className="cz-s-status">
        <CheerStatus lang={lang} cheers={sent} limit={1} compact />
      </div>

      <div className="cz-s-foot">
        <button className="cz-s-cta" onClick={onAgain}>
          <ButtonMicIcon size={24} />
          <span>{copy.c}</span>
        </button>
        <button className="cz-s-home" onClick={onAgain}>
          {COPY.homeBack[lang]}
        </button>
      </div>
    </div>
  )
}
