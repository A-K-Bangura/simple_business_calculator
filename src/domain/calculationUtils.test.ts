import { describe, expect, it } from 'vitest'
import {
  calculateGroup,
  calculateItem,
  calculatePlan,
  itemCost,
  itemProfit,
  itemRevenue,
} from './calculationUtils'
import { createDemoPlan } from './demoPlan'
import type { Group, Item } from './types'

let nextId = 0
function item(values: Partial<Item> & Pick<Item, 'quantity' | 'unitCost'>): Item {
  return { id: `i${nextId++}`, name: 'Thing', ...values }
}
function group(type: Group['type'], items: Item[]): Group {
  return { id: `g${nextId++}`, name: 'Group', type, order: 0, items }
}

describe('item cost, revenue and profit', () => {
  it('multiplies quantity by unit cost', () => {
    expect(itemCost({ quantity: 50, unitCost: 80 })).toBe(4000)
  })

  it('multiplies quantity by selling price for revenue', () => {
    expect(itemRevenue({ quantity: 50, sellingPrice: 130 })).toBe(6500)
  })

  it('profit is revenue minus cost', () => {
    const tShirts = item({ quantity: 50, unitCost: 80, sellingPrice: 130 })
    expect(calculateItem(tShirts, 'selling')).toEqual({
      cost: 4000,
      revenue: 6500,
      profit: 2500,
      hasSellingPrice: true,
    })
  })

  it('treats a missing selling price as no revenue, and says so', () => {
    const totals = calculateItem(item({ quantity: 10, unitCost: 5 }), 'selling')
    expect(totals.revenue).toBe(0)
    expect(totals.hasSellingPrice).toBe(false)
  })

  it('ignores (but does not need to delete) selling prices in expense groups', () => {
    const totals = calculateItem(item({ quantity: 2, unitCost: 10, sellingPrice: 99 }), 'expense')
    expect(totals).toEqual({ cost: 20, revenue: 0, profit: 0, hasSellingPrice: false })
  })
})

describe('zero values', () => {
  it('handles zero quantity', () => {
    expect(calculateItem(item({ quantity: 0, unitCost: 80, sellingPrice: 130 }), 'selling')).toMatchObject({
      cost: 0,
      revenue: 0,
      profit: 0,
    })
  })

  it('handles zero cost', () => {
    expect(calculateItem(item({ quantity: 5, unitCost: 0, sellingPrice: 10 }), 'selling')).toMatchObject({
      cost: 0,
      revenue: 50,
      profit: 50,
    })
  })

  it('an empty group totals zero', () => {
    expect(calculateGroup(group('selling', []))).toEqual({
      itemCount: 0,
      cost: 0,
      revenue: 0,
      profit: 0,
      unpricedCount: 0,
    })
  })

  it('an empty plan is all zeros, with no margin', () => {
    expect(calculatePlan([])).toEqual({
      groupCount: 0,
      itemCount: 0,
      hasSellingGroups: false,
      unpricedItemCount: 0,
      totalStartupCost: 0,
      inventoryCost: 0,
      potentialRevenue: 0,
      grossProfit: 0,
      grossMargin: null,
      projectedSurplus: 0,
    })
  })
})

describe('decimal behaviour', () => {
  it('supports decimal quantities', () => {
    expect(itemCost({ quantity: 2.5, unitCost: 40 })).toBe(100)
  })

  it('supports decimal prices', () => {
    expect(itemCost({ quantity: 3, unitCost: 19.99 })).toBe(59.97)
  })

  it('never shows floating-point artifacts', () => {
    expect(itemCost({ quantity: 3, unitCost: 0.1 })).toBe(0.3) // 0.30000000000000004 in raw floats
    expect(itemCost({ quantity: 1.1, unitCost: 3 })).toBe(3.3) // 3.3000000000000003
    expect(itemCost({ quantity: 49999.99999, unitCost: 0.1 })).toBe(5000)
  })

  it('rounds to whole cents consistently', () => {
    expect(itemCost({ quantity: 2.5, unitCost: 0.35 })).toBe(0.88) // 0.875
    expect(itemCost({ quantity: 1, unitCost: 1.005 })).toBe(1.01)
  })

  it('sums decimals without drift', () => {
    const items = Array.from({ length: 10 }, () => item({ quantity: 1, unitCost: 0.1 }))
    expect(calculateGroup(group('expense', items)).cost).toBe(1)
  })
})

describe('group totals', () => {
  it('sums cost across items in an expense group', () => {
    const marketing = group('expense', [
      item({ quantity: 500, unitCost: 1 }),
      item({ quantity: 1, unitCost: 2000 }),
    ])
    expect(calculateGroup(marketing)).toMatchObject({ itemCount: 2, cost: 2500, revenue: 0, profit: 0 })
  })

  it('sums cost, revenue and profit in a selling group', () => {
    const inventory = group('selling', [
      item({ quantity: 50, unitCost: 80, sellingPrice: 130 }),
      item({ quantity: 30, unitCost: 50, sellingPrice: 90 }),
    ])
    expect(calculateGroup(inventory)).toMatchObject({
      itemCount: 2,
      cost: 5500,
      revenue: 9200,
      profit: 3700,
      unpricedCount: 0,
    })
  })

  it('counts items still waiting for a selling price', () => {
    const inventory = group('selling', [
      item({ quantity: 1, unitCost: 10, sellingPrice: 20 }),
      item({ quantity: 1, unitCost: 10 }),
    ])
    expect(calculateGroup(inventory).unpricedCount).toBe(1)
  })
})

