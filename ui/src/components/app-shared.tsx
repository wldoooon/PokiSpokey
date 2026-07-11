import type { ReactNode } from "react";
import { LayoutGridIcon, CircleDollarSignIcon, FileTextIcon, UsersIcon, HelpCircleIcon, ShieldIcon, ScaleIcon } from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: ReactNode;
	isActive?: boolean;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Overview",
		items: [
			{
				title: "Home",
				path: "/",
				icon: <LayoutGridIcon />,
			},
		],
	},
	{
		label: "General",
		items: [
			{
				title: "Pricing",
				path: "/pricing",
				icon: <CircleDollarSignIcon />,
			},
			{
				title: "Changelog",
				path: "/changelog",
				icon: <FileTextIcon />,
			},
			{
				title: "Support",
				path: "/#contact-us",
				icon: <HelpCircleIcon />,
			},
		],
	},
	{
		label: "Settings",
		items: [
			{
				title: "Account Settings",
				path: "/profile",
				icon: <UsersIcon />,
			},
		],
	},
];

export const footerNavLinks: SidebarNavItem[] = [
	{
		title: "Privacy Policy",
		path: "/privacy",
		icon: <ShieldIcon />,
	},
	{
		title: "Terms of Service",
		path: "/terms",
		icon: <ScaleIcon />,
	},
];

export const navLinks: SidebarNavItem[] = [
	...navGroups.flatMap((group) =>
		group.items.flatMap((item) =>
			item.subItems?.length ? [item, ...item.subItems] : [item]
		)
	),
	...footerNavLinks,
];
