"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { UserIcon, CreditCardIcon, LogOutIcon, LifeBuoyIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { useLogoutMutation } from "@/lib/authHooks";

const easeOutQuint: [number, number, number, number] = [0.23, 1, 0.32, 1];

const menuItems = [
  { id: "profile",  label: "Profile",        icon: UserIcon,     href: "/profile", logout: false },
  { id: "billing",  label: "Subscription & Billing",  icon: CreditCardIcon, href: "/profile?tab=billing", logout: false },
  { id: "support",  label: "Support",         icon: LifeBuoyIcon, href: "#",        logout: false },
  { id: "divider" },
  { id: "logout",   label: "Log out",         icon: LogOutIcon,   href: null,       logout: true  },
];

export function NavUser() {
  const [isOpen, setIsOpen]       = useState(false);
  const [hoveredItem, setHovered] = useState<string | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContentHeight(entries[0].contentRect.height);
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  const router                        = useRouter();
  const user                          = useAuthStore((s) => s.user);
  const { mutate: logout, isPending } = useLogoutMutation();

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";
  const email       = user?.email ?? "";
  const avatar      = user?.oauth_avatar_url || "/user_logo.png";
  const tier        = user?.tier
    ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1)
    : "Free";
  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const openHeight = Math.max(32, Math.ceil(contentHeight));

  return (
    <div ref={containerRef} className="relative h-8 w-8 not-prose">
      <motion.div
        layout
        initial={false}
        animate={{
          width:        isOpen ? 220 : 32,
          height:       isOpen ? openHeight : 32,
          borderRadius: isOpen ? 14 : 100,
        }}
        transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.8 }}
        className="absolute top-0 right-0 z-50 bg-popover border border-border shadow-lg overflow-hidden origin-top-right"
        onClick={() => !isOpen && setIsOpen(true)}
        style={{ cursor: isOpen ? "default" : "pointer" }}
      >
        {/* ── Trigger (closed) — avatar ── */}
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.8 : 1 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: isOpen ? "none" : "auto", willChange: "transform" }}
        >
          <Avatar className="size-8">
            <AvatarImage src={avatar} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </motion.div>

        {/* ── Dropdown content (open) ── */}
        <div ref={contentRef}>
          <motion.div
            layout
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.2, delay: isOpen ? 0.08 : 0 }}
            className="p-2"
            style={{ pointerEvents: isOpen ? "auto" : "none", willChange: "transform" }}
          >
            <ul
              className="flex flex-col gap-0.5 m-0! p-0! list-none!"
              onMouseLeave={() => setHovered(null)}
            >

              {/* User info */}
              <motion.li
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : 8 }}
                transition={{ delay: isOpen ? 0.06 : 0, duration: 0.15, ease: easeOutQuint }}
                className="flex items-center gap-3 px-3 py-2.5 m-0! list-none!"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                  <p className="text-[10px] text-muted-foreground">{tier} plan</p>
                </div>
              </motion.li>

              {/* Divider */}
              <motion.hr
                initial={{ opacity: 0 }}
                animate={{ opacity: isOpen ? 1 : 0 }}
                transition={{ delay: isOpen ? 0.10 : 0 }}
                className="border-border my-1!"
              />

              {/* Menu items — exact same pattern as smooth-dropdown */}
              {menuItems.map((item, index) => {
                if (item.id === "divider") {
                  return (
                    <motion.hr
                      key="divider"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isOpen ? 1 : 0 }}
                      transition={{ delay: isOpen ? 0.12 + index * 0.015 : 0 }}
                      className="border-border my-1!"
                    />
                  );
                }

                const Icon          = item.icon!;
                const isLogout      = item.logout;
                const showIndicator = hoveredItem === item.id;

                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : 8 }}
                    transition={{
                      delay:    isOpen ? 0.08 + index * 0.02 : 0,
                      duration: isLogout ? 0.12 : 0.15,
                      ease:     easeOutQuint,
                    }}
                    onClick={() => {
                      if (isLogout) { setIsOpen(false); logout(); }
                      else { setIsOpen(false); if (item.href) router.push(item.href); }
                    }}
                    onMouseEnter={() => setHovered(item.id!)}
                    className={`relative flex items-center gap-3 rounded-lg text-sm cursor-pointer m-0! pl-3! py-2! transition-colors duration-200 ease-out
                      ${isLogout && showIndicator  ? "text-red-600"          : ""}
                      ${isLogout && !showIndicator ? "text-muted-foreground" : ""}
                      ${!isLogout && showIndicator ? "text-foreground"       : ""}
                      ${!isLogout && !showIndicator ? "text-muted-foreground": ""}
                    `}
                  >
                    {/* Always mounted — layoutId can always animate between items */}
                    {showIndicator && (
                      <motion.div
                        layoutId="navUserIndicator"
                        className={`absolute inset-0 rounded-lg ${isLogout ? "bg-red-50 dark:bg-red-950/30" : "bg-muted"}`}
                        transition={{ type: "spring", damping: 30, stiffness: 520, mass: 0.8 }}
                      />
                    )}
                    {showIndicator && (
                      <motion.div
                        layoutId="navUserLeftBar"
                        className={`absolute left-0 top-0 bottom-0 my-auto w-[3px] h-5 rounded-full ${isLogout ? "bg-red-500" : "bg-foreground"}`}
                        transition={{ type: "spring", damping: 30, stiffness: 520, mass: 0.8 }}
                      />
                    )}
                    <Icon className="w-[18px] h-[18px] relative z-10 shrink-0" />
                    <span className="font-medium relative z-10">{item.label}</span>
                  </motion.li>
                );
              })}

            </ul>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
