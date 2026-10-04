import { cn } from './classNames'

/** Shared look for every text box and select, so they all match. */
export const controlClass = cn(
  'block h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900 placeholder:text-stone-500',
  'focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/30',
  'aria-[invalid=true]:border-rose-600 aria-[invalid=true]:focus:ring-rose-600/30',
  'disabled:bg-stone-100 disabled:text-stone-500',
)

/** `aria-describedby` value for a field whose message element has this id. */
export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  return error || hint ? id : undefined
}
