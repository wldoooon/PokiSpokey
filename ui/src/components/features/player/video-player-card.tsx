"use client"

import { YoutubePlayer, YTPlayer } from "./YoutubePlayer"
import { useRef, useEffect } from "react"
import { usePlayerStore } from "@/stores/use-player-store"
import { useSearchStore } from "@/stores/use-search-store"
import { FacetChips } from "@/components/comm/FacetChips"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Clips } from "@/lib/types"

function getClipStart(clip: any): number {
  if (!clip) return 0
  let start = 0
  if (typeof clip.start === "number") start = clip.start
  else if (typeof clip.start_time === "number") start = clip.start_time
  return Math.max(0, start)
}

// Stable playerVars — no per-clip values needed.
// autoplay+mute+playsinline: required for iOS inline muted autoplay.
// origin: must match window.location.origin to avoid Safari cross-origin errors.
const PLAYER_VARS = {
  autoplay: 1,
  playsinline: 1,
  mute: 1,
  modestbranding: 1,
  rel: 0,
  controls: 0,
  disablekb: 1,
  fs: 0,
  iv_load_policy: 3,
  cc_load_policy: 0,
  origin: typeof window !== "undefined" ? window.location.origin : "",
} as const

const T = () => `+${Math.round(performance.now())}ms`

type VideoPlayerCardProps = {
  playlist: Clips[]
  isFetching?: boolean
  aggregations?: Record<string, number>
  className?: string
  onClipEnded?: () => void
}

