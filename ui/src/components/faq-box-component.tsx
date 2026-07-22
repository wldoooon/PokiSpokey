"use client";
import { cn } from "@/lib/utils";
import { HighlightText } from "@/components/ui/highlight-text";
import { motion } from "motion/react";

import React from "react";
import { FullWidthDivider } from "@/components/ui/full-width-divider";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { SearchIcon, SearchSlashIcon } from "lucide-react";

export function FaqBoxComponent() {
	const [searchTerm, setSearchTerm] = React.useState("");
	const [activeCategory, setActiveCategory] = React.useState("all");

	const categories = [
		{ id: "all", label: "All" },
		{ id: "getting-started", label: "Getting Started" },
		{ id: "features", label: "Features" },
		{ id: "billing", label: "Billing" },
		{ id: "support", label: "Support" },
	];

	const filtered = faqs.filter((faq) => {
		const matchesCategory =
			activeCategory === "all" || faq.category === activeCategory;
		const matchesSearch =
			faq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			faq.content.toLowerCase().includes(searchTerm.toLowerCase());
		return matchesCategory && matchesSearch;
	});

	return (
		<div className="mx-auto min-h-screen w-full max-w-3xl md:border-x">
			<div className="px-4 py-16 lg:px-6">
				<h1 className="mb-4 font-semibold text-3xl md:text-4xl leading-relaxed">
					Frequently Asked <HighlightText variant="underline" color="primary" className="font-bold italic text-orange-500">Questions</HighlightText>
				</h1>
				<p className="mb-8 max-w-2xl text-muted-foreground">
					Find answers to common questions about PokiSpokey. Can't find what you're
					looking for? Our support team is here to help.
				</p>

				<InputGroup className="max-w-sm">
					<InputGroupInput
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search FAQs..."
						value={searchTerm}
					/>
					<InputGroupAddon>
						<SearchIcon data-icon="inline-start" />
					</InputGroupAddon>
				</InputGroup>
			</div>

			<FullWidthDivider contained />

			<div className="flex overflow-x-auto scrollbar-none gap-1 border-b px-4 md:gap-3">
				{categories.map((cat) => (
					<button
						className="flex flex-col shrink-0"
						key={cat.id}
						onClick={() => setActiveCategory(cat.id)}
						type="button"
					>
						<span
							className={cn(
								"p-1 text-muted-foreground text-sm hover:text-primary md:p-2 md:text-base",
								activeCategory === cat.id && "text-primary"
							)}
						>
							{cat.label}
						</span>
						{activeCategory === cat.id && (
							<span className="h-0.5 w-full rounded-full bg-primary" />
						)}
					</button>
				))}
			</div>

			<Accordion
				className="space-y-2 border-0! px-4 py-12 lg:px-6"
				collapsible
				type="single"
			>
				{filtered.map((faq) => (
					<AccordionItem
						className="rounded-2xl border px-4 shadow-xs"
						key={faq.id}
						value={faq.id.toString()}
					>
						<AccordionTrigger className="hover:no-underline">
							{faq.title}
						</AccordionTrigger>
						<AccordionContent className="pt-2 pb-4 text-muted-foreground">
							{faq.content}
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>

			{filtered.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<SearchIcon
							/>
						</EmptyMedia>
						<EmptyTitle>No FAQs found matching your search.</EmptyTitle>
					</EmptyHeader>
					<EmptyContent>
						<Button onClick={() => setSearchTerm("")} variant="outline">
							<SearchSlashIcon data-icon="inline-start" />
							Clear search
						</Button>
					</EmptyContent>
				</Empty>
			)}

			<div className="flex items-center px-4 py-10 lg:px-6">
				<div className="flex items-center gap-3">
					<p className="text-muted-foreground">
						Can&apos;t find what you&apos;re looking for?{" "}
						<HighlightText variant="circle" color="primary" className="mx-1 font-bold">
							<a className="text-primary hover:text-orange-600 transition-colors" href="#">
								Contact Us
							</a>
						</HighlightText>
					</p>
					
					<motion.svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						className="text-orange-500 drop-shadow-sm ml-1"
					>
						<motion.path
							d="M12 4 Q13 12 12 20 M12 20 L7 15 M12 20 L17 15"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							initial={{ pathLength: 0, opacity: 0 }}
							whileInView={{ pathLength: 1, opacity: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
						/>
					</motion.svg>
				</div>
			</div>
		</div>
	);
}

const faqs = [
	{
		id: 1,
		category: "getting-started",
		title: "How do I perform my first word lookup?",
		content:
			'Type any word or expression into the main search bar on your dashboard. Our engine will instantly scan 14.2 million video frames to find every instance where native speakers use that exact term in context.',
	},
	{
		id: 2,
		category: "getting-started",
		title: "Is PokiSpokey supported on mobile?",
		content:
			"Yes. PokiSpokey is fully responsive and optimized for all modern mobile browsers. You can watch clips, read transcripts, and chat with your AI Tutor on any device without installing an app.",
	},
	{
		id: 3,
		category: "features",
		title: "What makes PokiSpokey better than a translator?",
		content:
			"Translators give you abstract definitions. PokiSpokey gives you the 'Acoustic Signature'—real people using the word with emotion, cultural nuance, and authentic speed. It's the difference between reading about a language and hearing it live.",
	},
	{
		id: 4,
		category: "features",
		title: "How does the AI Tutor help me?",
		content:
			"The AI Tutor lives right inside the video player. It knows exactly which clip you're watching and can explain slang, grammar structures, or cultural references specific to that moment in real-time.",
	},
	{
		id: 5,
		category: "features",
		title: "What categories of videos are available?",
		content:
			"Our index covers over 14 million frames from Movies, Podcasts, News, and Cartoons. You can filter your results to focus on formal business speech or casual everyday conversations.",
	},
	{
		id: 6,
		category: "billing",
		title: "What payment methods do you accept?",
		content:
			"We accept all major credit cards and digital wallets through our secure payments partner, Polar. Your data is encrypted and handled according to the highest industry standards.",
	},
	{
		id: 7,
		category: "billing",
		title: "Can I cancel my membership anytime?",
		content:
			"Yes. We offer a true 'Blueprint' experience—total transparency with no lock-in contracts. You can upgrade, downgrade, or cancel your plan at any time directly from your profile settings.",
	},
	{
		id: 8,
		category: "support",
		title: "How do I report a technical issue?",
		content:
			"Use the 'Contact Us' link at the bottom of the page or in the sidebar. Our engineering team monitors support tickets and typically responds within one business day.",
	},
	{
		id: 9,
		category: "support",
		title: "Do you offer onboarding for new users?",
		content:
			"Every Free Starter account includes access to our onboarding documentation and contextual tooltips that guide you through your first 100 searches and 50,000 AI credits.",
	},
];
