import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Building2, X, Users, ExternalLink, Loader2, ChevronDown, Merge, Split, Search, Check } from 'lucide-react'
import api, { errorMessage, RESOURCE_TYPES, AVAILABILITY, floorLabel } from '../../api'
import { Alert, EmptyState, Field, Modal, PageHeader, Segmented, Skeleton } from '../../components/ui'
import { useConfirm, useToast } from '../../context/feedback'
import { typeMeta } from '../../typeIcons'
import { statusStyle } from '../../status'

const EMPTY = { name: '', type: 'CLASSROOM', location: '', capacity: '', description: '', amenities: [], availabilityStatus: 'AVAILABLE', building: '', floor: '', roomNumber: '' }

function TagInput({ value, onChange }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim().replace(/,$/, '')
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft('')
  }
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl bg-white px-2 py-1.5 shadow-xs ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 py-1 pl-2.5 pr-1 text-sm text-slate-700">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-ink" aria-label={`Remove ${t}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        className="min-w-[120px] flex-1 bg-transparent px-1.5 py-1 text-[15px] text-ink outline-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder={value.length ? 'Add more…' : 'Type and press Enter, e.g. Projector'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={add}
      />
    </div>
  )
}

function ResourceForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      name: form.name,
      type: form.type,
      location: form.location,
      availabilityStatus: form.availabilityStatus,
      amenities: form.amenities,
    }
    if (form.capacity) payload.capacity = Number(form.capacity)
    if (form.description) payload.description = form.description
    if (form.building) payload.building = form.building
    if (form.floor !== '' && form.floor !== undefined && form.floor !== null) payload.floor = Number(form.floor)
    if (form.roomNumber) payload.roomNumber = form.roomNumber
    try {
      if (initial._id) await api.patch(`/api/resources/${initial._id}`, payload)
      else await api.post('/api/resources', payload)
      onSaved(initial._id ? 'Space updated' : 'Space created', form.name)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Alert onClose={() => setError('')} className="!mb-0">{error}</Alert>

      <div>
        <label className="label">Type</label>
        <div className="grid grid-cols-3 gap-2">
          {RESOURCE_TYPES.map((t) => {
            const meta = typeMeta(t)
            const active = form.type === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium ring-1 transition ${
                  active ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
                }`}
              >
                <meta.icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Name" htmlFor="rname">
          <input id="rname" className="input" required minLength={2} placeholder="e.g. Seminar Hall C" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Capacity" htmlFor="rcap" optional>
          <input id="rcap" type="number" min={1} className="input" placeholder="120" value={form.capacity} onChange={set('capacity')} />
        </Field>
      </div>

      <Field label="Location" htmlFor="rloc">
        <input id="rloc" className="input" required minLength={2} placeholder="e.g. Main Block, 1st Floor" value={form.location} onChange={set('location')} />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Block" htmlFor="rblock" optional>
          <input id="rblock" className="input" placeholder="E Block" value={form.building} onChange={set('building')} />
        </Field>
        <Field label="Floor" htmlFor="rfloor" optional>
          <input id="rfloor" type="number" min={0} max={50} className="input" placeholder="1" value={form.floor} onChange={set('floor')} />
        </Field>
        <Field label="Room no." htmlFor="rroom" optional>
          <input id="rroom" className="input uppercase" placeholder="E101" value={form.roomNumber} onChange={set('roomNumber')} />
        </Field>
      </div>

      <Field label="Amenities" optional>
        <TagInput value={form.amenities} onChange={(amenities) => setForm({ ...form, amenities })} />
      </Field>

      <Field label="Description" htmlFor="rdesc" optional>
        <textarea id="rdesc" className="textarea" rows={3} placeholder="What is this space best used for?" value={form.description} onChange={set('description')} />
      </Field>

      <div>
        <label className="label">Availability</label>
        <div className="grid grid-cols-3 gap-2">
          {AVAILABILITY.map((a) => {
            const s = statusStyle(a)
            const active = form.availabilityStatus === a
            return (
              <button
                key={a}
                type="button"
                onClick={() => setForm({ ...form, availabilityStatus: a })}
                className={`flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium ring-1 transition ${
                  active ? 'bg-slate-50 text-ink ring-2 ring-ink' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {initial._id ? 'Save changes' : 'Create space'}
        </button>
      </div>
    </form>
  )
}

function AvailabilitySelect({ value, onChange }) {
  const s = statusStyle(value)
  return (
    <div className={`relative inline-flex items-center rounded-full ring-1 ring-inset ${s.pill}`}>
      <span className={`pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-1 pl-6 pr-7 text-xs font-medium outline-none"
        aria-label="Availability"
      >
        {AVAILABILITY.map((a) => <option key={a} value={a}>{statusStyle(a).label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 opacity-60" />
    </div>
  )
}

const seqOf = (r) => Number(String(r.roomNumber || '').match(/(\d+)\s*$/)?.[1] ?? NaN)

// Pick two neighbouring classrooms on a floor and join them into a seminar hall
function CombineForm({ resources, onDone, onCancel }) {
  const rooms = resources.filter((r) => r.type === 'CLASSROOM' && r.building && r.floor !== undefined)
  const blocks = [...new Set(rooms.map((r) => r.building))]
  const [block, setBlock] = useState(blocks[0] || '')
  const floors = [...new Set(rooms.filter((r) => r.building === block).map((r) => r.floor))].sort((a, b) => a - b)
  const [floor, setFloor] = useState(floors[0])
  const [picked, setPicked] = useState([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const inHall = new Set(resources.flatMap((r) => (r.combinedFrom || []).map((p) => p._id || p)))
  const onFloor = rooms.filter((r) => r.building === block && r.floor === floor).sort((a, b) => seqOf(a) - seqOf(b))
  const sel = onFloor.filter((r) => picked.includes(r._id)).sort((a, b) => seqOf(a) - seqOf(b))
  const adjacent = sel.length === 2 && Math.abs(seqOf(sel[0]) - seqOf(sel[1])) === 1

  const toggle = (r) => {
    if (inHall.has(r._id)) return
    setError('')
    setPicked((p) => (p.includes(r._id) ? p.filter((x) => x !== r._id) : p.length >= 2 ? [p[1], r._id] : [...p, r._id]))
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/api/resources/combine', { rooms: sel.map((r) => r._id), ...(name.trim() && { name: name.trim() }) })
      onDone(res.data.resource)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!rooms.length) return <p className="text-sm text-slate-500">Add classrooms with a block, floor and room number first.</p>

  return (
    <div className="space-y-5">
      <Alert onClose={() => setError('')} className="!mb-0">{error}</Alert>
      <div className="flex flex-wrap items-center gap-3">
        {blocks.length > 1 && (
          <select className="input h-10 w-auto text-sm" value={block} onChange={(e) => { setBlock(e.target.value); setPicked([]) }}>
            {blocks.map((b) => <option key={b}>{b}</option>)}
          </select>
        )}
        <Segmented
          value={floor}
          onChange={(f) => { setFloor(f); setPicked([]) }}
          options={floors.map((f) => ({ value: f, label: `Floor ${f}` }))}
        />
      </div>

      <div>
        <p className="label">Pick two neighbouring classrooms</p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {onFloor.map((r) => {
            const on = picked.includes(r._id)
            const locked = inHall.has(r._id)
            return (
              <button key={r._id} type="button" onClick={() => toggle(r)} disabled={locked}
                title={locked ? 'Already part of a hall' : `${r.roomNumber} · ${r.capacity} seats`}
                className={`relative rounded-xl py-3 text-center font-mono text-xs font-semibold ring-1 transition ${
                  on ? 'bg-violet-600 text-white ring-violet-600 shadow-[0_6px_16px_-6px_rgb(124_58_237/0.7)]'
                    : locked ? 'cursor-not-allowed bg-violet-50 text-violet-300 ring-violet-100'
                    : 'bg-white text-slate-600 ring-slate-200 hover:ring-violet-400'
                }`}>
                {r.roomNumber}
                {on && <Check className="absolute right-1 top-1 h-3 w-3" />}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">Shaded rooms are already part of a seminar hall.</p>
      </div>

      <div className={`rounded-2xl p-4 ring-1 transition ${adjacent ? 'bg-violet-50 ring-violet-200' : 'bg-slate-50 ring-slate-900/5'}`}>
        {sel.length < 2 ? (
          <p className="text-sm text-slate-500">Select {2 - sel.length} more room{sel.length === 1 ? '' : 's'}.</p>
        ) : !adjacent ? (
          <p className="text-sm text-rose-600">{sel[0].roomNumber} and {sel[1].roomNumber} aren't next to each other. Pick rooms side by side.</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"><Merge className="h-5 w-5 rotate-90" /></span>
            <div>
              <p className="font-semibold text-ink">Seminar Hall {sel[0].roomNumber} + {sel[1].roomNumber}</p>
              <p className="text-sm text-slate-500">{(sel[0].capacity || 0) + (sel[1].capacity || 0)} seats · both rooms stay bookable on their own</p>
            </div>
          </div>
        )}
      </div>

      <Field label="Hall name" optional hint="Leave empty to use the room numbers.">
        <input className="input" placeholder={adjacent ? `Seminar Hall ${sel[0].roomNumber} + ${sel[1].roomNumber}` : 'Seminar Hall …'} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={!adjacent || busy} onClick={submit}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4 rotate-90" />} Combine rooms
        </button>
      </div>
    </div>
  )
}

const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'CLASSROOM', label: 'Classrooms' },
  { value: 'SEMINAR_HALL', label: 'Seminar halls' },
  { value: 'LAB', label: 'Labs' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'AUDITORIUM', label: 'Auditoriums' },
]

export default function AdminResources() {
  const toast = useToast()
  const confirm = useConfirm()
  const [resources, setResources] = useState(null)
  const [editing, setEditing] = useState(null)
  const [combining, setCombining] = useState(false)
  const [type, setType] = useState('')
  const [floor, setFloor] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get('/api/resources').then((r) => setResources(r.data.resources)).catch((e) => setError(errorMessage(e)))
  }, [])

  useEffect(load, [load])

  const floors = useMemo(() => [...new Set((resources || []).filter((r) => r.floor !== undefined && r.building).map((r) => `${r.building}|${r.floor}`))].sort(), [resources])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (resources || []).filter(
      (r) =>
        (!type || r.type === type) &&
        (!floor || `${r.building}|${r.floor}` === floor) &&
        (!q || [r.name, r.roomNumber, r.location, ...(r.amenities || [])].join(' ').toLowerCase().includes(q))
    )
  }, [resources, type, floor, search])

  const counts = useMemo(() => {
    const c = { '': resources?.length || 0 }
    resources?.forEach((r) => (c[r.type] = (c[r.type] || 0) + 1))
    return c
  }, [resources])

  const changeStatus = async (r, availabilityStatus) => {
    try {
      await api.patch(`/api/resources/${r._id}/availability`, { availabilityStatus })
      toast({ title: `${r.name} is now ${statusStyle(availabilityStatus).label.toLowerCase()}` })
      load()
    } catch (e) {
      toast({ type: 'error', title: "Couldn't update", message: errorMessage(e) })
    }
  }

  const remove = async (r) => {
    const hall = r.combinedFrom?.length > 0
    const ok = await confirm({
      title: hall ? `Split ${r.name}?` : `Delete ${r.name}?`,
      message: hall
        ? `The hall is removed and ${r.combinedFrom.map((p) => p.roomNumber || p.name).join(' and ')} go back to being separate classrooms. Halls with upcoming bookings can't be split.`
        : 'This permanently removes the space. Spaces with upcoming bookings, or rooms that are part of a hall, can’t be deleted.',
      confirmLabel: hall ? 'Split hall' : 'Delete space',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/api/resources/${r._id}`)
      toast({ title: hall ? 'Hall split into classrooms' : 'Space deleted', message: r.name })
      load()
    } catch (e) {
      toast({ type: 'error', title: hall ? "Couldn't split" : "Couldn't delete", message: errorMessage(e) })
    }
  }

  const openEdit = (r) =>
    setEditing({
      ...EMPTY,
      ...r,
      capacity: r.capacity ?? '',
      description: r.description ?? '',
      amenities: r.amenities || [],
      building: r.building ?? '',
      floor: r.floor ?? '',
      roomNumber: r.roomNumber ?? '',
    })

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Spaces"
        subtitle="Classrooms, seminar halls, labs and courts. Combine neighbouring classrooms into a hall, or split it back."
        action={
          <>
            <button className="btn-secondary" onClick={() => setCombining(true)}><Merge className="h-4 w-4 rotate-90" /> Combine rooms</button>
            <button className="btn-primary" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" /> Add space</button>
          </>
        }
      />
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="mb-5 flex animate-fade-up flex-col gap-3 [animation-delay:60ms] xl:flex-row xl:items-center xl:justify-between">
        <Segmented value={type} onChange={setType} options={TYPE_TABS.filter((t) => !t.value || counts[t.value]).map((t) => ({ ...t, count: counts[t.value] || 0 }))} />
        <div className="flex gap-2">
          <div className="relative flex-1 xl:w-56 xl:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input h-10 pl-9 text-sm" placeholder="Room, name, amenity" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input h-10 w-auto text-sm" value={floor} onChange={(e) => setFloor(e.target.value)}>
            <option value="">All floors</option>
            {floors.map((f) => {
              const [b, n] = f.split('|')
              return <option key={f} value={f}>{b} · {floorLabel(Number(n))}</option>
            })}
          </select>
        </div>
      </div>

      {!resources ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Building2} title="No spaces match" action={<button className="btn-primary" onClick={() => setEditing(EMPTY)}><Plus className="h-4 w-4" /> Add a space</button>}>
          Try another filter, or add a new space.
        </EmptyState>
      ) : (
        <div className="card animate-fade-up overflow-hidden [animation-delay:100ms]">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Space</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Capacity</th>
                  <th className="px-5 py-3 font-medium">Amenities</th>
                  <th className="px-5 py-3 font-medium">Availability</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const meta = typeMeta(r.type)
                  const hall = r.combinedFrom?.length > 0
                  return (
                    <tr key={r._id} className="group transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${meta.cover}`}>
                            {hall ? <Merge className="h-[18px] w-[18px] rotate-90" /> : <meta.icon className="h-[18px] w-[18px]" />}
                          </span>
                          <div className="min-w-0">
                            <Link to={`/resources/${r._id}`} className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
                              {r.name} <ExternalLink className="h-3 w-3 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                            </Link>
                            <p className="truncate text-xs text-slate-400">
                              {hall ? `Combines ${r.combinedFrom.map((p) => p.roomNumber || p.name).join(' + ')} · ` : ''}{r.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{hall ? 'Combined hall' : meta.label}</td>
                      <td className="px-5 py-3.5">
                        {r.capacity ? <span className="inline-flex items-center gap-1.5 tabular-nums text-slate-600"><Users className="h-3.5 w-3.5 text-slate-400" /> {r.capacity}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="max-w-[200px] px-5 py-3.5">
                        <p className="truncate text-slate-500" title={r.amenities?.join(', ')}>{r.amenities?.length ? r.amenities.join(', ') : '—'}</p>
                      </td>
                      <td className="px-5 py-3.5"><AvailabilitySelect value={r.availabilityStatus} onChange={(v) => changeStatus(r, v)} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button className="btn-icon" onClick={() => openEdit(r)} title="Edit" aria-label={`Edit ${r.name}`}><Pencil className="h-4 w-4" /></button>
                          {hall ? (
                            <button className="btn-icon hover:bg-violet-50 hover:text-violet-600" onClick={() => remove(r)} title="Split into classrooms" aria-label={`Split ${r.name}`}><Split className="h-4 w-4" /></button>
                          ) : (
                            <button className="btn-icon hover:bg-rose-50 hover:text-rose-600" onClick={() => remove(r)} title="Delete" aria-label={`Delete ${r.name}`}><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Showing {rows.length} of {resources.length} spaces</div>
        </div>
      )}

      <Modal
        title={editing?._id ? 'Edit space' : 'Add a space'}
        description={editing?._id ? editing.name : 'Students will be able to see and request it right away.'}
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {editing && (
          <ResourceForm
            key={editing._id || 'new'}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSaved={(title, name) => {
              setEditing(null)
              toast({ title, message: name })
              load()
            }}
          />
        )}
      </Modal>

      <Modal title="Combine classrooms" description="Open the partition between two neighbouring rooms to make a seminar hall." open={combining} onClose={() => setCombining(false)} size="lg">
        {combining && resources && (
          <CombineForm
            resources={resources}
            onCancel={() => setCombining(false)}
            onDone={(hall) => {
              setCombining(false)
              toast({ title: 'Seminar hall created', message: `${hall.name} · ${hall.capacity} seats` })
              load()
            }}
          />
        )}
      </Modal>
    </>
  )
}
