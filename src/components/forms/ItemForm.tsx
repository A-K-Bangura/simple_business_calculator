import { useRef, useState, type FormEvent } from 'react'
import { Check, NotebookPen } from 'lucide-react'
import { COMMON_UNITS } from '../../domain/groupTypes'
import { MAX_AMOUNT, MAX_QUANTITY } from '../../domain/moneyUtils'
import type { Currency, GroupType, Item, ItemValues } from '../../domain/types'
import {
  draftFromItem,
  emptyItemDraft,
  LIMITS,
  parseNumberInput,
  previewItemTotals,
  sellingPriceHint,
  validateItemDraft,
  type ItemDraft,
  type ItemField,
} from '../../domain/validationUtils'
import { MoneyInput } from '../inputs/MoneyInput'
import { QuantityInput } from '../inputs/QuantityInput'
import { Button } from '../ui/Button'
import { Dialog, DialogBody, DialogFooter } from '../ui/Dialog'
import { TextAreaField, TextField } from '../ui/Field'
import { ItemPreview } from './ItemPreview'
import { focusFirstInvalid, useFieldVisibility } from './useFieldVisibility'

interface ItemDialogProps {
  groupName: string
  groupType: GroupType
  currency: Currency
  /** Present when editing an existing item. */
  item?: Item
  /** `addAnother` is true when the person wants to keep the form open for the next item. */
  onSubmit: (values: ItemValues, options: { addAnother: boolean }) => void
  onClose: () => void
}

const UNITS_LIST_ID = 'common-units'

export function ItemDialog({ groupName, groupType, currency, item, onSubmit, onClose }: ItemDialogProps) {
  const [draft, setDraft] = useState<ItemDraft>(() => (item ? draftFromItem(item) : emptyItemDraft()))
  const [showNotes, setShowNotes] = useState(Boolean(item?.notes))
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const visibility = useFieldVisibility<ItemField>()
  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const { errors, values } = validateItemDraft(draft, groupType)
  const totals = previewItemTotals(draft, groupType)
  const selling = groupType === 'selling'
  const set = (field: keyof ItemDraft) => (value: string) => setDraft((current) => ({ ...current, [field]: value }))
  const show = (field: ItemField) => (visibility.isVisible(field) ? errors[field] : undefined)

  const readNumber = (text: string, max: number) => {
    const parsed = parseNumberInput(text, max)
    return parsed.kind === 'ok' ? parsed.value : 0
  }

  function submit(addAnother: boolean) {
    visibility.markSubmitted()
    if (!values) {
      if (formRef.current) focusFirstInvalid(formRef.current)
      return
    }
    onSubmit(values, { addAnother })
    if (addAnother) {
      setJustAdded(values.name)
      setDraft(emptyItemDraft())
      setShowNotes(false)
      visibility.reset()
      nameRef.current?.focus()
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(false)
  }

  return (
    <Dialog title={item ? 'Edit item' : 'Add item'} description={`In ${groupName}`} onClose={onClose}>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-4">
          {justAdded && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-accent-50 px-3 py-2 text-sm font-medium text-accent-800">
              <Check className="size-4 shrink-0" aria-hidden />
              Added “{justAdded}”. Add another below.
            </p>
          )}

          <TextField
            ref={nameRef}
            label="Item name"
            value={draft.name}
            onChange={(event) => set('name')(event.target.value)}
            onBlur={() => visibility.touch('name')}
            error={show('name')}
            placeholder={selling ? 'e.g. T-Shirts' : 'e.g. Flyers'}
            maxLength={LIMITS.name}
            autoComplete="off"
            enterKeyHint="next"
            data-autofocus
          />

          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
            <QuantityInput
              value={draft.quantity}
              onChange={set('quantity')}
              onBlur={() => visibility.touch('quantity')}
              error={show('quantity')}
            />
            <TextField
              label="Unit"
              optional
              value={draft.unit}
              onChange={(event) => set('unit')(event.target.value)}
              placeholder="pieces"
              list={UNITS_LIST_ID}
              maxLength={LIMITS.unit}
              autoComplete="off"
              enterKeyHint="next"
            />
          </div>
          <datalist id={UNITS_LIST_ID}>
            {COMMON_UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>

          <div className={selling ? 'grid grid-cols-2 gap-3' : undefined}>
            <MoneyInput
              label="Cost per unit"
              currency={currency}
              value={draft.unitCost}
              onChange={set('unitCost')}
              onBlur={() => visibility.touch('unitCost')}
              error={show('unitCost')}
              enterKeyHint={selling ? 'next' : 'done'}
            />
            {selling && (
              <MoneyInput
                label="Selling price per unit"
                currency={currency}
                value={draft.sellingPrice}
                onChange={set('sellingPrice')}
                onBlur={() => visibility.touch('sellingPrice')}
                error={show('sellingPrice')}
                enterKeyHint="done"
              />
            )}
          </div>
          {selling && !errors.sellingPrice && sellingPriceHint(draft, groupType) && (
            <p className="-mt-2 text-sm text-stone-600">{sellingPriceHint(draft, groupType)}</p>
          )}

          <ItemPreview
            type={groupType}
            currency={currency}
            totals={totals}
            quantity={readNumber(draft.quantity, MAX_QUANTITY)}
            unit={draft.unit}
            unitCost={readNumber(draft.unitCost, MAX_AMOUNT)}
          />

          {showNotes ? (
            <TextAreaField
              label="Note"
              optional
              value={draft.notes}
              onChange={(event) => set('notes')(event.target.value)}
              placeholder="Supplier, colour, size… anything you want to remember"
              maxLength={LIMITS.notes}
              rows={2}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-accent-700 hover:text-accent-800"
            >
              <NotebookPen className="size-4" aria-hidden />
              Add a note
            </button>
          )}
        </DialogBody>

        <DialogFooter>
          {/* On phones the close button and swipe-away cover Cancel, which keeps this row to two buttons. */}
          <Button variant="secondary" onClick={onClose} className="max-sm:hidden">
            Cancel
          </Button>
          {!item && (
            <Button variant="secondary" onClick={() => submit(true)} className="flex-1 whitespace-nowrap px-3 sm:flex-none sm:px-4">
              <span className="sm:hidden">Add another</span>
              <span className="max-sm:hidden">Add &amp; add another</span>
            </Button>
          )}
          <Button type="submit" className="flex-1 sm:flex-none">
            {item ? 'Save changes' : 'Add item'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
