// Icons from the design's SVG markup. Only width and height change with size.
export function IconPlay({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
    </svg>
  )
}

export function IconPause({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" />
    </svg>
  )
}

export function IconReplay({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  )
}

export function IconSkip({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5v14l10-7z" fill="currentColor" />
      <rect x="16" y="5" width="3" height="14" rx="1" fill="currentColor" />
    </svg>
  )
}

export function IconSpeaker() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#F4F4EF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M4 9v6h4l5 4V5L8 9z" fill="#F4F4EF" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  )
}

export function IconChevron() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
