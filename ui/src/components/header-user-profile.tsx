"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "motion/react"
import useMeasure from "react-use-measure"
import Link from "next/link"
import { Settings, ShieldCheck, TrendingUp, LogOut, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUsageStore } from "@/stores/usage-store"
import { useAuthStore } from "@/stores/auth-store"

const easeOutQuint: [number, number, number, number] = [0.23, 1, 0.32, 1]

const TIER_SPARKS: Record<string, number> = {
  free:  15_000,
  basic: 800_000,
  pro:   5_000_000,
  max:   15_000_000,
}

const menuItems = [
  { id: "settings",  label: "Profile Settings",       icon: Settings,    disabled: true,  logout: false },
  { id: "billing",   label: "Billing & Subscription", icon: ShieldCheck, disabled: true,  logout: false },
  { id: "analytics", label: "Usage Analytics",        icon: TrendingUp,  disabled: true,  logout: false },
  { id: "divider" },
  { id: "logout",    label: "Sign out",               icon: LogOut,      disabled: false, logout: true  },
]

export function HeaderUserProfile({
  user,
  onLogout,
}: {
  user: { name: string; email: string; avatar: string }
  onLogout?: () => void
}) {
  const [isOpen, setIsOpen]       = useState(false)
  const [hoveredItem, setHovered] = useState<string | null>(null)
  const containerRef              = useRef<HTMLDivElement>(null)
  const [contentRef, contentBounds] = useMeasure()

  const usageMap = useUsageStore((s) => s.usage)
  const fullUser = useAuthStore((s) => s.user)

  // ── Usage stats ──────────────────────────────────────────────
  const stats       = usageMap["ai_chat"] || { current: 0, balance: 0, limit: -1, remaining: -1 }
  const searchStats = usageMap["search"]  || { current: 0, limit: 250, remaining: 250 }

  const tier      = fullUser?.tier ?? "free"
  const maxSparks = TIER_SPARKS[tier] ?? 50_000
  const isUnlimited = maxSparks === -1

  const currentBalance = stats.balance ?? 0
  const usedSparks     = isUnlimited ? 0 : Math.max(0, maxSparks - currentBalance)

  const searchRaw = searchStats.limit > 0 ? Math.min(1, searchStats.current / searchStats.limit) : 0
  const aiRaw     = isUnlimited ? 0 : maxSparks > 0 ? Math.min(1, usedSparks / maxSparks) : 0
  const w1 = isUnlimited ? 1 : 0.3
  const w2 = isUnlimited ? 0 : 0.7
  const percentageUsed = Math.max(0, Math.min(100, Math.pow(w1 * searchRaw + w2 * aiRaw, 2) * 100))

  const circumference = 2 * Math.PI * 18
  const strokeOffset  = circumference - (percentageUsed / 100) * circumference

  const searchCurrent  = searchStats.current
  const searchLimit    = searchStats.limit
  const searchPct      = searchLimit > 0 ? Math.min(100, (searchCurrent / searchLimit) * 100) : 0
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsOpen(false)
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const openHeight = Math.max(40, Math.ceil(contentBounds.height))

  return (
    <div ref={containerRef} className="relative h-10 w-10 not-prose">
      <motion.div
        layout
        initial={false}
        animate={{
          width:        isOpen ? 300 : 40,
          height:       isOpen ? openHeight : 40,
          borderRadius: isOpen ? 14 : 100,
        }}
        transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.8 }}
        className="absolute top-0 right-0 z-50 bg-popover border border-border shadow-lg overflow-hidden origin-top-right"
        onClick={() => !isOpen && setIsOpen(true)}
        style={{ cursor: isOpen ? "default" : "pointer" }}
      >

        {/* ── Trigger (closed state) — avatar + usage ring ── */}
        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.8 : 1 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center group"
          style={{ pointerEvents: isOpen ? "none" : "auto", willChange: "transform" }}
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor"
              strokeWidth="2.5" className="text-slate-200 dark:text-slate-800" />
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeDasharray={circumference} strokeDashoffset={strokeOffset}
              strokeLinecap="round" className="text-orange-500 transition-all duration-1000 ease-in-out"
              style={{ filter: "drop-shadow(0 0 1px rgba(249,115,22,0.4))" }} />
          </svg>
          <div className="relative h-8 w-8 flex items-center justify-center overflow-hidden rounded-full">
            <Avatar className="h-full w-full transition-all duration-300 group-hover:opacity-10 group-hover:blur-[2px]">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-900 dark:text-slate-50 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100 tabular-nums">
              {Math.round(percentageUsed)}%
            </span>
          </div>
        </motion.div>

        {/* ── Dropdown content (open state) ── */}
        <div ref={contentRef}>
          <motion.div
            layout
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.2, delay: isOpen ? 0.08 : 0 }}
            className="p-2"
            style={{ pointerEvents: isOpen ? "auto" : "none", willChange: "transform" }}
          >
            <ul className="flex flex-col gap-0.5 m-0! p-0! list-none!">

              {/* User info row */}
              <motion.li
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : 8 }}
                transition={{ delay: isOpen ? 0.06 : 0, duration: 0.15, ease: easeOutQuint }}
                className="px-3 pt-2 pb-3 m-0! list-none!"
              >
                <div className="flex items-center gap-2 overflow-hidden mb-0.5">
                  <p className="text-[15px] font-bold text-foreground leading-tight truncate">
                    {user.name}
                  </p>
                  <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold tracking-wider text-muted-foreground uppercase shrink-0">
                    {fullUser?.tier || "free"}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground leading-none truncate">
                  {user.email}
                </p>
              </motion.li>

              {/* Divider */}
              <motion.hr
                initial={{ opacity: 0 }}
                animate={{ opacity: isOpen ? 1 : 0 }}
                transition={{ delay: isOpen ? 0.08 : 0 }}
                className="border-border my-1!"
              />

              {/* Balance card */}
              <motion.li
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : 8 }}
                transition={{ delay: isOpen ? 0.10 : 0, duration: 0.15, ease: easeOutQuint }}
                className="px-1 py-1 m-0! list-none!"
              >
                <div className="p-3 rounded-[10px] border border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[13px] font-bold text-foreground tracking-tight">Balance</span>
                    <Link href="/pricing" onClick={() => setIsOpen(false)}>
                      <span className="relative flex items-center text-[10px] font-black uppercase tracking-widest text-white px-2.5 py-1 rounded-full overflow-hidden group shadow-sm transition-all hover:scale-105">
                        <span className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 group-hover:from-orange-500 group-hover:via-pink-600 group-hover:to-purple-600 transition-all duration-300" />
                        <span className="relative">Upgrade</span>
                      </span>
                    </Link>
                  </div>

                  <div className="h-px bg-border mb-2.5" />

                  <div className="space-y-1.5 mb-2.5">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground font-medium">Total Credits</span>
                      <span className="font-bold text-foreground">
                        {isUnlimited ? "∞" : maxSparks.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground font-medium">Remaining</span>
                      <span className="font-bold text-foreground">{currentBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="h-px bg-border mb-2.5" />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground font-medium flex items-center gap-1.5">
                        <Search className="h-3 w-3" /> Searches
                      </span>
                      <span className="text-[12px] font-bold text-foreground tabular-nums">
                        {searchCurrent}
                        <span className="text-muted-foreground font-normal">
                          {" "}/ {searchLimit === -1 ? "∞" : searchLimit}
                        </span>
                      </span>
                    </div>
                    {searchLimit > 0 && (
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.min(100, searchPct)}%`,
                            background: searchPct > 80
                              ? "linear-gradient(90deg,#f97316,#ef4444)"
                              : searchPct > 50
                              ? "linear-gradient(90deg,#f97316,#eab308)"
                              : "linear-gradient(90deg,#22c55e,#3b82f6)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>

              {/* Divider */}
              <motion.hr
                initial={{ opacity: 0 }}
                animate={{ opacity: isOpen ? 1 : 0 }}
                transition={{ delay: isOpen ? 0.12 : 0 }}
                className="border-border my-1!"
              />

              {/* Menu items — exact same pattern as smooth-dropdown */}
              {menuItems.map((item, index) => {
                if (item.id === "divider") {
                  return (
                    <motion.hr
                      key="menu-divider"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isOpen ? 1 : 0 }}
                      transition={{ delay: isOpen ? 0.14 + index * 0.015 : 0 }}
                      className="border-border my-1!"
                    />
                  )
                }

                const Icon      = item.icon!
                const isLogout  = item.logout
                const isHovered = hoveredItem === item.id

                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : 8 }}
                    transition={{
                      delay:    isOpen ? 0.13 + index * 0.02 : 0,
                      duration: isLogout ? 0.12 : 0.15,
                      ease:     easeOutQuint,
                    }}
                    onMouseEnter={() => !item.disabled && setHovered(item.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      if (item.disabled) return
                      if (isLogout) { setIsOpen(false); onLogout?.() }
                    }}
                    className={`relative flex items-center gap-3 rounded-lg text-sm m-0! pl-3! py-2! transition-colors duration-200 ease-out
                      ${item.disabled  ? "cursor-not-allowed opacity-50"       : "cursor-pointer"}
                      ${isLogout && isHovered ? "text-red-600"                 : ""}
                      ${isLogout && !isHovered ? "text-muted-foreground"       : ""}
                      ${!isLogout && isHovered ? "text-foreground"             : ""}
                      ${!isLogout && !isHovered ? "text-muted-foreground"      : ""}
                    `}
                  >
                    {/* Sliding background indicator */}
                    {isHovered && !item.disabled && (
                      <motion.div
                        layoutId="profileActiveIndicator"
                        className={`absolute inset-0 rounded-lg ${isLogout ? "bg-red-50 dark:bg-red-950/30" : "bg-muted"}`}
                        transition={{ type: "spring", damping: 30, stiffness: 520, mass: 0.8 }}
                      />
                    )}
                    {/* Left bar indicator */}
                    {isHovered && !item.disabled && (
                      <motion.div
                        layoutId="profileLeftBar"
                        className={`absolute left-0 top-0 bottom-0 my-auto w-[3px] h-5 rounded-full ${isLogout ? "bg-red-500" : "bg-foreground"}`}
                        transition={{ type: "spring", damping: 30, stiffness: 520, mass: 0.8 }}
                      />
                    )}
                    <Icon className="w-[18px] h-[18px] relative z-10 shrink-0" />
                    <span className="font-medium relative z-10">{item.label}</span>
                    {item.disabled && (
                      <span className="ml-auto mr-2 text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md relative z-10">
                        Soon
                      </span>
                    )}
                  </motion.li>
                )
              })}

            </ul>
          </motion.div>
        </div>

      </motion.div>
    </div>
  )
}
