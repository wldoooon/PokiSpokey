"use client"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { usePaymentMethodsQuery } from "@/lib/billingHooks"
import type { PaymentMethod } from "@/lib/billingHooks"
import {
  SiVisa,
  SiMastercard,
  SiAmericanexpress,
  SiDiscover,
  SiDinersclub,
  SiJcb,
} from "@icons-pack/react-simple-icons"

// ── Network config ─────────────────────────────────────────────────────────────

const NETWORK_CONFIG: Record<string, {
  icon: React.ComponentType<{ color?: string; size?: number; className?: string }>
  color: string
  label: string
}> = {
  visa:             { icon: SiVisa,           color: "#1A1F71", label: "Visa" },
  mastercard:       { icon: SiMastercard,      color: "#EB001B", label: "Mastercard" },
  amex:             { icon: SiAmericanexpress, color: "#2E77BC", label: "American Express" },
  americanexpress:  { icon: SiAmericanexpress, color: "#2E77BC", label: "American Express" },
  discover:         { icon: SiDiscover,        color: "#FF6600", label: "Discover" },
  dinersclub:       { icon: SiDinersclub,      color: "#004A97", label: "Diners Club" },
  diners:           { icon: SiDinersclub,      color: "#004A97", label: "Diners Club" },
  jcb:              { icon: SiJcb,             color: "#003087", label: "JCB" },
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NetworkLogo({ network }: { network: string }) {
  const config = NETWORK_CONFIG[network]
  if (!config) return (
    <div className="shrink-0 flex items-center justify-center w-16 h-10 rounded-md bg-muted border border-border/20">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{network}</span>
    </div>
  )
  const Icon = config.icon
  return (
    <div className="shrink-0 flex items-center justify-center w-16 h-10 rounded-md bg-white dark:bg-white shadow-sm border border-border/20">
      <Icon color={config.color} size={38} />
    </div>
  )
}

function InfoCol({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-sm font-medium text-foreground truncate", valueClass)}>{value}</p>
    </div>
  )
}

function CardRow({ method }: { method: PaymentMethod }) {
  const network = method.card_network.toLowerCase()
  const label = NETWORK_CONFIG[network]?.label ?? method.card_network

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4">
      <div className="flex items-center gap-3 shrink-0">
        <NetworkLogo network={network} />
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground font-mono tracking-wide">•••• {method.last4}</p>
        </div>
      </div>

      <InfoCol label="Card holder" value={method.card_holder_name || "—"} />
      <InfoCol label="Expiry date" value={`${method.expiry_month}/${method.expiry_year}`} />
      <InfoCol label="Card type" value={method.card_type ? method.card_type.charAt(0).toUpperCase() + method.card_type.slice(1) : "—"} />
      <InfoCol
        label="Auto-renewal"
        value={method.recurring_enabled ? "On" : "Off"}
        valueClass={method.recurring_enabled ? "text-foreground" : "text-muted-foreground"}
      />
    </div>
  )
}

function CardRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4">
      <div className="flex items-center gap-3 shrink-0">
        <Skeleton className="w-16 h-10 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
      <div className="space-y-1.5"><Skeleton className="h-3 w-16 rounded" /><Skeleton className="h-4 w-28 rounded" /></div>
      <div className="space-y-1.5"><Skeleton className="h-3 w-16 rounded" /><Skeleton className="h-4 w-14 rounded" /></div>
      <div className="space-y-1.5"><Skeleton className="h-3 w-14 rounded" /><Skeleton className="h-4 w-12 rounded" /></div>
      <div className="space-y-1.5"><Skeleton className="h-3 w-16 rounded" /><Skeleton className="h-4 w-8 rounded" /></div>
    </div>
  )
}

// ── Exported component ────────────────────────────────────────────────────────

export function PaymentCards() {
  const { data: methods = [], isLoading: loading } = usePaymentMethodsQuery()

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-foreground">Payment information</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your payment methods</p>
      </div>
      <Separator />
      <div className="space-y-2">
        {loading ? (
          <CardRowSkeleton />
        ) : methods.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No payment methods on file.</p>
        ) : (
          methods.map(m => <CardRow key={m.payment_method_id} method={m} />)
        )}
      </div>
    </div>
  )
}
