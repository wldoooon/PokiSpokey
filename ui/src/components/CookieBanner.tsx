"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const hasConsented = localStorage.getItem("pokispokey_cookie_consent")
        if (hasConsented) return

        let timeout: ReturnType<typeof setTimeout>

        const show = () => {
            timeout = setTimeout(() => setIsVisible(true), 1000)
        }

        // If onboarding is already done (returning user), show normally.
        // Otherwise wait for onboarding to finish before appearing.
        if (localStorage.getItem("vl_welcome_done")) {
            show()
        } else {
            window.addEventListener("vl:onboarding-done", show, { once: true })
        }

        return () => {
            clearTimeout(timeout)
            window.removeEventListener("vl:onboarding-done", show)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem("pokispokey_cookie_consent", "true")
        setIsVisible(false)
    }

    const handleDecline = () => {
        // Even if they decline, we remember that they made a choice so we don't bother them again.
        // In a real app, you would also use this state to disable non-essential tracking scripts.
        localStorage.setItem("pokispokey_cookie_consent", "declined")
        setIsVisible(false)
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto z-[100] sm:max-w-[400px]"
                >
                    <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-4 sm:p-5 relative overflow-hidden">

                        {/* Shimmer sweep */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent"
                                style={{ transform: "translateX(-100%)", animation: "shimmer 2.4s ease-in-out infinite" }}
                            />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 flex items-center justify-center">
                                        <Image src="/cookie.png" alt="Cookie" width={24} height={24} />
                                    </div>
                                    <h3 className="font-bold text-foreground text-base tracking-tight">
                                        We value your privacy
                                    </h3>
                                </div>
                                <button
                                    onClick={handleDecline}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                We use essential cookies to make PokiSpokey work, and optional cookies to remember your preferences and improve your language journey.
                                By clicking accept, you agree to our <Link href="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full sm:flex-1 rounded-xl h-10 border-border/50 font-medium hover:bg-muted cursor-pointer"
                                    onClick={handleDecline}
                                >
                                    Decline Optional
                                </Button>
                                <Button
                                    className="w-full sm:flex-1 rounded-xl h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold border-0 shadow-sm cursor-pointer"
                                    onClick={handleAccept}
                                >
                                    Accept All
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
