import type { Currency } from './types'
import { roundMoney, safeNumber } from './moneyUtils'

export interface CurrencyPreset extends Currency {
  name: string
}

export const CUSTOM_CURRENCY_CODE = 'CUSTOM'

export const CURRENCY_PRESETS: readonly CurrencyPreset[] = [
  { code: 'SLE', symbol: 'Le', name: 'Sierra Leonean leone' },
  { code: 'USD', symbol: '$', name: 'US dollar' },
  { code: 'GBP', symbol: '£', name: 'British pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian naira' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian cedi' },
  { code: 'LRD', symbol: 'L$', name: 'Liberian dollar' },
  { code: 'GMD', symbol: 'D', name: 'Gambian dalasi' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African rand' },
  { code: 'INR', symbol: '₹', name: 'Indian rupee' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian dollar' },
]

export const DEFAULT_CURRENCY: Currency = { code: 'SLE', symbol: 'Le' }

/** A real minus sign: screen readers say "minus", and it lines up with digits. */
const MINUS = '−'
const NBSP = ' '

// Fixed locale so amounts look identical for every user and every screen.
const wholeFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const centsFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function symbolPrefix(currency: Currency): string {
  const symbol = currency.symbol.trim() || currency.code.trim()
  if (!symbol) return ''
  // Letters read better with a gap ("Le 5,000"); symbols sit tight ("$2,500").
  // A non-breaking space keeps the symbol and number on one line.
  return /\p{L}$/u.test(symbol) ? `${symbol}${NBSP}` : symbol
}

/**
 * The only place money is turned into text.
 * Whole amounts have no decimals ("Le 5,000"); anything with cents always
 * shows two ("Le 80.50"). Negative amounts read "−Le 500".
 */
export function formatMoney(amount: number, currency: Currency): string {
  const value = roundMoney(safeNumber(amount))
  const absolute = Math.abs(value)
  const digits = Number.isInteger(absolute) ? wholeFormat : centsFormat
  return `${value < 0 ? MINUS : ''}${symbolPrefix(currency)}${digits.format(absolute)}`
}

export function isPresetCurrency(currency: Currency): boolean {
  return CURRENCY_PRESETS.some((preset) => preset.code === currency.code)
}

export function findPresetByCode(code: string): CurrencyPreset | undefined {
  return CURRENCY_PRESETS.find((preset) => preset.code === code)
}
