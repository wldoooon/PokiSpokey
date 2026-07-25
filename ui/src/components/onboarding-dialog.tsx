"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { AuthDialog } from "@/components/auth-dialog"
import { startTour } from "@/components/app-tour"

const WELCOME_KEY = "vl_welcome_done"
const STEPS = ["welcome", "tour", "start"] as const
const SI_LABELS = ["Welcome", "Guided Tour", "Ready"]

// All keyframes live here — injected once via <style> in OnboardingDialog.
// Every animation uses only transform + opacity → runs on the GPU compositor
// thread, never blocked by JS/React/GC, even on 1GB RAM phones.
const KEYFRAMES = `
@keyframes si-track-draw {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes si-circle-pop {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}
@keyframes si-heartbeat {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.22); }
  100% { transform: scale(1); }
}
@keyframes w-logo-in {
  from { transform: translateY(-16px) scale(0.8); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes w-word-in {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes w-desc-in {
  from { transform: translateY(10px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
`

// CSS cubic-bezier equivalents of GSAP named eases
const E = {
  backOut2:  "cubic-bezier(0.34,1.56,0.64,1)",
  backOut25: "cubic-bezier(0.34,1.65,0.64,1)",
  backOut14: "cubic-bezier(0.34,1.3,0.64,1)",
  power3Out: "cubic-bezier(0.22,1,0.36,1)",
  power2Out: "cubic-bezier(0.33,1,0.68,1)",
}

// Builds a CSS `animation` shorthand string.
// `both` = backwards (apply `from` during delay) + forwards (hold `to` after end).
function a(name: string, dur: number, ease: string, delay = 0): string {
  return `${name} ${dur}s ${ease} ${delay}s both`
}

// ---------------------------------------------------------------------------
// StepIndicator
// ---------------------------------------------------------------------------

