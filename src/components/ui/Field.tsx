import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from './classNames'
import { controlClass, describedBy } from './fieldStyles'

export function FieldLabel({
  htmlFor,
  optional,
  children,
}: {
  htmlFor: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-800">
      {children}
      {optional && <span className="font-normal text-stone-500"> (optional)</span>}
    </label>
  )
}

/** The error (if any) and hint under a field. Errors replace hints. */
export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={id} className="mt-1.5 text-sm text-rose-700">
        {error}
      </p>
    )
  }
  if (hint) {
    return (
      <p id={id} className="mt-1.5 text-sm text-stone-600">
        {hint}
      </p>
    )
  }
  return null
}

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string
  optional?: boolean
  error?: string
  hint?: string
}

export function TextField({ label, optional, error, hint, className, ...props }: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(messageId, error, hint)}
        className={cn(controlClass, className)}
        {...props}
      />
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}

interface TextAreaFieldProps extends Omit<ComponentProps<'textarea'>, 'id'> {
  label: string
  optional?: boolean
  error?: string
  hint?: string
}

export function TextAreaField({ label, optional, error, hint, className, ...props }: TextAreaFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(messageId, error, hint)}
        className={cn(controlClass, 'h-auto min-h-24 resize-y py-2.5', className)}
        {...props}
      />
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}
