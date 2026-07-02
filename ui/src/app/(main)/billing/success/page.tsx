"use client"

import { Suspense, useState, useEffect } from "react"
import { motion } from "motion/react"
import { Download, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PaymentSuccessIcon } from "@/components/features/billing/payment-success-icon"
import { useInvoicesQuery, useSubscriptionQuery, getPlanPrice } from "@/lib/billingHooks"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

// ── Helpers ───────────────────────────────────────────────────────────────────

function Row({ label, value, valueEl }: {
  label: string
  value?: string
  valueEl?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {valueEl ?? <span className="text-sm font-medium text-foreground text-right">{value}</span>}
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <Skeleton className="h-4 w-20 rounded" />
      <Skeleton className="h-4 w-28 rounded" />
    </div>
  )
}

function TicketDivider() {
  return (
    <div className="relative -mx-8 flex items-center">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background border border-border/60 z-20" />
      <div className="flex-1 mx-5 border-t border-dashed border-border/50" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-background border border-border/60 z-20" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SuccessContent() {
  const queryClient = useQueryClient()
  const { data: invoices = [], isLoading } = useInvoicesQuery()
  const { data: sub } = useSubscriptionQuery()
  const [polling, setPolling] = useState(true)

  // Force fresh fetch on mount (bypass staleTime)
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] })
  }, [queryClient])

  // Poll every 2s until the latest invoice appears (webhook takes a few seconds)
  useEffect(() => {
    if (invoices.length > 0) { setPolling(false); return }
    if (!polling) return
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["billing", "invoices"] })
    }, 2000)
    return () => clearTimeout(timer)
  }, [invoices, polling, queryClient])

  // Hard stop after 12 seconds
  useEffect(() => {
    const timer = setTimeout(() => setPolling(false), 12000)
    return () => clearTimeout(timer)
  }, [])

  // When invoice arrives, refresh subscription + user tier in the rest of the app
  useEffect(() => {
    if (invoices.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["billing", "subscription"] })
      queryClient.invalidateQueries({ queryKey: ["me"] })
    }
  }, [invoices.length, queryClient])

  const inv = invoices[0] ?? null
  const waiting = isLoading || !inv
  const [plan, cycle] = (inv?.description ?? "").split(" · ")

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">

        {/* Ticket card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative rounded-2xl border border-border/60 bg-card shadow-lg"
        >
          {/* Top — icon + title */}
          <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6">
            <PaymentSuccessIcon />
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.25 }}
              className="text-center"
            >
              <h1 className="text-xl font-bold text-foreground">Payment Successful</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {waiting ? "Activating your plan…" : "Your plan has been activated"}
              </p>
            </motion.div>
          </div>

          <TicketDivider />

          {/* Details — two columns */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.25 }}
            className="grid grid-cols-2 divide-x divide-border/40"
          >
            {/* Payment Details */}
            <div className="px-8 pt-5 pb-6 space-y-0.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Payment Details
              </p>
              {waiting ? (
                <>{[1, 2, 3, 4].map(i => <RowSkeleton key={i} />)}</>
              ) : (
                <>
                  <Row
                    label="Invoice"
                    value={(() => {
                      const id = inv?.dodo_payment_id ?? inv?.id ?? ""
                      return id.length > 12 ? `${id.slice(0, 12)}…` : id
                    })()}
                  />
                  <Row
                    label="Date"
                    value={new Date(inv!.date).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  />
                  <Row
                    label="Status"
                    valueEl={
                      <Badge className="text-white bg-emerald-600 border-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                        Successful
                      </Badge>
                    }
                  />
                  <Row
                    label="Amount"
                    valueEl={
                      <span className="text-sm font-bold text-foreground">
                        {(getPlanPrice(inv!.description) ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                      </span>
                    }
                  />
                </>
              )}
            </div>

            {/* Plan Details */}
            <div className="px-8 pt-5 pb-6 space-y-0.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Plan Details
              </p>
              {waiting ? (
                <>{[1, 2, 3].map(i => <RowSkeleton key={i} />)}</>
              ) : (
                <>
                  <Row label="Plan" value={plan ?? "—"} />
                  <Row label="Billing Cycle" value={cycle ?? "—"} />
                  <Row
                    label="Total"
                    valueEl={
                      <span className="text-sm font-bold text-foreground">
                        {(getPlanPrice(inv!.description) ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                        {" / "}{cycle?.toLowerCase() === "yearly" ? "yr" : "mo"}
                      </span>
                    }
                  />
                  {sub?.current_period_end && (
                    <Row
                      label={sub.cancel_at_period_end ? "Ends on" : "Renews on"}
                      value={new Date(sub.current_period_end).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    />
                  )}
                </>
              )}
            </div>
          </motion.div>

          <TicketDivider />

          {/* Download */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.25 }}
            className="px-8 py-5"
          >
            {inv?.invoice_url ? (
              <Button className="w-full rounded-xl h-10 gap-2 text-sm" asChild>
                <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                  Download PDF Receipt
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full rounded-xl h-10 gap-2 text-sm"
                disabled={waiting}
              >
                {waiting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing receipt…</>
                  : <><Download className="h-4 w-4" /> Download PDF Receipt</>
                }
              </Button>
            )}
          </motion.div>
        </motion.div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.25 }}
          className="flex justify-center mt-5"
        >
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to profile
          </Link>
        </motion.div>

      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
