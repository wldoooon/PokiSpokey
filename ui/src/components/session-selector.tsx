"use client"

import { useState, useEffect } from "react"
import { cn, timeAgo } from "@/lib/utils"
import { History, Trash2, ArrowLeft, MessageSquare, AlertTriangle, Loader2 } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"

interface SessionSelectorProps {
    sessions: Record<string, any>
    activeSessionId: string
    onSelectSession: (sessionId: string) => void
    onDeleteSession: (sessionId: string, e: React.MouseEvent) => void
    onClearAll?: () => void
    className?: string
    currentQuery?: string
    isLoading?: boolean        // AI is currently streaming
    isHistoryLoading?: boolean // IndexedDB sessions still initializing
}

function safeDisplay(str: string) {
    if (!str) return "Unknown"
    try {
        const decoded = decodeURIComponent(str)
        return decoded.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        )
    } catch {
        return str
    }
}

export function SessionSelector({
    sessions,
    activeSessionId,
    onSelectSession,
    onDeleteSession,
    onClearAll,
    className,
    currentQuery,
    isLoading = false,
    isHistoryLoading = false,
}: SessionSelectorProps) {
    const [open, setOpen] = useState(false)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [confirmClearAll, setConfirmClearAll] = useState(false)

    // Escape cancels any active confirm state
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return
            if (confirmDeleteId) { setConfirmDeleteId(null); e.stopPropagation(); return }
            if (confirmClearAll) { setConfirmClearAll(false); e.stopPropagation() }
        }
        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [open, confirmDeleteId, confirmClearAll])

    const sessionKeys = Object.keys(sessions).filter(
        (key) => sessions[key].branches && sessions[key].branches.length > 0
    )
    const hasAnySessions = sessionKeys.length > 0

    // Show the trigger even while loading so it doesn't flicker in
    if (!isHistoryLoading && !hasAnySessions) return null

    const sortedSessions = [...sessionKeys].sort((a, b) => {
        return (sessions[b].lastActive || 0) - (sessions[a].lastActive || 0)
    })

    // activeSessionId may be a dangling nanoid after deleting the active session
    const activeIsReal = activeSessionId && sessions[activeSessionId]?.branches?.length > 0
    const isViewingHistory = !!(currentQuery && activeIsReal && currentQuery !== activeSessionId)
    const activeDisplayName = activeIsReal ? safeDisplay(activeSessionId) : null

    const handleClose = () => {
        setOpen(false)
        setConfirmDeleteId(null)
        setConfirmClearAll(false)
    }

    return (
        <Popover open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer",
                        open && "bg-muted/60 text-foreground",
                        className,
                    )}
                >
                    {isHistoryLoading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <History className="h-3.5 w-3.5" />
                    }
                    <span className="text-xs font-medium">History</span>
                    {/* Show active session name instead of raw count */}
                    {activeDisplayName && !isHistoryLoading && (
                        <span className="text-[10px] bg-orange-500 text-white rounded-full px-1.5 py-px font-medium max-w-[80px] truncate">
                            {activeDisplayName}
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent className="w-[268px] p-1.5" align="end" sideOffset={8}>

                {/* Warning banner when AI is streaming */}
                {isLoading && (
                    <div className="flex items-center gap-2 px-2.5 py-2 mb-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                            Response in progress — switching may lose it.
                        </p>
                    </div>
                )}

                {/* Return to current search session */}
                {isViewingHistory && (
                    <button
                        onClick={() => { onSelectSession(currentQuery!); handleClose() }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left cursor-pointer mb-1"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium truncate">
                            Back to "{safeDisplay(currentQuery!)}"
                        </span>
                    </button>
                )}

                {/* Session list */}
                <div className="relative">
                    <div className={cn(
                        "max-h-[240px] overflow-y-auto space-y-px transition-opacity duration-150",
                        isLoading && "opacity-50 pointer-events-none"
                    )}>
                        {isHistoryLoading ? (
                            /* Loading skeletons — shown while IndexedDB initializes */
                            <div className="space-y-1 px-1 py-1">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-2 px-2 py-2">
                                        <Skeleton className="h-3.5 w-3.5 rounded-full flex-shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-3 w-3/4 rounded-full" />
                                            <Skeleton className="h-2.5 w-1/2 rounded-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            sortedSessions.map((key) => {
                                const isActive = activeSessionId === key
                                const branchCount = sessions[key].branches?.length || 0
                                const isConfirming = confirmDeleteId === key
                                const lastTime = sessions[key].lastActive || sessions[key].createdAt
                                const displayName = safeDisplay(key)

                                if (isConfirming) {
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-destructive/5 border border-destructive/20"
                                        >
                                            <p className="text-[11px] text-destructive font-medium flex-1 truncate">
                                                Delete "{displayName}"?
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onDeleteSession(key, e)
                                                    // Re-anchor UI if we just deleted the active session
                                                    if (key === activeSessionId && currentQuery) {
                                                        setTimeout(() => onSelectSession(currentQuery), 50)
                                                    }
                                                    setConfirmDeleteId(null)
                                                }}
                                                className="text-[10px] font-semibold text-destructive hover:bg-destructive/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                                                className="text-[10px] font-medium text-muted-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )
                                }

                                return (
                                    <TooltipProvider key={key}>
                                        <Tooltip delayDuration={700}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    onClick={() => { onSelectSession(key); handleClose() }}
                                                    className={cn(
                                                        "group flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors cursor-pointer",
                                                        isActive
                                                            ? "bg-accent text-accent-foreground"
                                                            : "hover:bg-muted/60 text-foreground"
                                                    )}
                                                >
                                                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium truncate">{displayName}</p>
                                                        <p className="text-[10px] text-muted-foreground/70">
                                                            {branchCount} {branchCount === 1 ? "question" : "questions"}
                                                            {lastTime ? ` · ${timeAgo(lastTime)}` : ""}
                                                        </p>
                                                    </div>
                                                    {/* Trash — only visible on hover to reduce noise */}
                                                    <div
                                                        role="button"
                                                        className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            e.preventDefault()
                                                            setConfirmDeleteId(key)
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            {/* Tooltip shows full name for long truncated queries */}
                                            <TooltipContent side="left" className="text-xs max-w-[180px]">
                                                <p>{displayName}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )
                            })
                        )}
                    </div>

                    {/* Bottom fade — appears when list is long enough to scroll */}
                    {!isHistoryLoading && sortedSessions.length > 4 && (
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-popover to-transparent pointer-events-none rounded-b-md" />
                    )}
                </div>

                {/* Footer — clear all + storage cap note */}
                {!isHistoryLoading && hasAnySessions && (
                    <div className="mt-1.5 pt-1.5 border-t border-border/60">
                        {confirmClearAll ? (
                            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-destructive/5 border border-destructive/20">
                                <p className="text-[11px] text-destructive font-medium">
                                    Clear all {sessionKeys.length} sessions?
                                </p>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { onClearAll?.(); setConfirmClearAll(false); handleClose() }}
                                        className="text-[10px] font-semibold text-destructive hover:bg-destructive/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => setConfirmClearAll(false)}
                                        className="text-[10px] font-medium text-muted-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between px-2.5">
                                <p className="text-[10px] text-muted-foreground/40">
                                    Stored up to 3 days · max 50
                                </p>
                                <button
                                    onClick={() => setConfirmClearAll(true)}
                                    className="text-[10px] font-medium text-muted-foreground/60 hover:text-destructive transition-colors cursor-pointer"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
