import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, CalendarDays, CheckCheck, Clock3, FileText, Info, Pencil, Plus, Repeat2, Trash2 } from 'lucide-react'
import { documentStatus } from '../core/calculations'
import { reminderCategories } from '../core/categories'
import { dateKey, displayDate, displayTime, localDate, scheduledAt } from '../core/dates'
import { useI18n } from '../core/i18n'
import { entity, reminderSchema, type Reminder } from '../core/models'
import { removeRecord, saveRecord, toggleCompletion } from '../core/operations'
import { useClock, useData, useFeedback, usePreferences } from '../state/context'
import { useEditorQuery } from '../state/hooks'
import { useFormCommit } from '../state/useFormCommit'
import { Badge, Button, Card, CheckButton, EmptyState, Field, FilterSearch, FormActions, FormError, IconButton, Modal, PageHeader, StatCard, Tabs } from '../components/ui'

function ReminderForm({ record, today, close }: { record?: Reminder; today: string; close: () => void }) {
  const { t, categoryLabel } = useI18n()
  const { mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<Reminder>(() => record ?? { ...entity(), title: '', description: '', category: 'custom', priority: 'medium', date: today, time: '09:00', repeat: 'none', nextCreated: false, notes: '' })
  const patch = (value: Partial<Reminder>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => { void submit(event, reminderSchema, () => ({ ...draft, recurrenceAnchor: record?.date === draft.date && record?.repeat === draft.repeat ? record.recurrenceAnchor ?? draft.date : draft.date, nextCreated: record?.date === draft.date && record?.repeat === draft.repeat ? record.nextCreated : false }), value => mutate(data => saveRecord(data, 'reminders', value), t('common.saved')), close) }}>
    <div className="form-grid">
      <Field className="form-full" label={t('common.title')}><input required maxLength={140} placeholder={t('reminders.titlePlaceholder')} value={draft.title} onChange={event => patch({ title: event.target.value })} /></Field>
      <Field label={t('common.category')}><select value={draft.category} onChange={event => patch({ category: event.target.value })}>{[...new Set([...reminderCategories, draft.category])].map(category => <option value={category} key={category}>{categoryLabel(category)}</option>)}</select></Field>
      <Field label={t('common.priority')}><select value={draft.priority} onChange={event => patch({ priority: event.target.value as Reminder['priority'] })}>{(['low', 'medium', 'high'] as const).map(priority => <option key={priority} value={priority}>{t(`priority.${priority}`)}</option>)}</select></Field>
      <Field label={t('common.date')}><input type="date" required min="1900-01-01" max="2200-12-31" value={draft.date} onChange={event => patch({ date: event.target.value })} /></Field>
      <Field label={t('common.time')}><input type="time" required value={draft.time} onChange={event => patch({ time: event.target.value })} /></Field>
      <Field className="form-full" label={t('common.repeat')}><select value={draft.repeat} onChange={event => patch({ repeat: event.target.value as Reminder['repeat'] })}>{(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(repeat => <option key={repeat} value={repeat}>{t(`repeat.${repeat}`)}</option>)}</select></Field>
      <Field className="form-full" label={t('common.description')} optional><textarea maxLength={3000} value={draft.description} onChange={event => patch({ description: event.target.value })} /></Field>
      <Field className="form-full" label={t('common.notes')} optional><textarea maxLength={3000} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></Field>
    </div>{draft.repeat !== 'none' && <p className="field-hint mt-4">{t('repeat.help')}</p>}<FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'reminders.create')} />
  </form>
}

