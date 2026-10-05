import { useCallback, useState } from 'react'

/**
 * Decides when a field's problem should be shown: only after the person has
 * left the field, or tried to submit. A fresh form never greets them with red.
 */
export function useFieldVisibility<Field extends string>() {
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})

  return {
    isVisible: (field: Field) => submitted || Boolean(touched[field]),
    touch: useCallback((field: Field) => setTouched((current) => (current[field] ? current : { ...current, [field]: true })), []),
    markSubmitted: useCallback(() => setSubmitted(true), []),
    reset: useCallback(() => {
      setSubmitted(false)
      setTouched({})
    }, []),
  }
}

/** After a failed submit, move focus to the first field with a problem. */
export function focusFirstInvalid(form: HTMLFormElement): void {
  // Wait a frame so the error state has been rendered.
  requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}
