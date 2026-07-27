"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, ArrowRight, ChevronDown, Check, Clock, Lock, Tv, LayoutGrid, HelpCircle, Newspaper, Clapperboard, Mic, Film, Sparkles } from 'lucide-react';
import { getCategoriesForLanguage } from '@/lib/categories';
import { startTour } from '@/components/app-tour';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { useSearchStore } from '@/stores/use-search-store';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useAuthStore } from '@/stores/auth-store';
import { toastManager } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TextType from '@/components/TextType';
import { useDatamuse } from '@/hooks/useDatamuse';


const PodcastIcon = ({ className }: { className?: string }) => (
    <svg className={className} role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <title>Podcast Index</title>
        <path d="M5.0056.0056c-.2362.0208-.4667.1034-.6462.2366C1.7274 2.2537.1728 4.9759.2924 8.289c.1197 3.1949 1.6743 6.2709 4.067 8.0458.2393.1183.4795.2366.7188.2366.3589 0 .7172-.1182.9564-.4732.4786-.5917.3594-1.3013-.2388-1.6563-1.9142-1.3016-3.1105-3.7863-3.1105-6.1529 0-2.4848 1.0767-4.6157 3.1105-6.154.5982-.355.5977-1.183.2388-1.6562-.2243-.3698-.6353-.508-1.029-.4732Zm13.7533 0c-.314.0295-.613.1774-.7924.4732-.3589.4733-.3593 1.3012.2389 1.6562 2.0338 1.5383 3.1105 3.6692 3.1105 6.154 0 2.3666-1.1964 4.8513-3.1105 6.153-.5982.355-.7174 1.0645-.2389 1.6562.2393.355.5987.4732.9576.4732.2393 0 .4784-.1183.7176-.2366 2.5124-1.775 4.067-4.851 4.067-8.0458.1077-3.3131-1.435-6.0353-4.067-8.0468-.2392-.1775-.5687-.2662-.8828-.2366ZM16.4944 3.558c-.3065.0118-.609.1395-.8303.3761-.4546.4733-.4183 1.2307.0602 1.6686 1.5314 1.408 1.6627 3.7978-.0122 5.3716-.4666.4615-.4904 1.2075-.0357 1.6808.4546.4733 1.2078.4965 1.6863.0469 2.7158-2.5559 2.4881-6.5196-.0122-8.827-.2393-.2248-.5495-.3288-.856-.317zm-8.9933.0067c-.305-.0118-.6167.0914-.856.3103-2.5004 2.3074-2.7269 6.2711-.0111 8.827.4785.4496 1.2317.4264 1.6863-.0469.4547-.4733.4306-1.2189-.048-1.6685-1.6749-1.5738-1.5316-3.9647-.0122-5.3728.4785-.4496.5148-1.194.0602-1.6674-.2153-.2426-.514-.3699-.8192-.3817Zm4.499 2.1496a2.5714 2.5714 0 0 0-2.5715 2.5714 2.5714 2.5714 0 0 0 1.193 2.1696L7.7144 24h2.5246l2.8772-13.4018a2.5714 2.5714 0 0 0 1.4553-2.3125A2.5714 2.5714 0 0 0 12 5.7143Z" />
    </svg>
);

const MoviesIcon = ({ className }: { className?: string }) => (
    <svg className={className} role="img" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <title>Movies</title>
        <path d="m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z" />
    </svg>
);

type RenderableCategory = { value: string; label: string; renderIcon: (cls: string) => React.ReactNode }

const CATEGORY_ICONS: Record<string, (cls: string) => React.ReactNode> = {
    All:      (cls) => <LayoutGrid className={cls} />,
    Movies:   (cls) => <MoviesIcon className={cls} />,
    Shows:    (cls) => <Tv className={cls} />,
    Podcasts: (cls) => <PodcastIcon className={cls} />,
    News:     (cls) => <Newspaper className={cls} />,
    Cartoons: (cls) => <Clapperboard className={cls} />,
    Street:   (cls) => <Mic className={cls} />,
    Drama:    (cls) => <Film className={cls} />,
    Anime:    (cls) => <Sparkles className={cls} />,
};

