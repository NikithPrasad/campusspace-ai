// Colours and labels for booking / availability / role states
const STATUS = {
  PENDING: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-800 ring-amber-600/15', label: 'Pending' },
  APPROVED: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15', label: 'Approved' },
  REJECTED: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-800 ring-rose-600/15', label: 'Rejected' },
  CANCELLED: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-500/15', label: 'Cancelled' },
  AVAILABLE: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15', label: 'Available' },
  UNAVAILABLE: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-800 ring-rose-600/15', label: 'Unavailable' },
  MAINTENANCE: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-800 ring-amber-600/15', label: 'Maintenance' },
  ADMIN: { dot: 'bg-brand-500', pill: 'bg-brand-50 text-brand-700 ring-brand-600/15', label: 'Admin' },
  USER: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-500/15', label: 'Student' },
}

export const statusStyle = (v) => STATUS[v] || STATUS.CANCELLED

// Live state of a space for a time window (from GET /api/resources/status)
export const STATE_META = {
  FREE: { label: 'Free', dot: 'bg-emerald-500', tile: 'bg-white ring-slate-200 hover:ring-emerald-400 hover:shadow-[0_8px_24px_-12px_rgb(16_185_129/0.55)]', text: 'text-ink', sub: 'text-slate-400' },
  REQUESTED: { label: 'Requested', dot: 'bg-amber-500', tile: 'bg-amber-50 ring-amber-200 hover:ring-amber-400', text: 'text-amber-900', sub: 'text-amber-700/70' },
  BOOKED: { label: 'In use', dot: 'bg-rose-500', tile: 'bg-rose-50 ring-rose-200 hover:ring-rose-400', text: 'text-rose-900', sub: 'text-rose-700/70' },
  MAINTENANCE: { label: 'Maintenance', dot: 'bg-slate-400', tile: 'bg-[repeating-linear-gradient(135deg,rgb(241_245_249)_0_6px,rgb(226_232_240)_6px_12px)] ring-slate-200', text: 'text-slate-500', sub: 'text-slate-400' },
  UNAVAILABLE: { label: 'Closed', dot: 'bg-slate-400', tile: 'bg-slate-100 ring-slate-200', text: 'text-slate-400', sub: 'text-slate-400' },
}

export const stateOf = (statuses, r) => statuses?.[r._id] || { state: r.availabilityStatus === 'AVAILABLE' ? 'FREE' : r.availabilityStatus }
