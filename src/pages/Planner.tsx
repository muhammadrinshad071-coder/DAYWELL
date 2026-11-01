import { useState } from 'react'
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarCheck2, CalendarDays, CheckCheck, ChevronLeft, ChevronRight, CircleAlert, List, Plus, Repeat2 } from 'lucide-react'
import { taskCategories } from '../core/categories'
import { taskIsOverdue } from '../core/calculations'
import { dateKey, daysBetween, displayDate, localDate, shiftDays, shiftPeriod } from '../core/dates'
import { useI18n } from '../core/i18n'
import { entity, taskSchema, type Task } from '../core/models'
import { removeRecord, saveRecord, toggleCompletion } from '../core/operations'
import { useClock, useData, useFeedback, usePreferences } from '../state/context'
import { useEditorQuery } from '../state/hooks'
import { useFormCommit } from '../state/useFormCommit'
import TaskRow from '../components/TaskRow'
import { Button, Card, CheckButton, EmptyState, Field, FilterSearch, FormActions, FormError, IconButton, Modal, PageHeader, StatCard, Tabs } from '../components/ui'

function TaskForm({ record, initialDate, close }: { record?: Task; initialDate: string; close: () => void }) {
  const { t, categoryLabel } = useI18n()
  const { mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<Task>(() => record ?? { ...entity(), title: '', description: '', category: 'personal', priority: 'medium', kind: 'task', dueDate: initialDate, repeat: 'none', nextCreated: false, notes: '' })
  const patch = (value: Partial<Task>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => { void submit(event, taskSchema, () => ({ ...draft, recurrenceAnchor: record?.dueDate === draft.dueDate && record?.repeat === draft.repeat ? record.recurrenceAnchor ?? draft.dueDate : draft.dueDate, nextCreated: record?.dueDate === draft.dueDate && record?.repeat === draft.repeat ? record.nextCreated : false }), value => mutate(data => saveRecord(data, 'tasks', value), t('common.saved')), close) }}>
    <div className="form-grid">
      <Field className="form-full" label={t('common.title')}><input required maxLength={140} placeholder={t('planner.titlePlaceholder')} value={draft.title} onChange={event => patch({ title: event.target.value })} /></Field>
      <Field label={t('planner.kind')}><select value={draft.kind} onChange={event => { const kind = event.target.value as Task['kind']; patch({ kind, ...(kind === 'routine' && draft.repeat === 'none' ? { repeat: 'daily', dueDate: draft.dueDate ?? initialDate } : {}) }) }}>{(['task', 'appointment', 'routine'] as const).map(kind => <option key={kind} value={kind}>{t(`planner.${kind}`)}</option>)}</select></Field>
      <Field label={t('common.category')}><select value={draft.category} onChange={event => patch({ category: event.target.value })}>{[...new Set([...taskCategories, draft.category])].map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
      <Field label={t('common.priority')}><select value={draft.priority} onChange={event => patch({ priority: event.target.value as Task['priority'] })}>{(['low', 'medium', 'high'] as const).map(priority => <option key={priority} value={priority}>{t(`priority.${priority}`)}</option>)}</select></Field>
      <Field label={t('common.repeat')}><select value={draft.repeat} onChange={event => patch({ repeat: event.target.value as Task['repeat'] })}>{(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(repeat => <option key={repeat} value={repeat}>{t(`repeat.${repeat}`)}</option>)}</select></Field>
      <Field label={t('planner.dueDate')} optional={draft.repeat === 'none' && draft.kind !== 'appointment'}><input type="date" min="1900-01-01" max="2200-12-31" required={draft.repeat !== 'none' || draft.kind === 'appointment' || !!draft.time} value={draft.dueDate ?? ''} onChange={event => patch({ dueDate: event.target.value || undefined })} /></Field>
      <Field label={t('common.time')} optional={draft.kind !== 'appointment'}><input type="time" required={draft.kind === 'appointment'} value={draft.time ?? ''} onChange={event => patch({ time: event.target.value || undefined })} /></Field>
      <Field className="form-full" label={t('common.description')} optional><textarea maxLength={3000} value={draft.description} onChange={event => patch({ description: event.target.value })} /></Field>
      <Field className="form-full" label={t('common.notes')} optional><textarea maxLength={3000} value={draft.notes} onChange={event => patch({ notes: event.target.value })} /></Field>
    </div><p className="field-hint mt-4">{t(draft.repeat === 'none' ? 'planner.noDateHint' : 'repeat.help')}</p><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'planner.create')} />
  </form>
}

type View = 'list' | 'day' | 'week' | 'month'
type Status = 'pending' | 'completed' | 'all' | 'overdue'

export default function Planner() {
  const { data, mutate } = useData()
  const { preferences } = usePreferences()
  const { confirm } = useFeedback()
  const { t, categoryLabel, locale } = useI18n()
  const now = useClock()
  const today = dateKey(now)
  const [view, setView] = useState<View>('list')
  const [status, setStatus] = useState<Status>('pending')
  const [category, setCategory] = useState('all')
  const [priority, setPriority] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(today)
  const [editing, setEditing] = useState<Task | undefined>()
  const [formDate, setFormDate] = useState(today)
  const [formOpen, setFormOpen] = useState(false)
  const openNew = (date = today) => { setEditing(undefined); setFormDate(date); setFormOpen(true) }
  const edit = (task: Task) => { setEditing(task); setFormOpen(true) }
  useEditorQuery(() => openNew(), id => { const task = data.tasks.find(record => record.id === id); if (task) edit(task) })
  const filtered = data.tasks.filter(task => {
    const matchesStatus = status === 'all' || (status === 'completed' ? !!task.completedAt : status === 'overdue' ? taskIsOverdue(task, now) : !task.completedAt)
    return matchesStatus && (category === 'all' || task.category === category) && (priority === 'all' || task.priority === priority) && [task.title, task.description, task.notes, categoryLabel(task.category)].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())
  }).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || (a.time ?? '99').localeCompare(b.time ?? '99') || b.createdAt.localeCompare(a.createdAt))
  const reset = () => { setQuery(''); setStatus('pending'); setCategory('all'); setPriority('all') }
  const toggle = (task: Task) => { void mutate(draft => toggleCompletion(draft, 'tasks', task.id, today)) }
  const remove = async (task: Task) => {
    if (await confirm({ title: t('common.deleteTitle', { name: task.title }), description: t('common.deleteDetail'), danger: true })) await mutate(draft => removeRecord(draft, 'tasks', task.id), t('common.deleted'))
  }
  const calendarStart = view === 'month' ? dateKey(startOfWeek(startOfMonth(localDate(selectedDate)), { weekStartsOn: 1 })) : dateKey(startOfWeek(localDate(selectedDate), { weekStartsOn: 1 }))
  const calendarEnd = view === 'month' ? dateKey(endOfWeek(endOfMonth(localDate(selectedDate)), { weekStartsOn: 1 })) : shiftDays(calendarStart, 6)
  const calendarDates = Array.from({ length: daysBetween(calendarStart, calendarEnd) + 1 }, (_, index) => shiftDays(calendarStart, index))
  const navigateDate = (delta: number) => setSelectedDate(view === 'week' ? shiftDays(selectedDate, delta * 7) : shiftPeriod(selectedDate, view === 'month' ? 'month' : 'day', delta))
  const rows = (tasks: Task[]) => tasks.map(task => <TaskRow key={task.id} task={task} onToggle={() => toggle(task)} onEdit={() => edit(task)} onDelete={() => { void remove(task) }} />)
  return <><PageHeader eyebrow={t('nav.planner')} title={t('planner.title')} description={t('planner.subtitle')} action={<Button icon={Plus} onClick={() => openNew()}>{t('planner.new')}</Button>} />
    <div className="stat-grid"><StatCard label={t('planner.pendingMetric')} value={data.tasks.filter(task => !task.completedAt).length} icon={CalendarCheck2} /><StatCard label={t('planner.overdue')} value={data.tasks.filter(task => taskIsOverdue(task, now)).length} icon={CircleAlert} accent="amber" /><StatCard label={t('planner.completedMetric')} value={data.tasks.filter(task => task.completedAt).length} icon={CheckCheck} accent="emerald" /><StatCard label={t('planner.appointmentMetric')} value={data.tasks.filter(task => task.kind === 'appointment' && !task.completedAt).length} icon={CalendarDays} accent="violet" /></div>
    <div className="toolbar"><Tabs value={view} label={t('planner.calendar')} onChange={setView} options={[{ value: 'list', label: t('planner.list'), icon: List }, { value: 'day', label: t('planner.day') }, { value: 'week', label: t('planner.week') }, { value: 'month', label: t('planner.month') }]} /><FilterSearch value={query} onChange={setQuery} placeholder={t('planner.search')} /></div>
    <div className="toolbar planner-filters"><div className="toolbar-group"><select aria-label={t('planner.status')} value={status} onChange={event => setStatus(event.target.value as Status)}>{(['pending', 'all', 'completed', 'overdue'] as const).map(value => <option key={value} value={value}>{t(value === 'all' ? 'common.all' : `planner.${value === 'completed' ? 'completedMetric' : value}`)}</option>)}</select><select aria-label={t('common.category')} value={category} onChange={event => setCategory(event.target.value)}><option value="all">{t('common.all')} · {t('common.category')}</option>{[...new Set([...taskCategories, ...data.tasks.map(task => task.category)])].map(value => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select><select aria-label={t('common.priority')} value={priority} onChange={event => setPriority(event.target.value)}><option value="all">{t('common.all')} · {t('common.priority')}</option>{(['low', 'medium', 'high'] as const).map(value => <option key={value} value={value}>{t(`priority.${value}`)}</option>)}</select></div>{view !== 'list' && <div className="date-navigation"><IconButton icon={ChevronLeft} label={t('common.previous')} onClick={() => navigateDate(-1)} /><input type="date" aria-label={t('common.date')} value={selectedDate} min="1900-01-01" max="2200-12-31" onChange={event => { if (event.target.value) setSelectedDate(event.target.value) }} /><IconButton icon={ChevronRight} label={t('common.next')} onClick={() => navigateDate(1)} /><Button variant="secondary" size="small" onClick={() => setSelectedDate(today)}>{t('common.today')}</Button></div>}</div>
    {view === 'list' ? <Card className="planner-list-card">{filtered.length ? <div className="task-list">{rows(filtered)}</div> : <EmptyState icon={CalendarCheck2} title={t(data.tasks.length ? 'common.noResults' : 'planner.empty')} description={t(data.tasks.length ? 'common.noResultsDetail' : 'planner.emptyDetail')} action={<Button variant={data.tasks.length ? 'secondary' : 'primary'} icon={data.tasks.length ? undefined : Plus} onClick={() => data.tasks.length ? reset() : openNew()}>{t(data.tasks.length ? 'common.clearFilters' : 'planner.new')}</Button>} />}</Card>
      : view === 'day' ? <Card className="card-padded"><div className="card-heading"><div><h2>{new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(localDate(selectedDate))}</h2><p>{displayDate(selectedDate, preferences.dateFormat, locale)}</p></div><Button variant="secondary" size="small" icon={Plus} onClick={() => openNew(selectedDate)}>{t('common.add')}</Button></div>{filtered.some(task => task.dueDate === selectedDate) ? <div className="task-list">{rows(filtered.filter(task => task.dueDate === selectedDate))}</div> : <EmptyState compact icon={CalendarDays} title={t('planner.calendarEmpty')} action={<Button variant="secondary" size="small" onClick={() => openNew(selectedDate)}>{t('planner.new')}</Button>} />}</Card>
        : <Card className="calendar-card"><div className="calendar-title"><CalendarDays size={18} aria-hidden="true" /><h2>{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(localDate(selectedDate))}</h2></div><div className="calendar-scroll"><div className={`calendar-grid ${view === 'week' ? 'calendar-week' : ''}`} role="region" aria-label={t('planner.calendar')}><div className="calendar-weekdays">{calendarDates.slice(0, 7).map(date => <span key={date}>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(localDate(date))}</span>)}</div>{calendarDates.map(date => { const tasks = filtered.filter(task => task.dueDate === date); return <div className={`calendar-cell ${date.slice(0, 7) !== selectedDate.slice(0, 7) ? 'calendar-outside' : ''} ${date === today ? 'calendar-today' : ''}`} key={date}><div className="calendar-day-heading"><button className="calendar-day-number" onClick={() => { setSelectedDate(date); setView('day') }} aria-label={displayDate(date, preferences.dateFormat, locale)}>{localDate(date).getDate()}</button><IconButton icon={Plus} label={t('planner.addOnDate', { date: displayDate(date, preferences.dateFormat, locale) })} onClick={() => openNew(date)} /></div>{tasks.slice(0, view === 'month' ? 3 : 20).map(task => <div className={`calendar-item ${task.completedAt ? 'task-done' : ''}`} key={task.id}><CheckButton checked={!!task.completedAt} label={`${t(task.completedAt ? 'common.reopen' : 'common.complete')}: ${task.title}`} onClick={() => toggle(task)} /><button onClick={() => edit(task)}><strong>{task.title}</strong>{task.time && <small>{task.time}</small>}{task.repeat !== 'none' && <Repeat2 size={9} aria-hidden="true" />}</button></div>)}{view === 'month' && tasks.length > 3 && <button className="calendar-more" onClick={() => { setSelectedDate(date); setView('day') }}>+{tasks.length - 3} {t('common.tasks', { count: tasks.length - 3 })}</button>}</div> })}</div></div></Card>}
    <Modal open={formOpen} title={t(editing ? 'planner.edit' : 'planner.new')} onClose={() => setFormOpen(false)}>{formOpen && <TaskForm key={editing?.id ?? `new-${formDate}`} record={editing} initialDate={formDate} close={() => setFormOpen(false)} />}</Modal>
  </>
}
