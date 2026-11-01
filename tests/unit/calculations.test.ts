import { describe, expect, it } from 'vitest'
import { budgetUsage, documentStatus, financialHistory, financialSummary, habitProgress, habitStreak, shoppingTotals, taskIsOverdue } from '../../src/core/calculations'
import { documentSchema, entity } from '../../src/core/models'
import { FIXED_NOW, makeBudget, makeHabit, makeTask, makeTransaction, populatedWorkspace, TODAY } from '../fixtures'

describe('financial calculations', () => {
  const transactions = [makeTransaction({ type: 'income', category: 'salary', amount: 1000010 }), makeTransaction({ amount: 25025 }), makeTransaction({ currency: 'USD', amount: 99999 }), makeTransaction({ date: '2026-10-31', amount: 9999 })]
  it('separates currencies and computes daily, monthly, and yearly totals', () => {
    expect(financialSummary(transactions, 'INR', TODAY, 'month')).toMatchObject({ income: 1000010, expenses: 25025, balance: 974985 })
    expect(financialSummary(transactions, 'INR', TODAY, 'day').expenses).toBe(25025)
    expect(financialSummary(transactions, 'INR', TODAY, 'year').expenses).toBe(35024)
    expect(financialSummary(transactions, 'USD', TODAY, 'month').balance).toBe(-99999)
  })
  it('counts only the correct category, month, currency and expense type toward a budget', () => {
    expect(budgetUsage(makeBudget({ amount: 20000 }), transactions)).toEqual({ spent: 25025, remaining: -5025, percent: 125.125 })
  })
  it('derives chart points from saved records, including genuine zero-spend months', () => {
    const history = financialHistory(transactions, 'INR', TODAY, 'month')
    expect(history).toHaveLength(6)
    expect(history[0]).toEqual({ date: '2026-06-01', income: 0, expenses: 0 })
    expect(history[5]).toEqual({ date: '2026-11-01', income: 1000010, expenses: 25025 })
  })
  it('multiplies shopping unit prices by quantity and distinguishes a recorded zero from a blank actual price', () => {
    const list = populatedWorkspace().shoppingLists[0]
    list.items[0].quantity = 1.5
    expect(shoppingTotals(list)).toEqual({ estimated: 6750, actual: 7500, projected: 7500, checked: 0 })
    list.items[0].actualPrice = 0
    expect(shoppingTotals(list).projected).toBe(0)
    list.items[0].actualPrice = undefined
    expect(shoppingTotals(list).projected).toBe(6750)
  })
})

describe('habits and date alerts', () => {
  it('keeps a streak alive through an unfinished today and excludes unscheduled weekend days', () => {
    const habit = makeHabit({ frequency: 'weekdays', createdAt: '2026-10-26T00:00:00.000Z' })
    const logs = ['2026-10-29', '2026-10-30'].map(date => ({ ...entity(), habitId: habit.id, date, value: habit.target }))
    expect(habitStreak(habit, logs, '2026-11-01')).toBe(2)
    expect(habitProgress(habit, logs, '2026-10-26', '2026-11-01')).toEqual({ scheduled: 5, completed: 2, percent: 40 })
  })
  it('does not count days before a habit existed in the adherence denominator', () => {
    const habit = makeHabit({ createdAt: '2026-11-01T00:00:00.000Z' })
    expect(habitProgress(habit, [], '2026-10-26', TODAY)).toEqual({ scheduled: 1, completed: 0, percent: 0 })
  })
  it('flags date-only tasks only after their day, and timed tasks after their time', () => {
    expect(taskIsOverdue(makeTask(), new Date(FIXED_NOW))).toBe(false)
    expect(taskIsOverdue(makeTask({ dueDate: '2026-10-31' }), new Date(FIXED_NOW))).toBe(true)
    const now = new Date(2026, 10, 1, 10, 0)
    expect(taskIsOverdue(makeTask({ time: '09:00' }), now)).toBe(true)
    expect(taskIsOverdue(makeTask({ time: '11:00' }), now)).toBe(false)
  })
  it('derives renewal notices and expired status from document dates', () => {
    const document = documentSchema.parse({ ...entity(), name: 'Insurance', category: 'insurance', description: '', notes: '', reminderDays: 30, expiryDate: '2026-12-01' })
    expect(documentStatus(document, '2026-10-31')).toBe('valid')
    expect(documentStatus(document, TODAY)).toBe('renewSoon')
    expect(documentStatus(document, '2026-12-02')).toBe('expired')
  })
})
