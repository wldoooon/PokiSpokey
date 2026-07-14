"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { navLinks } from "@/components/app-shared";
import { NavUser } from "@/components/nav-user";
import { SearchBar } from "@/components/comm/SearchBar";
import { AuthDialog } from "@/components/auth-dialog";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { useAuthStore } from "@/stores/auth-store";
import { MegaphoneIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { ThemeToggleButton, useThemeTransition } from "@/components/ui/shadcn-io/theme-toggle-button";

export function AppHeader() {
	const { theme, setTheme } = useTheme();
	const { startTransition } = useThemeTransition();
	const [mounted, setMounted] = useState(false);
	const authStatus = useAuthStore((s) => s.status);
	const pathname = usePathname();

	const activeItem = navLinks.find((item) => {
		if (!item.path || item.path === "#") return false;
		if (item.path === "/") return pathname === "/";
		return pathname === item.path || pathname.startsWith(item.path + "/");
	});

	useEffect(() => setMounted(true), []);

	const handleThemeToggle = useCallback(() => {
		const newTheme = theme === 'dark' ? 'light' : 'dark';
		startTransition(() => {
			setTheme(newTheme);
		});
	}, [theme, setTheme, startTransition]);

	return (
		<header className="mb-6 flex items-center justify-between gap-2 md:px-2 relative z-50">
			<div className="flex items-center gap-3 shrink-0">
				<CustomSidebarTrigger />
				<Separator
					className="mr-2 h-4 data-[orientation=vertical]:self-center hidden md:block"
					orientation="vertical"
				/>
				<div className="hidden md:block">
					<AppBreadcrumbs page={activeItem} />
				</div>
			</div>

			<div className="flex-1 min-w-0 flex justify-center px-2 md:px-4">
				<SearchBar />
			</div>

			<TooltipProvider delayDuration={700}>
				<div className="hidden sm:flex items-center gap-1 md:gap-3 shrink-0">
					{mounted ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<FeedbackDialog>
										<button className="h-9 w-9 rounded-full border border-border shadow-sm bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
											<MegaphoneIcon className="h-4 w-4" />
										</button>
									</FeedbackDialog>
								</span>
							</TooltipTrigger>
							<TooltipContent className="px-2 py-1" side="bottom">
								Send Feedback
							</TooltipContent>
						</Tooltip>
					) : (
						<Skeleton className="h-9 w-9 rounded-full" />
					)}
					{mounted ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<ThemeToggleButton
										theme={theme as 'light' | 'dark'}
										onClick={handleThemeToggle}
										className="h-9 w-9 rounded-full border border-border shadow-sm bg-card"
									/>
								</span>
							</TooltipTrigger>
							<TooltipContent className="px-2 py-1" side="bottom">
								{theme === 'dark' ? 'Light mode' : 'Dark mode'}
							</TooltipContent>
						</Tooltip>
					) : (
						<Skeleton className="h-9 w-9 rounded-full" />
					)}
					<Separator
						className="h-4 data-[orientation=vertical]:self-center hidden md:block"
						orientation="vertical"
					/>
					{authStatus === "guest" ? (
						<div className="flex items-center gap-1 md:gap-2">
							<AuthDialog defaultTab="login">
								<Button variant="ghost" size="sm" className="font-medium hidden sm:flex">
									Sign in
								</Button>
							</AuthDialog>
							<AuthDialog defaultTab="signup">
								<Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-medium">
									Get Started
								</Button>
							</AuthDialog>
						</div>
					) : authStatus === "authenticated" ? (
						<NavUser />
					) : (
						<div className="flex items-center gap-2">
							<Skeleton className="h-8 w-16 rounded-md" />
							<Skeleton className="h-8 w-24 rounded-md" />
						</div>
					)}
				</div>
			</TooltipProvider>
		</header>
	);
}
