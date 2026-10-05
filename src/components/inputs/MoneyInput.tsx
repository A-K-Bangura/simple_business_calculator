import { useId } from 'react'
import type { Currency } from '../../domain/types'
import { cn } from '../ui/classNames'
import { FieldLabel, FieldMessage } from '../ui/Field'
import { describedBy } from '../ui/fieldStyles'

interface MoneyInputProps {
  label: string
  currency: Currency
  /** What's in the box, as text — it is never rewritten while the person types. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  hint?: string
  enterKeyHint?: 'next' | 'done' | 'go'
}

/** An amount box with the plan's currency symbol in front of it. */
export function MoneyInput({ label, currency, value, onChange, onBlur, error, hint, enterKeyHint = 'next' }: MoneyInputProps) {
  const id = useId()
  const messageId = `${id}-message`
  const symbol = currency.symbol.trim() || currency.code

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        data-invalid={error ? true : undefined}
        className={cn(
          'flex h-12 items-center rounded-xl border border-stone-300 bg-white',
          'focus-within:border-accent-600 focus-within:ring-2 focus-within:ring-accent-600/30',
          'data-[invalid=true]:border-rose-600',
        )}
      >
        <span aria-hidden className="select-none pl-3 pr-1.5 text-base text-stone-500">
          {symbol}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint={enterKeyHint}
          placeholder="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(messageId, error, hint)}
          className="h-full w-full min-w-0 rounded-r-xl bg-transparent pr-3 text-base tabular-nums text-stone-900 placeholder:text-stone-500 focus:outline-none"
        />
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}
