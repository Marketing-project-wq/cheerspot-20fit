// Shared booth controls: icons, labelled sliders, and time formatting.

const PATHS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  next: 'M6 18l8.5-6L6 6v12zM16 6h2v12h-2z',
  previous: 'M6 6h2v12H6zM18 6v12l-8.5-6L18 6z',
  shuffle: 'M3 6h3.5c2 0 3.2 1 4.2 2.6l1.6 2.8 1.6 2.8c1 1.6 2.2 2.6 4.2 2.6H21M3 18h3.5c2 0 3.2-1 4.2-2.6M21 6h-3.5c-2 0-3.2 1-4.2 2.6M17 3l3 3-3 3M17 15l3 3-3 3',
  skip: 'M5 5l10 7-10 7V5zM17 5h2v14h-2z',
  replay: 'M12 5V2L7 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z',
  up: 'M12 7l-7 8h14z',
  down: 'M12 17l7-8H5z',
  drag: 'M9 5h2v2H9zM13 5h2v2h-2zM9 11h2v2H9zM13 11h2v2h-2zM9 17h2v2H9zM13 17h2v2h-2z',
  volume: 'M4 9v6h4l5 4V5L8 9H4zM16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12',
  chevron: 'M6 9l6 6 6-6',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.8-4.8',
  pin: 'M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 15v6',
}

// Icons drawn as outlines rather than filled shapes.
const STROKED = new Set(['shuffle', 'replay', 'volume', 'chevron', 'search', 'pin'])

export function Icon({ name, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={STROKED.has(name) ? 'none' : 'currentColor'}
      stroke={STROKED.has(name) ? 'currentColor' : 'none'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

// Labelled range input. Value and onChange use the same unit as min and max.
export function Slider({ label, value, min, max, step = 1, format, onChange, id }) {
  const shown = format ? format(value) : value
  return (
    <label className="booth-slider" htmlFor={id}>
      <span className="booth-slider__row">
        <span className="booth-slider__label">{label}</span>
        <span className="booth-slider__value">{shown}</span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = String(total % 60).padStart(2, '0')
  // Long YouTube mixes show hours, like 1:29:22.
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}
