import { Presentation, FlaskConical, Trophy, Theater, School, Box } from 'lucide-react'

// Visual identity for each resource type: icon, label and cover gradient.
export const TYPE_META = {
  SEMINAR_HALL: { icon: Presentation, label: 'Seminar hall', plural: 'Seminar halls', cover: 'from-indigo-700 via-indigo-600 to-violet-500', tint: 'bg-indigo-50 text-indigo-600' },
  LAB: { icon: FlaskConical, label: 'Laboratory', plural: 'Labs', cover: 'from-sky-800 via-sky-600 to-cyan-500', tint: 'bg-sky-50 text-sky-600' },
  SPORTS: { icon: Trophy, label: 'Sports facility', plural: 'Sports', cover: 'from-emerald-800 via-emerald-600 to-teal-500', tint: 'bg-emerald-50 text-emerald-600' },
  AUDITORIUM: { icon: Theater, label: 'Auditorium', plural: 'Auditoriums', cover: 'from-rose-700 via-rose-600 to-orange-400', tint: 'bg-rose-50 text-rose-600' },
  CLASSROOM: { icon: School, label: 'Classroom', plural: 'Classrooms', cover: 'from-orange-700 via-orange-500 to-amber-400', tint: 'bg-amber-50 text-amber-600' },
  OTHER: { icon: Box, label: 'Other', plural: 'Other', cover: 'from-slate-800 via-slate-600 to-slate-400', tint: 'bg-slate-100 text-slate-600' },
}

export const typeMeta = (t) => TYPE_META[t] || TYPE_META.OTHER

// Kept for backwards compatibility
export const TYPE_ICONS = Object.fromEntries(Object.entries(TYPE_META).map(([k, v]) => [k, v.icon]))
