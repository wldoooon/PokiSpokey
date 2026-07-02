"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useSignupMutation } from "@/lib/authHooks"
import { useRateLimitCountdown } from "@/hooks/useRateLimitCountdown"
import axios from "axios"

const signupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

type SignupValues = z.infer<typeof signupSchema>

function getErrorMessage(err: unknown) {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as any
        return data?.detail || data?.message || "Authentication failed"
    }
    if (err instanceof Error) return err.message
    return "Authentication failed"
}

export function SignupForm({ onVerify, externalError }: { onVerify: (email: string, password: string) => void, externalError?: string | null }) {
    const signupMutation = useSignupMutation()
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const form = useForm<SignupValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: { email: "", password: "", confirmPassword: "" },
    })

    async function onSubmit(values: SignupValues) {
        try {
            await signupMutation.mutateAsync({
                email: values.email,
                password: values.password,
            })
            // Signup OK → OTP sent → parent switches to verify step
            onVerify(values.email, values.password)
        } catch { }
    }

    const isBusy = signupMutation.isPending
    const error = signupMutation.error
    const signupRateLimit = useRateLimitCountdown(error)


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Full Name Field Removed */}

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Email</label>
                            <FormControl>
                                <Input
                                    placeholder="Email"
                                    className="block w-full px-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm h-auto"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                            <FormControl>
                                <div className="relative group">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        className="block w-full px-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm h-auto pr-10"
                                        {...field}
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
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Confirm Password</label>
                            <FormControl>
                                <div className="relative group">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        className="block w-full px-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-sm h-auto pr-10"
                                        {...field}
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

                {(signupMutation.isError || externalError) && (
                    <div className="text-sm text-destructive font-bold ml-1 mt-1">
                        {externalError || signupRateLimit || getErrorMessage(error)}
                    </div>
                )}

                <div className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed mt-2 pb-2">
                    By creating an account, you agree to our <Link href="/terms" className="text-slate-700 dark:text-slate-300 hover:text-orange-500 font-bold underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2 transition-colors">Terms of Service</Link> and <Link href="/privacy" className="text-slate-700 dark:text-slate-300 hover:text-orange-500 font-bold underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2 transition-colors">Privacy Policy</Link>.
                </div>

                <Button
                    type="submit"
                    disabled={isBusy}
                    className="w-full h-11 bg-orange-500 text-white hover:text-white font-bold rounded-xl cursor-pointer hover:bg-orange-500 border-0"
                >
                    {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                </Button>
            </form>
        </Form>
    )
}
