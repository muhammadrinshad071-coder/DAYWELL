import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useI18n } from '../core/i18n'
import { PWAContext, useFeedback } from './context'

interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function PWAProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { toast } = useFeedback()
  const [event, setEvent] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches)
  const { offlineReady: [offlineReady], needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    immediate: true,
    onOfflineReady() { toast(t('pwa.ready'), 'info') },
    onRegisterError() { toast(t('pwa.registrationError'), 'error') },
  })
  useEffect(() => {
    const ready = (value: Event) => { value.preventDefault(); setEvent(value as InstallEvent) }
    const completed = () => { setInstalled(true); setEvent(null) }
    window.addEventListener('beforeinstallprompt', ready)
    window.addEventListener('appinstalled', completed)
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', completed) }
  }, [])
  const install = useCallback(async () => {
    if (!event) return
    try { await event.prompt(); await event.userChoice; setEvent(null) }
    catch { toast(t('pwa.installHelp'), 'info') }
  }, [event, t, toast])
  const update = async () => { try { await updateServiceWorker(true) } catch { toast(t('pwa.updateError'), 'error') } }
  return <PWAContext.Provider value={{ install: event && !installed ? install : null, installed, offlineReady, needRefresh, update, dismissUpdate: () => setNeedRefresh(false) }}>{children}</PWAContext.Provider>
}
