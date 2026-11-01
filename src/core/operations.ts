import { dateKey, nextOccurrenceDate } from './dates'
import { entity, type Collection, type RecordFor, type Workspace } from './models'

export function saveRecord<K extends Collection>(data: Workspace, collection: K, record: RecordFor<K>): void {
  const records = data[collection] as RecordFor<K>[]
  const index = records.findIndex(existing => existing.id === record.id)
  const updated = { ...record, updatedAt: new Date().toISOString() }
  if (index < 0) records.push(updated)
  else records[index] = updated
}

export function removeRecord(data: Workspace, collection: Collection, id: string): void {
  const index = data[collection].findIndex(record => record.id === id)
  if (index >= 0) data[collection].splice(index, 1)
  if (collection === 'habits') data.habitLogs = data.habitLogs.filter(log => log.habitId !== id)
}

export function toggleCompletion(data: Workspace, collection: 'tasks' | 'reminders', id: string, today = dateKey()): void {
  const records = data[collection]
  const record = records.find(item => item.id === id)
  if (!record) return
  const now = new Date().toISOString()
  record.updatedAt = now
  if (record.completedAt) { record.completedAt = undefined; return }
  record.completedAt = now
  const due = 'dueDate' in record ? record.dueDate : 'date' in record ? record.date : undefined
  if (record.repeat === 'none' || record.nextCreated || !due) return
  const anchor = record.recurrenceAnchor ?? due
  const next = nextOccurrenceDate(due, record.repeat, anchor, today)
  if (!next) return
  record.nextCreated = true
  const successor = { ...record, ...entity(), completedAt: undefined, nextCreated: false, recurrenceAnchor: anchor }
  if (collection === 'tasks') data.tasks.push({ ...successor, dueDate: next } as Workspace['tasks'][number])
  else data.reminders.push({ ...successor, date: next } as Workspace['reminders'][number])
}

export function setHabitValue(data: Workspace, habitId: string, date: string, value: number): void {
  if (!data.habits.some(habit => habit.id === habitId)) return
  const existing = data.habitLogs.find(log => log.habitId === habitId && log.date === date)
  if (existing) { existing.value = value; existing.updatedAt = new Date().toISOString() }
  else data.habitLogs.push({ ...entity(), habitId, date, value })
}

export function setWellnessValue(data: Workspace, date: string, patch: { waterMl?: number; sleepHours?: number }): void {
  const existing = data.wellnessLogs.find(log => log.date === date)
  if (existing) Object.assign(existing, patch, { updatedAt: new Date().toISOString() })
  else data.wellnessLogs.push({ ...entity(), date, waterMl: 0, ...patch })
}
