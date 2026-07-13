"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { gsap } from "gsap"
import { Search, Filter, ArrowRight, LayoutGrid, Tv, Newspaper, Clapperboard } from "lucide-react"
import { getCategoriesForLanguage } from "@/lib/categories"
import { useLanguageTool } from "@/hooks/useLanguageTool"

const PodcastIcon = ({ className }: { className?: string }) => (
    <svg className={className} role="img" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5.0056.0056c-.2362.0208-.4667.1034-.6462.2366C1.7274 2.2537.1728 4.9759.2924 8.289c.1197 3.1949 1.6743 6.2709 4.067 8.0458.2393.1183.4795.2366.7188.2366.3589 0 .7172-.1182.9564-.4732.4786-.5917.3594-1.3013-.2388-1.6563-1.9142-1.3016-3.1105-3.7863-3.1105-6.1529 0-2.4848 1.0767-4.6157 3.1105-6.154.5982-.355.5977-1.183.2388-1.6562-.2243-.3698-.6353-.508-1.029-.4732Zm13.7533 0c-.314.0295-.613.1774-.7924.4732-.3589.4733-.3593 1.3012.2389 1.6562 2.0338 1.5383 3.1105 3.6692 3.1105 6.154 0 2.3666-1.1964 4.8513-3.1105 6.153-.5982.355-.7174 1.0645-.2389 1.6562.2393.355.5987.4732.9576.4732.2393 0 .4784-.1183.7176-.2366 2.5124-1.775 4.067-4.851 4.067-8.0458.1077-3.3131-1.435-6.0353-4.067-8.0468-.2392-.1775-.5687-.2662-.8828-.2366ZM16.4944 3.558c-.3065.0118-.609.1395-.8303.3761-.4546.4733-.4183 1.2307.0602 1.6686 1.5314 1.408 1.6627 3.7978-.0122 5.3716-.4666.4615-.4904 1.2075-.0357 1.6808.4546.4733 1.2078.4965 1.6863.0469 2.7158-2.5559 2.4881-6.5196-.0122-8.827-.2393-.2248-.5495-.3288-.856-.317zm-8.9933.0067c-.305-.0118-.6167.0914-.856.3103-2.5004 2.3074-2.7269 6.2711-.0111 8.827.4785.4496 1.2317.4264 1.6863-.0469.4547-.4733.4306-1.2189-.048-1.6685-1.6749-1.5738-1.5316-3.9647-.0122-5.3728.4785-.4496.5148-1.194.0602-1.6674-.2153-.2426-.514-.3699-.8192-.3817Zm4.499 2.1496a2.5714 2.5714 0 0 0-2.5715 2.5714 2.5714 2.5714 0 0 0 1.193 2.1696L7.7144 24h2.5246l2.8772-13.4018a2.5714 2.5714 0 0 0 1.4553-2.3125A2.5714 2.5714 0 0 0 12 5.7143Z" />
    </svg>
)

const MoviesIcon = ({ className }: { className?: string }) => (
    <svg className={className} role="img" fill="currentColor" viewBox="0 0 24 24">
        <path d="m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z" />
    </svg>
)

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    All:      <LayoutGrid className="w-3.5 h-3.5" />,
    Movies:   <MoviesIcon className="w-3.5 h-3.5" />,
    Shows:    <Tv className="w-3.5 h-3.5" />,
    Podcasts: <PodcastIcon className="w-3.5 h-3.5" />,
    News:     <Newspaper className="w-3.5 h-3.5" />,
    Cartoons: <Clapperboard className="w-3.5 h-3.5" />,
}

interface NoResultsProps {
    query: string
    activeCategory?: string | null
    language?: string
}

