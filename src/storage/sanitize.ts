import { DEFAULT_CURRENCY, findPresetByCode } from '../domain/currencyUtils'
import { createId } from '../domain/idUtils'
import { MAX_AMOUNT, MAX_QUANTITY } from '../domain/moneyUtils'
import { normalizeOrder } from '../domain/planOperations'
import { LIMITS } from '../domain/validationUtils'
import type { BusinessPlan, Currency, Group, GroupType, Item } from '../domain/types'

/**
 * Turns untrusted data (old local storage, a file someone imported) into a
 * valid plan, or null if it clearly isn't one. Bad values are repaired or
 * dropped instead of being allowed to crash the UI.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanNumber(value: unknown, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, 0), max) : 0
}

function cleanOptionalNumber(value: unknown, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, 0), max) : undefined
}

function cleanDate(value: unknown, fallback: string): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback
}

/** Keep a stored id if it's usable and unique within its plan; otherwise mint one. */
function cleanId(value: unknown, used: Set<string>): string {
  const id = typeof value === 'string' && value.length > 0 && value.length <= 100 ? value : createId()
  const unique = used.has(id) ? createId() : id
  used.add(unique)
  return unique
}

function cleanCurrency(value: unknown): Currency {
  if (!isRecord(value)) return DEFAULT_CURRENCY
  const code = cleanText(value.code, 8)
  const symbol = cleanText(value.symbol, LIMITS.currencySymbol)
  const preset = findPresetByCode(code)
  if (symbol) return { code: code || 'CUSTOM', symbol }
  return preset ? { code: preset.code, symbol: preset.symbol } : DEFAULT_CURRENCY
}

function cleanItem(raw: unknown, usedIds: Set<string>): Item | null {
  if (!isRecord(raw)) return null
  const unit = cleanText(raw.unit, LIMITS.unit)
  const notes = cleanText(raw.notes, LIMITS.notes)
  const sellingPrice = cleanOptionalNumber(raw.sellingPrice, MAX_AMOUNT)
  return {
    id: cleanId(raw.id, usedIds),
    name: cleanText(raw.name, LIMITS.name) || 'Untitled item',
    quantity: cleanNumber(raw.quantity, MAX_QUANTITY),
    unitCost: cleanNumber(raw.unitCost, MAX_AMOUNT),
    ...(unit ? { unit } : {}),
    ...(sellingPrice !== undefined ? { sellingPrice } : {}),
    ...(notes ? { notes } : {}),
  }
}

function cleanGroup(raw: unknown, usedGroupIds: Set<string>): Group | null {
  if (!isRecord(raw)) return null
  const type: GroupType = raw.type === 'selling' ? 'selling' : 'expense'
  const usedItemIds = new Set<string>()
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((item) => cleanItem(item, usedItemIds))
    .filter((item): item is Item => item !== null)

  return {
    id: cleanId(raw.id, usedGroupIds),
    name: cleanText(raw.name, LIMITS.name) || 'Untitled group',
    type,
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : 0,
    ...(raw.collapsed === true ? { collapsed: true } : {}),
    items,
  }
}

export function sanitizePlan(raw: unknown): BusinessPlan | null {
  if (!isRecord(raw) || typeof raw.name !== 'string') return null

  const now = new Date().toISOString()
  const createdAt = cleanDate(raw.createdAt, now)
  const description = cleanText(raw.description, LIMITS.description)

  const usedGroupIds = new Set<string>()
  const groups = (Array.isArray(raw.groups) ? raw.groups : [])
    .map((group) => cleanGroup(group, usedGroupIds))
    .filter((group): group is Group => group !== null)
    // Array.prototype.sort is stable, so groups with equal `order` keep their file order.
    .sort((a, b) => a.order - b.order)

  return {
    id: cleanId(raw.id, new Set()),
    name: cleanText(raw.name, LIMITS.name) || 'Untitled plan',
    ...(description ? { description } : {}),
    currency: cleanCurrency(raw.currency),
    groups: normalizeOrder(groups),
    createdAt,
    updatedAt: cleanDate(raw.updatedAt, createdAt),
  }
}

export function sanitizePlans(rawPlans: readonly unknown[]): { plans: BusinessPlan[]; skipped: number } {
  const plans = rawPlans.map(sanitizePlan).filter((plan): plan is BusinessPlan => plan !== null)
  return { plans, skipped: rawPlans.length - plans.length }
}
