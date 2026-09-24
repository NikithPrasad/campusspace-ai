import { useEffect, useRef, useState } from 'react'

// Smoothly counts from the previous value to `target` (ease-out), for stat numbers.
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (typeof target !== 'number' || Number.isNaN(target)) return
    const start = performance.now()
    const begin = from.current
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(begin + (target - begin) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// Runs `handler` on Ctrl/⌘ + key
export function useHotkey(key, handler) {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, handler])
}
