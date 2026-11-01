import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Bell, BellRing, Check, Download, HardDrive, Info, Laptop, LockKeyhole, Moon, ShieldCheck, Smartphone, Sun, Trash2, Upload, UserRound } from 'lucide-react'
import { createBackup, MAX_BACKUP_BYTES, parseBackup, recordCount } from '../core/backup'
import { dateKey, displayDate } from '../core/dates'
import { useI18n } from '../core/i18n'
import { emptyWorkspace, preferencesSchema, type Preferences } from '../core/models'
import { currencies } from '../core/money'
import { useClock, useData, useFeedback, usePreferences, usePWA } from '../state/context'
import { Badge, Button, Card, Field, FormError, PageHeader, Progress } from '../components/ui'

type EditablePreferences = Pick<Preferences, 'name' | 'currency' | 'language' | 'dateFormat'>

export default function Settings() {
  const { data, saving, restore } = useData()
  const { preferences, setPreferences } = usePreferences()
  const { toast, confirm } = useFeedback()
  const { install, installed, offlineReady } = usePWA()
  const { t, locale } = useI18n()
  const today = dateKey(useClock())
  const [draft, setDraft] = useState<EditablePreferences>({ name: preferences.name, currency: preferences.currency, language: preferences.language, dateFormat: preferences.dateFormat })
  const [error, setError] = useState('')
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported')
  const [requesting, setRequesting] = useState(false)
  const [estimate, setEstimate] = useState<StorageEstimate>()
  const [persistent, setPersistent] = useState(false)
  const [persistenceBusy, setPersistenceBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => { setDraft({ name: preferences.name, currency: preferences.currency, language: preferences.language, dateFormat: preferences.dateFormat }) }, [preferences.name, preferences.currency, preferences.language, preferences.dateFormat])
  useEffect(() => {
    if (navigator.storage?.estimate) void navigator.storage.estimate().then(setEstimate).catch(() => undefined)
    if (navigator.storage?.persisted) void navigator.storage.persisted().then(setPersistent).catch(() => undefined)
    const focus = () => { if ('Notification' in window) setPermission(Notification.permission) }
    window.addEventListener('focus', focus)
    if (window.location.hash) requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'start' }))
    return () => window.removeEventListener('focus', focus)
  }, [])
  const savePreferences = (event: FormEvent) => {
    event.preventDefault()
    const validated = preferencesSchema.safeParse({ ...preferences, ...draft })
    if (!validated.success) { setError(t('common.invalidForm')); return }
    setError('')
    if (setPreferences(draft)) toast(t('common.saved'))
  }
  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    setRequesting(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      setPreferences({ notifications: result === 'granted' })
      toast(t(result === 'granted' ? 'settings.notificationEnabled' : 'settings.notificationDeniedHelp'), result === 'granted' ? 'success' : 'info')
    } catch { toast(t('settings.notificationFailure'), 'error') }
    finally { setRequesting(false) }
  }
  const testNotification = () => {
    try {
      const notification = new Notification(t('notification.title'), { body: t('notification.testBody'), icon: '/icon-192.png', tag: 'daywell-test' })
      setTimeout(() => notification.close(), 7000)
    } catch { toast(t('settings.notificationFailure'), 'error') }
  }
  const exportData = () => {
    try {
      const backup = createBackup(data, preferences)
      if (new TextEncoder().encode(backup).byteLength > MAX_BACKUP_BYTES) { toast(t('settings.backupTooLarge'), 'error'); return }
      const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url; link.download = `daywell-backup-${today}.json`; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast(t('settings.exported'))
    } catch { toast(t('settings.exportFailed'), 'error') }
  }
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      if (file.size > MAX_BACKUP_BYTES) { toast(t('settings.backupTooLarge'), 'error'); return }
      const backup = parseBackup(await file.text())
      const accepted = await confirm({ title: t('settings.restoreTitle'), description: t('settings.restoreDetail', { count: recordCount(backup.data), date: displayDate(dateKey(new Date(backup.exportedAt)), preferences.dateFormat, locale) }), confirmLabel: t('settings.restoreConfirm'), danger: true })
      if (accepted && await restore(backup.data)) {
        const preferencesSaved = setPreferences(backup.preferences)
        toast(t('settings.restored'), preferencesSaved ? 'success' : 'info')
      }
    } catch { toast(t('settings.importInvalid'), 'error') }
    finally { setImporting(false); if (fileInput.current) fileInput.current.value = '' }
  }
  const requestPersistence = async () => {
    if (!navigator.storage?.persist) return
    setPersistenceBusy(true)
    try { const granted = await navigator.storage.persist(); setPersistent(granted); toast(t(granted ? 'settings.persistenceGranted' : 'settings.persistenceNotGranted'), granted ? 'success' : 'info') }
    catch { toast(t('settings.persistenceNotGranted'), 'info') }
    finally { setPersistenceBusy(false) }
  }
  const clearData = async () => {
    if (await confirm({ title: t('settings.clearTitle'), description: t('settings.clearDetail'), confirmLabel: t('settings.clearData'), danger: true })) {
      if (await restore(emptyWorkspace())) toast(t('settings.cleared'))
    }
  }
  const storageText = (bytes: number) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`
  const permissionKey = permission === 'granted' ? 'settings.notificationGranted' : permission === 'denied' ? 'settings.notificationDenied' : permission === 'unsupported' ? 'settings.notificationUnsupported' : 'settings.notificationDefault'
  return <><PageHeader eyebrow={t('nav.settings')} title={t('settings.title')} description={t('settings.subtitle')} />
    <div className="settings-layout"><div className="settings-column"><form className="grid gap-5" onSubmit={savePreferences}>
      <Card className="card-padded"><div className="card-heading"><div className="settings-card-title"><span className="icon-tile indigo"><UserRound size={19} aria-hidden="true" /></span><div><h2>{t('settings.profile')}</h2><p>{t('app.localProfile')}</p></div></div></div><p className="settings-description">{t('settings.profileDetail')}</p><Field label={t('settings.profileName')} optional><input maxLength={60} placeholder={t('settings.namePlaceholder')} autoComplete="given-name" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></Field></Card>
      <Card className="card-padded"><div className="card-heading"><h2>{t('settings.preferences')}</h2></div><div className="form-grid"><Field label={t('common.currency')}><select value={draft.currency} onChange={event => setDraft(current => ({ ...current, currency: event.target.value as Preferences['currency'] }))}>{currencies.map(currency => <option value={currency} key={currency}>{currency}</option>)}</select></Field><Field label={t('settings.dateFormat')}><select value={draft.dateFormat} onChange={event => setDraft(current => ({ ...current, dateFormat: event.target.value as Preferences['dateFormat'] }))}><option value="friendly">{t('settings.dateFriendly')}</option><option value="day-first">{t('settings.dateDayFirst')}</option><option value="month-first">{t('settings.dateMonthFirst')}</option><option value="iso">{t('settings.dateISO')}</option></select></Field><Field className="form-full" label={t('settings.language')}><select value={draft.language} onChange={event => setDraft(current => ({ ...current, language: event.target.value as Preferences['language'] }))}><option value="en">{t('settings.english')}</option><option value="ml">{t('settings.malayalam')}</option><option value="hi">{t('settings.hindi')}</option></select></Field></div><p className="field-hint mt-3">{t('settings.translationHelp')}</p><p className="field-hint mt-3">{t('settings.currencyHelp')}</p><FormError message={error} /><div className="form-actions"><Button type="submit" icon={Check}>{t('common.save')}</Button></div></Card>
    </form><Card className="card-padded"><div className="card-heading"><h2>{t('settings.theme')}</h2></div><div className="theme-options">{([{ value: 'light', icon: Sun }, { value: 'dark', icon: Moon }, { value: 'system', icon: Laptop }] as const).map(({ value, icon: Icon }) => <button className={`theme-option ${preferences.theme === value ? 'selected' : ''}`} key={value} aria-pressed={preferences.theme === value} onClick={() => setPreferences({ theme: value })}><span className={`theme-preview theme-preview-${value}`}><span className="theme-preview-sidebar" /><span className="theme-preview-content"><span /><span /><span /></span></span><span className="theme-option-label"><Icon size={14} aria-hidden="true" />{t(`settings.${value}`)}{preferences.theme === value && <Check size={12} aria-hidden="true" />}</span></button>)}</div></Card>
      <Card className="card-padded"><div className="card-heading"><div className="settings-card-title"><span className="icon-tile indigo"><Smartphone size={20} aria-hidden="true" /></span><h2>{t('pwa.title')}</h2></div></div><p className="settings-description">{t('pwa.detail')}</p>{installed ? <Badge tone="emerald"><Check size={12} aria-hidden="true" />{t('pwa.installed')}</Badge> : install ? <Button icon={Download} onClick={() => { void install() }}>{t('pwa.install')}</Button> : <p className="field-hint">{t('pwa.installHelp')}</p>}{offlineReady && <p className="field-hint mt-3 text-emerald">{t('pwa.ready')}</p>}</Card>
      <div className="settings-about"><span className="icon-tile emerald"><ShieldCheck size={18} aria-hidden="true" /></span><div><strong>{t('settings.about')}</strong><p>{t('settings.aboutDetail')}</p></div></div>
    </div><div className="settings-column"><Card className="card-padded" ><div id="notifications" className="card-heading"><div className="settings-card-title"><span className="icon-tile violet"><Bell size={19} aria-hidden="true" /></span><h2>{t('settings.notifications')}</h2></div></div><p className="settings-description">{t('reminders.notificationHelp')}</p><Badge tone={permission === 'granted' ? 'emerald' : permission === 'denied' ? 'amber' : 'neutral'}>{t(permissionKey)}</Badge><div className="settings-button-row mt-4">{permission !== 'unsupported' && (preferences.notifications ? <Button variant="secondary" onClick={() => { setPreferences({ notifications: false }); toast(t('settings.notificationDisabled')) }}>{t('settings.notificationDisable')}</Button> : <Button icon={BellRing} busy={requesting} onClick={() => { void requestNotifications() }}>{t('settings.notificationEnable')}</Button>)}{permission === 'granted' && <Button variant="ghost" onClick={testNotification}>{t('settings.notificationTest')}</Button>}</div>{permission === 'denied' && <p className="field-hint mt-3">{t('settings.notificationDeniedHelp')}</p>}</Card>
      <Card className="card-padded"><div className="card-heading"><div className="settings-card-title"><span className="icon-tile emerald"><Download size={19} aria-hidden="true" /></span><h2>{t('settings.backup')}</h2></div></div><p className="settings-description">{t('settings.backupDetail')}</p><div className="settings-button-row"><Button icon={Download} disabled={saving || importing} onClick={exportData}>{t('settings.export')}</Button><Button variant="secondary" icon={Upload} disabled={saving} busy={importing} onClick={() => fileInput.current?.click()}>{t('settings.import')}</Button><input ref={fileInput} hidden aria-label={t('settings.import')} type="file" accept=".json,application/json" onChange={event => { void importData(event) }} /></div><div className="settings-backup-note"><LockKeyhole size={13} aria-hidden="true" />{t('app.localNotice')}</div></Card>
      <Card className="card-padded"><div className="card-heading"><div className="settings-card-title"><span className="icon-tile indigo"><HardDrive size={19} aria-hidden="true" /></span><h2>{t('settings.storage')}</h2></div>{persistent && <Badge tone="emerald"><Check size={11} aria-hidden="true" /></Badge>}</div><p className="settings-description">{t('settings.storageDetail')}</p>{estimate?.quota ? <><div className="storage-estimate">{t('settings.storageUsed', { used: storageText(estimate.usage ?? 0), total: storageText(estimate.quota) })}</div><Progress value={(estimate.usage ?? 0) / estimate.quota * 100} label={t('settings.storage')} small /></> : <p className="field-hint">{t('settings.storageUnavailable')}</p>}<div className="mt-4">{persistent ? <Badge tone="emerald">{t('settings.persistenceGranted')}</Badge> : <Button variant="secondary" icon={ShieldCheck} disabled={!navigator.storage?.persist} busy={persistenceBusy} onClick={() => { void requestPersistence() }}>{t('settings.requestPersistence')}</Button>}</div><p className="field-hint mt-3">{t('settings.persistenceHelp')}</p></Card>
      <Card className="card-padded danger-card"><div className="card-heading"><h2>{t('settings.danger')}</h2><Trash2 size={18} className="text-danger" aria-hidden="true" /></div><p className="settings-description">{t('settings.dangerDetail')}</p><Button variant="danger" icon={Trash2} disabled={saving || importing} onClick={() => { void clearData() }}>{t('settings.clearData')}</Button></Card>
    </div></div><div className="notice mt-5"><Info size={16} aria-hidden="true" /><p>{t('app.localNotice')}</p></div>
  </>
}
