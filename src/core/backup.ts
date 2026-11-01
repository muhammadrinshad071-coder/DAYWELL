import { z } from 'zod'
import { preferencesSchema, workspaceSchema, type Preferences, type Workspace } from './models'

export const backupSchema = z.object({
  app: z.literal('daywell'), version: z.literal(1), exportedAt: z.iso.datetime(),
  data: workspaceSchema, preferences: preferencesSchema,
}).strict()
export type Backup = z.infer<typeof backupSchema>
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export function createBackup(data: Workspace, preferences: Preferences): string {
  return JSON.stringify(backupSchema.parse({ app: 'daywell', version: 1, exportedAt: new Date().toISOString(), data, preferences }), null, 2)
}

export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('backup-too-large')
  return backupSchema.parse(JSON.parse(text))
}

export function recordCount(data: Workspace): number {
  return data.tasks.length + data.transactions.length + data.budgets.length + data.savingsGoals.length + data.reminders.length + data.shoppingLists.length + data.documents.length + data.contacts.length + data.habits.length + data.habitLogs.length + data.wellnessLogs.length
}
