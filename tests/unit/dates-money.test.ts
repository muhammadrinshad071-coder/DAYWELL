import { describe, expect, it } from 'vitest'
import { dateKey, localDate, nextOccurrenceDate, periodRange, shiftDays, validDate } from '../../src/core/dates'
import { formatMoney, lineTotal, MAX_MINOR, parseMoney } from '../../src/core/money'

describe('local calendar dates and recurrence', () => {
  it('rejects impossible calendar dates and accepts leap days', () => {
    expect(validDate('2026-02-29')).toBe(false)
    expect(validDate('2024-02-29')).toBe(true)
    expect(validDate('2026-04-31')).toBe(false)
    expect(validDate('2026-13-01')).toBe(false)
    expect(validDate('2026-1-01')).toBe(false)
    expect(dateKey(localDate('2026-11-01'))).toBe('2026-11-01')
  })
  it('preserves a month-end anchor through a short month', () => {
    expect(nextOccurrenceDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextOccurrenceDate('2026-02-28', 'monthly', '2026-01-31')).toBe('2026-03-31')
    expect(nextOccurrenceDate('2026-01-31', 'monthly', '2026-01-31', '2026-05-01')).toBe('2026-05-31')
  })
  it('preserves leap-year anchors and skips missed daily and weekly occurrences', () => {
    expect(nextOccurrenceDate('2024-02-29', 'yearly')).toBe('2025-02-28')
    expect(nextOccurrenceDate('2027-02-28', 'yearly', '2024-02-29')).toBe('2028-02-29')
    expect(nextOccurrenceDate('2026-10-01', 'weekly', undefined, '2026-10-20')).toBe('2026-10-22')
    expect(nextOccurrenceDate('2026-10-01', 'daily', undefined, '2026-11-01')).toBe('2026-11-02')
    expect(nextOccurrenceDate('2026-11-10', 'daily', undefined, '2026-11-01')).toBe('2026-11-11')
    expect(nextOccurrenceDate('2026-11-01', 'none')).toBeUndefined()
  })
  it('uses calendar ranges rather than UTC-shifted dates', () => {
    expect(shiftDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(periodRange('2024-02-15', 'month')).toEqual(['2024-02-01', '2024-02-29'])
    expect(periodRange('2026-11-01', 'year')).toEqual(['2026-01-01', '2026-12-31'])
  })
})

describe('exact money', () => {
  it('parses decimal amounts into exact integer minor units', () => {
    expect(parseMoney('0.10', 'INR') + parseMoney('0.20', 'INR')).toBe(30)
    expect(parseMoney('1234.5', 'USD')).toBe(123450)
    expect(parseMoney('25', 'JPY')).toBe(25)
    expect(lineTotal(333, 1.5)).toBe(500)
    expect(formatMoney(12345, 'INR', 'en-IN')).toBe('₹123.45')
  })
  it.each(['-1', '1.001', '1e3', 'NaN', '', '1,000', 'Infinity'])('rejects ambiguous or invalid amount %s', value => {
    expect(() => parseMoney(value, 'INR')).toThrow()
  })
  it('enforces zero-decimal currencies and safe bounds', () => {
    expect(() => parseMoney('1.20', 'JPY')).toThrow()
    expect(() => parseMoney(String(MAX_MINOR), 'INR')).toThrow()
  })
})
