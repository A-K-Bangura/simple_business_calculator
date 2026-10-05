import { useState, type FormEvent } from 'react'
import { Check, ShoppingBag, Wallet } from 'lucide-react'
import { GROUP_TYPES } from '../../domain/groupTypes'
import type { Group, GroupInput, GroupType } from '../../domain/types'
import { LIMITS, validateGroupInput } from '../../domain/validationUtils'
import { Button } from '../ui/Button'
import { cn } from '../ui/classNames'
import { Dialog, DialogBody, DialogFooter } from '../ui/Dialog'
import { TextField } from '../ui/Field'
import { focusFirstInvalid, useFieldVisibility } from './useFieldVisibility'

interface GroupDialogProps {
  /** Present when editing an existing group. */
  group?: Group
  /** Prefill for the "add" flow, e.g. from a suggested group. */
  suggestion?: Partial<GroupInput>
  onSubmit: (input: GroupInput) => void
  onClose: () => void
}

const typeIcons: Record<GroupType, typeof Wallet> = { expense: Wallet, selling: ShoppingBag }

/** Two plain questions: what's it called, and is it something you pay for or sell? */
export function GroupDialog({ group, suggestion, onSubmit, onClose }: GroupDialogProps) {
  const [name, setName] = useState(group?.name ?? suggestion?.name ?? '')
  const [type, setType] = useState<GroupType>(group?.type ?? suggestion?.type ?? 'expense')
  const visibility = useFieldVisibility<'name'>()
  const errors = validateGroupInput({ name, type })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    visibility.markSubmitted()
    if (errors.name) {
      focusFirstInvalid(event.currentTarget)
      return
    }
    onSubmit({ name: name.trim(), type })
  }

  const hasSellingPrices = group?.items.some((item) => item.sellingPrice !== undefined) ?? false
  const note =
    group && group.type === 'selling' && type === 'expense' && hasSellingPrices
      ? 'Selling prices you’ve entered are kept, but they’re left out of the numbers while this group is for things you pay for. Switch back any time to use them again.'
      : group && group.type === 'expense' && type === 'selling' && group.items.length > 0
        ? 'Add a selling price to each item by editing it. Until then, it won’t count towards potential revenue.'
        : null

  return (
    <Dialog title={group ? 'Edit group' : 'Add a group'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <DialogBody className="space-y-5">
          <TextField
            label="What do you want to group?"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => visibility.touch('name')}
            error={visibility.isVisible('name') ? errors.name : undefined}
            placeholder="e.g. Marketing"
            maxLength={LIMITS.name}
            autoComplete="off"
            data-autofocus
          />

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-stone-800">What kind of items are these?</legend>
            <div className="grid gap-2.5">
              {(Object.keys(GROUP_TYPES) as GroupType[]).map((option) => {
                const Icon = typeIcons[option]
                return (
                  <label key={option} className="block">
                    <input
                      type="radio"
                      name="group-type"
                      value={option}
                      checked={type === option}
                      onChange={() => setType(option)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-stone-200 bg-white p-3.5 transition-colors',
                        'hover:border-stone-300 peer-checked:border-accent-600 peer-checked:bg-accent-50',
                        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-600',
                      )}
                    >
                      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-700" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{GROUP_TYPES[option].label}</span>
                        <span className="mt-0.5 block text-sm text-stone-600">{GROUP_TYPES[option].examples}</span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2',
                          type === option ? 'border-accent-600 bg-accent-600 text-white' : 'border-stone-300',
                        )}
                      >
                        {type === option && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {note && <p className="rounded-xl bg-stone-100 p-3 text-sm text-stone-700">{note}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{group ? 'Save changes' : 'Add group'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
