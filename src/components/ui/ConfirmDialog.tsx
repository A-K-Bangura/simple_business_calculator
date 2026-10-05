import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog, DialogBody, DialogFooter } from './Dialog'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** For actions that can't be undone. Focus starts on Cancel so Enter is never destructive. */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <DialogBody>
        <div className="space-y-2 text-stone-700">{children}</div>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel} data-autofocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
