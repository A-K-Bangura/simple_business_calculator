import { TrendingDown } from 'lucide-react'
import { roundMoney } from '../../domain/moneyUtils'
import { formatMoney } from '../../domain/currencyUtils'
import { formatQuantityWithUnit } from '../../domain/formatUtils'
import type { ItemTotals } from '../../domain/calculationUtils'
import type { Currency, GroupType } from '../../domain/types'
import { cn } from '../ui/classNames'

interface ItemPreviewProps {
  type: GroupType
  currency: Currency
  totals: ItemTotals
  quantity: number
  unit: string
  unitCost: number
}

/** The sum, worked out live while the person types. */
export function ItemPreview({ type, currency, totals, quantity, unit, unitCost }: ItemPreviewProps) {
  const sentence = `${formatQuantityWithUnit(quantity, unit)} × ${formatMoney(unitCost, currency)}`

  if (type === 'expense') {
    return (
      <div aria-live="polite" className="rounded-2xl bg-stone-100 p-4">
        <p className="text-sm text-stone-600">Total cost</p>
        <p className="wrap-anywhere text-2xl font-bold tabular-nums">{formatMoney(totals.cost, currency)}</p>
        <p className="mt-0.5 text-sm tabular-nums text-stone-600">{sentence}</p>
      </div>
    )
  }

  const loss = totals.hasSellingPrice && roundMoney(totals.profit) < 0
  return (
    <div aria-live="polite" className="rounded-2xl bg-stone-100 p-4">
      <dl className="grid grid-cols-3 gap-3 [&>div]:min-w-0">
        <div>
          <dt className="text-sm text-stone-600">Cost</dt>
          <dd className="wrap-anywhere text-lg font-bold tabular-nums">{formatMoney(totals.cost, currency)}</dd>
        </div>
        <div>
          <dt className="text-sm text-stone-600">Potential revenue</dt>
          <dd className="wrap-anywhere text-lg font-bold tabular-nums">
            {totals.hasSellingPrice ? formatMoney(totals.revenue, currency) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-stone-600">Potential profit</dt>
          <dd className={cn('wrap-anywhere text-lg font-bold tabular-nums', loss ? 'text-rose-700' : totals.hasSellingPrice && 'text-accent-700')}>
            {totals.hasSellingPrice ? formatMoney(totals.profit, currency) : '—'}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-sm tabular-nums text-stone-600">{sentence}</p>
      {loss && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-rose-700">
          <TrendingDown className="size-4 shrink-0" aria-hidden />
          The selling price is below what it costs you.
        </p>
      )}
    </div>
  )
}
