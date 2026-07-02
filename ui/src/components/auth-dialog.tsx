"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { X, Loader2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useMediaQuery } from "@/hooks/use-media-query"

import { LoginForm } from "./auth/login-form"
import { SignupForm } from "./auth/signup-form"
import { VerifyEmailForm } from "./auth/verify-email-form"
import { PasswordResetWizard } from "./auth/password-reset-wizard"
import { useGoogleOAuth } from "@/lib/useGoogleOAuth"

type Tab = "login" | "signup" | "verify_email" | "forgot_password"

export function AuthDialog({ defaultTab = "login", children, open: controlledOpen, onOpenChange: onControlledChange }: { defaultTab?: "login" | "signup", children?: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : internalOpen
    const setIsOpen = (val: boolean) => { if (!isControlled) setInternalOpen(val); onControlledChange?.(val) }
    const [tab, setTab] = useState<Tab>(defaultTab)
    const [pendingEmail, setPendingEmail] = useState("")
    const [pendingPassword, setPendingPassword] = useState("")
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { openGoogleOAuth } = useGoogleOAuth()
    const queryClient = useQueryClient()
    const isDesktop = useMediaQuery("(min-width: 768px)")

    const handleClose = () => {
        setIsOpen(false)
        setTimeout(() => {
            setTab(defaultTab)
            setError(null)
            setPendingEmail("")
            setPendingPassword("")
        }, 300)
    }

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (!open) {
            setTimeout(() => {
                setTab(defaultTab)
                setError(null)
                setPendingEmail("")
                setPendingPassword("")
            }, 300)
        } else {
            setTab(defaultTab)
            setError(null)
        }
    }

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true)
        setError(null)
        try {
            const mode = tab === 'signup' ? 'signup' : 'login'
            const result = await openGoogleOAuth(mode)
            if (result.success) {
                handleClose()
            } else if (result.error) {
                setError(result.error)
                console.error('Google OAuth failed:', result.error)
            }
        } finally {
            setIsGoogleLoading(false)
        }
    }

    const switchTab = (newTab: Tab) => {
        setTab(newTab)
        setError(null)
    }

    const handleSignupVerify = (email: string, password: string) => {
        setPendingEmail(email)
        setPendingPassword(password)
        setTab("verify_email")
    }

    const isVerifyStep = tab === "verify_email"
    const isForgotStep = tab === "forgot_password"
    const showHeader = !isVerifyStep && !isForgotStep

    /* ── Shared form body rendered in both Dialog and Drawer ── */
    const authBody = (
        <div className="relative bg-background p-5 sm:p-6 max-h-[85vh] md:max-h-[90vh] overflow-y-auto w-full custom-scrollbar">
            {/* Google OAuth Loading Overlay */}
            {isGoogleLoading && (
                <div className="absolute inset-0 z-40 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                    <div className="relative mb-3">
                        <div className="w-10 h-10 border-4 border-slate-200 dark:border-zinc-700 rounded-full" />
                        <div className="absolute inset-0 w-10 h-10 border-4 border-transparent border-t-orange-500 rounded-full animate-spin" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                        Connecting to Google...
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                        Complete sign-in in the popup window
                    </p>
                </div>
            )}

            {/* Close Button — mobile only; desktop uses the dialog-level button */}
            <button
                onClick={handleClose}
                className="md:hidden absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer z-50"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center">
                {/* Header + Google button — hidden on verify/forgot steps */}
                {showHeader && (
                    <>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
                            {tab === "login" ? "Welcome Back" : "Create an account"}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-5 text-center px-4">
                            {tab === "login"
                                ? "Log in to continue your language mastery."
                                : "Join and master fluency."}
                        </p>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isGoogleLoading}
                            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-white border border-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-100 transition-all group mb-4 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            ) : (
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            <span className="text-sm font-bold text-slate-700">
                                {tab === "login" ? "Log in with Google" : "Continue with Google"}
                            </span>
                        </button>

                        <div className="relative w-full mb-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100 dark:border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-3 text-slate-400 font-bold tracking-widest">
                                    or {tab === "login" ? "log in" : "sign up"} with email
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* Forms */}
                <div className="w-full">
                    {tab === "login" ? (
                        <LoginForm
                            onSuccess={() => setIsOpen(false)}
                            onForgot={() => setTab("forgot_password")}
                            onUnverified={handleSignupVerify}
                            externalError={error}
                        />
                    ) : tab === "signup" ? (
                        <SignupForm
                            onVerify={handleSignupVerify}
                            externalError={error}
                        />
                    ) : tab === "verify_email" ? (
                        <VerifyEmailForm
                            email={pendingEmail}
                            password={pendingPassword}
                            onSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ["me"] })
                                handleClose()
                            }}
                            onBack={() => switchTab("signup")}
                        />
                    ) : (
                        <PasswordResetWizard onBack={() => setTab("login")} />
                    )}
                </div>

                {/* Footer toggle */}
                {showHeader && (
                    <div className="mt-4 text-center border-t border-slate-100 dark:border-zinc-800 pt-4 w-full">
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                            {tab === "login" ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                onClick={() => switchTab(tab === "login" ? "signup" : "login")}
                                className="text-orange-500 hover:text-orange-600 font-bold relative cursor-pointer after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-orange-500 hover:after:w-full after:transition-all after:duration-300"
                            >
                                {tab === "login" ? "Sign up" : "Log in"}
                            </button>
                        </p>
                    </div>
                )}
            </div>
        </div>
    )

    /* ── Desktop: centered Dialog ── */
    if (isDesktop) {
        return (
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                {children && <DialogTrigger asChild>{children}</DialogTrigger>}
                <DialogContent
                    className="sm:max-w-[1100px] w-full p-0 overflow-hidden rounded-2xl border-none shadow-2xl duration-300 data-[state=open]:slide-in-from-bottom-3 data-[state=closed]:slide-out-to-bottom-2"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    showCloseButton={false}
                >
                    <DialogTitle className="sr-only">Authentication</DialogTitle>
                    <DialogDescription className="sr-only">Login, sign up, or recover password</DialogDescription>
                    <button
                        onClick={handleClose}
                        className="absolute top-3.5 right-3.5 z-50 p-2 text-muted-foreground bg-muted hover:text-foreground hover:bg-muted/80 rounded-full transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex min-h-[500px]">
                        <div className="hidden md:block w-1/2 shrink-0 relative overflow-hidden">
                            <img
                                src="/cancel-picture.jpg"
                                alt=""
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 right-[-6px] bg-gradient-to-l from-background to-transparent" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-y-auto flex items-center justify-center">
                            <div className="w-full max-w-[420px]">
                                {authBody}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    /* ── Mobile: bottom Drawer ── */
    return (
        <Drawer open={isOpen} onOpenChange={handleOpenChange}>
            {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
            <DrawerContent className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-3xl max-h-[92vh] z-[70]">
                <DrawerTitle className="sr-only">Authentication</DrawerTitle>
                <DrawerDescription className="sr-only">Login, sign up, or recover password</DrawerDescription>
                <div className="overflow-y-auto max-h-[88vh] custom-scrollbar">
                    {authBody}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
