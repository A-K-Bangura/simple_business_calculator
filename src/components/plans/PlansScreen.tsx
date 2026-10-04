import { useCallback, useMemo, useState } from 'react'
import { Archive, Download, FileUp, FlaskConical, Plus, Sparkles } from 'lucide-react'
import { DEFAULT_CURRENCY } from '../../domain/currencyUtils'
import { createDemoPlan } from '../../domain/demoPlan'
import { updatePlanDetails } from '../../domain/planOperations'
import type { PlanInput } from '../../domain/types'
import { errorMessage } from '../../state/errorMessage'
import { usePlansActions, usePlansData } from '../../state/plansContext'
import { navigateTo, planHref } from '../../state/router'
import { useToast } from '../../state/toastContext'
import { useDocumentTitle } from '../../state/useDocumentTitle'
import { downloadTextFile, exportFileName, serializeExport } from '../../storage/importExportUtils'
import { Brand } from '../Brand'
import { PlanDetailsDialog } from '../forms/PlanForm'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { OverflowMenu } from '../ui/OverflowMenu'
import { PlanCard } from './PlanCard'
import { usePlanImport } from './usePlanImport'

type PlansDialog = { kind: 'create' } | { kind: 'edit'; planId: string } | { kind: 'delete'; planId: string }

export function PlansScreen() {
  const { plans } = usePlansData()
  const actions = usePlansActions()
  const toast = useToast()
  const { pick: pickImportFile, input: importInput } = usePlanImport()
  const [dialog, setDialog] = useState<PlansDialog | null>(null)
  useDocumentTitle()

  const sorted = useMemo(() => [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [plans])
  const closeDialog = useCallback(() => setDialog(null), [])
  const fail = useCallback((error: unknown) => toast.show({ tone: 'error', message: errorMessage(error) }), [toast])

  const handleEdit = useCallback((planId: string) => setDialog({ kind: 'edit', planId }), [])
  const handleDelete = useCallback((planId: string) => setDialog({ kind: 'delete', planId }), [])
  const handleDuplicate = useCallback(
    async (planId: string) => {
      try {
        const copy = await actions.duplicatePlan(planId)
        toast.show({ message: `Duplicated as “${copy.name}”.` })
      } catch (error) {
        fail(error)
      }
    },
    [actions, toast, fail],
  )
  const handleExport = useCallback(
    (planId: string) => {
      const plan = actions.getPlan(planId)
      if (plan) downloadTextFile(exportFileName([plan]), serializeExport([plan]))
    },
    [actions],
  )

  async function createPlan(input: PlanInput) {
    try {
      const plan = await actions.createPlan(input)
      closeDialog()
      navigateTo(planHref(plan.id))
    } catch (error) {
      fail(error)
    }
  }

  async function addExample() {
    try {
      const [plan] = await actions.importPlans([createDemoPlan()])
      navigateTo(planHref(plan.id))
    } catch (error) {
      fail(error)
    }
  }

  async function confirmDelete(planId: string) {
    const plan = actions.getPlan(planId)
    closeDialog()
    try {
      await actions.deletePlan(planId)
      if (plan) toast.show({ message: `“${plan.name}” deleted.` })
    } catch (error) {
      fail(error)
    }
  }

  const editing = dialog?.kind === 'edit' ? actions.getPlan(dialog.planId) : undefined
  const deleting = dialog?.kind === 'delete' ? actions.getPlan(dialog.planId) : undefined
  const defaultCurrency = sorted[0]?.currency ?? DEFAULT_CURRENCY

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-3 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <Brand />
        {sorted.length > 0 && (
          <OverflowMenu
            label="Backup and restore"
            items={[
              {
                label: 'Export all plans',
                icon: <Download />,
                onSelect: () => downloadTextFile(exportFileName(sorted), serializeExport(sorted)),
              },
              { label: 'Import from a file', icon: <FileUp />, onSelect: pickImportFile },
            ]}
          />
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          headingLevel={1}
          icon={<Sparkles />}
          title="Planning a business?"
          description="Create a simple plan, list what you’ll need, and we’ll do the maths."
        >
          <Button onClick={() => setDialog({ kind: 'create' })} className="min-h-12 w-full max-w-xs text-lg">
            <Plus className="size-5" aria-hidden />
            Create your first plan
          </Button>
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
            <Button variant="ghost" onClick={addExample}>
              <FlaskConical className="size-4" aria-hidden />
              Try an example plan
            </Button>
            <Button variant="ghost" onClick={pickImportFile}>
              <Archive className="size-4" aria-hidden />
              Import a backup
            </Button>
          </div>
          <p className="max-w-xs text-sm text-stone-500">Everything stays on this device. There’s nothing to sign up for.</p>
        </EmptyState>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Business Plans</h1>
              <p className="mt-1 text-stone-600">Plan your startup costs and see what your business could make.</p>
            </div>
            <Button onClick={() => setDialog({ kind: 'create' })}>
              <Plus className="size-5" aria-hidden />
              New Plan
            </Button>
          </div>

          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((plan) => (
              <li key={plan.id} className="contents">
                <PlanCard
                  plan={plan}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onExport={handleExport}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {importInput}

      {dialog?.kind === 'create' && (
        <PlanDetailsDialog defaultCurrency={defaultCurrency} onSubmit={createPlan} onClose={closeDialog} />
      )}
      {editing && (
        <PlanDetailsDialog
          plan={editing}
          defaultCurrency={defaultCurrency}
          onClose={closeDialog}
          onSubmit={(input) => {
            actions.editPlan(editing.id, (plan) => updatePlanDetails(plan, input))
            closeDialog()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          confirmLabel="Delete plan"
          onCancel={closeDialog}
          onConfirm={() => confirmDelete(deleting.id)}
        >
          <p>This plan and everything in it will be removed from this device. This can’t be undone.</p>
          <p className="text-sm text-stone-600">Tip: you can export it as a file first to keep a copy.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
