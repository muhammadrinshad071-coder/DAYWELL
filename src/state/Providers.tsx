import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { ZodError } from 'zod'
import { newId } from '../core/ids'
import { emptyWorkspace, preferencesSchema, type Preferences, type Workspace } from '../core/models'
import { IndexedDBRepository } from '../core/repository'
import { useI18n } from '../core/i18n'
import { Button, IconButton, Modal } from '../components/ui'
import { ClockContext, DataContext, FeedbackContext, PreferencesContext, useFeedback, type ConfirmOptions, type ToastTone } from './context'

const repository = new IndexedDBRepository()

function initialPreferences(): Preferences {
  try { return preferencesSchema.parse(JSON.parse(localStorage.getItem('daywell.preferences') ?? '{}')) }
  catch { return preferencesSchema.parse({}) }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setValue] = useState(initialPreferences)
  const [preferenceError, setError] = useState(false)
  const valueRef = useRef(preferences)
  const setPreferences = useCallback((patch: Partial<Preferences>) => {
    const result = preferencesSchema.safeParse({ ...valueRef.current, ...patch })
    if (!result.success) return false
    valueRef.current = result.data
    setValue(result.data)
    try { localStorage.setItem('daywell.preferences', JSON.stringify(result.data)); setError(false); return true }
    catch { setError(true); return false }
  }, [])
  useEffect(() => {
    const theme = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && theme.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.lang = preferences.language
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141424' : '#3730a3')
    }
    apply()
    theme.addEventListener('change', apply)
    return () => theme.removeEventListener('change', apply)
  }, [preferences.theme, preferences.language])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== 'daywell.preferences' || !event.newValue) return
      const result = preferencesSchema.safeParse(JSON.parse(event.newValue))
      if (result.success) { valueRef.current = result.data; setValue(result.data) }
    }
    const safeChanged = (event: StorageEvent) => { try { changed(event) } catch { /* Ignore malformed preferences from another tab. */ } }
    window.addEventListener('storage', safeChanged)
    return () => window.removeEventListener('storage', safeChanged)
  }, [])
  return <PreferencesContext.Provider value={{ preferences, setPreferences, preferenceError }}>{children}</PreferencesContext.Provider>
}

function ToastMessage({ message, tone, dismiss }: { message: string; tone: ToastTone; dismiss: () => void }) {
  const { t } = useI18n()
  useEffect(() => { const timer = setTimeout(dismiss, tone === 'error' ? 9000 : 5500); return () => clearTimeout(timer) }, [dismiss, tone])
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? CircleAlert : Info
  return <m.div layout role={tone === 'error' ? 'alert' : 'status'} className={`toast toast-${tone}`} initial={{ opacity: 0, x: 25, scale: .95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 25 }}><Icon size={20} aria-hidden="true" /><p>{message}</p><IconButton icon={X} label={t('common.dismiss')} onClick={dismiss} /></m.div>
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toasts, setToasts] = useState<{ id: string; message: string; tone: ToastTone }[]>([])
  const [confirmation, setConfirmation] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const toast = useCallback((message: string, tone: ToastTone = 'success') => setToasts(existing => [...existing.slice(-2), { id: newId(), message, tone }]), [])
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => {
    resolver.current?.(false)
    resolver.current = resolve
    setConfirmation(options)
  }), [])
  const resolve = (accepted: boolean) => { resolver.current?.(accepted); resolver.current = null; setConfirmation(null) }
  const context = useMemo(() => ({ toast, confirm }), [toast, confirm])
  return <FeedbackContext.Provider value={context}>{children}
    <div className="toast-stack" aria-live="polite" aria-relevant="additions"><AnimatePresence>{toasts.map(item => <ToastMessage key={item.id} {...item} dismiss={() => setToasts(existing => existing.filter(toast => toast.id !== item.id))} />)}</AnimatePresence></div>
    <Modal open={!!confirmation} title={confirmation?.title ?? ''} description={confirmation?.description} onClose={() => resolve(false)}><div className="confirm-actions"><Button variant="secondary" onClick={() => resolve(false)}>{t('common.cancel')}</Button><Button variant={confirmation?.danger ? 'danger' : 'primary'} onClick={() => resolve(true)}>{confirmation?.confirmLabel ?? t('common.delete')}</Button></div></Modal>
  </FeedbackContext.Provider>
}

export function ClockProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    const schedule = () => {
      if (interval) clearInterval(interval)
      if (!document.hidden) { setNow(new Date()); interval = setInterval(() => setNow(new Date()), 60_000) }
    }
    schedule()
    document.addEventListener('visibilitychange', schedule)
    return () => { if (interval) clearInterval(interval); document.removeEventListener('visibilitychange', schedule) }
  }, [])
  return <ClockContext.Provider value={now}>{children}</ClockContext.Provider>
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(emptyWorkspace)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pending, setPending] = useState(0)
  const [storageError, setStorageError] = useState(false)
  const { toast } = useFeedback()
  const { t } = useI18n()
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const ready = useRef(false)
  const channel = useRef<BroadcastChannel | null>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const work = queue.current.catch(() => undefined).then(async () => {
      try {
        const loaded = await repository.load()
        if (mounted.current) { setData(loaded); setStatus('ready'); ready.current = true }
      } catch { if (mounted.current) { setStatus('error'); ready.current = false } }
    })
    queue.current = work
    await work
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('daywell-changes')
      channel.current.onmessage = () => { void refresh() }
    }
    const visible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { mounted.current = false; channel.current?.close(); channel.current = null; document.removeEventListener('visibilitychange', visible) }
  }, [refresh])

  const commit = useCallback(async (operation: () => Promise<Workspace>, success?: string): Promise<boolean> => {
    if (!ready.current) return false
    setPending(count => count + 1)
    const work = queue.current.catch(() => undefined).then(async () => {
      try {
        const saved = await operation()
        setData(saved)
        setStorageError(false)
        channel.current?.postMessage({ changed: true })
        if (success) toast(success)
        return true
      } catch (error) {
        const invalid = error instanceof ZodError || (error instanceof Error && error.message.startsWith('invalid-'))
        if (!invalid) setStorageError(true)
        toast(t(invalid ? 'common.invalidData' : 'app.storageError'), 'error')
        return false
      } finally { setPending(count => count - 1) }
    })
    queue.current = work
    return work
  }, [t, toast])

  const mutate = useCallback((mutation: (draft: Workspace) => void, success?: string) => commit(() => repository.update(mutation), success), [commit])
  const restore = useCallback((workspace: Workspace) => commit(() => repository.replace(workspace)), [commit])
  return <DataContext.Provider value={{ data, status, saving: pending > 0, storageError, mutate, restore, refresh }}>{children}</DataContext.Provider>
}
