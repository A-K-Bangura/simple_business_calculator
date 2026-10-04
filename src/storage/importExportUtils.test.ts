import { describe, expect, it } from 'vitest'
import { calculatePlan } from '../domain/calculationUtils'
import { createDemoPlan } from '../domain/demoPlan'
import { exportFileName, ImportError, MAX_IMPORT_BYTES, parseImport, serializeExport } from './importExportUtils'
import { sanitizePlan } from './sanitize'

describe('export → import', () => {
  it('round-trips plans exactly', () => {
    const plans = [createDemoPlan(), createDemoPlan()]
    const result = parseImport(serializeExport(plans))
    expect(result.plans).toEqual(plans)
    expect(result.skipped).toBe(0)
  })

  it('exports a labelled, versioned file', () => {
    const file = JSON.parse(serializeExport([createDemoPlan()]))
    expect(file).toMatchObject({ app: 'startup-business-calculator', schemaVersion: 1 })
    expect(file.exportedAt).toBeTruthy()
  })

  it('names the file after the plan, or "all-plans"', () => {
    const day = new Date('2026-10-04T10:00:00Z')
    expect(exportFileName([createDemoPlan()], day)).toBe('clothing-business-example-2026-10-04.startup-plan.json')
    expect(exportFileName([createDemoPlan(), createDemoPlan()], day)).toBe('all-plans-2026-10-04.startup-plan.json')
  })
})

describe('importing invalid data', () => {
  const wrap = (plans: unknown, extra: object = {}) =>
    JSON.stringify({ app: 'startup-business-calculator', schemaVersion: 1, plans, ...extra })

  it.each([
    ['empty text', ''],
    ['not JSON', 'hello world'],
    ['truncated JSON', '{"app": "startup-bus'],
    ['a JSON number', '42'],
    ['null', 'null'],
    ['an array', '[]'],
    ['an object from some other app', '{"foo": "bar"}'],
    ['the right app but no plans', '{"app":"startup-business-calculator","schemaVersion":1}'],
    ['plans that is not a list', wrap('nope')],
    ['an empty plan list', wrap([])],
    ['a list of junk', wrap([1, 'a', null, [], { nothing: 1 }])],
    ['a version from the future', wrap([], { schemaVersion: 50 })],
    ['a missing version', '{"app":"startup-business-calculator","plans":[]}'],
  ])('rejects %s with a friendly error', (_label, text) => {
    expect(() => parseImport(text)).toThrowError(ImportError)
  })

  it('rejects a file that is far too large', () => {
    expect(() => parseImport(' '.repeat(MAX_IMPORT_BYTES + 1))).toThrowError(/too large/)
  })

  it('keeps the usable plans and counts the rest as skipped', () => {
    const result = parseImport(wrap([createDemoPlan(), { broken: true }, null]))
    expect(result.plans).toHaveLength(1)
    expect(result.skipped).toBe(2)
  })
})

describe('sanitizePlan — repairing untrusted data', () => {
  it('turns hostile values into safe ones', () => {
    const plan = sanitizePlan({
      id: 42,
      name: '  Shop  ',
      currency: { symbol: 'x'.repeat(50) },
      createdAt: 'yesterday-ish',
      groups: [
        {
          name: '',
          type: 'bank-account',
          order: 'first',
          items: [
            { name: 'Bad', quantity: -5, unitCost: Number.NaN, sellingPrice: Number.POSITIVE_INFINITY },
            { name: 'Huge', quantity: 1e300, unitCost: 1e300, sellingPrice: 'free' },
            'not an item',
            null,
          ],
        },
        null,
        'nope',
      ],
    })

    expect(plan).not.toBeNull()
    expect(plan?.name).toBe('Shop')
    expect(typeof plan?.id).toBe('string')
    expect(plan?.currency.symbol).toHaveLength(6)
    expect(Number.isNaN(Date.parse(plan?.createdAt ?? ''))).toBe(false)
    expect(plan?.groups).toHaveLength(1)

    const [group] = plan?.groups ?? []
    expect(group).toMatchObject({ name: 'Untitled group', type: 'expense', order: 0 })
    expect(group.items).toHaveLength(2)
    expect(group.items[0]).toMatchObject({ quantity: 0, unitCost: 0 })
    expect(group.items[0]).not.toHaveProperty('sellingPrice')
    expect(group.items[1].quantity).toBeLessThanOrEqual(1_000_000_000)

    // Whatever came in, the maths stays finite.
    const totals = calculatePlan(plan?.groups ?? [])
    expect(Object.values(totals).every((v) => v === null || typeof v === 'boolean' || Number.isFinite(v))).toBe(true)
  })

  it('makes duplicate ids unique so React keys and lookups stay safe', () => {
    const plan = sanitizePlan({
      id: 'p',
      name: 'Dupes',
      groups: [
        { id: 'g', name: 'A', type: 'expense', order: 0, items: [{ id: 'i', name: 'x', quantity: 1, unitCost: 1 }, { id: 'i', name: 'y', quantity: 1, unitCost: 1 }] },
        { id: 'g', name: 'B', type: 'expense', order: 1, items: [] },
      ],
    })
    const ids = [plan?.groups[0].id, plan?.groups[1].id]
    expect(new Set(ids).size).toBe(2)
    expect(new Set(plan?.groups[0].items.map((i) => i.id)).size).toBe(2)
  })

  it('orders groups by their saved order and renumbers them', () => {
    const plan = sanitizePlan({
      name: 'Order',
      groups: [
        { name: 'Third', order: 9, items: [] },
        { name: 'First', order: 1, items: [] },
        { name: 'Second', order: 5, items: [] },
      ],
    })
    expect(plan?.groups.map((g) => [g.name, g.order])).toEqual([
      ['First', 0],
      ['Second', 1],
      ['Third', 2],
    ])
  })

  it('rejects things that are clearly not plans', () => {
    for (const bad of [null, undefined, 3, 'x', [], {}, { name: 5 }]) expect(sanitizePlan(bad)).toBeNull()
  })

  it('fills in missing optional parts', () => {
    const plan = sanitizePlan({ name: 'Bare' })
    expect(plan).toMatchObject({ name: 'Bare', groups: [], currency: { code: 'SLE', symbol: 'Le' } })
  })
})
