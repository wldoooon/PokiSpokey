"use client"

import { useMemo, useEffect, useState, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { usePlayerStore } from "@/stores/use-player-store"
import { SentenceGroup } from "./sentence-group"
import { cn } from "@/lib/utils"

type SyncedTranslationProps = {
  text: string
  startTime: number
  endTime: number
  className?: string
}

const SyncedTranslation = memo(({ text, startTime, endTime, className }: SyncedTranslationProps) => {
  const words = text.split(" ")

  const activeWordIdx = usePlayerStore(state => {
    const t = state.currentTime + 0.05 * state.playbackRate
    if (t < startTime || t >= endTime) return -1
    const progress = (t - startTime) / (endTime - startTime)
    return Math.min(Math.floor(progress * words.length), words.length - 1)
  })

  return (
    <p className={cn("text-center px-4 leading-snug", className)}>
      {words.map((word, i) => (
        <span
          key={i}
          className={cn(
            "transition-all duration-150 ease-out",
            i === activeWordIdx ? "text-primary font-semibold" : ""
          )}
        >
          {word}{i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  )
})

type Word = { text: string; start: number; end: number }
type Sentence = {
  start_time: number
  end_time: number
  sentence_text?: string
  sentence_reading?: string
  words?: Word[]
}

type TranscriptBoxProps = {
  sentences: Sentence[]
  searchQuery: string
  isTranscriptLoading: boolean
  isTranscriptError?: boolean
  onRetry?: () => void
  isTranslationLoading?: boolean
  translatedMap?: Record<number, string>
  targetSentence?: Sentence | null
  onSearchWord?: (word: string) => void
  onExplainWordInContext?: (payload: { word: string; sentence: string }) => void
  onTranscriptDetermined?: (snippet: string) => void
}

export const TranscriptBox = ({
  sentences,
  searchQuery,
  isTranscriptLoading,
  isTranscriptError,
  onRetry,
  isTranslationLoading,
  translatedMap,
  targetSentence,
  onSearchWord,
  onExplainWordInContext,
  onTranscriptDetermined,
}: TranscriptBoxProps) => {
  // Detect available screen height to show 1, 2, or 3 transcript sentences on mobile.
  // Tall phones (iPhone XR/11+) have room for prev/next; small phones only show the active one.
  const [visibleRows, setVisibleRows] = useState(1)
  useEffect(() => {
    const update = () => {
      const h = window.innerHeight
      setVisibleRows(h >= 850 ? 3 : h >= 720 ? 2 : 1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const targetIdx = useMemo(() => {
    if (!targetSentence) return -1
    return sentences.findIndex(s => s === targetSentence || s.start_time === targetSentence.start_time)
  }, [sentences, targetSentence])

  // Zustand selector: only triggers re-render when the sentence INDEX changes.
  // Handles gaps between sentences by returning the most recently passed sentence
  // (sentences are sorted by start_time from audio-card's sanitizedSentences).
  // No refs needed — the selector itself is the sticky engine.
  const activeIdx = usePlayerStore(state => {
    if (sentences.length === 0) return -1

    // If the player hasn't updated the time yet (currentTime is exactly 0), 
    // and we have a target index, default to it so we show the keyword sentence initially.
    if (state.currentTime === 0 && targetIdx !== -1) {
      return targetIdx
    }

    const TIMING_LEAD = 0.05 * state.playbackRate
    const t = state.currentTime + TIMING_LEAD

    // Exact match: currentTime is within a sentence
    const exact = sentences.findIndex(s => t >= s.start_time && t < s.end_time)
    if (exact !== -1) return exact

    // Gap/silence: return the last sentence whose start we've passed.
    // Since sentences are sorted, scan forward and stop when we overshoot.
    let last = -1
    for (let i = 0; i < sentences.length; i++) {
      if (t >= sentences[i].start_time) last = i
      else break
    }
    return last
  })

  // Find the trio: Previous, Active, and Next.
  // Pure computation — no ref mutations, safe for Concurrent Mode.
  // When activeIdx is -1 but sentences exist, fall back to showing the first sentence.
  // This prevents the "Waiting for playback..." ghost state that occurs because
  // currentTime in the store is still 0 while the YouTube player hasn't fired
  // its first onStateChange yet.
  const trio = useMemo(() => {
    if (sentences.length === 0) return null

    const idx = activeIdx === -1 ? 0 : activeIdx
    const active = sentences[idx]
    if (!active) return null

    return {
      prev: sentences[idx - 1],
      active,
      next: sentences[idx + 1],
      activeIdx: idx,
    }
  }, [activeIdx, sentences])

  // Broadcast the live-updating context snippet up to the AI
  useEffect(() => {
    if (trio && onTranscriptDetermined) {
      const prev = trio.prev?.sentence_text || ""
      const curr = trio.active?.sentence_text || ""
      const next = trio.next?.sentence_text || ""
      const parts: string[] = []
      if (prev) parts.push(`[Before]: "${prev}"`)
      if (curr) parts.push(`[★ Now Playing]: "${curr}"`)
      if (next) parts.push(`[After]: "${next}"`)
      onTranscriptDetermined(parts.join("\n"))
    }
  }, [trio, onTranscriptDetermined])

  return (
    <div className="relative mt-1 min-h-[180px] flex items-center justify-center overflow-hidden">
      {/* Simple, clean brand background */}

      <div className="relative w-full px-4">
        <AnimatePresence mode="popLayout">
          {isTranscriptLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <Skeleton className="h-6 w-3/4 rounded-full opacity-30" />
              <Skeleton className="h-6 w-1/2 rounded-full opacity-10" />
            </motion.div>
          ) : isTranscriptError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <p className="text-sm text-muted-foreground/60">Transcript unavailable for this clip.</p>
              {onRetry && (
                <button
                  onClick={() => onRetry()}
                  className="text-xs text-orange-500 hover:underline font-medium"
                >
                  Try again
                </button>
              )}
            </motion.div>
          ) : trio ? (
            <motion.div
              key={trio.active.start_time}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "circOut" }}
              className="flex flex-col items-center gap-2 py-2"
            >
              {/* Previous */}
              {trio.prev && (
                <div className={cn("flex-col items-center gap-1 w-full", visibleRows >= 2 ? "flex" : "hidden sm:flex")}>
                  <SentenceGroup
                    group={[trio.prev]}
                    searchQuery={searchQuery}
                    onSearchWord={onSearchWord}
                    onExplainWordInContext={onExplainWordInContext}
                  />
                  {translatedMap?.[trio.activeIdx - 1] && (
                    <SyncedTranslation
                      text={translatedMap[trio.activeIdx - 1]}
                      startTime={trio.prev.start_time}
                      endTime={trio.prev.end_time}
                      className="text-sm sm:text-base font-medium text-muted-foreground"
                    />
                  )}
                </div>
              )}

              {/* Active + translation */}
              <div className="flex flex-col items-center gap-1 w-full border-y border-border/20 py-2">
                <SentenceGroup
                  group={[trio.active]}
                  searchQuery={searchQuery}
                  onSearchWord={onSearchWord}
                  onExplainWordInContext={onExplainWordInContext}
                />
                {isTranslationLoading ? (
                  <Skeleton className="h-5 w-2/3 rounded-full opacity-40" />
                ) : translatedMap?.[trio.activeIdx] ? (
                  <SyncedTranslation
                    text={translatedMap[trio.activeIdx]}
                    startTime={trio.active.start_time}
                    endTime={trio.active.end_time}
                    className="text-base sm:text-xl font-medium text-foreground"
                  />
                ) : null}
              </div>

              {/* Next */}
              {trio.next && (
                <div className={cn("flex-col items-center gap-1 w-full", visibleRows >= 3 ? "flex" : "hidden sm:flex")}>
                  <SentenceGroup
                    group={[trio.next]}
                    searchQuery={searchQuery}
                    onSearchWord={onSearchWord}
                    onExplainWordInContext={onExplainWordInContext}
                  />
                  {translatedMap?.[trio.activeIdx + 1] && (
                    <SyncedTranslation
                      text={translatedMap[trio.activeIdx + 1]}
                      startTime={trio.next.start_time}
                      endTime={trio.next.end_time}
                      className="text-sm sm:text-base font-medium text-muted-foreground"
                    />
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground/40 italic text-sm text-center"
            >
              Waiting for playback...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
