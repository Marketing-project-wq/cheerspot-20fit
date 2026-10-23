import { useEffect } from 'react'
import { useT } from '../lib/i18n.jsx'

export default function Admin() {
  const { t } = useT()

  useEffect(() => {
    document.title = 'Admin · CheerSpot'
  }, [])

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-center">
      <p className="text-neutral-500">{t('placeholder.note')}</p>
    </main>
  )
}
