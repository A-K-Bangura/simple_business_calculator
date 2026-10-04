import type { GroupType } from './types'

/** Plain-language names and examples for the two kinds of group. */
export const GROUP_TYPES: Record<GroupType, { label: string; examples: string }> = {
  expense: {
    label: 'Things I pay for',
    examples: 'Marketing, equipment, rent, registration, transport…',
  },
  selling: {
    label: 'Things I plan to sell',
    examples: 'Inventory, products, stock… You’ll also enter a selling price.',
  },
}

/** Quick-start names offered on an empty plan. They're only suggestions. */
export const SUGGESTED_GROUPS: { name: string; type: GroupType }[] = [
  { name: 'Inventory', type: 'selling' },
  { name: 'Marketing', type: 'expense' },
  { name: 'Equipment', type: 'expense' },
  { name: 'Operations', type: 'expense' },
]

export const COMMON_UNITS = [
  'pieces', 'boxes', 'bags', 'packs', 'sets', 'bottles', 'kg', 'litres', 'metres',
  'hours', 'days', 'weeks', 'months', 'employees', 'campaigns', 'licenses',
] as const
