import { useId } from 'react'
import { Minus, Plus } from 'lucide-react'
import { MAX_QUANTITY, roundTo } from '../../domain/moneyUtils'
import { formatNumberForInput, parseNumberInput } from '../../domain/validationUtils'
import { cn } from '../ui/classNames'
import { FieldLabel, FieldMessage } from '../ui/Field'
import { describedBy } from '../ui/fieldStyles'

interface QuantityInputProps {
  label?: string
  /** What's in the box, as text — it is never rewritten while the person types. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
}

const stepButton =
  'grid w-10 shrink-0 place-items-center text-stone-700 transition-colors hover:bg-stone-100 disabled:text-stone-400 disabled:hover:bg-transparent'

/** [−] 10 [+] — type a number, or tap to nudge it. Never goes below zero. */
export function QuantityInput({ label = 'Quantity', value, onChange, onBlur, error }: QuantityInputProps) {
  const id = useId()
  const messageId = `${id}-message`
  const parsed = parseNumberInput(value, MAX_QUANTITY)
  const current = parsed.kind === 'ok' ? parsed.value : 0

  function nudge(delta: number) {
    // roundTo keeps 0.1 + 0.2 style artifacts out of the box.
    const next = Math.min(MAX_QUANTITY, Math.max(0, roundTo(current + delta, 6)))
    onChange(formatNumberForInput(next))
  }

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        data-invalid={error ? true : undefined}
        className={cn(
          'flex h-12 items-stretch overflow-hidden rounded-xl border border-stone-300 bg-white',
          'focus-within:border-accent-600 focus-within:ring-2 focus-within:ring-accent-600/30',
          'data-[invalid=true]:border-rose-600',
        )}
      >
        <button type="button" aria-label="Decrease quantity" onClick={() => nudge(-1)} disabled={current <= 0} className={stepButton}>
          <Minus className="size-4" aria-hidden />
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error)}
          className="w-full min-w-0 border-x border-stone-200 bg-transparent px-1 text-center text-base tabular-nums text-stone-900 focus:outline-none"
        />
        <button type="button" aria-label="Increase quantity" onClick={() => nudge(1)} disabled={current >= MAX_QUANTITY} className={stepButton}>
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      <FieldMessage id={messageId} error={error} />
    </div>
  )
}
