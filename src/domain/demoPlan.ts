import { DEFAULT_CURRENCY } from './currencyUtils'
import { createPlanData, addGroup, addItem } from './planOperations'
import type { BusinessPlan, GroupType, ItemValues } from './types'

/**
 * Optional example plan the person can add from the first-use screen.
 * It is never created automatically.
 */
export function createDemoPlan(): BusinessPlan {
  let plan = createPlanData({
    name: 'Clothing Business (example)',
    description: 'An example to explore. Change anything, or delete it when you’re done.',
    currency: DEFAULT_CURRENCY,
  })

  const groups: { name: string; type: GroupType; items: ItemValues[] }[] = [
    {
      name: 'Inventory',
      type: 'selling',
      items: [
        { name: 'T-Shirts', quantity: 50, unit: 'pieces', unitCost: 80, sellingPrice: 130 },
        { name: 'Caps', quantity: 30, unit: 'pieces', unitCost: 50, sellingPrice: 90 },
      ],
    },
    {
      name: 'Marketing',
      type: 'expense',
      items: [
        { name: 'Flyers', quantity: 500, unit: 'pieces', unitCost: 1 },
        { name: 'Facebook Advertising', quantity: 1, unit: 'campaign', unitCost: 2000 },
      ],
    },
    {
      name: 'Equipment',
      type: 'expense',
      items: [
        { name: 'Printer', quantity: 1, unitCost: 2500 },
        { name: 'Shelves', quantity: 3, unitCost: 600 },
      ],
    },
  ]

  for (const group of groups) {
    plan = addGroup(plan, { name: group.name, type: group.type })
    const groupId = plan.groups[plan.groups.length - 1].id
    for (const item of group.items) plan = addItem(plan, groupId, item)
  }
  return plan
}
