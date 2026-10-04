import { formatMoney } from '../../domain/currencyUtils'
import { roundMoney } from '../../domain/moneyUtils'
import type { Currency } from '../../domain/types'
import { cn } from '../ui/classNames'

interface AmountTextProps {
  value: number
  currency: Currency
  /**
   * `plain` is just the amount. `result` is for profit-like figures: positive
   * reads in the accent colour, and a loss is red *and* carries a minus sign
   * and a spoken "loss", so colour is never the only signal.
   */
  tone?: 'plain' | 'result'
  className?: string
}

export function AmountText({ value, currency, tone = 'plain', className }: AmountTextProps) {
  const rounded = roundMoney(value)
  const isLoss = tone === 'result' && rounded < 0
  return (
    <span
      className={cn(
        'tabular-nums',
        tone === 'result' && (isLoss ? 'text-rose-700' : rounded > 0 && 'text-accent-700'),
        className,
      )}
    >
      {formatMoney(value, currency)}
      {isLoss && <span className="sr-only"> (a loss)</span>}
    </span>
  )
}
