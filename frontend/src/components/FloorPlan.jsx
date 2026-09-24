import { Link } from 'react-router-dom'
import { Wrench, Ban, Users, Merge } from 'lucide-react'
import { floorLabel } from '../api'
import { STATE_META, stateOf } from '../status'


function Tooltip({ r, st, below }) {
  const m = STATE_META[st.state] || STATE_META.FREE
  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-30 w-56 -translate-x-1/2 rounded-xl bg-ink p-3 text-left opacity-0 shadow-pop transition duration-150 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 ${
        below ? 'top-[calc(100%+10px)] -translate-y-1' : 'bottom-[calc(100%+10px)] translate-y-1'
      }`}
    >
      <p className="text-sm font-semibold text-white">{r.name}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
        {st.via && <span className="text-white/45">· via {st.via}</span>}
      </p>
      <p className="mt-2 text-[11px] text-white/50">
        {r.capacity} seats{r.amenities?.length ? ` · ${r.amenities.slice(0, 3).join(', ')}` : ''}
      </p>
      <span className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink ${below ? 'bottom-full translate-y-1' : 'top-full -translate-y-1'}`} />
    </div>
  )
}

function RoomTile({ r, st, dim, linkQuery, below }) {
  const m = STATE_META[st.state] || STATE_META.FREE
  const Icon = st.state === 'MAINTENANCE' ? Wrench : st.state === 'UNAVAILABLE' ? Ban : null
  return (
    <Link
      to={`/resources/${r._id}${linkQuery}`}
      className={`group/tile relative flex h-[68px] flex-col justify-between rounded-xl p-2.5 ring-1 transition duration-200 hover:z-20 hover:-translate-y-0.5 ${m.tile} ${dim ? 'opacity-30 saturate-0' : ''}`}
    >
      <div className="flex items-start justify-between">
        <span className={`font-mono text-[13px] font-semibold tracking-tight ${m.text}`}>{r.roomNumber}</span>
        {Icon ? <Icon className="h-3 w-3 text-slate-400" /> : <span className={`mt-1 h-1.5 w-1.5 rounded-full ${m.dot}`} />}
      </div>
      <span className={`flex items-center gap-1 text-[10px] font-medium ${m.sub}`}>
        {st.state === 'FREE' ? <><Users className="h-2.5 w-2.5" /> {r.capacity}</> : m.label}
      </span>
      <Tooltip r={r} st={st} below={below} />
    </Link>
  )
}

function HallBar({ hall, st, col, dim, linkQuery }) {
  const m = STATE_META[st.state] || STATE_META.FREE
  const free = st.state === 'FREE'
  return (
    <Link
      to={`/resources/${hall._id}${linkQuery}`}
      style={{ gridColumn: `${col} / span 2` }}
      className={`group/tile relative -mt-1 flex items-center justify-center gap-1.5 rounded-b-xl rounded-t-md border-x-2 border-b-2 px-2 pb-1.5 pt-2 text-[11px] font-semibold transition hover:-translate-y-0.5 ${
        free ? 'border-violet-300 bg-violet-50 text-violet-700 hover:border-violet-500' : `border-slate-200 ${m.tile} ${m.text}`
      } ${dim ? 'opacity-30 saturate-0' : ''}`}
    >
      <Merge className="h-3 w-3 rotate-90" />
      <span className="truncate">Seminar hall · {hall.capacity}</span>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
      <Tooltip r={hall} st={st} />
    </Link>
  )
}

// resources: every space in the block (classrooms + combined halls)
export default function FloorPlan({ block, resources, statuses, minSeats = 0, linkQuery = '' }) {
  const rooms = resources.filter((r) => r.type === 'CLASSROOM' && r.building === block)
  const halls = resources.filter((r) => r.combinedFrom?.length && r.building === block)
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => b - a)
  const seq = (r) => Number(String(r.roomNumber).match(/(\d+)\s*$/)?.[1] ?? 0)

  return (
    <div className="-mx-4 px-4 pb-2 max-xl:overflow-x-auto sm:mx-0 sm:px-0">
      <div className="min-w-[760px] space-y-3">
        {floors.map((f, fi) => {
          const onFloor = rooms.filter((r) => r.floor === f).sort((a, b) => seq(a) - seq(b))
          const floorHalls = halls.filter((h) => h.floor === f)
          const freeCount = onFloor.filter((r) => stateOf(statuses, r).state === 'FREE').length
          return (
            <div key={f} className="flex gap-4">
              <div className="flex w-16 shrink-0 flex-col justify-center border-r border-dashed border-slate-200 pr-3 text-right">
                <span className="font-display text-3xl leading-none text-ink">{f}</span>
                <span className="mt-1 text-[10px] font-medium tracking-wide text-slate-400 uppercase">{floorLabel(f).replace(' floor', '')}</span>
                <span className="mt-1 text-[10px] font-medium text-emerald-600 tabular-nums">{freeCount} free</span>
              </div>
              <div className="grid flex-1 grid-cols-10 gap-2">
                {onFloor.map((r) => (
                  <RoomTile key={r._id} r={r} st={stateOf(statuses, r)} dim={minSeats > (r.capacity || 0)} linkQuery={linkQuery} below={fi === 0} />
                ))}
                {floorHalls.map((h) => {
                  const first = Math.min(...h.combinedFrom.map((p) => onFloor.findIndex((r) => r._id === (p._id || p))).filter((i) => i >= 0))
                  if (!Number.isFinite(first)) return null
                  return <HallBar key={h._id} hall={h} st={stateOf(statuses, h)} col={first + 1} dim={minSeats > (h.capacity || 0)} linkQuery={linkQuery} />
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Legend({ counts = {} }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
      {['FREE', 'REQUESTED', 'BOOKED', 'MAINTENANCE'].map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${STATE_META[k].dot}`} />
          {STATE_META[k].label}
          {counts[k] !== undefined && <span className="font-semibold text-ink tabular-nums">{counts[k]}</span>}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm border-2 border-t-0 border-violet-300 bg-violet-50" /> Combined hall
      </span>
    </div>
  )
}
