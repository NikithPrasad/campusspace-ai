import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hourglass, CheckCircle2, CalendarClock, Building2, PartyPopper, ArrowRight, Clock, Users, GitMerge } from 'lucide-react'
import api, { errorMessage, fmtDate, fmtRange, timeAgo } from '../../api'
import { Alert, Avatar, DateTile, PageHeader, Skeleton } from '../../components/ui'
import ReviewActions from '../../components/ReviewActions'
import { Spotlight, CountUp } from '../../components/Spotlight'
import { typeMeta } from '../../typeIcons'

function Kpi({ icon: Icon, label, value, foot, tone, index }) {
  return (
    <Spotlight style={{ animationDelay: `${index * 50}ms` }} className="card animate-fade-up overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-[34px] font-semibold leading-none tracking-tight tabular-nums text-ink">
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </p>
      <p className="mt-2 text-xs text-slate-400">{foot}</p>
    </Spotlight>
  )
}

const MIX = [
  { key: 'APPROVED', label: 'Approved', color: 'bg-emerald-500' },
  { key: 'PENDING', label: 'Pending', color: 'bg-amber-400' },
  { key: 'REJECTED', label: 'Rejected', color: 'bg-rose-500' },
  { key: 'CANCELLED', label: 'Cancelled', color: 'bg-slate-300' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(() => {
    Promise.all([api.get('/api/bookings/stats'), api.get('/api/bookings')])
      .then(([s, b]) => {
        setStats(s.data.stats)
        setBookings(b.data.bookings)
      })
      .catch((e) => setError(errorMessage(e)))
  }, [])

  useEffect(load, [load])

  const pending = useMemo(() => {
    const list = bookings.filter((b) => b.status === 'PENDING').sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    // `competing` comes from the server and includes requests on linked halls/rooms
    return list.map((b) => ({ ...b, overlaps: b.competing ?? 0 }))
  }, [bookings])

  const busiest = useMemo(() => {
    const m = {}
    bookings
      .filter((b) => ['APPROVED', 'PENDING'].includes(b.status) && b.resource)
      .forEach((b) => {
        m[b.resource._id] = m[b.resource._id] || { r: b.resource, n: 0 }
        m[b.resource._id].n++
      })
    return Object.values(m).sort((a, b) => b.n - a.n).slice(0, 4)
  }, [bookings])

  if (error) return <Alert>{error}</Alert>
  if (!stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  const b = stats.bookingsByStatus
  const r = stats.resourcesByStatus
  const total = MIX.reduce((a, m) => a + (b[m.key] || 0), 0)
  const totalSpaces = Object.values(r).reduce((a, n) => a + n, 0)
  const maxBusy = busiest[0]?.n || 1

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        title="Overview"
        subtitle="What needs your attention today, and how campus spaces are being used."
        action={<Link to="/admin/bookings" className="btn-secondary">All requests <ArrowRight className="h-4 w-4" /></Link>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi index={0} icon={Hourglass} label="Awaiting review" value={b.PENDING || 0} foot={b.PENDING ? 'Oldest first below' : 'Inbox zero'} tone="bg-amber-50 text-amber-600" />
        <Kpi index={1} icon={CheckCircle2} label="Approved" value={b.APPROVED || 0} foot={`${total ? Math.round(((b.APPROVED || 0) / total) * 100) : 0}% of all requests`} tone="bg-emerald-50 text-emerald-600" />
        <Kpi index={2} icon={CalendarClock} label="Upcoming bookings" value={stats.upcomingApproved} foot="Approved and not started yet" tone="bg-brand-50 text-brand-600" />
        <Kpi index={3} icon={Building2} label="Spaces open" value={`${r.AVAILABLE || 0}/${totalSpaces}`} foot={`${totalSpaces - (r.AVAILABLE || 0)} unavailable or in maintenance`} tone="bg-slate-100 text-slate-600" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.65fr_1fr]">
        {/* Review queue */}
        <section className="card animate-fade-up overflow-hidden [animation-delay:200ms]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold">Needs your review</h2>
              <p className="text-sm text-slate-500">Soonest first. Approving a slot auto-rejects overlapping requests.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/15 tabular-nums">{pending.length}</span>
          </div>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><PartyPopper className="h-6 w-6" /></span>
              <p className="mt-3 font-semibold text-ink">You're all caught up</p>
              <p className="mt-1 text-sm text-slate-500">New booking requests will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.map((bk) => {
                const meta = typeMeta(bk.resource?.type)
                return (
                  <li key={bk._id} className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50/60 sm:flex-row sm:items-center">
                    <DateTile date={bk.startTime} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${meta.tint}`}>
                          <meta.icon className="h-3 w-3" /> {bk.resource?.name}
                        </span>
                        {bk.overlaps > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-600/15">
                            <GitMerge className="h-3 w-3" /> Competes with {bk.overlaps}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 truncate text-sm font-medium text-ink">{bk.purpose}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><Avatar name={bk.user?.name} size="sm" /> {bk.user?.name}{bk.user?.department && ` · ${bk.user.department}`}
                          {bk.user?.designation === 'FACULTY' && <span className="rounded bg-violet-50 px-1 py-px text-[10px] font-semibold text-violet-700 ring-1 ring-violet-600/15">FACULTY</span>}
                        </span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtRange(bk.startTime, bk.endTime)}</span>
                        {bk.attendees && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {bk.attendees}</span>}
                        <span>{timeAgo(bk.createdAt)}</span>
                      </div>
                    </div>
                    <ReviewActions booking={bk} onDone={load} compact />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* Booking mix */}
          <section className="card animate-fade-up p-6 [animation-delay:260ms]">
            <h2 className="text-base font-semibold">Request mix</h2>
            <p className="text-sm text-slate-500">{total} requests in total</p>
            <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              {MIX.map((m) => (b[m.key] ? <div key={m.key} className={`${m.color} transition-all`} style={{ width: `${(b[m.key] / total) * 100}%` }} /> : null))}
            </div>
            <ul className="mt-5 space-y-2.5">
              {MIX.map((m) => (
                <li key={m.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${m.color}`} /> {m.label}</span>
                  <span className="tabular-nums text-slate-400">
                    <span className="font-semibold text-ink">{b[m.key] || 0}</span>
                    <span className="ml-2 inline-block w-9 text-right">{total ? Math.round(((b[m.key] || 0) / total) * 100) : 0}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Busiest spaces */}
          <section className="card animate-fade-up p-6 [animation-delay:320ms]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Most requested</h2>
              <Link to="/admin/resources" className="text-sm font-medium text-brand-600 hover:text-brand-700">Manage</Link>
            </div>
            {busiest.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No active bookings yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {busiest.map(({ r: res, n }) => {
                  const meta = typeMeta(res.type)
                  return (
                    <li key={res._id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-ink">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.tint}`}><meta.icon className="h-3.5 w-3.5" /></span>
                          {res.name}
                        </span>
                        <span className="tabular-nums text-slate-500">{n}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full bg-gradient-to-r ${meta.cover}`} style={{ width: `${(n / maxBusy) * 100}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-5 text-xs text-slate-400">Counts pending and approved requests · {fmtDate(new Date())}</p>
          </section>
        </div>
      </div>
    </>
  )
}
