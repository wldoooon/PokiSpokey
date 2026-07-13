"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Globe, PlayCircle, Film, Tv, Mic, MonitorPlay, ArrowRight, Users, Newspaper, Video, Activity, MessageSquare, Layers, Database, TrendingUp, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/animate-ui/components/radix/tooltip";
import { useTheme } from "next-themes";
import { Features } from "./Features";
import AnimatedContent from "./AnimatedContent";
import { useSearchStore } from "@/stores/use-search-store";
import { Carter_One } from 'next/font/google';
import { cn } from '@/lib/utils';

const carterOne = Carter_One({ weight: '400', subsets: ['latin'] });

const categories = [
  {
    id: 'movies',
    label: 'Movies',
    count: '142k',
    description: 'Real language from Hollywood blockbusters',
    tags: ['Hollywood Hits', 'Award Winners'],
    icon: Film,
    image: '/Kentucky Theater Summer Classics.png',
  },
  {
    id: 'cartoons',
    label: 'Cartoons',
    count: '85k',
    description: 'Fun and expressive animated learning',
    tags: ['Animated Series', 'Voice Acting'],
    icon: Tv,
    image: '/we bare bears.png',
  },
  {
    id: 'interviews',
    label: 'Interviews',
    count: '98k',
    description: 'Authentic conversations with native speakers',
    tags: ['Real Talk', 'Native Speakers'],
    icon: Users,
    image: '/PodcastCollection.png',
  },
  {
    id: 'talks',
    label: 'Talks',
    count: '120k',
    description: 'Learn from the world\'s best speakers',
    tags: ['Expert Speakers', 'TED Style'],
    icon: MonitorPlay,
    image: '/These Abstract Paper Profiles Have Something to Say about the World.png',
  },
  {
    id: 'talks2',
    label: 'Podcasts',
    count: '120k',
    description: 'Casual speech from popular podcast hosts',
    tags: ['Casual Speech', 'Long Form'],
    icon: MonitorPlay,
    image: '/talk.png',
  },
  {
    id: 'moves2',
    label: 'TV Shows',
    count: '65k',
    description: 'Everyday dialogue from hit TV series',
    tags: ['Drama', 'Comedy'],
    icon: Video,
    image: '/moviesPosters.png',
  },
];

