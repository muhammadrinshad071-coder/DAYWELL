import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from '../../src/core/backup'
import { documentSchema, emptyWorkspace, preferencesSchema, taskSchema, workspaceSchema } from '../../src/core/models'
import { removeRecord, toggleCompletion } from '../../src/core/operations'
import { makeBudget, makeReminder, makeTask, populatedWorkspace, TODAY } from '../fixtures'

describe('validated backups', () => {
  it('round-trips every collection and simple preferences', () => {
    const data = populatedWorkspace()
    const preferences = preferencesSchema.parse({ name: 'Asha', theme: 'dark', currency: 'INR', widgets: ['tasks', 'habits'] })
    const backup = parseBackup(createBackup(data, preferences))
    expect(backup.data).toEqual(data)
    expect(backup.preferences).toEqual(preferences)
  })
  it('rejects invalid JSON, an unknown version, and unknown credential fields', () => {
    expect(() => parseBackup('{broken')).toThrow()
    const backup = JSON.parse(createBackup(emptyWorkspace(), preferencesSchema.parse({})))
    backup.version = 2
    expect(() => parseBackup(JSON.stringify(backup))).toThrow()
    backup.version = 1
    backup.password = 'unexpected'
    expect(() => parseBackup(JSON.stringify(backup))).toThrow()
  })
  it('rejects duplicate IDs, orphaned habit logs and duplicate log dates', () => {
    const data = populatedWorkspace()
    data.tasks[0].id = data.reminders[0].id
    expect(() => workspaceSchema.parse(data)).toThrow()
    data.tasks[0].id = crypto.randomUUID()
    data.habitLogs[0].habitId = crypto.randomUUID()
    expect(() => workspaceSchema.parse(data)).toThrow()
    data.habitLogs[0].habitId = data.habits[0].id
    data.habitLogs.push({ ...data.habitLogs[0], id: crypto.randomUUID() })
    expect(() => workspaceSchema.parse(data)).toThrow()
  })
  it('rejects conflicting budgets and impossible document date ranges', () => {
    const data = emptyWorkspace()
    data.budgets.push(makeBudget(), makeBudget())
    expect(() => workspaceSchema.parse(data)).toThrow()
    const document = populatedWorkspace().documents[0]
    expect(() => documentSchema.parse({ ...document, expiryDate: '2025-01-01' })).toThrow()
  })
  it('requires a date for recurrence and a time for appointments', () => {
    const task = makeTask()
    expect(() => taskSchema.parse({ ...task, repeat: 'daily', dueDate: undefined })).toThrow()
    expect(() => taskSchema.parse({ ...task, kind: 'appointment', time: undefined })).toThrow()
  })
})

describe('atomic domain operations', () => {
  it('schedules a single future task and does not duplicate it when reopened', () => {
    const data = emptyWorkspace()
    const task = makeTask({ dueDate: '2026-01-31', repeat: 'monthly', recurrenceAnchor: '2026-01-31' })
    data.tasks.push(task)
    toggleCompletion(data, 'tasks', task.id, TODAY)
    expect(data.tasks).toHaveLength(2)
    expect(data.tasks[1].dueDate).toBe('2026-11-30')
    expect(data.tasks[1].recurrenceAnchor).toBe('2026-01-31')
    toggleCompletion(data, 'tasks', task.id, TODAY)
    toggleCompletion(data, 'tasks', task.id, TODAY)
    expect(data.tasks).toHaveLength(2)
  })
  it('schedules recurring reminders while retaining completed history', () => {
    const data = emptyWorkspace()
    const reminder = makeReminder({ date: '2026-10-01', repeat: 'monthly' })
    data.reminders.push(reminder)
    toggleCompletion(data, 'reminders', reminder.id, TODAY)
    expect(data.reminders[0].completedAt).toBeDefined()
    expect(data.reminders[1].date).toBe('2026-12-01')
    expect(data.reminders[1].completedAt).toBeUndefined()
  })
  it('deletes dependent daily logs with a habit', () => {
    const data = populatedWorkspace()
    removeRecord(data, 'habits', data.habits[0].id)
    expect(data.habits).toHaveLength(0)
    expect(data.habitLogs).toHaveLength(0)
    expect(() => workspaceSchema.parse(data)).not.toThrow()
  })
})
