"use client"

import React, { useState, useRef, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Lock, LogOut, Mail, ShieldCheck, CalendarDays,
  Eye, EyeOff, KeyRound, Camera, Languages, ChevronDown, Info,
  Zap, Search, Check, ArrowUpRight, TriangleAlert, Link2, Unlink, Loader2, Download, Clock, ChevronsUpDown, Upload,
  CircleCheck, CircleX, RotateCcw, Ban, CircleAlert,
} from "lucide-react"
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"
import { useUsageStore } from "@/stores/usage-store"
import { useLogoutMutation, useUpdateProfileMutation } from "@/lib/authHooks"
import { useSubscriptionQuery, useInvoicesQuery, getPlanPrice } from "@/lib/billingHooks"
import type { SubscriptionInfo, InvoiceRow } from "@/lib/billingHooks"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/apiClient"
import { toastManager } from "@/components/ui/toast"
import { PaymentCards } from "./payment-cards"

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_USER = {
  full_name: "Walid Benraho",
  email: "walid.benraho005@gmail.com",
  oauth_avatar_url: null as string | null,
  oauth_provider: null as string | null,
  tier: "pro" as const,
  is_email_verified: true,
  created_at: "2024-03-15T10:00:00Z",
  usage: {
    sparks: { current: 3_200_000, limit: 5_000_000 },
    searches: { current: 1_430, limit: 2_000 },
  },
}

const PLANS = [
  { id: "free", label: "Free", price: "$0", sparks: "15K", searches: "50" },
  { id: "basic", label: "Basic", price: "$7", sparks: "800K", searches: "300" },
  { id: "pro", label: "Pro", price: "$12", sparks: "5M", searches: "Unlimited", popular: true },
  { id: "max", label: "Max", price: "$20", sparks: "15M", searches: "Unlimited" },
]

