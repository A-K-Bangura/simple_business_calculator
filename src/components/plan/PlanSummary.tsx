import type { ReactNode, Ref } from 'react'
import { ChevronDown, CircleAlert, Info, TrendingDown } from 'lucide-react'
import type { PlanTotals } from '../../domain/calculationUtils'
import { formatMoney } from '../../domain/currencyUtils'
import { formatPercent, pluralize } from '../../domain/formatUtils'
import { roundMoney } from '../../domain/moneyUtils'
import type { Currency } from '../../domain/types'
import { cn } from '../ui/classNames'
import { AmountText } from './AmountText'

interface PlanSummaryProps {
  totals: PlanTotals
  currency: Currency
  /** Lets the page notice when the big number has scrolled out of view. */
  heroRef: Ref<HTMLDivElement>
}

function Figure({ label, help, children, status }: { label: string; help: string; children: ReactNode; status?: ReactNode }) {
  return (
    <div className="p-4 sm:p-5">
      <dt className="text-sm font-medium text-stone-700">{label}</dt>
      <dd className="mt-1 wrap-anywhere text-2xl font-bold leading-tight">{children}</dd>
      <dd className="mt-1.5 text-sm text-stone-600">{help}</dd>
      {status && <dd className="mt-1.5 text-sm font-medium">{status}</dd>}
    </div>
  )
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-start gap-1.5 text-rose-700">
      <TrendingDown className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </span>
  )
}

/** The headline number, and — when there are things to sell — what they could bring in. */
export function PlanSummary({ totals, currency, heroRef }: PlanSummaryProps) {
  const startup = formatMoney(totals.totalStartupCost, currency)
  const heroSize =
    startup.length > 20 ? 'text-2xl sm:text-4xl' : startup.length > 13 ? 'text-3xl sm:text-5xl' : 'text-5xl sm:text-6xl'

  const grossLoss = roundMoney(totals.grossProfit) < 0
  const shortBy = roundMoney(totals.projectedSurplus) < 0 ? Math.abs(totals.projectedSurplus) : 0

  return (
    <section aria-label="Plan summary" className="mt-5 space-y-3">
      <div ref={heroRef} className="rounded-3xl bg-accent-700 p-5 text-white sm:p-7">
        <p className="text-sm font-medium text-accent-50">Estimated startup cost</p>
        <p className={cn('mt-1 wrap-anywhere font-bold leading-tight tracking-tight tabular-nums', heroSize)}>{startup}</p>
        <p className="mt-2 text-sm text-accent-50">
          What you’d need to get started · {pluralize(totals.groupCount, 'group')}, {pluralize(totals.itemCount, 'item')}
        </p>
      </div>

      {totals.hasSellingGroups ? (
        <>
          <dl className="grid grid-cols-1 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Figure label="Potential revenue" help="If you sell everything at your selling prices">
              <AmountText value={totals.potentialRevenue} currency={currency} />
            </Figure>
            <Figure
              label="Potential gross profit"
              help="Revenue minus what the things you sell cost"
              status={
                grossLoss ? (
                  <Warning>The selling prices are below cost, so this would be a loss.</Warning>
                ) : totals.grossMargin !== null ? (
                  <span className="text-stone-600">{formatPercent(totals.grossMargin)} of revenue</span>
                ) : undefined
              }
            >
              <AmountText value={totals.grossProfit} currency={currency} tone="result" />
            </Figure>
            <Figure
              label="Potential amount left after startup costs"
              help="Revenue minus your whole startup cost"
              status={
                shortBy > 0 ? <Warning>Short by {formatMoney(shortBy, currency)}. Revenue wouldn’t cover everything yet.</Warning> : undefined
              }
            >
              <AmountText value={totals.projectedSurplus} currency={currency} tone="result" />
            </Figure>
          </dl>

          {totals.unpricedItemCount > 0 && (
            <p className="flex items-start gap-2 text-sm text-stone-700">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {pluralize(totals.unpricedItemCount, 'thing')} you plan to sell{' '}
              {totals.unpricedItemCount === 1 ? 'has' : 'have'} no selling price yet, so potential revenue may look low.
            </p>
          )}
          <p className="flex items-start gap-2 text-sm text-stone-600">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            These are estimates, not guaranteed income. They assume you sell everything you’ve listed at the selling prices you entered.
          </p>

          <details className="group rounded-2xl border border-stone-200 bg-white">
            <summary className="flex min-h-12 list-none items-center justify-between gap-2 rounded-2xl px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              How are these worked out?
              <ChevronDown className="size-5 text-stone-500 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-2.5 border-t border-stone-200 px-4 py-3 text-sm text-stone-700">
              <p>
                <strong className="font-semibold text-stone-900">Estimated startup cost</strong> is everything in every group added up: the money you’d need up front.
              </p>
              <p>
                <strong className="font-semibold text-stone-900">Potential revenue</strong> is what the things you plan to sell would bring in (quantity × selling price).
              </p>
              <p>
                <strong className="font-semibold text-stone-900">Potential gross profit</strong> is that revenue minus what those same things cost you. It leaves out your other costs, like equipment or marketing.
              </p>
              <p>
                <strong className="font-semibold text-stone-900">Potential amount left after startup costs</strong> is revenue minus your <em>whole</em> startup cost. That’s why it’s usually lower than gross profit.
              </p>
            </div>
          </details>
        </>
      ) : (
        totals.groupCount > 0 && (
          <p className="flex items-start gap-2 text-sm text-stone-600">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Add a group of things you plan to sell to see what they could bring in.
          </p>
        )
      )}
    </section>
  )
}
