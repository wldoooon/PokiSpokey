"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Clock, TrendingUp, UserPlus, Flame } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { AuthDialog } from "@/components/auth-dialog"
import Link from "next/link"

interface UsageCircleProps {
    current: number
    limit: number
    remaining: number
    hasAccess: boolean
    isAnonymous: boolean
    size?: "sm" | "lg"
    className?: string
}

/* ── Color helpers ── */

/** Returns the app's primary orange color with dynamic saturation/lightness based on ratio if needed, but keeping it branded */
function ratioToColor(ratio: number): string {
    // Keep it branded orange but maybe slightly darker as it fills?
    // Using tailwind orange-500 equivalent: hsl(24.6 95% 53.1%)
    return `hsl(24.6, 95%, 53.1%)`
}

function ratioToBg(ratio: number, alpha = 0.15): string {
    return `hsla(24.6, 95%, 53.1%, ${alpha})`
}

/* ── Component ── */

export function UsageCircle({
    current,
    limit,
    remaining,
    hasAccess,
    isAnonymous,
    size = "sm",
    className,
}: UsageCircleProps) {
    const ratio = limit > 0 ? current / limit : 1
    const isFull = !hasAccess || ratio >= 1

    const circumference = 2 * Math.PI * 15 // ≈94.25
    // Arc shows REMAINING portion: full circle when 0 usage, empty when maxed
    const arcOffset = circumference * ratio

    // Dynamic colors via inline style (no Tailwind class purge issues)
    const strokeColor = ratioToColor(ratio)
    const trackColor = ratioToBg(ratio)
    const textColor = strokeColor

    const px = size === "sm" ? 30 : 84

    // Hover + click open
    const [open, setOpen] = useState(false)
    const closeTimer = useRef<ReturnType<typeof setTimeout>>(null)

    const handleEnter = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
        setOpen(true)
    }
    const handleLeave = () => {
        closeTimer.current = setTimeout(() => setOpen(false), 200)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    onMouseEnter={handleEnter}
                    onMouseLeave={handleLeave}
                    className={cn(
                        "relative flex items-center justify-center shrink-0 cursor-pointer group",
                        className
                    )}
                    style={{ width: px, height: px }}
                >
                    <svg
                        className="absolute inset-0 -rotate-90 transition-transform duration-300 group-hover:scale-110"
                        viewBox="0 0 36 36"
                        width={px}
                        height={px}
                    >
                        {/* Track */}
                        <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            strokeWidth={size === "sm" ? 3.5 : 2.5}
                            style={{ stroke: trackColor }}
                        />
                        {/* Active arc */}
                        <circle
                            cx="18" cy="18" r="15"
                            fill="none"
                            strokeWidth={size === "sm" ? 3.5 : 2.5}
                            strokeDasharray={circumference}
                            strokeDashoffset={arcOffset}
                            strokeLinecap="round"
                            style={{
                                stroke: strokeColor,
                                transition: "stroke-dashoffset 0.7s ease-out, stroke 0.5s ease",
                            }}
                        />
                    </svg>
                    {/* Center number = current usage */}
                    <span
                        className="relative font-bold tabular-nums leading-none"
                        style={{
                            color: textColor,
                            fontSize: size === "sm" ? 8 : 16,
                        }}
                    >
                        {current}
                    </span>
                </button>
            </PopoverTrigger>

            <PopoverContent
                side="bottom"
                align="end"
                sideOffset={8}
                className="w-72 p-0 rounded-2xl border shadow-2xl"
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
            >
                <div className="p-5 space-y-4">
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Monthly Usage
                            </span>
                        </div>
                        <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                                background: isAnonymous ? undefined : ratioToBg(ratio, 0.12),
                                color: isAnonymous ? undefined : strokeColor,
                            }}
                        >
                            {isAnonymous ? "Guest" : "Free"}
                        </span>
                    </div>

                    {/* ── Big gauge ── */}
                    <div className="flex justify-center py-1">
                        <div className="relative" style={{ width: 88, height: 88 }}>
                            <svg className="-rotate-90" viewBox="0 0 36 36" width={88} height={88}>
                                <circle
                                    cx="18" cy="18" r="15"
                                    fill="none" strokeWidth="2.5"
                                    style={{ stroke: trackColor }}
                                />
                                <circle
                                    cx="18" cy="18" r="15"
                                    fill="none" strokeWidth="2.5"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={arcOffset}
                                    strokeLinecap="round"
                                    style={{
                                        stroke: strokeColor,
                                        transition: "stroke-dashoffset 0.7s ease-out, stroke 0.5s ease",
                                    }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span
                                    className="text-2xl font-extrabold tabular-nums leading-none"
                                    style={{ color: textColor }}
                                >
                                    {current}
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                    of {limit}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Progress bar (inline style) ── */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Searches used</span>
                            <span className="font-semibold tabular-nums" style={{ color: textColor }}>
                                {remaining} left
                            </span>
                        </div>
                        <div className="h-2 w-full rounded-full overflow-hidden"
                            style={{ background: ratioToBg(ratio, 0.15) }}
                        >
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.min(ratio * 100, 100)}%`,
                                    background: strokeColor,
                                    transition: "width 0.5s ease, background 0.5s ease",
                                }}
                            />
                        </div>
                    </div>

                    {/* ── Reset info ── */}
                    <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] text-muted-foreground"
                        style={{ background: ratioToBg(ratio, 0.08) }}
                    >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Resets on the <span className="font-semibold">1st of each month</span></span>
                    </div>

                    {/* ── CTA ── */}
                    {isAnonymous ? (
                        <AuthDialog defaultTab="signup">
                            <button
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white text-xs font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: isFull ? "#ef4444" : strokeColor }}
                            >
                                <UserPlus className="w-3.5 h-3.5" /> Sign up for 50/month
                            </button>
                        </AuthDialog>
                    ) : (
                        <Link
                            href="/pricing"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white text-xs font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: isFull ? "#ef4444" : strokeColor }}
                        >
                            <TrendingUp className="w-3.5 h-3.5" /> Upgrade for unlimited
                        </Link>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
