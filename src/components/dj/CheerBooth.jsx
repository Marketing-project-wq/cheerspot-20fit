import { useState } from 'react'
import CheerNowPlaying from './CheerNowPlaying.jsx'
import CheerQueue from './CheerQueue.jsx'
import DjSettings from './DjSettings.jsx'
import MusicPlayer from './MusicPlayer.jsx'
import { Slider } from './boothParts.jsx'
import useCheerBooth from './useCheerBooth.js'
import './booth.css'

export default function CheerBooth() {
  const booth = useCheerBooth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const {
    started,
    mode,
    setMode,
    master,
    setMaster,
    settings,
    updateSettings,
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
  } = booth

  return (
    <div className="booth">
      <header className="booth-top">
        <h1 className="booth-title">CheerSpot Booth</h1>

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

        <div className="booth-master">
          <Slider
            id="master-volume"
            label="Master"
            value={Math.round(master * 100)}
            min={0}
            max={100}
            format={value => `${value}%`}
            onChange={value => setMaster(value / 100)}
          />
        </div>
      </header>

      <div className="booth-body" inert={!started}>
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
          />
        </main>

        <DjSettings
          open={settingsOpen}
          onToggle={() => setSettingsOpen(open => !open)}
          settings={settings}
          onChange={updateSettings}
        />
      </div>

      {toast && (
        <div className="booth-toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}

      {!started && (
        <div className="booth-start" role="dialog" aria-modal="true" aria-labelledby="booth-start-title">
          <div className="booth-start__card">
            <h2 id="booth-start-title">CheerSpot Booth</h2>
            <p>
              Browsers block sound until you press once. Start the session to open the booth. After that it runs
              without touching the screen.
            </p>
            <button type="button" className="booth-btn booth-btn--primary booth-btn--xl booth-start__button" onClick={booth.startSession}>
              Start session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
