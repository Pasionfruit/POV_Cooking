import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Scroll position per page, so Back lands where you were instead of at the top of a list that has
// since been reloaded. The browser can't do this alone: the lists load their recipes after the page
// shows, so there is nothing tall enough to scroll to yet when it tries.
//
// - Every scroll is remembered for the current address (path + query), for this tab.
// - Going Back or Forward to an address scrolls to what was remembered, as soon as the page is tall
//   enough (it waits up to 3 s for the recipes to load, and stops if you scroll yourself).
// - Opening a different page starts at the top.

const PREFIX = 'pov_scroll:'

function read(key) {
  try {
    const value = sessionStorage.getItem(PREFIX + key)
    return value == null ? null : Number(value)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    sessionStorage.setItem(PREFIX + key, String(Math.round(value)))
  } catch {
    // private mode or storage full: Back just won't restore the position
  }
}

export default function ScrollMemory() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const address = location.pathname + location.search
  const addressRef = useRef(address)
  const lastPath = useRef(location.pathname)

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  // Updated while the new page is committed, before the browser reports the scroll jump that comes
  // from the old page disappearing, so that jump is saved under the new address, not the old one.
  useLayoutEffect(() => {
    addressRef.current = address
  }, [address])

  useEffect(() => {
    const save = () => write(addressRef.current, window.scrollY)
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [])

  useEffect(() => {
    const samePage = lastPath.current === location.pathname
    lastPath.current = location.pathname
    if (navigationType !== 'POP') {
      if (!samePage) window.scrollTo(0, 0)
      return undefined
    }
    const target = read(address)
    if (!target) {
      if (!samePage) window.scrollTo(0, 0)
      return undefined
    }
    let frame = 0
    let stopped = false
    const started = performance.now()
    const stop = () => {
      stopped = true
      cancelAnimationFrame(frame)
    }
    const tick = () => {
      if (stopped) return
      const reachable = document.documentElement.scrollHeight - window.innerHeight
      if (reachable >= target || performance.now() - started > 3000) {
        window.scrollTo(0, Math.min(target, Math.max(reachable, 0)))
        return
      }
      frame = requestAnimationFrame(tick)
    }
    tick()
    const interrupts = ['wheel', 'touchstart', 'keydown', 'mousedown']
    interrupts.forEach((name) => window.addEventListener(name, stop, { once: true, passive: true }))
    return () => {
      stop()
      interrupts.forEach((name) => window.removeEventListener(name, stop))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  return null
}
