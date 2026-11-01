import { dateKey, daysBetween, localDate, monthKey, periodRange, scheduledAt, shiftDays, shiftPeriod, type Period } from './dates'
import { lineTotal, type Currency } from './money'
import type { Budget, Habit, HabitLog, PersonalDocument, ShoppingList, Task, Transaction, Workspace } from './models'

export function taskIsOverdue(task: Task, now = new Date()): boolean {
  if (task.completedAt || !task.dueDate) return false
  const today = dateKey(now)
  return task.dueDate < today || (task.dueDate === today && !!task.time && scheduledAt(task.dueDate, task.time) < now)
}

export function financialSummary(transactions: Transaction[], currency: Currency, date: string, period: Period) {
  const [start, end] = periodRange(date, period)
  const records = transactions.filter(record => record.currency === currency && record.date >= start && record.date <= end)
  const income = records.filter(record => record.type === 'income').reduce((sum, record) => sum + record.amount, 0)
  const expenses = records.filter(record => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0)
  const categories = new Map<string, number>()
  records.filter(record => record.type === 'expense').forEach(record => categories.set(record.category, (categories.get(record.category) ?? 0) + record.amount))
  return { income, expenses, balance: income - expenses, records, categories: [...categories].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) }
}

export function budgetUsage(budget: Budget, transactions: Transaction[]) {
  const spent = transactions.filter(record => record.type === 'expense' && record.currency === budget.currency && monthKey(record.date) === budget.month && record.category === budget.category).reduce((sum, record) => sum + record.amount, 0)
  return { spent, remaining: budget.amount - spent, percent: spent / budget.amount * 100 }
}

export function financialHistory(transactions: Transaction[], currency: Currency, anchor: string, period: Period) {
  const dates = period === 'day'
    ? Array.from({ length: 7 }, (_, index) => shiftDays(anchor, index - 6))
    : period === 'year'
      ? Array.from({ length: 12 }, (_, index) => `${anchor.slice(0, 4)}-${String(index + 1).padStart(2, '0')}-01`)
      : Array.from({ length: 6 }, (_, index) => shiftPeriod(`${monthKey(anchor)}-01`, 'month', index - 5))
  return dates.map(date => {
    const summary = financialSummary(transactions, currency, date, period === 'day' ? 'day' : 'month')
    return { date, income: summary.income, expenses: summary.expenses }
  })
}

export function shoppingTotals(list: ShoppingList) {
  return list.items.reduce((totals, item) => ({
    estimated: totals.estimated + lineTotal(item.estimatedPrice, item.quantity),
    actual: totals.actual + (item.actualPrice === undefined ? 0 : lineTotal(item.actualPrice, item.quantity)),
    projected: totals.projected + lineTotal(item.actualPrice ?? item.estimatedPrice, item.quantity),
    checked: totals.checked + Number(item.checked),
  }), { estimated: 0, actual: 0, projected: 0, checked: 0 })
}

export function habitScheduled(habit: Habit, date: string): boolean {
  if (dateKey(new Date(habit.createdAt)) > date || (habit.archivedAt && dateKey(new Date(habit.archivedAt)) < date)) return false
  const weekend = [0, 6].includes(localDate(date).getDay())
  return habit.frequency === 'daily' || (habit.frequency === 'weekends' ? weekend : !weekend)
}

export function habitValue(logs: HabitLog[], habitId: string, date: string): number {
  return logs.find(log => log.habitId === habitId && log.date === date)?.value ?? 0
}

export function habitStreak(habit: Habit, logs: HabitLog[], today = dateKey()): number {
  let day = today
  if (habitScheduled(habit, day) && habitValue(logs, habit.id, day) < habit.target) day = shiftDays(day, -1)
  let streak = 0
  const start = dateKey(new Date(habit.createdAt))
  for (let count = 0; count < 3660 && day >= start; count++, day = shiftDays(day, -1)) {
    if (!habitScheduled(habit, day)) continue
    if (habitValue(logs, habit.id, day) < habit.target) break
    streak++
  }
  return streak
}

export function habitProgress(habit: Habit, logs: HabitLog[], start: string, end: string) {
  let scheduled = 0
  let completed = 0
  for (let date = start; date <= end; date = shiftDays(date, 1)) {
    if (!habitScheduled(habit, date)) continue
    scheduled++
    if (habitValue(logs, habit.id, date) >= habit.target) completed++
  }
  return { scheduled, completed, percent: scheduled ? completed / scheduled * 100 : 0 }
}

export function documentStatus(document: PersonalDocument, today = dateKey()): 'expired' | 'renewSoon' | 'valid' | 'noExpiry' {
  if (!document.expiryDate) return 'noExpiry'
  const days = daysBetween(today, document.expiryDate)
  return days < 0 ? 'expired' : days <= document.reminderDays ? 'renewSoon' : 'valid'
}

export function wellnessHistory(data: Workspace, end: string, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDays(end, index - days + 1)
    const log = data.wellnessLogs.find(item => item.date === date)
    const habits = data.habits.filter(habit => habitScheduled(habit, date))
    const completed = habits.filter(habit => habitValue(data.habitLogs, habit.id, date) >= habit.target).length
    return { date, water: log?.waterMl ?? 0, sleep: log?.sleepHours ?? null, habits: habits.length ? Math.round(completed / habits.length * 100) : 0 }
  })
}