function withIcons(cats: { value: string; label: string }[]): RenderableCategory[] {
    return cats.map(c => ({ ...c, renderIcon: CATEGORY_ICONS[c.value] ?? ((cls) => <LayoutGrid className={cls} />) }));
}

// Languages with flags
const LANGUAGES = [
    { value: 'English', label: 'English', flag: 'https://flagcdn.com/us.svg', available: true },
    { value: 'Germany', label: 'Deutsch', flag: 'https://flagcdn.com/de.svg', available: true },
    { value: 'French', label: 'Français', flag: 'https://flagcdn.com/fr.svg', available: true },
    { value: 'Spanish', label: 'Español', flag: 'https://flagcdn.com/es.svg', available: true },
    { value: 'Japanese', label: '日本語', flag: 'https://flagcdn.com/jp.svg', available: true },
    { value: 'Chinese', label: '中文', flag: 'https://flagcdn.com/cn.svg', available: false },
];

// Fix #14: Language-specific placeholder examples
const PLACEHOLDERS_BY_LANGUAGE: Record<string, string[]> = {
    English: [
        "hello, how are you today?",
        "she gave him a run for his money",
        "it's raining cats and dogs",
        "break a leg tonight!",
    ],
    French: [
        "bonjour, pouvez-vous m'aider?",
        "je voudrais une baguette s'il vous plaît",
        "il fait beau aujourd'hui",
    ],
    Germany: [
        "guten Tag, ich hätte gerne ein Stück Kuchen",
        "wie geht es Ihnen heute?",
        "das Wetter ist wunderbar",
    ],
    Spanish: [
        "hola, ¿cómo estás?",
        "¿dónde está la biblioteca?",
        "me gustaría practicar español",
    ],
    Japanese: [
        "こんにちは、お元気ですか？",
        "すみません、駅はどこですか？",
    ],
    Chinese: [
        "你好，我想学习如何做这道菜",
        "请问，地铁站在哪里？",
    ],
};

