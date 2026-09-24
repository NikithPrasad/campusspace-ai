import { createPortal } from 'react-dom'
import { Bell, CheckCircle2, XCircle, Shuffle, Ban, X, CheckCheck, ArrowRight } from 'lucide-react'
import { timeAgo } from '../api'

const TYPE = {
  APPROVED: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
  REJECTED: { icon: XCircle, cls: 'bg-rose-50 text-rose-600' },
  SLOT_TAKEN: { icon: Shuffle, cls: 'bg-amber-50 text-amber-600' },
  CANCELLED: { icon: Ban, cls: 'bg-slate-100 text-slate-500' },
}

export function BellButton({ unread, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white/60 ring-1 ring-white/10 transition hover:bg-white/[0.08] hover:text-white"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      title="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-ink tabular-nums">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}

export function NotificationPanel({ items, unread, onClose, onReadAll, onOpen }) {
  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in flex-col bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <p className="text-sm text-slate-500">{unread ? `${unread} unread` : "You're all caught up"}</p>
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button className="btn-ghost btn-sm" onClick={onReadAll}>
                <CheckCheck className="h-4 w-4" /> Mark all read
              </button>
            )}
            <button className="btn-icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Bell className="h-5 w-5" /></span>
              <p className="mt-3 font-semibold text-ink">No notifications yet</p>
              <p className="mt-1 text-sm text-slate-500">Approvals, rejections and room suggestions will show up here.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((n) => {
                const t = TYPE[n.type] || TYPE.CANCELLED
                const Icon = t.icon
                const actionable = n.type === 'SLOT_TAKEN' && n.booking
                return (
                  <li key={n._id}>
                    <button
                      onClick={() => onOpen(n)}
                      className={`flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/40'}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.cls}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-sm ${n.read ? 'font-medium text-slate-700' : 'font-semibold text-ink'}`}>{n.title}</span>
                          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                        </span>
                        {n.message && <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500">{n.message}</span>}
                        <span className="mt-1.5 flex items-center justify-between">
                          <span className="text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                          {actionable && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                              See similar rooms <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>,
    document.body
  )
}