export function Hero() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const language = useSearchStore((s) => s.language);
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState(2);
  const [isPaused, setIsPaused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const trendingHighlights = [
    {
      word: "actually",
      definition: "Used to emphasize a fact or to introduce something surprising.",
      context: "I actually enjoyed the meeting — it was way more useful than I expected.",
      frequency: "Common Word",
      usage: "97%"
    },
    {
      word: "no worries",
      definition: "A casual way of saying 'don't worry about it' or 'you're welcome'.",
      context: "Thanks for waiting no worries at all, take your time.",
      usage: "93%"
    },
    {
      word: "kind of",
      definition: "Used to soften a statement or indicate something is approximate.",
      context: "It's kind of hard to explain, but I'll try my best.",
      usage: "96%"
    },
    {
      word: "hang on",
      definition: "To wait, or to hold tightly to something.",
      context: "Hang on a second I think I left my phone on the table.",
      usage: "91%"
    },
    {
      word: "anyway",
      definition: "Used to return to a previous topic or dismiss something.",
      context: "It was a long detour, but anyway, we finally made it to the café.",
      usage: "95%"
    },
    {
      word: "go ahead",
      definition: "To proceed or to give someone permission to do something.",
      context: "If you're ready to present, go ahead — everyone's listening.",
      usage: "92%"
    },
  ];

  const currentHighlight = trendingHighlights[highlightIdx];

  const handleSearch = (query: string) => {
    router.push(`/search/${encodeURIComponent(query)}/${encodeURIComponent(language)}`);
  };

  const exampleChips = [
    "no way", "come on", "hold on", "let's go", "hang on",
    "well done", "what's up", "good luck", "go ahead", "of course",
  ];

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveCategory((prev) => (prev + 1) % categories.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setHighlightIdx((prev) => (prev + 1) % trendingHighlights.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused, trendingHighlights.length]);

  // Helper to get distance from active index handling wrap-around
  const getOffset = (index: number) => {
    const length = categories.length;
    let diff = (index - activeCategory) % length;
    if (diff > length / 2) diff -= length;
    if (diff < -length / 2) diff += length;
    return diff;
  };

  // Optimized: pure 2D transforms (translateX + scale only).
  // No perspective / rotateY / translateZ — eliminates GPU layer explosion on low-spec devices.
  // willChange is applied only to the active card, not all visible cards.
  const cardStyles = useMemo(() => {
    return categories.map((_, index) => {
      const offset = getOffset(index);
      const absOffset = Math.abs(offset);
      const isActive = offset === 0;
      const translateX = offset * 110; // px per offset unit (matches old clamp max)
      const opacity = isActive ? 1 : Math.max(0.15, 1 - absOffset * 0.28);
      const zIndex = 10 - absOffset;
      const scale = isActive ? 1 : Math.max(0.75, 0.92 - absOffset * 0.06);
      const hidden = absOffset >= 3;
      return { offset, absOffset, isActive, translateX, opacity, zIndex, scale, hidden };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  return (
    <div className="relative w-full">


      <div className="max-w-[1300px] mx-auto pt-8 pb-20 px-6 lg:px-12 relative z-10">
        {/* Split Hero Section */}
        <div className="grid xl:grid-cols-2 gap-20 xl:gap-12 items-center mb-20 xl:mb-24 min-h-[600px]">

          {/* Left Column: Context Content & Insights */}
          <div className="flex flex-col justify-center relative z-20">



            <AnimatedContent distance={40} direction="vertical" duration={1} delay={0.1}>
              <h1 className={cn("text-[clamp(3.5rem,8vw,4.5rem)] lg:text-7xl font-black text-foreground tracking-tighter leading-[0.85] mb-6 relative inline-block w-fit", carterOne.className)}>
                {/* Mascot Behind Text - Anchored together using 'em' scaling */}
                <span
                  className="absolute -z-10 opacity-80 pointer-events-none transition-transform duration-1000 group-hover:scale-105 inline-block"
                  style={{
                    width: '6em',
                    height: '6em',
                    top: '-1.8em',
                    right: '-4em'
                  }}
                >
                  <img
                    src={mounted && resolvedTheme === 'dark' ? "/sleeping_cat.png" : "/cat_logo3.png"}
                    alt="Mascot"
                    className="w-full h-full object-contain"
                  />
                </span>

                Speak <br />
                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Moment.</span>
              </h1>
            </AnimatedContent>

            <AnimatedContent distance={30} direction="vertical" duration={0.8} delay={0.25}>
              <p className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed font-medium">
                Learning from a dictionary is hard because it doesn't show you how people actually talk in the real world. We make it easy by showing you more than <span className="text-foreground font-bold underline decoration-primary/30 underline-offset-4">14.2 million real video clips</span> from movies, TV shows, and interviews.
              </p>
            </AnimatedContent>

            <AnimatedContent distance={50} direction="horizontal" reverse={true} duration={1} delay={0.4}>
              {/* Live Context Spotlight Widget */}
              <div className="w-full max-w-md bg-background/60 backdrop-blur-md border border-border rounded-3xl shadow-xl overflow-hidden mb-10 p-1 group/widget transition-all duration-500 hover:shadow-primary/10">
                <div className="bg-card rounded-[1.4rem] overflow-hidden border border-border/50 shadow-sm transition-all duration-500">


                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="max-w-[70%]">
                        <h2 className="text-3xl font-black text-foreground tracking-tighter mb-1 animate-in fade-in duration-500" key={currentHighlight.word}>
                          {currentHighlight.word}
                        </h2>
                        <p className="text-xs font-medium text-muted-foreground leading-snug line-clamp-2">
                          {currentHighlight.definition}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-mono font-black text-primary">{currentHighlight.frequency}</div>
                      </div>
                    </div>

                    <div className="relative bg-muted/30 rounded-2xl p-4 border border-border/50 group-hover/widget:border-primary/20 transition-colors">
                      <Quote className="absolute -top-2 -left-1 w-6 h-6 text-muted-foreground opacity-20" />
                      <p className="text-foreground font-bold italic text-base leading-relaxed relative z-10 px-1">
                        "{currentHighlight.context}"
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                        <button
                          onClick={() => handleSearch(currentHighlight.word)}
                          className="bg-foreground text-background hover:bg-primary hover:text-primary-foreground px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 group/btn cursor-pointer"
                        >
                          View
                          <ArrowRight className="w-2.5 h-2.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-muted/20 border-t border-border/30 flex items-center justify-between">
                    <div className="flex gap-1">
                      {trendingHighlights.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === highlightIdx ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedContent>

            <AnimatedContent distance={20} direction="vertical" duration={0.8} delay={0.6}>
              {/* Library Scale Metrics Strip */}
              <div className="mt-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Library Scale</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                <div className="grid grid-cols-3 divide-x divide-border/50 border border-border/50 rounded-2xl overflow-hidden">
                  {[
                    { value: '3+', label: 'Languages', icon: Globe, sub: 'Native dialects', live: false },
                    { value: '6+', label: 'Categories', icon: Layers, sub: 'Content types', live: false },
                    { value: '14.2M', label: 'Indexed Clips', icon: Database, sub: 'Video frames', live: true },
                  ].map(({ value, label, icon: Icon, sub, live }) => (
                    <div key={label} className="relative flex flex-col items-center py-5 px-3 group cursor-default hover:bg-muted/30 transition-colors overflow-hidden">
                      {/* top accent bar slides in on hover */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />

                      <Icon className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors mb-2" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tighter group-hover:text-primary transition-colors">{value}</span>
                        {live && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                      </div>
                      <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-wide mt-0.5">{label}</span>
                      <span className="text-[9px] text-muted-foreground/60 mt-0.5">{sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedContent>

            {/* Removed: Start Exploring & Trusted By */}
          </div>

          {/* Right Column: Optimized 2D Carousel */}
          <AnimatedContent distance={0} duration={1.5} delay={0.6} className="w-full">
            <div className="flex flex-col items-center gap-5 mt-8 xl:mt-0">
              {/* Cards */}
              <div
                className="relative h-[380px] sm:h-[460px] xl:h-[540px] w-full flex items-center justify-center"
                style={{ contain: 'layout style paint' }}
              >
                {/* Left fog */}
                <div className="absolute top-0 left-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent pointer-events-none z-20" />
                {/* Right fog */}
                <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-20" />
                {categories.map((cat, index) => {
                  const { isActive, translateX, opacity, zIndex, scale, hidden } = cardStyles[index];

                  if (hidden) return null;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setActiveCategory(index)}
                      className="absolute w-[min(280px,75vw)] sm:w-[min(340px,80vw)] xl:w-[400px] h-[380px] sm:h-[460px] xl:h-[540px] transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer"
                      style={{
                        transform: `translateX(${translateX}px) scale(${scale})`,
                        opacity,
                        zIndex,
                        willChange: isActive ? 'transform' : 'auto',
                      }}
                    >
                      <div
                        className={`relative w-full h-full rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border shadow-2xl bg-card transition-colors duration-500 ${isActive ? 'border-primary/50' : 'border-border/50'}`}
                      >
                        {/* Auto-progress bar on active card */}
                        {isActive && (
                          <div className="absolute top-0 left-0 right-0 h-[3px] z-20 bg-border/30">
                            <div
                              key={activeCategory}
                              className="h-full bg-primary rounded-full"
                              style={{ animation: isPaused ? 'none' : 'progress-fill 5s linear forwards' }}
                            />
                          </div>
                        )}

                        {/* Image Background */}
                        <div className="absolute inset-0">
                          <Image
                            src={cat.image}
                            alt={cat.label}
                            fill
                            placeholder="blur"
                            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 400px"
                            priority={isActive}
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
                        </div>

                        {/* Bottom Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                          {/* Checkmark tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {cat.tags.map((tag) => (
                              <span key={tag} className="flex items-center gap-1 text-[11px] font-semibold text-white bg-white/15 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-full">
                                <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <h3 className={cn("text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mb-1.5", carterOne.className)}>{cat.label}</h3>
                          <p className="text-sm text-white/70 font-medium leading-snug">{cat.description}</p>
                        </div>

                        {/* Active border glow */}
                        {isActive && (
                          <div className="absolute inset-0 border-2 border-primary/20 rounded-[1.5rem] sm:rounded-[2rem] pointer-events-none" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Labeled progress bar navigation */}
              <div className="flex items-end gap-3 w-full px-1 relative z-10">
                {categories.map((cat, i) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(i)}
                    className="flex flex-col gap-1.5 flex-1 text-left group min-w-0"
                  >
                    <div className="h-[2px] w-full bg-border/60 rounded-full overflow-hidden">
                      {i === activeCategory ? (
                        <div
                          key={activeCategory}
                          className="h-full bg-foreground rounded-full"
                          style={{ animation: isPaused ? 'none' : 'progress-fill 5s linear forwards' }}
                        />
                      ) : i < activeCategory ? (
                        <div className="h-full bg-foreground/40 rounded-full w-full" />
                      ) : null}
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-[11px] truncate transition-colors duration-200",
                      i === activeCategory
                        ? `font-bold text-foreground ${carterOne.className}`
                        : "font-medium text-muted-foreground group-hover:text-foreground/70"
                    )}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </AnimatedContent>
        </div>

        {/* Feature Grid */}
        <Features />
      </div>
    </div>
  );
}
