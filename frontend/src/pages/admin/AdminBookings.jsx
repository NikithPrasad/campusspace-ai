import { useCallback, useEffect, useMemo, useState } from 'react'
import { Inbox, Search, X } from 'lucide-react'
import api, { errorMessage, fmtDate, fmtRange, timeAgo } from '../../api'
import { Alert, Avatar, Badge, EmptyState, PageHeader, Segmented, Skeleton } from '../../components/ui'
import ReviewActions from '../../components/ReviewActions'
import { useConfirm, useToast } from '../../context/feedback'
import { typeMeta } from '../../typeIcons'

const TABS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

export default function AdminBookings() {
  const toast = useToast()
  const confirm = useConfirm()
  const [bookings, setBookings] = useState(null)
  const [resources, setResources] = useState([])
  const [status, setStatus] = useState('PENDING')
  const [resource, setResource] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/resources').then((r) => setResources(r.data.resources)).catch(() => {})
  }, [])

  const load = useCallback(() => {
    api
      .get('/api/bookings')
      .then((r) => setBookings(r.data.bookings))
      .catch((e) => setError(errorMessage(e)))
  }, [])

  useEffect(load, [load])

  const counts = useMemo(() => {
    const c = { ALL: bookings?.length || 0 }
    bookings?.forEach((b) => (c[b.status] = (c[b.status] || 0) + 1))
    return c
  }, [bookings])

  const rows = useMemo(() => {
    if (!bookings) return []
    const q = search.trim().toLowerCase()
    return bookings
      .filter((b) => status === 'ALL' || b.status === status)
      .filter((b) => !resource || b.resource?._id === resource)
      .filter((b) => !q || [b.user?.name, b.user?.email, b.purpose, b.resource?.name].join(' ').toLowerCase().includes(q))
      .sort((a, b) =>
        status === 'PENDING' ? new Date(a.startTime) - new Date(b.startTime) : new Date(b.createdAt) - new Date(a.createdAt)
      )
  }, [bookings, status, resource, search])

  const cancel = async (b) => {
    const ok = await confirm({
      title: 'Cancel this approved booking?',
      message: `${b.user?.name}'s booking of ${b.resource?.name} on ${fmtDate(b.startTime)} will be cancelled. They'll see it in their history.`,
      confirmLabel: 'Cancel booking',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.patch(`/api/bookings/${b._id}/cancel`, { reason: 'Cancelled by admin' })
      toast({ title: 'Booking cancelled', message: `${b.user?.name} · ${b.resource?.name}` })
      window.dispatchEvent(new Event('bookings:changed'))
      load()
    } catch (e) {
      toast({ type: 'error', title: "Couldn't cancel", message: errorMessage(e) })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Requests"
        subtitle="Every booking request across campus. Review pending ones, or look back at decisions."
      />
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="mb-5 flex animate-fade-up flex-col gap-3 [animation-delay:60ms] min-[1400px]:flex-row min-[1400px]:items-center min-[1400px]:justify-between">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            ...TABS.map((t) => ({ value: t, label: t[0] + t.slice(1).toLowerCase(), count: counts[t] || 0 })),
            { value: 'ALL', label: 'All', count: counts.ALL },
          ]}
        />
        <div className="flex gap-2">
          <div className="relative flex-1 min-[1400px]:w-64 min-[1400px]:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input h-10 pl-9 pr-8 text-sm" placeholder="Search people or purpose" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} className="btn-icon absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" aria-label="Clear">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select className="input h-10 w-auto text-sm" value={resource} onChange={(e) => setResource(e.target.value)}>
            <option value="">All spaces</option>
            {resources.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {!bookings ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title={status === 'PENDING' && !search && !resource ? 'No pending requests' : 'Nothing matches'}>
          {status === 'PENDING' ? "You're all caught up." : 'Try another tab or clear the filters.'}
        </EmptyState>
      ) : (
        <div className="card animate-fade-up overflow-hidden [animation-delay:100ms]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">Requested by</th>
                  <th className="px-4 py-3 font-medium">Booking</th>
                  <th className="hidden px-4 py-3 font-medium min-[1400px]:table-cell">Purpose</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((b) => {
                  const meta = typeMeta(b.resource?.type)
                  return (
                    <tr key={b._id} className="align-middle transition hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={b.user?.name} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium text-ink">
                              {b.user?.name}
                              {b.user?.designation === 'FACULTY' && <span className="rounded bg-violet-50 px-1 py-px text-[10px] font-semibold text-violet-700 ring-1 ring-violet-600/15">FACULTY</span>}
                            </p>
                            <p className="truncate text-xs text-slate-400">{b.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}><meta.icon className="h-3.5 w-3.5" /></span>
                          <div className="min-w-0">
                            <p className="whitespace-nowrap font-medium text-ink">{b.resource?.name || '—'}</p>
                            <p className="whitespace-nowrap text-xs tabular-nums text-slate-500">{fmtDate(b.startTime)} · {fmtRange(b.startTime, b.endTime)}</p>
                            <p className="mt-0.5 max-w-[240px] truncate text-xs text-slate-400 min-[1400px]:hidden" title={b.purpose}>{b.purpose}</p>
                            {b.competing > 0 && (
                              <span className="mt-1 inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/15">
                                Competes with {b.competing}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden max-w-[220px] px-4 py-4 min-[1400px]:table-cell">
                        <p className="truncate text-slate-700" title={b.purpose}>{b.purpose}</p>
                        {b.adminRemark && b.adminRemark !== 'Approved' && b.status !== 'PENDING' ? (
                          <p className="mt-0.5 truncate text-xs italic text-slate-400" title={b.adminRemark}>“{b.adminRemark}”</p>
                        ) : (
                          <p className="mt-0.5 text-xs text-slate-400">{b.attendees ? `${b.attendees} attendees · ` : ''}{timeAgo(b.createdAt)}</p>
                        )}
                      </td>
                      <td className="px-4 py-4"><Badge value={b.status} /></td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end whitespace-nowrap">
                          {b.status === 'PENDING' && <ReviewActions booking={b} onDone={load} compact />}
                          {b.status === 'APPROVED' && new Date(b.startTime) > new Date() && (
                            <button className="btn-ghost btn-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => cancel(b)}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
            Showing {rows.length} of {counts.ALL} requests
          </div>
        </div>
      )}
    </>
  )
}
