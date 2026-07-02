"use client"

import { useEffect } from "react"
import axios from "axios"
import { useMeQuery } from "@/lib/authHooks"
import { useAuthStore } from "@/stores/auth-store"
import { useUsageStore } from "@/stores/usage-store"
import { apiClient } from "@/lib/apiClient"

function mapUsageResponse(data: Record<string, unknown>) {
  const monthly = data.monthly as Record<string, Record<string, number>> | undefined
  return {
    search: {
      current:   monthly?.search?.current   ?? 0,
      limit:     monthly?.search?.limit     ?? 0,
      remaining: monthly?.search?.remaining ?? 0,
    },
    ai_chat: {
      current:   monthly?.ai_chat?.current   ?? 0,
      limit:     monthly?.ai_chat?.limit     ?? 0,
      remaining: monthly?.ai_chat?.remaining ?? 0,
      balance:   monthly?.ai_chat?.balance   ?? 0,
    },
  }
}

// Mirrors ANONYMOUS_LIMITS in usage_service.py — only used when /api/v1/usage is unreachable
const GUEST_FALLBACK_USAGE = {
  search:  { current: 0, limit: 3, remaining: 3 },
  ai_chat: { current: 0, limit: 0, remaining: 0, balance: 0 },
}

export default function AuthSync() {
  const { data: me, isLoading } = useMeQuery()
  const setUser        = useAuthStore((s) => s.setUser)
  const setStatus      = useAuthStore((s) => s.setStatus)
  const currentStatus  = useAuthStore((s) => s.status)
  const setAllUsage    = useUsageStore((s) => s.setAllUsage)
  const resetUsage     = useUsageStore((s) => s.reset)

  // Proactively refresh the access token every 25 min so it never silently expires.
  useEffect(() => {
    if (!me) return
    const silentRefresh = async () => {
      try { await apiClient.post("/auth/refresh") } catch {}
    }
    silentRefresh()
    const interval = setInterval(silentRefresh, 25 * 60 * 1000)
    return () => clearInterval(interval)
  }, [me?.id])

  // Fetch authenticated user's usage — aborted immediately if logout fires first,
  // preventing stale Pro limits from overwriting the guest clear.
  useEffect(() => {
    if (!me?.id) return
    const controller = new AbortController()

    apiClient
      .get("/api/v1/usage", { signal: controller.signal })
      .then((res) => setAllUsage(mapUsageResponse(res.data)))
      .catch((err) => {
        if (axios.isCancel(err)) return
      })

    return () => controller.abort()
  }, [me?.id, setAllUsage])

  // Fetch guest limits after logout (or on first unauthenticated visit).
  // Falls back to Free-tier constants if the endpoint requires auth.
  useEffect(() => {
    if (currentStatus !== "guest") return
    const controller = new AbortController()

    apiClient
      .get("/api/v1/usage", { signal: controller.signal })
      .then((res) => setAllUsage(mapUsageResponse(res.data)))
      .catch((err) => {
        if (axios.isCancel(err)) return
        setAllUsage(GUEST_FALLBACK_USAGE)
      })

    return () => controller.abort()
  }, [currentStatus, setAllUsage])

  // Sync auth state → stores
  useEffect(() => {
    if (isLoading && currentStatus === "unknown") return

    if (me) {
      setUser(me)
      if (currentStatus !== "authenticated") setStatus("authenticated")
    } else if (!isLoading) {
      setUser(null)
      if (currentStatus !== "guest") {
        resetUsage()     // show skeleton immediately — guest fetch effect takes over
        setStatus("guest")
      }
    }
  }, [me, isLoading, setUser, setStatus, currentStatus, resetUsage])

  return null
}
