"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  Repeat,
  Gauge,
  Globe,
  Loader2,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { usePlayerStore } from "@/stores/use-player-store"
import { useSearchStore } from "@/stores/use-search-store"
import { useTranscript, useTranslateBatch, useTranslationPrefetch } from "@/lib/useApi"
import { useRouter } from "next/navigation"
import type { TranscriptSentence, Clips } from "@/lib/types"
import { formatTime } from "@/lib/player-utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TranscriptBox } from "./transcript-box"
import { DecorIcon } from "@/components/ui/decor-icon"

function useSpamGuard(clickWindowMs = 2000, clickLimit = 5, cooldownSeconds = 5) {
  const [isThrottled, setIsThrottled] = useState(false)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const clickTimestampsRef = useRef<number[]>([])
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Stable reference — only recreates when isThrottled changes
  const guardedAction = useCallback((fn: () => void) => {
    if (isThrottled) return

    const now = Date.now()
    clickTimestampsRef.current = clickTimestampsRef.current.filter(ts => now - ts < clickWindowMs)
    clickTimestampsRef.current.push(now)

    if (clickTimestampsRef.current.length >= clickLimit) {
      clickTimestampsRef.current = []
      setIsThrottled(true)
      setCooldownLeft(cooldownSeconds)

      let remaining = cooldownSeconds
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1
        setCooldownLeft(remaining)
        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current!)
          countdownTimerRef.current = null
          setIsThrottled(false)
        }
      }, 1000)
      return
    }

    fn()
  }, [isThrottled, clickWindowMs, clickLimit, cooldownSeconds])

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [])

  return { isThrottled, cooldownLeft, guardedAction, cooldownSeconds }
}


// ── Spam Guard Overlay ──────────────────────────────────────────────────────
function SpamGuardOverlay({ cooldownLeft }: { cooldownLeft: number }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/80">
      <div className="bg-card border border-border/50 shadow-sm rounded-full px-3 py-1.5">
        <span className="text-[11px] font-semibold text-foreground">Slow down!! {cooldownLeft}s</span>
      </div>
    </div>
  )
}

// ── Speed Picker ────────────────────────────────────────────────────────────
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

