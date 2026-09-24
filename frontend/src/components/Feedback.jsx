import { useCallback, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { ToastContext, ConfirmContext } from '../context/feedback'
import { Modal } from './ui'

const ICONS = {
  success: { Icon: CheckCircle2, cls: 'text-emerald-500' },
  error: { Icon: AlertCircle, cls: 'text-rose-500' },
  info: { Icon: Info, cls: 'text-brand-500' },
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    ({ type = 'success', title, message, duration = 4000 }) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t.slice(-3), { id, type, title, message }])
      setTimeout(() => dismiss(id), duration)
    },
    [dismiss]
  )

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setDialog(opts)
      }),
    []
  )

  const close = (answer) => {
    resolver.current?.(answer)
    resolver.current = null
    setDialog(null)
  }

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* Toast stack */}
        <div className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:top-6">
          {toasts.map((t) => {
            const { Icon, cls } = ICONS[t.type] || ICONS.info
            return (
              <div
                key={t.id}
                className="pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3 rounded-2xl bg-white/95 p-4 shadow-pop ring-1 ring-slate-900/10 backdrop-blur"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} />
                <div className="min-w-0 flex-1">
                  {t.title && <p className="text-sm font-semibold text-ink">{t.title}</p>}
                  {t.message && <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{t.message}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="rounded-md p-0.5 text-slate-400 hover:text-ink" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Confirm dialog */}
        <Modal open={!!dialog} onClose={() => close(false)} title={dialog?.title} size="sm">
          <div className="flex gap-4">
            {(dialog?.tone === 'danger' || dialog?.tone === 'warning') && (
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${
                  dialog.tone === 'danger' ? 'bg-rose-50 text-rose-600 ring-rose-600/10' : 'bg-amber-50 text-amber-600 ring-amber-600/15'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
            )}
            <p className="text-sm leading-relaxed text-slate-600">{dialog?.message}</p>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => close(false)}>
              {dialog?.cancelLabel || 'Keep it'}
            </button>
            <button autoFocus className={dialog?.tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={() => close(true)}>
              {dialog?.confirmLabel || 'Confirm'}
            </button>
          </div>
        </Modal>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}
