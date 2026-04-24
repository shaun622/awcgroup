import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

/**
 * ConfirmModal — two-button confirmation dialog. Defaults to a destructive
 * red confirm button; pass `destructive={false}` for a neutral confirm.
 *
 * Props:
 *   open, onClose            required
 *   title, description       shown in the body
 *   confirmLabel             default "Delete"
 *   cancelLabel              default "Cancel"
 *   destructive              default true
 *   onConfirm                async-capable handler
 *   zLayer                   pass 60+ when nested in another modal
 */
export default function ConfirmModal({
  open, onClose,
  title, description,
  confirmLabel = 'Delete', cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  zLayer,
}) {
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    try {
      await onConfirm?.()
      onClose?.()
    } finally {
      setRunning(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" zLayer={zLayer}>
      <div className="flex justify-center pt-2">
        <div className={destructive
          ? 'w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center'
          : 'w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center'}>
          <AlertTriangle className="w-7 h-7" strokeWidth={2} />
        </div>
      </div>
      <div className="text-center mt-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="secondary" onClick={onClose} className="flex-1" disabled={running}>{cancelLabel}</Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          onClick={run}
          loading={running}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
