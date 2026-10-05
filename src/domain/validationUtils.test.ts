import { describe, expect, it } from 'vitest'
import {
  draftFromItem,
  emptyItemDraft,
  formatNumberForInput,
  parseNumberInput,
  previewItemTotals,
  sellingPriceHint,
  validateGroupInput,
  validateItemDraft,
  validatePlanDraft,
  type ItemDraft,
} from './validationUtils'

const draft = (overrides: Partial<ItemDraft> = {}): ItemDraft => ({
  ...emptyItemDraft(),
  name: 'T-Shirts',
  unitCost: '80',
  ...overrides,
})

describe('parseNumberInput', () => {
  it('reads plain and decimal numbers', () => {
    expect(parseNumberInput('80')).toEqual({ kind: 'ok', value: 80 })
    expect(parseNumberInput('2.5')).toEqual({ kind: 'ok', value: 2.5 })
    expect(parseNumberInput('.5')).toEqual({ kind: 'ok', value: 0.5 })
    expect(parseNumberInput('0')).toEqual({ kind: 'ok', value: 0 })
    expect(parseNumberInput(' 12 ')).toEqual({ kind: 'ok', value: 12 })
  })

  it('accepts properly placed thousands commas', () => {
    expect(parseNumberInput('1,500')).toEqual({ kind: 'ok', value: 1500 })
    expect(parseNumberInput('1,250,000.50')).toEqual({ kind: 'ok', value: 1250000.5 })
  })

  it('rejects ambiguous or garbled input rather than guessing', () => {
    for (const text of ['2,5', '1,50', 'abc', '1e5', '1.2.3', '-', '.', '1,,000', '12a']) {
      expect(parseNumberInput(text).kind, text).toBe('invalid')
    }
  })

  it('flags negatives but allows -0', () => {
    expect(parseNumberInput('-5').kind).toBe('negative')
    expect(parseNumberInput('-0').kind).toBe('ok')
  })

  it('reports empty input', () => {
    expect(parseNumberInput('').kind).toBe('empty')
    expect(parseNumberInput('   ').kind).toBe('empty')
  })

  it('enforces the maximum', () => {
    expect(parseNumberInput('1001', 1000).kind).toBe('toolarge')
    expect(parseNumberInput('1000', 1000).kind).toBe('ok')
  })
})

describe('formatNumberForInput', () => {
  it('gives plain digits', () => {
    expect(formatNumberForInput(80)).toBe('80')
    expect(formatNumberForInput(2.5)).toBe('2.5')
    expect(formatNumberForInput(1500)).toBe('1500')
    expect(formatNumberForInput(1e-7)).toBe('0')
    expect(formatNumberForInput(1_000_000_000_000)).toBe('1000000000000')
    expect(formatNumberForInput(Number.NaN)).toBe('')
  })
})

