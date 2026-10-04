import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { BusinessPlan } from '../domain/types'
import { planRepository, type PlanRepository } from '../storage/planRepository'
import { StorageError } from '../storage/schema'
import {
  PlansActionsContext,
  PlansDataContext,
  SaveStatusContext,
  type PlansActions,
  type PlansData,
  type SaveStatus,
} from './plansContext'

/** How long to wait after the last edit before writing to storage. */
const SAVE_DELAY_MS = 300

interface Props {
  repository?: PlanRepository
  children: ReactNode
}

/**
 * Holds every plan in memory and keeps storage in step with it.
 *
 * Edits apply to memory instantly (so the UI never waits) and are written to
 * storage after a short pause. Anything still waiting is written immediately
 * when the tab is hidden or closed.
 */
export function PlansProvider({ repository = planRepository, children }: Props) {
  const [status, setStatus] = useState<PlansData['status']>('loading')
  const [plans, setPlans] = useState<readonly BusinessPlan[]>([])
  const [error, setError] = useState<StorageError | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  // The ref is the source of truth so several edits in one tick compose correctly.
  const plansRef = useRef<readonly BusinessPlan[]>([])
  const timers = useRef(new Map<string, number>())

  const commit = useCallback((next: readonly BusinessPlan[]) => {
    plansRef.current = next
    setPlans(next)
  }, [])

  const persist = useCallback(
    (id: string) => {
      const timer = timers.current.get(id)
      if (timer !== undefined) window.clearTimeout(timer)
      timers.current.delete(id)

      const plan = plansRef.current.find((candidate) => candidate.id === id)
      if (!plan) return
      repository
        .updatePlan(plan)
        .then(() => setSaveStatus((current) => (timers.current.size === 0 ? 'saved' : current)))
        .catch(() => setSaveStatus('error'))
    },
    [repository],
  )

  const flush = useCallback(() => {
    for (const id of [...timers.current.keys()]) persist(id)
  }, [persist])

  const fetchPlans = useCallback(() => {
    repository
      .getPlans()
      .then((loaded) => {
        commit(loaded)
        setError(null)
        setStatus('ready')
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof StorageError
            ? cause
            : new StorageError('corrupt', 'Your saved plans could not be opened.'),
        )
        setStatus('error')
      })
  }, [repository, commit])

  const load = useCallback(() => {
    setStatus('loading')
    fetchPlans()
  }, [fetchPlans])

  // The first load starts from the initial 'loading' status; only a retry needs to set it again.
  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [flush])

  const actions = useMemo<PlansActions>(
    () => ({
      async createPlan(input) {
        const plan = await repository.createPlan(input)
        commit([plan, ...plansRef.current])
        return plan
      },

      editPlan(id, update, options) {
        const current = plansRef.current.find((plan) => plan.id === id)
        if (!current) return
        const changed = update(current)
        if (changed === current) return

        const next = options?.touch === false ? changed : { ...changed, updatedAt: new Date().toISOString() }
        commit(plansRef.current.map((plan) => (plan.id === id ? next : plan)))

        const existing = timers.current.get(id)
        if (existing !== undefined) window.clearTimeout(existing)
        timers.current.set(id, window.setTimeout(() => persist(id), SAVE_DELAY_MS))
        setSaveStatus('saving')
      },

      getPlan: (id) => plansRef.current.find((plan) => plan.id === id),

      async deletePlan(id) {
        // A save still waiting for this plan must not bring it back to life.
        const timer = timers.current.get(id)
        if (timer !== undefined) window.clearTimeout(timer)
        timers.current.delete(id)

        await repository.deletePlan(id)
        commit(plansRef.current.filter((plan) => plan.id !== id))
      },

      async duplicatePlan(id) {
        // Save the latest edits first so the copy includes them.
        persist(id)
        const copy = await repository.duplicatePlan(id)
        commit([copy, ...plansRef.current])
        return copy
      },

      async importPlans(incoming) {
        const added = await repository.importPlans(incoming)
        commit([...added, ...plansRef.current])
        return added
      },

      retryLoad: load,

      async startFresh() {
        await repository.backupAndReset()
        load()
      },
    }),
    [repository, commit, persist, load],
  )

  const data = useMemo<PlansData>(() => ({ status, plans, error }), [status, plans, error])

  return (
    <PlansActionsContext.Provider value={actions}>
      <SaveStatusContext.Provider value={saveStatus}>
        <PlansDataContext.Provider value={data}>{children}</PlansDataContext.Provider>
      </SaveStatusContext.Provider>
    </PlansActionsContext.Provider>
  )
}
