"use client"

import { Suspense } from "react"
import { AccountInfoCard } from "@/components/features/profile/account-info-card"

export default function ProfilePage() {
  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, security and billing</p>
        </div>
        <Suspense>
          <AccountInfoCard />
        </Suspense>
      </div>
    </div>
  )
}
