import { Slider } from './boothParts.jsx'

// Both volume sliders in one panel under the queue. Master sets cheers and music together;
// Music volume sets only the music (YouTube or live input).
export default function VolumePanel({ master, onMaster, music, onMusic }) {
  return (
    <section className="booth-panel booth-volume" aria-labelledby="booth-volume-title">
      <header className="booth-panel__head">
        <h2 id="booth-volume-title">Volume</h2>
      </header>
      <div className="booth-volume__sliders">
        <Slider
          id="master-volume"
          label="Master"
          value={Math.round(master * 100)}
          min={0}
          max={100}
          format={value => `${value}%`}
          onChange={value => onMaster(value / 100)}
        />
        <Slider
          id="music-volume"
          label="Music volume"
          value={Math.round(music * 100)}
          min={0}
          max={100}
          format={value => `${value}%`}
          onChange={value => onMusic(value / 100)}
        />
      </div>
    </section>
  )
}
