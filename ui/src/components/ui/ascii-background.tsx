"use client"

import { useEffect, useRef } from "react"

// Char sets per angular sector — different "arms" of the bloom get different chars
const SECTOR_CHARS = ["·", ".", ",", ";", ":", "'", "-", "~", "`", "\"", "_", "+"]
const CELL = 16
const FPS = 15

interface AsciiBackgroundProps {
  isDark?: boolean
  className?: string
}

export function AsciiBackground({ isDark = false, className }: AsciiBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId = 0
    let prevTs = 0
    let t = 0
    let isVisible = true
    let isInViewport = true

    const sync = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      ctx.font = `${CELL - 4}px monospace`
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(canvas)

    const rgb = isDark ? "255,255,255" : "0,0,0"

    const tick = (ts: number) => {
      const dt = (ts - prevTs) / 1000
      if (dt < 1 / FPS) {
        rafId = requestAnimationFrame(tick)
        return
      }
      prevTs = ts
      t += Math.min(dt, 0.05)

      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      // Diagonal = maximum possible distance from center
      const maxDist = Math.sqrt(cx * cx + cy * cy)

      const cols = Math.ceil(w / CELL) + 1
      const rows = Math.ceil(h / CELL) + 1

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // World-space offset from center (pixel units)
          const px = c * CELL + CELL * 0.5 - cx
          const py = r * CELL + CELL * 0.5 - cy

          const dist = Math.sqrt(px * px + py * py)
          const angle = Math.atan2(py, px)   // –π … π
          const nd = dist / maxDist           //  0 … 1

          // ── 1. Expanding concentric rings ──────────────────────────
          // Rings travel outward at 140 px/s; period = 40% of max radius
          const period = maxDist * 0.40
          const phase = ((dist - t * 140) % period + period) % period / period
          const ring = Math.sin(phase * Math.PI * 2)  // –1 … 1

          // ── 2. 5-petal bloom (angle modulation) ───────────────────
          // Creates 5 brighter "arms"; slowly rotates
          const bloom = Math.cos(angle * 5 - t * 0.8) * 0.38 + 0.62  // 0.24 … 1

          // ── 3. Vortex twist ───────────────────────────────────────
          // Spiral distortion proportional to distance
          const twist = Math.sin(angle * 3 + dist * 0.022 - t * 1.6) * 0.28

          // ── 4. Combine ─────────────────────────────────────────────
          const raw = ((ring + 1) / 2) * bloom + twist

          // ── 5. Distance envelope ───────────────────────────────────
          // Quiet at center & far edge, peak at ~45% radius
          // sin(x * 1.1π) for x ∈ [0,1]: rises, peaks, falls gracefully
          const envelope = Math.pow(
            Math.sin(Math.min(nd * Math.PI * 1.15, Math.PI)),
            0.75
          )

          const intensity = Math.max(0, raw * envelope)
          if (intensity < 0.36) continue

          const alpha = Math.min((intensity - 0.36) * 0.52, 0.26)

          // Character varies by angle sector (slowly drifting)
          const sector = Math.floor(
            ((angle + Math.PI + t * 0.08) / (Math.PI * 2) + 1) % 1 * SECTOR_CHARS.length
          )
          const char = SECTOR_CHARS[sector % SECTOR_CHARS.length]

          ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`
          ctx.fillText(char, c * CELL, (r + 1) * CELL - 4)
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    const startLoop = () => {
      if (rafId === 0 && isVisible && isInViewport) {
        prevTs = 0
        rafId = requestAnimationFrame(tick)
      }
    }

    const stopLoop = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
    }

    // Pause when tab is hidden, resume when visible again
    const onVisibilityChange = () => {
      isVisible = !document.hidden
      if (isVisible) startLoop()
      else stopLoop()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    // Pause when scrolled out of viewport
    const io = new IntersectionObserver(
      ([entry]) => {
        isInViewport = entry.isIntersecting
        if (isInViewport) startLoop()
        else stopLoop()
      },
      { threshold: 0 }
    )
    io.observe(canvas)

    startLoop()

    return () => {
      stopLoop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [isDark])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ""}`}
      aria-hidden="true"
    />
  )
}
