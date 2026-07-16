"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { DecorIcon } from "@/components/ui/decor-icon";
import { ThumbProgressCarousel } from "@/components/ui/thumb-progress-carousel";
import { CarouselCard } from "@/components/carousel-card";
import { BlueprintGrid, BlueprintBox } from "@/components/ui/blueprint-grid";
import { AudioLines, Sparkles, Mic } from "lucide-react";
import { ContextEngineCard } from "@/components/context-engine-card";
import { GooeyText } from "@/components/ui/gooey-text-morphing";
import { Card_9 } from "@/components/card-9";
import { HighlightText } from "@/components/ui/highlight-text";
import ArticlePreviewCard from "./shadcn-space/card/card-01";
import MagnifiedBento from "./magnified-bento";
import { LogoCloud } from "@/components/logo-cloud";
import { FaqBoxComponent } from "@/components/faq-box-component";
import { ContactUs } from "@/components/contact-us";
import { AsciiBackground } from "@/components/ui/ascii-background";
import { startTour } from "@/components/app-tour";
import { OnboardingDialog } from "@/components/onboarding-dialog";

const carouselItems = [
	{
		id: "1",
		image: "/moviesPosters.png",
		title: "Movies & Cinema",
		description: "Search how any word is spoken in film scenes — played back via YouTube's official embed API.",
		tags: ["Native Speech", "Real Context", "YouTube API"],
	},
	{
		id: "2",
		image: "/PodcastCollection.png",
		title: "Podcasts",
		description: "Find conversational phrases spoken naturally by real podcasters across public YouTube videos.",
		tags: ["Conversational", "All Levels", "Public Videos"],
	},
	{
		id: "3",
		image: "/Cartoon_Picture.jpg",
		title: "Animated Shows",
		description: "Discover clear, expressive pronunciation from animated YouTube content — searchable by word.",
		tags: ["Clear Speech", "Beginner Friendly", "YouTube Embed"],
	},
	{
		id: "4",
		image: "/News.jpg",
		title: "News & Journalism",
		description: "Search formal vocabulary as spoken in public news broadcasts available on YouTube.",
		tags: ["Formal Speech", "Current Events", "All Levels"],
	},
];

import { motion } from "motion/react";

