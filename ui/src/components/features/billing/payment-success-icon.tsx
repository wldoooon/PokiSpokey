"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

const CIRCLE_R = 30
const CIRCLE_LEN = 2 * Math.PI * CIRCLE_R  // ≈ 188.5
const CHECK_LEN  = 52                        // approx path length of the checkmark

// 8 particles evenly distributed around the circle
const PARTICLES = [
  { cx: 40, cy: 4   },
  { cx: 68, cy: 14  },
  { cx: 76, cy: 40  },
  { cx: 68, cy: 66  },
  { cx: 40, cy: 76  },
  { cx: 12, cy: 66  },
  { cx: 4,  cy: 40  },
  { cx: 12, cy: 14  },
]

export function PaymentSuccessIcon({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useGSAP(() => {
    // ── Initial state ──────────────────────────────────────────────────────
    gsap.set("#psi-bg",    { scale: 0, transformOrigin: "40px 40px" })
    gsap.set("#psi-ring",  { strokeDashoffset: CIRCLE_LEN })
    gsap.set("#psi-check", { strokeDashoffset: CHECK_LEN, opacity: 0 })
    gsap.set(".psi-dot",   { scale: 0, opacity: 0, transformOrigin: "center" })

    const tl = gsap.timeline()

    // 1. Background circle pops in
    tl.to("#psi-bg", {
      scale: 1, duration: 0.38, ease: "back.out(2.2)",
    })

    // 2. Ring draws around it
    .to("#psi-ring", {
      strokeDashoffset: 0, duration: 0.52, ease: "power2.inOut",
    }, 0.08)

    // 3. Checkmark draws
    .to("#psi-check", {
      strokeDashoffset: 0, opacity: 1, duration: 0.32, ease: "power2.out",
    }, 0.46)

    // 4. Particle burst
    .to(".psi-dot", {
      scale: 1, opacity: 1, duration: 0.18,
      stagger: { each: 0.03, from: "start" },
      ease: "power2.out",
    }, 0.65)
    .to(".psi-dot", {
      scale: 0, opacity: 0, duration: 0.25,
      stagger: { each: 0.03, from: "start" },
      ease: "power2.in",
    }, 0.9)

    // 5. Whole icon bounces
    .to(svgRef.current, {
      scale: 1.1, duration: 0.12, ease: "power1.out",
      transformOrigin: "40px 40px",
    }, 0.72)
    .to(svgRef.current, {
      scale: 1, duration: 0.35, ease: "elastic.out(1, 0.45)",
      transformOrigin: "40px 40px",
    }, 0.84)

  }, { scope: svgRef })

  return (
    <svg
      ref={svgRef}
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      className={className}
    >
      {/* Soft background fill */}
      <circle
        id="psi-bg"
        cx="40" cy="40" r="33"
        fill="rgb(16 185 129 / 0.12)"
      />

      {/* Animated ring */}
      <circle
        id="psi-ring"
        cx="40" cy="40" r={CIRCLE_R}
        stroke="rgb(16 185 129)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={CIRCLE_LEN}
        strokeDashoffset={CIRCLE_LEN}
        transform="rotate(-90 40 40)"
        fill="none"
      />

      {/* Animated checkmark */}
      <path
        id="psi-check"
        d="M 24 40 L 34 51 L 56 29"
        stroke="rgb(16 185 129)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={CHECK_LEN}
        strokeDashoffset={CHECK_LEN}
      />

      {/* Burst particles */}
      {PARTICLES.map((p, i) => (
        <circle
          key={i}
          className="psi-dot"
          cx={p.cx}
          cy={p.cy}
          r={2.5}
          fill="rgb(16 185 129)"
        />
      ))}
    </svg>
  )
}
