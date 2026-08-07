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
    // no audio available — the visual "Time's up" still shows
  }
}

// Configurable kitchen timer: set minutes (or use the recipe's prep/cook
// presets), start/pause/reset. Uses an end-timestamp so it stays accurate
// even if the tab is backgrounded.
export default function Timer({ presets = [] }) {
  const defaultMinutes = presets[0]?.minutes || 10
  const [minutes, setMinutes] = useState(defaultMinutes)
  const [remaining, setRemaining] = useState(defaultMinutes * 60)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const endAtRef = useRef(null)

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

  function applyMinutes(value) {
    const m = Math.max(1, Math.min(600, Number(value) || 1))
    setMinutes(m)
    setRemaining(m * 60)
    setDone(false)
    setRunning(false)
  }

  function start() {
    const seconds = remaining > 0 ? remaining : minutes * 60
    endAtRef.current = Date.now() + seconds * 1000
    setRemaining(seconds)
    setDone(false)
    setRunning(true)
  }

  function pause() {
    setRunning(false)
  }

  function reset() {
    setRunning(false)
    setDone(false)
    setRemaining(minutes * 60)
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className={`timer ${done ? 'timer-done' : ''}`}>
      <div className="timer-top">
        <span className="timer-label">⏲ Timer</span>
        <div className="timer-presets">
          {presets.map((p) => (
            <button key={p.label} type="button" className="chip" onClick={() => applyMinutes(p.minutes)}>
              {p.label} {p.minutes}m
            </button>
          ))}
        </div>
      </div>
      <div className="timer-main">
        <span className="timer-display" role="timer">
          {done ? 'Time’s up!' : `${mm}:${ss}`}
        </span>
        <label className="timer-set">
          <input
            type="number"
            min="1"
            max="600"
            value={minutes}
            disabled={running}
            onChange={(e) => applyMinutes(e.target.value)}
          />
          min
        </label>
        <div className="timer-buttons">
          {running ? (
            <button type="button" onClick={pause}>
              Pause
            </button>
          ) : (
            <button type="button" className="primary" onClick={start}>
              {remaining > 0 && remaining < minutes * 60 ? 'Resume' : 'Start'}
            </button>
          )}
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
