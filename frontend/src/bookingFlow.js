import api, { fmtDate, fmtRange } from './api'

/**
 * Sends a booking request. If the user already has a room at an overlapping time,
 * the server answers 409 ALREADY_HAS_BOOKING; we then ask "are you sure?" and,
 * only if they confirm, send it again with confirmMultiple: true.
 * Returns the created booking, or null if the user backed out. Other errors are thrown.
 */
export async function requestBooking(payload, confirm) {
  try {
    const res = await api.post('/api/bookings', payload)
    return res.data.booking
  } catch (err) {
    const data = err?.response?.data
    if (data?.code !== 'ALREADY_HAS_BOOKING') throw err
    const list = (data.details?.existing || [])
      .map((b) => `${b.resource?.name} (${fmtDate(b.startTime)}, ${fmtRange(b.startTime, b.endTime)} · ${b.status === 'APPROVED' ? 'approved' : 'pending'})`)
      .join(', ')
    const ok = await confirm({
      title: 'You already have a room at this time',
      message: `You already have ${list || 'a booking'} at an overlapping time. Are you sure you want to book another room?`,
      confirmLabel: 'Yes, book another',
      cancelLabel: 'No, keep one',
      tone: 'warning',
    })
    if (!ok) return null
    const res = await api.post('/api/bookings', { ...payload, confirmMultiple: true })
    return res.data.booking
  }
}
