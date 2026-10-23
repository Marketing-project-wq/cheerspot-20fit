import { COPY, TICKER_WORDS } from './copy.js'

export function Header({ lang }) {
  return (
    <div className="cz-header">
      <img src="/assets/hero.png" alt={COPY.ariaLogo[lang]} className="cz-logo" />
      <div className="cz-live">
        <span className="cz-live-dot" />
        {COPY.liveAt[lang]}
      </div>
    </div>
  )
}

function Equalizer() {
  return (
    <span className="cz-eq" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="cz-eq-bar" style={{ animationDelay: -i * 0.2 + 's' }} />
      ))}
    </span>
  )
}

function Ticker() {
  const run = (k) => (
    <span key={k} className="cz-ticker-run">
      {TICKER_WORDS.flatMap((w, i) => [
        <span key={'w' + i}>{w}</span>,
        <span key={'s' + i} className="cz-ticker-sep">/</span>,
      ])}
    </span>
  )
  return (
    <div className="cz-ticker" aria-hidden="true">
      <div className="cz-ticker-track">{[run('a'), run('b')]}</div>
    </div>
  )
}

export function Hero({ lang }) {
  return (
    <div className="cz-hero">
      <div aria-hidden="true" className="cz-hero-base" />
      <div aria-hidden="true" className="cz-hero-stripes" />
      <div aria-hidden="true" className="cz-hero-glow" />
      <div className="cz-hero-body">
        <div className="cz-kicker">
          <span className="cz-kicker-line" />
          <span className="cz-kicker-text">HYROX SPORTFEST · VOL.3</span>
          <Equalizer />
        </div>
        <h1 className="cz-hero-title">
          <span className="cz-hero-line">{COPY.heroA[lang]}</span>
          <span className="cz-hero-line cz-hero-line--red">{COPY.heroB[lang]}</span>
        </h1>
        <p className="cz-hero-sub">{COPY.heroSub[lang]}</p>
      </div>
      <Ticker />
    </div>
  )
}
