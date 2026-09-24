import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarX2, MapPin, Clock, Users, MessageSquareQuote, Plus, CalendarClock, Hourglass, ListChecks, Sparkles, Timer } from 'lucide-react'
import api, { errorMessage, fmtDuration, fmtRange, timeAgo } from '../api'
import { Alert, Badge, DateTile, EmptyState, PageHeader, Segmented, Skeleton } from '../components/ui'
import { useConfirm, useToast } from '../context/feedback'
import { typeMeta } from '../typeIcons'
import { CountUp } from '../components/Spotlight'
import AlternativesModal from '../components/AlternativesModal'

const isUpcoming = (b) => ['PENDING', 'APPROVED'].includes(b.status) && new Date(b.startTime) > new Date()

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${tone}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="text-xl font-semibold tabular-nums text-ink"><CountUp value={value} /></p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function startsIn(d) {
  const ms = new Date(d) - Date.now()
  if (ms <= 0) return null
  const h = Math.round(ms / 3600000)
  if (h < 1) return `Starts in ${Math.max(1, Math.round(ms / 60000))} min`
  if (h < 24) return `Starts in ${h}h`
  const days = Math.round(h / 24)
  return days === 1 ? 'Tomorrow' : `In ${days} days`
}

function BookingRow({ b, onCancel, onFindSimilar, index }) {
  const meta = typeMeta(b.resource?.type)
  const Icon = meta.icon
  const upcoming = isUpcoming(b)
  const canRetry = b.status === 'REJECTED' && new Date(b.startTime) > new Date()
  const soon = upcoming && startsIn(b.startTime)
  const actions = (
    <>
      {upcoming && (
        <button className="btn-secondary btn-sm text-rose-600 hover:text-rose-700" onClick={() => onCancel(b)}>Cancel</button>
      )}
      {canRetry && (
        <button className="btn-brand btn-sm" onClick={() => onFindSimilar(b)}>
          <Sparkles className="h-3.5 w-3.5" /> Find similar rooms
        </button>
      )}
    </>
  )
  return (
    <div
      style={{ animationDelay: `${index * 35}ms` }}
      className={`card flex animate-fade-up items-start gap-4 p-4 transition hover:shadow-lift sm:p-5 ${upcoming ? '' : 'bg-white/70'}`}
    >
      <DateTile date={b.startTime} tone={upcoming ? 'default' : 'muted'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.tint}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <Link to={b.resource ? `/resources/${b.resource._id}` : '#'} className="font-semibold text-ink hover:underline">
            {b.resource?.name || 'Deleted space'}
          </Link>
          <Badge value={b.status} />
          {b.autoRejected && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/15">Slot went to another request</span>}
          {soon && <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700"><Timer className="h-3 w-3" /> {soon}</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="flex items-center gap-1.5 tabular-nums"><Clock className="h-3.5 w-3.5" /> {fmtRange(b.startTime, b.endTime)} · {fmtDuration(new Date(b.endTime) - new Date(b.startTime))}</span>
          {b.resource?.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {b.resource.location}</span>}
          {b.attendees && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {b.attendees}</span>}
        </div>
        <p className="mt-2 text-sm text-slate-700">{b.purpose}</p>
        {b.adminRemark && b.adminRemark !== 'Approved' && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[13px] text-slate-600 ring-1 ring-slate-900/[0.04]">
            <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{b.adminRemark}</span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-3 sm:hidden">
          <span className="text-xs text-slate-400">Requested {timeAgo(b.createdAt)}</span>
          <div className="flex gap-2">{actions}</div>
        </div>
      </div>
      <div className="hidden flex-col items-end gap-3 sm:flex">
        <span className="text-xs text-slate-400">Requested {timeAgo(b.createdAt)}</span>
        {actions}
      </div>
    </div>
  )
}

export default function MyBookings() {
  const toast = useToast()
  const confirm = useConfirm()
  const [bookings, setBookings] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const [error, setError] = useState('')
  const [similarFor, setSimilarFor] = useState(null)

  const load = useCallback(() => {
    api
      .get('/api/bookings/my')
      .then((r) => setBookings(r.data.bookings))
      .catch((e) => setError(errorMessage(e)))
  }, [])

  useEffect(load, [load])

  const groups = useMemo(() => {
    const all = bookings || []
    const upcoming = all.filter(isUpcoming).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    const history = all.filter((b) => !isUpcoming(b))
    return { upcoming, history, all }
  }, [bookings])

  const cancel = async (b) => {
    const ok = await confirm({
      title: 'Cancel this booking?',
      message: `Your ${b.status === 'APPROVED' ? 'approved booking' : 'request'} for ${b.resource?.name} will be cancelled and the slot freed for others.`,
      confirmLabel: 'Cancel booking',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.patch(`/api/bookings/${b._id}/cancel`, {})
      toast({ title: 'Booking cancelled', message: b.resource?.name })
      load()
    } catch (e) {
      toast({ type: 'error', title: "Couldn't cancel", message: errorMessage(e) })
    }
  }

  const list = groups[tab]
  const pending = groups.all.filter((b) => b.status === 'PENDING').length

  return (
    <>
      <PageHeader
        eyebrow="Your activity"
        title="My bookings"
        subtitle="Track every request, see the admin's decision, and cancel what you no longer need."
        action={<Link to="/" className="btn-primary"><Plus className="h-4 w-4" /> New booking</Link>}
      />
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="mb-8 grid animate-fade-up grid-cols-3 gap-3 [animation-delay:60ms] sm:gap-4">
        <Stat icon={CalendarClock} label="Upcoming" value={groups.upcoming.length} tone="bg-brand-50 text-brand-600" />
        <Stat icon={Hourglass} label="Awaiting approval" value={pending} tone="bg-amber-50 text-amber-600" />
        <Stat icon={ListChecks} label="All requests" value={groups.all.length} tone="bg-slate-100 text-slate-600" />
      </div>

      <Segmented
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
          { value: 'history', label: 'History', count: groups.history.length },
          { value: 'all', label: 'All', count: groups.all.length },
        ]}
      />

      {!bookings ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={tab === 'upcoming' ? 'Nothing coming up' : 'No bookings here yet'}
          action={<Link to="/" className="btn-primary">Explore spaces</Link>}
        >
          {tab === 'upcoming' ? 'Find a hall, lab or court and send your first request.' : 'Past and closed bookings will show up here.'}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {list.map((b, i) => <BookingRow key={b._id} b={b} index={i} onCancel={cancel} onFindSimilar={setSimilarFor} />)}
        </div>
      )}
      {similarFor && (
        <AlternativesModal
          bookingId={similarFor._id}
          heading={`Instead of ${similarFor.resource?.name || 'that room'}`}
          onClose={() => setSimilarFor(null)}
          onBooked={load}
        />
      )}
    </>
  )
}
