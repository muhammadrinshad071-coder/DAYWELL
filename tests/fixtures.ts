import { budgetSchema, documentSchema, emptyWorkspace, entity, habitSchema, reminderSchema, shoppingListSchema, taskSchema, transactionSchema, type Budget, type Habit, type Reminder, type Task, type Transaction } from '../src/core/models'

export const TODAY = '2026-11-01'
export const FIXED_NOW = '2026-11-01T04:30:00.000Z'
const stamp = { createdAt: '2026-10-25T12:00:00.000Z', updatedAt: '2026-10-25T12:00:00.000Z' }

export function makeTask(patch: Partial<Task> = {}) {
  return taskSchema.parse({ ...entity(), ...stamp, title: 'Atlas plan', description: 'A meaningful task', notes: 'needle-note', category: 'work', priority: 'high', kind: 'task', dueDate: TODAY, repeat: 'none', nextCreated: false, ...patch })
}
export function makeTransaction(patch: Partial<Transaction> = {}) {
  return transactionSchema.parse({ ...entity(), ...stamp, title: 'Atlas groceries', type: 'expense', amount: 15000, currency: 'INR', category: 'groceries', date: TODAY, notes: '', ...patch })
}
export function makeBudget(patch: Partial<Budget> = {}) {
  return budgetSchema.parse({ ...entity(), ...stamp, category: 'groceries', month: '2026-11', amount: 50000, currency: 'INR', ...patch })
}
export function makeReminder(patch: Partial<Reminder> = {}) {
  return reminderSchema.parse({ ...entity(), ...stamp, title: 'Atlas renewal', description: '', notes: '', category: 'subscription', priority: 'medium', date: '2026-11-02', time: '09:00', repeat: 'none', nextCreated: false, ...patch })
}
export function makeHabit(patch: Partial<Habit> = {}) {
  return habitSchema.parse({ ...entity(), ...stamp, name: 'Atlas reading', description: '', category: 'learning', target: 10, unit: 'pages', frequency: 'daily', color: 'emerald', ...patch })
}

// Test fixtures only. The application never seeds a user's workspace.
export function populatedWorkspace() {
  const data = emptyWorkspace()
  data.tasks.push(makeTask())
  data.transactions.push(makeTransaction(), makeTransaction({ title: 'Salary', type: 'income', category: 'salary', amount: 1200000 }))
  data.budgets.push(makeBudget())
  data.savingsGoals.push({ ...entity(), ...stamp, name: 'A quiet holiday', target: 500000, saved: 125000, currency: 'INR', notes: '', deadline: '2027-04-01' })
  data.reminders.push(makeReminder())
  data.shoppingLists.push(shoppingListSchema.parse({ ...entity(), ...stamp, name: 'Atlas weekly shop', description: 'The essentials', currency: 'INR', reusable: true, items: [{ id: crypto.randomUUID(), name: 'Red apples', category: 'produce', quantity: 2, estimatedPrice: 4500, actualPrice: 5000, checked: false, notes: 'Crisp' }] }))
  data.documents.push(documentSchema.parse({ ...entity(), ...stamp, name: 'Atlas insurance', description: 'Vehicle policy', category: 'insurance', issueDate: '2026-01-01', expiryDate: '2026-11-15', reminderDays: 30, notes: 'Keep renewal details' }))
  const habit = makeHabit()
  data.habits.push(habit)
  data.habitLogs.push({ ...entity(), ...stamp, habitId: habit.id, date: TODAY, value: 5 })
  data.wellnessLogs.push({ ...entity(), ...stamp, date: TODAY, waterMl: 750, sleepHours: 7.5 })
  return data
}
