"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLoginMutation } from "@/lib/authHooks"
import { useRateLimitCountdown } from "@/hooks/useRateLimitCountdown"
import axios from "axios"

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

function getErrorMessage(err: unknown) {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as any
        return data?.detail || data?.message || "Authentication failed"
    }
    if (err instanceof Error) return err.message
    return "Authentication failed"
}

export function LoginForm({ onSuccess, onForgot, onUnverified, externalError }: { onSuccess: () => void, onForgot: () => void, onUnverified: (email: string, pass: string) => void, externalError?: string | null }) {
    const loginMutation = useLoginMutation()
    const loginRateLimit = useRateLimitCountdown(loginMutation.error)
    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    })

    const [showPassword, setShowPassword] = useState(false)

    async function onSubmit(values: LoginValues) {
        try {
            await loginMutation.mutateAsync(values)
            onSuccess()
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail
                if (detail?.error_code === "EMAIL_NOT_VERIFIED") {
                    onUnverified(values.email, values.password)
                }
            }
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Email</label>
                            <FormControl>
                                <Input
                                    placeholder="name@company.com"
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
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
                            </div>

                            <FormControl>
                                <div className="relative group">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        className="block w-full px-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 focus-visible:border-orange-500 transition-all font-medium text-sm h-auto pr-10"
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
                            <div className="flex justify-end">
                                <button type="button" onClick={onForgot} className="text-xs font-bold text-orange-500 hover:text-orange-600 relative cursor-pointer after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-orange-500 hover:after:w-full after:transition-all after:duration-300">
                                    Forgot password?
                                </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {(loginMutation.isError || externalError) && (
                    <div className="text-sm text-destructive font-bold ml-1 mt-1">
                        {externalError || loginRateLimit || getErrorMessage(loginMutation.error)}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full h-11 bg-orange-500 text-white hover:text-white font-bold rounded-xl cursor-pointer hover:bg-orange-500 border-0"
                >
                    {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log In
                </Button>
            </form>
        </Form>
    )
}
