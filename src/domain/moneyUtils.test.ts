import { describe, expect, it } from 'vitest'
import { roundMoney, roundTo, safeNumber, sumMoney, toNonNegative } from './moneyUtils'

describe('roundMoney', () => {
  it('removes floating-point artifacts', () => {
    expect(roundMoney(4999.9999997)).toBe(5000)
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(roundMoney(1.1 * 3)).toBe(3.3)
  })

  it('rounds half away from zero, the way people expect', () => {
    expect(roundMoney(1.005)).toBe(1.01)
    expect(roundMoney(2.675)).toBe(2.68)
    expect(roundMoney(-1.005)).toBe(-1.01)
    expect(roundMoney(0.875)).toBe(0.88)
  })

  it('leaves exact amounts alone', () => {
    expect(roundMoney(80)).toBe(80)
    expect(roundMoney(19.99)).toBe(19.99)
    expect(roundMoney(-250.5)).toBe(-250.5)
  })

  it('never returns negative zero', () => {
    expect(Object.is(roundMoney(-0.001), 0)).toBe(true)
    expect(Object.is(roundMoney(-0), 0)).toBe(true)
  })

  it('copes with tiny and huge numbers', () => {
    expect(roundMoney(1e-9)).toBe(0)
    expect(roundMoney(1e21)).toBe(1e21)
    expect(Number.isFinite(roundMoney(Number.MAX_VALUE))).toBe(true)
  })

  it('turns NaN and Infinity into 0', () => {
    expect(roundMoney(Number.NaN)).toBe(0)
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0)
    expect(roundMoney(Number.NEGATIVE_INFINITY)).toBe(0)
  })
})

describe('roundTo', () => {
  it('rounds to the requested decimals', () => {
    expect(roundTo(40.2174, 1)).toBe(40.2)
    expect(roundTo(66.666, 1)).toBe(66.7)
    expect(roundTo(2.5, 0)).toBe(3)
  })
})

describe('safeNumber / toNonNegative', () => {
  it('only passes finite numbers', () => {
    expect(safeNumber(12)).toBe(12)
    expect(safeNumber(Number.NaN)).toBe(0)
    expect(safeNumber(undefined)).toBe(0)
    expect(safeNumber(null)).toBe(0)
  })

  it('also clamps negatives to zero', () => {
    expect(toNonNegative(-3)).toBe(0)
    expect(toNonNegative(3)).toBe(3)
  })
})

describe('sumMoney', () => {
  it('adds without accumulating drift', () => {
    expect(sumMoney(Array.from({ length: 10 }, () => 0.1))).toBe(1)
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
  })

  it('is zero for nothing', () => {
    expect(sumMoney([])).toBe(0)
  })
})