describe('validateItemDraft', () => {
  it('accepts a complete expense item and builds clean values', () => {
    const { errors, values } = validateItemDraft(draft({ quantity: '500', unit: ' pieces ' }), 'expense')
    expect(errors).toEqual({})
    expect(values).toEqual({ name: 'T-Shirts', quantity: 500, unit: 'pieces', unitCost: 80 })
  })

  it('accepts a selling item with a price', () => {
    const { values } = validateItemDraft(draft({ sellingPrice: '130' }), 'selling')
    expect(values).toMatchObject({ unitCost: 80, sellingPrice: 130 })
  })

  it('does not require a selling price, but says so gently', () => {
    const d = draft()
    expect(validateItemDraft(d, 'selling').values).not.toBeNull()
    expect(sellingPriceHint(d, 'selling')).toBe('Enter a selling price to calculate potential revenue.')
    expect(sellingPriceHint(draft({ sellingPrice: '0' }), 'selling')).toBeNull()
    expect(sellingPriceHint(d, 'expense')).toBeNull()
  })

  it('ignores a stale selling price box in an expense group', () => {
    const { values } = validateItemDraft(draft({ sellingPrice: 'junk' }), 'expense')
    expect(values).not.toBeNull()
    expect(values).not.toHaveProperty('sellingPrice')
  })

  it('asks for a name', () => {
    expect(validateItemDraft(draft({ name: '   ' }), 'expense').errors.name).toBe('Enter an item name.')
  })

  it('allows zero quantity and zero cost', () => {
    const { errors, values } = validateItemDraft(draft({ quantity: '0', unitCost: '0' }), 'expense')
    expect(errors).toEqual({})
    expect(values).toMatchObject({ quantity: 0, unitCost: 0 })
  })

  it('allows decimal quantities', () => {
    expect(validateItemDraft(draft({ quantity: '2.5', unit: 'kg' }), 'expense').values?.quantity).toBe(2.5)
  })

  it('gives friendly messages for bad numbers', () => {
    const result = validateItemDraft(draft({ quantity: '-1', unitCost: '', sellingPrice: 'x' }), 'selling')
    expect(result.errors.quantity).toBe("Quantity can't be negative.")
    expect(result.errors.unitCost).toBe('Enter a cost (use 0 if it’s free).')
    expect(result.errors.sellingPrice).toBe('Enter a valid selling price.')
    expect(result.values).toBeNull()
  })

  it('rejects absurdly large numbers', () => {
    const result = validateItemDraft(draft({ quantity: '99999999999', unitCost: '99999999999999' }), 'expense')
    expect(result.errors.quantity).toBe('That quantity is too large.')
    expect(result.errors.unitCost).toBe('That cost is too large.')
  })

  it('round-trips an existing item through the form', () => {
    const item = { id: 'a', name: 'Caps', quantity: 30, unit: 'pieces', unitCost: 50, sellingPrice: 90, notes: 'Blue' }
    expect(validateItemDraft(draftFromItem(item), 'selling').values).toEqual({
      name: 'Caps',
      quantity: 30,
      unit: 'pieces',
      unitCost: 50,
      sellingPrice: 90,
      notes: 'Blue',
    })
  })
})

describe('previewItemTotals', () => {
  it('updates live from partly-typed values', () => {
    expect(previewItemTotals(draft({ quantity: '50', unitCost: '80', sellingPrice: '130' }), 'selling')).toMatchObject({
      cost: 4000,
      revenue: 6500,
      profit: 2500,
    })
  })

  it('treats anything not yet valid as zero instead of showing NaN', () => {
    const totals = previewItemTotals(draft({ quantity: '5', unitCost: '8.', sellingPrice: 'x' }), 'selling')
    expect(totals).toMatchObject({ cost: 40, revenue: 0 })
    expect(previewItemTotals(draft({ quantity: '', unitCost: '' }), 'expense').cost).toBe(0)
  })
})

describe('group and plan validation', () => {
  it('requires a group name', () => {
    expect(validateGroupInput({ name: '  ', type: 'expense' }).name).toBe('Give this group a name.')
    expect(validateGroupInput({ name: 'Marketing', type: 'expense' })).toEqual({})
  })

  it('requires a plan name and cleans the details', () => {
    const currency = { code: 'SLE', symbol: 'Le' }
    expect(validatePlanDraft({ name: ' ', description: '', currency }).errors.name).toBe('Give your plan a name.')
    expect(validatePlanDraft({ name: ' Juice ', description: ' fresh ', currency }).values).toEqual({
      name: 'Juice',
      description: 'fresh',
      currency,
    })
  })

  it('requires a symbol for a custom currency', () => {
    const result = validatePlanDraft({ name: 'Shop', description: '', currency: { code: 'CUSTOM', symbol: ' ' } })
    expect(result.errors.currency).toBe('Enter a currency symbol or code, like Le or FCFA.')
    expect(result.values).toBeNull()
  })
})
