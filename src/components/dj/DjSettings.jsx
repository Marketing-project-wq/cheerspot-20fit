import { Icon, Slider } from './boothParts.jsx'

// Collapsible panel. Values are saved by the booth hook.
export default function DjSettings({ open, onToggle, settings, onChange }) {
  return (
    <section className="booth-panel booth-settings">
      <button
        type="button"
        className="booth-settings__toggle"
        aria-expanded={open}
        aria-controls="booth-settings-body"
        onClick={onToggle}
      >
        Booth settings
        <span className={`booth-settings__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
          <Icon name="chevron" size={22} />
        </span>
      </button>

      {open && (
        <div id="booth-settings-body" className="booth-settings__grid">
          <Slider
            id="set-duck"
            label="Duck level"
            value={Math.round(settings.duckLevel * 100)}
            min={0}
            max={50}
            format={value => `${value}%`}
            onChange={value => onChange({ duckLevel: value / 100 })}
          />
          <Slider
            id="set-fade-down"
            label="Fade down"
            value={settings.fadeDownMs}
            min={0}
            max={5000}
            step={100}
            format={value => `${value} ms`}
            onChange={value => onChange({ fadeDownMs: value })}
          />
          <Slider
            id="set-fade-up"
            label="Fade up"
            value={settings.fadeUpMs}
            min={0}
            max={6000}
            step={100}
            format={value => `${value} ms`}
            onChange={value => onChange({ fadeUpMs: value })}
          />
          <Slider
            id="set-delay"
            label="Delay before fade up"
            value={settings.delayBeforeUpMs}
            min={0}
            max={5000}
            step={100}
            format={value => `${value} ms`}
            onChange={value => onChange({ delayBeforeUpMs: value })}
          />
          <Slider
            id="set-gap"
            label="Auto gap between cheers"
            value={settings.gapSec}
            min={15}
            max={300}
            step={5}
            format={value => `${value} s`}
            onChange={value => onChange({ gapSec: value })}
          />
        </div>
      )}
    </section>
  )
}
