import { createContext, useContext } from 'react'
import type { BusinessPlan, PlanInput } from '../domain/types'
import type { StorageError } from '../storage/schema'

export interface PlansData {
  status: 'loading' | 'ready' | 'error'
  plans: readonly BusinessPlan[]
  error: StorageError | null
}

export type SaveStatus = 'saved' | 'saving' | 'error'

export interface EditOptions {
  /** Set false for cosmetic edits (like collapsing a group) that shouldn't change "last updated". */
  touch?: boolean
}

export interface PlansActions {
  createPlan(input: PlanInput): Promise<BusinessPlan>
  /** Applies an edit immediately in memory and saves it shortly after. */
  editPlan(id: string, update: (plan: BusinessPlan) => BusinessPlan, options?: EditOptions): void
  /** The latest version of a plan, including edits that haven't finished saving. */
  getPlan(id: string): BusinessPlan | undefined
  deletePlan(id: string): Promise<void>
  duplicatePlan(id: string): Promise<BusinessPlan>
  importPlans(plans: readonly BusinessPlan[]): Promise<BusinessPlan[]>
  retryLoad(): void
  startFresh(): Promise<void>
}

export const PlansDataContext = createContext<PlansData | null>(null)
export const SaveStatusContext = createContext<SaveStatus>('saved')
export const PlansActionsContext = createContext<PlansActions | null>(null)

function required<T>(value: T | null, hook: string): T {
  if (value === null) throw new Error(`${hook} must be used inside <PlansProvider>`)
  return value
}

export const usePlansData = (): PlansData => required(useContext(PlansDataContext), 'usePlansData')
export const usePlansActions = (): PlansActions => required(useContext(PlansActionsContext), 'usePlansActions')
export const useSaveStatus = (): SaveStatus => useContext(SaveStatusContext)

export function usePlan(id: string): BusinessPlan | undefined {
  return usePlansData().plans.find((plan) => plan.id === id)
}
