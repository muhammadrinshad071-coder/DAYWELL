import { z } from 'zod'
import { newId } from './ids'
import { validDate } from './dates'
import { currencies, MAX_MINOR } from './money'
import { attachmentSchema, MAX_WORKSPACE_ATTACHMENT_BYTES } from './attachments'

const date = z.string().refine(validDate, 'Invalid calendar date')
const timestamp = z.iso.datetime()
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
const title = z.string().trim().min(1).max(140)
const description = z.string().max(3000).default('')
const category = z.string().trim().min(1).max(60)
const minor = z.number().int().min(0).max(MAX_MINOR)
const currency = z.enum(currencies)
const repeat = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly'])
const priority = z.enum(['low', 'medium', 'high'])
const base = { id: z.uuid(), createdAt: timestamp, updatedAt: timestamp }
const recurring = { repeat, recurrenceAnchor: date.optional(), nextCreated: z.boolean().default(false), completedAt: timestamp.optional() }

export const taskSchema = z.object({
  ...base, ...recurring, title, description, category, priority,
  kind: z.enum(['task', 'appointment', 'routine']),
  dueDate: date.optional(), time: time.optional(), notes: description,
}).strict().superRefine((task, ctx) => {
  if ((task.repeat !== 'none' || task.time || task.kind === 'appointment') && !task.dueDate)
    ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'A date is required for scheduled or recurring items' })
  if (task.kind === 'appointment' && !task.time)
    ctx.addIssue({ code: 'custom', path: ['time'], message: 'An appointment needs a time' })
})

export const transactionSchema = z.object({
  ...base, title, type: z.enum(['income', 'expense']), amount: minor.refine(value => value > 0),
  currency, category, date, notes: description,
}).strict()

export const budgetSchema = z.object({
  ...base, category, amount: minor.refine(value => value > 0), currency,
  month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/).refine(value => validDate(`${value}-01`)),
}).strict()

export const savingsGoalSchema = z.object({
  ...base, name: title, target: minor.refine(value => value > 0), saved: minor, currency, deadline: date.optional(), notes: description,
}).strict()

export const reminderSchema = z.object({
  ...base, ...recurring, title, description, category, priority, date, time, notes: description,
}).strict()

export const shoppingItemSchema = z.object({
  id: z.uuid(), name: title, category, quantity: z.number().positive().max(1000),
  estimatedPrice: minor.max(100_000_000), actualPrice: minor.max(100_000_000).optional(),
  checked: z.boolean(), notes: description,
}).strict()

export const shoppingListSchema = z.object({
  ...base, name: title, description, currency, reusable: z.boolean(), archivedAt: timestamp.optional(),
  items: z.array(shoppingItemSchema).max(1000),
}).strict()

export const documentSchema = z.object({
  ...base, name: title, category, description, issueDate: date.optional(), expiryDate: date.optional(),
  reminderDays: z.number().int().min(0).max(365), notes: description, attachment: attachmentSchema.optional(),
}).strict().superRefine((document, ctx) => {
  if (document.issueDate && document.expiryDate && document.expiryDate < document.issueDate)
    ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry cannot be before the issue date' })
})

export const habitSchema = z.object({
  ...base, name: title, description, category, target: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(30), frequency: z.enum(['daily', 'weekdays', 'weekends']),
  color: z.enum(['indigo', 'violet', 'emerald', 'amber']), archivedAt: timestamp.optional(),
}).strict()

export const contactSchema = z.object({
  ...base, name: title, category,
  phone: z.string().trim().max(30).default('').refine(value => !value || (/^\+?[\d ()-]+$/.test(value) && value.replace(/\D/g, '').length >= 3), 'Enter a valid phone number'),
  address: z.string().trim().max(500).default(''),
  emergency: z.boolean().default(false), notes: description,
}).strict().superRefine((contact, ctx) => {
  if (!contact.phone && !contact.address) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Add a phone number or address' })
})

export const habitLogSchema = z.object({
  ...base, habitId: z.uuid(), date, value: z.number().min(0).max(1_000_000),
}).strict()

export const wellnessLogSchema = z.object({
  ...base, date, waterMl: z.number().int().min(0).max(50_000), sleepHours: z.number().min(0).max(24).optional(),
}).strict()

export const wellnessSettingsSchema = z.object({
  waterGoalMl: z.number().int().min(250).max(10_000), bedtime: time, wakeTime: time,
}).strict()

