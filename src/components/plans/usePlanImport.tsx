import { useCallback, useRef, type ChangeEvent } from 'react'
import { pluralize } from '../../domain/formatUtils'
import { errorMessage } from '../../state/errorMessage'
import { usePlansActions } from '../../state/plansContext'
import { useToast } from '../../state/toastContext'
import { parseImport, readFileAsText } from '../../storage/importExportUtils'

/**
 * Lets a screen offer "Import from a file". Render `input` once anywhere on the
 * screen and call `pick()` from a button.
 */
export function usePlanImport() {
  const { importPlans } = usePlansActions()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = useCallback(() => inputRef.current?.click(), [])

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still triggers a change
    if (!file) return

    try {
      const { plans, skipped } = parseImport(await readFileAsText(file))
      const added = await importPlans(plans)
      const extra = skipped > 0 ? ` ${pluralize(skipped, 'entry', 'entries')} in the file couldn’t be used.` : ''
      toast.show({ message: `Imported ${pluralize(added.length, 'plan')}.${extra}` })
    } catch (error) {
      toast.show({ tone: 'error', message: errorMessage(error, 'That file couldn’t be imported.') })
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".json,application/json"
      onChange={onChange}
      tabIndex={-1}
      aria-hidden
      className="sr-only"
    />
  )

  return { pick, input }
}
