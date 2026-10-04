import { Check, CircleAlert, LoaderCircle } from 'lucide-react'
import { useSaveStatus } from '../../state/plansContext'
import { cn } from './classNames'

/** A quiet "your work is safe" note. It only gets loud if saving fails. */
export function SaveIndicator() {
  const status = useSaveStatus()

  return (
    <p
      role="status"
      className={cn(
        'flex items-center gap-1.5 text-sm',
        status === 'error' ? 'font-medium text-rose-700' : 'text-stone-500',
      )}
    >
      {status === 'saved' && <Check className="size-4" aria-hidden />}
      {status === 'saving' && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
      {status === 'error' && <CircleAlert className="size-4" aria-hidden />}
      {status === 'saved' && 'Saved locally'}
      {status === 'saving' && 'Saving…'}
      {status === 'error' && (
        <>
          Not saved
          <span className="sr-only">
            . Your browser is blocking storage or it is full. Your changes will be lost if you close this page.
          </span>
        </>
      )}
    </p>
  )
}
