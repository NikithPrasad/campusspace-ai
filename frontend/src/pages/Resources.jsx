import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MapPin, Users, Search, X, ArrowUpRight, LayoutGrid, SearchX, Building, CalendarDays, Clock, Sparkles, Map as MapIcon,
  Rows3, Merge,
} from 'lucide-react'
import api, { errorMessage, greeting, RESOURCE_TYPES, toDateInput, localDateTime, fmtTime } from '../api'
import { useAuth } from '../context/AuthContext'
import { Alert, EmptyState, GlassBadge, Segmented, Skeleton } from '../components/ui'
import { Spotlight, CountUp } from '../components/Spotlight'
import FloorPlan, { Legend } from '../components/FloorPlan'
import { STATE_META, stateOf } from '../status'
import { typeMeta } from '../typeIcons'

const BLOCK = 'E Block'

function defaultWindow() {
  const now = new Date()
  const d = new Date(now)
  let mins = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 30) * 30
  if (mins > 21 * 60) {
    d.setDate(d.getDate() + 1)
    mins = 9 * 60
  }
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return { date: toDateInput(d), from: hhmm(mins), to: hhmm(Math.min(mins + 60, 23 * 60 + 59)) }
}

export function ResourceCard({ r, index = 0, live, linkQuery = '' }) {
  const meta = typeMeta(r.type)
  const Icon = meta.icon
  const available = r.availabilityStatus === 'AVAILABLE'
  const extra = (r.amenities?.length || 0) - 3
  const lm = live && STATE_META[live.state]

  return (
    <Spotlight
      as={Link}
      to={`/resources/${r._id}${linkQuery}`}
      style={{ animationDelay: `${index * 40}ms` }}
      className="card flex animate-fade-up flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${meta.cover} ${available ? '' : 'saturate-[.3]'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgb(255_255_255/0.28),transparent_55%)]" />
        <div className="absolute inset-0 bg-dots opacity-40 [mask-image:linear-gradient(to_bottom_left,black,transparent_65%)]" />
        <Icon className="absolute -bottom-4 right-4 h-24 w-24 text-white/15 transition duration-500 group-hover/spot:rotate-[-6deg] group-hover/spot:scale-110" strokeWidth={1.25} />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-md">
            {r.combinedFrom?.length ? <Merge className="h-4 w-4 rotate-90 text-white" /> : <Icon className="h-4 w-4 text-white" />}
          </span>
          {r.roomNumber && <span className="rounded-lg bg-black/15 px-2 py-1 font-mono text-xs font-semibold text-white backdrop-blur">{r.roomNumber}</span>}
        </div>
        <div className="absolute right-4 top-4">
          {lm ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink shadow-sm backdrop-blur">
              <span className={`h-1.5 w-1.5 rounded-full ${lm.dot}`} /> {lm.label}
            </span>
          ) : (
            <GlassBadge value={r.availabilityStatus} />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{r.combinedFrom?.length ? 'Combined seminar hall' : meta.label}</p>
        <h3 className="mt-1 text-[17px] font-semibold text-ink">{r.name}</h3>
        <div className="mt-3 space-y-1.5 text-sm text-slate-500">
          <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {r.location}</p>
          {r.capacity && <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-slate-400" /> Up to {r.capacity} people</p>}
        </div>
        {r.amenities?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {r.amenities.slice(0, 3).map((a) => (
              <span key={a} className="rounded-md bg-slate-50 px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-900/5">{a}</span>
            ))}
            {extra > 0 && <span className="rounded-md px-1.5 py-0.5 text-xs text-slate-400">+{extra}</span>}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-5 text-sm">
          <span className={`font-medium ${available ? 'text-ink' : 'text-slate-400'}`}>{available ? 'View schedule & book' : 'View details'}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-900/5 transition group-hover/spot:bg-ink group-hover/spot:text-white">
            <ArrowUpRight className="h-4 w-4 transition group-hover/spot:rotate-45" />
          </span>
        </div>
      </div>
    </Spotlight>
  )
}

function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-28 rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-48" />
      </div>
    </div>
  )
}

function HeroField({ icon: Icon, label, children }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl px-3 py-2 transition hover:bg-white/[0.06] focus-within:bg-white/[0.08]">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
        <Icon className="h-3 w-3" /> {label}
      </span>
      {children}
    </label>
  )
}

const heroInput = 'w-full bg-transparent text-[15px] font-medium text-white outline-none [color-scheme:dark] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0'

