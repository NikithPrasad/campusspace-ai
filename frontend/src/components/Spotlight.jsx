import { useCountUp } from '../hooks'

// Card wrapper with a soft glow that follows the mouse.
export function Spotlight({ as: Tag = 'div', className = '', glow = 'rgb(99 102 241 / 0.10)', children, ...props }) {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <Tag onMouseMove={onMove} className={`group/spot relative ${className}`} {...props}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: `radial-gradient(380px circle at var(--mx) var(--my), ${glow}, transparent 45%)` }}
      />
      {children}
    </Tag>
  )
}

export function CountUp({ value, className = '' }) {
  const v = useCountUp(value)
  return <span className={`tabular-nums ${className}`}>{v}</span>
}
