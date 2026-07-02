"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/apiClient"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubscriptionInfo = {
  status: string
  plan: string
  billing_period: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
} | null

export type InvoiceRow = {
  id: string
  dodo_payment_id: string | null
  date: string
  description: string
  amount: number
  currency: string
  status: string
  invoice_url: string | null
}

export type PaymentMethod = {
  payment_method_id: string
  card_holder_name: string
  card_network: string
  card_type: string
  expiry_month: string
  expiry_year: string
  last4: string
  recurring_enabled: boolean
  last_used_at: string | null
}

// ── Plan prices (source of truth for display) ─────────────────────────────────

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  free:  { monthly: 0,  yearly: 0  },
  basic: { monthly: 7,  yearly: 5  },
  pro:   { monthly: 12, yearly: 9  },
  max:   { monthly: 20, yearly: 16 },
}

export function getPlanPrice(description: string): number | null {
  const [plan, cycle] = description.toLowerCase().split(" · ")
  const prices = PLAN_PRICES[plan?.trim()]
  if (!prices) return null
  return cycle?.trim() === "yearly" ? prices.yearly : prices.monthly
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useSubscriptionQuery() {
  return useQuery<SubscriptionInfo>({
    queryKey: ["billing", "subscription"],
    queryFn: async () => {
      const res = await apiClient.get<{ subscription: SubscriptionInfo }>("/billing/subscription")
      return res.data.subscription
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useInvoicesQuery() {
  return useQuery<InvoiceRow[]>({
    queryKey: ["billing", "invoices"],
    queryFn: async () => {
      const res = await apiClient.get<{ invoices: InvoiceRow[] }>("/billing/invoices")
      return res.data.invoices
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function usePaymentMethodsQuery() {
  return useQuery<PaymentMethod[]>({
    queryKey: ["billing", "payment-methods"],
    queryFn: async () => {
      const res = await apiClient.get<{ payment_methods: PaymentMethod[] }>("/billing/payment-methods")
      return res.data.payment_methods
    },
    staleTime: 1000 * 60 * 5,
  })
}
