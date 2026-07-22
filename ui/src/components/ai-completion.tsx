import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchStore } from "@/stores/use-search-store";
import { useUsageStore } from "@/stores/usage-store";
import { Button } from "@/components/ui/button";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { ThumbsDown, ThumbsUp, Copy, Mic, BookText, Repeat, XCircle, Search, CornerDownLeft, Lock, MessageSquare, Zap, Square, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SuggestionChip } from "@/components/suggestion-chip";
import TextType from "@/components/TextType";
import { AiAssistantSkeleton } from "@/components/ai-assistant-skeleton";
import { useResponseHistory } from "@/hooks/useResponseHistory";
import { SessionSelector } from "@/components/session-selector";
import { BranchTimeline } from "@/components/branch-timeline";
import { useRouter } from "next/navigation";
import { toastManager, anchoredToastManager } from "@/components/ui/toast";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthDialog } from "@/components/auth-dialog";
import { apiClient } from "@/lib/apiClient";

interface SmartSuggestion {
    title: string;
    prompt: string;
    icon: React.ReactNode;
}

// Language-aware suggestions — no longer hardcoded to "English"
function generateSmartSuggestions(searchWord: string, language: string): SmartSuggestion[] {
    const lang = language || "English";

    if (!searchWord || searchWord.trim() === "") {
        return [
            {
                title: "Learn pronunciation tips",
                prompt: `What are some general tips for improving ${lang} pronunciation?`,
                icon: <Mic className="h-3 w-3" />,
            },
            {
                title: "Common grammar mistakes",
                prompt: `What are the most common grammar mistakes ${lang} learners make?`,
                icon: <BookText className="h-3 w-3" />,
            },
            {
                title: "Expand vocabulary",
                prompt: `How can I effectively expand my ${lang} vocabulary?`,
                icon: <Repeat className="h-3 w-3" />,
            },
            {
                title: "Common mistakes to avoid",
                prompt: `What are common mistakes ${lang} learners make and how to avoid them?`,
                icon: <XCircle className="h-3 w-3" />,
            },
        ];
    }

    return [
        {
            title: `Pronounce "${searchWord}" correctly`,
            prompt: `Break down how to pronounce "${searchWord}" in ${lang} syllable by syllable with phonetic examples. Include common mistakes learners make.`,
            icon: <Mic className="h-3 w-3" />,
        },
        {
            title: `"${searchWord}" in different contexts`,
            prompt: `Show me 5 example sentences using "${searchWord}" in ${lang} in different contexts (formal, informal, academic, conversational). Explain the nuances.`,
            icon: <BookText className="h-3 w-3" />,
        },
        {
            title: `Similar words to "${searchWord}"`,
            prompt: `What are 5 words similar in meaning or usage to "${searchWord}" in ${lang}? Explain the subtle differences with examples.`,
            icon: <Repeat className="h-3 w-3" />,
        },
        {
            title: `Common mistakes with "${searchWord}"`,
            prompt: `What are the most common mistakes ${lang} learners make when using "${searchWord}"? How can I avoid them?`,
            icon: <XCircle className="h-3 w-3" />,
        },
    ];
}

const AI_PLACEHOLDERS = [
    "How do you pronounce this word?",
    "Give me 5 examples in different contexts...",
    "What's the difference between affect and effect?",
    "Use it in a formal sentence...",
    "What are some synonyms with subtle differences?",
    "How would a native speaker say this?",
];

// Maps raw API errors to user-friendly messages
function getFriendlyError(err: Error): string {
    const msg = err.message ?? "";
    if (msg.includes("429")) return "You've run out of Sparks. Upgrade your plan for more.";
    if (msg.includes("503") || msg.includes("ECONNREFUSED")) return "The AI service is temporarily unavailable. Please try again shortly.";
    if (msg.includes("401") || msg.includes("403")) return "Session expired. Please refresh the page.";
    if (err.name === "TypeError" && msg.toLowerCase().includes("fetch")) return "No internet connection detected. Check your network and try again.";
    return "Something went wrong. Please try again.";
}

