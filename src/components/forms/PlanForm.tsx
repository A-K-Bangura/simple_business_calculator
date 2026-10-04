import { useState, type FormEvent } from 'react'
import type { BusinessPlan, Currency, PlanInput } from '../../domain/types'
import { LIMITS, validatePlanDraft } from '../../domain/validationUtils'
import { CurrencySelector } from '../inputs/CurrencySelector'
import { Button } from '../ui/Button'
import { Dialog, DialogBody, DialogFooter } from '../ui/Dialog'
import { TextAreaField, TextField } from '../ui/Field'
import { focusFirstInvalid, useFieldVisibility } from './useFieldVisibility'

interface PlanDetailsDialogProps {
  /** Present when editing an existing plan. */
  plan?: BusinessPlan
  defaultCurrency: Currency
  onSubmit: (input: PlanInput) => void
  onClose: () => void
}

/** Create a plan, or edit its name, description and currency. */
export function PlanDetailsDialog({ plan, defaultCurrency, onSubmit, onClose }: PlanDetailsDialogProps) {
  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [currency, setCurrency] = useState<Currency>(plan?.currency ?? defaultCurrency)
  const visibility = useFieldVisibility<'name' | 'currency'>()

  const { errors, values } = validatePlanDraft({ name, description, currency })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    visibility.markSubmitted()
    if (!values) {
      focusFirstInvalid(event.currentTarget)
      return
    }
    onSubmit(values)
  }

  return (
    <Dialog
      title={plan ? 'Edit plan details' : 'New business plan'}
      description={plan ? undefined : 'Just the basics. You can change these any time.'}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-4">
          <TextField
            label="Business or plan name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => visibility.touch('name')}
            error={visibility.isVisible('name') ? errors.name : undefined}
            placeholder="e.g. Mariama’s Clothing Business"
            maxLength={LIMITS.name}
            autoComplete="off"
            enterKeyHint="next"
            data-autofocus
          />
          <TextAreaField
            label="Description"
            optional
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="A line or two to remind you what this plan is for"
            maxLength={LIMITS.description}
            rows={2}
          />
          <CurrencySelector
            value={currency}
            onChange={setCurrency}
            error={visibility.isVisible('currency') ? errors.currency : undefined}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{plan ? 'Save changes' : 'Create plan'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
