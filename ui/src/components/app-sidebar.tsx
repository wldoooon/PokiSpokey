"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
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
import { BookOpen, SunIcon, MoonIcon, LogOut } from "lucide-react";
import { openOnboarding } from "@/components/onboarding-dialog";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeTransition } from "@/components/ui/shadcn-io/theme-toggle-button";
import { useLogoutMutation } from "@/lib/authHooks";

export function AppSidebar() {
	const authStatus = useAuthStore((s) => s.status);
	const visibleGroups = navGroups.filter(
		(g) => g.label !== "Settings" || authStatus === "authenticated"
	);
	const { theme, setTheme } = useTheme();
	const { startTransition } = useThemeTransition();
	const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
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

				{/* Mobile-only: auth + settings */}
				<div className="sm:hidden px-2 pb-3 flex flex-col gap-2">
					{/* Sign in / Get Started for guests */}
					{authStatus === "unknown" ? (
						<Skeleton className="h-9 w-full rounded-lg" />
					) : authStatus !== "authenticated" ? (
						<div className="flex flex-col gap-1.5">
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
					) : null}

					{/* Settings section */}
					{mounted && (
						<div className="flex flex-col gap-1.5">
							<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-1 pt-1">
								Settings
							</span>

							{/* Light / Dark segmented switcher */}
							<div className="flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
								<button
									onClick={() => startTransition(() => setTheme("light"))}
									className={cn(
										"flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
										theme === "light"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									<SunIcon size={13} />
									Light
								</button>
								<button
									onClick={() => startTransition(() => setTheme("dark"))}
									className={cn(
										"flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
										theme === "dark"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									<MoonIcon size={13} />
									Dark
								</button>
							</div>

							{/* Sign Out — only for authenticated users */}
							{authStatus === "authenticated" && (
								<Button
									variant="outline"
									size="sm"
									className="w-full cursor-pointer text-muted-foreground hover:text-red-600 hover:border-red-300 dark:hover:border-red-800"
									onClick={() => logout()}
									disabled={isLoggingOut}
								>
									<LogOut size={14} />
									{isLoggingOut ? "Signing out…" : "Sign out"}
								</Button>
							)}
						</div>
					)}
				</div>
			</SidebarHeader>

			{authStatus === "unknown" ? null : authStatus !== "authenticated" ? (
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
			) : null}

			<SidebarContent>
				{authStatus === "unknown" ? (
					<SidebarGroup>
						<SidebarMenu>
							{Array.from({ length: 5 }).map((_, i) => (
								<SidebarMenuItem key={i}>
									<div className="flex items-center gap-2 p-2">
										<Skeleton className="h-4 w-4 rounded shrink-0" />
										<Skeleton className="h-4 rounded group-data-[collapsible=icon]:hidden" style={{ width: `${55 + (i % 3) * 20}px` }} />
									</div>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroup>
				) : (
					visibleGroups.map((group, index) => (
						<NavGroup key={`sidebar-group-${index}`} {...group} />
					))
				)}
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