export default function VideoPlayerCard({
  playlist,
  isFetching,
  aggregations,
  className,
  onClipEnded,
}: VideoPlayerCardProps) {
  const {
    currentVideoIndex,
    isMuted,
    playbackRate,
    setCurrentTime,
    setPlayerState,
    setPlayer,
    player: activePlayer,
    resetIndex
  } = usePlayerStore()
  const router = useRouter()

  const { category, language, subCategory, setSubCategory, lastAggregations, setLastAggregations } = useSearchStore()

  const lastSeekedClipId = useRef<string | null>(null)

  useEffect(() => {
    if (aggregations && !subCategory && Object.keys(aggregations).length > 0) {
      setLastAggregations(aggregations);
    }
  }, [aggregations, subCategory, setLastAggregations]);

  // Dual Player Logic (Pool of 2: Active + Buffer)
  const activeKey = (['A', 'B'] as const)[currentVideoIndex % 2]

  const windowIndices = [currentVideoIndex, currentVideoIndex + 1]
  const indexA = windowIndices.find(i => i % 2 === 0)
  const indexB = windowIndices.find(i => i % 2 === 1)
  const clipA = indexA !== undefined ? playlist[indexA] : undefined
  const clipB = indexB !== undefined ? playlist[indexB] : undefined

  const playerARef = useRef<YTPlayer | null>(null)
  const playerBRef = useRef<YTPlayer | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(-1)
  const mountedRef = useRef(true)
  const playerMountTimeRef = useRef<number>(performance.now())
  const hasEverPlayedRef = useRef(false)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const consecutiveAutoSkipsRef = useRef(0)

  const clearStallTimer = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }
  }

  const startStallTimer = () => {
    clearStallTimer()
    // 6s: initial YouTube load takes 3-6s to reach first buffering event.
    // The old 3s timer was firing before the player had a chance to start loading.
    stallTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      consecutiveAutoSkipsRef.current += 1
      if (consecutiveAutoSkipsRef.current <= 5) {
        usePlayerStore.getState().nextVideo()
      }
    }, 6000)
  }

  const safeCall = (player: YTPlayer | null, fn: string, ...args: any[]) => {
    try {
      if (player && typeof (player as any)[fn] === 'function') {
        ; (player as any)[fn](...args)
      }
    } catch { }
  }

  const erroredClipsRef = useRef<Set<string>>(new Set())

  // ── Sync effect: fires when active slot or clip ids change ────────────────
  const activeClipId = activeKey === 'A' ? clipA?.video_id : clipB?.video_id

  useEffect(() => {
    // If the newly active clip previously errored (e.g. in background), skip it immediately
    const activeClip = activeKey === 'A' ? clipA : clipB;
    if (activeClip && erroredClipsRef.current.has(activeClip.video_id)) {
      consecutiveAutoSkipsRef.current += 1;
      if (consecutiveAutoSkipsRef.current <= 10) {
        usePlayerStore.getState().nextVideo();
      }
      return;
    }

    let currentActive: YTPlayer | null = null
    if (activeKey === 'A') currentActive = playerARef.current
    if (activeKey === 'B') currentActive = playerBRef.current

    console.log(`[PREV-DEBUG] syncEffect setPlayer activeKey=${activeKey} idx=${currentVideoIndex} currentActive=${currentActive}`)
    setPlayer(currentActive)
    hasEverPlayedRef.current = false
    clearStallTimer()

    const syncSinglePlayer = (key: 'A' | 'B', player: YTPlayer | null) => {
      if (!player) return
      const isActuallyActive = key === activeKey
      const clip = key === 'A' ? clipA : clipB
      if (!clip) return

      if (isActuallyActive) {
        const willSeek = lastSeekedClipId.current !== clip.video_id
        console.log(`[PREV-DEBUG] syncEffect slot=${key} clip=${clip.video_id} willSeek=${willSeek} lastSeeked=${lastSeekedClipId.current} playerRef=${player}`)
        if (willSeek) {
          const exactStart = getClipStart(clip);
          console.log(`[PREV-DEBUG] syncEffect SEEKING slot=${key} exactStart=${exactStart} playerRef=${player}`)
          safeCall(player, 'seekTo', exactStart, true)
          lastSeekedClipId.current = clip.video_id
        }
        safeCall(player, 'playVideo')
        safeCall(player, 'setPlaybackRate', playbackRate)
        if (isMuted) {
          safeCall(player, 'mute')
        } else {
          safeCall(player, 'unMute')
          safeCall(player, 'setVolume', 100)
        }
      } else {
        safeCall(player, 'mute')
        safeCall(player, 'pauseVideo')
      }
    }

    syncSinglePlayer('A', playerARef.current)
    syncSinglePlayer('B', playerBRef.current)

  }, [activeKey, activeClipId, isMuted, playbackRate, setPlayer, clipA, clipB, activePlayer])

  const startPolling = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const tick = () => {
      try {
        const t = usePlayerStore.getState().player?.getCurrentTime()
        if (typeof t === 'number' && t !== lastTimeRef.current) {
          lastTimeRef.current = t
          setCurrentTime(t)
        }
      } catch { }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const stopPolling = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      if (stallTimerRef.current) { clearTimeout(stallTimerRef.current); stallTimerRef.current = null }
      playerARef.current = null
      playerBRef.current = null
      setPlayer(null)
    }
  }, [])

  // ── State change handler ──────────────────────────────────────────────────
  const onStateChange = (event: { data: number; target: any }, key: 'A' | 'B') => {
    const isActive = key === activeKey

    if (!isActive) {
      if (event.data === 1) safeCall(event.target, 'mute')
      return
    }

    // Clip ended — auto-advance to next
    if (event.data === 0) {
      onClipEnded?.()
    }

    const isNowPlaying = event.data === 1

    if (isNowPlaying && !isMuted) {
      safeCall(event.target, 'unMute')
    }

    if (isNowPlaying) {
      hasEverPlayedRef.current = true
      consecutiveAutoSkipsRef.current = 0
      clearStallTimer()
      try {
        if (typeof event.target.setPlaybackQuality === 'function') {
          event.target.setPlaybackQuality('hd720')
        }
      } catch { }
    }

    // Stall detection — only before first play (avoids triggering on user-pause)
    if (!hasEverPlayedRef.current) {
      if (event.data === -1) {
        startStallTimer()
      } else if (event.data === 3) {
        clearStallTimer()
        // Seek to the clip's keyword timestamp when the player starts buffering.
        // seekTo() calls issued immediately after loadVideoById() are ignored because
        // the player is mid-load. State=3 (buffering) is the earliest reliable moment
        // to seek — the player has loaded enough data to accept the command.
        const clip = key === 'A' ? clipA : clipB
        if (clip) {
          safeCall(event.target, 'seekTo', getClipStart(clip), true)
        }
      }
    } else {
      // After first play: always clear stall timer
      clearStallTimer()
    }

    setPlayerState({ isPlaying: isNowPlaying })
    if (isNowPlaying) startPolling()
    else stopPolling()
  }

  // ── Error handler ─────────────────────────────────────────────────────────
  const onVideoError = (event: { data: number }, key: 'A' | 'B') => {
    const clip = key === 'A' ? clipA : clipB;
    if (clip && [100, 101, 150].includes(event.data)) {
      erroredClipsRef.current.add(clip.video_id);
      if (key === activeKey) {
        clearStallTimer()
        consecutiveAutoSkipsRef.current += 1
        if (consecutiveAutoSkipsRef.current <= 10) {
          usePlayerStore.getState().nextVideo()
        }
      }
    }
  }

  // ── Recycled player effects ───────────────────────────────────────────────
  // The YoutubePlayer wrapper calls loadVideoById when videoId prop changes (auto-plays).
  // We only need to pause background slot — active slot is handled by syncEffect.
  useEffect(() => {
    if (!clipA) return
    const liveActiveKey = (['A', 'B'] as const)[usePlayerStore.getState().currentVideoIndex % 2]
    if (liveActiveKey !== 'A') safeCall(playerARef.current, 'pauseVideo')
  }, [clipA?.video_id])

  useEffect(() => {
    if (!clipB) return
    const liveActiveKey = (['A', 'B'] as const)[usePlayerStore.getState().currentVideoIndex % 2]
    if (liveActiveKey !== 'B') safeCall(playerBRef.current, 'pauseVideo')
  }, [clipB?.video_id])

  // ── onReady handler ───────────────────────────────────────────────────────
  const onReady = (player: YTPlayer, key: 'A' | 'B') => {
    if (!player) return
    const clip = key === 'A' ? clipA : clipB
    const isActive = key === activeKey

    if (isActive) {
      try {
        const initialState = typeof player.getPlayerState === 'function' ? player.getPlayerState() : undefined
        if (initialState === -1) {
          clearStallTimer()
          consecutiveAutoSkipsRef.current += 1
          if (consecutiveAutoSkipsRef.current <= 5) usePlayerStore.getState().nextVideo()
          return
        }
      } catch { }
    }

    if (key === 'A') playerARef.current = player
    if (key === 'B') playerBRef.current = player

    if (clip) lastSeekedClipId.current = clip.video_id

    if (isActive) {
      setPlayer(player)
      try {
        if (typeof player.getDuration === 'function') setPlayerState({ duration: player.getDuration() })
      } catch { }
      if (!isMuted) safeCall(player, 'unMute')
      safeCall(player, 'playVideo')
    } else {
      safeCall(player, 'mute')

      const getLiveActiveKey = () => (['A', 'B'] as const)[usePlayerStore.getState().currentVideoIndex % 2]

      const triggerBuffer = () => {
        if (!mountedRef.current) return
        if (key === getLiveActiveKey()) return
        const liveRef = key === 'A' ? playerARef.current : playerBRef.current
        safeCall(liveRef, 'playVideo')
        setTimeout(() => {
          if (!mountedRef.current) return
          if (key !== getLiveActiveKey()) {
            const ref = key === 'A' ? playerARef.current : playerBRef.current
            safeCall(ref, 'pauseVideo')
          }
        }, 1200)
      }

      setTimeout(() => triggerBuffer(), 3000)
    }
  }

  // Handle facet selection
  const handleFacetSelect = (facet: string) => {
    if (facet === subCategory) {
      setSubCategory(null)
    } else {
      setSubCategory(facet)
    }
    resetIndex()
  }

  return (
    <div className={className}>
      {category && (
        <FacetChips
          aggregations={lastAggregations || aggregations}
          onSelect={handleFacetSelect}
          selectedCategory={subCategory}
          isLoading={isFetching}
          className="mb-3 -mt-2"
        />
      )}
      <div className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[400px] xl:h-[480px] overflow-hidden rounded-2xl bg-black shadow-inner">

        {/* Layer A */}
        <div className={cn("absolute inset-0 w-full h-full transition-opacity duration-300",
          activeKey === 'A' ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none")}>
          {clipA?.video_id && (
            <YoutubePlayer
              videoId={clipA.video_id}
              startSeconds={getClipStart(clipA)}
              playerVars={PLAYER_VARS}
              onReady={(p) => onReady(p, 'A')}
              onStateChange={(e) => onStateChange(e, 'A')}
              onError={(e) => onVideoError(e, 'A')}
              className="w-full h-full"
              iframeClassName="w-full h-full border-none"
            />
          )}
        </div>

        {/* Layer B */}
        <div className={cn("absolute inset-0 w-full h-full transition-opacity duration-300",
          activeKey === 'B' ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none")}>
          {clipB?.video_id && (
            <YoutubePlayer
              videoId={clipB.video_id}
              startSeconds={getClipStart(clipB)}
              playerVars={PLAYER_VARS}
              onReady={(p) => onReady(p, 'B')}
              onStateChange={(e) => onStateChange(e, 'B')}
              onError={(e) => onVideoError(e, 'B')}
              className="w-full h-full"
              iframeClassName="w-full h-full border-none"
            />
          )}
        </div>

      </div>
    </div>
  )
}
