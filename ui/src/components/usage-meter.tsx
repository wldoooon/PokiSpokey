"use client"

import { useState } from "react"
import { useUsageStore } from "@/stores/usage-store"
import { useAuthStore } from "@/stores/auth-store"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthDialog } from "@/components/auth-dialog"
import { ZapIcon, SearchIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}k`
    return n.toLocaleString()
}

function SkeletonRow() {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Skeleton className="w-3.5 h-3.5 rounded-sm shrink-0" />
                    <Skeleton className="h-3 w-14 rounded" />
                </div>
                <Skeleton className="h-3 w-10 rounded" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
    )
}

function UsageRow({
    icon: Icon,
    label,
    used,
    total,
    valueLabel,
}: {
    icon: React.ElementType
    label: string
    used: number
    total: number
    valueLabel: string
}) {
    const unlimited = total === -1
    const pct = !unlimited && total > 0 ? Math.min(100, (used / total) * 100) : 0

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{label}</span>
                </div>
                {unlimited ? (
                    <span className="text-xs text-muted-foreground">∞ Unlimited</span>
                ) : (
                    <span className="text-xs text-muted-foreground">{valueLabel}</span>
                )}
            </div>
            {!unlimited && (
                <Progress
                    value={pct}
                    className={cn("h-1.5", pct >= 90 && "[&>div]:bg-red-500", pct >= 70 && pct < 90 && "[&>div]:bg-amber-500")}
                />
            )}
        </div>
    )
}

export function UsageMeter() {
    const usageMap  = useUsageStore((s) => s.usage)
    const isLoaded  = useUsageStore((s) => s.isLoaded)
    const user      = useAuthStore((s) => s.user)
    const [authOpen, setAuthOpen] = useState(false)

    const tier = user?.tier
        ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1)
        : "Guest"

    const isGuest = !user

    return (
        <div className={cn(
            "card-animated-border relative w-full rounded-xl p-3 flex flex-col gap-3 overflow-hidden",
            "transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0"
        )}>
            {/* Periodic shimmer sweep */}
            <div className="usage-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-black/8 to-transparent dark:via-white/10" />
            {/* Top-right white glow */}
            <div className="pointer-events-none absolute inset-0 dark:bg-[radial-gradient(35%_80%_at_85%_0%,--theme(--color-foreground/.1),transparent)]" />

            {/* Header */}
            <div className="flex items-center justify-between">
                {isLoaded
                    ? <span className="text-xs font-semibold text-foreground">Usage</span>
                    : <Skeleton className="h-3 w-8 rounded" />
                }
                {isLoaded
                    ? <span className="text-[10px] text-muted-foreground">{tier} plan</span>
                    : <Skeleton className="h-3 w-12 rounded" />
                }
            </div>

            {isLoaded ? (
                <>
                    {(() => {
                        const searches = usageMap["search"] ?? { current: 0, limit: 3, remaining: 3 }
                        const sparks   = usageMap["ai_chat"] ?? { current: 0, limit: 0, balance: 0 }

                        const sparkUsed      = sparks.current ?? 0
                        const sparkLimit     = sparks.limit ?? 0
                        const sparkBalance   = sparks.balance ?? sparks.remaining ?? Math.max(0, sparkLimit - sparkUsed)
                        const searchRemaining = searches.remaining ?? Math.max(0, searches.limit - searches.current)

                        return (
                            <>
                                <UsageRow
                                    icon={SearchIcon}
                                    label="Searches"
                                    used={searches.current}
                                    total={searches.limit}
                                    valueLabel={searchRemaining >= 0 ? `${fmt(searchRemaining)} left` : "∞ Unlimited"}
                                />
                                {!isGuest && (
                                    <UsageRow
                                        icon={ZapIcon}
                                        label="AI Credits"
                                        used={sparkUsed}
                                        total={sparkLimit}
                                        valueLabel={sparkBalance >= 0 ? `${fmt(sparkBalance)} left` : "∞ Unlimited"}
                                    />
                                )}
                                {isGuest && (
                                    <>
                                        <AuthDialog defaultTab="signup" open={authOpen} onOpenChange={setAuthOpen}>
                                            <button
                                                onClick={() => setAuthOpen(true)}
                                                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors group text-left"
                                            >
                                                <Sparkles className="w-3 h-3 shrink-0 text-primary group-hover:text-foreground transition-colors" />
                                                Sign up for more searches & AI credits
                                            </button>
                                        </AuthDialog>
                                    </>
                                )}
                            </>
                        )
                    })()}
                </>
            ) : (
                <>
                    <SkeletonRow />
                    <SkeletonRow />
                </>
            )}
        </div>
    )
}
