"use client";

import { create } from "zustand";

export type FeatureUsage = {
  current: number;
  limit: number;
  remaining: number;
  balance?: number;
  reset_at?: string;
};

type UsageState = {
  usage: Record<string, FeatureUsage>;
  isLoaded: boolean;
  updateUsage: (feature: string, usage: Partial<FeatureUsage>) => void;
  setAllUsage: (usage: Record<string, FeatureUsage>) => void;
  reset: () => void;
};

export const useUsageStore = create<UsageState>()((set) => ({
  usage: {},
  isLoaded: false,
  updateUsage: (feature, newUsage) =>
    set((state) => ({
      usage: {
        ...state.usage,
        [feature]: {
          ...(state.usage[feature] || {
            current: 0,
            limit: 0,
            remaining: 0,
          }),
          ...newUsage,
        },
      },
    })),
  setAllUsage: (usage) => set({ usage, isLoaded: true }),
  reset: () => set({ usage: {}, isLoaded: false }),
}));

