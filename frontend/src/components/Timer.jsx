import React, { useEffect, useRef, useState } from 'react'

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
    osc.onended = () => ctx.close()
  } catch {
    // no audio available — the visual state still shows
  }
}

const SIZE = 220
const MINUTE_RADIUS = 90
const SECOND_RADIUS = 62
const RING_SPLIT = 76 // pointer distance that separates the two rings

function polarPoint(angle, radius) {
  const rad = (angle * Math.PI) / 180
  return [radius * Math.sin(rad), -radius * Math.cos(rad)]
}

function arcDash(angle, radius) {
  const circumference = 2 * Math.PI * radius
  return `${(circumference * angle) / 360} ${circumference}`
}

// Kitchen timer set with a drag dial: outer ring = minutes (0-59), inner ring =
// seconds (5s steps). Uses an end-timestamp so it stays accurate when the tab
// is backgrounded.
export default function Timer({ presets = [] }) {
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(presets[0] ? Math.min(presets[0].minutes, 59) : 10)
  const [seconds, setSeconds] = useState(0)
  const [remaining, setRemaining] = useState(() => (presets[0] ? Math.min(presets[0].minutes, 59) : 10) * 60)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const endAtRef = useRef(null)
  const dragRingRef = useRef(null)
  const svgRef = useRef(null)

  const configured = minutes * 60 + seconds

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        setRunning(false)
        setDone(true)
        beep()
      }
    }
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [running])

  function applyDial(nextMinutes, nextSeconds) {
    setMinutes(nextMinutes)
    setSeconds(nextSeconds)
    setRemaining(nextMinutes * 60 + nextSeconds)
    setDone(false)
  }

  function pointerToDial(e) {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * SIZE - SIZE / 2
    const y = ((e.clientY - rect.top) / rect.height) * SIZE - SIZE / 2
    const distance = Math.hypot(x, y)
    const angle = (Math.atan2(x, -y) * 180) / Math.PI
    return { distance, angle: (angle + 360) % 360 }
  }

  function updateFromAngle(ring, angle) {
    if (ring === 'minutes') {
      applyDial(Math.round(angle / 6) % 60, seconds)
    } else {
      applyDial(minutes, (Math.round(angle / 30) * 5) % 60)
    }
  }

  function handlePointerDown(e) {
    if (running) return
    const { distance, angle } = pointerToDial(e)
    if (distance < 40 || distance > 104) return
    dragRingRef.current = distance > RING_SPLIT ? 'minutes' : 'seconds'
    svgRef.current.setPointerCapture(e.pointerId)
    updateFromAngle(dragRingRef.current, angle)
  }

  function handlePointerMove(e) {
    if (!dragRingRef.current) return
    updateFromAngle(dragRingRef.current, pointerToDial(e).angle)
  }

  function handlePointerUp() {
    dragRingRef.current = null
  }

  function start() {
    const total = remaining > 0 ? remaining : configured
    if (total === 0) return
    endAtRef.current = Date.now() + total * 1000
    setRemaining(total)
    setDone(false)
    setRunning(true)
  }

  function reset() {
    setRunning(false)
    setDone(false)
    setRemaining(configured)
  }

  const minuteAngle = (minutes / 60) * 360
  const secondAngle = (seconds / 60) * 360
  const [mhx, mhy] = polarPoint(minuteAngle, MINUTE_RADIUS)
  const [shx, shy] = polarPoint(secondAngle, SECOND_RADIUS)
  const progressAngle = running || remaining !== configured ? (configured ? (remaining / configured) * 360 : 0) : minuteAngle

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const paused = !running && remaining > 0 && remaining !== configured

  return (
    <div className={`timer ${done ? 'timer-done' : ''}`}>
      <div className="timer-top">
        <button type="button" className="timer-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className={`caret ${open ? 'open' : ''}`} aria-hidden>
            ›
          </span>
          <span className="timer-label">Timer</span>
          {!open && (running || paused || done) && (
            <span className="timer-mini">{done ? 'Done' : `${mm}:${ss}`}</span>
          )}
        </button>
        {open && (
          <div className="timer-presets">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip"
                disabled={running}
                onClick={() => applyDial(Math.min(p.minutes, 59), 0)}
              >
                {p.label} {p.minutes} min
              </button>
            ))}
          </div>
        )}
      </div>
      {open && (
      <div className="dial-wrap">
        <svg
          ref={svgRef}
          className="dial"
          viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
          data-running={running || undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <circle className="dial-track" r={MINUTE_RADIUS} />
          <circle className="dial-track" r={SECOND_RADIUS} />
          {running || paused ? (
            <circle
              className="dial-arc"
              r={MINUTE_RADIUS}
              strokeDasharray={arcDash(progressAngle, MINUTE_RADIUS)}
              transform="rotate(-90)"
            />
          ) : (
            <>
              <circle
                className="dial-arc"
                r={MINUTE_RADIUS}
                strokeDasharray={arcDash(minuteAngle, MINUTE_RADIUS)}
                transform="rotate(-90)"
              />
              <circle
                className="dial-arc secondary"
                r={SECOND_RADIUS}
                strokeDasharray={arcDash(secondAngle, SECOND_RADIUS)}
                transform="rotate(-90)"
              />
              <circle className="dial-handle" cx={mhx} cy={mhy} r="9" />
              <circle className="dial-handle secondary" cx={shx} cy={shy} r="7" />
            </>
          )}
          <text className="dial-time" y="4" textAnchor="middle">
            {done ? 'Done' : `${mm}:${ss}`}
          </text>
          <text className="dial-caption" y="24" textAnchor="middle">
            {running ? 'running' : paused ? 'paused' : 'min : sec'}
          </text>
        </svg>
        <p className="muted small dial-legend">Drag the outer ring for minutes, inner ring for seconds.</p>
        <div className="timer-buttons">
          {running ? (
            <button type="button" onClick={() => setRunning(false)}>
              Pause
            </button>
          ) : (
            <button type="button" className="primary" onClick={start} disabled={configured === 0 && remaining === 0}>
              {paused ? 'Resume' : 'Start'}
            </button>
          )}
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
