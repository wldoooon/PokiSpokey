"use client"

import * as React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, RefreshCwIcon, ArrowLeft, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

import { useForgotPasswordMutation, useResetPasswordMutation, useVerifyOtpMutation } from "@/lib/authHooks"
import { useRateLimitCountdown } from "@/hooks/useRateLimitCountdown"
import { useResendCooldown } from "@/hooks/useResendCooldown"
import axios from "axios"

const emailSchema = z.object({ email: z.string().email() })
const otpSchema = z.object({ otp: z.string().min(6, "Must be 6 digits") })
const resetSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

function getErrorMessage(err: unknown) {
    if (axios.isAxiosError(err)) {
        return err.response?.data?.detail || "Request failed"
    }
    return "Something went wrong"
}

export function PasswordResetWizard({ onBack }: { onBack: () => void }) {
    const [step, setStep] = useState<"email" | "otp" | "reset">("email")
    const [email, setEmail] = useState("")
    const [otpValue, setOtpValue] = useState("")
    const [otpError, setOtpError] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const forgotPasswordMutation = useForgotPasswordMutation()
    const verifyOtpMutation = useVerifyOtpMutation()
    const resetPasswordMutation = useResetPasswordMutation()

    // Rate-limit countdowns — one per mutation
    const forgotRateLimit = useRateLimitCountdown(forgotPasswordMutation.error)
    const verifyRateLimit = useRateLimitCountdown(verifyOtpMutation.error)
    const resetRateLimit = useRateLimitCountdown(resetPasswordMutation.error)

    // Resend cooldown for OTP step
    const { remaining: resendRemaining, isCoolingDown: resendCooling, start: startResendCooldown } = useResendCooldown(60)

    // Step 1: Email Form
    const emailForm = useForm<{ email: string }>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } })
    const onEmailSubmit = async (data: { email: string }) => {
        setEmail(data.email)
        try {
            await forgotPasswordMutation.mutateAsync({ email: data.email })
            setStep("otp")
        } catch { }
    }

    // Step 3: Reset Form
    const resetForm = useForm<{ password: string; confirmPassword: string }>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirmPassword: "" } })
    const onResetSubmit = async (data: { password: string; confirmPassword: string }) => {
        try {
            // Using the otp from state
            await resetPasswordMutation.mutateAsync({ email, otp: otpValue, new_password: data.password })
            // Success!
            onBack()
        } catch { }
    }

    if (step === "email") {
        return (
            <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="text-xl font-bold">Reset your password</CardTitle>
                    <CardDescription className="text-sm">
                        Enter your email address and we'll send you a verification code.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-4">
                    <Form {...emailForm}>
                        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                            <FormField
                                control={emailForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-bold text-foreground">Email address</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="name@example.com"
                                                {...field}
                                                className="block w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm h-auto"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {forgotPasswordMutation.isError && (
                                <p className="text-sm text-red-500 text-center">
                                    {forgotRateLimit ?? getErrorMessage(forgotPasswordMutation.error)}
                                </p>
                            )}

                            {/* Help Text */}
                            <p className="text-xs text-muted-foreground">
                                We'll send a 6-digit code to verify it's you.
                            </p>
                        </form>
                    </Form>
                </CardContent>

                {/* Divider + Send Button */}
                <div className="border-t border-border pt-4 mt-2">
                    <Button
                        type="submit"
                        variant="outline"
                        className="w-full h-11 bg-orange-500 text-white hover:text-white font-bold rounded-xl cursor-pointer hover:bg-orange-500 border-0"
                        disabled={forgotPasswordMutation.isPending}
                        onClick={emailForm.handleSubmit(onEmailSubmit)}
                    >
                        {forgotPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Code
                    </Button>
                </div>

                {/* Footer */}
                <CardFooter className="px-0 pt-4 justify-center">
                    <p className="text-xs text-muted-foreground">
                        Remember your password?{' '}
                        <button onClick={onBack} className="text-orange-500 hover:text-orange-600 font-medium relative cursor-pointer after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-orange-500 hover:after:w-full after:transition-all after:duration-300">
                            Back to login
                        </button>
                    </p>
                </CardFooter>
            </Card>
        )
    }

    if (step === "otp") {
        return (
            <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="text-xl font-bold">Verify your login</CardTitle>
                    <CardDescription className="text-sm">
                        Enter the verification code we sent to your email address: <span className="font-medium text-foreground">{email}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-4">
                    {/* Label Row */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-foreground">Verification code</label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-md bg-orange-500 text-white hover:text-white hover:bg-orange-600 border-0 font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => { forgotPasswordMutation.mutate({ email }); startResendCooldown(); }}
                            disabled={forgotPasswordMutation.isPending || resendCooling}
                        >
                            {forgotPasswordMutation.isPending
                                ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                : <RefreshCwIcon className="w-3 h-3 mr-1" />}
                            {resendCooling ? `Resend in ${resendRemaining}s` : "Resend Code"}
                        </Button>
                    </div>

                    {/* OTP Input - Centered, Bigger */}
                    <div className="flex justify-center">
                        <InputOTP
                            maxLength={6}
                            value={otpValue}
                            onChange={(value) => {
                                setOtpValue(value)
                                setOtpError("")
                            }}
                        >
                            <InputOTPGroup className="gap-1">
                                <InputOTPSlot index={0} className="w-12 h-14 text-xl rounded-lg border-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-100" />
                                <InputOTPSlot index={1} className="w-12 h-14 text-xl rounded-lg border-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-100" />
                                <InputOTPSlot index={2} className="w-12 h-14 text-xl rounded-lg border-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-100" />
                            </InputOTPGroup>
                            <InputOTPSeparator className="mx-2 text-muted-foreground">—</InputOTPSeparator>
                            <InputOTPGroup className="gap-1">
                                <InputOTPSlot index={3} className="w-12 h-14 text-xl rounded-lg border-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-100" />
                                <InputOTPSlot index={4} className="w-12 h-14 text-xl rounded-lg border-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-100" />
                                <InputOTPSlot index={5} className="w-12 h-14 text-xl rounded-lg border-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-slate-100" />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    {otpError && <p className="text-sm text-red-500 text-center">{otpError}</p>}
                    {verifyOtpMutation.isError && (
                        <p className="text-sm text-red-500 text-center">
                            {verifyRateLimit ?? getErrorMessage(verifyOtpMutation.error)}
                        </p>
                    )}

                    {/* Help Link */}
                    <p className="text-xs text-muted-foreground text-center">
                        <button className="text-orange-500 hover:text-orange-600 relative cursor-pointer after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-orange-500 hover:after:w-full after:transition-all after:duration-300">
                            I no longer have access to this email address.
                        </button>
                    </p>
                </CardContent>

                {/* Divider + Verify Button */}
                <div className="border-t border-border pt-4 mt-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 bg-orange-500 text-white hover:text-white font-bold rounded-xl cursor-pointer hover:bg-orange-500 border-0"
                        disabled={verifyOtpMutation.isPending}
                        onClick={async () => {
                            if (otpValue.length !== 6) {
                                setOtpError("Code must be 6 digits")
                                return
                            }
                            try {
                                await verifyOtpMutation.mutateAsync({ email, otp: otpValue })
                                setStep("reset")
                            } catch { }
                        }}
                    >
                        {verifyOtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify
                    </Button>
                </div>

                {/* Footer */}
                <CardFooter className="px-0 pt-4 justify-center">
                    <p className="text-xs text-muted-foreground">
                        Having trouble signing in?{' '}
                        <button onClick={() => setStep("email")} className="text-orange-500 hover:text-orange-600 font-medium relative cursor-pointer after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-orange-500 hover:after:w-full after:transition-all after:duration-300">
                            Contact support
                        </button>
                    </p>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-xl font-bold">Set new password</CardTitle>
                <CardDescription className="text-sm">
                    Create a strong password to secure your account.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <Form {...resetForm}>
                    <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                        <FormField
                            control={resetForm.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-bold text-foreground">New Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter your new password"
                                                {...field}
                                                className="block w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm h-auto pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={resetForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-bold text-foreground">Confirm Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm your new password"
                                                {...field}
                                                className="block w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm h-auto pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {resetPasswordMutation.isError && (
                            <p className="text-sm text-red-500 text-center">
                                {resetRateLimit ?? getErrorMessage(resetPasswordMutation.error)}
                            </p>
                        )}

                    </form>
                </Form>
            </CardContent>

            {/* Divider + Reset Button */}
            <div className="border-t border-border pt-4 mt-2">
                <Button
                    type="submit"
                    variant="outline"
                    className="w-full h-11 bg-orange-500 text-white hover:text-white font-bold rounded-xl cursor-pointer hover:bg-orange-500 border-0"
                    disabled={resetPasswordMutation.isPending}
                    onClick={resetForm.handleSubmit(onResetSubmit)}
                >
                    {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                </Button>
            </div>

            {/* Footer */}
            <CardFooter className="px-0 pt-4 justify-center">
                <p className="text-xs text-muted-foreground">
                    Remember your password?{' '}
                    <button onClick={onBack} className="text-orange-500 hover:text-orange-600 font-medium relative cursor-pointer after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-orange-500 hover:after:w-full after:transition-all after:duration-300">
                        Back to login
                    </button>
                </p>
            </CardFooter>
        </Card>
    )
}
