import { memo, type ReactNode } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import { calculateItem } from '../../domain/calculationUtils'
import { formatMoney } from '../../domain/currencyUtils'
import { formatQuantityWithUnit } from '../../domain/formatUtils'
import type { Currency, GroupType, Item } from '../../domain/types'
import { cn } from '../ui/classNames'
import { OverflowMenu } from '../ui/OverflowMenu'
import { AmountText } from './AmountText'
import type { GroupHandlers } from './groupHandlers'

interface ItemRowProps {
  groupId: string
  item: Item
  groupType: GroupType
  currency: Currency
  handlers: GroupHandlers
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="wrap-anywhere font-medium tabular-nums">{children}</dd>
    </div>
  )
}

/**
 * One item. On phones the figures sit in a tidy grid under the name; from `md`
 * up everything runs along a single line. The whole row opens the editor.
 */
export const ItemRow = memo(function ItemRow({ groupId, item, groupType, currency, handlers }: ItemRowProps) {
  const totals = calculateItem(item, groupType)
  const selling = groupType === 'selling'
  const priced = totals.hasSellingPrice

  return (
    <li className="relative flex items-start gap-1 py-3 pl-4 pr-1.5 hover:bg-stone-50 md:items-center">
      <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
        <div className="min-w-0 md:flex-1">
          <button
            type="button"
            onClick={() => handlers.onEditItem(groupId, item.id)}
            className="wrap-anywhere text-left text-base font-semibold after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:outline-accent-600"
          >
            {item.name}
          </button>
          <p className="text-sm tabular-nums text-stone-600">
            {formatQuantityWithUnit(item.quantity, item.unit)} × {formatMoney(item.unitCost, currency)}
          </p>
          {item.notes && <p className="line-clamp-1 text-sm italic text-stone-500">{item.notes}</p>}
        </div>

        <dl
          className={cn(
            'mt-2 grid gap-x-4 gap-y-2 text-sm md:mt-0',
            selling ? 'grid-cols-2 sm:grid-cols-4 md:w-[28rem]' : 'grid-cols-1 md:w-32',
          )}
        >
          <Figure label={selling ? 'Cost' : 'Total'}>
            <AmountText value={totals.cost} currency={currency} />
          </Figure>
          {selling && (
            <>
              <Figure label="Selling">
                {priced ? `${formatMoney(item.sellingPrice ?? 0, currency)} each` : <span className="font-normal text-stone-500">Not set yet</span>}
              </Figure>
              <Figure label="Revenue">
                {priced ? <AmountText value={totals.revenue} currency={currency} /> : <span aria-label="not available">—</span>}
              </Figure>
              <Figure label="Profit">
                {priced ? <AmountText value={totals.profit} currency={currency} tone="result" /> : <span aria-label="not available">—</span>}
              </Figure>
            </>
          )}
        </dl>
      </div>

      <OverflowMenu
        label={`More actions for ${item.name}`}
        className="relative z-10"
        items={[
          { label: 'Edit', icon: <Pencil />, onSelect: () => handlers.onEditItem(groupId, item.id) },
          { label: 'Duplicate', icon: <Copy />, onSelect: () => handlers.onDuplicateItem(groupId, item.id) },
          { label: 'Delete', icon: <Trash2 />, tone: 'danger', onSelect: () => handlers.onDeleteItem(groupId, item.id) },
        ]}
      />
    </li>
  )
})
