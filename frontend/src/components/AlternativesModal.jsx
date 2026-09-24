import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Users, Layers, Loader2, Sparkles, ArrowRight, Merge, AlertTriangle, CheckCircle2, Map as MapIcon } from 'lucide-react'
import api, { errorMessage, fmtDate, fmtRange, floorLabel, toDateInput } from '../api'
import { requestBooking } from '../bookingFlow'
import { useConfirm, useToast } from '../context/feedback'
import { typeMeta } from '../typeIcons'
import { Modal, Skeleton } from './ui'

const hhmm = (d) => `${String(new Date(d).getHours()).padStart(2, '0')}:${String(new Date(d).getMinutes()).padStart(2, '0')}`

function fitLabel(capacity, needed) {
  const extra = capacity - needed
  if (extra <= 10) return { text: 'Perfect fit', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' }
  if (extra <= 40) return { text: `${extra} spare seats`, cls: 'bg-sky-50 text-sky-700 ring-sky-600/15' }
  return { text: 'Much larger', cls: 'bg-slate-100 text-slate-600 ring-slate-500/15' }
}

/**
 * Shows rooms that are free at exactly the same time as `bookingId` and big enough for it.
 * The list comes live from the server each time, so it's never stale.
 */
export default function AlternativesModal({ bookingId, onClose, onBooked, heading }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    api
      .get(`/api/bookings/${bookingId}/alternatives`)
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)))
  }, [bookingId])

  const book = async (s) => {
    setBusy(s.resource._id)
    setError('')
    try {
      const b = data.booking
      const created = await requestBooking(
        {
          resource: s.resource._id,
          startTime: b.startTime,
          endTime: b.endTime,
          purpose: b.purpose,
          ...(b.attendees && { attendees: b.attendees }),
        },
        confirm
      )
      if (created) {
        setDone({ name: s.resource.name })
        toast({ title: 'Request sent', message: `${s.resource.name} · ${fmtDate(b.startTime)}, ${fmtRange(b.startTime, b.endTime)}` })
        window.dispatchEvent(new Event('bookings:changed'))
        onBooked?.()
      }
    } catch (e) {
      setError(errorMessage(e))
      // Something changed since we loaded (e.g. the room just got booked) — refresh the list
      api.get(`/api/bookings/${bookingId}/alternatives`).then((r) => setData(r.data)).catch(() => {})
    } finally {
      setBusy(null)
    }
  }

  const b = data?.booking
  const planLink = b ? `/?date=${toDateInput(new Date(b.startTime))}&from=${hhmm(b.startTime)}&to=${hhmm(b.endTime)}` : '/'

  return (
    <Modal open onClose={onClose} size="lg" title={heading || 'Similar rooms you can book'} description="Free at exactly the same time, with enough seats for your request.">
      {error && (
        <div className="mb-4 flex gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800 ring-1 ring-rose-600/15">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!data && !error && (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      )}

      {b && (
        <>
          {/* What they originally asked for */}
          <div className="relative mb-5 overflow-hidden rounded-2xl bg-ink p-4 text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-500/40 blur-2xl" />
            <p className="text-[10px] font-semibold tracking-[0.16em] text-white/40 uppercase">Your request</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold">
                <span className="line-through decoration-rose-400/80 decoration-2">{b.resource?.name}</span>
                <span className="ml-2 rounded-md bg-rose-400/20 px-1.5 py-0.5 text-[11px] font-medium text-rose-200">taken</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm text-white/70"><CalendarDays className="h-3.5 w-3.5" /> {fmtDate(b.startTime)}</span>
              <span className="flex items-center gap-1.5 text-sm text-white/70"><Clock className="h-3.5 w-3.5" /> {fmtRange(b.startTime, b.endTime)}</span>
              <span className="flex items-center gap-1.5 text-sm text-white/70"><Users className="h-3.5 w-3.5" /> needs {data.needed} seats</span>
            </div>
            <p className="mt-1.5 truncate text-sm text-white/50">{b.purpose}</p>
          </div>

          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 animate-scale-in items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="mt-4 text-lg font-semibold text-ink">Requested {done.name}</p>
              <p className="mt-1 text-sm text-slate-500">An admin will review it. You'll get a notification with the decision.</p>
              <div className="mt-5 flex justify-center gap-2">
                <Link to="/my-bookings" onClick={onClose} className="btn-primary">View my bookings</Link>
                <button className="btn-ghost" onClick={onClose}>Close</button>
              </div>
            </div>
          ) : data.suggestions.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-5 py-8 text-center ring-1 ring-slate-900/5">
              <p className="font-semibold text-ink">No similar room is free at that exact time</p>
              <p className="mt-1 text-sm text-slate-500">{data.reason || 'Every room with enough seats is booked or unavailable then. Try a different time.'}</p>
              <Link to={planLink} onClick={onClose} className="btn-secondary mt-4"><MapIcon className="h-4 w-4" /> Open the floor plan</Link>
            </div>
          ) : (
            <>
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <Sparkles className="h-4 w-4 text-brand-500" /> {data.suggestions.length} room{data.suggestions.length > 1 ? 's' : ''} free {fmtRange(b.startTime, b.endTime)}, best fit first
              </p>
              <ul className="space-y-2.5">
                {data.suggestions.map((s, i) => {
                  const r = s.resource
                  const meta = typeMeta(r.type)
                  const fit = fitLabel(r.capacity, data.needed)
                  const hall = r.combinedFrom?.length > 0
                  return (
                    <li
                      key={r._id}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className={`flex animate-fade-up flex-col gap-3 rounded-2xl p-4 ring-1 transition sm:flex-row sm:items-center ${
                        i === 0 ? 'bg-gradient-to-r from-brand-50/80 to-white ring-brand-200' : 'bg-white ring-slate-200 hover:ring-slate-300'
                      }`}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${meta.cover}`}>
                        {hall ? <Merge className="h-5 w-5 rotate-90" /> : <meta.icon className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/resources/${r._id}`} onClick={onClose} className="font-semibold text-ink hover:underline">{r.name}</Link>
                          {i === 0 && <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">Best match</span>}
                          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${fit.cls}`}>{fit.text}</span>
                          {s.sameFloor && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-600/15">Same floor</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.capacity} seats</span>
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {r.building && r.floor !== undefined ? `${r.building}, ${floorLabel(r.floor)}` : r.location}</span>
                          {r.amenities?.length > 0 && <span className="truncate">{r.amenities.slice(0, 3).join(' · ')}</span>}
                        </div>
                        {s.competing > 0 && (
                          <p className="mt-1 text-xs text-amber-700">Someone else has also requested this slot. The admin will decide.</p>
                        )}
                      </div>
                      <button className={i === 0 ? 'btn-brand btn-sm' : 'btn-secondary btn-sm'} disabled={!!busy} onClick={() => book(s)}>
                        {busy === r._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Request <ArrowRight className="h-3.5 w-3.5" /></>}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 text-center text-xs text-slate-400">
                Checked just now against every approved booking at that time. <Link to={planLink} onClick={onClose} className="font-medium text-brand-600 hover:underline">See the full floor plan</Link>
              </p>
            </>
          )}
        </>
      )}
    </Modal>
  )
}
