import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { dateKey, scheduledAt, shiftDays } from '../core/dates'
import { useI18n } from '../core/i18n'
import { useClock, useData, useFeedback, usePreferences } from './context'

export default function Notifications() {
  const { preferences } = usePreferences()
  const { data, status, mutate } = useData()
  const { toast } = useFeedback()
  const now = useClock()
  const { t } = useI18n()
  const navigate = useNavigate()
  const processing = useRef(false)
  const sessionShown = useRef(new Set<string>())
  const failed = useRef(false)
  useEffect(() => {
    if (status !== 'ready' || !preferences.notifications || document.hidden || !('Notification' in window) || Notification.permission !== 'granted' || processing.current || failed.current) return
    const pending = data.reminders.filter(reminder => !reminder.completedAt && scheduledAt(reminder.date, reminder.time) <= now).map(reminder => ({ key: `reminder:${reminder.id}:${reminder.date}:${reminder.time}`, body: reminder.title, path: `/reminders?focus=${reminder.id}` }))
    data.documents.filter(document => document.expiryDate && shiftDays(document.expiryDate, -document.reminderDays) <= dateKey(now)).forEach(document => pending.push({ key: `document:${document.id}:${document.expiryDate}`, body: t('notification.documentBody', { name: document.name }), path: `/documents?focus=${document.id}` }))
    const batch = pending.filter(item => !data.notified.includes(item.key) && !sessionShown.current.has(item.key)).slice(0, 3)
    if (!batch.length) return
    processing.current = true
    const shown: string[] = []
    try {
      for (const item of batch) {
        const notification = new Notification(t('notification.title'), { body: item.body, icon: '/icon-192.png', tag: item.key })
        notification.onclick = () => { window.focus(); navigate(item.path); notification.close() }
        shown.push(item.key)
        sessionShown.current.add(item.key)
      }
    } catch { failed.current = true; toast(t('settings.notificationFailure'), 'error') }
    if (shown.length) void mutate(draft => { draft.notified = [...new Set([...draft.notified, ...shown])].slice(-10_000) }).finally(() => { processing.current = false })
    else processing.current = false
  }, [data, status, preferences.notifications, now, mutate, t, navigate, toast])
  return null
}
