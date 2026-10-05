import { calculateItem, type ItemTotals } from './calculationUtils'
import { CUSTOM_CURRENCY_CODE } from './currencyUtils'
import { MAX_AMOUNT, MAX_QUANTITY } from './moneyUtils'
import type { Currency, GroupInput, GroupType, Item, ItemValues, PlanInput } from './types'

export const LIMITS = {
  name: 80,
  unit: 24,
  notes: 500,
  description: 280,
  currencySymbol: 6,
} as const

// ---------------------------------------------------------------------------
// Number text fields
// ---------------------------------------------------------------------------

export type ParsedNumber =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'negative' }
  | { kind: 'toolarge' }
  | { kind: 'ok'; value: number }

const PLAIN_NUMBER = /^(\d+\.?\d*|\.\d+)$/
const GROUPED_NUMBER = /^\d{1,3}(,\d{3})+(\.\d*)?$/

/**
 * Reads what a person typed into a number box. Thousands commas are fine
 * ("1,500"), but anything ambiguous ("2,5") is reported as invalid rather
 * than guessed at.
 */
export function parseNumberInput(text: string, max: number = MAX_AMOUNT): ParsedNumber {
  const trimmed = text.replace(/\s+/g, '')
  if (trimmed === '') return { kind: 'empty' }

  const negative = trimmed.startsWith('-')
  const body = negative ? trimmed.slice(1) : trimmed
  if (!PLAIN_NUMBER.test(body) && !GROUPED_NUMBER.test(body)) return { kind: 'invalid' }

  const value = Number(body.replace(/,/g, ''))
  if (!Number.isFinite(value)) return { kind: 'invalid' }
  if (negative && value !== 0) return { kind: 'negative' }
  if (value > max) return { kind: 'toolarge' }
  return { kind: 'ok', value }
}

/** Plain digits for putting a stored number back into a text box ("2.5", never "1e-7"). */
export function formatNumberForInput(value: number): string {
  if (!Number.isFinite(value)) return ''
  return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 6 })
}

// ---------------------------------------------------------------------------
// Item form
// ---------------------------------------------------------------------------

/** Everything in the item form is held as text while the person is typing. */
export interface ItemDraft {
  name: string
  quantity: string
  unit: string
  unitCost: string
  sellingPrice: string
  notes: string
}

export type ItemField = 'name' | 'quantity' | 'unitCost' | 'sellingPrice'
export type ItemErrors = Partial<Record<ItemField, string>>

export function emptyItemDraft(): ItemDraft {
  return { name: '', quantity: '1', unit: '', unitCost: '', sellingPrice: '', notes: '' }
}

export function draftFromItem(item: Item): ItemDraft {
  return {
    name: item.name,
    quantity: formatNumberForInput(item.quantity),
    unit: item.unit ?? '',
    unitCost: formatNumberForInput(item.unitCost),
    sellingPrice: item.sellingPrice === undefined ? '' : formatNumberForInput(item.sellingPrice),
    notes: item.notes ?? '',
  }
}

function numberError(
  parsed: ParsedNumber,
  messages: { empty?: string; invalid: string; negative: string; toolarge: string },
): string | undefined {
  switch (parsed.kind) {
    case 'ok':
      return undefined
    case 'empty':
      return messages.empty
    case 'invalid':
      return messages.invalid
    case 'negative':
      return messages.negative
    case 'toolarge':
      return messages.toolarge
  }
}

export interface ItemValidation {
  errors: ItemErrors
  /** The cleaned-up values, or null while anything is still wrong. */
  values: ItemValues | null
}

