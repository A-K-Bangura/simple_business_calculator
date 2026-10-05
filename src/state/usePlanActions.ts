import { useMemo } from 'react'
import {
  addGroup,
  addItem,
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
} from '../domain/planOperations'
import type { GroupInput, ItemValues, PlanInput } from '../domain/types'
import { usePlansActions } from './plansContext'
import { useToast } from './toastContext'

/**
 * Everything a person can do inside one plan, as stable callbacks.
 * Deleting offers an Undo instead of asking "are you sure?" for every item.
 */
export function usePlanActions(planId: string) {
  const { editPlan, getPlan } = usePlansActions()
  const toast = useToast()

  return useMemo(
    () => ({
      updateDetails: (input: PlanInput) => editPlan(planId, (plan) => updatePlanDetails(plan, input)),

      addGroup: (input: GroupInput) => editPlan(planId, (plan) => addGroup(plan, input)),

      updateGroup: (groupId: string, input: GroupInput) =>
        editPlan(planId, (plan) => updateGroup(plan, groupId, input)),

      toggleGroup: (groupId: string) => {
        const group = getPlan(planId)?.groups.find((candidate) => candidate.id === groupId)
        if (!group) return
        editPlan(planId, (plan) => setGroupCollapsed(plan, groupId, !group.collapsed), { touch: false })
      },

      moveGroup: (groupId: string, offset: -1 | 1) =>
        editPlan(planId, (plan) => moveGroup(plan, groupId, offset)),

      deleteGroup: (groupId: string) => {
        const plan = getPlan(planId)
        const index = plan?.groups.findIndex((group) => group.id === groupId) ?? -1
        const group = plan?.groups[index]
        if (!group) return
        editPlan(planId, (current) => removeGroup(current, groupId))
        toast.show({
          message: `“${group.name}” deleted.`,
          actionLabel: 'Undo',
          onAction: () => editPlan(planId, (current) => restoreGroup(current, group, index)),
        })
      },

      addItem: (groupId: string, values: ItemValues) =>
        editPlan(planId, (plan) => addItem(plan, groupId, values)),

      updateItem: (groupId: string, itemId: string, values: ItemValues) =>
        editPlan(planId, (plan) => updateItem(plan, groupId, itemId, values)),

      duplicateItem: (groupId: string, itemId: string) =>
        editPlan(planId, (plan) => duplicateItem(plan, groupId, itemId)),

      deleteItem: (groupId: string, itemId: string) => {
        const items = getPlan(planId)?.groups.find((group) => group.id === groupId)?.items ?? []
        const index = items.findIndex((item) => item.id === itemId)
        const item = items[index]
        if (!item) return
        editPlan(planId, (plan) => removeItem(plan, groupId, itemId))
        toast.show({
          message: `“${item.name}” deleted.`,
          actionLabel: 'Undo',
          onAction: () => editPlan(planId, (plan) => restoreItem(plan, groupId, item, index)),
        })
      },
    }),
    [planId, editPlan, getPlan, toast],
  )
}

export type PlanActions = ReturnType<typeof usePlanActions>