export default function Resources() {
  const { user } = useAuth()
  const [resources, setResources] = useState(null)
  const [statuses, setStatuses] = useState(null)
  const [params] = useSearchParams()
  // ?date=&from=&to= (e.g. from the "similar rooms" pop-up) opens the plan at that time
  const [win, setWin] = useState(() => {
    const d = defaultWindow()
    const ok = (t) => t && /^\d{2}:\d{2}$/.test(t)
    const date = params.get('date')
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && ok(params.get('from')) && ok(params.get('to'))) {
      return { date, from: params.get('from'), to: params.get('to') }
    }
    return d
  })
  const [minSeats, setMinSeats] = useState('')
  const [view, setView] = useState('plan')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/resources')
      .then((res) => setResources(res.data.resources))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  const start = localDateTime(win.date, win.from)
  const end = localDateTime(win.date, win.to)
  const validWindow = end > start

  useEffect(() => {
    if (!(localDateTime(win.date, win.to) > localDateTime(win.date, win.from))) return
    const t = setTimeout(() => {
      api
        .get('/api/resources/status', {
          params: { start: localDateTime(win.date, win.from).toISOString(), end: localDateTime(win.date, win.to).toISOString() },
        })
        .then((r) => setStatuses(r.data.statuses))
        .catch(() => {})
    }, 200)
    return () => clearTimeout(t)
  }, [win])

  const seats = Number(minSeats) || 0
  const linkQuery = `?date=${win.date}&from=${win.from}&to=${win.to}`

  const counts = useMemo(() => {
    const c = { FREE: 0, REQUESTED: 0, BOOKED: 0, MAINTENANCE: 0 }
    resources?.forEach((r) => {
      const s = stateOf(statuses, r).state
      if (s === 'UNAVAILABLE') c.MAINTENANCE++
      else c[s] = (c[s] || 0) + 1
    })
    return c
  }, [resources, statuses])

  const suggestions = useMemo(() => {
    if (!resources || !statuses) return []
    return resources
      .filter((r) => stateOf(statuses, r).state === 'FREE' && (r.capacity || 0) >= seats && ['CLASSROOM', 'SEMINAR_HALL', 'LAB'].includes(r.type))
      .sort((a, b) => (a.capacity || 0) - (b.capacity || 0) || String(a.roomNumber || a.name).localeCompare(String(b.roomNumber || b.name)))
      .slice(0, 6)
  }, [resources, statuses, seats])

  const blockSpaces = resources?.filter((r) => r.building === BLOCK) || []
  const halls = blockSpaces.filter((r) => r.combinedFrom?.length)
  const facilities = resources?.filter((r) => r.building !== BLOCK) || []

  const typeCounts = useMemo(() => {
    const c = { '': resources?.length || 0 }
    resources?.forEach((r) => (c[r.type] = (c[r.type] || 0) + 1))
    return c
  }, [resources])

  const visible = useMemo(() => {
    if (!resources) return []
    const q = search.trim().toLowerCase()
    return resources.filter(
      (r) =>
        (!type || r.type === type) &&
        (r.capacity || 0) >= seats &&
        (!q || [r.name, r.roomNumber, r.location, r.description, ...(r.amenities || [])].join(' ').toLowerCase().includes(q))
    )
  }, [resources, type, search, seats])

  const firstName = user?.name?.split(' ')[0]
  const setW = (k) => (e) => e.target.value && setWin((w) => ({ ...w, [k]: e.target.value }))

  return (
    <>
      {/* Hero */}
      <section className="relative mb-8 animate-fade-up overflow-hidden rounded-[28px] bg-ink p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-brand-600/40 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-[100px]" />
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(80%_90%_at_70%_0%,black,transparent)]" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/40 uppercase">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · VNR VJIET
            </p>
            <h1 className="mt-2 text-[30px] font-semibold leading-tight text-white sm:text-[40px]">
              {greeting()}, <span className="font-display text-[1.12em] font-normal italic text-brand-200">{firstName}</span>
            </h1>
            <p className="mt-2 max-w-lg text-[15px] text-white/55">Pick a time and see every room in E Block light up. Green means it's yours to book.</p>
          </div>
          <div className="flex gap-2">
            {[
              { k: 'FREE', label: 'Free', cls: 'from-emerald-400/20 text-emerald-200 ring-emerald-300/20' },
              { k: 'BOOKED', label: 'In use', cls: 'from-rose-400/20 text-rose-200 ring-rose-300/20' },
              { k: 'REQUESTED', label: 'Requested', cls: 'from-amber-400/20 text-amber-200 ring-amber-300/20' },
            ].map((s) => (
              <div key={s.k} className={`rounded-2xl bg-gradient-to-b to-transparent px-4 py-3 ring-1 ${s.cls}`}>
                <p className="text-2xl font-semibold text-white"><CountUp value={counts[s.k] || 0} /></p>
                <p className="text-[11px] font-medium tracking-wide uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Finder */}
        <div className="relative mt-7 flex flex-col gap-1 rounded-2xl bg-white/[0.06] p-1.5 ring-1 ring-white/10 backdrop-blur md:flex-row md:items-stretch">
          <HeroField icon={CalendarDays} label="Date">
            <input type="date" className={heroInput} value={win.date} min={toDateInput(new Date())} onChange={setW('date')} />
          </HeroField>
          <span className="hidden w-px bg-white/10 md:block" />
          <HeroField icon={Clock} label="From">
            <input type="time" step={900} className={heroInput} value={win.from} onChange={setW('from')} />
          </HeroField>
          <span className="hidden w-px bg-white/10 md:block" />
          <HeroField icon={Clock} label="To">
            <input type="time" step={900} className={heroInput} value={win.to} onChange={setW('to')} />
          </HeroField>
          <span className="hidden w-px bg-white/10 md:block" />
          <HeroField icon={Users} label="Seats needed">
            <input type="number" min={0} placeholder="Any" className={`${heroInput} placeholder:text-white/30`} value={minSeats} onChange={(e) => setMinSeats(e.target.value)} />
          </HeroField>
          <div className="flex items-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-inner-top)] md:py-0">
            <Sparkles className="mr-2 h-4 w-4" />
            {validWindow ? <><CountUp value={counts.FREE} />&nbsp;free</> : 'Check times'}
          </div>
        </div>

        {validWindow && suggestions.length > 0 && (
          <div className="relative mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/40">Best fits {fmtTime(start)}–{fmtTime(end)}:</span>
            {suggestions.map((r) => (
              <Link key={r._id} to={`/resources/${r._id}${linkQuery}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-white/85 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium">{r.roomNumber || r.name}</span>
                <span className="text-white/40">{r.capacity}</span>
              </Link>
            ))}
          </div>
        )}
        {!validWindow && <p className="relative mt-3 text-sm text-rose-300">The end time must be after the start time.</p>}
      </section>

      <Alert>{error}</Alert>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'plan', label: 'Floor plan', icon: MapIcon },
            { value: 'all', label: 'All spaces', icon: Rows3, count: resources?.length },
          ]}
        />
        {view === 'plan' && <Legend counts={counts} />}
      </div>

      {!resources ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
      ) : view === 'plan' ? (
        <>
          <section className="card mb-8 animate-fade-up p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Building className="h-5 w-5 text-brand-500" /> E Block</h2>
                <p className="text-sm text-slate-500">
                  {blockSpaces.length - halls.length} classrooms across 5 floors · {halls.length} combined seminar halls · {validWindow ? `${fmtTime(start)} – ${fmtTime(end)}` : ''}
                </p>
              </div>
              <p className="text-xs text-slate-400">Hover a room for details, click to book</p>
            </div>
            <FloorPlan block={BLOCK} resources={blockSpaces} statuses={statuses} minSeats={seats} linkQuery={linkQuery} />
          </section>

          {halls.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-1 text-lg font-semibold">Seminar halls</h2>
              <p className="mb-4 text-sm text-slate-500">Two neighbouring classrooms with the partition opened. Booking a hall reserves both rooms.</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {halls.map((r, i) => <ResourceCard key={r._id} r={r} index={i} live={statuses && stateOf(statuses, r)} linkQuery={linkQuery} />)}
              </div>
            </section>
          )}

          {facilities.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-semibold">Labs, sports & auditorium</h2>
              <p className="mb-4 text-sm text-slate-500">Other facilities around campus.</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {facilities.map((r, i) => <ResourceCard key={r._id} r={r} index={i} live={statuses && stateOf(statuses, r)} linkQuery={linkQuery} />)}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="mb-5 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input h-12 pl-10 pr-10" placeholder="Search by room number, name, block or amenity…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch('')} className="btn-icon absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
              {['', ...RESOURCE_TYPES].map((t) => {
                const meta = t ? typeMeta(t) : { icon: LayoutGrid, plural: 'All types' }
                const Icon = meta.icon
                const active = type === t
                if (t && !typeCounts[t]) return null
                return (
                  <button key={t || 'all'} onClick={() => setType(t)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium ring-1 transition ${
                      active ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-600 ring-slate-200 hover:text-ink hover:ring-slate-300'
                    }`}>
                    <Icon className="h-3.5 w-3.5" /> {meta.plural}
                    <span className={`tabular-nums ${active ? 'text-white/60' : 'text-slate-400'}`}>{typeCounts[t] || 0}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {visible.length === 0 ? (
            <EmptyState icon={SearchX} title="No spaces match"
              action={<button className="btn-secondary" onClick={() => { setType(''); setSearch(''); setMinSeats('') }}>Clear filters</button>}>
              Try a different search or remove a filter.
            </EmptyState>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((r, i) => <ResourceCard key={r._id} r={r} index={Math.min(i, 12)} live={statuses && stateOf(statuses, r)} linkQuery={linkQuery} />)}
            </div>
          )}
        </>
      )}
    </>
  )
}
