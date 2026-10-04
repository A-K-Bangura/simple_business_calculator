import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Ellipsis } from 'lucide-react'
import { cn } from './classNames'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

interface OverflowMenuProps {
  /** Spoken name of the button, e.g. "More actions for Juice Business". */
  label: string
  items: MenuItem[]
  /** Classes for the wrapper, e.g. to lift it above a card's stretched link. */
  className?: string
}

const ITEM_HEIGHT = 44
const MENU_PADDING = 14

/**
 * A "…" button that opens a small menu just below it (or above, when there is
 * no room). The menu is positioned inside the button's own wrapper, so it
 * simply scrolls with the page — nothing to recompute when the page moves or
 * the phone's address bar shows and hides.
 *
 * Arrow keys, Home/End, Escape and Tab all work, and focus returns to the button.
 */
export function OverflowMenu({ label, items, className }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const [flipUp, setFlipUp] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  function toggle() {
    if (open) return close()
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const needed = items.length * ITEM_HEIGHT + MENU_PADDING + 12
      setFlipUp(window.innerHeight - rect.bottom < needed && rect.top > needed)
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    wrapperRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      close()
      return
    }

    const buttons = [...(wrapperRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])]
    const index = buttons.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => buttons[(next + buttons.length) % buttons.length]?.focus()

    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: buttons.length - 1,
    }
    if (event.key in moves) {
      event.preventDefault()
      focusAt(moves[event.key])
    }
  }

  return (
    // The wrapper rises above its neighbours while open so the menu never hides behind the next card.
    <div ref={wrapperRef} onKeyDown={onKeyDown} className={cn('relative shrink-0', open && 'z-30!', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className={cn(
          'grid size-11 place-items-center rounded-full text-stone-600 transition-colors hover:bg-stone-200/60 hover:text-stone-900',
          open && 'bg-stone-200/60 text-stone-900',
        )}
      >
        <Ellipsis className="size-5" aria-hidden />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute right-0 min-w-52 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lg',
            flipUp ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => {
                close()
                item.onSelect()
              }}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 text-left text-base transition-colors',
                'disabled:opacity-50',
                item.tone === 'danger'
                  ? 'text-rose-700 hover:bg-rose-50 focus-visible:bg-rose-50'
                  : 'text-stone-800 hover:bg-stone-100 focus-visible:bg-stone-100',
              )}
            >
              {item.icon && (
                <span aria-hidden className="shrink-0 [&>svg]:size-5">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
