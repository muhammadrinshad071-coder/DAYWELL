import { moneyInput } from './money'
import type { Workspace } from './models'

export type SearchKind = 'tasks' | 'transactions' | 'budgets' | 'savingsGoals' | 'reminders' | 'shoppingLists' | 'documents' | 'contacts' | 'habits'
export interface SearchResult { kind: SearchKind; id: string; title: string; detail: string; path: string }

export function searchWorkspace(data: Workspace, query: string, categoryLabel: (value: string) => string = value => value): { results: SearchResult[]; total: number } {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return { results: [], total: 0 }
  const matches: SearchResult[] = []
  const add = (result: SearchResult, ...text: (string | undefined)[]) => {
    if ([result.title, result.detail, ...text].join(' ').toLocaleLowerCase().includes(needle)) matches.push(result)
  }
  data.tasks.forEach(record => add({ kind: 'tasks', id: record.id, title: record.title, detail: categoryLabel(record.category), path: '/planner' }, record.description, record.notes, record.category, record.dueDate))
  data.transactions.forEach(record => add({ kind: 'transactions', id: record.id, title: record.title, detail: `${categoryLabel(record.category)} · ${record.currency}`, path: '/money' }, record.notes, record.category, record.date, moneyInput(record.amount, record.currency)))
  data.budgets.forEach(record => add({ kind: 'budgets', id: record.id, title: categoryLabel(record.category), detail: `${record.month} · ${record.currency}`, path: '/money' }, record.category, moneyInput(record.amount, record.currency)))
  data.savingsGoals.forEach(record => add({ kind: 'savingsGoals', id: record.id, title: record.name, detail: record.currency, path: '/money' }, record.notes, record.deadline, moneyInput(record.target, record.currency), moneyInput(record.saved, record.currency)))
  data.reminders.forEach(record => add({ kind: 'reminders', id: record.id, title: record.title, detail: categoryLabel(record.category), path: '/reminders' }, record.description, record.notes, record.category, record.date))
  data.shoppingLists.forEach(record => add({ kind: 'shoppingLists', id: record.id, title: record.name, detail: record.items.map(item => item.name).join(', '), path: '/shopping' }, record.description, ...record.items.flatMap(item => [item.notes, item.category, categoryLabel(item.category)])))
  data.documents.forEach(record => add({ kind: 'documents', id: record.id, title: record.name, detail: categoryLabel(record.category), path: '/documents' }, record.description, record.notes, record.category, record.expiryDate, record.attachment?.name))
  data.contacts.forEach(record => add({ kind: 'contacts', id: record.id, title: record.name, detail: record.category, path: '/local' }, record.phone, record.address, record.notes))
  data.habits.forEach(record => add({ kind: 'habits', id: record.id, title: record.name, detail: `${categoryLabel(record.category)} · ${record.unit}`, path: '/wellness' }, record.description, record.category))
  return { results: matches.slice(0, 50), total: matches.length }
}
