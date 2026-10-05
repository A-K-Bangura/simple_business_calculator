import { memo, useMemo } from 'react'
import { Copy, Download, Pencil, Trash2 } from 'lucide-react'
import { calculatePlan } from '../../domain/calculationUtils'
import { formatRelativeTime, pluralize } from '../../domain/formatUtils'
import type { BusinessPlan } from '../../domain/types'
import { planHref } from '../../state/router'
import { OverflowMenu } from '../ui/OverflowMenu'
import { AmountText } from '../plan/AmountText'

interface PlanCardProps {
  plan: BusinessPlan
  onEdit: (planId: string) => void
  onDuplicate: (planId: string) => void
  onExport: (planId: string) => void
  onDelete: (planId: string) => void
}

export const PlanCard = memo(function PlanCard({ plan, onEdit, onDuplicate, onExport, onDelete }: PlanCardProps) {
  const totals = useMemo(() => calculatePlan(plan.groups), [plan.groups])

  return (
    <article className="relative flex flex-col rounded-2xl border border-stone-200 bg-white p-5 transition-colors focus-within:border-accent-600 hover:border-accent-600/60">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 wrap-anywhere text-lg font-semibold leading-snug">
          <a
            href={planHref(plan.id)}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent-600"
          >
            {plan.name}
          </a>
        </h2>
        <OverflowMenu
          label={`More actions for ${plan.name}`}
          className="relative z-10 -mr-2 -mt-2"
          items={[
            { label: 'Edit details', icon: <Pencil />, onSelect: () => onEdit(plan.id) },
            { label: 'Duplicate', icon: <Copy />, onSelect: () => onDuplicate(plan.id) },
            { label: 'Export as file', icon: <Download />, onSelect: () => onExport(plan.id) },
            { label: 'Delete', icon: <Trash2 />, tone: 'danger', onSelect: () => onDelete(plan.id) },
          ]}
        />
      </div>

      {plan.description && <p className="mt-1 line-clamp-2 wrap-anywhere text-sm text-stone-600">{plan.description}</p>}

      <div className="mt-4">
        <p className="text-xs text-stone-500">Estimated startup cost</p>
        <p className="wrap-anywhere text-2xl font-bold leading-tight">
          <AmountText value={totals.totalStartupCost} currency={plan.currency} />
        </p>
        {totals.hasSellingGroups && (
          <p className="mt-1 text-sm text-stone-600">
            Potential profit <AmountText value={totals.grossProfit} currency={plan.currency} tone="result" className="font-semibold" />
          </p>
        )}
      </div>

      <p className="mt-4 text-sm text-stone-500">
        {pluralize(totals.groupCount, 'group')} · {pluralize(totals.itemCount, 'item')} · Updated {formatRelativeTime(plan.updatedAt)}
      </p>
    </article>
  )
})
