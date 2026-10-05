import { memo, useId, useMemo } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { calculateGroup } from '../../domain/calculationUtils'
import { GROUP_TYPES } from '../../domain/groupTypes'
import { pluralize } from '../../domain/formatUtils'
import type { Currency, Group } from '../../domain/types'
import { cn } from '../ui/classNames'
import { OverflowMenu } from '../ui/OverflowMenu'
import { AmountText } from './AmountText'
import type { GroupHandlers } from './groupHandlers'
import { ItemRow } from './ItemRow'

interface GroupSectionProps {
  group: Group
  currency: Currency
  isFirst: boolean
  isLast: boolean
  handlers: GroupHandlers
}

export const GroupSection = memo(function GroupSection({ group, currency, isFirst, isLast, handlers }: GroupSectionProps) {
  const bodyId = useId()
  const totals = useMemo(() => calculateGroup(group), [group])
  const selling = group.type === 'selling'
  const expanded = !group.collapsed

  return (
    <section className="rounded-2xl border border-stone-200 bg-white">
      <header className="relative flex items-start gap-1 py-2 pl-4 pr-1.5 sm:py-3">
        <div className="min-w-0 flex-1 py-1">
          <h3 className="text-lg font-semibold leading-snug">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={bodyId}
              onClick={() => handlers.onToggle(group.id)}
              className="flex items-start gap-2 text-left after:absolute after:inset-0 focus-visible:after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-accent-600"
            >
              <ChevronDown
                aria-hidden
                className={cn('mt-1 size-5 shrink-0 text-stone-500 transition-transform', !expanded && '-rotate-90')}
              />
              <span className="wrap-anywhere">{group.name}</span>
            </button>
          </h3>
          <p className="ml-7 text-sm text-stone-600">
            {pluralize(totals.itemCount, 'item')} · {GROUP_TYPES[group.type].label}
          </p>
          {selling && totals.itemCount > 0 && (
            <p className="ml-7 mt-0.5 text-sm text-stone-600">
              Revenue <AmountText value={totals.revenue} currency={currency} className="font-medium text-stone-800" /> · Profit{' '}
              <AmountText value={totals.profit} currency={currency} tone="result" className="font-medium" />
            </p>
          )}
        </div>

        <div className="min-w-0 max-w-[55%] py-1 text-right">
          <p className="wrap-anywhere text-xl font-bold leading-snug">
            <AmountText value={totals.cost} currency={currency} />
          </p>
          <p className="text-xs text-stone-500">{selling ? 'cost' : 'total'}</p>
        </div>

        <OverflowMenu
          label={`More actions for ${group.name}`}
          className="relative z-10"
          items={[
            { label: 'Edit group', icon: <Pencil />, onSelect: () => handlers.onEditGroup(group.id) },
            { label: 'Move up', icon: <ArrowUp />, disabled: isFirst, onSelect: () => handlers.onMoveGroup(group.id, -1) },
            { label: 'Move down', icon: <ArrowDown />, disabled: isLast, onSelect: () => handlers.onMoveGroup(group.id, 1) },
            { label: 'Delete group', icon: <Trash2 />, tone: 'danger', onSelect: () => handlers.onDeleteGroup(group.id) },
          ]}
        />
      </header>

      {expanded && (
        <div id={bodyId} className="border-t border-stone-200">
          {group.items.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {group.items.map((item) => (
                <ItemRow
                  key={item.id}
                  groupId={group.id}
                  item={item}
                  groupType={group.type}
                  currency={currency}
                  handlers={handlers}
                />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-stone-600">Nothing here yet.</p>
          )}
          <button
            type="button"
            onClick={() => handlers.onAddItem(group.id)}
            className={cn(
              'flex min-h-12 w-full items-center gap-2 rounded-b-2xl px-4 text-base font-semibold text-accent-700 transition-colors hover:bg-accent-50',
              group.items.length > 0 && 'border-t border-stone-100',
            )}
          >
            <Plus className="size-5" aria-hidden />
            Add item
          </button>
        </div>
      )}
    </section>
  )
})
