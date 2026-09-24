import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, GraduationCap, Loader2, BadgeCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errorMessage, EMAIL_DOMAIN, toCollegeEmail, isCollegeEmail } from '../api'
import { Alert } from '../components/ui'
import AuthShell from './AuthShell'

export function IconInput({ icon: Icon, right, ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input {...props} className="input pl-10 pr-10" />
      {right && <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  )
}

// Email box locked to the college domain: type your ID, "@vnrvjiet.in" is added for you.
export function CollegeEmailInput({ id, value, onChange, autoComplete = 'email' }) {
  const typedDomain = value.includes('@')
  const bad = typedDomain && value.split('@')[1] && !isCollegeEmail(value)
  return (
    <div>
      <div className={`flex h-11 overflow-hidden rounded-xl bg-white shadow-xs ring-1 transition focus-within:ring-2 ${bad ? 'ring-rose-300 focus-within:ring-rose-500' : 'ring-slate-200 hover:ring-slate-300 focus-within:ring-brand-500'}`}>
        <span className="flex items-center pl-3.5 text-slate-400"><Mail className="h-4 w-4" /></span>
        <input
          id={id}
          required
          autoComplete={autoComplete}
          placeholder="your.id"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, ''))}
          className="min-w-0 flex-1 bg-transparent px-2.5 text-[15px] text-ink outline-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {!typedDomain && (
          <span className="flex items-center border-l border-slate-100 bg-slate-50 px-3 text-sm font-medium text-slate-500">@{EMAIL_DOMAIN}</span>
        )}
      </div>
      {bad && <p className="mt-1.5 text-xs text-rose-600">Only @{EMAIL_DOMAIN} accounts can use CampusSpace.</p>}
    </div>
  )
}

const DEMOS = [
  { role: 'Admin', icon: ShieldCheck, email: 'admin', password: 'Admin@123' },
  { role: 'Student', icon: GraduationCap, email: 'ravi', password: 'User@1234' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const signIn = async (raw, password) => {
    const email = toCollegeEmail(raw)
    if (!isCollegeEmail(email)) {
      setError(`Only @${EMAIL_DOMAIN} accounts can sign in.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const user = await login(email, password)
      navigate(user.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    signIn(form.email, form.password)
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to find and book spaces across campus."
      footer={
        <>
          New to CampusSpace?{' '}
          <Link to="/register" className="font-medium text-ink underline decoration-slate-300 underline-offset-4 hover:decoration-ink">
            Create an account
          </Link>
        </>
      }
    >
      <Alert onClose={() => setError('')}>{error}</Alert>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">College email</label>
          <CollegeEmailInput id="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <IconInput
            id="password" icon={Lock} type={show ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            right={
              <button type="button" onClick={() => setShow(!show)} className="btn-icon h-7 w-7" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </div>
        <button className="btn-primary btn-lg w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      <div className="my-7 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or try a demo account <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DEMOS.map(({ role, icon: Icon, email, password }) => (
          <button
            key={role}
            type="button"
            disabled={busy}
            onClick={() => {
              setForm({ email, password })
              signIn(email, password)
            }}
            className="group flex items-center gap-3 rounded-xl bg-white p-3 text-left shadow-xs ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-card hover:ring-slate-300 disabled:opacity-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-900/5 transition group-hover:bg-brand-50 group-hover:text-brand-600">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{role}</span>
              <span className="block truncate text-[11px] text-slate-400">{email}@{EMAIL_DOMAIN}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-900/5">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        <span>Access is limited to VNR VJIET accounts ending in <b className="font-semibold text-slate-700">@{EMAIL_DOMAIN}</b>. Repeated wrong passwords lock sign-in for 15 minutes.</span>
      </div>
    </AuthShell>
  )
}
