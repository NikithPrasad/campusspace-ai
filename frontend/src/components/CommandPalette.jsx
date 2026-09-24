import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, Compass, CalendarCheck2, LayoutDashboard, Inbox, Building2, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react'
import api from '../api'
import { typeMeta } from '../typeIcons'
import { useAuth } from '../context/AuthContext'

let cache = null

// Render it only while open ({open && <CommandPalette …/>}) so it starts fresh each time.
export default function CommandPalette({ onClose }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [q, setQ] = useState('')
  const [resources, setResources] = useState(cache || [])
  const [active, setActive] = useState(0)
  const listRef = useRef(null)

  useEffect(() => {
    api
      .get('/api/resources')
      .then((r) => {
        cache = r.data.resources
        setResources(cache)
      })
      .catch(() => {})
  }, [])

  const pages = useMemo(
    () => [
      { label: 'Explore spaces', hint: 'Floor plan & free rooms', icon: Compass, to: '/' },
      { label: 'My bookings', hint: 'Your requests', icon: CalendarCheck2, to: '/my-bookings' },
      ...(isAdmin
        ? [
            { label: 'Overview', hint: 'Admin dashboard', icon: LayoutDashboard, to: '/admin' },
            { label: 'Requests', hint: 'Approve or reject', icon: Inbox, to: '/admin/bookings' },
            { label: 'Spaces', hint: 'Manage & combine rooms', icon: Building2, to: '/admin/resources' },
          ]
        : []),
    ],
    [isAdmin]
  )

  const items = useMemo(() => {
    const t = q.trim().toLowerCase()
    const pageHits = pages.filter((p) => !t || p.label.toLowerCase().includes(t)).map((p) => ({ ...p, kind: 'Pages' }))
    const resHits = resources
      .filter((r) => !t || [r.name, r.roomNumber, r.location, r.type].join(' ').toLowerCase().includes(t))
      .sort((a, b) => {
        // exact room-number matches first (typing "E204" jumps straight to it)
        const ea = (a.roomNumber || '').toLowerCase() === t ? -1 : 0
        const eb = (b.roomNumber || '').toLowerCase() === t ? -1 : 0
        return ea - eb
      })
      .slice(0, t ? 12 : 6)
      .map((r) => ({
        kind: 'Spaces',
        label: r.name,
        hint: [r.location, r.capacity && `${r.capacity} seats`].filter(Boolean).join(' · '),
        icon: typeMeta(r.type).icon,
        tint: typeMeta(r.type).tint,
        to: `/resources/${r._id}`,
        status: r.availabilityStatus,
      }))
    return [...pageHits, ...resHits]
  }, [q, pages, resources])

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (item) => {
    onClose()
    navigate(item.to)
  }

  const onKey = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(items.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && items[active]) go(items[active])
  }

  let lastKind = null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" onKeyDown={onKey}>
      <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-slate-900/10">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            placeholder="Jump to a room (try E204), hall or page…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 && <p className="px-3 py-10 text-center text-sm text-slate-500">Nothing matches “{q}”.</p>}
          {items.map((it, i) => {
            const header = it.kind !== lastKind
            lastKind = it.kind
            const Icon = it.icon
            return (
              <div key={`${it.kind}-${it.to}`}>
                {header && <p className="eyebrow px-3 pb-1.5 pt-3">{it.kind}</p>}
                <button
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(it)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${i === active ? 'bg-slate-100' : ''}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${it.tint || 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{it.label}</span>
                    <span className="block truncate text-xs text-slate-500">{it.hint}</span>
                  </span>
                  {it.status && it.status !== 'AVAILABLE' && (
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{it.status.toLowerCase()}</span>
                  )}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> open</span>
          <span className="ml-auto">CampusSpace · VNR VJIET</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