describe('plan totals', () => {
  // The worked example from the product brief.
  const briefExample = [
    group('selling', [item({ quantity: 100, unitCost: 223, sellingPrice: 385 })]), // cost 22,300 → revenue 38,500
    group('expense', [item({ quantity: 1, unitCost: 2450 })]),
  ]

  it('startup cost counts every group, selling or not', () => {
    expect(calculatePlan(briefExample).totalStartupCost).toBe(24750)
  })

  it('inventory cost counts only selling groups', () => {
    expect(calculatePlan(briefExample).inventoryCost).toBe(22300)
  })

  it('potential revenue comes only from selling groups', () => {
    expect(calculatePlan(briefExample).potentialRevenue).toBe(38500)
  })

  it('gross profit is potential revenue minus inventory cost', () => {
    expect(calculatePlan(briefExample).grossProfit).toBe(16200)
  })

  it('gross margin is gross profit as a percentage of revenue', () => {
    expect(calculatePlan(briefExample).grossMargin).toBe(42.1) // 16,200 / 38,500 = 42.08%
  })

  it('surplus after startup costs is revenue minus the WHOLE startup cost, not gross profit', () => {
    const totals = calculatePlan(briefExample)
    expect(totals.projectedSurplus).toBe(13750)
    expect(totals.projectedSurplus).not.toBe(totals.grossProfit)
  })

  it('has no margin (and no NaN) when nothing has a selling price', () => {
    const totals = calculatePlan([group('selling', [item({ quantity: 5, unitCost: 10 })])])
    expect(totals.potentialRevenue).toBe(0)
    expect(totals.grossMargin).toBeNull()
    expect(totals.grossProfit).toBe(-50)
    expect(totals.unpricedItemCount).toBe(1)
  })

  it('a plan with only expense groups has startup cost but no revenue', () => {
    const totals = calculatePlan([group('expense', [item({ quantity: 3, unitCost: 600 })])])
    expect(totals).toMatchObject({
      totalStartupCost: 1800,
      hasSellingGroups: false,
      potentialRevenue: 0,
      projectedSurplus: -1800,
    })
  })
})

describe('negative profit scenarios', () => {
  it('reports a loss when the selling price is below cost', () => {
    const shirts = item({ quantity: 10, unitCost: 100, sellingPrice: 60 })
    expect(calculateItem(shirts, 'selling').profit).toBe(-400)
    expect(itemProfit(shirts)).toBe(-400)
  })

  it('carries a loss up to the plan: gross profit and margin go negative', () => {
    const totals = calculatePlan([group('selling', [item({ quantity: 10, unitCost: 100, sellingPrice: 60 })])])
    expect(totals.grossProfit).toBe(-400)
    expect(totals.grossMargin).toBe(-66.7)
    expect(totals.projectedSurplus).toBe(-400)
  })

  it('can be profitable per item yet still short after startup costs', () => {
    const totals = calculatePlan(createDemoPlan().groups)
    expect(totals.grossProfit).toBeGreaterThan(0)
    expect(totals.projectedSurplus).toBeLessThan(0)
  })
})

describe('very large and invalid numbers', () => {
  it('stays finite with very large values', () => {
    const huge = item({ quantity: 1_000_000_000, unitCost: 1_000_000_000_000, sellingPrice: 1_000_000_000_000 })
    const totals = calculatePlan([group('selling', [huge, huge, huge])])
    for (const value of Object.values(totals)) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
    }
  })

  it('never lets NaN or Infinity through', () => {
    const broken = item({ quantity: Number.NaN, unitCost: Number.POSITIVE_INFINITY, sellingPrice: Number.NaN })
    expect(calculateItem(broken, 'selling')).toMatchObject({ cost: 0, revenue: 0, profit: 0 })
  })

  it('treats negative stored values as zero', () => {
    expect(itemCost({ quantity: -5, unitCost: 10 })).toBe(0)
  })
})

describe('the example clothing business', () => {
  const totals = calculatePlan(createDemoPlan().groups)

  it('matches the figures worked out by hand', () => {
    expect(totals).toMatchObject({
      groupCount: 3,
      itemCount: 6,
      hasSellingGroups: true,
      totalStartupCost: 12300, // inventory 5,500 + marketing 2,500 + equipment 4,300
      inventoryCost: 5500,
      potentialRevenue: 9200,
      grossProfit: 3700,
      grossMargin: 40.2,
      projectedSurplus: -3100,
    })
  })
})
