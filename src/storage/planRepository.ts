import type { BusinessPlan, PlanInput } from '../domain/types'
import { LIMITS } from '../domain/validationUtils'
import { cloneWithNewIds, createPlanData } from '../domain/planOperations'
import { createBrowserStore, type KeyValueStore } from './keyValueStore'
import { sanitizePlans } from './sanitize'
import { APP_ID, CURRENT_SCHEMA_VERSION, readEnvelope, StorageError } from './schema'

export const STORAGE_KEY = 'startup-business-calculator'

/**
 * Everything the UI needs from storage. The methods are async on purpose: the
 * local implementation below is instant, but an API-backed one can replace it
 * without touching any component.
 */
export interface PlanRepository {
  /** Newest-updated first. */
  getPlans(): Promise<BusinessPlan[]>
  getPlan(id: string): Promise<BusinessPlan | undefined>
  createPlan(input: PlanInput): Promise<BusinessPlan>
  /** Saves the plan as given (adds it if it isn't stored yet). */
  updatePlan(plan: BusinessPlan): Promise<BusinessPlan>
  deletePlan(id: string): Promise<void>
  duplicatePlan(id: string): Promise<BusinessPlan>
  /** Adds plans from a backup, giving any plan whose id is already taken a fresh id. */
  importPlans(plans: readonly BusinessPlan[]): Promise<BusinessPlan[]>
  /** Keeps a copy of unreadable data under another key, then clears the way for a fresh start. */
  backupAndReset(): Promise<void>
}

export function createPlanRepository(store: KeyValueStore): PlanRepository {
  /**
   * Each call reads straight from the store (never a cache), so two tabs can't
   * overwrite each other's plans with a stale copy.
   *
   * Note for `updatePlan`: everything up to the first `await` runs
   * synchronously, so a save triggered while the page is closing still lands.
   */
  function readAll(): BusinessPlan[] {
    const raw = store.getItem(STORAGE_KEY)
    if (raw === null) return []

    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      throw new StorageError('corrupt', 'The saved plans could not be read.')
    }
    return sanitizePlans(readEnvelope(json).plans).plans
  }

  function writeAll(plans: readonly BusinessPlan[]): void {
    try {
      store.setItem(
        STORAGE_KEY,
        JSON.stringify({ app: APP_ID, schemaVersion: CURRENT_SCHEMA_VERSION, plans }),
      )
    } catch {
      throw new StorageError(
        'write-failed',
        'Your browser wouldn’t let us save. Storage may be full or blocked.',
      )
    }
  }

  return {
    async getPlans() {
      return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },

    async getPlan(id) {
      return readAll().find((plan) => plan.id === id)
    },

    async createPlan(input) {
      const plan = createPlanData(input)
      writeAll([plan, ...readAll()])
      return plan
    },

    async updatePlan(plan) {
      const plans = readAll()
      const exists = plans.some((stored) => stored.id === plan.id)
      writeAll(exists ? plans.map((stored) => (stored.id === plan.id ? plan : stored)) : [plan, ...plans])
      return plan
    },

    async deletePlan(id) {
      const plans = readAll()
      if (plans.some((plan) => plan.id === id)) writeAll(plans.filter((plan) => plan.id !== id))
    },

    async duplicatePlan(id) {
      const plans = readAll()
      const original = plans.find((plan) => plan.id === id)
      if (!original) throw new StorageError('corrupt', 'That plan no longer exists.')

      const now = new Date().toISOString()
      const copy = cloneWithNewIds(original, {
        name: `${original.name} (copy)`.slice(0, LIMITS.name),
        createdAt: now,
        updatedAt: now,
      })
      writeAll([copy, ...plans])
      return copy
    },

    async importPlans(incoming) {
      const existing = readAll()
      const takenIds = new Set(existing.map((plan) => plan.id))

      const added = incoming.map((plan) => {
        if (!takenIds.has(plan.id)) {
          takenIds.add(plan.id)
          return plan
        }
        const renamed = cloneWithNewIds(plan, { name: `${plan.name} (imported)`.slice(0, LIMITS.name) })
        takenIds.add(renamed.id)
        return renamed
      })

      writeAll([...added, ...existing])
      return added
    },

    async backupAndReset() {
      const raw = store.getItem(STORAGE_KEY)
      if (raw !== null) {
        try {
          store.setItem(`${STORAGE_KEY}.backup-${Date.now()}`, raw)
        } catch {
          // If even the backup can't be saved we still let the person start over.
        }
      }
      store.removeItem(STORAGE_KEY)
    },
  }
}

/** The repository the app uses: plans saved in this browser. */
export const planRepository: PlanRepository = createPlanRepository(createBrowserStore())
