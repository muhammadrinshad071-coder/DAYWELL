import { addDays, addMonths, addYears, differenceInCalendarDays, endOfMonth, startOfMonth } from 'date-fns'

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type Period = 'day' | 'month' | 'year'
export type DateStyle = 'friendly' | 'day-first' | 'month-first' | 'iso'

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Calendar dates are deliberately local, not parsed as UTC midnight.
export function localDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const year = Number(value.slice(0, 4))
  return year >= 1900 && year <= 2200 && dateKey(localDate(value)) === value
}

export function displayDate(value: string, style: DateStyle = 'friendly', locale = 'en-IN'): string {
  const [year, month, day] = value.split('-')
  if (style === 'iso') return value
  if (style === 'day-first') return `${day}/${month}/${year}`
  if (style === 'month-first') return `${month}/${day}/${year}`
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(localDate(value))
}

export function displayTime(time: string, locale = 'en-IN'): string {
  const date = new Date(2000, 0, 1, ...time.split(':').map(Number))
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function scheduledAt(date: string, time = '09:00'): Date {
  const result = localDate(date)
  const [hours, minutes] = time.split(':').map(Number)
  result.setHours(hours, minutes, 0, 0)
  return result
}

export const shiftDays = (date: string, count: number) => dateKey(addDays(localDate(date), count))
export const daysBetween = (from: string, to: string) => differenceInCalendarDays(localDate(to), localDate(from))
export const monthKey = (date = dateKey()) => date.slice(0, 7)

export function shiftPeriod(date: string, period: Period, delta: number): string {
  const current = localDate(date)
  return dateKey(period === 'day' ? addDays(current, delta) : period === 'month' ? addMonths(current, delta) : addYears(current, delta))
}

export function periodRange(date: string, period: Period): [string, string] {
  if (period === 'day') return [date, date]
  if (period === 'year') return [`${date.slice(0, 4)}-01-01`, `${date.slice(0, 4)}-12-31`]
  return [dateKey(startOfMonth(localDate(date))), dateKey(endOfMonth(localDate(date)))]
}

function anchoredDate(year: number, month: number, day: number): string {
  const first = new Date(year, month, 1, 12)
  const last = endOfMonth(first).getDate()
  first.setDate(Math.min(day, last))
  return dateKey(first)
}

// Preserve the original month-end / leap-day anchor and skip missed occurrences.
export function nextOccurrenceDate(due: string, repeat: Repeat, anchor = due, after = due): string | undefined {
  if (repeat === 'none') return undefined
  const current = localDate(due)
  const cutoff = localDate(after > due ? after : due)
  const origin = localDate(anchor)
  if (repeat === 'daily' || repeat === 'weekly') {
    const step = repeat === 'daily' ? 1 : 7
    return dateKey(addDays(current, (Math.floor(differenceInCalendarDays(cutoff, current) / step) + 1) * step))
  }
  if (repeat === 'monthly') {
    let months = Math.max(1, (cutoff.getFullYear() - current.getFullYear()) * 12 + cutoff.getMonth() - current.getMonth())
    let candidate = anchoredDate(current.getFullYear(), current.getMonth() + months, origin.getDate())
    if (candidate <= dateKey(cutoff)) candidate = anchoredDate(current.getFullYear(), current.getMonth() + ++months, origin.getDate())
    return candidate
  }
  let year = Math.max(current.getFullYear() + 1, cutoff.getFullYear())
  let candidate = anchoredDate(year, origin.getMonth(), origin.getDate())
  if (candidate <= dateKey(cutoff)) candidate = anchoredDate(++year, origin.getMonth(), origin.getDate())
  return candidate
}