export function DashboardSkeleton() {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [showTourHint, setShowTourHint] = useState(false);

	useEffect(() => {
		setMounted(true);
		if (!localStorage.getItem("vl_tour_done")) {
			setShowTourHint(true);
		}
	}, []);

	return (
		<>
			<OnboardingDialog />
			<div
				className={cn(
					"grid grid-cols-2 lg:grid-cols-4 gap-0",
					"*:min-h-48 *:w-full *:bg-transparent *:border-b *:border-r *:border-border/40 *:dark:bg-transparent border-t border-l border-border/40"
				)}
			>
				{/* --- Card 1: Top Hero Section (Split horizontally with NO gap) --- */}
				<div className="relative col-span-2 min-h-114! lg:col-span-4 grid grid-cols-1 lg:grid-cols-2 gap-0" >
					{/* The Outer Corners removed */}


					{/* --- Bleeding Grid Lines (Outer Edges) --- */}
					<div className="pointer-events-none absolute -top-[1px] -inset-x-[100px] h-[1px] bg-border/40" style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)", maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }} />
					<div className="pointer-events-none absolute -bottom-[1px] -inset-x-[100px] h-[1px] bg-border/40" style={{ WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)", maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }} />
					<div className="pointer-events-none absolute -left-[1px] -inset-y-[50px] w-[1px] bg-border/40" style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)", maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)" }} />
					<div className="pointer-events-none absolute -right-[1px] -inset-y-[50px] w-[1px] bg-border/40" style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)", maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)" }} />

					{/* Content Wrappers (So you can put stuff in left/right independently) */}
					<div className="relative z-10 w-full min-h-[512px] overflow-hidden flex flex-col items-center justify-center p-6 border-transparent border-r border-border/40 border-b-0">
						{/* Top-left glow overlay — sits above the opaque BlueprintGrid */}
						<div className="absolute inset-0 z-[5] pointer-events-none dark:bg-[radial-gradient(45%_50%_at_0%_0%,rgba(255,255,255,0.05),transparent)]" />

						{/* Background Blueprint Grid completely filling the left side */}
						<div className="absolute w-full h-full inset-0 z-0 pointer-events-none">
							{/* 10 columns on desktop, 64px boxes. */}
							<BlueprintGrid columns={10} cellSize="64px" className="border-none w-full h-full min-h-[500px]">
								{/* ====== ROW 1 ====== */}
								<BlueprintBox shaded>
								</BlueprintBox>
								<BlueprintBox>
								</BlueprintBox>
								<BlueprintBox shaded>
								</BlueprintBox>
								<BlueprintBox colSpan={4} shaded className="bg-muted/40">
								</BlueprintBox>
								<BlueprintBox>
								</BlueprintBox>
								<BlueprintBox shaded>
								</BlueprintBox>
								<BlueprintBox>
								</BlueprintBox>

								{/* ====== ROW 2, 3, 4 (Hero Title: spans 3 rows height) ====== */}
								<BlueprintBox rowSpan={3} shaded>
								</BlueprintBox>
								<BlueprintBox colSpan={7} rowSpan={3} dotted={false} className="px-8 border-b-primary/10">
									<div className="flex flex-col items-start justify-center h-full w-full relative">
										{mounted && (
											<div className="absolute -right-10 sm:-right-20 md:-right-42 top-1/2 -translate-y-1/2 w-52 sm:w-64 md:w-80 opacity-90 pointer-events-none z-2">
												<img
													src={resolvedTheme === 'dark' ? "/sleeping_cat.png" : "/cat_logo3.png"}
													alt="Mascot"
													className="w-full h-full object-contain"
												/>
											</div>
										)}

										<h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm leading-tight text-left">
											<div>Hear exactly how they</div>
											<div className="flex items-center gap-3 mt-1">
												<span>speak</span>
												<div className="relative min-w-[180px] sm:min-w-[240px] h-[1.1em] flex items-center">
													<GooeyText
														texts={["English", "Spanish", "French", "German"]}
														morphTime={2}
														cooldownTime={1}
														className="w-full h-full"
														textClassName="text-3xl sm:text-4xl md:text-5xl font-serif italic text-orange-500 opacity-90 leading-none"
													/>
												</div>
											</div>
										</h1>
									</div>
								</BlueprintBox>
								<BlueprintBox rowSpan={3}>
								</BlueprintBox>
								<BlueprintBox rowSpan={3} shaded>
								</BlueprintBox>

								{/* Expanded Text Blueprint Card (Replacing the icon box) */}
								<BlueprintBox colSpan={8} rowSpan={2} dotted={false} className="p-0 border-none !items-start !justify-start">
									<Card_9>
										<p className="text-muted-foreground font-medium leading-tight text-left text-xs sm:text-sm">
											Over <HighlightText variant="underline" color="primary" className="mx-1 font-bold italic">100,000+ real video clips</HighlightText> to master native pronunciation — find the exact moment any word is spoken in context.
										</p>
									</Card_9>
								</BlueprintBox>
								<BlueprintBox colSpan={2} rowSpan={2} shaded>
								</BlueprintBox>

								{/* ====== ROW 7 (Empty spacer + decorative) ====== */}
								<BlueprintBox colSpan={2} rowSpan={2} dotted={false} className="relative">
									<div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
										<p className="text-xs sm:text-sm font-medium text-foreground tracking-tight leading-relaxed">
											<span className="text-primary">+4 languages</span> in real contexts
										</p>
									</div>
								</BlueprintBox>

								{/* --- FIRECRAWL ANIMATED MARQUEE LANE (Spans Cols 3-10, Rows 7-8) --- */}
								<BlueprintBox colSpan={8} rowSpan={2} dotted={false} className="p-0 overflow-hidden relative border-l-0">
									<style>{`
									@keyframes blueprint-marquee {
										0% { transform: translateX(0%); }
										100% { transform: translateX(-50%); }
									}
									.animate-blueprint {
										animation: blueprint-marquee 35s linear infinite;
									}
								`}</style>

									{/* Infinite scrolling wide container */}
									<div className="flex w-max h-full animate-blueprint">
										{/* The Belt (Repeated twice to loop seamlessly) */}
										{[0, 1].map((copy) => (
											<div key={copy} className="flex h-full shrink-0">
												{[
													{ name: "ENGLISH", icon: "/countries/English.png" },
													{ name: "ESPAÑOL", icon: "/countries/spain.png" },
													{ name: "DEUTSCH", icon: "/countries/germany.png" },
													{ name: "FRANÇAIS", icon: "/countries/france.png" }
												].map((lang, idx) => (
													<div key={`${copy}-${idx}`} className="w-[192px] h-full border-r border-border/40 shrink-0 relative flex items-center justify-center">
														{/* Floating Language Tags */}
														<div className="z-10 bg-background/90 text-foreground text-[10px] sm:text-xs font-mono px-4 py-3 rounded-none shadow-sm opacity-95 backdrop-blur-md flex items-center gap-4 transition-all">
															<img src={lang.icon} alt={lang.name} className="w-12 h-auto max-h-8 object-contain" />
															<span className="font-bold tracking-widest text-foreground/80 text-[11px]">
																{lang.name}
															</span>
														</div>
													</div>
												))}
											</div>
										))}
									</div>
								</BlueprintBox>

							</BlueprintGrid>
						</div>
					</div>
					<div className="relative flex-1 z-10 w-full border-t lg:border-t-0 p-2 sm:p-2 flex flex-col">
						<CarouselCard>
							<ThumbProgressCarousel items={carouselItems} />
						</CarouselCard>
					</div>
				</div>




				{/* Left Flank (Hidden on Mobile) */}
				<div className="hidden lg:block col-span-1 relative min-h-[350px] lg:min-h-[400px] bg-background border-r border-border/40">
					{/* Mask out the parent container's left border for just this section */}
					<div className="absolute top-1/2 bottom-0 -left-[1px] w-[2px] bg-background z-20" />

					{/* ── Architectural box composition ── */}
					<div className="absolute inset-0 p-7 flex flex-col gap-3 pointer-events-none select-none z-10">

						{/* Row A — tall, main mass */}
						<div className="flex gap-3 flex-[5]">
							{/* Left sub-column: two stacked cells */}
							<div className="w-[42%] flex flex-col gap-3">
								<div className="flex-[3] border border-border/50 bg-muted/15" />
								<div className="flex-[2] border border-border/40" />
							</div>
							{/* Right: tall cell with inset room + corner ticks */}
							<div className="flex-1 border border-border/50 relative">
								<div className="absolute inset-5 border border-border/30 bg-muted/5" />
								<div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-border/50" />
								<div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-border/50" />
							</div>
						</div>

						{/* Row B — medium, cross-hair accent */}
						<div className="flex gap-3 flex-[3]">
							<div className="flex-[4] border border-border/40 relative">
								<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-px bg-border/35" />
								<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-px bg-border/35" />
							</div>
							<div className="flex-[3] border border-border/50 bg-muted/20" />
						</div>

						{/* Row C — short, three-cell footer */}
						<div className="flex gap-3 flex-[2]">
							<div className="flex-[2] border border-border/40" />
							<div className="flex-[3] border border-border/50 bg-muted/10" />
							<div className="flex-[2] border border-border/40" />
						</div>

					</div>
				</div>

				{/* Center Content Box */}
				<div className="col-span-2 lg:col-span-2 relative min-h-[350px] lg:min-h-[400px] flex flex-col items-center justify-center text-center px-4 py-12 bg-background">
					{/* ASCII animation background — radial bloom, fades at edges */}
					<div
						className="absolute inset-0 z-0 pointer-events-none"
						style={{
							WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%)",
							maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%)"
						}}
					>
						<AsciiBackground isDark={resolvedTheme === "dark"} />
					</div>
					<div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">

						<h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-foreground mb-4 leading-[1.3] py-2">
							Start <HighlightText variant="underline" color="primary" className="font-extrabold italic text-orange-500">speaking</HighlightText> today
						</h2>

						<p className="text-sm sm:text-base md:text-lg text-foreground/80 font-medium max-w-2xl mx-auto leading-relaxed mt-2">
							A language learning tool that searches public YouTube captions to find the exact moment any word is spoken, played back via YouTube's official embed API.
						</p>
						{showTourHint && (
							<button
								onClick={() => { setShowTourHint(false); startTour(); }}
								className="mt-5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors underline underline-offset-4 decoration-dotted"
							>
								How it works →
							</button>
						)}
					</div>
				</div>

				{/* Right Flank — search page skeleton */}
				<div className="hidden lg:block col-span-1 relative min-h-[350px] lg:min-h-[400px] bg-background" style={{ borderRightColor: "transparent" }}>
					<div className="absolute inset-0 p-4 flex gap-2 pointer-events-none select-none z-10">

						{/* ── Left: video player + audio card ── */}
						<div className="flex-[3] flex flex-col gap-2">

							{/* Video player — rounded */}
							<div className="w-full rounded-xl border border-border/50 bg-muted/10 relative shrink-0 overflow-hidden" style={{ aspectRatio: '16/9' }}>
								<div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-border/50" />
								<div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-border/50" />
							</div>

							{/* Audio card */}
							<div className="shrink-0 h-[108px] border border-border/50 flex flex-col overflow-hidden">

								{/* Header */}
								<div className="flex items-center justify-between px-2 py-1.5 border-b border-border/30 shrink-0">
									<div className="w-1/2 h-1 bg-muted/25" />
									<div className="w-6 h-1 bg-muted/15" />
								</div>

								{/* Controls: 5 circles */}
								<div className="flex items-center justify-center gap-1.5 py-1.5 border-b border-border/30 shrink-0">
									<div className="w-3 h-3 rounded-full border border-border/40" />
									<div className="w-3 h-3 rounded-full border border-border/40" />
									<div className="w-4 h-4 rounded-full border border-border/50 bg-muted/15" />
									<div className="w-3 h-3 rounded-full border border-border/40" />
									<div className="w-3 h-3 rounded-full border border-border/40" />
								</div>

								{/* Transcript */}
								<div className="flex-1 flex flex-col items-center justify-center gap-1 px-2">
									<div className="w-3/4 h-1 bg-muted/12" />
									<div className="w-full border-y border-border/30 py-1 flex flex-col gap-0.5 items-center">
										<div className="w-full h-1 bg-muted/30" />
										<div className="w-5/6 h-1 bg-muted/30" />
									</div>
									<div className="w-2/3 h-1 bg-muted/12" />
								</div>

							</div>
						</div>

						{/* ── Right: AI panel ── */}
						<div className="flex-[2] border border-border/50 flex flex-col overflow-hidden">

							{/* AI panel header */}
							<div className="px-2 py-2 border-b border-border/30 shrink-0 flex justify-center">
								<div className="w-2/3 h-1 bg-muted/20" />
							</div>

							{/* Response lines */}
							<div className="flex-1 flex flex-col gap-1.5 p-2 pt-3">
								<div className="w-4/5 h-1 bg-muted/15" />
								<div className="w-full h-1 bg-muted/15" />
								<div className="w-3/4 h-1 bg-muted/15" />
								<div className="w-full h-1 bg-muted/10" />
								<div className="w-5/6 h-1 bg-muted/10" />
								<div className="w-2/3 h-1 bg-muted/10" />
							</div>

							{/* Input bar */}
							<div className="px-2 py-2 border-t border-border/30 shrink-0">
								<div className="w-full h-4 rounded-full border border-border/40 bg-muted/5" />
							</div>

						</div>

					</div>
				</div>

				{/* --- Bottom Row: Unified Feature Section --- */}
				<div className="relative col-span-2 lg:col-span-4 min-h-80 flex flex-col overflow-hidden border-t border-border/40">
					{/* Unified continuous background grid for all 4 features to prevent grid line conflicts */}
					<div
						className="absolute inset-0 z-0 pointer-events-none"
						style={{ WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)", maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)" }}
					>
						{/* 20 columns perfectly tiling across the entire 100% width */}
						{/* 20 columns perfectly tiling across the entire 100% width with a gap and rounded corners */}
						<BlueprintGrid columns={20} cellSize="64px" className="border-none bg-transparent gap-1.5 p-1.5">
							{Array.from({ length: 120 }).map((_, i) => {
								// Varying "lego" colors: mix of whites and grays
								const legoColors = [
									"bg-muted/5",
									"bg-muted/20",
									"bg-muted/8",
									"bg-muted/12",
									"bg-muted/30",
									"bg-muted/15"
								];
								const colorClass = legoColors[(i * 7) % legoColors.length];

								return (
									<BlueprintBox
										key={i}
										dotted={false}
										className={cn("rounded-[2px] border-none", colorClass)}
										shaded={[2, 11, 7, 18, 3, 14, 9, 12, 22, 31, 27, 38, 23, 34, 29, 32].includes(i)}
									/>
								);
							})}
						</BlueprintGrid>
					</div>
					{/* Overlaying the feature columns on top of the continuous grid */}
					<div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 flex-1">
						{/* Feature 1: Context Engine */}
						<ContextEngineCard />

						{/* Feature 2: Article Preview Feature */}
						<div className="relative min-h-80 border-b lg:border-b-0 lg:border-r border-border/40 overflow-hidden">
							<ArticlePreviewCard />
						</div>

						{/* Feature 3 & 4: Magnified Bento Feature */}
						<div className="relative col-span-1 sm:col-span-2 min-h-80 flex flex-col items-center justify-center border-b lg:border-b-0 border-border/40 hover:bg-muted/5 transition-colors group overflow-hidden">
							<div
								className="w-full h-full flex items-center justify-center"
							>
								<MagnifiedBento />
							</div>
						</div>
					</div>
				</div>

				{/* --- FAQ Section --- */}
				<div className="col-span-2 lg:col-span-4 border-t border-border/40 bg-background">
					<FaqBoxComponent />
				</div>

				{/* --- Contact Us Section --- */}
				<div id="contact-us" className="col-span-2 lg:col-span-4 border-t border-border/40 bg-background">
					<ContactUs />
				</div>

			</div>
		</>
	);
}
