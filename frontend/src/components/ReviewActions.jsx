import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import api, { errorMessage, fmtDate, fmtRange } from '../api'
import { useConfirm, useToast } from '../context/feedback'
import { Alert, Avatar, Modal } from './ui'

const PRESETS = [
  'Slot reserved for an official event',
  'Space under maintenance on that day',
  'Purpose needs more detail',
  'Expected attendees exceed safe capacity',
]

// Approve / Reject for a PENDING booking. Rejecting asks for a reason (the API requires one).
export default function ReviewActions({ booking, onDone, compact = false }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(null)
  const [modalError, setModalError] = useState('')

  const review = async (status, adminRemark) => {
    setBusy(status)
    try {
      const res = await api.patch(`/api/bookings/${booking._id}/review`, { status, ...(adminRemark && { adminRemark }) })
      setRejecting(false)
      setReason('')
      const auto = res.data.autoRejected
      toast({
        type: status === 'APPROVED' ? 'success' : 'info',
        title: status === 'APPROVED' ? 'Booking approved' : 'Booking rejected',
        message: `${booking.user?.name} · ${booking.resource?.name}${auto ? `. ${auto} competing request${auto > 1 ? 's were' : ' was'} rejected and offered similar rooms.` : ''}`,
      })
      window.dispatchEvent(new Event('bookings:changed'))
      onDone?.()
    } catch (e) {
      if (status === 'REJECTED') setModalError(errorMessage(e))
      else toast({ type: 'error', title: "Couldn't approve", message: errorMessage(e) })
    } finally {
      setBusy(null)
    }
  }

  // If other requests want the same slot, make the consequence clear before approving
  const approve = async () => {
    if (booking.competing > 0) {
      const ok = await confirm({
        title: `Approve ${booking.user?.name}'s request?`,
        message: `${booking.competing} other request${booking.competing > 1 ? 's want' : ' wants'} ${booking.resource?.name} (or a linked room) at this time. They'll be rejected automatically and offered similar rooms that are free then with enough seats.`,
        confirmLabel: 'Approve',
        cancelLabel: 'Not yet',
        tone: 'warning',
      })
      if (!ok) return
    }
    review('APPROVED')
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          className={`btn-secondary ${compact ? 'btn-sm !px-2' : ''} text-slate-600 hover:text-rose-600`}
          disabled={!!busy}
          onClick={() => { setModalError(''); setRejecting(true) }}
          title="Reject"
          aria-label="Reject"
        >
          <X className="h-4 w-4" /> {!compact && 'Reject'}
        </button>
        <button className={`btn-primary ${compact ? 'btn-sm' : ''}`} disabled={!!busy} onClick={approve}>
          {busy === 'APPROVED' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
        </button>
      </div>

      <Modal title="Reject request" description="The student will see your reason." open={rejecting} onClose={() => setRejecting(false)}>
        <Alert onClose={() => setModalError('')}>{modalError}</Alert>
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-900/5">
          <Avatar name={booking.user?.name} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-ink">{booking.user?.name} · {booking.resource?.name}</p>
            <p className="text-slate-500">{fmtDate(booking.startTime)} · {fmtRange(booking.startTime, booking.endTime)}</p>
          </div>
        </div>
        <label className="label">Quick reasons</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                reason === p ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <label className="label" htmlFor="reason">Reason</label>
        <textarea id="reason" className="textarea" rows={3} placeholder="Write a short, helpful reason…" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setRejecting(false)}>Back</button>
          <button className="btn-danger" disabled={!!busy || reason.trim().length < 3} onClick={() => review('REJECTED', reason.trim())}>
            {busy === 'REJECTED' && <Loader2 className="h-4 w-4 animate-spin" />} Reject request
          </button>
        </div>
      </Modal>
    </>
  )
}
