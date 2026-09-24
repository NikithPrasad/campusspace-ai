import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { initials, pretty } from '../api'
import { statusStyle } from '../status'


export function Badge({ value, className = '' }) {
  const s = statusStyle(value)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.pill} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label || pretty(value)}
    </span>
  )
}

// Solid white pill used on top of coloured covers
export function GlassBadge({ value }) {
  const s = statusStyle(value)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink shadow-sm backdrop-blur">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-orange-400',
  'from-amber-500 to-yellow-400',
  'from-fuchsia-500 to-pink-400',
]

export function Avatar({ name = '', size = 'md' }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  const g = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
  const sz = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' }[size]
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white ${g} ${sz}`}>
      {initials(name)}
    </span>
  )
}

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-20 text-sm text-slate-400 ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function Alert({ type = 'error', children, onClose, className = '' }) {
  if (!children) return null
  const ok = type === 'success'
  const Icon = ok ? CheckCircle2 : AlertCircle
  return (
    <div
      role="alert"
      className={`mb-4 flex animate-fade-in items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm ring-1 ring-inset ${
        ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/15' : 'bg-rose-50 text-rose-800 ring-rose-600/15'
      } ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 leading-relaxed">{children}</div>
      {onClose && (
        <button onClick={onClose} className="rounded p-0.5 opacity-50 transition hover:opacity-100" aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function Modal({ title, description, open, onClose, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size]
  // Portal to <body> so animated (transformed) parents can't trap the fixed overlay
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[3px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[92vh] w-full ${width} animate-scale-in overflow-y-auto rounded-t-3xl bg-white shadow-pop ring-1 ring-slate-900/10 sm:rounded-3xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 pb-4 pt-5 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="btn-icon -mr-2 -mt-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="card flex animate-fade-up flex-col items-center px-6 py-16 text-center">
      {Icon && (
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-2xl bg-brand-400/30 blur-xl" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-white to-slate-50 shadow-card ring-1 ring-slate-900/5">
            <Icon className="h-6 w-6 text-brand-500" />
          </div>
        </div>
      )}
      <p className="text-base font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-8 flex animate-fade-up flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

// Pill-style tab switcher: options = [{ value, label, count? }]
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1 ring-1 ring-slate-900/5 scrollbar-none ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              active ? 'bg-white text-ink shadow-xs ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-ink'
            }`}
          >
            {o.icon && <o.icon className="h-3.5 w-3.5" />}
            {o.label}
            {o.count !== undefined && (
              <span className={`rounded-md px-1.5 text-[11px] tabular-nums ${active ? 'bg-slate-100 text-slate-600' : 'bg-white/70 text-slate-400'}`}>
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Field({ label, hint, error, children, htmlFor, optional }) {
  return (
    <div>
      {label && (
        <label className="label flex items-center justify-between" htmlFor={htmlFor}>
          <span>{label}</span>
          {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

// Calendar-style date block: MON / 26 / Sep
export function DateTile({ date, tone = 'default' }) {
  const d = new Date(date)
  const tones = {
    default: 'bg-white ring-slate-900/[0.06] text-ink',
    muted: 'bg-slate-50 ring-slate-900/[0.04] text-slate-400',
  }
  return (
    <div className={`flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl shadow-xs ring-1 ${tones[tone]}`}>
      <span className={`w-full py-0.5 text-center text-[10px] font-semibold tracking-wider uppercase ${tone === 'muted' ? 'bg-slate-200/60 text-slate-500' : 'bg-gradient-to-r from-brand-500 to-violet-500 text-white'}`}>
        {d.toLocaleDateString('en-IN', { month: 'short' })}
      </span>
      <span className="pt-1 text-xl leading-none font-semibold tabular-nums">{d.getDate()}</span>
      <span className="pb-1.5 pt-0.5 text-[10px] font-medium text-slate-400 uppercase">
        {d.toLocaleDateString('en-IN', { weekday: 'short' })}
      </span>
    </div>
  )
}

export function Kbd({ children }) {
  return (
    <kbd className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-500 shadow-xs ring-1 ring-slate-200">
      {children}
    </kbd>
  )
}
