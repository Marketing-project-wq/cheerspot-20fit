import { LOGO_ALT, LOGO_URL } from '../../lib/brand.js'
import CheerNowPlaying from './CheerNowPlaying.jsx'
import CheerQueue from './CheerQueue.jsx'
import MusicPlayer from './MusicPlayer.jsx'
import useCheerBooth from './useCheerBooth.js'
import VolumePanel from './VolumePanel.jsx'
import './booth.css'

export default function CheerBooth({ onLogout }) {
  const booth = useCheerBooth()
  const {
    started,
    mode,
    setMode,
    master,
    setMaster,
    items,
    queuedIds,
    status,
    pill,
    focusItem,
    focusLabel,
    countdown,
    toast,
    playItem,
    togglePlayPause,
    replayFocus,
    skip,
    moveUp,
    moveDown,
    reorder,
    deleteItem,
  } = booth

  return (
    <div className="booth">
      <header className="booth-top">
        <h1 className="booth-title">
          <img src={LOGO_URL} alt={`${LOGO_ALT} CheerSpot Booth`} className="booth-logo" />
        </h1>

        <span className={`booth-pill booth-pill--${pill.tone}`} role="status" aria-live="polite">
          {pill.label}
        </span>

        <div className="booth-mode" role="group" aria-label="Mode">
          <button type="button" aria-pressed={mode === 'auto'} className={mode === 'auto' ? 'is-active' : ''} onClick={() => setMode('auto')}>
            AUTO
          </button>
          <button type="button" aria-pressed={mode === 'manual'} className={mode === 'manual' ? 'is-active' : ''} onClick={() => setMode('manual')}>
            MANUAL
          </button>
        </div>

        <button type="button" className="booth-btn booth-logout" onClick={onLogout}>
          Log out
        </button>
      </header>

      {booth.needsTap && (
        <p className="booth-tapnote" role="status">
          Klik di mana saja untuk menyalakan suara booth.
        </p>
      )}

      <div className="booth-body">
        <main className="booth-grid">
          <MusicPlayer started={started} onToast={booth.showToast} />

          <CheerNowPlaying
            item={focusItem}
            label={focusLabel}
            status={status}
            countdown={countdown}
            onPlayPause={togglePlayPause}
            onSkip={skip}
            onReplay={replayFocus}
          />

          <CheerQueue
            items={items}
            queuedIds={queuedIds}
            activeId={status.cheerId}
            onPlayNow={playItem}
            onReplay={playItem}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onReorder={reorder}
            onDelete={deleteItem}
          />

          <VolumePanel master={master} onMaster={setMaster} music={booth.musicVolume} onMusic={booth.setMusicVolume} />
        </main>
      </div>

      {toast && (
        <div className="booth-toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}

    </div>
  )
}