const TIER_CONFIG: Record<string, { label: string; className: string; style?: React.CSSProperties }> = {
  free:  { label: "Free",  className: "bg-muted text-muted-foreground border-border" },
  basic: { label: "Basic", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  pro: {
    label: "Pro", className: "",
    style: {
      backgroundImage: [
        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.75) 50%, transparent 70%)",
        "linear-gradient(105deg, #7A5C00 0%, #C9A020 30%, #FFD700 50%, #C9A020 70%, #7A5C00 100%)",
      ].join(", "),
      backgroundSize: "250% 100%, 100% 100%",
      backgroundRepeat: "no-repeat, no-repeat",
      animation: "gold-shimmer 3s ease-in-out infinite",
      color: "#3D2400",
      border: "1px solid #B8860B",
      textShadow: "0 1px 1px rgba(255,255,255,0.4)",
    },
  },
  max: {
    label: "Max", className: "",
    style: {
      backgroundImage: [
        "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.9) 50%, transparent 75%)",
        "linear-gradient(105deg, #5C4200 0%, #B8860B 25%, #FFD700 45%, #FFF5A0 55%, #FFD700 65%, #B8860B 80%, #5C4200 100%)",
      ].join(", "),
      backgroundSize: "250% 100%, 100% 100%",
      backgroundRepeat: "no-repeat, no-repeat",
      animation: "gold-shimmer 2s ease-in-out infinite",
      color: "#2A1A00",
      border: "1px solid #92710D",
      textShadow: "0 1px 2px rgba(255,255,255,0.5)",
      boxShadow: "0 0 8px rgba(255,215,0,0.4), 0 0 2px rgba(255,215,0,0.6)",
    },
  },
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "nl", label: "Dutch" },
]

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name?: string | null, email?: string) {
  if (name) {
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email?.[0]?.toUpperCase() ?? "?"
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function AccountInfoCardSkeleton() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden relative">
      {/* Shimmer sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent"
          style={{ transform: "translateX(-100%)", animation: "shimmer 1.8s ease-in-out infinite" }}
        />
      </div>

      {/* Tab bar skeleton */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex gap-1 bg-muted/70 rounded-xl p-1 w-fit">
          {["w-20", "w-20", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-8 ${w} rounded-lg`} />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="px-6 pt-5 pb-6 space-y-6">
        {/* Avatar row */}
        <div className="flex items-center gap-5">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-4 w-52 rounded-lg" />
            <Skeleton className="h-5 w-14 rounded-full mt-1" />
          </div>
        </div>

        <Skeleton className="h-px w-full rounded-full" />

        {/* Input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>

        <Skeleton className="h-px w-full rounded-full" />

        {/* Meta cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-muted/30 border border-border/40 px-4 py-3.5 space-y-2">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ── Language combobox ─────────────────────────────────────────────────────────
function LanguageCombobox({
  value,
  onChange,
  languages,
}: {
  value: string
  onChange: (v: string) => void
  languages: typeof LANGUAGES
}) {
  const [open, setOpen] = useState(false)
  const selected = languages.find((l) => l.code === value) ?? LANGUAGES.find((l) => l.code === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between rounded-xl h-11 px-3 text-sm",
            "bg-muted/40 border border-border/50 transition-colors",
            "hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            open && "ring-2 ring-primary/30 bg-muted/70"
          )}
        >
          <span className={cn("font-medium", selected ? "text-foreground" : "text-muted-foreground")}>
            {selected?.label ?? "Select…"}
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 rounded-xl border-border/60 shadow-lg"
        align="start"
        sideOffset={6}
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command>
          <CommandInput placeholder="Search language…" className="h-9 text-sm" />
          <CommandList className="max-h-44">
            <CommandEmpty className="text-sm py-4">No language found.</CommandEmpty>
            <CommandGroup>
              {languages.map((lang) => (
                <CommandItem
                  key={lang.code}
                  value={lang.label}
                  onSelect={() => { onChange(lang.code); setOpen(false) }}
                  className="rounded-lg gap-2 cursor-pointer"
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", lang.code === value ? "opacity-100 text-primary" : "opacity-0")} />
                  {lang.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Delete account dialog ─────────────────────────────────────────────────────
function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [confirmText, setConfirmText] = useState("")
  const canDelete = confirmText === "DELETE"

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.07, duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const },
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setConfirmText(""); onOpenChange(v) }}>
      <DialogContent className="rounded-2xl max-w-sm">
        <div className="flex flex-col items-center gap-5 pt-2">
          <motion.div
            {...stagger(0)}
            className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, type: "spring", damping: 16, stiffness: 300 }}
            >
              <TriangleAlert className="h-8 w-8 text-red-500" />
            </motion.div>
          </motion.div>

          <motion.div {...stagger(1)} className="text-center space-y-1.5">
            <DialogTitle className="text-lg">Delete your account</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              This is permanent and cannot be undone. All your data, history,
              and subscription will be erased immediately.
            </DialogDescription>
          </motion.div>

          <motion.div {...stagger(2)} className="w-full space-y-2">
            <Label className="text-xs text-muted-foreground">
              Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="rounded-xl h-11 text-center font-mono tracking-widest bg-muted/40 border-border/50"
            />
          </motion.div>

          <motion.div {...stagger(3)} className="flex gap-2 w-full pb-1">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-10"
              onClick={() => { setConfirmText(""); onOpenChange(false) }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl h-10 transition-all duration-200"
              disabled={!canDelete}
            >
              Delete Account
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function AccountTab({ user }: { user: typeof MOCK_USER }) {
  const isOAuth = !!user.oauth_provider

  const [displayName, setDisplayName] = useState(user.full_name ?? "")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState(false)
  const [nativeLang, setNativeLang] = useState("ar")
  const [learningLang, setLearningLang] = useState("en")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDirty = displayName !== (user.full_name ?? "")
  const tier = TIER_CONFIG[user.tier] ?? TIER_CONFIG.free
  const updateMutation = useUpdateProfileMutation()
  const logoutMutation = useLogoutMutation()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSizeError(false)
    if (file.size > 5 * 1024 * 1024) { setSizeError(true); e.target.value = ""; return }
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  return (
    <div className="space-y-6">
      {/* Avatar row */}
      <div className="flex items-center gap-5">
        {/* Clickable avatar with hover overlay */}
        <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
          <Avatar className="h-24 w-24 ring-2 ring-border/40 ring-offset-2 ring-offset-card">
            <AvatarImage src={avatarPreview || user.oauth_avatar_url || "/user_logo.png"} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-2xl font-bold">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <motion.div
            initial={false}
            animate={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center gap-0.5"
          >
            <Camera className="h-5 w-5 text-white" />
            <span className="text-[10px] font-semibold text-white">Change</span>
          </motion.div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <div className="flex-1 min-w-0 space-y-2.5">
          <div>
            <p className="text-xl font-semibold text-foreground truncate">
              {user.full_name || user.email.split("@")[0] || "User"}
            </p>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{user.email}</p>
            <Badge
              variant="outline"
              className={cn("mt-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full", tier.className)}
              style={tier.style}
            >
              {tier.label}
            </Badge>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl h-8 px-3 gap-1.5 text-xs"
              onClick={() => { setSizeError(false); fileInputRef.current?.click() }}
            >
              <Camera className="h-3.5 w-3.5" />
              Upload photo
            </Button>
            {avatarPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl h-8 px-3 text-xs text-muted-foreground hover:text-red-500"
                onClick={() => setAvatarPreview(null)}
              >
                Remove
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {sizeError ? (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] text-red-500"
              >
                File exceeds 5 MB — please choose a smaller image.
              </motion.p>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] text-muted-foreground"
              >
                JPG, PNG or GIF · Max 5 MB
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Separator />

      {/* Editable fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="rounded-xl bg-muted/40 border-border/50 focus-visible:ring-primary/30 h-11"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</Label>
            {isOAuth && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted border border-border/50 rounded-full px-2 py-0.5">
                <GoogleIcon className="h-3 w-3" />
                via Google
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              value={user.email}
              readOnly
              className="rounded-xl bg-muted/30 border-border/30 text-muted-foreground pr-10 cursor-not-allowed h-11"
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Account meta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: CalendarDays, label: "Member since", value: formatDate(user.created_at) },
          { icon: Mail, label: "Sign-in method", value: user.oauth_provider ?? "Email / Password" },
          {
            icon: ShieldCheck, label: "Email", value: user.is_email_verified ? "Verified" : "Unverified",
            badge: true, ok: user.is_email_verified
          },
        ].map(({ icon: Icon, label, value, badge, ok }) => (
          <div key={label} className="rounded-2xl bg-muted/30 border border-border/40 px-4 py-3.5 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            {badge ? (
              <Badge variant="outline" className={cn(
                "text-[10px] font-semibold px-2 py-0 rounded-full mt-1",
                ok ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-red-500/10 text-red-500 border-red-500/20"
              )}>
                {value}
              </Badge>
            ) : (
              <p className="text-sm font-medium text-foreground capitalize">{value}</p>
            )}
          </div>
        ))}
      </div>

      <Separator />

      {/* Preferences */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language Preferences</h3>
        </div>
        <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">I speak</Label>
              <LanguageCombobox
                value={nativeLang}
                onChange={setNativeLang}
                languages={LANGUAGES}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">I'm learning</Label>
              <LanguageCombobox
                value={learningLang}
                onChange={setLearningLang}
                languages={LANGUAGES.filter(l => l.code !== nativeLang)}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Linked accounts */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linked Accounts</h3>
        <div className="space-y-2">
          {[
            {
              id: "google",
              name: "Google",
              description: "Sign in with your Google account",
              icon: <GoogleIcon className="h-5 w-5" />,
              linked: user.oauth_provider === "google",
              canUnlink: user.oauth_provider === "google",
            },
          ].map((provider) => (
            <motion.div
              key={provider.id}
              layout
              className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/20 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-background border border-border/50 flex items-center justify-center shrink-0">
                  {provider.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{provider.name}</p>
                    {provider.linked && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-full bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        Connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                </div>
              </div>

              {provider.linked ? (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="rounded-xl h-8 px-3 text-xs text-muted-foreground gap-1.5 opacity-40 cursor-not-allowed"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Unlink
                  </Button>
                  <span className="text-[10px] text-muted-foreground/60 pr-1">Only sign-in method</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 px-3 text-xs gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Connect
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* No-password notice for OAuth users */}
      {isOAuth && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/20 px-4 py-3.5"
        >
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">No password set</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You sign in with Google. If you lose access to your Google account you won't be able to log in.{" "}
              <button
                type="button"
                onClick={() => {/* TODO: navigate to security tab */ }}
                className="underline underline-offset-2 text-foreground hover:text-primary transition-colors"
              >
                Add a password
              </button>
            </p>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-2"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </Button>
        <Button
          size="sm"
          className="rounded-xl px-6 h-9"
          disabled={!isDirty || updateMutation.isPending}
          onClick={() => updateMutation.mutate({ full_name: displayName })}
        >
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-red-500/70" />
          <h3 className="text-sm font-semibold text-red-500/80">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Delete account</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently remove your account and all associated data.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl h-9 px-4 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-colors"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}

function getPasswordStrength(pw: string): { score: number; label: string; barColor: string; textColor: string } {
  if (!pw) return { score: 0, label: "", barColor: "", textColor: "" }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
  return [
    { score: 0, label: "", barColor: "", textColor: "" },
    { score: 1, label: "Weak", barColor: "bg-red-500", textColor: "text-red-500" },
    { score: 2, label: "Fair", barColor: "bg-amber-500", textColor: "text-amber-500" },
    { score: 3, label: "Good", barColor: "bg-blue-500", textColor: "text-blue-500" },
    { score: 4, label: "Strong", barColor: "bg-emerald-500", textColor: "text-emerald-500" },
  ][s]
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, barColor, textColor } = getPasswordStrength(password)
  if (!password) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="space-y-1.5"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-border/50 overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", i <= score ? barColor : "")}
              initial={{ width: 0 }}
              animate={{ width: i <= score ? "100%" : "0%" }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            />
          </div>
        ))}
      </div>
      <p className={cn("text-[11px] font-medium", textColor)}>{label}</p>
    </motion.div>
  )
}

function SecurityTab({ user }: { user: typeof MOCK_USER }) {
  const isOAuth = !!user.oauth_provider

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [newEmail, setNewEmail] = useState("")

  const strength = getPasswordStrength(next)
  const passwordsMatch = confirm.length > 0 && next === confirm
  const passwordsMismatch = confirm.length > 0 && next !== confirm
  const canSubmitPassword = isOAuth
    ? next && confirm && next === confirm && strength.score >= 2
    : current && next && confirm && next === confirm && strength.score >= 2

  function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    return (
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    )
  }

  return (
    <div className="space-y-6">

      {/* Password section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{isOAuth ? "Set Password" : "Change Password"}</h3>
          {isOAuth && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-full bg-amber-500/10 text-amber-500 border-amber-500/20 ml-1">
              Not set
            </Badge>
          )}
        </div>

        {isOAuth && (
          <p className="text-xs text-muted-foreground -mt-1">
            Add a password as a backup sign-in method in case you lose access to Google.
          </p>
        )}

        <div className="space-y-3">
          {/* Current password — only for non-OAuth */}
          {!isOAuth && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl h-11 pr-10 bg-muted/40 border-border/50 focus-visible:ring-primary/30"
                />
                <EyeToggle show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
              </div>
            </div>
          )}

          {/* New + Confirm side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isOAuth ? "Password" : "New Password"}
              </Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl h-11 pr-10 bg-muted/40 border-border/50 focus-visible:ring-primary/30"
                />
                <EyeToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
              </div>
              <AnimatePresence>
                {next && <PasswordStrengthBar password={next} />}
              </AnimatePresence>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "rounded-xl h-11 pr-10 bg-muted/40 border-border/50 focus-visible:ring-primary/30",
                    passwordsMatch && "border-emerald-500/50 focus-visible:ring-emerald-500/30",
                    passwordsMismatch && "border-red-500/50 focus-visible:ring-red-500/30",
                  )}
                />
                <EyeToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
              </div>
              <AnimatePresence>
                {confirm && (
                  <motion.p
                    key={passwordsMatch ? "match" : "mismatch"}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn("text-[11px] font-medium", passwordsMatch ? "text-emerald-500" : "text-red-500")}
                  >
                    {passwordsMatch ? "Passwords match" : "Passwords don't match"}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" className="rounded-xl px-6 h-9" disabled={!canSubmitPassword}>
            {isOAuth ? "Set Password" : "Update Password"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Change email */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Change Email</h3>
        </div>

        {isOAuth ? (
          <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/20 px-4 py-3.5">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Managed by Google</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your email is tied to your Google account. Update it directly in your Google account settings.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Email</Label>
                <div className="relative">
                  <Input
                    value={user.email}
                    readOnly
                    className="rounded-xl h-11 bg-muted/30 border-border/30 text-muted-foreground pr-10 cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Email</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  className="rounded-xl h-11 bg-muted/40 border-border/50 focus-visible:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">We'll send a verification code to your new address.</p>
              <Button size="sm" className="rounded-xl px-6 h-9" disabled={!newEmail || newEmail === user.email}>
                Send code
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

function FilterDropdown({ label, value, options, onChange }: {
  label: string
  value: string
  options: { label: string; value: string; badgeClassName?: string; icon?: React.ComponentType<{ className?: string }> }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const active = options.find(o => o.value === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs border border-border/60 rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer">
          <span className="text-muted-foreground">{label}:</span>
          {active?.badgeClassName ? (
            <span className={cn("inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border text-[11px]", active.badgeClassName)}>
              {active.icon && <active.icon className="w-3 h-3" />}
              {active.label}
            </span>
          ) : (
            <span className="font-semibold text-foreground">{active?.label ?? value}</span>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1 w-44 rounded-xl border-border/60 shadow-lg" align="start" sideOffset={6}>
        {options.map((opt, idx) => (
          <div key={opt.value}>
            {idx > 0 && <div className="h-px bg-border/40 mx-1 my-0.5" />}
            <button
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                "w-full text-left text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2",
                opt.value === value ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              {opt.badgeClassName ? (
                <span className={cn("inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full border text-[11px]", opt.badgeClassName)}>
                  {opt.icon && <opt.icon className="w-3 h-3" />}
                  {opt.label}
                </span>
              ) : (
                <span className={cn("font-semibold", opt.value === value ? "text-foreground" : "text-muted-foreground")}>{opt.label}</span>
              )}
            </button>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function BillingTab({ user }: { user: typeof MOCK_USER }) {
  const usage = useUsageStore((s) => s.usage)

  const queryClient = useQueryClient()
  const { data: sub = null, isLoading: subLoading } = useSubscriptionQuery()
  const { data: invoices = [], isLoading: invLoading } = useInvoicesQuery()

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReasons, setCancelReasons] = useState<string[]>([])
  const [cancelConfirm, setCancelConfirm] = useState("")
  const [cancelLoading, setCancelLoading] = useState(false)
  const [reactivateLoading, setReactivateLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("All")
  const [dateFilter, setDateFilter] = useState("Any")
  const [planFilter, setPlanFilter] = useState("Any")
  const [amountFilter, setAmountFilter] = useState("Any")

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId)
    try {
      const { data } = await apiClient.post<{ checkout_url: string }>("/billing/checkout", {
        plan: planId,
        billing_period: "monthly",
      })
      window.location.href = data.checkout_url
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Could not start checkout."
      toastManager.add({ title: "Checkout failed", description: msg, type: "error" })
      setCheckoutLoading(null)
    }
  }

  const renewalLabel = () => {
    if (subLoading) return "Loading..."
    if (!sub?.current_period_end) return null
    const date = new Date(sub.current_period_end)
    const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    if (sub.cancel_at_period_end) return `Cancels ${formatted}`
    return `Renews ${formatted}`
  }

  const planOptions = ["Any", ...Array.from(new Set(invoices.map(inv => inv.description.split(" · ")[0]).filter(Boolean)))]

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== "All" && inv.status !== statusFilter) return false
    if (dateFilter !== "Any") {
      const days = dateFilter === "30d" ? 30 : dateFilter === "3m" ? 90 : dateFilter === "6m" ? 180 : 365
      if (new Date(inv.date) < new Date(Date.now() - days * 86400000)) return false
    }
    if (planFilter !== "Any" && inv.description.split(" · ")[0] !== planFilter) return false
    if (amountFilter !== "Any") {
      const amt = inv.amount / 100
      if (amountFilter === "under10" && amt >= 10) return false
      if (amountFilter === "10-50" && (amt < 10 || amt > 50)) return false
      if (amountFilter === "over50" && amt <= 50) return false
    }
    return true
  })

  const sparksBalance = usage.ai_chat?.balance ?? 0
  const sparksLimit = usage.ai_chat?.limit ?? 0
  const searchCurrent = usage.search?.current ?? 0
  const searchLimit = usage.search?.limit ?? 0

  // limit === -1 means unlimited, but if balance has actually hit 0 the user is out of credits
  const sparksUnlimited = sparksLimit === -1 && sparksBalance !== 0
  const searchUnlimited = searchLimit === -1
  const sparksUsed = sparksUnlimited ? 0 : Math.max(0, sparksLimit - sparksBalance)
  const sparksRemaining = sparksUnlimited ? Infinity : Math.max(0, sparksBalance)

  const activePlanId = sub?.plan ?? "free"
  const currentPlan = PLANS.find(p => p.id === activePlanId) ?? PLANS[0]

  return (
    <div className="space-y-6">
      {/* Subscription details */}
      <div className="rounded-2xl border border-border/50 p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Subscription details</h3>
          <p className="text-sm text-muted-foreground mt-0.5">An overview of your plan, usage, and billing cycle.</p>
        </div>
        <Separator />
        {subLoading ? (
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-28 rounded-lg" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-40 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Price</p>
              <p className="text-base font-semibold text-foreground">
                {currentPlan.id !== "free" ? `${currentPlan.price}/mo` : "Free"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Your plan</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-foreground">{currentPlan.label}</p>
                <Badge variant="outline" className={cn(
                  "text-[11px] font-semibold px-2.5 py-0.5 rounded-full self-center leading-none h-auto flex items-center gap-1",
                  sub?.cancel_at_period_end
                    ? "text-muted-foreground bg-muted border-border/60"
                    : "text-white bg-blue-600 border-blue-600"
                )}>
                  {sub?.cancel_at_period_end && <Clock className="w-3 h-3 shrink-0" />}
                  {sub?.cancel_at_period_end ? "Cancel pending" : "Active"}
                </Badge>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Next invoice on</p>
              <p className="text-base font-semibold text-foreground">
                {sub?.current_period_end
                  ? new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Cycle</p>
              <p className="text-base font-semibold text-foreground capitalize">{sub?.billing_period ?? "—"}</p>
            </div>
            {activePlanId !== "free" && !sub?.cancel_at_period_end && (
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl text-sm cursor-pointer hover:bg-red-700 transition-colors shrink-0"
                onClick={() => setCancelOpen(true)}
              >
                Cancel Plan
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Cancel subscription dialog */}
      <Dialog open={cancelOpen} onOpenChange={(v) => { if (!v) { setCancelReasons([]); setCancelConfirm("") } setCancelOpen(v) }}>
        <DialogContent className="rounded-2xl sm:max-w-[1100px] w-full p-0 overflow-hidden">
          <div className="flex min-h-[600px]">
            {/* Left — image */}
            <div className="hidden md:block w-1/2 shrink-0 relative">
              <img
                src="/cancel-picture.jpg"
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 right-[-6px] bg-gradient-to-l from-white to-transparent dark:from-background dark:to-transparent" />
            </div>

            {/* Right — content */}
            <div className="flex-1 min-w-0 flex flex-col gap-5 p-6 pt-7">
              <button
                onClick={() => { setCancelReasons([]); setCancelConfirm(""); setCancelOpen(false) }}
                className="absolute top-3.5 right-3.5 z-50 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>

              <div className="space-y-1.5">
                <DialogTitle className="text-xl font-bold">Cancel your subscription</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  We're sorry to see you cancel your plan. To help us improve, we have a few short questions for you before you leave us.
                </DialogDescription>
              </div>

              <div className="space-y-2.5">
                <p className="text-sm font-semibold text-foreground">Why are you cancelling your plan?</p>
                <div className="flex flex-col gap-2">
                  {[
                    "Too expensive",
                    "Not using it enough",
                    "Missing features I need",
                    "Switching to another service",
                    "Too difficult to use",
                  ].map(reason => {
                    const checked = cancelReasons.includes(reason)
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setCancelReasons(prev =>
                          checked ? prev.filter(r => r !== reason) : [...prev, reason]
                        )}
                        className="flex items-center gap-3 cursor-pointer text-left"
                      >
                        <span className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          checked ? "border-red-600 bg-red-600" : "border-border bg-transparent"
                        )}>
                          {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-sm text-foreground">{reason}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  placeholder="What would have kept you? (optional)"
                  className="h-full w-full resize-none rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-border transition-colors"
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-foreground">Type <span className="font-bold">CANCEL</span> to confirm.</p>
                  <Input
                    placeholder="CANCEL"
                    value={cancelConfirm}
                    onChange={e => setCancelConfirm(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  variant="destructive"
                  className="w-full rounded-xl h-10 cursor-pointer hover:bg-red-700 transition-colors"
                  disabled={cancelLoading || cancelConfirm !== "CANCEL"}
                  onClick={async () => {
                    setCancelLoading(true)
                    try {
                      await apiClient.post("/billing/cancel", { reason: cancelReasons.length ? cancelReasons.join(", ") : null })
                      queryClient.setQueryData<SubscriptionInfo>(["billing", "subscription"], prev => prev ? { ...prev, cancel_at_period_end: true } : prev)
                      setCancelOpen(false)
                      setCancelReasons([])
                      setCancelConfirm("")
                      toastManager.add({ title: "Subscription cancelled", description: "You'll keep full access until the end of your billing period.", type: "success" })
                    } catch {
                      toastManager.add({ title: "Cancellation failed", description: "Failed to cancel subscription. Please try again.", type: "error" })
                    } finally {
                      setCancelLoading(false)
                    }
                  }}
                >
                  {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel plan"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setCancelReasons([]); setCancelConfirm(""); setCancelOpen(false) }}
                  disabled={cancelLoading}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-center"
                >
                  Never mind
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Separator />

      {/* Payment methods */}
      <PaymentCards />

      <Separator />

      {/* Usage */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Month's Usage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: Zap, label: "AI Sparks",
              used: sparksUsed,
              limit: sparksUnlimited ? 0 : sparksLimit,
              remaining: sparksUnlimited ? -1 : sparksRemaining,
              unlimited: sparksUnlimited,
              color: "bg-primary",
            },
            {
              icon: Search, label: "Searches",
              used: searchCurrent,
              limit: searchUnlimited ? 0 : searchLimit,
              remaining: searchUnlimited ? -1 : Math.max(0, searchLimit - searchCurrent),
              unlimited: searchUnlimited,
              color: "bg-blue-500",
            },
          ].map(({ icon: Icon, label, used, limit, remaining, unlimited, color }) => {
            const pct = unlimited ? 0 : Math.min(100, limit > 0 ? (used / limit) * 100 : 0)
            return (
              <div key={label} className="rounded-2xl border border-border/40 bg-muted/20 px-4 py-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {unlimited ? "∞" : `${formatNumber(used)} / ${formatNumber(limit)}`}
                  </span>
                </div>
                <Progress value={pct} className="h-1.5 rounded-full bg-muted [&>div]:bg-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  {unlimited ? "Unlimited" : `${formatNumber(remaining)} remaining`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Cancellation banner */}
      {sub?.cancel_at_period_end && sub?.current_period_end && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-foreground">
              Your subscription cancels on{" "}
              <span className="font-semibold">
                {new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              . No further charges after that.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs shrink-0 cursor-pointer"
            disabled={reactivateLoading}
            onClick={async () => {
              setReactivateLoading(true)
              try {
                await apiClient.post("/billing/reactivate")
                queryClient.setQueryData<SubscriptionInfo>(["billing", "subscription"], prev => prev ? { ...prev, cancel_at_period_end: false } : prev)
                toastManager.add({ title: "Subscription reactivated", description: "Your subscription will continue as normal.", type: "success" })
              } catch {
                toastManager.add({ title: "Reactivation failed", description: "Could not reactivate. Please try again.", type: "error" })
              } finally {
                setReactivateLoading(false)
              }
            }}
          >
            {reactivateLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reactivate"}
          </Button>
        </div>
      )}

      {/* Invoice history */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-5 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-base font-bold text-foreground">Invoices</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Your complete invoice history, including payment details.</p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterDropdown
              label="Status" value={statusFilter}
              options={[
                { label: "All", value: "All" },
                { label: "Paid",       value: "succeeded",  badgeClassName: "text-white bg-emerald-600 border-emerald-700", icon: CircleCheck },
                { label: "Failed",     value: "failed",     badgeClassName: "text-white bg-red-600 border-red-700",         icon: CircleX },
                { label: "Refunded",   value: "refunded",   badgeClassName: "text-white bg-amber-600 border-amber-700",     icon: RotateCcw },
                { label: "Cancelled",  value: "cancelled",  badgeClassName: "text-white bg-slate-600 border-slate-700",     icon: Ban },
                { label: "Processing", value: "processing", badgeClassName: "text-white bg-blue-600 border-blue-700",       icon: Loader2 },
              ]}
              onChange={setStatusFilter}
            />
            <FilterDropdown
              label="Billing date" value={dateFilter}
              options={[
                { label: "Any", value: "Any" },
                { label: "Last 30 days", value: "30d" },
                { label: "Last 3 months", value: "3m" },
                { label: "Last 6 months", value: "6m" },
                { label: "Last year", value: "1y" },
              ]}
              onChange={setDateFilter}
            />
            <FilterDropdown
              label="Plan" value={planFilter}
              options={planOptions.map(p => ({ label: p, value: p }))}
              onChange={setPlanFilter}
            />
          </div>
        </div>

        {invLoading ? (
          <div className="rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-6 px-4 py-4">
                <Skeleton className="h-4 w-6 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-14 rounded" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet.</p>
        ) : filteredInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No invoices match the selected filters.</p>
        ) : (
          <div className="rounded-xl border border-border/40 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/40">
                <TableHead className="text-xs font-semibold text-muted-foreground py-3 w-10">№</TableHead>
                {[["Invoice ID"], ["Plan"], ["Cycle"], ["Billing date"], ["Amount"]].map(([col]) => (
                  <TableHead key={col} className="text-xs font-semibold text-muted-foreground py-3">
                    <span className="flex items-center gap-1">{col} <ChevronsUpDown className="w-3 h-3 opacity-50" /></span>
                  </TableHead>
                ))}
                <TableHead className="text-xs font-semibold text-muted-foreground py-3">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground py-3 text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv, idx) => {
                const [plan, cycle] = inv.description.split(" · ")
                const statusConfig: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
                  succeeded:                { label: "Paid",          className: "text-white bg-emerald-600 border-emerald-700", icon: CircleCheck },
                  failed:                   { label: "Failed",        className: "text-white bg-red-600 border-red-700",         icon: CircleX },
                  refunded:                 { label: "Refunded",      className: "text-white bg-amber-600 border-amber-700",     icon: RotateCcw },
                  cancelled:                { label: "Cancelled",     className: "text-white bg-slate-600 border-slate-700",     icon: Ban },
                  processing:               { label: "Processing",    className: "text-white bg-blue-600 border-blue-700",       icon: Loader2 },
                  requires_customer_action: { label: "Action needed", className: "text-white bg-orange-600 border-orange-700",  icon: CircleAlert },
                  requires_payment_method:  { label: "Update card",   className: "text-white bg-orange-600 border-orange-700",  icon: CircleAlert },
                }
                const statusInfo = statusConfig[inv.status] ?? { label: inv.status, className: "text-muted-foreground bg-muted/40 border-border/40", icon: CircleAlert }
                return (
                  <TableRow key={inv.id} className="border-border/30 hover:bg-muted/20 transition-colors">
                    <TableCell className="text-sm text-muted-foreground py-4">{filteredInvoices.length - idx}</TableCell>
                    <TableCell className="text-sm font-mono text-foreground py-4 tracking-wide">
                      {inv.dodo_payment_id ?? inv.id.slice(0, 12).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground py-4">{plan ?? "—"}</TableCell>
                    <TableCell className="text-sm text-foreground py-4 capitalize">{cycle ?? "—"}</TableCell>
                    <TableCell className="text-sm text-foreground py-4">
                      {new Date(inv.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums text-foreground py-4">
                      {(getPlanPrice(inv.description) ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full", statusInfo.className)}>
                        <statusInfo.icon className="w-3 h-3" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      {inv.invoice_url ? (
                        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1.5 text-xs px-2.5 cursor-pointer" asChild>
                          <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
    </div>
  )
}


const TAB_ORDER = ["account", "security", "billing"]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 36 : -36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -36 : 36, opacity: 0 }),
}

// ── Main component ────────────────────────────────────────────────────────────
export function AccountInfoCard() {
  const authUser = useAuthStore((s) => s.user)
  const authStatus = useAuthStore((s) => s.status)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get("tab")
    return TAB_ORDER.includes(t ?? "") ? (t as string) : "account"
  })
  const directionRef = useRef(0)

  useEffect(() => {
    const t = searchParams.get("tab")
    if (t && TAB_ORDER.includes(t) && t !== activeTab) {
      const prev = TAB_ORDER.indexOf(activeTab)
      const next = TAB_ORDER.indexOf(t)
      directionRef.current = next > prev ? 1 : -1
      setActiveTab(t)
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    const prev = TAB_ORDER.indexOf(activeTab)
    const next = TAB_ORDER.indexOf(value)
    directionRef.current = next > prev ? 1 : -1
    setActiveTab(value)
    router.replace(`/profile?tab=${value}`, { scroll: false })
  }

  // Merge real auth data over mock defaults (billing/usage still mock until API ready)
  const user = {
    ...MOCK_USER,
    full_name: authUser?.full_name ?? MOCK_USER.full_name,
    email: authUser?.email ?? MOCK_USER.email,
    oauth_avatar_url: authUser?.oauth_avatar_url ?? null,
    oauth_provider: authUser?.oauth_provider ?? null,
    tier: (authUser?.tier ?? MOCK_USER.tier) as typeof MOCK_USER.tier,
    is_email_verified: authUser?.is_email_verified ?? MOCK_USER.is_email_verified,
    created_at: authUser?.created_at ?? MOCK_USER.created_at,
  }

  if (authStatus === "unknown") return <AccountInfoCardSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-3xl border border-border/60 bg-card dark:bg-background shadow-sm">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Tab bar */}
          <div className="pl-0 pr-4 bg-muted/40 flex w-full">
            <TabsList className="bg-transparent p-0 h-auto gap-1 rounded-none flex items-end border-0 w-full">
              {[
                { value: "account", label: "Account", soon: false },
                { value: "security", label: "Security", soon: false },
                { value: "billing", label: "Plan & Billing", soon: false },
              ].map((tab, i, arr) => {
                const prevTab = arr[i - 1]
                const isAfterActive = prevTab?.value === activeTab
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    disabled={tab.soon}
                    className={cn(
                      `relative px-5 pt-2.5 pb-2 text-sm transition-colors duration-150 -mb-px shadow-none ${i === 0 ? "rounded-tr-xl" : "rounded-t-xl"}`,
                      "data-[state=active]:bg-card dark:data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:font-bold data-[state=active]:shadow-none data-[state=active]:z-10 data-[state=active]:border data-[state=active]:border-border/60 data-[state=active]:border-b-card dark:data-[state=active]:border-b-background",
                      i === 0 && "data-[state=active]:border-l-0",
                      "data-[state=inactive]:bg-transparent data-[state=inactive]:border-0 data-[state=inactive]:text-muted-foreground data-[state=inactive]:font-medium",
                      "hover:text-foreground",
                      tab.soon && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {/* Concave junction notch on left when previous tab is active */}
                    {isAfterActive && (
                      <span className="absolute -left-2 bottom-0 w-2 h-2 overflow-hidden pointer-events-none">
                        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-br-xl bg-card" />
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      {tab.label}
                      {tab.soon && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide bg-muted border border-border/50 text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">
                          Soon
                        </span>
                      )}
                    </span>
                    {activeTab === tab.value && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-foreground rounded-t-full"
                        transition={{ type: "spring", damping: 30, stiffness: 400, mass: 0.8 }}
                      />
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {/* Tab content */}
          <div className="px-6 pt-5 pb-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={directionRef.current}>
              <motion.div
                key={activeTab}
                custom={directionRef.current}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {activeTab === "account" && <AccountTab user={user} />}
                {activeTab === "security" && <SecurityTab user={user} />}
                {activeTab === "billing" && <BillingTab user={user} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </div>
    </motion.div>
  )
}