export const widgetKeys = ['tasks', 'spending', 'reminders', 'habits', 'shopping', 'documents'] as const
export const preferencesSchema = z.object({
  name: z.string().trim().max(60).default(''),
  currency: currency.default('INR'),
  language: z.enum(['en', 'ml', 'hi']).default('en'),
  dateFormat: z.enum(['friendly', 'day-first', 'month-first', 'iso']).default('friendly'),
  theme: z.enum(['light', 'dark', 'system']).default('light'),
  notifications: z.boolean().default(false),
  widgets: z.array(z.enum(widgetKeys)).max(6).refine(keys => new Set(keys).size === keys.length).default([...widgetKeys]),
  location: z.string().trim().max(200).default(''),
}).strict()

export const workspaceSchema = z.object({
  schemaVersion: z.literal(1),
  tasks: z.array(taskSchema).max(10_000),
  transactions: z.array(transactionSchema).max(10_000),
  budgets: z.array(budgetSchema).max(1000),
  savingsGoals: z.array(savingsGoalSchema).max(1000),
  reminders: z.array(reminderSchema).max(10_000),
  shoppingLists: z.array(shoppingListSchema).max(1000),
  documents: z.array(documentSchema).max(10_000),
  contacts: z.array(contactSchema).max(1000).default([]),
  habits: z.array(habitSchema).max(1000),
  habitLogs: z.array(habitLogSchema).max(20_000),
  wellnessLogs: z.array(wellnessLogSchema).max(10_000),
  wellnessSettings: wellnessSettingsSchema,
  notified: z.array(z.string().max(200)).max(10_000),
}).strict().superRefine((data, ctx) => {
  const records = [data.tasks, data.transactions, data.budgets, data.savingsGoals, data.reminders, data.shoppingLists, data.documents, data.contacts, data.habits, data.habitLogs, data.wellnessLogs].flat()
  const ids = [...records.map(record => record.id), ...data.shoppingLists.flatMap(list => list.items.map(item => item.id))]
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Duplicate record IDs' })
  const habitIds = new Set(data.habits.map(habit => habit.id))
  if (data.habitLogs.some(log => !habitIds.has(log.habitId))) ctx.addIssue({ code: 'custom', path: ['habitLogs'], message: 'A habit log references a missing habit' })
  const logKeys = data.habitLogs.map(log => `${log.habitId}:${log.date}`)
  if (new Set(logKeys).size !== logKeys.length) ctx.addIssue({ code: 'custom', path: ['habitLogs'], message: 'Duplicate habit log dates' })
  if (new Set(data.wellnessLogs.map(log => log.date)).size !== data.wellnessLogs.length) ctx.addIssue({ code: 'custom', path: ['wellnessLogs'], message: 'Duplicate wellness log dates' })
  const budgetKeys = data.budgets.map(budget => `${budget.currency}:${budget.month}:${budget.category}`)
  if (new Set(budgetKeys).size !== budgetKeys.length) ctx.addIssue({ code: 'custom', path: ['budgets'], message: 'A budget already exists for this category, month and currency' })
  if (data.documents.reduce((sum, document) => sum + (document.attachment?.size ?? 0), 0) > MAX_WORKSPACE_ATTACHMENT_BYTES)
    ctx.addIssue({ code: 'custom', path: ['documents'], message: 'Document files exceed the 6 MB workspace limit' })
})

export type Task = z.infer<typeof taskSchema>
export type Transaction = z.infer<typeof transactionSchema>
export type Budget = z.infer<typeof budgetSchema>
export type SavingsGoal = z.infer<typeof savingsGoalSchema>
export type Reminder = z.infer<typeof reminderSchema>
export type ShoppingItem = z.infer<typeof shoppingItemSchema>
export type ShoppingList = z.infer<typeof shoppingListSchema>
export type PersonalDocument = z.infer<typeof documentSchema>
export type LocalContact = z.infer<typeof contactSchema>
export type Habit = z.infer<typeof habitSchema>
export type HabitLog = z.infer<typeof habitLogSchema>
export type WellnessLog = z.infer<typeof wellnessLogSchema>
export type Preferences = z.infer<typeof preferencesSchema>
export type Workspace = z.infer<typeof workspaceSchema>
export type Collection = 'tasks' | 'transactions' | 'budgets' | 'savingsGoals' | 'reminders' | 'shoppingLists' | 'documents' | 'contacts' | 'habits'
export type RecordFor<K extends Collection> = Workspace[K][number]

export function emptyWorkspace(): Workspace {
  return {
    schemaVersion: 1, tasks: [], transactions: [], budgets: [], savingsGoals: [], reminders: [],
    shoppingLists: [], documents: [], contacts: [], habits: [], habitLogs: [], wellnessLogs: [],
    wellnessSettings: { waterGoalMl: 2000, bedtime: '22:30', wakeTime: '06:30' }, notified: [],
  }
}

export function entity() {
  const now = new Date().toISOString()
  return { id: newId(), createdAt: now, updatedAt: now }
}
