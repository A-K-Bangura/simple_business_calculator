import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ToastContext, type ToastApi, type ToastOptions } from '../../state/toastContext'
import { cn } from './classNames'

interface ActiveToast extends ToastOptions {
  id: number
}

const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { ...options, id }])
  }, [])
  const api = useMemo<ToastApi>(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ActiveToast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  const isError = toast.tone === 'error'
  const duration = isError ? 9000 : toast.actionLabel ? 7000 : 4000

  // Hovering or focusing a toast pauses its countdown, so there's time to reach "Undo".
  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => onDismiss(toast.id), duration)
    return () => window.clearTimeout(timer)
  }, [paused, duration, onDismiss, toast.id])

  return (
    <div
      role={isError ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-md animate-fade-in items-center gap-1 rounded-2xl py-1.5 pl-4 pr-1.5 text-sm shadow-lg',
        isError ? 'bg-rose-800 text-white' : 'bg-stone-900 text-white',
      )}
    >
      <p className="min-w-0 flex-1 py-1.5">{toast.message}</p>
      {toast.actionLabel && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.()
            onDismiss(toast.id)
          }}
          className="min-h-11 rounded-xl px-3 font-semibold text-accent-200 hover:bg-white/10"
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="grid size-11 place-items-center rounded-xl text-stone-300 hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
