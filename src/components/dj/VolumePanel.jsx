import { Slider } from './boothParts.jsx'

// Two independent volumes under the queue: the cheers, and the music (YouTube or live input).
export default function VolumePanel({ cheer, onCheer, music, onMusic }) {
  return (
    <section className="booth-panel booth-volume" aria-labelledby="booth-volume-title">
      <header className="booth-panel__head">
        <h2 id="booth-volume-title">Volume</h2>
      </header>
      <div className="booth-volume__sliders">
        <Slider
          id="cheer-volume"
          label="Cheer volume"
          value={Math.round(cheer * 100)}
          min={0}
          max={100}
          format={value => `${value}%`}
          onChange={value => onCheer(value / 100)}
        />
        <p className="booth-volume__hint">Voice notes from the crowd.</p>
        <Slider
          id="music-volume"
          label="Music volume"
          value={Math.round(music * 100)}
          min={0}
          max={100}
          format={value => `${value}%`}
          onChange={value => onMusic(value / 100)}
        />
        <p className="booth-volume__hint">YouTube or the live input from the DJ mixer.</p>
      </div>
    </section>
  )
}
