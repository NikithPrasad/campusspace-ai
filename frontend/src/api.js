import axios from 'axios'

// Same-origin in dev thanks to the Vite proxy. Set VITE_API_URL when the API is hosted elsewhere.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // send the HTTP-only auth cookie
})

export function errorMessage(err) {
  const data = err?.response?.data
  if (data?.errors?.length) return data.errors.map((e) => e.message).join(' · ')
  if (err?.code === 'ERR_NETWORK') return "Can't reach the server. Is the backend running?"
  return data?.message || err?.message || 'Something went wrong'
}

// Only college accounts can use the app (the backend enforces this too)
export const EMAIL_DOMAIN = import.meta.env.VITE_EMAIL_DOMAIN || 'vnrvjiet.in'
export const toCollegeEmail = (v = '') => {
  const t = v.trim().toLowerCase()
  if (!t) return ''
  return t.includes('@') ? t : `${t}@${EMAIL_DOMAIN}`
}
export const isCollegeEmail = (v = '') => new RegExp(`^[^@\\s]+@([a-z0-9-]+\\.)*${EMAIL_DOMAIN.replace(/\./g, '\\.')}$`, 'i').test(v.trim())

export const ORDINAL = ['Ground', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
export const floorLabel = (f) => (f === 0 ? 'Ground floor' : `${ORDINAL[f] || `${f}th`} floor`)

// Local "YYYY-MM-DDTHH:MM" -> Date
export const localDateTime = (date, time) => new Date(`${date}T${time}`)

export const RESOURCE_TYPES = ['SEMINAR_HALL', 'LAB', 'SPORTS', 'AUDITORIUM', 'CLASSROOM', 'OTHER']
export const AVAILABILITY = ['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE']
export const BOOKING_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

export const pretty = (s = '') => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
export const fmtRange = (a, b) => `${fmtTime(a)} – ${fmtTime(b)}`

export function fmtDuration(ms) {
  if (!ms || ms <= 0) return '—'
  const mins = Math.round(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ')
}

export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?'

export const toDateInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default api
