import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Users, ChevronLeft, ChevronRight, Check, CalendarDays, Clock, AlertTriangle,
  CheckCircle2, Info, Send, Loader2, Tag, Merge, Layers,
} from 'lucide-react'
import api, { errorMessage, fmtDate, fmtDuration, fmtRange, toDateInput, floorLabel } from '../api'
import { Alert, Badge, Field, GlassBadge, Skeleton } from '../components/ui'
import { useConfirm, useToast } from '../context/feedback'
import { requestBooking } from '../bookingFlow'
import { typeMeta } from '../typeIcons'

const DAY_START = 7
const DAY_END = 22
const SPAN = DAY_END - DAY_START

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (mins) => {
  const m = Math.max(0, Math.min(mins, 23 * 60 + 59))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
const pct = (mins) => Math.min(100, Math.max(0, ((mins / 60 - DAY_START) / SPAN) * 100))
const minsOf = (d) => new Date(d).getHours() * 60 + new Date(d).getMinutes()

function Timeline({ slots, selection, conflict, isToday, onPick, disabled }) {
  const hours = Array.from({ length: SPAN + 1 }, (_, i) => DAY_START + i)
  const nowPct = isToday ? pct(minsOf(new Date())) : 0

  const handleClick = (e) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const mins = Math.round((DAY_START * 60 + ratio * SPAN * 60) / 30) * 30
    onPick(mins)
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className={`relative h-24 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-900/[0.06] ${disabled ? '' : 'cursor-crosshair'}`}
        title={disabled ? undefined : 'Click to choose a start time'}
      >
        {/* past time on today */}
        {nowPct > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,rgb(148_163_184/0.12)_0_6px,transparent_6px_12px)]"
            style={{ width: `${nowPct}%` }}
          />
        )}
        {hours.slice(1, -1).map((h) => (
          <div key={h} className="absolute inset-y-0 w-px bg-slate-900/[0.05]" style={{ left: `${pct(h * 60)}%` }} />
        ))}

        {slots.map((s, i) => {
          const l = pct(minsOf(s.startTime))
          const w = Math.max(1.5, pct(minsOf(s.endTime)) - l)
          const approved = s.status === 'APPROVED'
          return (
            <div
              key={i}
              title={`${fmtRange(s.startTime, s.endTime)} · ${approved ? 'Booked' : 'Requested'}${s.via ? ` via ${s.via}` : ''}`}
              className={`absolute inset-y-3 flex items-end overflow-hidden rounded-lg px-2 pb-1.5 text-[11px] font-medium ${
                approved
                  ? 'bg-gradient-to-b from-rose-400 to-rose-500 text-white shadow-sm'
                  : 'bg-[repeating-linear-gradient(135deg,rgb(251_191_36/0.35)_0_6px,rgb(251_191_36/0.2)_6px_12px)] text-amber-900 ring-1 ring-amber-400/60'
              }`}
              style={{ left: `${l}%`, width: `${w}%` }}
            >
              <span className="truncate">{s.via ? 'Linked' : approved ? 'Booked' : 'Requested'}</span>
            </div>
          )
        })}

        {selection && (
          <div
            className={`absolute inset-y-1.5 flex items-start overflow-hidden rounded-lg border-2 border-dashed px-2 pt-1 text-[11px] font-semibold transition-all duration-300 ${
              conflict ? 'border-rose-500 bg-rose-500/10 text-rose-700' : 'border-brand-500 bg-brand-500/10 text-brand-700'
            }`}
            style={{ left: `${pct(selection.start)}%`, width: `${Math.max(1.5, pct(selection.end) - pct(selection.start))}%` }}
          >
            <span className="truncate">You</span>
          </div>
        )}

        {isToday && nowPct > 0 && nowPct < 100 && (
          <div className="absolute inset-y-0 w-0.5 bg-brand-500" style={{ left: `${nowPct}%` }}>
            <span className="absolute -left-[3px] -top-0.5 h-2 w-2 rounded-full bg-brand-500" />
          </div>
        )}
      </div>
      <div className="relative mt-2 h-4 font-mono text-[10px] text-slate-400">
        {hours.filter((h) => h % 2 === 1).map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${pct(h * 60)}%` }}>
            {String(h).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-900/10" /> Free</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-200 ring-1 ring-amber-400/60" /> Requested</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500" /> Booked</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2 border-dashed border-brand-500" /> Your selection</span>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 rounded-3xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  )
}

export default function ResourceDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const toast = useToast()
  const confirm = useConfirm()
  const [myBookings, setMyBookings] = useState([])
  const [resource, setResource] = useState(null)
  const [partOf, setPartOf] = useState([])
  const [floorRooms, setFloorRooms] = useState([])
  const [loadError, setLoadError] = useState('')
  // Date/time can be pre-filled from the floor plan (?date=…&from=…&to=…)
  const [date, setDate] = useState(() => {
    const q = params.get('date')
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q) && q >= toDateInput(new Date())) return q
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toDateInput(d)
  })
  const [slots, setSlots] = useState([])
  const [form, setForm] = useState(() => {
    const ok = (t) => t && /^\d{2}:\d{2}$/.test(t)
    return {
      start: ok(params.get('from')) ? params.get('from') : '10:00',
      end: ok(params.get('to')) ? params.get('to') : '11:00',
      purpose: '',
      attendees: '',
    }
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null)

  useEffect(() => {
    api
      .get(`/api/resources/${id}`)
      .then((r) => {
        const res = r.data.resource
        setResource(res)
        setPartOf(r.data.partOf || [])
        if (res.building && res.floor !== undefined) {
          api
            .get('/api/resources', { params: { building: res.building, floor: res.floor } })
            .then((f) => setFloorRooms(f.data.resources))
            .catch(() => {})
        }
      })
      .catch((e) => setLoadError(errorMessage(e)))
  }, [id])

  const loadMine = useCallback(() => {
    api
      .get('/api/bookings/my')
      .then((r) => setMyBookings(r.data.bookings.filter((b) => ['PENDING', 'APPROVED'].includes(b.status))))
      .catch(() => {})
  }, [])

  useEffect(loadMine, [loadMine])

  const loadSlots = useCallback(() => {
    api
      .get(`/api/resources/${id}/availability`, { params: { date, tzOffset: new Date().getTimezoneOffset() } })
      .then((r) => setSlots(r.data.bookedSlots))
      .catch(() => setSlots([]))
  }, [id, date])

  useEffect(loadSlots, [loadSlots])

  const todayStr = toDateInput(new Date())
  const shiftDay = (n) => {
    const d = new Date(`${date}T00:00:00`)
    d.setDate(d.getDate() + n)
    const next = toDateInput(d)
    if (next >= todayStr) setDate(next)
  }

  const selection = useMemo(() => {
    const s = toMin(form.start)
    const e = toMin(form.end)
    return e > s ? { start: s, end: e } : null
  }, [form.start, form.end])

  const clash = useMemo(() => {
    if (!selection) return { approved: false, pending: false }
    const hits = slots.filter((s) => minsOf(s.startTime) < selection.end && minsOf(s.endTime) > selection.start)
    return { approved: hits.some((h) => h.status === 'APPROVED'), pending: hits.some((h) => h.status === 'PENDING') }
  }, [slots, selection])

  // One room at a time: does this user already hold another room at the chosen time?
  const myOverlap = useMemo(() => {
    if (!selection) return []
    const s0 = new Date(`${date}T${form.start}`)
    const e0 = new Date(`${date}T${form.end}`)
    return myBookings.filter((b) => b.resource?._id !== id && new Date(b.startTime) < e0 && new Date(b.endTime) > s0)
  }, [myBookings, selection, date, form.start, form.end, id])

  const duration = selection ? (selection.end - selection.start) * 60000 : 0
  const inPast = selection && new Date(`${date}T${form.start}`) <= new Date()

  const setDuration = (hours) => setForm((f) => ({ ...f, end: toHHMM(toMin(f.start) + hours * 60) }))
  const pickStart = (mins) =>
    setForm((f) => {
      const len = Math.max(30, toMin(f.end) - toMin(f.start))
      return { ...f, start: toHHMM(mins), end: toHHMM(mins + len) }
    })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload = {
        resource: id,
        startTime: new Date(`${date}T${form.start}`).toISOString(),
        endTime: new Date(`${date}T${form.end}`).toISOString(),
        purpose: form.purpose,
      }
      if (form.attendees) payload.attendees = Number(form.attendees)
      const created = await requestBooking(payload, confirm)
      if (!created) return
      setSent(created)
      toast({ title: 'Request sent', message: `${resource.name} · ${fmtDate(payload.startTime)}, ${fmtRange(payload.startTime, payload.endTime)}` })
      setForm((f) => ({ ...f, purpose: '', attendees: '' }))
      window.dispatchEvent(new Event('bookings:changed'))
      loadSlots()
      loadMine()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>
  if (!resource) return <DetailSkeleton />

  const meta = typeMeta(resource.type)
  const Icon = meta.icon
  const bookable = resource.availabilityStatus === 'AVAILABLE'
  const approvedCount = slots.filter((s) => s.status === 'APPROVED').length

  return (
    <>
      <Link to="/" className="mb-5 inline-flex animate-fade-up items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All spaces
      </Link>

      {/* Hero */}
      <div className={`relative mb-6 animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br ${meta.cover} shadow-lift ${bookable ? '' : 'saturate-[.3]'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_0%,rgb(255_255_255/0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-dots opacity-40 [mask-image:linear-gradient(to_left,black,transparent_75%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
        <Icon className="absolute -bottom-10 right-6 h-56 w-56 text-white/15" strokeWidth={1} />
        <div className="relative flex min-h-56 flex-col justify-between gap-10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-md">
                <Icon className="h-3.5 w-3.5" /> {resource.combinedFrom?.length ? 'Combined seminar hall' : meta.label}
              </span>
              {resource.floor !== undefined && resource.building && (
                <span className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                  <Layers className="h-3.5 w-3.5" /> {resource.building} · {floorLabel(resource.floor)}
                </span>
              )}
            </div>
            <GlassBadge value={resource.availabilityStatus} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-white sm:text-[40px] sm:leading-tight">{resource.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/85">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {resource.location}</span>
              {resource.capacity && <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {resource.capacity} people</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Schedule */}
          <section className="card animate-fade-up p-6 [animation-delay:80ms]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold"><CalendarDays className="h-4 w-4 text-slate-400" /> Schedule</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {slots.length === 0 ? 'Wide open. Nothing booked yet.' : `${approvedCount} booked · ${slots.length - approvedCount} awaiting approval`}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-slate-50 p-1 ring-1 ring-slate-900/5">
                <button className="btn-icon h-8 w-8" onClick={() => shiftDay(-1)} disabled={date <= todayStr} aria-label="Previous day">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  className="h-8 rounded-lg bg-transparent px-2 text-sm font-medium text-ink outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={date}
                  min={todayStr}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                />
                <button className="btn-icon h-8 w-8" onClick={() => shiftDay(1)} aria-label="Next day">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Timeline
              slots={slots}
              selection={bookable && !sent ? selection : null}
              conflict={clash.approved}
              isToday={date === todayStr}
              onPick={pickStart}
              disabled={!bookable}
            />

            {slots.length > 0 && (
              <ul className="mt-5 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-900/[0.06]">
                {slots.map((s, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="flex items-center gap-2.5 font-medium tabular-nums text-ink">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> {fmtRange(s.startTime, s.endTime)}
                      <span className="font-normal text-slate-400">{fmtDuration(new Date(s.endTime) - new Date(s.startTime))}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {s.via && <span className="hidden text-xs text-slate-400 sm:inline">via {s.via}</span>}
                      <Badge value={s.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Linked rooms */}
          {(resource.combinedFrom?.length > 0 || partOf.length > 0) && (
            <section className="card relative animate-fade-up overflow-hidden p-6 [animation-delay:110ms]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl" />
              <div className="relative flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-600/10">
                  <Merge className="h-5 w-5 rotate-90" />
                </span>
                <div className="min-w-0 flex-1">
                  {resource.combinedFrom?.length > 0 ? (
                    <>
                      <h2 className="text-base font-semibold">Made from two classrooms</h2>
                      <p className="mt-1 text-sm text-slate-500">The partition between these rooms opens up. Booking the hall reserves both, and a booking in either room blocks the hall.</p>
                      <div className="mt-4 flex items-center gap-2">
                        {resource.combinedFrom.map((p, i) => (
                          <span key={p._id} className="contents">
                            {i > 0 && <span className="text-slate-300">+</span>}
                            <Link to={`/resources/${p._id}`} className="group flex flex-1 items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-900/5 transition hover:bg-white hover:shadow-card">
                              <span>
                                <span className="block font-mono text-sm font-semibold text-ink">{p.roomNumber || p.name}</span>
                                <span className="text-xs text-slate-500">{p.capacity} seats</span>
                              </span>
                              <Badge value={p.availabilityStatus} />
                            </Link>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-base font-semibold">Can open into a seminar hall</h2>
                      <p className="mt-1 text-sm text-slate-500">When the hall below is booked, this classroom is blocked too.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {partOf.map((h) => (
                          <Link key={h._id} to={`/resources/${h._id}`} className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-800 ring-1 ring-violet-600/10 transition hover:bg-violet-100">
                            {h.name} <span className="text-violet-500">· {h.capacity} seats</span>
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Floor map */}
          {floorRooms.filter((r) => r.type === 'CLASSROOM').length > 1 && (
            <section className="card animate-fade-up p-6 [animation-delay:120ms]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold"><Layers className="h-4 w-4 text-slate-400" /> {resource.building} · {floorLabel(resource.floor)}</h2>
                <Link to="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">Full floor plan</Link>
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {floorRooms
                  .filter((r) => r.type === 'CLASSROOM')
                  .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber)))
                  .map((r) => {
                    const here = r._id === resource._id || resource.combinedFrom?.some((p) => p._id === r._id)
                    return (
                      <Link key={r._id} to={`/resources/${r._id}`}
                        className={`rounded-lg py-2 text-center font-mono text-[11px] font-semibold ring-1 transition ${
                          here ? 'bg-ink text-white ring-ink shadow-card' : r.availabilityStatus !== 'AVAILABLE' ? 'bg-slate-50 text-slate-300 ring-slate-100' : 'bg-white text-slate-500 ring-slate-200 hover:text-ink hover:ring-slate-300'
                        }`}>
                        {r.roomNumber}
                      </Link>
                    )
                  })}
              </div>
            </section>
          )}

          {/* About */}
          <section className="card animate-fade-up p-6 [animation-delay:140ms]">
            <h2 className="text-base font-semibold">About this space</h2>
            {resource.description && <p className="mt-2 leading-relaxed text-slate-600">{resource.description}</p>}
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Users, k: 'Capacity', v: resource.capacity ? `${resource.capacity} people` : '—' },
                { icon: Tag, k: 'Type', v: meta.label },
                resource.floor !== undefined && resource.building
                  ? { icon: Layers, k: 'Where', v: `${resource.building}, ${floorLabel(resource.floor)}` }
                  : { icon: MapPin, k: 'Location', v: resource.location },
              ].map(({ icon: I, k, v }) => (
                <div key={k} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-900/[0.04]">
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500"><I className="h-3.5 w-3.5" /> {k}</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {resource.amenities?.length > 0 && (
              <>
                <h3 className="eyebrow mb-3 mt-6">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {resource.amenities.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 shadow-xs ring-1 ring-slate-200">
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> {a}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Booking panel */}
        <aside className="card animate-fade-up overflow-hidden [animation-delay:120ms] lg:sticky lg:top-8">
          {sent ? (
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 animate-scale-in items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Request sent</h2>
              <p className="mt-1 text-sm text-slate-500">An admin will review it shortly. You'll see the decision in My bookings.</p>
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-sm ring-1 ring-slate-900/5">
                <p className="font-semibold text-ink">{resource.name}</p>
                <p className="mt-1 text-slate-500">{fmtDate(sent.startTime)} · {fmtRange(sent.startTime, sent.endTime)}</p>
                <div className="mt-3"><Badge value={sent.status} /></div>
              </div>
              <div className="mt-5 grid gap-2">
                <Link to="/my-bookings" className="btn-primary">View my bookings</Link>
                <button className="btn-ghost" onClick={() => setSent(null)}>Book another slot</button>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 py-5">
                <h2 className="text-base font-semibold">Request this space</h2>
                <p className="mt-0.5 text-sm text-slate-500">Pick a time. An admin approves each request.</p>
              </div>
              <form onSubmit={submit} className="space-y-4 p-6">
                {!bookable && (
                  <Alert className="!mb-0">This space is {resource.availabilityStatus.toLowerCase()} right now and can't take new bookings.</Alert>
                )}
                <Alert onClose={() => setError('')} className="!mb-0">{error}</Alert>

                <Field label="Date">
                  <input type="date" className="input" required value={date} min={todayStr} onChange={(e) => e.target.value && setDate(e.target.value)} disabled={!bookable} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="From">
                    <input type="time" step={900} className="input tabular-nums" required value={form.start} disabled={!bookable}
                      onChange={(e) => setForm({ ...form, start: e.target.value })} />
                  </Field>
                  <Field label="To">
                    <input type="time" step={900} className="input tabular-nums" required value={form.end} disabled={!bookable}
                      onChange={(e) => setForm({ ...form, end: e.target.value })} />
                  </Field>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock className="h-3.5 w-3.5" /> <span className="font-medium text-ink">{fmtDuration(duration)}</span>
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((h) => (
                      <button key={h} type="button" disabled={!bookable} onClick={() => setDuration(h)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition ${
                          duration === h * 3600000 ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
                        }`}>
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                {bookable && clash.approved && (
                  <div className="flex gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800 ring-1 ring-rose-600/15">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This overlaps a booked slot. Choose another time.
                  </div>
                )}
                {bookable && !clash.approved && clash.pending && (
                  <div className="flex gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900 ring-1 ring-amber-600/15">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" /> Someone else has requested part of this slot. The admin will pick one.
                  </div>
                )}
                {bookable && myOverlap.length > 0 && (
                  <div className="flex gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900 ring-1 ring-amber-600/15">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      You already have <b className="font-semibold">{myOverlap[0].resource?.name}</b> {myOverlap[0].status === 'APPROVED' ? 'booked' : 'requested'} {fmtRange(myOverlap[0].startTime, myOverlap[0].endTime)}
                      {myOverlap.length > 1 && <> and {myOverlap.length - 1} more</>}.
                      We'll ask you to confirm before booking a second room at the same time.
                    </span>
                  </div>
                )}
                {bookable && inPast && (
                  <div className="flex gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600 ring-1 ring-slate-900/5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" /> That start time has already passed.
                  </div>
                )}

                <Field label="Purpose" hint={`${form.purpose.length}/300 · at least 5 characters`}>
                  <textarea className="textarea" rows={3} required minLength={5} maxLength={300} disabled={!bookable}
                    placeholder="e.g. Coding club orientation for first-years"
                    value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
                </Field>

                <Field label="Expected attendees" optional>
                  <div className="relative">
                    <input type="number" className="input pr-20" min={1} max={resource.capacity || undefined} disabled={!bookable}
                      placeholder="0" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} />
                    {resource.capacity && (
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">of {resource.capacity}</span>
                    )}
                  </div>
                </Field>

                <button className="btn-brand btn-lg w-full" disabled={busy || !bookable || !selection || clash.approved || inPast}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send request</>}
                </button>
                <p className="text-center text-xs text-slate-400">Tip: click anywhere on the timeline to set the start time.</p>
              </form>
            </>
          )}
        </aside>
      </div>
    </>
  )
}
