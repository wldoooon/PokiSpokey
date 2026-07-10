"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { LoginResponse, SignupResponse, UserRead } from "@/lib/authTypes";
import axios from "axios";

import { toastManager } from "@/components/ui/toast";
import { startTour } from "@/components/app-tour";

/**
 * After a fresh ["me"] refetch, check if the user hasn't seen the tour yet.
 * If so — mark it as seen in DB + cache, then fire the tour after a short delay
 * so any page transitions / dialogs have settled first.
 */
async function triggerTourIfNew(queryClient: QueryClient): Promise<void> {
  const user = queryClient.getQueryData<UserRead | null>(["me"]);
  if (!user || user.is_tour_seen) return;
  try {
    await apiClient.post("/auth/mark-tour-seen");
    queryClient.setQueryData<UserRead | null>(["me"], (prev) =>
      prev ? { ...prev, is_tour_seen: true } : prev
    );
  } catch {
    // non-critical — tour fires regardless
  }
  setTimeout(() => startTour(), 800);
}

export function useMeQuery() {
  return useQuery<UserRead | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<UserRead>("/auth/me");
        return res.data;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          return null;
        }
        throw err;
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 30,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const res = await apiClient.post<LoginResponse>("/auth/login", vars);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["me"] });
      await triggerTourIfNew(queryClient);
      toastManager.add({ title: "Welcome back!", type: "success" });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ message: string }>("/auth/logout");
      return res.data;
    },
    onSuccess: () => {
      // setQueryData immediately marks user as null — no refetch triggered
      queryClient.setQueryData(["me"], null);
      toastManager.add({ title: "Signed out successfully", type: "info" });
    },
  });
}

export function useSignupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      email: string;
      password: string;
      full_name?: string;
    }) => {
      const res = await apiClient.post<SignupResponse>("/auth/signup", vars);
      return res.data;
    },
    // Note: signup does not set a cookie currently; the page can chain signup -> login.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (vars: { email: string }) => {
      const res = await apiClient.post<{ message: string }>(
        "/auth/forgot-password",
        vars,
      );
      return res.data;
    },
    onSuccess: () => {
      toastManager.add({ title: "Code sent!", description: "Check your inbox for the 6-digit code.", type: "info" });
    },
  });
}

export function useVerifyOtpMutation() {
  return useMutation({
    mutationFn: async (vars: { email: string; otp: string }) => {
      const res = await apiClient.post<{ message: string }>(
        "/auth/verify-reset-otp",
        vars,
      );
      return res.data;
    },
  });
}

// For signup email verification — /auth/verify-email sets cookie in one step, no separate login needed
export function useVerifyEmailMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { email: string; otp: string }) => {
      const res = await apiClient.post<{ message: string }>(
        "/auth/verify-email",
        vars,
      );
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["me"] });
      await triggerTourIfNew(queryClient);
      toastManager.add({ title: "Email verified!", description: "Welcome aboard — you're all set.", type: "success" });
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { full_name: string }) => {
      const res = await apiClient.patch<UserRead>("/auth/me", vars);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toastManager.add({ title: "Profile updated", type: "success" });
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (vars: {
      email: string;
      otp: string;
      new_password: string;
    }) => {
      const res = await apiClient.post<{ message: string }>(
        "/auth/reset-password",
        vars,
      );
      return res.data;
    },
    onSuccess: () => {
      toastManager.add({ title: "Password updated!", description: "Your new password is active. You can now log in.", type: "success" });
    },
  });
}
