import type { Group, GroupType, Item } from './types'
import { roundMoney, roundTo, sumMoney, toNonNegative } from './moneyUtils'

/**
 * All business maths lives here. Everything is a pure function of the stored
 * source data — totals are never persisted, so they can't go stale.
 */

type CostFields = Pick<Item, 'quantity' | 'unitCost'>
type PriceFields = Pick<Item, 'quantity' | 'sellingPrice'>

/** quantity × unit cost */
export function itemCost(item: CostFields): number {
  return roundMoney(toNonNegative(item.quantity) * toNonNegative(item.unitCost))
}

/** quantity × selling price (0 while no selling price has been entered) */
export function itemRevenue(item: PriceFields): number {
  return roundMoney(toNonNegative(item.quantity) * toNonNegative(item.sellingPrice))
}

/** revenue − cost (negative when the selling price is below cost) */
export function itemProfit(item: CostFields & PriceFields): number {
  return roundMoney(itemRevenue(item) - itemCost(item))
}

export interface ItemTotals {
  cost: number
  /** Always 0 for items in an expense group. */
  revenue: number
  /** revenue − cost. Always 0 for items in an expense group. */
  profit: number
  /** True when the item is in a selling group and has a selling price. */
  hasSellingPrice: boolean
}

export function calculateItem(
  item: Pick<Item, 'quantity' | 'unitCost' | 'sellingPrice'>,
  type: GroupType,
): ItemTotals {
  const cost = itemCost(item)
  // Selling prices are ignored (but kept) in expense groups.
  if (type === 'expense') return { cost, revenue: 0, profit: 0, hasSellingPrice: false }

  return {
    cost,
    revenue: itemRevenue(item),
    profit: itemProfit(item),
    hasSellingPrice: item.sellingPrice !== undefined,
  }
}

export interface GroupTotals {
  itemCount: number
  cost: number
  /** 0 for expense groups. */
  revenue: number
  /** 0 for expense groups. */
  profit: number
  /** Items in a selling group that don't have a selling price yet. */
  unpricedCount: number
}

export function calculateGroup(group: Pick<Group, 'type' | 'items'>): GroupTotals {
  const totals = group.items.map((item) => calculateItem(item, group.type))
  const cost = sumMoney(totals.map((t) => t.cost))
  const revenue = sumMoney(totals.map((t) => t.revenue))
  return {
    itemCount: group.items.length,
    cost,
    revenue,
    // Expense groups sell nothing, so "profit" would only be their cost with a minus sign.
    profit: group.type === 'selling' ? roundMoney(revenue - cost) : 0,
    unpricedCount:
      group.type === 'selling' ? totals.filter((t) => !t.hasSellingPrice).length : 0,
  }
}

export interface PlanTotals {
  groupCount: number
  itemCount: number
  hasSellingGroups: boolean
  /** Items in selling groups with no selling price yet. */
  unpricedItemCount: number
  /** Cost of everything, across all groups. */
  totalStartupCost: number
  /** Cost of the things being sold (selling groups only). */
  inventoryCost: number
  /** What the selling groups would bring in if everything sold at the entered prices. */
  potentialRevenue: number
  /** potentialRevenue − inventoryCost */
  grossProfit: number
  /** grossProfit ÷ potentialRevenue × 100 (one decimal), or null when there is no revenue. */
  grossMargin: number | null
  /** potentialRevenue − totalStartupCost. Not the same as grossProfit. */
  projectedSurplus: number
}

export function calculatePlan(groups: readonly Pick<Group, 'type' | 'items'>[]): PlanTotals {
  const groupTotals = groups.map((group) => ({ group, totals: calculateGroup(group) }))
  const selling = groupTotals.filter(({ group }) => group.type === 'selling')

  const totalStartupCost = sumMoney(groupTotals.map(({ totals }) => totals.cost))
  const inventoryCost = sumMoney(selling.map(({ totals }) => totals.cost))
  const potentialRevenue = sumMoney(selling.map(({ totals }) => totals.revenue))
  const grossProfit = roundMoney(potentialRevenue - inventoryCost)

  return {
    groupCount: groups.length,
    itemCount: groupTotals.reduce((count, { totals }) => count + totals.itemCount, 0),
    hasSellingGroups: selling.length > 0,
    unpricedItemCount: selling.reduce((count, { totals }) => count + totals.unpricedCount, 0),
    totalStartupCost,
    inventoryCost,
    potentialRevenue,
    grossProfit,
    grossMargin:
      potentialRevenue > 0 ? roundTo((grossProfit / potentialRevenue) * 100, 1) : null,
    projectedSurplus: roundMoney(potentialRevenue - totalStartupCost),
  }
}
