// Inline SVG icons from the design files. Stroke icons use currentColor unless a colour is passed.

export function Svg({ size = 20, strokeWidth = 2, fill = 'none', stroke = 'currentColor', className, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function EyeIcon() {
  return (
    <Svg>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function EyeOffIcon() {
  return (
    <Svg>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Svg>
  )
}

export function AlertIcon() {
  return (
    <Svg size={18} stroke="#FF4545" strokeWidth={2.4} className="adm-alert__icon">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16v.5" />
    </Svg>
  )
}

export function ArrowIcon() {
  return (
    <Svg size={22} strokeWidth={2.8}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  )
}

export function CheckIcon({ size = 16, strokeWidth = 3, stroke = 'currentColor' }) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} stroke={stroke}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  )
}

export function LockIcon() {
  return (
    <Svg size={14} strokeWidth={2.2} className="adm-secure__icon">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  )
}

export function LogoutIcon() {
  return (
    <Svg size={16} strokeWidth={2.2}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </Svg>
  )
}
