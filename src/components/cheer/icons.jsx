// Inline SVG icons copied from the Cheer design. Stroke and fill follow currentColor.

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }

export function MicIcon({ size = 56, width = 2.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...stroke, strokeWidth: width }} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  )
}

export function PlayIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
    </svg>
  )
}

export function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" />
    </svg>
  )
}

export function RedoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ ...stroke, strokeWidth: 2.4 }} aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  )
}

export function ArrowIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ ...stroke, strokeWidth: 2.8 }} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ ...stroke, strokeWidth: 2.4, flex: 'none' }} aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21h4" />
    </svg>
  )
}

export function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ ...stroke, strokeWidth: 2.2, flex: 'none', marginTop: 1 }} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function MicOffIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" style={{ ...stroke, strokeWidth: 2.2 }} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

export function ButtonMicIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...stroke, strokeWidth: 2.6, flex: 'none' }} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  )
}

// Success screen variant icons (64-unit viewBox)
const big = { fill: 'none', stroke: 'currentColor', strokeWidth: 4.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function VariantIcon({ kind }) {
  if (kind === 'cup') {
    return (
      <svg width="68" height="68" viewBox="0 0 64 64" style={big} aria-hidden="true">
        <path d="M12 26h32v12a15 15 0 0 1-15 15h-2a15 15 0 0 1-15-15z" fill="currentColor" />
        <path d="M44 30h4a7 7 0 0 1 0 14h-5" />
        <path d="M20 6c-3 4 3 7 0 12" />
        <path d="M28 6c-3 4 3 7 0 12" />
        <path d="M36 6c-3 4 3 7 0 12" />
      </svg>
    )
  }
  if (kind === 'sled') {
    return (
      <svg width="72" height="72" viewBox="0 0 64 64" style={big} aria-hidden="true">
        <path d="M4 48h42c5 0 8-2 10-6" />
        <rect x="10" y="30" width="28" height="13" rx="2" fill="currentColor" />
        <path d="M40 43L52 14" />
        <path d="M48 14h8" />
        <path d="M14 54l-4 4" />
        <path d="M40 54l-4 4" />
      </svg>
    )
  }
  if (kind === 'ball') {
    return (
      <svg width="68" height="68" viewBox="0 0 64 64" style={{ fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }} aria-hidden="true">
        <path d="M22 4v9M32 1v12M42 4v9" style={{ stroke: '#FFFFFF', strokeWidth: 4.5 }} />
        <circle cx="32" cy="40" r="20" fill="#FFFFFF" />
        <path d="M13 36c12 7 26 7 38 0" style={{ stroke: '#BF0000', strokeWidth: 3.5 }} />
        <path d="M14 46c11 5 25 5 36 0" style={{ stroke: '#BF0000', strokeWidth: 3.5 }} />
      </svg>
    )
  }
  if (kind === 'medal') {
    return (
      <svg width="68" height="68" viewBox="0 0 64 64" style={big} aria-hidden="true">
        <path d="M20 5l12 20 12-20" />
        <circle cx="32" cy="41" r="17" />
        <path d="M32 31l3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8-4.9-4.8 6.8-1z" fill="currentColor" strokeWidth={2} />
      </svg>
    )
  }
  return (
    <svg width="68" height="68" viewBox="0 0 64 64" style={big} aria-hidden="true">
      <rect x="23" y="7" width="18" height="31" rx="9" fill="currentColor" />
      <path d="M15 30a17 17 0 0 0 34 0" />
      <path d="M32 47v9" />
      <path d="M22 57h20" />
    </svg>
  )
}