export function SearchBar() {
    const [query, setQuery] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [showRecent, setShowRecent] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const MAX_SEARCH_LENGTH = 60;

    const { suggestions, isLoading } = useDatamuse(query, selectedLanguage);
    const { hasAccess, remaining, limit, isUnlimited, isLoaded } = useEntitlements('search');
    const isAnonymous = useAuthStore((s) => s.status) !== 'authenticated';

    // Cooldowns to prevent toast spam
    const lastLimitToast = useRef(0);
    const lastCloseToast = useRef(0); // Fix #5

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Zustand Store
    const storeLanguage = useSearchStore(s => s.language);
    const storeCategory = useSearchStore(s => s.category);
    const { setLanguage: setStoreLanguage, setCategory: setStoreCategory } = useSearchStore();

    // Fix #7: Store is single source of truth for categories — derive local state from store
    // This eliminates the two-way sync loop (Effect A ↔ Effect B)
    const selectedCategories = useMemo(() => {
        if (!storeCategory) return ['All'];
        return storeCategory.split(',');
    }, [storeCategory]);

    const setSelectedCategories = useCallback((cats: string[]) => {
        setStoreCategory(cats.includes('All') || cats.length === 0 ? null : cats.join(','));
    }, [setStoreCategory]);

    // Sync local language state from store (e.g. when URL navigation changes language)
    useEffect(() => {
        if (storeLanguage && storeLanguage.toLowerCase() !== selectedLanguage.toLowerCase()) {
            const capitalized = storeLanguage.charAt(0).toUpperCase() + storeLanguage.slice(1);
            setSelectedLanguage(capitalized);
        }
    }, [storeLanguage, selectedLanguage]);

    // Reset searching state on path change
    useEffect(() => {
        setIsSearching(false);
    }, [pathname]);

    // Load recent searches from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('recent_searches');
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch { }
    }, []);

    // Reset activeIndex when query or suggestions change (stale highlight prevention)
    useEffect(() => {
        setActiveIndex(-1);
    }, [query, suggestions]);

    // Click outside to close suggestions panel
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowRecent(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fix #2: Build a unified navigable list for keyboard arrow navigation
    // Order: suggestions first (English only), then recent searches
    const navItems = useMemo(() => {
        const items: Array<{ type: 'suggestion' | 'recent'; value: string }> = [];
        if (query.length >= 2 && !isLoading) {
            suggestions.forEach(s => items.push({ type: 'suggestion', value: s.word }));
        }
        recentSearches.slice(0, 3).forEach(r => items.push({ type: 'recent', value: r }));
        return items;
    }, [suggestions, recentSearches, query.length, isLoading, selectedLanguage]);

    // Number of suggestion entries in navItems (for highlight offset calculation)
    const suggCountInNav = query.length >= 2 && !isLoading ? suggestions.length : 0;

    const toggleCategory = (cat: string) => {
        if (cat === 'All') {
            setSelectedCategories(['All']);
            return;
        }
        let newCats = selectedCategories.includes('All') ? [] : [...selectedCategories];
        if (newCats.includes(cat)) {
            newCats = newCats.filter(c => c !== cat);
        } else {
            newCats.push(cat);
        }
        if (newCats.length === 0) newCats = ['All'];
        setSelectedCategories(newCats);
    };

    const isCategorySelected = (cat: string) => selectedCategories.includes(cat);

    const getCategoryLabel = () => {
        if (selectedCategories.includes('All')) return 'All';
        if (selectedCategories.length === 1) return selectedCategories[0];
        return `${selectedCategories.length} Selected`;
    };

    const saveToRecent = (q: string) => {
        try {
            const trimmed = q.trim();
            if (!trimmed) return;
            const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem('recent_searches', JSON.stringify(updated));
        } catch { }
    };

    const removeRecent = (termToRemove: string) => {
        const updated = recentSearches.filter(s => s !== termToRemove);
        setRecentSearches(updated);
        try {
            localStorage.setItem('recent_searches', JSON.stringify(updated));
        } catch { }
    };

    const showLimitToast = useCallback(() => {
        const now = Date.now();
        if (now - lastLimitToast.current < 5000) return;
        lastLimitToast.current = now;

        if (isAnonymous) {
            toastManager.add({
                title: 'Search limit reached',
                description: 'Create a free account to continue searching',
                type: 'info',
            });
        } else {
            toastManager.add({
                title: `Monthly search limit reached (${limit}/month)`,
                description: 'Resets on the 1st of each month — upgrade for more',
                type: 'warning',
            });
        }
    }, [isAnonymous, limit]);

    // Show toast when limit flips to blocked
    useEffect(() => {
        if (isLoaded && !hasAccess && !isUnlimited) {
            showLimitToast();
        }
    }, [isLoaded, hasAccess, isUnlimited, showLimitToast]);

    const handleSearch = useCallback((searchQuery?: string) => {
        const raw = searchQuery || query;
        // Strip Manticore full-text operators to prevent query injection
        const q = raw.replace(/[!"()|~*?^@\\-]/g, "").trim();
        if (!q) return;

        // Fix #4: Guard against access bypass via keyboard Enter
        if (!hasAccess) {
            showLimitToast();
            return;
        }

        // Fix #5: "Getting close" warning with cooldown to prevent spam
        if (!isUnlimited && remaining <= 3 && remaining > 0) {
            const now = Date.now();
            if (now - lastCloseToast.current >= 5000) {
                lastCloseToast.current = now;
                toastManager.add({
                    title: `${remaining} search${remaining === 1 ? '' : 'es'} remaining today`,
                    description: isAnonymous ? 'Sign up for more' : 'Upgrade for unlimited',
                    type: 'info',
                });
            }
        }

        const lang = selectedLanguage.toLowerCase();
        const params = new URLSearchParams();
        const cats = selectedCategories.includes('All') ? null : selectedCategories.join(',');
        if (cats) params.set('category', cats);

        const targetPath = `/search/${encodeURIComponent(q.trim())}/${lang}`;
        const targetUrl = params.toString() ? `${targetPath}?${params.toString()}` : targetPath;

        // Fix #9: Always run full flow — no silent early return for same-path searches
        saveToRecent(q);
        setShowRecent(false);
        setIsSearching(true);
        router.push(targetUrl);

        // Fix #6: Safety reset in case router.push doesn't trigger a pathname change
        setTimeout(() => setIsSearching(false), 8000);
    }, [query, hasAccess, isUnlimited, remaining, isAnonymous, selectedLanguage, selectedCategories, router, showLimitToast]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            // Fix #2: Navigate unified navItems list
            if (navItems.length > 0 && showRecent) {
                setActiveIndex(prev => (prev < navItems.length - 1 ? prev + 1 : 0));
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (navItems.length > 0 && showRecent) {
                setActiveIndex(prev => (prev > 0 ? prev - 1 : navItems.length - 1));
            }
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && navItems[activeIndex]) {
                e.preventDefault();
                const selected = navItems[activeIndex].value;
                setQuery(selected);
                handleSearch(selected);
                setActiveIndex(-1);
            } else {
                handleSearch();
            }
        } else if (e.key === 'Escape') {
            setActiveIndex(-1);
            setShowRecent(false);
            // Fix #13: Also blur input on Escape
            inputRef.current?.blur();
        }
    };

    // Whether the suggestions panel has content to show
    const hasSuggestions = query.length >= 2 && (suggestions.length > 0 || isLoading);
    const panelVisible = showRecent && !isSearching && (recentSearches.length > 0 || hasSuggestions);

    return (
        <div id="tour-search" className="w-full max-w-4xl flex items-center gap-2 md:gap-4 relative z-50" ref={containerRef}>
            <div className="flex-1">
                <div className={cn(
                    "search-animated-border group relative transition-all duration-300",
                    panelVisible ? "rounded-t-xl" : "rounded-xl hover:-translate-y-0.5"
                )}>
                    {/* Inner Content */}
                    <div className="relative z-10 flex flex-row items-center p-1 sm:p-1 w-full h-full">

                        {/* Category Popover */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="tour-category"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 sm:h-9 px-2 sm:px-3 rounded-lg gap-1 sm:gap-1.5 text-muted-foreground hover:bg-muted/50 data-[state=open]:bg-muted/70 data-[state=open]:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer transition-all duration-200"
                                    )}
                                >
                                    <svg
                                        className="w-3.5 h-3.5 shrink-0"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line x1="4" y1="6" x2="20" y2="6" />
                                        <line x1="4" y1="18" x2="12" y2="18" />
                                    </svg>
                                    <span className="hidden md:inline text-xs font-semibold">{getCategoryLabel()}</span>
                                    <ChevronDown className="w-3 h-3 opacity-40" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[170px] sm:w-[210px] p-1.5 sm:p-2 rounded-xl shadow-lg" sideOffset={8}>
                                <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 pt-1 pb-1.5 sm:pb-2">
                                    Search in
                                </p>
                                <div className="flex flex-col gap-0.5">
                                    {withIcons(getCategoriesForLanguage(selectedLanguage)).map((cat) => {
                                        const selected = isCategorySelected(cat.value);
                                        return (
                                            <button
                                                key={cat.value}
                                                onClick={() => toggleCategory(cat.value)}
                                                className={cn(
                                                    "group flex items-center gap-2 sm:gap-2.5 w-full px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-all duration-150 cursor-pointer border",
                                                    selected
                                                        ? "bg-muted text-foreground border-border hover:bg-muted/70"
                                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-transparent"
                                                )}
                                            >
                                                <span className={cn(
                                                    "transition-colors duration-150",
                                                    selected ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"
                                                )}>
                                                    {cat.renderIcon("w-3.5 h-3.5")}
                                                </span>
                                                <span className="flex-1 text-left font-medium">{cat.label}</span>
                                                <Check className={cn(
                                                    "w-3.5 h-3.5 text-primary transition-all duration-150",
                                                    selected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                                                )} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Divider */}
                        <div className="w-px h-6 bg-border mx-2 hidden sm:block" />

                        {/* Input Area */}
                        <div
                            className="flex-1 relative flex items-center min-w-0"
                            onClick={() => {
                                if (!hasAccess && isLoaded) {
                                    showLimitToast();
                                }
                            }}
                        >
                            {/* Fix #14: Language-specific animated placeholder */}
                            {!query && (
                                <div className="pointer-events-none absolute left-3 right-12 flex items-center top-1/2 -translate-y-1/2 overflow-hidden">
                                    <TextType
                                        text={PLACEHOLDERS_BY_LANGUAGE[selectedLanguage] ?? PLACEHOLDERS_BY_LANGUAGE.English}
                                        typingSpeed={75}
                                        pauseDuration={1500}
                                        showCursor={true}
                                        cursorCharacter="|"
                                        className="text-[11px] sm:text-sm text-muted-foreground/50 font-normal"
                                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
                                    />
                                </div>
                            )}

                            <Input
                                ref={inputRef}
                                type="text"
                                maxLength={MAX_SEARCH_LENGTH}
                                value={hasAccess ? query : ''}
                                disabled={!hasAccess}
                                onChange={(e) => {
                                    const val = e.target.value.slice(0, MAX_SEARCH_LENGTH);
                                    setQuery(val);
                                    setShowRecent(true);
                                }}
                                onFocus={() => {
                                    // Fix #11: Don't open suggestions panel when user has no access
                                    if (hasAccess) setShowRecent(true);
                                }}
                                onKeyDown={handleKeyDown}
                                className={cn(
                                    "border-0 bg-transparent dark:bg-transparent shadow-none focus-visible:ring-0 pl-2 sm:pl-3 pr-20 h-8 sm:h-9 text-sm sm:text-base font-medium placeholder:text-transparent min-w-0",
                                    !hasAccess && "placeholder:text-muted-foreground/60 cursor-not-allowed opacity-60"
                                )}
                            />

                            {/* Fix #1: Character counter only visible when user is typing */}
                            {query.length > 0 && hasAccess && (
                                <div className={cn(
                                    "absolute text-[10px] font-medium pointer-events-none transition-all duration-200",
                                    query.length >= MAX_SEARCH_LENGTH ? "text-red-500 font-bold" : "text-muted-foreground/40",
                                    "right-11"
                                )}>
                                    {query.length}/{MAX_SEARCH_LENGTH}
                                </div>
                            )}

                            {query && hasAccess && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setQuery('');
                                        inputRef.current?.focus();
                                    }}
                                    className="h-7 w-7 rounded-full absolute right-2 text-muted-foreground hover:bg-muted"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>

                        {/* Language Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    id="tour-language"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 sm:h-9 px-1.5 sm:px-3 rounded-lg gap-1 sm:gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-muted-foreground hover:bg-muted/50 data-[state=open]:bg-muted data-[state=open]:text-foreground mr-1 focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer"
                                    )}
                                >
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden shadow-sm border border-border flex-shrink-0">
                                        <img
                                            src={LANGUAGES.find(l => l.value === selectedLanguage)?.flag || LANGUAGES[0].flag}
                                            alt={selectedLanguage}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="hidden md:inline">{selectedLanguage}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[150px] sm:w-[180px] p-1.5 sm:p-2 rounded-xl" sideOffset={8}>
                                <DropdownMenuLabel className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                                    Language
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {LANGUAGES.map((lang) => (
                                    <DropdownMenuItem
                                        key={lang.value}
                                        disabled={!lang.available}
                                        onClick={() => {
                                            if (!lang.available) return;
                                            setSelectedLanguage(lang.value);
                                            setStoreLanguage(lang.value.toLowerCase());
                                            // Fix #8: Reset categories when switching language
                                            // (English and non-English have different category sets)
                                            setSelectedCategories(['All']);
                                        }}
                                        className={cn(
                                            "rounded-lg py-1.5 sm:py-2.5 flex items-center justify-between",
                                            lang.available ? "cursor-pointer" : "cursor-not-allowed opacity-50 text-muted-foreground",
                                            selectedLanguage === lang.value && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className={cn("w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden shadow-sm border border-border/50", !lang.available && "grayscale")}>
                                                <img src={lang.flag} alt={lang.value} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-xs sm:text-sm font-medium">{lang.label}</span>
                                        </div>
                                        {selectedLanguage === lang.value && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Search Action Button */}
                        <Button
                            size="icon"
                            onClick={() => { if (hasAccess) handleSearch(); }}
                            disabled={(!query.trim() && hasAccess) || isSearching || !isLoaded || (!hasAccess && isLoaded)}
                            className={cn(
                                "h-8 w-8 sm:h-9 sm:w-9 rounded-lg shadow-lg transition-all duration-300 shrink-0 ml-0.5",
                                !hasAccess
                                    ? "bg-muted text-muted-foreground shadow-none cursor-not-allowed"
                                    : query.trim()
                                        ? 'bg-primary text-primary-foreground hover:scale-105 hover:bg-primary/90'
                                        : 'bg-muted text-muted-foreground shadow-none'
                            )}
                        >
                            {isSearching ? (
                                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                            ) : !hasAccess && isLoaded ? (
                                <Lock className="w-4 h-4" />
                            ) : (
                                <ArrowRight className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <TooltipProvider delayDuration={700}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={startTour}
                            className="hidden sm:flex h-9 w-9 rounded-full border border-border shadow-sm bg-card items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                            <HelpCircle className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="px-2 py-1" side="bottom">
                        How it works
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Unified Suggestions & Recents Panel */}
            {panelVisible && (
                <Card className="absolute top-full left-0 right-0 mt-0 rounded-t-none rounded-b-2xl shadow-xl border-t-0 animate-in fade-in-0 zoom-in-95 z-50 bg-background/95 backdrop-blur-md overflow-hidden">
                    <CardContent className="p-0">
                        {/* 1. Autocomplete Suggestions */}
                        {query.length >= 2 && (
                            <div className="p-1">
                                {isLoading ? (
                                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span>Searching...</span>
                                    </div>
                                ) : suggestions.length > 0 ? (
                                    suggestions.map((suggestion, idx) => (
                                        <Button
                                            key={suggestion.word}
                                            variant="ghost"
                                            onClick={() => {
                                                setQuery(suggestion.word);
                                                handleSearch(suggestion.word);
                                                setActiveIndex(-1);
                                            }}
                                            className={cn(
                                                "w-full justify-start h-auto py-2.5 px-4 font-normal text-foreground/80 hover:text-primary hover:bg-muted/50 transition-colors",
                                                // Fix #2: Highlight by unified navItems index
                                                activeIndex === idx && "bg-muted text-primary"
                                            )}
                                        >
                                            <Search className="w-4 h-4 mr-3 opacity-40" />
                                            <span className="flex-1 text-left">
                                                {suggestion.word}
                                            </span>
                                        </Button>
                                    ))
                                ) : null}
                            </div>
                        )}

                        {/* Separator if both sections have content */}
                        {query.length >= 2 && suggestions.length > 0 && recentSearches.length > 0 && (
                            <div className="h-px bg-border/50 mx-2 my-1" />
                        )}

                        {/* 2. Recent Searches */}
                        {recentSearches.length > 0 && (
                            <div className="p-1">
                                <div className="text-[10px] font-bold text-muted-foreground px-4 py-2 uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Recent
                                </div>
                                {/* Fix #3: key by search string, not array index */}
                                {recentSearches.slice(0, 3).map((search, ridx) => (
                                    <div
                                        key={search}
                                        className="relative group block w-full"
                                    >
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setQuery(search);
                                                handleSearch(search);
                                                setActiveIndex(-1);
                                            }}
                                            className={cn(
                                                "w-full justify-start h-auto py-2 px-4 font-normal text-muted-foreground hover:text-primary pr-8",
                                                // Fix #2: Highlight recents using offset from suggestions
                                                activeIndex === suggCountInNav + ridx && "bg-muted text-primary"
                                            )}
                                        >
                                            <ArrowRight className="w-4 h-4 mr-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                                            <span className="flex-1 text-left">{search}</span>
                                        </Button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeRecent(search);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Remove from history"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
