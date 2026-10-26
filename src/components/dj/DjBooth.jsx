import { useEffect } from 'react'
import { useT } from '../../lib/i18n.jsx'
import { COPY, fmt } from './copy.js'
import useDjBooth from './useDjBooth.js'
import DjHeader from './DjHeader.jsx'
import NowPlaying from './NowPlaying.jsx'
import QueuePanel from './QueuePanel.jsx'
import HistoryPanel from './HistoryPanel.jsx'
import './dj.css'

export default function DjBooth() {
  const { lang } = useT()
  const c = COPY[lang] || COPY.id
  const b = useDjBooth()
  const dur = b.now ? b.audioDur || b.now.dur || 0 : 0
  const autoLeft = fmt((b.autoUntil - b.nowTs) / 1000)

  useEffect(() => {
    // Keeps the dark background behind the page when it overscrolls.
    const prev = document.body.style.background
    document.body.style.background = '#050505'
    return () => {
      document.body.style.background = prev
    }
  }, [])

  return (
    <div className="dj-root">
      <DjHeader
        c={c}
        auto={b.auto}
        autoLeft={autoLeft}
        toggleAuto={b.toggleAuto}
        newCount={b.newCount}
        vol={b.vol}
        setVol={b.setVol}
        nowTs={b.nowTs}
      />

      {b.autoEnded && (
        <div className="dj-ended">
          <span className="dj-ended__dot" />
          <span className="dj-ended__text">{c.autoEnded}</span>
          <button type="button" className="dj-btn" onClick={b.toggleAuto}>
            {c.autoAgain}
          </button>
          <button type="button" className="dj-btn-close" onClick={b.dismissEnded} aria-label={c.ariaClose}>
            ×
          </button>
        </div>
      )}

      <div className="dj-body">
        <NowPlaying
          c={c}
          now={b.now}
          playing={b.playing}
          pos={b.pos}
          dur={dur}
          gapLeft={b.gapLeft}
          next={b.queue[0] ?? null}
          loadError={b.loadError}
          onToggle={b.toggle}
          onSkip={b.skip}
          onReplay={b.replay}
        />
        <div className="dj-side">
          <QueuePanel c={c} queue={b.queue} fresh={b.fresh} nowTs={b.nowTs} onPlay={b.playItem} />
          <HistoryPanel c={c} history={b.history} open={b.histOpen} setOpen={b.setHistOpen} onReplay={b.playItem} />
        </div>
      </div>

      {b.saveFailed && (
        <div className="dj-toast" role="status">
          {c.saveError}
        </div>
      )}
    </div>
  )
}
