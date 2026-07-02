"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"

// Dynamic imports are required for components that use browser-only APIs (like YouTube/window)
const VideoPlayerCard = dynamic(() => import("@/components/features/player/video-player-card"), {
  loading: () => <div className="h-[400px] w-full animate-pulse bg-muted rounded-xl" />,
  ssr: false
})
const AudioCard = dynamic(() => import("@/components/features/player/audio-card"), {
  ssr: false
})
import { usePlayerStore } from "@/stores/use-player-store"
import { useSearchStore } from "@/stores/use-search-store"
import { useInfiniteSearch, useTranscriptPrefetch } from "@/lib/useApi"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useAuthStore } from "@/stores/auth-store"
import { Loader2, Bot, Play, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

const AiCompletion = dynamic(() => import("@/components/ai-completion").then(mod => mod.AiCompletion), {
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
  ssr: false
})

// Lightweight — no need to lazy-load
import { SearchLimitWall } from "@/components/features/search-limit-wall"
import { NoResults } from "@/components/features/search/no-results"
import { PlayerErrorBoundary } from "@/components/PlayerErrorBoundary"
import { AppTour } from "@/components/app-tour"

export default function RoutedSearchPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const params = useParams<{ q: string; language: string }>()
  const searchParams = useSearchParams()

  // Preload player component chunks immediately — don't wait for search results.
  // Without this, chunks only download AFTER playlist arrives (waterfall).
  // With this, chunks are in browser cache before the API even responds.
  useEffect(() => {
    import("@/components/features/player/video-player-card")
    import("@/components/features/player/audio-card")
  }, [])

  const q = params.q ? decodeURIComponent(params.q) : ""
  const languageParam = params.language ? decodeURIComponent(params.language) : "english"

  const categoryParam = searchParams.get("category")
  const categoryForContext = categoryParam || null

  const { setQuery, setCategory, setLanguage, subCategory } = useSearchStore()
  const { currentVideoIndex, resetIndex, nextVideo } = usePlayerStore()

  // Entitlements: check if the user still has search access
  const { hasAccess, isLoaded } = useEntitlements("search")
  const authStatus = useAuthStore((s) => s.status)
  const isAnonymous = authStatus !== "authenticated"

  const [externalPrompt, setExternalPrompt] = useState<string | null>(null)
  const [contextSnippet, setContextSnippet] = useState<string | null>(null)
  const [hasRequested, setHasRequested] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAiCollapsed, setIsAiCollapsed] = useState(false)
  const [mobileTab, setMobileTab] = useState<"player" | "ai">("player")
  const isDesktop = useMediaQuery("(min-width: 1280px)")

  // Auto-switch to AI tab when a word meaning is requested (mobile)
  useEffect(() => {
    if (externalPrompt) setMobileTab("ai")
  }, [externalPrompt])

  // Track if the search was blocked by a 429 response
  const [searchBlocked, setSearchBlocked] = useState(false)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
    refetch
  } = useInfiniteSearch(q, languageParam, categoryForContext, subCategory)

  const playlist = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.hits || [])
  }, [data])

  // Prefetch transcripts for upcoming clips to eliminate loading lag
  useTranscriptPrefetch(playlist, currentVideoIndex, languageParam as string);

  const totalHits = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) return 0
    return data.pages[0].total || 0
  }, [data])

  const aggregations = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) return {}
    return data.pages[0].aggregations || {}
  }, [data])

  // Pre-fetch next page when nearing the end of the playlist
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return

    const clipsRemaining = playlist.length - currentVideoIndex - 1
    // If we're within 10 clips of the end, fetch the next batch seamlessly
    if (clipsRemaining <= 10) {
      fetchNextPage()
    }
  }, [currentVideoIndex, playlist.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Detect 429 from the search error (Axios wraps it in error.response)
  useEffect(() => {
    if (error) {
      const axiosErr = error as any
      if (axiosErr?.response?.status === 429) {
        setSearchBlocked(true)
      }
    }
  }, [error])

  // If user logs in while the wall is showing, un-block and retry
  useEffect(() => {
    if (!isAnonymous && searchBlocked) {
      setSearchBlocked(false)
      refetch()
    }
  }, [isAnonymous, searchBlocked, refetch])

  // Also un-block if entitlements restore access (e.g. after login)
  useEffect(() => {
    if (isLoaded && hasAccess && searchBlocked) {
      setSearchBlocked(false)
      refetch()
    }
  }, [isLoaded, hasAccess, searchBlocked, refetch])

  useEffect(() => {
    if (!q || !q.trim()) return

    setHasRequested(true)
    resetIndex() // Reset index at the start of a new search

    setQuery(q)
    setCategory(categoryForContext)
    setLanguage(languageParam)

    try {
      localStorage.setItem("last_search_query", q)
    } catch { }

    setSearchQuery(q)
  }, [q, languageParam, categoryForContext, subCategory, refetch, setQuery, setCategory, setLanguage])

  // (Removed effect that resetted index on data change, which broke infinite scroll)

  // Show the signup wall if:
  // 1. We got a 429 from the backend (searchBlocked), OR
  // 2. Entitlements say no access AND user is anonymous (already blocked before search)
  const showWall = searchBlocked || (isLoaded && !hasAccess && isAnonymous)

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <AppTour ready={playlist.length > 0} />
      <div className="flex-1 flex flex-col min-h-0 bg-transparent text-card-foreground">
        {showWall ? (
          /* ── Signup Wall ── */
          <SearchLimitWall />
        ) : (
          <div className="flex-1 min-h-0 border border-border/40 rounded-xl">
          <div className={cn(
            "mt-0 max-w-full h-full xl:grid xl:items-stretch transition-[grid-template-columns] duration-300 ease-in-out",
            (playlist.length === 0 && !isLoading && !isFetching)
              ? "xl:grid-cols-1"
              : (isAiCollapsed ? "xl:grid-cols-[1fr_48px]" : "xl:grid-cols-[1fr_560px]")
          )}>

            {/* ── Mobile/Tablet Tab Bar (below xl) ── */}
            {(playlist.length > 0 || isLoading || isFetching) && (
              <div className="xl:hidden flex items-center gap-1 px-4 pt-3 sm:px-6">
                <button
                  onClick={() => setMobileTab("player")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${mobileTab === "player"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Play className="h-3.5 w-3.5" />
                  Player
                </button>
                <button
                  onClick={() => setMobileTab("ai")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${mobileTab === "ai"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                  AI Assistant
                </button>
              </div>
            )}

            {/* ── Player content or Empty State ── */}
            <div className={`flex flex-col overflow-y-auto ${mobileTab !== "player" ? "hidden xl:flex" : ""}`}>
              {playlist.length === 0 && !isLoading && !isFetching ? (
                <div className="p-4 sm:p-6">
                  <NoResults query={q} />
                </div>
              ) : (
                <div className="flex flex-col relative w-full">
                  {/* Sticky Header Layer for Mobile */}
                  <div className="xl:relative sticky top-0 z-40 bg-background/95 backdrop-blur-sm xl:bg-transparent xl:backdrop-blur-none px-4 pt-3 pb-2 sm:px-6">
                    {playlist.length > 0 ? (
                      <PlayerErrorBoundary>
                        <div id="tour-player">
                        <VideoPlayerCard
                          key={`${q}-${languageParam}`}
                          playlist={playlist}
                          isFetching={isFetching || isFetchingNextPage}
                          aggregations={aggregations}
                          onClipEnded={() => {
                            const idx = usePlayerStore.getState().currentVideoIndex
                            if (idx < playlist.length - 1) nextVideo()
                          }}
                        />
                        </div>
                      </PlayerErrorBoundary>
                    ) : (
                      <div className="space-y-3">
                        {/* Facet chips skeleton */}
                        <div className="flex gap-2 mb-3">
                          {[80, 96, 72, 88].map((w, i) => (
                            <div key={i} className="h-7 rounded-full bg-muted animate-pulse" style={{ width: w }} />
                          ))}
                        </div>
                        {/* Video area skeleton */}
                        <div className="h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[550px] w-full animate-pulse bg-muted rounded-2xl" />
                      </div>
                    )}
                  </div>

                  {/* Scrollable Content Layer */}
                  <div className="px-4 pb-4 sm:px-6 space-y-4">
                    {playlist.length > 0 ? (
                      <AudioCard
                        currentClip={playlist[currentVideoIndex]}
                        playlist={playlist}
                        totalItems={totalHits}
                        searchQuery={searchQuery}
                        language={languageParam}
                        isLoading={isLoading || (isFetching && playlist.length === 0)}
                        isFetchingNextPage={isFetchingNextPage}
                        onExplainWordPrompt={(prompt) => setExternalPrompt(prompt)}
                        onTranscriptDetermined={(snippet) => setContextSnippet(snippet)}
                      />
                    ) : (
                      <div className="w-full rounded-3xl bg-card p-4 sm:p-6 shadow-2xl space-y-5">
                        {/* Controls row skeleton */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="h-6 w-28 rounded-full bg-muted animate-pulse" />
                          <div className="flex items-center gap-3">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="h-11 w-11 rounded-full bg-muted animate-pulse" />
                            ))}
                          </div>
                          <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
                        </div>
                        {/* Transcript skeleton */}
                        <div className="space-y-3 py-2">
                          <div className="h-4 w-1/3 rounded-full bg-muted/60 animate-pulse mx-auto" />
                          <div className="h-5 w-3/4 rounded-full bg-muted animate-pulse mx-auto" />
                          <div className="h-4 w-1/2 rounded-full bg-muted/60 animate-pulse mx-auto" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── AI Panel (single instance, responsive layout) ── */}
            {(playlist.length > 0 || isLoading || isFetching) && (
              <>
                {/* Mobile/Tablet: shown when AI tab is active */}
                {!isDesktop && (
                  <div className={mobileTab !== "ai" ? "hidden" : ""}>
                    <div className="h-[calc(100dvh-7.5rem)] overflow-hidden bg-card">
                      {playlist.length === 0 ? (
                        <div className="w-full h-full flex flex-col p-6 pointer-events-none">
                          <div className="h-8 w-2/3 bg-muted/60 rounded-full mb-2 mx-auto animate-pulse" />
                          <div className="h-4 w-1/2 bg-muted/40 rounded-full mb-8 mx-auto animate-pulse" />
                          <div className="flex gap-2 flex-wrap mb-8 justify-center">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="h-8 w-24 bg-muted/60 rounded-full animate-pulse" />
                            ))}
                          </div>
                          <div className="w-full bg-muted/20 rounded-xl p-6 border animate-pulse">
                            <div className="space-y-3">
                              <div className="h-4 w-full bg-muted/60 rounded-full" />
                              <div className="h-4 w-5/6 bg-muted/60 rounded-full" />
                              <div className="h-4 w-4/6 bg-muted/60 rounded-full" />
                            </div>
                          </div>
                          <div className="mt-auto pt-6 border-t border-border/40">
                            <div className="h-14 w-full bg-muted/60 rounded-full animate-pulse" />
                          </div>
                        </div>
                      ) : (
                        <AiCompletion externalPrompt={externalPrompt} contextSnippet={contextSnippet} />
                      )}
                    </div>
                  </div>
                )}

                {/* Desktop: sidebar panel */}
                {isDesktop && (
                  <div className="relative z-30 h-full p-2">
                    {playlist.length === 0 ? (
                      <div className="w-full h-full flex flex-col p-6 bg-card rounded-xl pointer-events-none">
                        <div className="h-8 w-2/3 bg-muted/60 rounded-full mt-4 mb-2 mx-auto animate-pulse" />
                        <div className="h-4 w-1/2 bg-muted/40 rounded-full mb-10 mx-auto animate-pulse" />
                        <div className="flex gap-2 flex-wrap mb-10 justify-center">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-8 w-32 bg-muted/60 rounded-full animate-pulse" />
                          ))}
                        </div>
                        <div className="w-full bg-muted/20 rounded-xl p-6 border animate-pulse">
                          <div className="space-y-4">
                            <div className="h-4 w-full bg-muted/60 rounded-full" />
                            <div className="h-4 w-[90%] bg-muted/60 rounded-full" />
                            <div className="h-4 w-[75%] bg-muted/60 rounded-full" />
                          </div>
                        </div>
                        <div className="mt-auto pt-6 border-t border-border/40">
                          <div className="h-14 w-full bg-muted/60 rounded-full animate-pulse" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setIsAiCollapsed(!isAiCollapsed)}
                          className="absolute -left-1 top-8 w-6 h-6 bg-popover border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all z-50 shadow-lg cursor-pointer group"
                          title={isAiCollapsed ? "Open AI Assistant" : "Close AI Assistant"}
                        >
                          {isAiCollapsed
                            ? <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                            : <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />}
                        </button>

                        <div className="relative h-full overflow-hidden rounded-xl border border-border/70">
                          <div className={`absolute inset-0 transition-all duration-300 ${isAiCollapsed ? 'opacity-0 pointer-events-none translate-x-4' : 'opacity-100 translate-x-0'}`}>
                            <AiCompletion externalPrompt={externalPrompt} contextSnippet={contextSnippet} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          </div>
        )}
      </div>
    </>
  )
}