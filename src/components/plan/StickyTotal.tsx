import { cn } from '../ui/classNames'

interface StickyTotalProps {
  visible: boolean
  planName: string
  amount: string
}

/**
 * A slim bar that slides in once the big startup-cost number has scrolled away,
 * so the total stays in sight while you work down a long plan. It only repeats
 * what's already on the page, so it's hidden from screen readers.
 */
export function StickyTotal({ visible, planName, amount }: StickyTotalProps) {
  return (
    <div
      aria-hidden
      inert={!visible}
      className={cn(
        'fixed inset-x-0 top-0 z-20 border-b border-stone-200 bg-white transition-transform duration-200',
        visible ? 'translate-y-0' : '-translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-3xl items-baseline justify-between gap-4 px-4 py-2.5 sm:px-6">
        <span className="min-w-0 truncate text-sm font-medium text-stone-600">{planName}</span>
        <span className="wrap-anywhere max-w-[65%] text-right text-base font-bold tabular-nums">
          <span className="mr-2 text-xs font-normal text-stone-500">Startup cost</span>
          {amount}
        </span>
      </div>
    </div>
  )
}