export function NoResults({ query, activeCategory, language = "english" }: NoResultsProps) {
    const router = useRouter()
    const { suggestions } = useLanguageTool(query, language)
    const containerRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const subRef = useRef<HTMLParagraphElement>(null)
    const chipsRef = useRef<HTMLDivElement>(null)
    const allLinkRef = useRef<HTMLButtonElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    const hasCategory = !!activeCategory && activeCategory !== "All"
    const allCategories = getCategoriesForLanguage(language)
    const otherCategories = allCategories.filter(
        c => c.value !== "All" && c.value !== activeCategory
    )

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

            // Container fade in
            tl.fromTo(containerRef.current,
                { opacity: 0, y: 24 },
                { opacity: 1, y: 0, duration: 0.5 }
            )

            // Title
            tl.fromTo(titleRef.current,
                { opacity: 0, y: 14 },
                { opacity: 1, y: 0, duration: 0.4 },
                "-=0.2"
            )

            // Subtitle
            tl.fromTo(subRef.current,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.35 },
                "-=0.15"
            )

            // Chips stagger
            if (chipsRef.current) {
                tl.fromTo(chipsRef.current.children,
                    { opacity: 0, y: 12, scale: 0.9 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.07 },
                    "-=0.1"
                )
            }

            // "Search all" link
            if (allLinkRef.current) {
                tl.fromTo(allLinkRef.current,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.3 },
                    "-=0.1"
                )
            }

            // Suggestions "Did you mean?" stagger
            if (suggestionsRef.current) {
                tl.fromTo(suggestionsRef.current,
                    { opacity: 0, y: 10 },
                    { opacity: 1, y: 0, duration: 0.4 },
                    "-=0.1"
                )
                tl.fromTo(Array.from(suggestionsRef.current.querySelectorAll("button")),
                    { opacity: 0, x: -8 },
                    { opacity: 1, x: 0, duration: 0.3, stagger: 0.08 },
                    "-=0.2"
                )
            }

        })

        return () => ctx.revert()
    }, [query, activeCategory])

    const goCategory = (cat: string) => {
        const lang = language.toLowerCase()
        const params = cat === "All" ? "" : `?category=${encodeURIComponent(cat)}`
        router.push(`/search/${encodeURIComponent(query)}/${lang}${params}`)
    }

    const goSuggestion = (word: string) => {
        const lang = language.toLowerCase()
        const params = activeCategory && activeCategory !== "All"
            ? `?category=${encodeURIComponent(activeCategory)}`
            : ""
        router.push(`/search/${encodeURIComponent(word)}/${lang}${params}`)
    }

    return (
        <div
            ref={containerRef}
            className="flex items-center justify-center py-12 px-4 sm:px-6 min-h-[60vh] opacity-0"
        >
            <div className="w-full max-w-2xl">
                <div className="relative bg-card/50 border border-border/50 rounded-[2.5rem] shadow-sm overflow-hidden group hover:border-primary/20 transition-colors">

                    {/* Decorative background icon */}
                    <div className="absolute top-0 right-0 p-8 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity pointer-events-none">
                        {hasCategory
                            ? <Filter className="w-64 h-64 text-primary transform rotate-12 translate-x-12 -translate-y-12" />
                            : <Search className="w-64 h-64 text-primary transform rotate-12 translate-x-12 -translate-y-12" />
                        }
                    </div>

                    <div className="relative p-10 sm:p-16 text-center flex flex-col items-center gap-5">

                        {/* Title */}
                        <h2
                            ref={titleRef}
                            className="text-2xl sm:text-3xl font-black text-foreground tracking-tight"
                        >
                            {hasCategory
                                ? <>No clips in <span className="text-orange-500">{activeCategory}</span></>
                                : <>No clips for <span className="text-orange-500">"{query}"</span></>
                            }
                        </h2>

                        {/* Subtitle */}
                        <p
                            ref={subRef}
                            className="text-muted-foreground font-medium text-sm sm:text-base max-w-sm mx-auto leading-relaxed"
                        >
                            {hasCategory ? (
                                <>
                                    <span className="font-bold text-foreground">"{query}"</span> wasn't found in{" "}
                                    <span className="font-semibold">{activeCategory}</span>.
                                    {otherCategories.length > 0
                                        ? " Try one of the other categories below."
                                        : " Try searching across all categories."
                                    }
                                </>
                            ) : (
                                <>
                                    We couldn't find any clips matching this word.{" "}
                                    Check your spelling or try another word.
                                </>
                            )}
                        </p>

                        {/* Did you mean? — fuzzy suggestions from dataset */}
                        {suggestions.length > 0 && (
                            <div ref={suggestionsRef} className="flex flex-col items-center gap-3 mt-1">
                                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                    Did you mean?
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {suggestions.map(word => (
                                        <button
                                            key={word}
                                            onClick={() => goSuggestion(word)}
                                            className="relative text-base font-bold text-orange-500 hover:text-orange-400 cursor-pointer transition-colors duration-150 group/sug"
                                        >
                                            {word}
                                            <span className="absolute left-0 -bottom-0.5 h-[2px] w-0 bg-orange-400 group-hover/sug:w-full transition-all duration-300 ease-out rounded-full" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Category chips (only when a category was selected and others exist) */}
                        {hasCategory && otherCategories.length > 0 && (
                            <div ref={chipsRef} className="flex flex-wrap justify-center gap-2 mt-1">
                                {otherCategories.map(cat => (
                                    <button
                                        key={cat.value}
                                        onClick={() => goCategory(cat.value)}
                                        className="group/chip inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm"
                                    >
                                        <span className="text-muted-foreground/60 group-hover/chip:text-primary transition-colors">
                                            {CATEGORY_ICONS[cat.value] ?? <LayoutGrid className="w-3.5 h-3.5" />}
                                        </span>
                                        {cat.label}
                                        <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover/chip:opacity-100 group-hover/chip:ml-0 transition-all duration-200" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Search all categories link */}
                        {hasCategory && (
                            <button
                                ref={allLinkRef}
                                onClick={() => goCategory("All")}
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-primary transition-colors underline underline-offset-4 decoration-dotted mt-1"
                            >
                                <LayoutGrid className="w-3 h-3" />
                                Search all categories
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