export function AiCompletion({
    externalPrompt,
    contextSnippet
}: {
    externalPrompt: string | null;
    contextSnippet?: string | null;
}) {
    const { query, language } = useSearchStore();
    const router = useRouter();
    const authStatus = useAuthStore((s) => s.status);
    const isGuest = authStatus !== "authenticated";
    const usageMap = useUsageStore((s) => s.usage);
    const aiStats = usageMap?.['ai_chat'] || { balance: 0, remaining: 0 };
    const outOfSparks = !isGuest && (aiStats.balance ?? 0) <= 0;

    const [completion, setCompletion] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Stream control
    const abortControllerRef = useRef<AbortController | null>(null);
    const isLoadingRef = useRef(false); // sync ref so closures always read the latest value
    const pendingExternalPromptRef = useRef<string | null>(null); // queued prompt if one arrives mid-stream

    const complete = async (prompt: string) => {
        if (isLoadingRef.current) return;

        // Cancel any in-progress stream before starting a new one
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        isLoadingRef.current = true;
        setIsLoading(true);
        setCompletion("");
        setError(null);

        try {
            const history = branchesRef.current
                .slice(-3)
                .map(b => ({ prompt: b.prompt, response: b.response }));

            const response = await fetch("/api/v1/completion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    context: {
                        query,
                        transcript: contextSnippet,
                        history,
                    }
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (controller.signal.aborted) break;
                const chunk = decoder.decode(value, { stream: true });
                setCompletion((prev) => prev + chunk);
                // Auto-scroll to bottom as new tokens arrive
                if (scrollContentRef.current) {
                    scrollContentRef.current.scrollTop = scrollContentRef.current.scrollHeight;
                }
            }

            // Refresh usage to reflect AI credits deducted server-side after stream
            if (!controller.signal.aborted) {
                apiClient.get("/api/v1/usage").then((res) => {
                    const monthly = res.data?.monthly;
                    if (monthly) {
                        useUsageStore.getState().setAllUsage({
                            search: {
                                current:   monthly.search?.current   ?? 0,
                                limit:     monthly.search?.limit     ?? 0,
                                remaining: monthly.search?.remaining ?? 0,
                            },
                            ai_chat: {
                                current:   monthly.ai_chat?.current   ?? 0,
                                limit:     monthly.ai_chat?.limit     ?? 0,
                                remaining: monthly.ai_chat?.remaining ?? 0,
                                balance:   monthly.ai_chat?.balance   ?? 0,
                            },
                        });
                    }
                }).catch(() => {});
            }
        } catch (err: any) {
            if (err?.name === "AbortError") return; // User stopped — not an error state
            console.error("Completion error:", err);
            setError(err);
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);

            // Fire any prompt that arrived while this stream was running
            const pending = pendingExternalPromptRef.current;
            if (pending) {
                pendingExternalPromptRef.current = null;
                currentPromptRef.current = pending;
                complete(pending);
            }
        }
    };

    const handleStop = () => {
        abortControllerRef.current?.abort();
    };

    // Abort stream on unmount to prevent state updates on a dead component
    useEffect(() => {
        return () => { abortControllerRef.current?.abort(); };
    }, []);

    const [inputValue, setInputValue] = useState("");
    const currentPromptRef = useRef<string>("");
    const branchesRef = useRef<{ prompt: string; response: string }[]>([]);
    const responseContainerRef = useRef<HTMLDivElement>(null);
    const scrollContentRef = useRef<HTMLDivElement>(null);
    // Ref-based blur gradients — fixes the duplicate global ID bug when two instances render
    const topBlurRef = useRef<HTMLDivElement>(null);
    const bottomBlurRef = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState(false);

    const {
        currentBranch,
        totalBranches,
        currentIndex,
        addBranch,
        goToPrevious,
        goToNext,
        navigateToIndex,
        sessions,
        switchSession,
        activeSessionId,
        deleteSession,
        clearHistory,
        isHistoryLoading,
        branches
    } = useResponseHistory();

    branchesRef.current = branches;

    // Portal anchor in the mobile tab bar — renders History button next to Player/AI tabs
    const [historyPortalEl, setHistoryPortalEl] = useState<Element | null>(null);
    useLayoutEffect(() => {
        setHistoryPortalEl(document.getElementById("ai-history-portal"));
    }, []);

    // Copy Logic
    const copyButtonRef = useRef<HTMLButtonElement>(null);
    const { isCopied, copyToClipboard } = useCopyToClipboard({
        onCopy: () => {
            if (copyButtonRef.current) {
                anchoredToastManager.add({
                    data: { tooltipStyle: true },
                    positionerProps: { anchor: copyButtonRef.current },
                    timeout: 2000,
                    title: "Copied!",
                });
            }
        },
    });

    const handleCopy = () => {
        const textToCopy = currentBranch ? currentBranch.response : completion;
        if (textToCopy) copyToClipboard(textToCopy);
    };

    const handleLike = () => {
        toastManager.add({
            title: "Feedback Sent",
            description: "Thanks! We'll use this to improve future answers.",
            type: "success",
            timeout: 3000,
        });
    };

    const handleDislike = () => {
        toastManager.add({
            title: "Feedback Recorded",
            description: "Thanks for letting us know! We'll work on doing better.",
            type: "info",
            timeout: 3000,
        });
    };

    const smartSuggestions = useMemo(() => generateSmartSuggestions(query, language), [query, language]);

    // Auto-switch session when search query changes
    useEffect(() => {
        if (query && query.trim() !== "") {
            switchSession(query);
        }
    }, [query, switchSession]);

    // Clear live stream state when query changes — prevents old response lingering
    useEffect(() => {
        setCompletion("");
        setError(null);
    }, [query]);

    const handleSessionSelect = (sessionId: string) => {
        switchSession(sessionId);
    };

    const shouldHideSuggestions = useMemo(() => {
        return isLoading || !!completion || !!currentBranch;
    }, [isLoading, completion, currentBranch]);

    useEffect(() => {
        const checkScrollable = () => {
            if (scrollContentRef.current) {
                const { scrollHeight, clientHeight } = scrollContentRef.current;
                setCanScroll(scrollHeight > clientHeight);
            }
        };

        const timeout = setTimeout(checkScrollable, 100);
        window.addEventListener('resize', checkScrollable);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', checkScrollable);
        };
    }, [completion, currentBranch, isLoading]);

    const handleSuggestionClick = (suggestion: SmartSuggestion) => {
        if (outOfSparks) return;
        // Fire directly — don't fill the input box with the verbose prompt
        currentPromptRef.current = suggestion.prompt;
        complete(suggestion.prompt);
    };

    const handleInputSubmit = () => {
        if (outOfSparks) return;
        if (inputValue.trim()) {
            const prompt = inputValue.trim();
            currentPromptRef.current = prompt;
            complete(prompt);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleInputSubmit();
        }
    };

    // External prompt handler — queues if mid-stream instead of silently dropping
    const lastHandledPromptRef = useRef<string | null>(null);

    useEffect(() => {
        if (!externalPrompt) return;
        if (externalPrompt === lastHandledPromptRef.current) return;

        lastHandledPromptRef.current = externalPrompt;

        if (isLoadingRef.current) {
            // Queue it — complete()'s finally block will fire it
            pendingExternalPromptRef.current = externalPrompt;
            return;
        }

        currentPromptRef.current = externalPrompt;
        complete(externalPrompt);
    }, [externalPrompt]);

    // Save completed response as a branch (skip partial/stopped responses < 50 chars)
    useEffect(() => {
        if (!isLoading && completion && completion.trim().length >= 50 && currentPromptRef.current) {
            addBranch(currentPromptRef.current, completion);
        }
    }, [isLoading]);

    // Clear input after submission
    useEffect(() => {
        if (!isLoading) {
            setInputValue("");
        }
    }, [isLoading]);

    // ── Guest Gate ──────────────────────────────────────────────
    if (isGuest) {
        const features = [
            { icon: <MessageSquare className="h-5 w-5" />, title: "Smart Conversations", desc: "Ask anything about pronunciation, grammar, or vocabulary" },
            { icon: <Zap className="h-5 w-5" />, title: "Context-Aware", desc: "Get answers tailored to the word you're exploring" },
            { icon: <BookText className="h-5 w-5" />, title: "Examples & Usage", desc: "Real-world sentences and nuanced explanations" },
            { icon: <Repeat className="h-5 w-5" />, title: "Session History", desc: "Pick up where you left off across learning sessions" },
        ];

        return (
            <div className="w-full h-full flex flex-col">
                <div className="relative w-full h-full flex flex-col bg-card p-6 items-center justify-start pt-[15%] overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                        className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto"
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                            Unlock AI Assistant
                        </h2>
                        <p className="text-muted-foreground mt-3 text-sm md:text-base leading-relaxed max-w-sm">
                            Sign in to access your personal AI language coach — ask questions, get explanations, and level up your learning.
                        </p>

                        <div className="grid grid-cols-2 gap-3 mt-8 w-full">
                            {features.map((f, i) => (
                                <motion.div
                                    key={f.title}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + i * 0.08 }}
                                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-3 text-left"
                                >
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">{f.title}</p>
                                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.65 }}
                            className="flex flex-col items-center gap-3 mt-8"
                        >
                            <AuthDialog defaultTab="signup">
                                <Button size="lg" className="rounded-full gap-2 px-8 font-semibold cursor-pointer">
                                    Get Started Free
                                </Button>
                            </AuthDialog>

                            <AuthDialog defaultTab="login">
                                <Button variant="outline" size="lg" className="rounded-full px-8 font-semibold cursor-pointer">
                                    Sign In
                                </Button>
                            </AuthDialog>
                        </motion.div>

                        <p className="text-[11px] text-muted-foreground/60 mt-4">
                            Free account · No credit card required
                        </p>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col bg-card overflow-hidden">
            <div className="pointer-events-none absolute inset-0 dark:bg-[radial-gradient(20%_30%_at_85%_0%,--theme(--color-foreground/.1),transparent)]" />

            {/* Portal History button into mobile tab bar; show inline only on desktop */}
            {historyPortalEl
                ? createPortal(
                    <SessionSelector
                        sessions={sessions}
                        activeSessionId={activeSessionId}
                        onSelectSession={handleSessionSelect}
                        onDeleteSession={deleteSession}
                        onClearAll={clearHistory}
                        currentQuery={query}
                        isLoading={isLoading}
                        isHistoryLoading={isHistoryLoading}
                        className="px-1.5 py-1 text-[10px] gap-1"
                    />,
                    historyPortalEl
                )
                : null
            }

            <header className="relative w-full flex-shrink-0 px-4 pt-3 sm:px-6 sm:pt-5">
                {/* Desktop-only: History button above title (mobile uses portal to tab bar) */}
                {!historyPortalEl && (
                    <div className="flex justify-end mb-1">
                        <SessionSelector
                            sessions={sessions}
                            activeSessionId={activeSessionId}
                            onSelectSession={handleSessionSelect}
                            onDeleteSession={deleteSession}
                            onClearAll={clearHistory}
                            currentQuery={query}
                            isLoading={isLoading}
                            isHistoryLoading={isHistoryLoading}
                        />
                    </div>
                )}

                <h1 className="text-base sm:text-lg font-semibold text-foreground text-center leading-snug">
                    {query ? (
                        <>Learning about{" "}<span className="text-primary italic font-bold">"{query}"</span></>
                    ) : "What do you want to learn?"}
                </h1>
                <p className="text-muted-foreground/50 mt-1.5 sm:mt-2 max-w-lg mx-auto text-center text-[11px] sm:text-xs leading-relaxed">
                    {query
                        ? `Pronunciations, examples, and explanations for "${query}"`
                        : "Explore topics, get explanations, and improve your understanding."
                    }
                </p>

                <div className="flex items-center gap-2.5 mt-3 sm:mt-4">
                    <div className="h-px flex-1 bg-border/40" />
                </div>
            </header>

            <main className="w-full flex-1 flex flex-col mt-3 sm:mt-6 space-y-4 sm:space-y-6 min-h-0 px-4 sm:px-6">
                {/* Suggestions */}
                <AnimatePresence>
                    {!shouldHideSuggestions && (
                        <motion.div
                            initial={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden suggestions-container"
                        >
                            <div className="flex flex-wrap justify-center gap-2">
                                {smartSuggestions.map((suggestion, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                                    >
                                        <SuggestionChip
                                            icon={suggestion.icon}
                                            text={suggestion.title}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                            <div className="w-full px-8">
                                <div className="h-px bg-border/40 my-2" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Welcome message — isHistoryLoading guard prevents flash on session restore */}
                {!isLoading && !completion && !error && !currentBranch && !isHistoryLoading && query && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-full"
                    >
                        <div className="relative text-left">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="font-mono text-[9px] tracking-[0.25em] text-muted-foreground/30 uppercase shrink-0">Ready</span>
                                <div className="h-px flex-1 bg-border/30" />
                            </div>
                            <div className="text-sm text-foreground/70 leading-relaxed">
                                Ask me anything about <span className="font-semibold text-primary italic">"{query}"</span> — pronunciation, usage, nuances, or examples.
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Response Section */}
                <AnimatePresence>
                    {isLoading && !completion && !error ? (
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                        >
                            <AiAssistantSkeleton />
                        </motion.div>
                    ) : (completion || error || currentBranch) && (
                        <motion.div
                            key="completion"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="w-full flex-1 flex flex-col min-h-0"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="font-mono text-[9px] tracking-[0.25em] text-muted-foreground/30 uppercase shrink-0">Response</span>
                                <div className="h-px flex-1 bg-border/30" />
                            </div>
                            <div ref={responseContainerRef} className="relative text-left flex-1 flex flex-col min-h-0">
                                <div className="relative flex-1 flex flex-col min-h-0">
                                    {/* Top blur gradient — ref-based, safe with multiple instances */}
                                    {canScroll && (
                                        <div
                                            ref={topBlurRef}
                                            className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-card to-transparent pointer-events-none z-10 opacity-0 transition-opacity duration-300"
                                        />
                                    )}

                                    <div
                                        ref={scrollContentRef}
                                        className="flex-1 overflow-y-auto overflow-x-hidden text-card-foreground pl-1 pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                                        onScroll={(e) => {
                                            const el = e.currentTarget;
                                            if (topBlurRef.current) {
                                                topBlurRef.current.style.opacity = el.scrollTop > 10 ? '1' : '0';
                                            }
                                            if (bottomBlurRef.current) {
                                                const isBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
                                                bottomBlurRef.current.style.opacity = isBottom ? '0' : '1';
                                            }
                                        }}
                                    >
                                        {error ? (
                                            /* User-friendly error with retry */
                                            <div className="flex flex-col items-center gap-3 py-2">
                                                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                                                    {getFriendlyError(error)}
                                                </p>
                                                {currentPromptRef.current && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-2 rounded-full cursor-pointer"
                                                        onClick={() => complete(currentPromptRef.current)}
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                        Try again
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm md:text-base leading-relaxed">
                                                <Response>
                                                    {currentBranch && !isLoading
                                                        ? currentBranch.response
                                                        : completion
                                                    }
                                                </Response>
                                                {!isLoading && (
                                                    <div className="flex items-center gap-0.5 mt-3 pt-3 border-t border-border/30">
                                                        <TooltipProvider>
                                                            <Tooltip delayDuration={0}>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        ref={copyButtonRef}
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                                                        onClick={handleCopy}
                                                                        disabled={isCopied}
                                                                    >
                                                                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="bottom"><p>Copy</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-green-500 transition-colors cursor-pointer"
                                                            onClick={handleLike}
                                                        >
                                                            <ThumbsUp size={13} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                                                            onClick={handleDislike}
                                                        >
                                                            <ThumbsDown size={13} />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom blur gradient — ref-based */}
                                    {canScroll && (
                                        <div
                                            ref={bottomBlurRef}
                                            className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none z-10 opacity-100 transition-opacity duration-300"
                                        />
                                    )}
                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <footer className="relative w-full flex-shrink-0 mt-auto px-4 pb-4 sm:px-6 sm:pb-6 pt-4">
                {!isLoading && !error && totalBranches > 1 && (
                    <div className="mb-2">
                        <BranchTimeline
                            currentIndex={currentIndex}
                            branches={branches}
                            onSelectIndex={navigateToIndex}
                            onPrevious={goToPrevious}
                            onNext={goToNext}
                            isLoading={isLoading}
                        />
                    </div>
                )}

                <div className="absolute top-0 left-0 right-0 flex h-px">
                    <div className="w-1/2 bg-gradient-to-r from-transparent to-border"></div>
                    <div className="w-1/2 bg-gradient-to-l from-transparent to-border"></div>
                </div>

                {outOfSparks ? (
                    <div
                        className="relative w-full cursor-pointer"
                        onClick={() => {
                            toastManager.add({
                                title: "You're out of credits",
                                description: "Upgrade your plan for more.",
                                type: "warning",
                                actionProps: {
                                    children: "Upgrade",
                                    onClick: () => router.push("/pricing"),
                                },
                            });
                        }}
                    >
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                        <div className="w-full rounded-full pl-10 pr-24 py-6 bg-muted/50 border border-border text-sm text-muted-foreground/40 select-none">
                            Ask about pronunciation, definitions, examples...
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                            {!inputValue && !isLoading && (
                                <div className="pointer-events-none absolute left-10 right-24 top-1/2 -translate-y-1/2 flex items-center overflow-hidden">
                                    <TextType
                                        text={AI_PLACEHOLDERS}
                                        typingSpeed={60}
                                        pauseDuration={1800}
                                        showCursor={true}
                                        cursorCharacter="|"
                                        className="text-sm text-muted-foreground/50 font-normal whitespace-nowrap"
                                    />
                                </div>
                            )}
                            <Input
                                type="text"
                                maxLength={150}
                                placeholder=""
                                className="w-full rounded-full pl-10 pr-24 py-6 bg-transparent shadow-sm border border-primary/40 focus-visible:bg-background/60 transition-colors placeholder:text-transparent"
                                value={inputValue}
                                onChange={(e) => {
                                    const val = e.target.value.slice(0, 150);
                                    setInputValue(val);
                                }}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                            />

                            {/* Character counter — only shown when user is typing */}
                            {inputValue.length > 0 && (
                                <div className={cn(
                                    "absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-medium pointer-events-none transition-all duration-200",
                                    inputValue.length >= 150 ? "text-red-500 font-bold" : "text-muted-foreground/40"
                                )}>
                                    {inputValue.length}/150
                                </div>
                            )}

                            {/* Stop button during streaming, submit button otherwise */}
                            {isLoading ? (
                                <button
                                    onClick={handleStop}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-destructive hover:bg-destructive/80 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                                    title="Stop generating"
                                >
                                    <Square className="h-3 w-3 text-white fill-white" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleInputSubmit}
                                    disabled={!inputValue.trim()}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CornerDownLeft className="h-5 w-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
                                </button>
                            )}
                        </div>
                        <div className="text-center mt-3 px-4">
                            <p className="text-[10px] text-muted-foreground/50 font-medium tracking-wide">
                                AI can make mistakes. Double-check important info.
                            </p>
                        </div>
                    </>
                )}
            </footer>
        </div>
    );
}
