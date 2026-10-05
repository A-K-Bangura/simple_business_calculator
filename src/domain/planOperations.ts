import { createId } from './idUtils'
import { LIMITS } from './validationUtils'
import type { BusinessPlan, Group, GroupInput, Item, ItemValues, PlanInput } from './types'

/**
 * Pure, immutable edits to a plan. Anything an edit doesn't touch keeps its
 * object identity so memoised components can skip re-rendering.
 *
 * None of these touch `updatedAt`; the state layer stamps that when it saves.
 */

export function createPlanData(input: PlanInput, now: string = new Date().toISOString()): BusinessPlan {
  return {
    id: createId(),
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    currency: input.currency,
    groups: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function updatePlanDetails(plan: BusinessPlan, input: PlanInput): BusinessPlan {
  const { description: _previous, ...rest } = plan
  return {
    ...rest,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    currency: input.currency,
  }
}

/** Keeps each group's `order` equal to its position. */
export function normalizeOrder(groups: readonly Group[]): Group[] {
  return groups.map((group, index) => (group.order === index ? group : { ...group, order: index }))
}

function mapGroup(plan: BusinessPlan, groupId: string, update: (group: Group) => Group): BusinessPlan {
  let changed = false
  const groups = plan.groups.map((group) => {
    if (group.id !== groupId) return group
    const next = update(group)
    if (next !== group) changed = true
    return next
  })
  return changed ? { ...plan, groups } : plan
}

// ---- groups ---------------------------------------------------------------

export function addGroup(plan: BusinessPlan, input: GroupInput): BusinessPlan {
  const group: Group = {
    id: createId(),
    name: input.name,
    type: input.type,
    order: plan.groups.length,
    items: [],
  }
  return { ...plan, groups: [...plan.groups, group] }
}

export function updateGroup(plan: BusinessPlan, groupId: string, input: GroupInput): BusinessPlan {
  // Items keep their selling prices when a group becomes an expense group,
  // so switching back later restores everything.
  return mapGroup(plan, groupId, (group) =>
    group.name === input.name && group.type === input.type
      ? group
      : { ...group, name: input.name, type: input.type },
  )
}

export function setGroupCollapsed(plan: BusinessPlan, groupId: string, collapsed: boolean): BusinessPlan {
  return mapGroup(plan, groupId, (group) => {
    if (Boolean(group.collapsed) === collapsed) return group
    const { collapsed: _previous, ...rest } = group
    return collapsed ? { ...rest, collapsed: true } : rest
  })
}

export function removeGroup(plan: BusinessPlan, groupId: string): BusinessPlan {
  if (!plan.groups.some((group) => group.id === groupId)) return plan
  return { ...plan, groups: normalizeOrder(plan.groups.filter((group) => group.id !== groupId)) }
}

export function restoreGroup(plan: BusinessPlan, group: Group, index: number): BusinessPlan {
  if (plan.groups.some((existing) => existing.id === group.id)) return plan
  const groups = [...plan.groups]
  groups.splice(Math.min(Math.max(index, 0), groups.length), 0, group)
  return { ...plan, groups: normalizeOrder(groups) }
}

/** Move a group one place up (-1) or down (+1). */
export function moveGroup(plan: BusinessPlan, groupId: string, offset: -1 | 1): BusinessPlan {
  const from = plan.groups.findIndex((group) => group.id === groupId)
  const to = from + offset
  if (from < 0 || to < 0 || to >= plan.groups.length) return plan
  const groups = [...plan.groups]
  const [moved] = groups.splice(from, 1)
  groups.splice(to, 0, moved)
  return { ...plan, groups: normalizeOrder(groups) }
}

// ---- items ----------------------------------------------------------------

function buildItem(id: string, values: ItemValues): Item {
  return {
    id,
    name: values.name,
    quantity: values.quantity,
    unitCost: values.unitCost,
    ...(values.unit ? { unit: values.unit } : {}),
    ...(values.sellingPrice !== undefined ? { sellingPrice: values.sellingPrice } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
  }
}

export function addItem(plan: BusinessPlan, groupId: string, values: ItemValues): BusinessPlan {
  return mapGroup(plan, groupId, (group) => ({
    ...group,
    items: [...group.items, buildItem(createId(), values)],
  }))
}

export function updateItem(
  plan: BusinessPlan,
  groupId: string,
  itemId: string,
  values: ItemValues,
): BusinessPlan {
  return mapGroup(plan, groupId, (group) => ({
    ...group,
    items: group.items.map((item) => {
      if (item.id !== itemId) return item
      // The form has no selling-price box in an expense group, so keep any
      // price that was stored from when the group was a selling group.
      const sellingPrice = group.type === 'selling' ? values.sellingPrice : item.sellingPrice
      return buildItem(item.id, { ...values, sellingPrice })
    }),
  }))
}

export function duplicateItem(plan: BusinessPlan, groupId: string, itemId: string): BusinessPlan {
  return mapGroup(plan, groupId, (group) => {
    const index = group.items.findIndex((item) => item.id === itemId)
    if (index < 0) return group
    const original = group.items[index]
    const name = `${original.name} (copy)`.slice(0, LIMITS.name)
    const items = [...group.items]
    items.splice(index + 1, 0, { ...original, id: createId(), name })
    return { ...group, items }
  })
}

export function removeItem(plan: BusinessPlan, groupId: string, itemId: string): BusinessPlan {
  return mapGroup(plan, groupId, (group) =>
    group.items.some((item) => item.id === itemId)
      ? { ...group, items: group.items.filter((item) => item.id !== itemId) }
      : group,
  )
}

export function restoreItem(plan: BusinessPlan, groupId: string, item: Item, index: number): BusinessPlan {
  return mapGroup(plan, groupId, (group) => {
    if (group.items.some((existing) => existing.id === item.id)) return group
    const items = [...group.items]
    items.splice(Math.min(Math.max(index, 0), items.length), 0, item)
    return { ...group, items }
  })
}

// ---- whole plans ----------------------------------------------------------

/** A copy of a plan where the plan, its groups and its items all have fresh ids. */
export function cloneWithNewIds(plan: BusinessPlan, overrides: Partial<BusinessPlan> = {}): BusinessPlan {
  return {
    ...plan,
    id: createId(),
    groups: plan.groups.map((group) => ({
      ...group,
      id: createId(),
      items: group.items.map((item) => ({ ...item, id: createId() })),
    })),
    ...overrides,
  }
}
