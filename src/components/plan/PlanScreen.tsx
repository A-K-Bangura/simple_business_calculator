import { useCallback, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Copy, Download, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { calculateGroup, calculatePlan } from '../../domain/calculationUtils'
import { formatMoney } from '../../domain/currencyUtils'
import { pluralize } from '../../domain/formatUtils'
import { SUGGESTED_GROUPS } from '../../domain/groupTypes'
import type { GroupInput } from '../../domain/types'
import { errorMessage } from '../../state/errorMessage'
import { usePlan, usePlansActions } from '../../state/plansContext'
import { navigateTo, planHref, plansHref } from '../../state/router'
import { useToast } from '../../state/toastContext'
import { useDocumentTitle } from '../../state/useDocumentTitle'
import { usePlanActions } from '../../state/usePlanActions'
import { downloadTextFile, exportFileName, serializeExport } from '../../storage/importExportUtils'
import { GroupDialog } from '../forms/GroupForm'
import { ItemDialog } from '../forms/ItemForm'
import { PlanDetailsDialog } from '../forms/PlanForm'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { OverflowMenu } from '../ui/OverflowMenu'
import { SaveIndicator } from '../ui/SaveIndicator'
import type { GroupHandlers } from './groupHandlers'
import { GroupSection } from './GroupSection'
import { PlanSummary } from './PlanSummary'
import { StickyTotal } from './StickyTotal'
import { useScrolledPast } from './useScrolledPast'

type PlanDialog =
  | { kind: 'editPlan' }
  | { kind: 'deletePlan' }
  | { kind: 'addGroup'; suggestion?: Partial<GroupInput> }
  | { kind: 'editGroup'; groupId: string }
  | { kind: 'deleteGroup'; groupId: string }
  | { kind: 'addItem'; groupId: string }
  | { kind: 'editItem'; groupId: string; itemId: string }

export function PlanScreen({ planId }: { planId: string }) {
  const plan = usePlan(planId)
  const actions = usePlansActions()
  const planActions = usePlanActions(planId)
  const toast = useToast()
  const [dialog, setDialog] = useState<PlanDialog | null>(null)
  const [leaving, setLeaving] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const scrolledPast = useScrolledPast(heroRef)
  useDocumentTitle(plan?.name)

  const groups = plan?.groups
  const totals = useMemo(() => (groups ? calculatePlan(groups) : null), [groups])
  const closeDialog = useCallback(() => setDialog(null), [])

  const handlers = useMemo<GroupHandlers>(
    () => ({
      onToggle: planActions.toggleGroup,
      onEditGroup: (groupId) => setDialog({ kind: 'editGroup', groupId }),
      onDeleteGroup: (groupId) => {
        const group = actions.getPlan(planId)?.groups.find((candidate) => candidate.id === groupId)
        if (!group) return
        // An empty group goes straight away (with Undo); one with items asks first.
        if (group.items.length === 0) planActions.deleteGroup(groupId)
        else setDialog({ kind: 'deleteGroup', groupId })
      },
      onMoveGroup: planActions.moveGroup,
      onAddItem: (groupId) => setDialog({ kind: 'addItem', groupId }),
      onEditItem: (groupId, itemId) => setDialog({ kind: 'editItem', groupId, itemId }),
      onDuplicateItem: planActions.duplicateItem,
      onDeleteItem: planActions.deleteItem,
    }),
    [planActions, actions, planId],
  )

  if (leaving) return null
  if (!plan || !totals) return <PlanNotFound />

  async function duplicatePlan() {
    try {
      const copy = await actions.duplicatePlan(planId)
      navigateTo(planHref(copy.id))
      toast.show({ message: `Duplicated. You’re now in “${copy.name}”.` })
    } catch (error) {
      toast.show({ tone: 'error', message: errorMessage(error) })
    }
  }

  async function deletePlan() {
    if (!plan) return
    const { name } = plan
    closeDialog()
    setLeaving(true)
    navigateTo(plansHref, { replace: true })
    try {
      await actions.deletePlan(planId)
      toast.show({ message: `“${name}” deleted.` })
    } catch (error) {
      toast.show({ tone: 'error', message: errorMessage(error) })
    }
  }

  const dialogGroup = dialog && 'groupId' in dialog ? plan.groups.find((group) => group.id === dialog.groupId) : undefined
  const dialogItem =
    dialog?.kind === 'editItem' ? dialogGroup?.items.find((item) => item.id === dialog.itemId) : undefined
  const addGroup = () => setDialog({ kind: 'addGroup' })

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-3 sm:px-6">
      <StickyTotal visible={scrolledPast} planName={plan.name} amount={formatMoney(totals.totalStartupCost, plan.currency)} />

      <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-2">
        <a
          href={plansHref}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-medium text-stone-700 hover:bg-stone-200/60"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Plans
        </a>
        <div className="flex items-center gap-1">
          <SaveIndicator />
          <OverflowMenu
            label="Plan options"
            items={[
              { label: 'Edit details', icon: <Pencil />, onSelect: () => setDialog({ kind: 'editPlan' }) },
              { label: 'Duplicate plan', icon: <Copy />, onSelect: duplicatePlan },
              {
                label: 'Export as file',
                icon: <Download />,
                onSelect: () => downloadTextFile(exportFileName([plan]), serializeExport([plan])),
              },
              { label: 'Delete plan', icon: <Trash2 />, tone: 'danger', onSelect: () => setDialog({ kind: 'deletePlan' }) },
            ]}
          />
        </div>
      </nav>

      <header className="mt-2">
        <h1 className="text-balance wrap-anywhere text-3xl font-bold tracking-tight sm:text-4xl">{plan.name}</h1>
        {plan.description && <p className="mt-1 wrap-anywhere text-stone-600">{plan.description}</p>}
      </header>

      <PlanSummary totals={totals} currency={plan.currency} heroRef={heroRef} />

      <section aria-labelledby="groups-heading" className="mt-8">
        {plan.groups.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="groups-heading" className="text-xl font-semibold tracking-tight">
              Your groups
            </h2>
            <Button variant="secondary" onClick={addGroup}>
              <Plus className="size-5" aria-hidden />
              Add group
            </Button>
          </div>
        )}

        {plan.groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white">
            <EmptyState
              icon={<Layers />}
              title="What will it take to get started?"
              description="Create your first group and start adding what your business needs."
            >
              <Button onClick={addGroup} className="min-h-12 w-full max-w-xs text-lg">
                <Plus className="size-5" aria-hidden />
                Add your first group
              </Button>
              <div className="w-full">
                <p id="groups-heading" className="mb-2 text-sm text-stone-600">
                  Or start with an idea:
                </p>
                <ul className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_GROUPS.map((suggestion) => (
                    <li key={suggestion.name}>
                      <Button variant="secondary" onClick={() => setDialog({ kind: 'addGroup', suggestion })}>
                        <Plus className="size-4" aria-hidden />
                        {suggestion.name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {plan.groups.map((group, index) => (
                <GroupSection
                  key={group.id}
                  group={group}
                  currency={plan.currency}
                  isFirst={index === 0}
                  isLast={index === plan.groups.length - 1}
                  handlers={handlers}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addGroup}
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 text-base font-semibold text-stone-700 transition-colors hover:border-accent-600 hover:bg-accent-50 hover:text-accent-800"
            >
              <Plus className="size-5" aria-hidden />
              Add group
            </button>
          </>
        )}
      </section>

      {dialog?.kind === 'editPlan' && (
        <PlanDetailsDialog
          plan={plan}
          defaultCurrency={plan.currency}
          onClose={closeDialog}
          onSubmit={(input) => {
            planActions.updateDetails(input)
            closeDialog()
          }}
        />
      )}

      {dialog?.kind === 'deletePlan' && (
        <ConfirmDialog title={`Delete “${plan.name}”?`} confirmLabel="Delete plan" onCancel={closeDialog} onConfirm={deletePlan}>
          <p>This plan and everything in it will be removed from this device. This can’t be undone.</p>
          <p className="text-sm text-stone-600">Tip: you can export it as a file first to keep a copy.</p>
        </ConfirmDialog>
      )}

      {dialog?.kind === 'addGroup' && (
        <GroupDialog
          suggestion={dialog.suggestion}
          onClose={closeDialog}
          onSubmit={(input) => {
            planActions.addGroup(input)
            closeDialog()
          }}
        />
      )}

      {dialog?.kind === 'editGroup' && dialogGroup && (
        <GroupDialog
          group={dialogGroup}
          onClose={closeDialog}
          onSubmit={(input) => {
            planActions.updateGroup(dialogGroup.id, input)
            closeDialog()
          }}
        />
      )}

      {dialog?.kind === 'deleteGroup' && dialogGroup && (
        <ConfirmDialog
          title={`Delete “${dialogGroup.name}”?`}
          confirmLabel="Delete group"
          onCancel={closeDialog}
          onConfirm={() => {
            planActions.deleteGroup(dialogGroup.id)
            closeDialog()
          }}
        >
          <p>
            This removes the group and its {pluralize(dialogGroup.items.length, 'item')}, worth{' '}
            {formatMoney(calculateGroup(dialogGroup).cost, plan.currency)} in costs.
          </p>
          <p className="text-sm text-stone-600">You’ll have a few seconds to undo it afterwards.</p>
        </ConfirmDialog>
      )}

      {dialog?.kind === 'addItem' && dialogGroup && (
        <ItemDialog
          groupName={dialogGroup.name}
          groupType={dialogGroup.type}
          currency={plan.currency}
          onClose={closeDialog}
          onSubmit={(values, { addAnother }) => {
            planActions.addItem(dialogGroup.id, values)
            if (!addAnother) closeDialog()
          }}
        />
      )}

      {dialog?.kind === 'editItem' && dialogGroup && dialogItem && (
        <ItemDialog
          groupName={dialogGroup.name}
          groupType={dialogGroup.type}
          currency={plan.currency}
          item={dialogItem}
          onClose={closeDialog}
          onSubmit={(values) => {
            planActions.updateItem(dialogGroup.id, dialogItem.id, values)
            closeDialog()
          }}
        />
      )}
    </div>
  )
}

function PlanNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-3 sm:px-6">
      <EmptyState
        headingLevel={1}
        icon={<Layers />}
        title="We can’t find that plan"
        description="It may have been deleted, or the link may be out of date."
      >
        <a
          href={plansHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-700 px-4 text-base font-semibold text-white hover:bg-accent-800"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Back to your plans
        </a>
      </EmptyState>
    </div>
  )
}
