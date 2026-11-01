import { documentStatus } from './calculations'
import { shiftDays } from './dates'
import type { Workspace } from './models'
import type { SearchKind } from './search'

export interface ActivityItem {
  id: string
  kind: SearchKind
  title: string
  path: string
  date: string
}

export function attentionItems(data: Workspace, today: string): ActivityItem[] {
  const end = shiftDays(today, 7)
  return [
    ...data.tasks.filter(record => !record.completedAt && record.dueDate && record.dueDate <= end).map(record => ({ id: record.id, kind: 'tasks' as const, title: record.title, path: '/planner', date: record.dueDate! })),
    ...data.reminders.filter(record => !record.completedAt && record.date <= end).map(record => ({ id: record.id, kind: 'reminders' as const, title: record.title, path: '/reminders', date: record.date })),
    ...data.documents.filter(record => ['expired', 'renewSoon'].includes(documentStatus(record, today))).map(record => ({ id: record.id, kind: 'documents' as const, title: record.name, path: '/documents', date: record.expiryDate! })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

// A view of saved records' latest changes, not an immutable audit log.
export function recentActivity(data: Workspace): ActivityItem[] {
  return [
    ...data.tasks.map(record => ({ id: record.id, kind: 'tasks' as const, title: record.title, path: '/planner', date: record.updatedAt })),
    ...data.transactions.map(record => ({ id: record.id, kind: 'transactions' as const, title: record.title, path: '/money', date: record.updatedAt })),
    ...data.budgets.map(record => ({ id: record.id, kind: 'budgets' as const, title: record.category, path: '/money', date: record.updatedAt })),
    ...data.savingsGoals.map(record => ({ id: record.id, kind: 'savingsGoals' as const, title: record.name, path: '/money', date: record.updatedAt })),
    ...data.reminders.map(record => ({ id: record.id, kind: 'reminders' as const, title: record.title, path: '/reminders', date: record.updatedAt })),
    ...data.shoppingLists.map(record => ({ id: record.id, kind: 'shoppingLists' as const, title: record.name, path: '/shopping', date: record.updatedAt })),
    ...data.documents.map(record => ({ id: record.id, kind: 'documents' as const, title: record.name, path: '/documents', date: record.updatedAt })),
    ...data.contacts.map(record => ({ id: record.id, kind: 'contacts' as const, title: record.name, path: '/local', date: record.updatedAt })),
    ...data.habits.map(record => ({ id: record.id, kind: 'habits' as const, title: record.name, path: '/wellness', date: record.updatedAt })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)).slice(0, 50)
}
