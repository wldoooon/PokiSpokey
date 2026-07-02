import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import FooterWrapper from "@/components/FooterWrapper";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider className="bg-muted/20" suppressHydrationWarning>
			<AppSidebar />
			<SidebarInset className="overflow-x-hidden p-2 bg-transparent" suppressHydrationWarning>
				<div className="flex flex-col min-h-full rounded-2xl bg-card border border-border/50 p-4 md:p-6" suppressHydrationWarning>
					<AppHeader />
					<div className="flex flex-1 flex-col min-h-0 p-1" suppressHydrationWarning>
						{children}
					</div>
					<FooterWrapper />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
