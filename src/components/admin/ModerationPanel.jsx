import { useEffect, useRef } from 'react'
import { pick, STRINGS, TABS } from './strings.js'
import { focusIdOf, visibleItems } from './data.js'
import { CheckIcon, Svg } from './icons.jsx'
import CheerCard from './CheerCard.jsx'

export default function ModerationPanel({ m, lang }) {
  const S = STRINGS[lang] || STRINGS.id
  const ddRef = useRef(null)
  const vis = visibleItems(m.items, m.tab, m.q)
  const fid = focusIdOf(vis, m.focus)
  const tabInfo = TABS.find(t => t.key === m.tab) || TABS[0]
  const countFor = key => (key === 'all' ? m.items.length : m.items.filter(x => x.status === key).length)

  useEffect(() => {
    if (!m.ddOpen) return undefined
    const onDown = e => {
      if (ddRef.current && !ddRef.current.contains(e.target)) m.setDdOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [m.ddOpen, m.setDdOpen])

  const pickTab = key => {
    m.setTab(key)
    m.setFocus(null)
    m.setDdOpen(false)
  }

  return (
    <div className="adm-page adm-page--mod">
      <div className="adm-heading">
        <h1 className="adm-title">
          {pick(tabInfo.label, lang)} · {vis.length}
        </h1>
        <div className="adm-live">
          <span className="adm-live__dot" />
          {S.newest}
        </div>
        <div className="adm-heading__break" />

        <div className="adm-dd" ref={ddRef}>
          <button
            type="button"
            className={`adm-dd__btn${m.ddOpen ? ' is-open' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={m.ddOpen}
            onClick={() => m.setDdOpen(o => !o)}
          >
            <span className="adm-dot" style={{ background: tabInfo.dot }} />
            <span className="adm-dd__label">{pick(tabInfo.label, lang)}</span>
            <span className="adm-count adm-count--inv">{countFor(tabInfo.key)}</span>
            <Svg size={16} stroke="#0A0A0A" strokeWidth={2.6} className={`adm-chev${m.ddOpen ? ' is-open' : ''}`}>
              <path d="M6 9l6 6 6-6" />
            </Svg>
          </button>
          {m.ddOpen && (
            <div role="listbox" className="adm-dd__list">
              {TABS.map(t => {
                const on = t.key === m.tab
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={`adm-dd__opt${on ? ' is-on' : ''}`}
                    onClick={() => pickTab(t.key)}
                  >
                    <span className="adm-dot" style={{ background: t.dot }} />
                    <span className="adm-dd__opt-label">{pick(t.label, lang)}</span>
                    <span className="adm-dd__opt-count">{countFor(t.key)}</span>
                    <span className="adm-dd__check">{on && <CheckIcon size={16} stroke="#BF0000" />}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="adm-search">
          <Svg size={16} stroke="#55554F" strokeWidth={2.4} className="adm-search__icon">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </Svg>
          <input
            type="text"
            aria-label={S.search}
            value={m.q}
            onChange={e => m.setQ(e.target.value)}
            placeholder={S.search}
          />
        </div>
      </div>

      <div className="adm-grid">
        {vis.map(x => (
          <CheerCard
            key={x.id}
            x={x}
            lang={lang}
            now={m.now}
            words={m.words}
            settings={m.settings}
            focused={x.id === fid}
            playing={m.playId === x.id}
            pos={m.pos}
            picking={m.picking === x.id}
            actions={{
              onFocus: () => m.setFocus(x.id),
              onPlay: () => m.play(x.id),
              onApprove: () => m.decide(x.id, 'approved'),
              onReject: () => {
                m.setPicking(x.id)
                m.setFocus(x.id)
              },
              onReason: key => m.decide(x.id, 'rejected', key),
              onCancelPick: () => m.setPicking(null),
              onRestore: () => m.restore(x.id),
              onDelete: () => {
                if (window.confirm(S.delConfirm.replace('{sender}', x.sender).replace('{athlete}', x.athlete))) m.removeCheer(x.id)
              },
            }}
          />
        ))}
      </div>

      {vis.length === 0 && (
        <div className="adm-empty">
          <div className="adm-empty__title">{S.allClear}</div>
          <div className="adm-empty__sub">{S.emptySub}</div>
        </div>
      )}
    </div>
  )
}
