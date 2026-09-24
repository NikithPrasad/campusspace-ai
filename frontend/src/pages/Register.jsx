import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, User, Building, Eye, EyeOff, ArrowRight, Check, Loader2, GraduationCap, Presentation } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errorMessage, EMAIL_DOMAIN, toCollegeEmail, isCollegeEmail } from '../api'
import { Alert } from '../components/ui'
import AuthShell from './AuthShell'
import { IconInput, CollegeEmailInput } from './Login'

function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? 'bg-emerald-100' : 'bg-slate-100'}`}>
        <Check className="h-2.5 w-2.5" />
      </span>
      {children}
    </li>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', department: '', password: '', designation: 'STUDENT' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const pw = form.password
  const rules = { len: pw.length >= 8, letter: /[A-Za-z]/.test(pw), num: /\d/.test(pw) }

  const submit = async (e) => {
    e.preventDefault()
    const email = toCollegeEmail(form.email)
    if (!isCollegeEmail(email)) {
      setError(`Only @${EMAIL_DOMAIN} accounts can register.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload = { ...form, email }
      if (!payload.department) delete payload.department
      await register(payload)
      navigate('/')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="For VNR VJIET students and staff. Use your college email."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink underline decoration-slate-300 underline-offset-4 hover:decoration-ink">
            Sign in
          </Link>
        </>
      }
    >
      <Alert onClose={() => setError('')}>{error}</Alert>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="label">I am a</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: 'STUDENT', label: 'Student', icon: GraduationCap },
              { v: 'FACULTY', label: 'Faculty', icon: Presentation },
            ].map(({ v, label, icon: I }) => (
              <button key={v} type="button" onClick={() => setForm({ ...form, designation: v })}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium ring-1 transition ${
                  form.designation === v ? 'bg-ink text-white ring-ink' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
                }`}>
                <I className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <IconInput id="name" icon={User} required minLength={2} autoComplete="name" placeholder="Ravi Kumar" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label" htmlFor="email">College email</label>
          <CollegeEmailInput id="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        </div>
        <div>
          <label className="label flex justify-between" htmlFor="dept">
            Department <span className="font-normal text-slate-400">Optional</span>
          </label>
          <IconInput id="dept" icon={Building} placeholder="e.g. CSE" value={form.department} onChange={set('department')} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <IconInput
            id="password" icon={Lock} type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" placeholder="Create a password"
            value={form.password} onChange={set('password')}
            right={
              <button type="button" onClick={() => setShow(!show)} className="btn-icon h-7 w-7" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            <Rule ok={rules.len}>8+ characters</Rule>
            <Rule ok={rules.letter}>A letter</Rule>
            <Rule ok={rules.num}>A number</Rule>
          </ul>
        </div>
        <button className="btn-primary btn-lg w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </AuthShell>
  )
}