export function validateItemDraft(draft: ItemDraft, type: GroupType): ItemValidation {
  const errors: ItemErrors = {}

  const name = draft.name.trim()
  if (!name) errors.name = 'Enter an item name.'
  else if (name.length > LIMITS.name) errors.name = `Keep the name under ${LIMITS.name} characters.`

  const quantity = parseNumberInput(draft.quantity, MAX_QUANTITY)
  const quantityError = numberError(quantity, {
    empty: 'Enter a quantity.',
    invalid: 'Enter a valid quantity.',
    negative: "Quantity can't be negative.",
    toolarge: 'That quantity is too large.',
  })
  if (quantityError) errors.quantity = quantityError

  const unitCost = parseNumberInput(draft.unitCost)
  const costError = numberError(unitCost, {
    empty: 'Enter a cost (use 0 if it’s free).',
    invalid: 'Enter a valid cost.',
    negative: "Cost can't be negative.",
    toolarge: 'That cost is too large.',
  })
  if (costError) errors.unitCost = costError

  // A missing selling price is a gentle hint, not an error (see `sellingPriceHint`).
  const sellingPrice = type === 'selling' ? parseNumberInput(draft.sellingPrice) : { kind: 'empty' as const }
  const priceError = numberError(sellingPrice, {
    invalid: 'Enter a valid selling price.',
    negative: "Selling price can't be negative.",
    toolarge: 'That price is too large.',
  })
  if (priceError) errors.sellingPrice = priceError

  if (Object.keys(errors).length > 0) return { errors, values: null }
  if (quantity.kind !== 'ok' || unitCost.kind !== 'ok') return { errors, values: null }

  const unit = draft.unit.trim().slice(0, LIMITS.unit)
  const notes = draft.notes.trim().slice(0, LIMITS.notes)
  const values: ItemValues = {
    name,
    quantity: quantity.value,
    unitCost: unitCost.value,
    ...(unit ? { unit } : {}),
    ...(notes ? { notes } : {}),
    ...(sellingPrice.kind === 'ok' ? { sellingPrice: sellingPrice.value } : {}),
  }
  return { errors, values }
}

/** Friendly nudge shown under the selling-price box while it's empty. */
export function sellingPriceHint(draft: ItemDraft, type: GroupType): string | null {
  if (type !== 'selling') return null
  return parseNumberInput(draft.sellingPrice).kind === 'empty'
    ? 'Enter a selling price to calculate potential revenue.'
    : null
}

/** Live totals for the form: anything not yet valid counts as 0. */
export function previewItemTotals(draft: ItemDraft, type: GroupType): ItemTotals {
  const read = (text: string, max: number) => {
    const parsed = parseNumberInput(text, max)
    return parsed.kind === 'ok' ? parsed.value : 0
  }
  const price = parseNumberInput(draft.sellingPrice)
  return calculateItem(
    {
      quantity: read(draft.quantity, MAX_QUANTITY),
      unitCost: read(draft.unitCost, MAX_AMOUNT),
      sellingPrice: price.kind === 'ok' ? price.value : undefined,
    },
    type,
  )
}

// ---------------------------------------------------------------------------
// Group and plan forms
// ---------------------------------------------------------------------------

export interface GroupErrors {
  name?: string
}

export function validateGroupInput(input: GroupInput): GroupErrors {
  const name = input.name.trim()
  if (!name) return { name: 'Give this group a name.' }
  if (name.length > LIMITS.name) return { name: `Keep the name under ${LIMITS.name} characters.` }
  return {}
}

export interface PlanDraft {
  name: string
  description: string
  currency: Currency
}

export interface PlanErrors {
  name?: string
  currency?: string
}

export interface PlanValidation {
  errors: PlanErrors
  values: PlanInput | null
}

export function validatePlanDraft(draft: PlanDraft): PlanValidation {
  const errors: PlanErrors = {}

  const name = draft.name.trim()
  if (!name) errors.name = 'Give your plan a name.'
  else if (name.length > LIMITS.name) errors.name = `Keep the name under ${LIMITS.name} characters.`

  const symbol = draft.currency.symbol.trim()
  if (draft.currency.code === CUSTOM_CURRENCY_CODE && !symbol) {
    errors.currency = 'Enter a currency symbol or code, like Le or FCFA.'
  }

  if (Object.keys(errors).length > 0) return { errors, values: null }

  const description = draft.description.trim().slice(0, LIMITS.description)
  return {
    errors,
    values: {
      name,
      ...(description ? { description } : {}),
      currency: { code: draft.currency.code, symbol: symbol || draft.currency.symbol },
    },
  }
}
