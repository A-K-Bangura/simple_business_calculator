import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import { cn } from './classNames'

let scrollLocks = 0
function lockScroll() {
  if (scrollLocks++ === 0) document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  if (--scrollLocks === 0) document.body.style.overflow = ''
}

interface DialogProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

/**
 * A modal built on the native <dialog>, which gives us focus trapping, Escape
 * to close and an inert page behind it for free. On phones it rises from the
 * bottom as a sheet; from `sm` up it is a centred card.
 *
 * Mount it only while it should be open. Put `data-autofocus` on whichever
 * element should receive focus first.
 */
export function Dialog({ title, description, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const pressStartedOnBackdrop = useRef(false)

  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null

    if (!dialog.open) dialog.showModal()
    lockScroll()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()

    return () => {
      unlockScroll()
      if (dialog.open) dialog.close()
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault() // let React decide when to unmount
        onClose()
      }}
      // Only a press that both starts and ends on the backdrop closes the dialog,
      // so dragging a text selection out of a field doesn't dismiss it.
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current) onClose()
      }}
      className={cn(
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-white p-0 text-stone-900',
        'animate-sheet-in backdrop:bg-stone-900/40',
        'sm:m-auto sm:max-w-lg sm:rounded-3xl',
      )}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-stone-600">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  )
}

/** The scrolling middle of a dialog. */
export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3 sm:px-6', className)}>
      {children}
    </div>
  )
}

/** Buttons pinned to the bottom of a dialog. */
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      {children}
    </div>
  )
}
