import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Compass, CalendarCheck2, LayoutDashboard, Inbox, Building2, LogOut, Menu, X, Search, Radio, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { useHotkey } from '../hooks'
import { Avatar } from './ui'
import CommandPalette from './CommandPalette'
import AlternativesModal from './AlternativesModal'
import { BellButton, NotificationPanel } from './Notifications'

export function Logo({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-violet-600 shadow-[var(--shadow-inner-top),0_6px_16px_-6px_rgb(99_102_241/0.8)]">
        <svg viewBox="7 6.5 18 17" className="h-[18px] w-[18px]" aria-hidden>
          <path d="M9 21.5V13l7-4.5 7 4.5v8.5h-4.2v-5.2h-5.6v5.2z" fill="#fff" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className={`block text-[15px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>CampusSpace</span>
        <span className={`block text-[10px] font-medium tracking-[0.16em] uppercase ${dark ? 'text-white/40' : 'text-slate-400'}`}>VNR VJIET</span>
      </span>
    </div>
  )
}

function NavItem({ to, icon: Icon, children, end, badge, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]' : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-300 to-violet-400" />}
          <Icon className={`h-[18px] w-[18px] transition ${isActive ? 'text-brand-300' : 'text-white/35 group-hover:text-white/70'}`} />
          <span className="flex-1">{children}</span>
          {badge > 0 && (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200 tabular-nums ring-1 ring-amber-300/20">{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

function Sidebar({ onNavigate, onSearch, unread, onBell }) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [pending, setPending] = useState(0)
  const [live, setLive] = useState(null)

  // Pending-request badge for admins
  useEffect(() => {
    if (!isAdmin) return
    const refresh = () =>
      api
        .get('/api/bookings/stats')
        .then((r) => setPending(r.data.stats.bookingsByStatus.PENDING || 0))
        .catch(() => {})
    refresh()
    window.addEventListener('bookings:changed', refresh)
    return () => window.removeEventListener('bookings:changed', refresh)
  }, [isAdmin, location.pathname])

  // "Free right now" pulse
  useEffect(() => {
    const start = new Date()
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    api
      .get('/api/resources/status', { params: { start: start.toISOString(), end: end.toISOString() } })
      .then((r) => {
        const all = Object.values(r.data.statuses)
        setLive({ free: all.filter((s) => s.state === 'FREE').length, total: all.length })
      })
      .catch(() => {})
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-[90px]" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_35%)]" />

      <div className="relative px-5 pb-5 pt-6">
        <Logo dark />
      </div>

      <div className="relative flex gap-2 px-3 pb-5">
        <button
          onClick={onSearch}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2.5 text-sm text-white/45 ring-1 ring-white/10 transition hover:bg-white/[0.08] hover:text-white/70"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">Search rooms…</span>
          <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">Ctrl K</kbd>
        </button>
        <BellButton unread={unread} onClick={onBell} />
      </div>

      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3">
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-white/30 uppercase">Workspace</p>
          <div className="space-y-0.5">
            <NavItem to="/" icon={Compass} end onClick={onNavigate}>Explore spaces</NavItem>
            <NavItem to="/my-bookings" icon={CalendarCheck2} onClick={onNavigate}>My bookings</NavItem>
          </div>
        </div>

        {isAdmin && (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-white/30 uppercase">Administration</p>
            <div className="space-y-0.5">
              <NavItem to="/admin" icon={LayoutDashboard} end onClick={onNavigate}>Overview</NavItem>
              <NavItem to="/admin/bookings" icon={Inbox} badge={pending} onClick={onNavigate}>Requests</NavItem>
              <NavItem to="/admin/resources" icon={Building2} onClick={onNavigate}>Spaces</NavItem>
            </div>
          </div>
        )}
      </nav>

      {live && (
        <div className="relative mx-3 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400/15 to-emerald-400/[0.03] p-4 ring-1 ring-emerald-300/15">
          <p className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-emerald-200/80 uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live
          </p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
            {live.free}
            <span className="text-sm font-normal text-white/40"> / {live.total}</span>
          </p>
          <p className="text-xs text-white/50">spaces free for the next hour</p>
          <Radio className="absolute -bottom-3 -right-3 h-16 w-16 text-emerald-300/10" />
        </div>
      )}

      <div className="relative m-3 mt-0 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/45">
              {isAdmin ? 'Administrator' : [user?.designation === 'FACULTY' ? 'Faculty' : user?.designation === 'STAFF' ? 'Staff' : 'Student', user?.department].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-white/45 transition hover:bg-white/10 hover:text-white" title="Log out" aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Notifications: polled every minute, on navigation and whenever bookings change.
// An unread "your slot went to someone else" notification pops up by itself with similar rooms.
function useNotifications() {
  const location = useLocation()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [popup, setPopup] = useState(null)
  const shown = useRef(new Set())

  const refresh = useCallback(() => {
    api
      .get('/api/notifications')
      .then((r) => {
        setItems(r.data.notifications)
        setUnread(r.data.unread)
        const next = r.data.notifications.find((n) => !n.read && n.type === 'SLOT_TAKEN' && n.booking && !shown.current.has(n._id))
        if (next) {
          shown.current.add(next._id)
          setPopup((cur) => cur || { noteId: next._id, bookingId: next.booking._id, heading: next.title })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, location.pathname])

  useEffect(() => {
    const t = setInterval(refresh, 60000)
    window.addEventListener('bookings:changed', refresh)
    return () => {
      clearInterval(t)
      window.removeEventListener('bookings:changed', refresh)
    }
  }, [refresh])

  const markRead = useCallback(
    (id) => api.patch(`/api/notifications/${id}/read`, {}).then(refresh).catch(() => {}),
    [refresh]
  )
  const markAllRead = useCallback(() => api.patch('/api/notifications/read-all', {}).then(refresh).catch(() => {}), [refresh])

  return { items, unread, popup, setPopup, markRead, markAllRead }
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const [panel, setPanel] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const notes = useNotifications()
  const openPalette = useCallback(() => {
    setOpen(false)
    setPalette(true)
  }, [])
  const openBell = useCallback(() => {
    setOpen(false)
    setPanel(true)
  }, [])
  useHotkey('k', openPalette)

  const openNote = (n) => {
    if (!n.read) notes.markRead(n._id)
    setPanel(false)
    if (n.type === 'SLOT_TAKEN' && n.booking) notes.setPopup({ noteId: n._id, bookingId: n.booking._id, heading: n.title })
    else navigate('/my-bookings')
  }

  const closePopup = () => {
    if (notes.popup?.noteId) notes.markRead(notes.popup.noteId)
    notes.setPopup(null)
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 lg:block">
        <Sidebar onSearch={openPalette} unread={notes.unread} onBell={openBell} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Logo dark />
        <div className="flex items-center gap-1">
          <button className="relative rounded-lg p-2 text-white/70 hover:bg-white/10" onClick={openBell} aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {notes.unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-ink" />}
          </button>
          <button className="rounded-lg p-2 text-white/70 hover:bg-white/10" onClick={openPalette} aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 text-white/70 hover:bg-white/10" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-slide-in shadow-pop">
            <button className="absolute right-3 top-5 z-10 rounded-lg p-2 text-white/60 hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} onSearch={openPalette} unread={notes.unread} onBell={openBell} />
          </div>
        </div>
      )}

      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      {panel && (
        <NotificationPanel items={notes.items} unread={notes.unread} onClose={() => setPanel(false)} onReadAll={notes.markAllRead} onOpen={openNote} />
      )}
      {notes.popup && (
        <AlternativesModal key={notes.popup.bookingId} bookingId={notes.popup.bookingId} heading={notes.popup.heading} onClose={closePopup} />
      )}

      <main className="relative lg:pl-68">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(99_102_241/0.07),transparent)]" />
        <div key={location.pathname} className="relative mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
