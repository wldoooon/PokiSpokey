"use client";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { type FREQUENCY, FrequencyToggle } from "@/components/frequency-toggle";
import { StarIcon, CheckCircleIcon, ShieldCheckIcon, BadgeCheckIcon, LockIcon, RefreshCcwIcon, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/apiClient";
import { toastManager } from "@/components/ui/toast";
import { AuthDialog } from "@/components/auth-dialog";
import { useSubscriptionQuery } from "@/lib/billingHooks";
import { useQueryClient } from "@tanstack/react-query";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";

type Plan = {
	name: string;
	info: string;
	price: {
		monthly: number;
		yearly: number;
	};
	features: string[];
	btn: string;
	plan?: "basic" | "pro" | "max"; // absent on Free
	highlighted?: boolean;
};

const plans: Plan[] = [
	{
		name: "Free",
		info: "Try the core experience",
		price: { monthly: 0, yearly: 0 },
		features: [
			"50 Searches / month",
			"15,000 AI Credits / month",
			"Unlimited Translations",
			"All languages included",
		],
		btn: "Get Started Free",
	},
	{
		name: "Basic",
		info: "For casual learners",
		price: { monthly: 7, yearly: 5 },
		features: [
			"300 Searches / month",
			"800,000 AI Credits / month",
			"Unlimited Translations",
			"All languages included",
		],
		btn: "Get Basic",
		plan: "basic",
	},
	{
		highlighted: true,
		name: "Pro",
		info: "For committed learners",
		price: { monthly: 12, yearly: 9 },
		features: [
			"Unlimited Searches",
			"5,000,000 AI Credits / month",
			"Unlimited Translations",
			"Priority support",
			"All languages included",
		],
		btn: "Get Pro",
		plan: "pro",
	},
	{
		name: "Max",
		info: "For power users & daily practice",
		price: { monthly: 20, yearly: 16 },
		features: [
			"Unlimited Searches",
			"15,000,000 AI Credits / month",
			"Unlimited Translations",
			"Priority support",
			"All languages included",
			"Early access to new features",
		],
		btn: "Get Max",
		plan: "max",
	},
];

export function PricingSection() {
	const [frequency, setFrequency] = React.useState<"monthly" | "yearly">("monthly");
	const user = useAuthStore((s) => s.user);
	const userTier = user?.tier?.toLowerCase() ?? null;
	const { data: sub } = useSubscriptionQuery();
	const hasActiveSub = sub?.status === "active" || sub?.status === "on_hold";

	return (
		<div className="flex w-full flex-col items-center justify-center space-y-7 p-4">
			<div className="mx-auto max-w-xl space-y-2">
				<h2 className="text-center font-bold text-2xl tracking-tight md:text-3xl lg:font-extrabold lg:text-4xl">
					Plans that Scale with You
				</h2>
				<p className="text-center text-muted-foreground text-sm md:text-base">
					Whether you're just starting out or growing fast, our flexible pricing
					has you covered — with no hidden costs.
				</p>
			</div>

			<FrequencyToggle frequency={frequency} setFrequency={setFrequency} />
			<div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{plans.map((plan) => (
					<PricingCard frequency={frequency} key={plan.name} plan={plan} userTier={userTier} hasActiveSub={hasActiveSub} />
				))}
			</div>

			<div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-xs">
				<div className="flex items-center gap-1.5">
					<LockIcon className="size-3.5" />
					<span>Secure payment</span>
				</div>
				<div className="flex items-center gap-1.5">
					<BadgeCheckIcon className="size-3.5" />
					<span>No hidden fees</span>
				</div>
				<div className="flex items-center gap-1.5">
					<RefreshCcwIcon className="size-3.5" />
					<span>Cancel anytime</span>
				</div>
				<div className="flex items-center gap-1.5">
					<ShieldCheckIcon className="size-3.5" />
					<span>Privacy protected</span>
				</div>
			</div>
		</div>
	);
}

type PricingCardProps = React.ComponentProps<"div"> & {
	plan: Plan;
	frequency?: FREQUENCY;
	userTier?: string | null;
	hasActiveSub?: boolean;
};

export function PricingCard({
	plan,
	className,
	frequency = "monthly",
	userTier,
	hasActiveSub = false,
	...props
}: PricingCardProps) {
	const [loading, setLoading] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const status = useAuthStore((s) => s.status);
	const queryClient = useQueryClient();
	const isCurrentPlan = userTier === plan.name.toLowerCase();
	const isPaidPlan = !!plan.plan;
	const isLoggedIn = status === "authenticated";

	const handleUpgradeConfirmed = async () => {
		setConfirmOpen(false);
		setLoading(true);
		try {
			await apiClient.post("/billing/upgrade", { plan: plan.plan, billing_period: frequency });
			toastManager.add({
				title: "Plan updated!",
				description: "Your subscription has been changed. It may take a moment to reflect.",
				type: "success",
			});
			queryClient.invalidateQueries({ queryKey: ["billing", "subscription"] });
			queryClient.invalidateQueries({ queryKey: ["me"] });
		} catch (err: any) {
			const msg = err?.response?.data?.detail ?? err?.message ?? "Could not change plan. Please try again.";
			toastManager.add({ title: "Plan change failed", description: msg, type: "error" });
		} finally {
			setLoading(false);
		}
	};

	const handleCheckout = async () => {
		if (!plan.plan) return;

		// User already has an active subscription — show confirmation dialog first
		if (hasActiveSub) {
			setConfirmOpen(true);
			return;
		}

		// No active subscription — open a fresh checkout session
		setLoading(true);
		try {
			const { data } = await apiClient.post<{ transaction_id: string }>(
				"/billing/checkout",
				{ plan: plan.plan, billing_period: frequency }
			);
			(window as any).Paddle?.Checkout.open({ transactionId: data.transaction_id });
			setLoading(false);
		} catch (err: any) {
			const msg = err?.response?.data?.detail ?? err?.message ?? "Could not start checkout. Please try again.";
			toastManager.add({
				title: "Checkout failed",
				description: msg,
				type: "error",
			});
			setLoading(false);
		}
	};

	const renderButton = () => {
		// Current plan — always takes priority
		if (isCurrentPlan) {
			return (
				<Button className="w-full" variant="secondary" disabled>
					Current Plan
				</Button>
			);
		}

		// Free plan — guest sees signup prompt, logged-in users can't click back to free
		if (!isPaidPlan) {
			if (!isLoggedIn) {
				return (
					<AuthDialog defaultTab="signup">
						<Button className="w-full" variant="outline">
							{plan.btn}
						</Button>
					</AuthDialog>
				);
			}
			// Paid user looking at free card — they cancel via Manage Plan (portal)
			return (
				<Button className="w-full" variant="outline" disabled>
					{plan.btn}
				</Button>
			);
		}

		// Paid plan — guest sees signup prompt
		if (!isLoggedIn) {
			return (
				<AuthDialog defaultTab="signup">
					<Button
						className="w-full"
						variant={plan.highlighted ? "default" : "outline"}
					>
						{plan.btn}
					</Button>
				</AuthDialog>
			);
		}

		// Paid plan — logged-in user → checkout
		return (
			<Button
				className="w-full"
				variant={plan.highlighted ? "default" : "outline"}
				onClick={handleCheckout}
				disabled={loading}
			>
				{loading ? (
					<Loader2 className="size-4 animate-spin" />
				) : hasActiveSub ? (
					`Upgrade to ${plan.name}`
				) : (
					plan.btn
				)}
			</Button>
		);
	};

	return (
		<div
			className={cn(
				"relative flex w-full flex-col overflow-hidden rounded-lg border shadow-xs",
				plan.highlighted && "scale-105",
				className
			)}
			key={plan.name}
			{...props}
		>
			{plan.highlighted && (
				<>
					<div className="pointer-events-none absolute inset-0 dark:bg-[radial-gradient(35%_50%_at_15%_0%,--theme(--color-foreground/.1),transparent)]" />
					<div className="usage-shimmer pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-black/8 to-transparent dark:via-white/10" />
				</>
			)}
			<div
				className={cn(
					"border-b p-4",
					plan.highlighted && "bg-card dark:bg-card/80"
				)}
			>
				<AnimatePresence mode="wait">
					<div className="absolute top-2 right-2 z-10 flex items-center gap-2">
						{plan.highlighted && (
							<motion.div
								className="flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-500"
								key="popular-badge"
								layout
								transition={{ duration: 0.1 }}
							>
								<StarIcon className="size-3 fill-orange-500 text-orange-500" />
								Popular
							</motion.div>
						)}

						{frequency === "yearly" &&
							plan.price.monthly > plan.price.yearly && (
								<motion.div
									animate={{ opacity: 1 }}
									className="flex items-center gap-1 rounded-md border bg-primary px-2 py-0.5 text-primary-foreground text-xs"
									exit={{ opacity: 0 }}
									initial={{ opacity: 0 }}
									key="discount-badge"
									layout
									transition={{ duration: 0.15 }}
								>
									{Math.round(
										((plan.price.monthly - plan.price.yearly) /
											plan.price.monthly) *
											100
									)}
									% off
								</motion.div>
							)}
					</div>
				</AnimatePresence>

				<div className="font-medium text-lg">{plan.name}</div>
				<p className="font-normal text-muted-foreground text-sm">{plan.info}</p>
				<h3 className="mt-6 mb-1 flex w-max items-end gap-1">
					<NumberFlow
						className="font-extrabold text-3xl [&::part(suffix)]:font-normal [&::part(suffix)]:text-base [&::part(suffix)]:text-muted-foreground"
						format={{
							style: "currency",
							currency: "USD",
							notation: "compact",
						}}
						suffix="/month"
						value={plan.price[frequency]}
					/>
				</h3>
				<p className="mb-2 font-normal text-muted-foreground text-xs">
					billed {frequency}
				</p>
			</div>
			<div
				className={cn(
					"space-y-3 px-4 pt-6 pb-8 text-muted-foreground text-sm",
					plan.highlighted && "bg-muted/10"
				)}
			>
				{plan.features.map((feature) => (
					<div className="flex items-center gap-2" key={feature}>
						<CheckCircleIcon className="size-3.5 text-foreground" />
						<p>{feature}</p>
					</div>
				))}
			</div>
			<div
				className={cn(
					"mt-auto w-full border-t p-3",
					plan.highlighted && "bg-card dark:bg-card/80"
				)}
			>
				{renderButton()}
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Upgrade to {plan.name}?</DialogTitle>
						<DialogDescription>
							You&apos;ll be charged a prorated amount for the rest of this billing period, then{" "}
							<span className="font-semibold text-foreground">
								${plan.price[frequency]}/month
							</span>{" "}
							going forward. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleUpgradeConfirmed} disabled={loading}>
							{loading ? <Loader2 className="size-4 animate-spin" /> : "Confirm Upgrade"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