function StepIndicator({ step, open }: { step: number; open: boolean }) {
  const [animStarted, setAnimStarted] = useState(false)
  // Tracks which circles have finished their pop — prevents replay on heartbeat reset
  const [poppedSet, setPoppedSet] = useState<Set<number>>(new Set())
  // Which circle index should pulse right now (-1 = none)
  const [pulseIdx, setPulseIdx] = useState(-1)
  // scaleX value for each of the 3 fill bars (0 = empty, 1 = full)
  const [fillScales, setFillScales] = useState([0, 0])
  const prevStep = useRef(0)

  // Start / reset animations when dialog opens or closes
  useEffect(() => {
    if (!open) {
      setAnimStarted(false)
      setPoppedSet(new Set())
      setPulseIdx(-1)
      setFillScales([0, 0])
      prevStep.current = 0
      return
    }
    setAnimStarted(true)
  }, [open])

  // Animate fill bar + heartbeat on step change
  useEffect(() => {
    if (!animStarted) return
    const prev = prevStep.current
    if (prev === step) return
    prevStep.current = step

    const isForward = step > prev
    const lineIdx = isForward ? prev : step

    setFillScales(cur => {
      const next = [...cur]
      next[lineIdx] = isForward ? 1 : 0
      return next
    })

    setPulseIdx(step)
  }, [step, animStarted])

  const handleCircleAnimEnd = (e: React.AnimationEvent<HTMLDivElement>, i: number) => {
    if (e.animationName === "si-circle-pop") {
      setPoppedSet(prev => new Set([...prev, i]))
    } else if (e.animationName === "si-heartbeat") {
      setPulseIdx(-1)
    }
  }

  const getCircleAnimation = (i: number): string | undefined => {
    if (pulseIdx === i) return a("si-heartbeat", 0.26, "ease-out")
    if (animStarted && !poppedSet.has(i)) return a("si-circle-pop", 0.28, E.backOut25, 0.41 + i * 0.1)
    return undefined
  }

  return (
    <div className="px-4 sm:px-8 pt-4 sm:pt-5 pb-4 sm:pb-5 border-b border-border/30">
      {/* Row 1: circles + animated lines */}
      <div className="flex items-center">
        {SI_LABELS.map((_, i) => (
          <React.Fragment key={i}>
            <div
              className={`h-6 w-6 rounded-full border flex items-center justify-center text-[11px] font-medium shrink-0 ${
                i <= step ? "border-primary text-primary" : "border-border text-muted-foreground/40"
              }`}
              style={{
                animation: getCircleAnimation(i),
                // Hold at scale(0) until the CSS animation takes over (prevents one-frame flash)
                transform: !animStarted && !poppedSet.has(i) ? "scale(0)" : undefined,
              }}
              onAnimationEnd={e => handleCircleAnimEnd(e, i)}
            >
              {i + 1}
            </div>
            {i < SI_LABELS.length - 1 && (
              <div className="flex-1 relative h-3 flex items-center mx-2">
                {/* Gray track — draws in left → right on open */}
                <div
                  className="absolute inset-x-0 h-px bg-border/40 rounded-full"
                  style={{
                    transformOrigin: "left center",
                    // Hold at scaleX(0) before animation starts to avoid flash
                    transform: !animStarted ? "scaleX(0)" : undefined,
                    animation: animStarted ? a("si-track-draw", 0.38, E.power2Out, i * 0.14) : undefined,
                  }}
                />
                {/* Primary fill bar — CSS transition driven by fillScales state */}
                <div
                  className="absolute h-px bg-primary rounded-full left-0 right-0"
                  style={{
                    transform: `scaleX(${fillScales[i]})`,
                    transformOrigin: "left center",
                    transition: "transform 0.35s cubic-bezier(0.33,1,0.68,1)",
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Row 2: labels — hidden on very small screens where they'd overlap */}
      <div className="hidden min-[420px]:flex items-start mt-2.5">
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

// ---------------------------------------------------------------------------
// StepWelcome
// ---------------------------------------------------------------------------

const HEADLINE_WORDS = ["Finally", "hear", "words", "the", "way", "real", "people", "say", "them"]

function StepWelcome() {
  return (
    <div className="flex flex-col gap-3 sm:gap-5 py-2 sm:py-4">
      {/* Logo + Headline inline */}
      <div className="flex items-center gap-3 sm:gap-4">
        <img
          src="/main_logo.png"
          alt="PokiSpokey"
          className="w-12 h-12 sm:w-20 sm:h-20 object-contain shrink-0"
          style={{ animation: a("w-logo-in", 0.5, E.backOut2, 0.25) }}
        />
        <h2 className="text-xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight flex flex-wrap gap-x-[0.27em]">
          {HEADLINE_WORDS.map((word, i) => (
            <span
              key={i}
              className="inline-block"
              style={{ animation: a("w-word-in", 0.38, E.power3Out, 0.65 + i * 0.045) }}
            >
              {word}
            </span>
          ))}
        </h2>
      </div>

      <p
        className="text-sm sm:text-xl font-bold text-foreground"
        style={{ animation: a("w-desc-in", 0.4, E.power2Out, 1.24) }}
      >
        Welcome To <span className="text-primary">PokiSpokey</span>
      </p>

      <p
        className="text-sm sm:text-base text-muted-foreground leading-relaxed"
        style={{ animation: a("w-desc-in", 0.4, E.power2Out, 1.33) }}
      >
        Just type any word and we&apos;ll find you the exact moment it&apos;s used in a real movie, podcast, or TV show so you can hear how people actually say it, not how a textbook tells you to.
      </p>
      <p
        className="text-sm sm:text-base text-muted-foreground leading-relaxed hidden sm:block"
        style={{ animation: a("w-desc-in", 0.4, E.power2Out, 1.42) }}
      >
        No boring exercises. No robot voices. Just real clips, real people, real language.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StepTour
// ---------------------------------------------------------------------------

function StepTour() {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-5 gap-4 sm:gap-8 py-2 sm:py-4">
      {/* Left: explanation */}
      <div className="sm:col-span-3 flex flex-col gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-tight">
          Not sure what something does?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Anywhere you see a <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-border text-[11px] font-bold text-foreground align-middle mx-0.5">?</span> icon on the page, click it. It will show you exactly what that part of the app does, in plain words, no guessing needed.
        </p>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed hidden sm:block">
          You can click them as many times as you want, whenever something feels unclear.
        </p>
      </div>

      {/* Right: single search bar skeleton with ? icon */}
      <div className="flex sm:col-span-2 items-center justify-center">
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

// ---------------------------------------------------------------------------
// StepStart
// ---------------------------------------------------------------------------

function StepStart({ onGuest, onSignUp }: { onGuest: () => void; onSignUp: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 py-2 sm:py-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">How do you want to start?</h2>
        <p className="text-sm text-muted-foreground mt-1">You can always create an account later.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Guest card */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
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
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 sm:p-5 relative overflow-hidden">
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

// ---------------------------------------------------------------------------
// OnboardingDialog
// ---------------------------------------------------------------------------

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

  useEffect(() => {
    _openOnboarding = () => { setStep(0); setDirection(1); setOpen(true) }
    return () => { _openOnboarding = null }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem(WELCOME_KEY)) setOpen(true)
  }, [])

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const close = (withTour = false) => {
    localStorage.setItem(WELCOME_KEY, "1")
    setOpen(false)
    window.dispatchEvent(new CustomEvent("vl:onboarding-done"))
    if (withTour) {
      setTimeout(() => startTour(), 400)
    }
  }

  const handleSignUp = () => {
    localStorage.setItem(WELCOME_KEY, "1")
    setOpen(false)
    window.dispatchEvent(new CustomEvent("vl:onboarding-done"))
    setTimeout(() => setAuthOpen(true), 300)
  }

  const total = STEPS.length

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab="signup" />
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[95vw] sm:max-w-4xl p-0 overflow-hidden rounded-2xl gap-0 border-border/60 max-h-[92vh] overflow-y-auto"
        >
          <DialogTitle className="sr-only">Welcome to PokiSpokey</DialogTitle>
          <StepIndicator step={step} open={open} />

          {/* Slide area */}
          <div className="overflow-hidden min-h-[240px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={step === 0 ? false : { x: direction * 340, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction * -340, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="w-full px-4 sm:px-8 pb-3 flex flex-col"
              >
                {step === 0 && <StepWelcome />}
                {step === 1 && <StepTour />}
                {step === 2 && <StepStart onGuest={() => close(true)} onSignUp={handleSignUp} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-8 pb-5 sm:pb-6 pt-3 flex items-center justify-between border-t border-border/30">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => goTo(step - 1)} className="text-muted-foreground">
                ← Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => close()} className="text-muted-foreground">
                Skip
              </Button>
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
