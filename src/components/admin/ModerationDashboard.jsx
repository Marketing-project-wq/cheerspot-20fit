import { useT } from '../../lib/i18n.jsx'
import { STRINGS } from './strings.js'
import useMediaQuery from './useMediaQuery.js'
import useModeration from './useModeration.js'
import Sidebar from './Sidebar.jsx'
import ModerationPanel from './ModerationPanel.jsx'
import { HistoryPanel, QueuePanel } from './ListPanels.jsx'
import QrPanel from './QrPanel.jsx'
import SettingsPanel from './SettingsPanel.jsx'
import DjAccountsPanel from './DjAccountsPanel.jsx'

export default function ModerationDashboard({ adminName, liveFeed, onLogout }) {
  const { lang, setLang } = useT()
  const S = STRINGS[lang] || STRINGS.id
  const wide = useMediaQuery('(min-width: 900px)')
  const tall = useMediaQuery('(min-width: 900px) and (min-height: 620px)')
  const m = useModeration({ lang, liveFeed })

  const counts = {
    mod: m.items.filter(x => x.status === 'pending').length,
    queue: m.items.filter(x => x.status === 'approved').length,
  }

  return (
    <div className="adm-shell">
      <Sidebar
        wide={wide}
        showShortcuts={tall && m.page === 'mod'}
        lang={lang}
        setLang={setLang}
        page={m.page}
        setPage={m.setPage}
        counts={counts}
        adminName={adminName}
        onLogout={onLogout}
      />

      <main className="adm-main">
        {m.page === 'mod' && <ModerationPanel m={m} lang={lang} />}
        {m.page === 'queue' && <QueuePanel m={m} lang={lang} />}
        {m.page === 'hist' && <HistoryPanel m={m} lang={lang} />}
        {m.page === 'qr' && <QrPanel lang={lang} eventName={m.eventName} copied={m.copied} onCopy={m.copyLink} />}
        {m.page === 'dj' && <DjAccountsPanel lang={lang} />}
        {m.page === 'set' && <SettingsPanel m={m} lang={lang} />}
      </main>

      {m.toast && (
        <div className="adm-toast" role="status">
          <span className="adm-toast__dot" style={{ background: m.toast.color }} />
          <span className="adm-toast__msg">{m.toast.msg}</span>
          <button type="button" className="adm-toast__undo" onClick={m.undo}>
            {S.undo}
            <span className="adm-toast__key">Z</span>
          </button>
        </div>
      )}
    </div>
  )
}
