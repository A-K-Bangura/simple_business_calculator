import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { CURRENCY_PRESETS, CUSTOM_CURRENCY_CODE, findPresetByCode, isPresetCurrency } from '../../domain/currencyUtils'
import type { Currency } from '../../domain/types'
import { LIMITS } from '../../domain/validationUtils'
import { FieldLabel, FieldMessage } from '../ui/Field'
import { controlClass, describedBy } from '../ui/fieldStyles'
import { cn } from '../ui/classNames'

interface CurrencySelectorProps {
  value: Currency
  onChange: (currency: Currency) => void
  error?: string
}

/** A short list of common currencies, plus "Other" for any symbol or code. */
export function CurrencySelector({ value, onChange, error }: CurrencySelectorProps) {
  const selectId = useId()
  const customId = useId()
  const messageId = `${customId}-message`
  const isCustom = !isPresetCurrency(value)

  function choose(code: string) {
    if (code === CUSTOM_CURRENCY_CODE) {
      onChange({ code: CUSTOM_CURRENCY_CODE, symbol: isCustom ? value.symbol : '' })
      return
    }
    const preset = findPresetByCode(code)
    if (preset) onChange({ code: preset.code, symbol: preset.symbol })
  }

  return (
    <div>
      <FieldLabel htmlFor={selectId}>Currency</FieldLabel>
      <div className="relative">
        <select
          id={selectId}
          value={isCustom ? CUSTOM_CURRENCY_CODE : value.code}
          onChange={(event) => choose(event.target.value)}
          className={cn(controlClass, 'appearance-none pr-10')}
        >
          {CURRENCY_PRESETS.map((preset) => (
            <option key={preset.code} value={preset.code}>
              {preset.name} ({preset.symbol})
            </option>
          ))}
          <option value={CUSTOM_CURRENCY_CODE}>Other — type your own…</option>
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-stone-500" />
      </div>

      {isCustom && (
        <div className="mt-3">
          <FieldLabel htmlFor={customId}>Currency symbol or code</FieldLabel>
          <input
            id={customId}
            type="text"
            value={value.symbol}
            maxLength={LIMITS.currencySymbol}
            placeholder="e.g. FCFA"
            autoComplete="off"
            onChange={(event) => onChange({ code: CUSTOM_CURRENCY_CODE, symbol: event.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(messageId, error)}
            className={cn(controlClass, 'max-w-48')}
            data-autofocus={value.symbol === '' ? true : undefined}
          />
          <FieldMessage id={messageId} error={error} />
        </div>
      )}
    </div>
  )
}
