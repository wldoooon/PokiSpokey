"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Compass, User } from "lucide-react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { AuthDialog } from "@/components/auth-dialog"
import { startTour } from "@/components/app-tour"

const WELCOME_KEY = "vl_welcome_done"
const DEMO_VIDEO_SRC = "https://me78yeazv3ihsfxh.public.blob.vercel-storage.com/how%20it%20work.mp4"
const STEPS = ["welcome", "how", "tour", "start"] as const
const SI_LABELS = ["Welcome", "In Action", "Guided Tour", "Ready"]

function StepIndicator({ step, open }: { step: number; open: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const hasDrawn = useRef(false)
  const prevStep = useRef(0)

  // Initial draw when dialog opens
  useEffect(() => {
    if (!open) { hasDrawn.current = false; prevStep.current = 0; return }
    if (hasDrawn.current || !ref.current) return
    hasDrawn.current = true
    prevStep.current = 0

    const circles = ref.current.querySelectorAll<HTMLElement>(".si-circle")
    const tracks = ref.current.querySelectorAll<HTMLElement>(".si-track")

    const tl = gsap.timeline()
    // Circles start invisible
    gsap.set(circles, { scale: 0 })
    // Tracks draw left → right
    tl.fromTo(tracks,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.38, ease: "power2.out", stagger: 0.14, transformOrigin: "left center" }
    )
    // Circles pop in after their line arrives
    tl.fromTo(circles,
      { scale: 0 },
      { scale: 1, duration: 0.28, ease: "back.out(2.5)", stagger: 0.1 },
      "-=0.25"
    )
  }, [open])

  // Step change animation
  useEffect(() => {
    if (!ref.current || !hasDrawn.current) return
    const prev = prevStep.current
    if (prev === step) return
    prevStep.current = step

    const isForward = step > prev
    const lineIdx = isForward ? prev : step

    const fill = ref.current.querySelector<HTMLElement>(`.si-fill-${lineIdx}`)
    const dot  = ref.current.querySelector<HTMLElement>(`.si-dot-${lineIdx}`)
    const circle = ref.current.querySelector<HTMLElement>(`.si-circle-${step}`)

    const tl = gsap.timeline()

    if (isForward && fill && dot) {
      // Dot races across the line, then fill snaps full
      tl.set(dot, { opacity: 1, left: "0%" })
      tl.to(dot, { left: "100%", duration: 0.38, ease: "power3.in" })
      tl.set(dot, { opacity: 0 })
      tl.set(fill, { width: "100%" }, "<")
    } else if (!isForward && fill) {
      // Drain right → left
      tl.to(fill, { width: "0%", duration: 0.3, ease: "power2.in" })
    }

    // Heartbeat on the newly active circle
    if (circle) {
      tl.fromTo(circle,
        { scale: 1 },
        { scale: 1.22, duration: 0.13, ease: "power2.out", yoyo: true, repeat: 1 },
        isForward ? "-=0.12" : "+=0"
      )
    }
  }, [step])

  return (
    <div ref={ref} className="px-8 pt-5 pb-5 border-b border-border/30">
      {/* Row 1: circles + animated lines */}
      <div className="flex items-center">
        {SI_LABELS.map((_, i) => (
          <React.Fragment key={i}>
            <div className={`si-circle si-circle-${i} h-6 w-6 rounded-full border flex items-center justify-center text-[11px] font-medium shrink-0 ${
              i <= step ? "border-primary text-primary" : "border-border text-muted-foreground/40"
            }`}>
              {i + 1}
            </div>
            {i < SI_LABELS.length - 1 && (
              <div className="flex-1 relative h-3 flex items-center mx-2">
                <div className="si-track absolute inset-x-0 h-px bg-border/40 rounded-full" />
                <div className={`si-fill-${i} absolute h-px bg-primary rounded-full left-0`} style={{ width: "0%" }} />
                <div className={`si-dot-${i} absolute h-2 w-2 rounded-full bg-primary`} style={{ top: "50%", marginTop: -4, opacity: 0, left: "0%" }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Row 2: labels */}
      <div className="flex items-start mt-2.5">
        {SI_LABELS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="shrink-0 w-6 relative h-3.5">
              <span className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap transition-colors duration-300 ${
                i <= step ? "text-foreground" : "text-muted-foreground/40"
              }`}>
                {label}
              </span>
            </div>
            {i < SI_LABELS.length - 1 && <div className="flex-1 mx-2" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

const HEADLINE_WORDS = ["Finally", "hear", "words", "the", "way", "real", "people", "say", "them"]

function StepWelcome({ theme: _ }: { theme?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.25 })

    tl.fromTo(".w-logo",
      { y: -16, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }
    )
    .fromTo(".w-word",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.38, ease: "power3.out", stagger: 0.045 },
      "-=0.1"
    )
    .fromTo(".w-desc",
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "power2.out", stagger: 0.09 },
      "-=0.15"
    )
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="flex flex-col justify-center h-full gap-5">
      {/* Logo + Headline inline */}
      <div className="flex items-center gap-4">
        <img src="/main_logo.png" alt="PokiSpokey" className="w-logo w-30 h-30 object-contain shrink-0" />
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight flex flex-wrap gap-x-[0.27em]">
          {HEADLINE_WORDS.map((word, i) => (
            <span key={i} className="w-word inline-block">{word}</span>
          ))}
        </h2>
      </div>

      {/* Welcome title */}
      <p className="w-desc text-xl font-bold text-foreground">
        Welcome To <span className="text-primary">PokiSpokey</span>
      </p>

      {/* Description */}
      <p className="w-desc text-base text-muted-foreground leading-relaxed">
        Just type any word and we'll find you the exact moment it's used in a real movie, podcast, or TV show so you can hear how people actually say it, not how a textbook tells you to.
      </p>
      <p className="w-desc text-base text-muted-foreground leading-relaxed">
        No boring exercises. No robot voices. Just real clips, real people, real language.
      </p>
    </div>
  )
}

const HOW_TITLE = "See it in action"

function StepHow({ active, onRegisterExit }: { active: boolean; onRegisterExit: (fn: () => Promise<void>) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    if (!videoRef.current) return
    if (active) {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
    }
  }, [active])

  const handleCanPlay = useCallback(() => setVideoReady(true), [])

  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.25 })

    tl.fromTo(".h-char",
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
    )
    .fromTo(".h-video",
      { scale: 0.88, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.4)" },
      "-=0.15"
    )

    onRegisterExit(() => new Promise<void>(resolve => {
      gsap.to(".h-video", {
        scale: 0.88,
        opacity: 0,
        duration: 0.22,
        ease: "power2.in",
        onComplete: resolve,
      })
    }))
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="flex flex-col h-full gap-2">
      <h2 className="h-char text-lg font-extrabold tracking-tight text-foreground shrink-0">
        {HOW_TITLE}
      </h2>
      <div className="h-video overflow-hidden rounded-xl border border-border/50 flex-1 min-h-0 relative">
        {/* Loading skeleton — shown until the browser has buffered enough to play */}
        {!videoReady && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-xl" />
        )}
        <video
          ref={videoRef}
          src={DEMO_VIDEO_SRC}
          preload="auto"
          playsInline
          onCanPlay={handleCanPlay}
          onEnded={() => {
            if (videoRef.current) videoRef.current.play().catch(() => {})
          }}
          style={{
            width: "100%", height: "100%", objectFit: "cover", display: "block",
            opacity: videoReady ? 1 : 0,
            transition: "opacity 0.25s ease",
          }}
        />
      </div>
    </div>
  )
}

function StepTour() {
  return (
    <div className="grid grid-cols-5 gap-8 h-full">
      {/* Left: explanation */}
      <div className="col-span-3 flex flex-col justify-center gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">
          Not sure what something does?
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          Anywhere you see a <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-border text-[11px] font-bold text-foreground align-middle mx-0.5">?</span> icon on the page, click it. It will show you exactly what that part of the app does, in plain words, no guessing needed.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          You can click them as many times as you want, whenever something feels unclear.
        </p>
      </div>

      {/* Right: single search bar skeleton with ? icon */}
      <div className="col-span-2 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="w-full rounded-xl border border-border/60 bg-card shadow-sm px-3 py-3 flex items-center gap-2">
            <div className="h-2 w-3 rounded bg-muted/40 shrink-0" />
            <div className="h-1.5 flex-1 rounded bg-muted/30" />
            <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-muted-foreground">?</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Tap any <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full border border-border text-[8px] font-bold text-foreground align-middle mx-0.5">?</span> to learn what it does</p>
        </div>
      </div>
    </div>
  )
}

function StepStart({ onGuest, onSignUp }: { onGuest: () => void; onSignUp: () => void }) {
  return (
    <div className="flex flex-col justify-center h-full gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">How do you want to start?</h2>
        <p className="text-sm text-muted-foreground mt-1">You can always create an account later.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Guest card */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">Jump right in</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Search words and hear them in real clips. No account needed, start instantly.
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-1" onClick={onGuest}>
            Continue as guest →
          </Button>
        </div>

        {/* Sign up card */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 relative overflow-hidden">
          <div className="usage-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-black/8 to-transparent dark:via-white/10" />
          <div className="absolute top-3 right-3 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full z-10">Recommended</div>
          <div className="flex-1 relative z-10">
            <p className="font-semibold text-foreground text-sm mt-1">Get the full experience</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Chat with AI about what you hear, get explanations, and unlock more searches every month.
            </p>
          </div>
          <Button size="sm" className="w-full relative z-10" onClick={onSignUp}>
            Create free account
          </Button>
        </div>
      </div>
    </div>
  )
}

let _openOnboarding: (() => void) | null = null
export function openOnboarding() {
  localStorage.removeItem(WELCOME_KEY)
  _openOnboarding?.()
}

export function OnboardingDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [authOpen, setAuthOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const howExitRef = useRef<(() => Promise<void>) | undefined>(undefined)

  useEffect(() => {
    _openOnboarding = () => { setStep(0); setDirection(1); setOpen(true) }
    return () => { _openOnboarding = null }
  }, [])

  // Preload the demo video as soon as the dialog opens so it's ready by step 2
  useEffect(() => {
    if (!open) return
    const link = document.createElement("link")
    link.rel = "preload"
    link.as = "video"
    link.type = "video/mp4"
    link.href = DEMO_VIDEO_SRC
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [open])

  useEffect(() => {
    if (!localStorage.getItem(WELCOME_KEY)) setOpen(true)
  }, [])

  const goTo = async (next: number) => {
    setDirection(next > step ? 1 : -1)
    if (step === 1 && howExitRef.current) await howExitRef.current()
    setStep(next)
  }

  const close = (withTour = false) => {
    localStorage.setItem(WELCOME_KEY, "1")
    setOpen(false)
    if (withTour) {
      setTimeout(() => startTour(), 400)
    }
  }

  const handleSignUp = () => {
    localStorage.setItem(WELCOME_KEY, "1")
    setOpen(false)
    setTimeout(() => setAuthOpen(true), 300)
  }

  const total = STEPS.length

  return (
    <>
    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab="signup" />
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-4xl p-0 overflow-hidden rounded-2xl gap-0 border-border/60"
      >

        <DialogTitle className="sr-only">Welcome to PokiSpokey</DialogTitle>
        <StepIndicator step={step} open={open} />

        {/* Slide area */}
        <div className="relative overflow-hidden" style={{ minHeight: step === 1 ? 560 : 340 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={step === 0 ? false : { x: direction * 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -340, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="absolute inset-0 px-8 pt-4 pb-3 flex flex-col"
            >
              {step === 0 && <StepWelcome theme={resolvedTheme} />}
              {step === 1 && <StepHow active={open && step === 1} onRegisterExit={fn => { howExitRef.current = fn }} />}
              {step === 2 && <StepTour />}
              {step === 3 && <StepStart onGuest={() => close(true)} onSignUp={handleSignUp} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 pt-3 flex items-center justify-between border-t border-border/30">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => goTo(step - 1)} className="text-muted-foreground">
              ← Back
            </Button>
          ) : (
            <div />
          )}

          {step < total - 1 && (
            <Button size="sm" onClick={() => goTo(step + 1)}>
              Next →
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
    </>
  )
}
