"use client"

import { useEffect, useState, Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchStore } from "@/stores/use-search-store"
import { usePlayerStore } from "@/stores/use-player-store"
import { VideoPlayerSkeleton, TranscriptSkeleton, AiCompletionSkeleton } from "./WatchSkeletons"
import { PanelRightClose, PanelRightOpen, Bot, Play, Loader2 } from "lucide-react"

// Dynamic imports for heavy components
const VideoPlayerCard = dynamic(
    () => import("@/components/features/player/video-player-card"),
    {
        ssr: false,
        loading: () => <VideoPlayerSkeleton />
    }
)

const AudioCard = dynamic(
    () => import("@/components/features/player/audio-card"),
    {
        ssr: false,
        loading: () => <TranscriptSkeleton />
    }
)

const AiCompletion = dynamic(
    () => import("@/components/ai-completion").then(mod => mod.AiCompletion),
    {
        ssr: false,
        loading: () => <AiCompletionSkeleton />
    }
)

import { useSearch } from "@/lib/useApi"

function SearchParamSyncer({ word }: { word: string }) {
    const { setQuery } = useSearchStore()

    const decoded = word ? decodeURIComponent(word) : ""

    useEffect(() => {
        if (decoded) {
            setQuery(decoded)
        }
    }, [decoded, setQuery])

    return null
}

export default function WatchClientPage({ word }: { word: string }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const { category, language, subCategory } = useSearchStore()
    const { currentVideoIndex, resetIndex } = usePlayerStore()

    // Reset index when word changes
    useEffect(() => {
        resetIndex()
    }, [word, resetIndex])

    // PREFETCHING & DATA: Use the hook and capture the results
    const { data, isFetching } = useSearch(decodeURIComponent(word), language, category, subCategory)
    const playlist = data?.hits || []

    const [externalPrompt, setExternalPrompt] = useState<string | null>(null)
    const [contextSnippet, setContextSnippet] = useState<string | null>(null)
    const [isAiCollapsed, setIsAiCollapsed] = useState(false)
    const [mobileTab, setMobileTab] = useState<"player" | "ai">("player")

    if (!mounted) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <>
            <SearchParamSyncer word={word} />

            {/* Main Content */}
            <div className="flex-1">
                <div className={`mt-0 max-w-full xl:grid xl:items-start transition-[grid-template-columns] duration-300 ease-in-out ${isAiCollapsed ? 'xl:grid-cols-[1fr_48px]' : 'xl:grid-cols-[1fr_560px]'}`}>

                    {/* ── Mobile/Tablet Tab Bar (below xl) ── */}
                    <div className="xl:hidden flex items-center gap-1 px-4 pt-3 sm:px-6">
                        <button
                            onClick={() => setMobileTab("player")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                mobileTab === "player"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Play className="h-3.5 w-3.5" />
                            Player
                        </button>
                        <button
                            onClick={() => setMobileTab("ai")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                mobileTab === "ai"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Bot className="h-3.5 w-3.5" />
                            AI Assistant
                        </button>
                    </div>

                    {/* ── Player content ── */}
                    <div className={`space-y-4 p-4 sm:p-6 pb-12 xl:pb-6 ${mobileTab !== "player" ? "hidden xl:block" : ""}`}>
                        <Suspense fallback={<VideoPlayerSkeleton />}>
                            <VideoPlayerCard
                                playlist={playlist}
                                isFetching={isFetching}
                                aggregations={data?.aggregations}
                            />
                        </Suspense>
                        <Suspense fallback={<TranscriptSkeleton />}>
                            <AudioCard
                                currentClip={playlist[currentVideoIndex]}
                                playlist={playlist}
                                totalItems={data?.total}
                                searchQuery={decodeURIComponent(word)}
                                onExplainWordPrompt={setExternalPrompt}
                                onTranscriptDetermined={setContextSnippet}
                            />
                        </Suspense>
                    </div>

                    {/* ── Mobile/Tablet AI Panel (below xl) ── */}
                    <div className={`xl:hidden ${mobileTab !== "ai" ? "hidden" : ""}`}>
                        <div className="h-[calc(100vh-10rem)] overflow-hidden bg-card">
                            <Suspense fallback={<AiCompletionSkeleton />}>
                                <AiCompletion externalPrompt={externalPrompt} contextSnippet={contextSnippet} />
                            </Suspense>
                        </div>
                    </div>

                    {/* ── Desktop AI Panel (xl+) ── */}
                    <div className="hidden xl:flex xl:flex-col xl:ml-0 xl:mr-0 sticky top-0 h-[calc(100vh-5rem)] overflow-hidden border-l bg-card">
                        {/* Collapsed strip */}
                        <button
                            onClick={() => setIsAiCollapsed(!isAiCollapsed)}
                            className={`flex flex-col items-center gap-2 w-full pt-5 transition-opacity duration-200 ${
                                isAiCollapsed ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none absolute'
                            }`}
                            title="Open AI Assistant"
                        >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                                <PanelRightOpen className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase -rotate-180" style={{ writingMode: 'vertical-rl' }}>AI Assistant</span>
                        </button>

                        {/* Full panel */}
                        <div className={`absolute inset-0 transition-all duration-300 ${isAiCollapsed ? 'opacity-0 pointer-events-none translate-x-4' : 'opacity-100 translate-x-0'}`}>
                            {/* Close button inside panel */}
                            <button
                                onClick={() => setIsAiCollapsed(true)}
                                className="absolute right-3 top-3 z-30 h-8 w-8 rounded-full border bg-background/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Close AI Assistant"
                            >
                                <PanelRightClose className="h-4 w-4" />
                            </button>
                            <Suspense fallback={<AiCompletionSkeleton />}>
                                <AiCompletion externalPrompt={externalPrompt} contextSnippet={contextSnippet} />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
