import type { ComponentProps } from 'react'
import { cn } from './classNames'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent-700 text-white hover:bg-accent-800',
  secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
  ghost: 'text-stone-700 hover:bg-stone-200/60',
  danger: 'bg-rose-700 text-white hover:bg-rose-800',
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

interface IconButtonProps extends ComponentProps<'button'> {
  /** Spoken name of the button; there is no visible text. */
  label: string
}

export function IconButton({ label, className, type = 'button', children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full text-stone-600 transition-colors hover:bg-stone-200/60 hover:text-stone-900',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
