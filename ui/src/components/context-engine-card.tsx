"use client"

import React, { useEffect, useRef, useState } from "react"

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "lord-icon": any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "lord-icon": any;
      }
    }
  }
}

export function ContextEngineCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("@lordicon/element").then((mod: any) => {
      mod.defineElement(mod.Element)
    })
  }, [])

  // Pause lord-icon loop when scrolled out of viewport
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={cardRef} className="relative p-8 min-h-80 flex flex-col border-b lg:border-b-0 lg:border-r border-border/40">

      {/* Top metadata row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <lord-icon
            src="/global.json"
            trigger={inView ? "loop" : "hover"}
            colors="primary:#ea580c,secondary:#ea580c"
            style={{ width: 32, height: 32 }}
          />
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            Context Engine
          </span>
        </div>
      </div>


      {/* Footer */}
      <div className="pt-4 border-t border-border/20">
        <h3 className="text-base font-bold tracking-tight text-foreground mb-1">Context Engine</h3>
        <p className="text-xs text-foreground/60 leading-relaxed font-medium">
          Find the exact millisecond a word is spoken across millions of real videos.
        </p>
      </div>

    </div>
  )
}
