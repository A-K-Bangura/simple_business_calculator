import { describe, expect, it } from 'vitest'
import { formatMoney } from './currencyUtils'
import { formatPercent, formatQuantityWithUnit, formatRelativeTime, pluralize, slugify } from './formatUtils'

/** Amounts use non-breaking spaces so the symbol never wraps away from the number. */
const plain = (text: string) => text.replace(/ /g, ' ')

const LE = { code: 'SLE', symbol: 'Le' }
const USD = { code: 'USD', symbol: '$' }
const GBP = { code: 'GBP', symbol: '£' }

describe('formatMoney', () => {
  it('formats the examples from the brief', () => {
    expect(plain(formatMoney(5000, LE))).toBe('Le 5,000')
    expect(plain(formatMoney(2500, USD))).toBe('$2,500')
    expect(plain(formatMoney(750, GBP))).toBe('£750')
  })

  it('shows no decimals for whole amounts and two for cents', () => {
    expect(plain(formatMoney(80, LE))).toBe('Le 80')
    expect(plain(formatMoney(80.5, LE))).toBe('Le 80.50')
    expect(plain(formatMoney(19.99, USD))).toBe('$19.99')
  })

  it('writes negative amounts with a real minus sign before the symbol', () => {
    expect(plain(formatMoney(-3100, LE))).toBe('−Le 3,100')
    expect(plain(formatMoney(-0.5, USD))).toBe('−$0.50')
  })

  it('never shows an artifact or a negative zero', () => {
    expect(plain(formatMoney(4999.9999997, LE))).toBe('Le 5,000')
    expect(plain(formatMoney(-0.001, LE))).toBe('Le 0')
  })

  it('never shows NaN, Infinity or undefined', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(plain(formatMoney(bad, LE))).toBe('Le 0')
    }
    expect(plain(formatMoney(undefined as unknown as number, LE))).toBe('Le 0')
  })

  it('handles very large amounts', () => {
    const text = plain(formatMoney(1e21, LE))
    expect(text.startsWith('Le 1,000,000')).toBe(true)
    expect(text).not.toMatch(/NaN|Infinity|undefined|e\+/)
  })

  it('uses custom symbols, with a gap only after letters', () => {
    expect(plain(formatMoney(1200, { code: 'CUSTOM', symbol: 'FCFA' }))).toBe('FCFA 1,200')
    expect(plain(formatMoney(1200, { code: 'GHS', symbol: 'GH₵' }))).toBe('GH₵1,200')
  })

  it('falls back to the code if there is no symbol', () => {
    expect(plain(formatMoney(10, { code: 'XYZ', symbol: ' ' }))).toBe('XYZ 10')
  })
})

describe('other formatting', () => {
  it('formats quantities with an optional unit', () => {
    expect(formatQuantityWithUnit(50, 'pieces')).toBe('50 pieces')
    expect(formatQuantityWithUnit(2.5, 'kg')).toBe('2.5 kg')
    expect(formatQuantityWithUnit(3)).toBe('3')
    expect(formatQuantityWithUnit(1500)).toBe('1,500')
  })

  it('formats percentages', () => {
    expect(formatPercent(40.2)).toBe('40.2%')
    expect(formatPercent(42)).toBe('42%')
    expect(formatPercent(-66.7)).toBe('-66.7%')
  })

  it('pluralizes', () => {
    expect(pluralize(1, 'item')).toBe('1 item')
    expect(pluralize(0, 'item')).toBe('0 items')
    expect(pluralize(8, 'group')).toBe('8 groups')
  })

  it('describes how recently something changed', () => {
    const now = Date.parse('2026-10-04T12:00:00Z')
    expect(formatRelativeTime('2026-10-04T11:59:50Z', now)).toBe('just now')
    expect(formatRelativeTime('2026-10-04T11:55:00Z', now)).toBe('5 minutes ago')
    expect(formatRelativeTime('2026-10-04T09:00:00Z', now)).toBe('3 hours ago')
    expect(formatRelativeTime('2026-10-03T12:00:00Z', now)).toBe('yesterday')
    expect(formatRelativeTime('2026-10-01T12:00:00Z', now)).toBe('3 days ago')
    expect(formatRelativeTime('not a date', now)).toBe('')
  })

  it('makes file-name-friendly slugs', () => {
    expect(slugify('Mariama’s Clothing Business')).toBe('mariamas-clothing-business')
    expect(slugify('  Café — Ünïcode!! ')).toBe('cafe-unicode')
    expect(slugify('!!!')).toBe('')
  })
})