function SpeedPicker({ currentRate, onSelect }: { currentRate: number; onSelect: (s: number) => void }) {
  return (
    <div className="flex flex-col">
      <div className="px-3 pt-2 pb-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Speed</span>
        <div className="mt-1.5 h-px bg-border/60" />
      </div>
      {SPEEDS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={cn(
            "w-full text-left px-3 py-1.5 rounded-md text-sm font-mono transition-colors",
            s === currentRate
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {s}x
        </button>
      ))}
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

const flag = (cc: string) => `https://flagcdn.com/${cc}.svg`

const TRANSLATION_LANGUAGES = [
  { code: "en", label: "English",    flagUrl: flag("us") },
  { code: "ar", label: "Arabic",     flagUrl: flag("sa") },
  { code: "fr", label: "French",     flagUrl: flag("fr") },
  { code: "es", label: "Spanish",    flagUrl: flag("es") },
  { code: "de", label: "German",     flagUrl: flag("de") },
  { code: "tr", label: "Turkish",    flagUrl: flag("tr") },
  { code: "pt", label: "Portuguese", flagUrl: flag("br") },
  { code: "ru", label: "Russian",    flagUrl: flag("ru") },
  { code: "zh-CN", label: "Chinese", flagUrl: flag("cn") },
  { code: "ja", label: "Japanese",   flagUrl: flag("jp") },
  { code: "hi", label: "Hindi",      flagUrl: flag("in") },
  { code: "ko", label: "Korean",     flagUrl: flag("kr") },
  { code: "vi", label: "Vietnamese", flagUrl: flag("vn") },
  { code: "it", label: "Italian",    flagUrl: flag("it") },
  { code: "nl", label: "Dutch",      flagUrl: flag("nl") },
  { code: "pl", label: "Polish",     flagUrl: flag("pl") },
  { code: "sv", label: "Swedish",    flagUrl: flag("se") },
  { code: "el", label: "Greek",      flagUrl: flag("gr") },
  { code: "cs", label: "Czech",      flagUrl: flag("cz") },
  { code: "ro", label: "Romanian",   flagUrl: flag("ro") },
  { code: "hu", label: "Hungarian",  flagUrl: flag("hu") },
  { code: "th", label: "Thai",       flagUrl: flag("th") },
  { code: "id", label: "Indonesian", flagUrl: flag("id") },
  { code: "ms", label: "Malay",      flagUrl: flag("my") },
  { code: "bn", label: "Bengali",    flagUrl: flag("bd") },
  { code: "ur", label: "Urdu",       flagUrl: flag("pk") },
  { code: "fa", label: "Persian",    flagUrl: flag("ir") },
  { code: "uk", label: "Ukrainian",  flagUrl: flag("ua") },
  { code: "bg", label: "Bulgarian",  flagUrl: flag("bg") },
  { code: "hr", label: "Croatian",   flagUrl: flag("hr") },
  { code: "sk", label: "Slovak",     flagUrl: flag("sk") },
  { code: "da", label: "Danish",     flagUrl: flag("dk") },
  { code: "fi", label: "Finnish",    flagUrl: flag("fi") },
  { code: "no", label: "Norwegian",  flagUrl: flag("no") },
]

function FlagImg({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="w-5 h-5 rounded-full overflow-hidden border border-border/30 shadow-sm flex-shrink-0">
      <img src={url} alt={alt} className="w-full h-full object-cover" />
    </div>
  )
}

function TranslationPicker({
  current,
  onSelect,
}: {
  current: string | null
  onSelect: (code: string | null) => void
}) {
  const [search, setSearch] = useState("")
  const lastLang = useRef<string>(current ?? TRANSLATION_LANGUAGES[0].code)

  // Keep lastLang updated whenever a real language is selected
  if (current) lastLang.current = current

  const filtered = TRANSLATION_LANGUAGES.filter(l =>
    l.label.toLowerCase().includes(search.toLowerCase())
  )

  const selected = TRANSLATION_LANGUAGES.find(l => l.code === current)

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Globe size={13} className="text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Translate to</span>
        </div>
        <Switch
          size="sm"
          checked={!!current}
          onCheckedChange={(checked) => {
            if (checked) onSelect(lastLang.current)
            else onSelect(null)
          }}
        />
      </div>

      {/* Active selection badge */}
      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border/40">
          <FlagImg url={selected.flagUrl} alt={selected.label} />
          <span className="text-xs font-semibold text-foreground flex-1">{selected.label}</span>
          <Check size={13} className="text-muted-foreground" />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search language..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-7 h-8 text-xs rounded-lg bg-muted/50 border-border/40 focus-visible:ring-1"
        />
      </div>

      {/* Language list */}
      <div className="max-h-[220px] overflow-y-auto -mx-1 px-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="flex flex-col gap-0.5">
          {filtered.map(lang => (
            <button
              key={lang.code}
              onClick={() => onSelect(current === lang.code ? null : lang.code)}
              className={cn(
                "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left",
                current === lang.code
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FlagImg url={lang.flagUrl} alt={lang.label} />
              <span className="flex-1">{lang.label}</span>
              {current === lang.code && <Check size={12} className="text-muted-foreground" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">No languages found</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────

type AudioCardProps = {
  currentClip: Clips | undefined
  playlist: Clips[]
  totalItems?: number
  className?: string
  defaultRate?: number
  searchQuery?: string
  language?: string
  isLoading?: boolean
  isFetchingNextPage?: boolean
}

export default function AudioCard({
  currentClip,
  playlist,
  totalItems,
  className,
  defaultRate = 1,
  searchQuery = "",
  language: propLanguage,
  isLoading: isParentLoading,
  isFetchingNextPage,
  onExplainWordPrompt,
  onTranscriptDetermined
}: AudioCardProps & {
  onExplainWordPrompt?: (prompt: string) => void,
  onTranscriptDetermined?: (snippet: string) => void
}) {
  const speeds = SPEEDS

  // Separate popovers for mobile and desktop to avoid state conflicts on resize
  const [mobileSpeedOpen, setMobileSpeedOpen] = useState(false)
  const [desktopSpeedOpen, setDesktopSpeedOpen] = useState(false)
  const [mobileTranslationOpen, setMobileTranslationOpen] = useState(false)
  const [desktopTranslationOpen, setDesktopTranslationOpen] = useState(false)

  // Countdown for Next Button (5s Strategy)
  const [nextCooldown, setNextCooldown] = useState(0)
  const nextTimerRef = useRef<NodeJS.Timeout | null>(null)

  const { isThrottled, cooldownLeft, guardedAction } = useSpamGuard()

  // Start clip 0.3s before the sentence for natural listening context
  const PLAYBACK_START_OFFSET = 0.3

  // Get player state from store — volume and playbackRate are now persisted
  const {
    currentVideoIndex,
    currentTime,
    isPlaying,
    duration,
    nextVideo,
    prevVideo,
    play,
    pause,
    seekTo,
    setPlaybackRate,
    setVolume: setPlayerVolume,
    volume: storedVolume,
    playbackRate: storedRate,
    player,
  } = usePlayerStore()

  // Initialize from persisted store values so they survive tab switches and refreshes
  const [rate, setRate] = useState(() => storedRate || defaultRate)
  const [volume, setVolume] = useState(() => storedVolume ?? 100)

  const router = useRouter()

  const { setQuery, setCategory, language: storeLanguage, translationLang, setTranslationLang } = useSearchStore()
  const activeLanguage = propLanguage || storeLanguage || "english"

  // True end — all clips loaded AND at last one
  const isAtEnd = currentVideoIndex >= playlist.length - 1 &&
    playlist.length >= (totalItems ?? playlist.length) &&
    playlist.length > 0

  // At the last loaded clip but more pages exist — fetching them right now
  const isWaitingForNextPage = !isAtEnd &&
    currentVideoIndex >= playlist.length - 1 &&
    !!isFetchingNextPage

  // Fetch transcript — guard against undefined clip to avoid empty-ID requests
  const transcriptFetchStart = useRef<number>(performance.now())

  const { data: transcriptData, isPending: isTranscriptLoading, isError: isTranscriptError, refetch: refetchTranscript } = useTranscript(
    !isParentLoading && !!currentClip ? (currentClip.video_id || "") : "",
    activeLanguage,
    currentClip?.position
  )

  // Sync volume with store (also persists via store's setVolume)
  useEffect(() => {
    setPlayerVolume(volume)
  }, [volume, setPlayerVolume])

  function skipBackward() {
    const newTime = Math.max(0, currentTime - 10)
    seekTo(newTime)
  }

  function skipForward() {
    const newTime = Math.min(duration, currentTime + 10)
    seekTo(newTime)
  }

  function togglePlayPause() {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const repeatTargetSentence = () => {
    if (targetSentence) {
      const startTime = Math.max(0, targetSentence.start_time - PLAYBACK_START_OFFSET)
      seekTo(startTime)
      if (!isPlaying) play()
    }
  }

  // Keyboard shortcuts — Space = play/pause, ← = -10s, → = +10s
  // Uses a ref to avoid stale closures without re-registering the listener
  const controlsRef = useRef({ togglePlayPause, skipBackward, skipForward, guardedAction })
  controlsRef.current = { togglePlayPause, skipBackward, skipForward, guardedAction }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      const { togglePlayPause, skipBackward, skipForward } = controlsRef.current
      if (e.code === "Space") { e.preventDefault(); togglePlayPause() }
      else if (e.key === "ArrowLeft") { e.preventDefault(); skipBackward() }
      else if (e.key === "ArrowRight") { e.preventDefault(); skipForward() }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])


  // Clean word timestamps to prevent "ghost highlights"
  const sanitizedSentences = useMemo(() => {
    const raw = transcriptData?.sentences || []
    return [...raw].sort((a, b) => a.start_time - b.start_time).map(sentence => {
      if (!sentence.words) return sentence

      const words = [...sentence.words]
      for (let i = 0; i < words.length; i++) {
        const current = words[i]
        const next = words[i + 1]
        const MAX_WORD_DURATION = 0.45
        const safetyEnd = current.start + MAX_WORD_DURATION
        current.end = Math.max(current.end, current.start + 0.05)
        if (next) {
          current.end = Math.min(current.end, safetyEnd, next.start)
        } else {
          current.end = Math.min(current.end, safetyEnd)
        }
      }
      return { ...sentence, words }
    })
  }, [transcriptData])

  const sentencesInClip = sanitizedSentences

  // Translate all sentences in one batch call — result cached forever by React Query
  const { data: translationData, isPending: isTranslationLoading } = useTranslateBatch(
    sentencesInClip,
    currentClip?.video_id || "",
    currentClip?.position,
    translationLang,
  )

  // Prefetch translations for next 2 clips whenever index or language changes
  useTranslationPrefetch(playlist, currentVideoIndex, translationLang, activeLanguage)

  // Map index → translated text — index is stable and avoids float key issues
  const translatedMap = useMemo(() => {
    if (!translationData?.translations || !sentencesInClip.length) return {}
    return Object.fromEntries(
      translationData.translations.map((t, i) => [i, t])
    )
  }, [translationData, sentencesInClip])

  const hasStartedPlayback = useRef(false)

  // Reset when the search query changes — handles re-search from the search page
  // where currentVideoIndex stays at 0 (no index change = no effect trigger below)
  useEffect(() => {
    hasStartedPlayback.current = false
  }, [searchQuery])

  // Reset playback flags when the clip changes — use currentVideoIndex so duplicate
  // video_ids (same YouTube video at different timestamps) still re-trigger correctly
  useEffect(() => {
    hasStartedPlayback.current = false
    console.log(`[PREV-DEBUG] index changed → idx=${currentVideoIndex} clip=${currentClip?.video_id} hasStartedPlayback reset`)

    // No cooldown on the first clip — only apply when the user has navigated past it
    if (currentVideoIndex === 0) return

    setNextCooldown(5)
    if (nextTimerRef.current) clearInterval(nextTimerRef.current)
    nextTimerRef.current = setInterval(() => {
      setNextCooldown(prev => {
        if (prev <= 1) {
          if (nextTimerRef.current) clearInterval(nextTimerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (nextTimerRef.current) clearInterval(nextTimerRef.current)
    }
  }, [currentVideoIndex]) // was currentClip?.video_id — now index-based to handle duplicates

  // Memoized so it doesn't re-scan on every render (currentTime updates cause many renders)
  const targetSentence = useMemo(() => {
    const clipStartTime = currentClip?.start_time !== undefined ? currentClip.start_time : (currentClip as any)?.start;
    
    if (clipStartTime !== undefined) {
      // Find the closest sentence by start_time
      let closest = null;
      let minDiff = Infinity;
      for (const sentence of sentencesInClip) {
        const diff = Math.abs(sentence.start_time - clipStartTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = sentence;
        }
      }
      // Only accept if it's reasonably close (e.g., within 2 seconds)
      if (closest && minDiff < 2.0) {
        return closest;
      }
    }
    
    // Fallback to text search
    const fallback = sentencesInClip.find((sentence: any) => {
      const text = sentence.sentence_text || ""
      const query = searchQuery.toLowerCase().trim()
      return query && text.toLowerCase().includes(query)
    })
    return fallback;
  }, [sentencesInClip, currentClip?.start_time, (currentClip as any)?.start, searchQuery])

  // Auto-play when target sentence is found.
  // Also re-runs when `player` becomes non-null so it retries if the transcript
  // resolved before the YouTube iframe was ready (race condition fix).
  useEffect(() => {
    console.log(`[PREV-DEBUG] auto-play effect fired → idx=${currentVideoIndex} clip=${currentClip?.video_id} hasStarted=${hasStartedPlayback.current} player=${!!player} playerObj=${player} targetSentence=${targetSentence?.start_time ?? 'null'}`)
    if (targetSentence && !hasStartedPlayback.current && player) {
      const startTime = Math.max(0, targetSentence.start_time - PLAYBACK_START_OFFSET)
      console.log(`[PREV-DEBUG] auto-play SEEKING → startTime=${startTime} on player=${player}`)
      seekTo(startTime)
      play()
      hasStartedPlayback.current = true
    }
  }, [targetSentence, player, seekTo, play])

  return (
    <div className="relative border border-border/70 p-2.5">
      <DecorIcon position="top-left" />
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />
      <DecorIcon position="bottom-right" />
    <div className={cn("relative w-full rounded-3xl bg-card text-foreground p-3 sm:p-4 shadow-inner", className)}>

      {/* ── CARD HEADER ── */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          {currentClip?.video_title && (
            <span className="text-[11px] text-muted-foreground/60 truncate hidden sm:block">
              — {currentClip.video_title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentClip?.category && (
            <span className="text-[7px] sm:text-[9px] font-mono uppercase tracking-widest text-muted-foreground/30 border border-border/20 px-1 sm:px-1.5 py-0.5 rounded-sm">
              {typeof currentClip.category === "string"
                ? currentClip.category
                : (currentClip.category as any)?.title ?? (currentClip.category as any)?.type ?? ""}
            </span>
          )}
          <span className="text-[8px] sm:text-[10px] font-medium text-muted-foreground/50 tabular-nums">
            {currentVideoIndex + 1}<span className="opacity-40 mx-0.5">/</span>{(totalItems ?? playlist.length) > 100 ? "+100" : (totalItems || playlist.length)}
          </span>
        </div>
      </div>

      {/* ── MOBILE COMPACT CONTROLS (< md) ── */}
      <div className="md:hidden flex flex-col gap-2">
        {/* Row 1: Transport + Translation */}
        <div className="flex items-center justify-center gap-3 relative">
          {isThrottled && <SpamGuardOverlay cooldownLeft={cooldownLeft} />}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => guardedAction(prevVideo)} disabled={currentVideoIndex === 0}>
            <SkipBack size={15} />
          </Button>
          <Button size="icon" className="h-10 w-10 rounded-full" onClick={() => guardedAction(togglePlayPause)}>
            {isPlaying ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative"
            onClick={() => guardedAction(nextVideo)}
            disabled={nextCooldown > 0 || isAtEnd || isWaitingForNextPage}
          >
            {nextCooldown > 0 ? (
              <span className="text-[10px] font-black text-primary animate-pulse">{nextCooldown}s</span>
            ) : isWaitingForNextPage ? (
              <Loader2 size={13} className="animate-spin text-muted-foreground" />
            ) : isAtEnd ? (
              <span className="text-[10px] font-bold text-muted-foreground">End</span>
            ) : (
              <SkipForward size={15} />
            )}
          </Button>
          <Popover open={mobileTranslationOpen} onOpenChange={setMobileTranslationOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn("relative overflow-hidden h-8 w-8 p-0 cursor-pointer rounded-full", translationLang ? "bg-muted text-foreground" : "")}
              >
                <div className="usage-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-black/8 to-transparent dark:via-white/10" />
                {translationLang
                  ? <FlagImg url={TRANSLATION_LANGUAGES.find(l => l.code === translationLang)?.flagUrl ?? ""} alt={translationLang} />
                  : <Globe size={14} />
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-4 rounded-2xl" side="top" align="center">
              <TranslationPicker current={translationLang} onSelect={setTranslationLang} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Row 2: Secondary controls */}
        <div className="flex items-center justify-around">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                <Volume2 size={14} className="text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-3 rounded-xl" side="top">
              <Slider value={[volume]} max={100} onValueChange={(val) => setVolume(val[0])} />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", targetSentence ? "text-primary" : "")}
            onClick={() => guardedAction(repeatTargetSentence)}
            disabled={!targetSentence}
          >
            <Repeat size={14} />
          </Button>
          <Popover open={mobileSpeedOpen} onOpenChange={setMobileSpeedOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-0.5 font-bold text-[11px]">
                {rate}x
                {mobileSpeedOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1 rounded-xl" side="top" align="center">
              <SpeedPicker currentRate={rate} onSelect={(r) => { setRate(r); setPlaybackRate(r) }} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── DESKTOP FULL CONTROLS (>= md) ── */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-4 mb-2">
        {/* Volume control */}
        <div className="flex items-center gap-3 flex-1 max-w-[180px]">
          <Volume2 size={20} className="text-muted-foreground flex-shrink-0" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={(val) => setVolume(val[0])}
            className="cursor-pointer"
          />
        </div>

        {/* Transport controls */}
        <div id="tour-controls" className="flex items-center justify-center gap-4 relative">
          {isThrottled && <SpamGuardOverlay cooldownLeft={cooldownLeft} />}
          <div className="flex flex-col items-center gap-1">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full cursor-pointer" onClick={() => guardedAction(prevVideo)} disabled={currentVideoIndex === 0}>
              <SkipBack size={20} />
            </Button>
            <span className="text-xs text-muted-foreground">Previous</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full cursor-pointer" onClick={() => guardedAction(skipBackward)}>
              <RotateCcw size={20} />
            </Button>
            <span className="text-xs text-muted-foreground">-10s</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button size="icon" className="h-12 w-12 rounded-full bg-primary cursor-pointer" onClick={() => guardedAction(togglePlayPause)}>
              {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </Button>
            <span className="text-xs text-muted-foreground">{isPlaying ? "Pause" : "Play"}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full cursor-pointer" onClick={() => guardedAction(skipForward)}>
              <RotateCcw size={20} className="scale-x-[-1]" />
            </Button>
            <span className="text-xs text-muted-foreground">+10s</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full cursor-pointer"
              onClick={() => guardedAction(repeatTargetSentence)}
              disabled={!targetSentence}
            >
              <Repeat size={20} />
            </Button>
            <span className="text-xs text-muted-foreground">Repeat</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full cursor-pointer relative"
              onClick={() => guardedAction(nextVideo)}
              disabled={nextCooldown > 0 || isAtEnd || isWaitingForNextPage}
            >
              {nextCooldown > 0 ? (
                <div className="flex items-center justify-center h-full w-full">
                  <span className="text-sm font-black text-primary animate-in zoom-in duration-300">{nextCooldown}s</span>
                </div>
              ) : isWaitingForNextPage ? (
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              ) : isAtEnd ? (
                <span className="text-xs font-bold text-muted-foreground">End</span>
              ) : (
                <SkipForward size={20} />
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {nextCooldown > 0 ? "Wait..." : isWaitingForNextPage ? "Loading" : isAtEnd ? "End" : "Next"}
            </span>
          </div>
        </div>

        {/* Speed + Translation controls */}
        <div className="flex items-center gap-2 flex-1 max-w-[220px] justify-end">
          <Popover open={desktopTranslationOpen} onOpenChange={setDesktopTranslationOpen}>
            <PopoverTrigger asChild>
              <Button
                id="tour-translate"
                variant="ghost"
                size="sm"
                className={cn(
                  "relative overflow-hidden gap-1.5 cursor-pointer transition-all",
                  translationLang ? "bg-muted text-foreground hover:bg-muted/80" : ""
                )}
              >
                <div className="usage-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-black/8 to-transparent dark:via-white/10" />
                {translationLang ? (
                  <>
                    <FlagImg url={TRANSLATION_LANGUAGES.find(l => l.code === translationLang)?.flagUrl ?? ""} alt={translationLang} />
                    <span className="font-semibold text-xs">{TRANSLATION_LANGUAGES.find(l => l.code === translationLang)?.label}</span>
                  </>
                ) : (
                  <>
                    <Globe size={15} />
                    <span className="font-semibold text-xs">Translate</span>
                  </>
                )}
                {desktopTranslationOpen ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-4 rounded-2xl shadow-xl" align="end">
              <TranslationPicker current={translationLang} onSelect={setTranslationLang} />
            </PopoverContent>
          </Popover>
          <Popover open={desktopSpeedOpen} onOpenChange={setDesktopSpeedOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                <Gauge size={18} />
                <span className="font-semibold">{rate}x</span>
                {desktopSpeedOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1 rounded-xl shadow-xl" align="end">
              <SpeedPicker currentRate={rate} onSelect={(r) => { setRate(r); setPlaybackRate(r) }} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="border-t border-border/20 mb-1" />
      <div id="tour-transcript">
      <TranscriptBox
        sentences={sentencesInClip}
        searchQuery={searchQuery}
        isTranscriptLoading={isTranscriptLoading}
        isTranscriptError={isTranscriptError}
        onRetry={refetchTranscript}
        isTranslationLoading={!!translationLang && isTranslationLoading}
        translatedMap={translatedMap}
        targetSentence={targetSentence}
        onSearchWord={(word) => {
          const clean = word.trim()
          if (!clean) return
          setQuery(clean)
          setCategory(null)
          try {
            const encoded = encodeURIComponent(clean)
            router.push(`/search/${encoded}/${activeLanguage.toLowerCase()}`)
          } catch {
            // ignore navigation errors
          }
        }}
        onExplainWordInContext={({ word, sentence }) => {
          // Language-aware prompt — no longer hardcoded to English
          const prompt = `Explain the meaning and nuance of the ${activeLanguage} word or phrase "${word}" specifically in this sentence. Focus on how it is used here, any implied tone or register, and give 2-3 additional example sentences with similar usage.\n\nSentence: "${sentence}"`
          onExplainWordPrompt?.(prompt)
        }}
        onTranscriptDetermined={onTranscriptDetermined}
      />
      </div>
    </div>
    </div>
  )
}
