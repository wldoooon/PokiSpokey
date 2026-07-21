"use client"

import { useEffect } from "react"

/**
 * Adds/removes `page-anim-paused` on <body> when the tab is hidden/visible.
 * CSS in globals.css uses this class to pause expensive animations
 * (gold-shimmer, card-animated-border, search-animated-border, usage-shimmer)
 * so they don't burn CPU/GPU while the user isn't looking at the page.
 */
export function AnimationPauser() {
  useEffect(() => {
    const onVisibilityChange = () => {
      document.body.classList.toggle("page-anim-paused", document.hidden)
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [])

  return null
}
