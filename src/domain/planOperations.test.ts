import { describe, expect, it } from 'vitest'
import { calculatePlan } from './calculationUtils'
import {
  addGroup,
  addItem,
  cloneWithNewIds,
  createPlanData,
  duplicateItem,
  moveGroup,
  removeGroup,
  removeItem,
  restoreGroup,
  restoreItem,
  setGroupCollapsed,
  updateGroup,
  updateItem,
  updatePlanDetails,
} from './planOperations'
import { createDemoPlan } from './demoPlan'
import type { BusinessPlan } from './types'

const currency = { code: 'SLE', symbol: 'Le' }
const newPlan = () => createPlanData({ name: 'Test', currency })

function withGroups(...names: string[]): BusinessPlan {
  return names.reduce((plan, name) => addGroup(plan, { name, type: 'expense' }), newPlan())
}

describe('plans', () => {
  it('starts empty with matching timestamps and a unique id', () => {
    const a = newPlan()
    const b = newPlan()
    expect(a.groups).toEqual([])
    expect(a.createdAt).toBe(a.updatedAt)
    expect(a.id).not.toBe(b.id)
  })

  it('edits details, including clearing the description', () => {
    const plan = createPlanData({ name: 'A', description: 'old', currency })
    const next = updatePlanDetails(plan, { name: 'B', currency: { code: 'USD', symbol: '$' } })
    expect(next).toMatchObject({ name: 'B', currency: { code: 'USD' } })
    expect(next).not.toHaveProperty('description')
  })
})

describe('groups', () => {
  it('adds groups in order', () => {
    const plan = withGroups('Inventory', 'Marketing')
    expect(plan.groups.map((g) => [g.name, g.order])).toEqual([
      ['Inventory', 0],
      ['Marketing', 1],
    ])
  })

  it('renames and retypes a group without touching others', () => {
    const plan = withGroups('A', 'B')
    const [a, b] = plan.groups
    const next = updateGroup(plan, a.id, { name: 'Alpha', type: 'selling' })
    expect(next.groups[0]).toMatchObject({ name: 'Alpha', type: 'selling' })
    expect(next.groups[1]).toBe(b) // untouched groups keep identity
  })

  it('returns the very same plan when nothing changed', () => {
    const plan = withGroups('A')
    expect(updateGroup(plan, plan.groups[0].id, { name: 'A', type: 'expense' })).toBe(plan)
    expect(setGroupCollapsed(plan, plan.groups[0].id, false)).toBe(plan)
  })

  it('collapses and expands', () => {
    const plan = withGroups('A')
    const id = plan.groups[0].id
    const collapsed = setGroupCollapsed(plan, id, true)
    expect(collapsed.groups[0].collapsed).toBe(true)
    expect(setGroupCollapsed(collapsed, id, false).groups[0]).not.toHaveProperty('collapsed')
  })

  it('moves groups up and down, keeping order numbers in step', () => {
    const plan = withGroups('A', 'B', 'C')
    const [a, , c] = plan.groups
    const down = moveGroup(plan, a.id, 1)
    expect(down.groups.map((g) => g.name)).toEqual(['B', 'A', 'C'])
    expect(down.groups.map((g) => g.order)).toEqual([0, 1, 2])
    expect(moveGroup(down, c.id, -1).groups.map((g) => g.name)).toEqual(['B', 'C', 'A'])
  })

  it('does nothing when moving past either end', () => {
    const plan = withGroups('A', 'B')
    expect(moveGroup(plan, plan.groups[0].id, -1)).toBe(plan)
    expect(moveGroup(plan, plan.groups[1].id, 1)).toBe(plan)
  })

  it('removes a group and can restore it where it was', () => {
    const plan = withGroups('A', 'B', 'C')
    const b = plan.groups[1]
    const removed = removeGroup(plan, b.id)
    expect(removed.groups.map((g) => g.name)).toEqual(['A', 'C'])
    expect(removed.groups.map((g) => g.order)).toEqual([0, 1])

    const restored = restoreGroup(removed, b, 1)
    expect(restored.groups.map((g) => g.name)).toEqual(['A', 'B', 'C'])
    expect(restored.groups.map((g) => g.order)).toEqual([0, 1, 2])
    expect(restoreGroup(restored, b, 1)).toBe(restored) // no duplicates
  })
})

