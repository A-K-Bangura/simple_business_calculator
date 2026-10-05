import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  /** Label for an optional action button, such as "Undo". */
  actionLabel?: string
  onAction?: () => void
  tone?: 'default' | 'error'
}

export interface ToastApi {
  show(options: ToastOptions): void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
