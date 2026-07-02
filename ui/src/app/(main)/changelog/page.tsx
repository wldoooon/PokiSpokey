"use client";

import React from 'react';
import { DecorIcon } from '@/components/ui/decor-icon';
import { Tag, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const releases = [
    {
        version: "v1.6.0",
        date: "March 20, 2026",
        title: "No More Double Counting",
        description: "We overhauled how search usage is tracked so you never get charged twice for the same lookup. This update also brings major stability improvements to the video player and transcript sync.",
        changes: [
            { type: "fix", description: "Searching the same word or phrase within one hour no longer deducts from your monthly quota a second time." },
            { type: "fix", description: "Transcript box no longer vibrates or jumps between sentences during playback. Sync logic was rewritten with a sticky 'last passed sentence' engine." },
        ]
    },
    {
        version: "v1.5.0",
        date: "March 10, 2026",
        title: "Instant Search",
        description: "Search results now feel instant.",
        changes: [
            { type: "feat", description: "Player component chunks are now pre-fetched on page load so video playback starts immediately when results arrive." },
            { type: "fix", description: "Search bar no longer triggers conflicting route prefetches on focus, causing App Router internal state corruption on fast tab switches." },
        ]
    },
    {
        version: "v1.4.0",
        date: "February 20, 2026",
        title: "Bonjour! French Language Support",
        flag: "https://flagcdn.com/fr.svg",
        description: "We officially added full support for the French language — a curated library of real-world clips spanning movies, podcasts, cartoons, and talks.",
        changes: [
            { type: "feat", description: "Added the French language catalog with hundreds of thousands of indexed video frames." },
            { type: "feat", description: "AI Assistant now understands and explains French grammar, idiomatic expressions, and cultural nuances." },
            { type: "feat", description: "Language selector in the search bar now includes French alongside English and German." },
        ]
    },
    {
        version: "v1.3.5",
        date: "February 10, 2026",
        title: "Sub-Category Deep Search",
        description: "Finding exactly the right context is now faster with specific sub-category filtering layered on top of the main category.",
        changes: [
            { type: "feat", description: "Added sub-category filters — drill down from 'Movies' to 'Drama', 'Comedy', 'Action', and more." },
            { type: "update", description: "Improved search indexing speeds for complex layered queries across all six content categories." },
        ]
    },
    {
        version: "v1.3.0",
        date: "January 28, 2026",
        title: "AI Credits Economy & Subscription Tiers",
        description: "We launched the full subscription model with four tiers, an AI credits-based token economy, and real-time usage tracking synced to your account.",
        changes: [
            { type: "feat", description: "Introduced AI credits — each AI Assistant response deducts credits based on response length." },
            { type: "feat", description: "Launched four subscription tiers: Free, Basic ($4.99/mo), Pro ($8.99/mo), and Max ($18.99/mo)." },
        ]
    },
];

function SideBox({ index, isLast, circle }: { index: number; isLast?: boolean; circle?: boolean }) {
    return (
        <div className={cn(
            "border-r border-b border-border/40 relative hidden md:block",
            index % 2 !== 0 && "bg-muted/20 dark:bg-muted/5"
        )}>
            {/* continuous vertical line */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-border/50" />
            {/* stop line at bottom of last row */}
            {isLast && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-1/2 bg-background" />
            )}
            {/* circle node */}
            {circle && (
                <div className={cn(
                    "absolute top-8 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-background z-10",
                    index === 0
                        ? "border-2 border-orange-500"
                        : "border border-border"
                )} />
            )}
        </div>
    );
}

export default function ChangelogPage() {
    return (
        <div className="py-10 px-4">
            <div className="max-w-5xl mx-auto border-t border-l border-border/40 grid grid-cols-1 md:grid-cols-[72px_1fr_72px]">

                {/* ── Header row ── */}
                {/* left */}
                <div className="border-r border-b border-border/40 bg-muted/20 dark:bg-muted/5 hidden md:block" />
                {/* center */}
                <div className="relative border-r border-b border-border/40 px-10 py-14">
                    <DecorIcon position="top-left" />
                    <DecorIcon position="top-right" />
                    <DecorIcon position="bottom-left" />
                    <DecorIcon position="bottom-right" />
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500 mb-4">Updates</p>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-4">
                        Changelog
                    </h1>
                    <p className="text-muted-foreground max-w-xl leading-relaxed">
                        New updates and improvements to PokiSpokey. We ship frequently — here's everything we've built so far.
                    </p>
                </div>
                {/* right */}
                <div className="border-r border-b border-border/40 bg-muted/20 dark:bg-muted/5 hidden md:block" />

                {/* ── Release rows ── */}
                {releases.map((release, index) => {
                    const isLast = index === releases.length - 1;
                    const shaded = index % 2 !== 0;
                    return (
                        <React.Fragment key={release.version}>
                            {/* Left side box */}
                            <SideBox index={index} isLast={isLast} circle />

                            {/* Center content */}
                            <div className={cn(
                                "relative border-r border-b border-border/40 px-8 py-8",
                                shaded && "bg-muted/20 dark:bg-muted/5"
                            )}>
                                {isLast && <DecorIcon position="bottom-left" />}
                                {isLast && <DecorIcon position="bottom-right" />}

                                {/* Version + date */}
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border text-xs font-mono font-semibold text-foreground">
                                        <Tag className="w-3 h-3" />
                                        {release.version}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        {release.date}
                                    </span>
                                </div>

                                {/* Title */}
                                <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                                    {(release as any).flag && (
                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-border flex-shrink-0">
                                            <img src={(release as any).flag} alt="flag" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    {release.title}
                                </h2>

                                {/* Description */}
                                {release.description && (
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                        {release.description}
                                    </p>
                                )}

                                {/* Changes */}
                                <div className="space-y-2.5">
                                    {release.changes.map((change, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="mt-0.5 shrink-0 inline-flex px-2 py-0.5 rounded border border-border bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                {change.type}
                                            </span>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{change.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right side box */}
                            <SideBox index={index} isLast={isLast} circle={false} />
                        </React.Fragment>
                    );
                })}

            </div>
        </div>
    );
}
