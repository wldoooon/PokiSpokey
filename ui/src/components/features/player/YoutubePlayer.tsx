"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady?: () => void
  }
}

export type YTPlayer = any

interface YoutubePlayerProps {
  videoId: string
  startSeconds?: number
  playerVars?: Record<string, any>
  onReady?: (player: YTPlayer) => void
  onStateChange?: (event: { data: number; target: YTPlayer }) => void
  onError?: (event: { data: number }) => void
  className?: string
  iframeClassName?: string
}

/**
 * Minimal YouTube IFrame API wrapper — replaces react-youtube.
 *
 * Root cause fix: ALL three callbacks (onReady, onStateChange, onError) are kept
 * in refs that are updated on every render. The YT.Player is created ONCE and its
 * internal event handlers always call the LATEST callback via the ref — this prevents
 * stale closure bugs where activeKey/isMuted from the initial render would be used
 * forever, causing "no sound" (player B treated as background) and wrong pause state.
 */
export function YoutubePlayer({
  videoId,
  startSeconds = 0,
  playerVars,
  onReady,
  onStateChange,
  onError,
  className,
  iframeClassName,
}: YoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef    = useRef<YTPlayer | null>(null)
  const cancelledRef = useRef(false)
  const readyRef     = useRef(false)
  const pendingRef   = useRef<{ videoId: string; startSeconds: number } | null>(null)
  const activeVideoIdRef = useRef(videoId)
  const activeStartSecondsRef = useRef(startSeconds)

  // ── Always-current callback refs ─────────────────────────────────────────
  // Critical: new YT.Player() captures closures at mount. By routing all events
  // through these refs, the handlers always see the latest props on every call.
  const onReadyRef       = useRef(onReady)
  const onStateChangeRef = useRef(onStateChange)
  const onErrorRef       = useRef(onError)
  useEffect(() => { onReadyRef.current       = onReady })
  useEffect(() => { onStateChangeRef.current = onStateChange })
  useEffect(() => { onErrorRef.current       = onError })

  // ── Create player once on mount ──────────────────────────────────────────
  useEffect(() => {
    cancelledRef.current = false
    activeVideoIdRef.current = videoId
    activeStartSecondsRef.current = startSeconds

    const init = () => {
      if (cancelledRef.current || !containerRef.current) return

      new window.YT.Player(containerRef.current, {
        videoId,
        width:  "100%",
        height: "100%",
        // Merge start so the video begins loading from the correct position immediately.
        // This avoids a seekTo in onReady (which caused a double-seek + state -1 reset).
        playerVars: { ...playerVars, start: Math.floor(startSeconds) },
        events: {
          onReady: (e: any) => {
            if (cancelledRef.current) return
            playerRef.current = e.target
            readyRef.current  = true
            if (pendingRef.current) {
              try { e.target.loadVideoById(pendingRef.current) } catch { /* ignore */ }
              pendingRef.current = null
            }
            onReadyRef.current?.(e.target)
          },
          onStateChange: (e: any) => {
            if (cancelledRef.current) return
            onStateChangeRef.current?.({ data: e.data, target: e.target })
          },
          onError: (e: any) => {
            if (cancelledRef.current) return
            onErrorRef.current?.({ data: e.data })
          },
        },
      })
    }

    if (window.YT?.Player) {
      init()
    } else {
      // Chain onto any existing ready handler so multiple players don't clobber each other
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        init()
      }
    }

    return () => {
      cancelledRef.current = true
      readyRef.current = false
      try { playerRef.current?.destroy() } catch { /* ignore */ }
      playerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — player created once, callbacks routed via refs

  // ── Handle video changes without destroying the player ───────────────────
  useEffect(() => {
    if (!videoId) return
    if (videoId === activeVideoIdRef.current && startSeconds === activeStartSecondsRef.current) return

    activeVideoIdRef.current = videoId
    activeStartSecondsRef.current = startSeconds

    const payload = { videoId, startSeconds: Math.floor(startSeconds) }

    if (!readyRef.current || !playerRef.current) {
      pendingRef.current = payload
      return
    }

    console.log(`[PREV-DEBUG] YoutubePlayer loadVideoById payload=`, payload, `playerRef=`, playerRef.current)
    try { playerRef.current.loadVideoById(payload) } catch { }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, startSeconds])

  return (
    <div className={className}>
      <div ref={containerRef} className={iframeClassName} />
    </div>
  )
}