export default function Reminders() {
  const { data, mutate } = useData()
  const { preferences } = usePreferences()
  const { confirm } = useFeedback()
  const { t, categoryLabel, locale } = useI18n()
  const now = useClock()
  const today = dateKey(now)
  const navigate = useNavigate()
  const [tab, setTab] = useState<'upcoming' | 'overdue' | 'history'>('upcoming')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState<Reminder>()
  const [open, setOpen] = useState(false)
  const create = () => { setEditing(undefined); setOpen(true) }
  const edit = (reminder: Reminder) => { setEditing(reminder); setOpen(true) }
  useEditorQuery(create, id => { const reminder = data.reminders.find(item => item.id === id); if (reminder) edit(reminder) })
  const due = (reminder: Reminder) => !reminder.completedAt && scheduledAt(reminder.date, reminder.time) <= now
  const reminders = data.reminders.filter(reminder => (tab === 'history' ? !!reminder.completedAt : tab === 'overdue' ? due(reminder) : !reminder.completedAt && !due(reminder)) && (category === 'all' || reminder.category === category) && [reminder.title, reminder.description, reminder.notes, categoryLabel(reminder.category)].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => tab === 'history' ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '') : `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
  const alerts = data.documents.filter(document => ['expired', 'renewSoon'].includes(documentStatus(document, today)))
  const remove = async (reminder: Reminder) => { if (await confirm({ title: t('common.deleteTitle', { name: reminder.title }), description: t('common.deleteDetail'), danger: true })) await mutate(draft => removeRecord(draft, 'reminders', reminder.id), t('common.deleted')) }
  return <><PageHeader eyebrow={t('nav.reminders')} title={t('reminders.title')} description={t('reminders.subtitle')} action={<Button icon={Plus} onClick={create}>{t('reminders.new')}</Button>} />
    <div className="stat-grid stat-grid-3"><StatCard label={t('reminders.upcoming')} value={data.reminders.filter(reminder => !reminder.completedAt && !due(reminder)).length} icon={Bell} accent="violet" /><StatCard label={t('reminders.overdue')} value={data.reminders.filter(due).length} icon={BellRing} accent="amber" /><StatCard label={t('reminders.history')} value={data.reminders.filter(reminder => reminder.completedAt).length} icon={CheckCheck} accent="emerald" /></div>
    <div className="notice mb-5"><Info size={17} aria-hidden="true" /><div><p>{t('reminders.notificationHelp')}</p><Button variant="ghost" size="small" onClick={() => navigate('/settings#notifications')}>{t('reminders.configure')}</Button></div></div>
    <div className="toolbar"><Tabs value={tab} label={t('nav.reminders')} onChange={setTab} options={(['upcoming', 'overdue', 'history'] as const).map(value => ({ value, label: t(`reminders.${value}`) }))} /><div className="toolbar-group"><FilterSearch value={query} onChange={setQuery} placeholder={t('reminders.search')} /><select aria-label={t('common.category')} value={category} onChange={event => setCategory(event.target.value)}><option value="all">{t('common.all')} · {t('common.category')}</option>{[...new Set([...reminderCategories, ...data.reminders.map(reminder => reminder.category)])].map(value => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select></div></div>
    <Card>{reminders.length ? <div className="reminder-list">{reminders.map(reminder => <div className={`reminder-row ${reminder.completedAt ? 'task-done' : ''}`} key={reminder.id} data-testid="reminder-row"><div className={`reminder-date ${due(reminder) ? 'reminder-date-due' : ''}`}><span>{new Intl.DateTimeFormat(locale, { month: 'short' }).format(localDate(reminder.date))}</span><strong>{localDate(reminder.date).getDate()}</strong></div><div className="reminder-copy"><button className="task-title" onClick={() => edit(reminder)}>{reminder.title}</button>{reminder.description && <p className="task-description">{reminder.description}</p>}<div className="task-meta"><span>{categoryLabel(reminder.category)}</span><span><CalendarDays size={11} aria-hidden="true" />{displayDate(reminder.date, preferences.dateFormat, locale)}</span><span><Clock3 size={11} aria-hidden="true" />{displayTime(reminder.time, locale)}</span>{reminder.repeat !== 'none' && <span><Repeat2 size={11} aria-hidden="true" />{t(`repeat.${reminder.repeat}`)}</span>}{reminder.completedAt && <span>{t('reminders.completedOn', { date: displayDate(dateKey(new Date(reminder.completedAt)), preferences.dateFormat, locale) })}</span>}</div></div><Badge tone={reminder.priority === 'high' ? 'amber' : 'neutral'}>{t(`priority.${reminder.priority}`)}</Badge><CheckButton checked={!!reminder.completedAt} label={`${t(reminder.completedAt ? 'common.reopen' : 'common.complete')}: ${reminder.title}`} onClick={() => { void mutate(draft => toggleCompletion(draft, 'reminders', reminder.id, today)) }} /><div className="row-actions"><IconButton icon={Pencil} label={`${t('common.edit')}: ${reminder.title}`} onClick={() => edit(reminder)} /><IconButton icon={Trash2} label={`${t('common.delete')}: ${reminder.title}`} onClick={() => { void remove(reminder) }} /></div></div>)}</div> : <EmptyState icon={tab === 'history' ? CheckCheck : Bell} title={t(query || category !== 'all' ? 'common.noResults' : tab === 'history' ? 'reminders.historyEmpty' : 'reminders.empty')} description={t(query || category !== 'all' ? 'common.noResultsDetail' : 'reminders.emptyDetail')} action={<Button variant="secondary" icon={Plus} onClick={query || category !== 'all' ? () => { setQuery(''); setCategory('all') } : create}>{t(query || category !== 'all' ? 'common.clearFilters' : 'reminders.new')}</Button>} />}</Card>
    {alerts.length > 0 && <Card className="card-padded mt-5"><div className="card-heading"><div><h2>{t('reminders.documentAlerts')}</h2><p>{t('reminders.documentAlertsDetail')}</p></div><FileText size={19} className="text-primary" aria-hidden="true" /></div>{alerts.map(document => <button key={document.id} className="document-mini" onClick={() => navigate(`/documents?focus=${document.id}`)}><span className="icon-tile amber"><FileText size={17} aria-hidden="true" /></span><span className="mini-record-copy"><strong>{document.name}</strong><small>{t('documents.expiresOn', { date: displayDate(document.expiryDate!, preferences.dateFormat, locale) })}</small></span><Badge tone={documentStatus(document, today) === 'expired' ? 'danger' : 'amber'}>{t(`documents.${documentStatus(document, today)}`)}</Badge></button>)}</Card>}
    <Modal open={open} title={t(editing ? 'reminders.edit' : 'reminders.new')} onClose={() => setOpen(false)}>{open && <ReminderForm record={editing} today={today} close={() => setOpen(false)} />}</Modal>
  </>
}