describe('items', () => {
  const setup = (type: 'expense' | 'selling' = 'expense') => {
    let plan = addGroup(newPlan(), { name: 'G', type })
    const groupId = plan.groups[0].id
    plan = addItem(plan, groupId, { name: 'First', quantity: 2, unitCost: 10, sellingPrice: 25 })
    plan = addItem(plan, groupId, { name: 'Second', quantity: 1, unitCost: 5 })
    return { plan, groupId, items: () => plan.groups[0].items }
  }

  it('adds items with ids, dropping empty optional fields', () => {
    const { items } = setup()
    expect(items()).toHaveLength(2)
    expect(items()[0].id).toBeTruthy()
    expect(items()[1]).not.toHaveProperty('unit')
    expect(items()[1]).not.toHaveProperty('sellingPrice')
  })

  it('edits an item in place', () => {
    const { plan, groupId } = setup('selling')
    const id = plan.groups[0].items[0].id
    const next = updateItem(plan, groupId, id, { name: 'Renamed', quantity: 4, unitCost: 12, sellingPrice: 30, unit: 'kg' })
    expect(next.groups[0].items[0]).toEqual({
      id,
      name: 'Renamed',
      quantity: 4,
      unitCost: 12,
      sellingPrice: 30,
      unit: 'kg',
    })
    expect(next.groups[0].items[1]).toBe(plan.groups[0].items[1])
  })

  it('keeps a stored selling price when editing an item in an expense group', () => {
    const { plan, groupId } = setup('expense')
    const id = plan.groups[0].items[0].id
    const next = updateItem(plan, groupId, id, { name: 'First', quantity: 3, unitCost: 10 })
    expect(next.groups[0].items[0].sellingPrice).toBe(25)
  })

  it('duplicates right after the original with a new id', () => {
    const { plan, groupId } = setup()
    const original = plan.groups[0].items[0]
    const next = duplicateItem(plan, groupId, original.id)
    const names = next.groups[0].items.map((i) => i.name)
    expect(names).toEqual(['First', 'First (copy)', 'Second'])
    expect(next.groups[0].items[1].id).not.toBe(original.id)
    expect(next.groups[0].items[1]).toMatchObject({ quantity: 2, unitCost: 10 })
  })

  it('removes an item and can put it back at its old position', () => {
    const { plan, groupId } = setup()
    const first = plan.groups[0].items[0]
    const removed = removeItem(plan, groupId, first.id)
    expect(removed.groups[0].items.map((i) => i.name)).toEqual(['Second'])
    const restored = restoreItem(removed, groupId, first, 0)
    expect(restored.groups[0].items.map((i) => i.name)).toEqual(['First', 'Second'])
    expect(restoreItem(restored, groupId, first, 0)).toBe(restored)
  })

  it('ignores unknown group or item ids', () => {
    const { plan } = setup()
    expect(addItem(plan, 'nope', { name: 'x', quantity: 1, unitCost: 1 })).toBe(plan)
    expect(removeItem(plan, plan.groups[0].id, 'nope')).toBe(plan)
  })
})

describe('changing a group from selling to expense and back', () => {
  it('keeps selling prices, but only counts them while the group is a selling group', () => {
    let plan = addGroup(newPlan(), { name: 'Stock', type: 'selling' })
    const groupId = plan.groups[0].id
    plan = addItem(plan, groupId, { name: 'Hats', quantity: 10, unitCost: 20, sellingPrice: 50 })

    expect(calculatePlan(plan.groups).potentialRevenue).toBe(500)

    plan = updateGroup(plan, groupId, { name: 'Stock', type: 'expense' })
    expect(plan.groups[0].items[0].sellingPrice).toBe(50) // preserved internally
    expect(calculatePlan(plan.groups)).toMatchObject({ potentialRevenue: 0, totalStartupCost: 200 })

    plan = updateGroup(plan, groupId, { name: 'Stock', type: 'selling' })
    expect(calculatePlan(plan.groups).potentialRevenue).toBe(500) // and it comes back
  })
})

describe('cloneWithNewIds', () => {
  it('copies content but gives everything new ids', () => {
    const original = createDemoPlan()
    const copy = cloneWithNewIds(original, { name: 'Copy' })

    expect(copy.name).toBe('Copy')
    expect(calculatePlan(copy.groups)).toEqual(calculatePlan(original.groups))

    const ids = (plan: BusinessPlan) => [plan.id, ...plan.groups.flatMap((g) => [g.id, ...g.items.map((i) => i.id)])]
    const originalIds = new Set(ids(original))
    expect(ids(copy).some((id) => originalIds.has(id))).toBe(false)
    expect(new Set(ids(copy)).size).toBe(ids(copy).length)
  })

  it('does not alter the original', () => {
    const original = createDemoPlan()
    const snapshot = JSON.stringify(original)
    cloneWithNewIds(original)
    expect(JSON.stringify(original)).toBe(snapshot)
  })
})
