"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { footerNavLinks, navGroups } from "@/components/app-shared";
import { UsageMeter } from "@/components/usage-meter";
import { useAuthStore } from "@/stores/auth-store";
import { BookOpen, MegaphoneIcon, SunIcon, MoonIcon } from "lucide-react";
import { openOnboarding } from "@/components/onboarding-dialog";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { NavUser } from "@/components/nav-user";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeTransition } from "@/components/ui/shadcn-io/theme-toggle-button";

export function AppSidebar() {
	const authStatus = useAuthStore((s) => s.status);
	const visibleGroups = navGroups.filter(
		(g) => g.label !== "Settings" || authStatus === "authenticated"
	);
	const { theme, setTheme } = useTheme();
	const { startTransition } = useThemeTransition();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const handleThemeToggle = useCallback(() => {
		const newTheme = theme === "dark" ? "light" : "dark";
		startTransition(() => setTheme(newTheme));
	}, [theme, setTheme, startTransition]);

	return (
		<Sidebar collapsible="icon" variant="floating" className="[&_[data-sidebar=sidebar]]:rounded-2xl [&_[data-sidebar=sidebar]]:border-border/40 [&_[data-sidebar=sidebar]]:relative [&_[data-sidebar=sidebar]]:bg-card">
			<SidebarHeader className="border-b border-border/40">
				{/* Logo row */}
				<div className="h-14 flex items-center">
					<a href="/" className="flex h-full w-full items-center gap-0 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
						<Image src="/main_logo.png" alt="PokiSpokey" width={34} height={34} className="size-9 shrink-0" />
						<span style={{ fontFamily: "var(--font-carter-one)" }} className="group-data-[collapsible=icon]:hidden -ml-1 relative">
							PokiSpokey
							<span className="absolute -top-2 -right-6 text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded px-1 py-0.5 leading-none">
								beta
							</span>
						</span>
					</a>
				</div>

				{/* Mobile-only: auth + theme toggle (hidden on sm and above) */}
				<div className="sm:hidden px-2 pb-3 flex flex-col gap-2">
					{authStatus === "unknown" ? (
						<Skeleton className="h-9 w-full rounded-lg" />
					) : authStatus === "authenticated" ? (
						<div className="overflow-visible group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
							<NavUser />
						</div>
					) : (
						<div className="flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
							<AuthDialog defaultTab="login">
								<Button variant="outline" size="sm" className="w-full cursor-pointer">
									Sign in
								</Button>
							</AuthDialog>
							<AuthDialog defaultTab="signup">
								<Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
									Get Started
								</Button>
							</AuthDialog>
						</div>
					)}
					{mounted && (
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton onClick={handleThemeToggle}>
									{theme === "dark" ? <SunIcon /> : <MoonIcon />}
									<span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					)}
				</div>
			</SidebarHeader>

			{authStatus !== "authenticated" && (
				<div className="px-2 py-1">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton onClick={openOnboarding} className="bg-primary text-primary-foreground font-medium hover:bg-primary/90 hover:text-primary-foreground" size="default">
								<BookOpen className="shrink-0" />
								<span>Getting Started</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</div>
			)}

			<SidebarContent>
				{visibleGroups.map((group, index) => (
					<NavGroup key={`sidebar-group-${index}`} {...group} />
				))}
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuItem>
							<FeedbackDialog>
								<SidebarMenuButton>
									<MegaphoneIcon />
									<span>Feedback</span>
								</SidebarMenuButton>
							</FeedbackDialog>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-border/40">
				<UsageMeter />
				<SidebarMenu className="mt-2">
					{footerNavLinks.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								className="text-muted-foreground"
								isActive={item.isActive}
								size="sm"
							>
								<Link href={item.path ?? "#"}>
									{item.icon}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
