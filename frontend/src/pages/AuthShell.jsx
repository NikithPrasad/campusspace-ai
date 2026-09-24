import { CheckCircle2, Sparkles, ShieldCheck, CalendarClock, Building2 } from 'lucide-react'
import { Logo } from '../components/Layout'

function PreviewCard() {
  // Decorative mini floor plan: F = free, B = booked, R = requested, M = maintenance
  const row = ['F', 'B', 'F', 'F', 'R', 'F', 'M', 'F', 'F', 'F']
  const tone = {
    F: 'bg-white/[0.08] ring-white/15 text-white/80',
    B: 'bg-rose-400/25 ring-rose-300/40 text-rose-100',
    R: 'bg-amber-300/20 ring-amber-200/40 text-amber-100',
    M: 'bg-white/[0.03] ring-white/10 text-white/25',
  }
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="animate-float rounded-2xl bg-white/[0.07] p-5 ring-1 ring-white/15 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500">
            <Building2 className="h-5 w-5 text-white" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">E Block · 2nd floor</p>
            <p className="text-xs text-white/50">Live for 2:00 – 3:00 PM</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 7 free
          </span>
        </div>
        <div className="mt-5 grid grid-cols-5 gap-1.5">
          {row.map((st, i) => (
            <div key={i} className={`rounded-lg py-2 text-center font-mono text-[11px] font-semibold ring-1 ${tone[st]}`}>
              E2{String(i + 1).padStart(2, '0')}
            </div>
          ))}
        </div>
        <div className="mx-auto mt-1.5 grid grid-cols-5 gap-1.5">
          <div className="col-span-2 col-start-4 rounded-b-lg border-x-2 border-b-2 border-violet-300/50 py-1 text-center text-[10px] font-semibold text-violet-200">
            Seminar hall · 132
          </div>
        </div>
      </div>

      <div className="absolute -bottom-14 -right-4 w-64 animate-[float_6s_ease-in-out_infinite_1.5s] rounded-2xl bg-white p-3.5 shadow-pop sm:-right-10">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-ink">Booking approved</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">E204 · Fri, 11:00 – 12:30 PM</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm animate-fade-up">
            <h1 className="text-[32px] font-semibold leading-tight">{title}</h1>
            <p className="mb-8 mt-2 text-[15px] text-slate-500">{subtitle}</p>
            {children}
            <div className="mt-8 text-center text-sm text-slate-500">{footer}</div>
          </div>
        </div>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} CampusSpace · VNR Vignana Jyothi Institute of Engineering & Technology</p>
      </div>

      {/* Showcase side */}
      <div className="relative m-3 hidden overflow-hidden rounded-[28px] bg-ink lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/40 blur-[110px]" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-fuchsia-600/25 blur-[120px]" />

        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/10">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> Exclusively for VNR VJIET
          </span>

          <div>
            <h2 className="max-w-lg text-5xl font-semibold leading-[1.05] tracking-tight text-white xl:text-[56px]">
              Every room in E Block,{' '}
              <span className="font-display font-normal italic text-indigo-200">one tap away.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
              See which classrooms and seminar halls are free right now, request one in seconds, and get approved without the paperwork.
            </p>
          </div>

          <div className="py-8">
            <PreviewCard />
          </div>

          <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { icon: CalendarClock, t: 'Live floor plan', d: '50 rooms across 5 floors at a glance' },
              { icon: ShieldCheck, t: 'College-only access', d: 'Only @vnrvjiet.in accounts can sign in' },
              { icon: CheckCircle2, t: 'No double-booking', d: 'Halls and rooms block each other' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t}>
                <Icon className="h-5 w-5 text-indigo-300" />
                <p className="mt-3 text-sm font-medium text-white">{t}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
