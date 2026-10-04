/** What a group of items represents. */
export type GroupType = 'expense' | 'selling'

export interface Currency {
  /** ISO-style code for presets, or `CUSTOM` for a user-typed symbol. */
  code: string
  /** What is shown in front of amounts, e.g. `Le`, `$`, `£`. */
  symbol: string
}

export interface Item {
  id: string
  name: string
  /** Never negative. May be fractional (e.g. 2.5 kg). */
  quantity: number
  /** Descriptive only (pieces, boxes, kg…). Never affects a calculation. */
  unit?: string
  unitCost: number
  /**
   * Price per unit. Only used while the item's group is a `selling` group, but
   * it is kept if the group is switched to `expense` so nothing is lost.
   */
  sellingPrice?: number
  notes?: string
}

export interface Group {
  id: string
  name: string
  type: GroupType
  /** Position within the plan (0-based). The `groups` array is kept in this order. */
  order: number
  collapsed?: boolean
  items: Item[]
}

export interface BusinessPlan {
  id: string
  name: string
  description?: string
  currency: Currency
  groups: Group[]
  /** ISO 8601 timestamps. */
  createdAt: string
  updatedAt: string
}

/** The editable fields of an item (everything except its identity). */
export type ItemValues = Omit<Item, 'id'>

export interface GroupInput {
  name: string
  type: GroupType
}

export interface PlanInput {
  name: string
  description?: string
  currency: Currency
}
