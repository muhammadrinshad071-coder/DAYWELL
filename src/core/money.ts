export const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY'] as const
export type Currency = typeof currencies[number]
export const MAX_MINOR = 100_000_000_000

export function currencyDigits(currency: Currency): number {
  return currency === 'JPY' ? 0 : 2
}

// Parse decimal strings exactly. Never calculate money with floating-point rupees.
export function parseMoney(input: string, currency: Currency): number {
  const value = input.trim()
  const digits = currencyDigits(currency)
  const pattern = digits === 0 ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/
  if (!pattern.test(value)) throw new Error('invalid-money')
  const [whole, decimal = ''] = value.split('.')
  const minor = Number(whole) * 10 ** digits + Number(decimal.padEnd(digits, '0'))
  if (!Number.isSafeInteger(minor) || minor < 0 || minor > MAX_MINOR) throw new Error('invalid-money')
  return minor
}

export function moneyInput(minor: number, currency: Currency): string {
  return (minor / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency))
}

export function formatMoney(minor: number, currency: Currency, locale = 'en-IN', compact = false): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: compact ? 0 : currencyDigits(currency),
    maximumFractionDigits: compact ? 1 : currencyDigits(currency),
    ...(compact ? { notation: 'compact' as const } : {}),
  }).format(minor / 10 ** currencyDigits(currency))
}

export function lineTotal(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity)
}
