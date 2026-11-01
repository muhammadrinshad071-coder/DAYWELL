import { useState } from 'react'
import { habitCategories } from '../../core/categories'
import { useI18n } from '../../core/i18n'
import { entity, habitLogSchema, habitSchema, wellnessSettingsSchema, type Habit } from '../../core/models'
import { saveRecord, setHabitValue } from '../../core/operations'
import { useData } from '../../state/context'
import { useFormCommit } from '../../state/useFormCommit'
import { Field, FormActions, FormError } from '../../components/ui'

export function HabitForm({ record, close }: { record?: Habit; close: () => void }) {
  const { t, categoryLabel } = useI18n()
  const { mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState<Habit>(() => record ?? { ...entity(), name: '', description: '', category: 'personal', target: 1, unit: '', frequency: 'daily', color: 'indigo' })
  const patch = (value: Partial<Habit>) => setDraft(current => ({ ...current, ...value }))
  return <form onSubmit={event => { void submit(event, habitSchema, () => draft, value => mutate(data => saveRecord(data, 'habits', value), t('common.saved')), close) }}><div className="form-grid">
    <Field className="form-full" label={t('common.name')}><input required maxLength={140} placeholder={t('wellness.namePlaceholder')} value={draft.name} onChange={event => patch({ name: event.target.value })} /></Field>
    <Field label={t('wellness.target')}><input type="number" inputMode="decimal" required min=".01" max="1000000" step=".01" value={draft.target} onChange={event => patch({ target: Number(event.target.value) })} /></Field>
    <Field label={t('wellness.unit')}><input required maxLength={30} placeholder={t('wellness.unitPlaceholder')} value={draft.unit} onChange={event => patch({ unit: event.target.value })} /></Field>
    <Field label={t('common.category')}><select value={draft.category} onChange={event => patch({ category: event.target.value })}>{[...new Set([...habitCategories, draft.category])].map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
    <Field label={t('wellness.frequency')}><select value={draft.frequency} onChange={event => patch({ frequency: event.target.value as Habit['frequency'] })}>{(['daily', 'weekdays', 'weekends'] as const).map(value => <option key={value} value={value}>{t(`wellness.${value}`)}</option>)}</select></Field>
    <Field className="form-full" label={t('wellness.color')}><select value={draft.color} onChange={event => patch({ color: event.target.value as Habit['color'] })}>{(['indigo', 'violet', 'emerald', 'amber'] as const).map(value => <option value={value} key={value}>{t(`wellness.${value}`)}</option>)}</select></Field>
    <Field className="form-full" label={t('common.description')} optional><textarea maxLength={3000} value={draft.description} onChange={event => patch({ description: event.target.value })} /></Field>
  </div><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t(record ? 'common.save' : 'wellness.create')} /></form>
}

export function HabitLogForm({ habit, date, close }: { habit: Habit; date: string; close: () => void }) {
  const { t } = useI18n()
  const { data, mutate } = useData()
  const existing = data.habitLogs.find(log => log.habitId === habit.id && log.date === date)
  const [value, setValue] = useState(String(existing?.value ?? 0))
  const { busy, error, submit } = useFormCommit()
  return <form onSubmit={event => { void submit(event, habitLogSchema, () => ({ ...(existing ?? entity()), habitId: habit.id, date, value: Number(value) }), log => mutate(draft => setHabitValue(draft, habit.id, date, log.value), t('common.saved')), close) }}><Field label={t('wellness.value')} hint={`${habit.target} ${habit.unit} · ${date}`}><input type="number" inputMode="decimal" required min="0" max="1000000" step=".01" value={value} onChange={event => setValue(event.target.value)} /></Field><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t('common.save')} /></form>
}

export function WellnessGoalsForm({ close }: { close: () => void }) {
  const { t } = useI18n()
  const { data, mutate } = useData()
  const { busy, error, submit } = useFormCommit()
  const [draft, setDraft] = useState(data.wellnessSettings)
  return <form onSubmit={event => { void submit(event, wellnessSettingsSchema, () => draft, settings => mutate(workspace => { workspace.wellnessSettings = settings }, t('common.saved')), close) }}><div className="form-grid">
    <Field className="form-full" label={t('wellness.waterGoal')}><input type="number" required min="250" max="10000" step="1" value={draft.waterGoalMl} onChange={event => setDraft(current => ({ ...current, waterGoalMl: Number(event.target.value) }))} /></Field>
    <Field label={t('wellness.bedtime')}><input type="time" required value={draft.bedtime} onChange={event => setDraft(current => ({ ...current, bedtime: event.target.value }))} /></Field>
    <Field label={t('wellness.wakeTime')}><input type="time" required value={draft.wakeTime} onChange={event => setDraft(current => ({ ...current, wakeTime: event.target.value }))} /></Field>
  </div><p className="field-hint mt-4">{t('wellness.scheduleHelp')}</p><FormError message={error} /><FormActions onCancel={close} busy={busy} label={t('common.save')} /></form>
}
