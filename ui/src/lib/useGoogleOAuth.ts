/**
 * Google OAuth Hook
 *
 * Handles the popup-based OAuth flow for Google authentication.
 *
 * How it works:
 * 1. Opens a popup window pointing to /auth/google/login
 * 2. Popup goes through Google authentication
 * 3. Backend callback sets auth cookie and returns HTML with postMessage
 * 4. This hook listens for the message and resolves the promise
 * 5. On success, invalidates the "me" query to refetch full user profile
 */

import { useCallback, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useQueryClient } from "@tanstack/react-query";

const OAUTH_POPUP_WIDTH = 500;
const OAUTH_POPUP_HEIGHT = 600;
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute max timeout for popup

// For OAuth, we need the direct backend URL (not proxied through Next.js)
// because Google redirects directly to the backend callback
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5001";

interface OAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    tier: string;
  };
  error?: string;
}

export function useGoogleOAuth() {
  const popupRef = useRef<Window | null>(null);
  const resolveRef = useRef<((result: OAuthResult) => void) | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const queryClient = useQueryClient();

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Listen for messages from the popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from our backend
      // In development, allow some flexibility for localhost vs 127.0.0.1
      const isAllowedOrigin =
        event.origin === BACKEND_URL ||
        event.origin.includes("localhost:5001") ||
        event.origin.includes("127.0.0.1:5001");

      if (!isAllowedOrigin) {
        return;
      }
      const { type, user, error } = event.data;

      if (type === "oauth-success") {
        // Trigger background refetch immediately (don't await)

        // This is the ONLY way to get into 'authenticated' status

        queryClient.invalidateQueries({ queryKey: ["me"] });

        if (resolveRef.current) {
          resolveRef.current({ success: true });

          resolveRef.current = null;
        }
      } else if (type === "oauth-error") {
        if (resolveRef.current) {
          resolveRef.current({ success: false, error });
          resolveRef.current = null;
        }
      }

      // Close popup if still open
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }

      cleanup();
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      cleanup();
    };
  }, [setUser, setStatus, queryClient, cleanup]);

  // Open the OAuth popup
  const openGoogleOAuth = useCallback(
    (mode: "login" | "signup" = "login"): Promise<OAuthResult> => {
      return new Promise((resolve) => {
        // Store resolver for when popup responds
        resolveRef.current = resolve;

        // Calculate popup position (center of screen)
        const left =
          window.screenX + (window.innerWidth - OAUTH_POPUP_WIDTH) / 2;
        const top =
          window.screenY + (window.innerHeight - OAUTH_POPUP_HEIGHT) / 2;

        // Open popup with mode parameter
        const popup = window.open(
          `${BACKEND_URL}/auth/google/login?mode=${mode}`,
          "google-oauth",
          `width=${OAUTH_POPUP_WIDTH},height=${OAUTH_POPUP_HEIGHT},left=${left},top=${top},scrollbars=yes`,
        );

        if (!popup) {
          resolve({
            success: false,
            error: "Popup blocked. Please allow popups for this site.",
          });
          return;
        }

        popupRef.current = popup;

        // Poll to check if popup was closed without completing.
        // We add a short delay before resolving as "cancelled" so any in-flight
        // postMessage from the popup has time to be delivered and processed first.
        pollTimerRef.current = setInterval(() => {
          if (popup.closed) {
            cleanup();
            if (resolveRef.current) {
              setTimeout(() => {
                if (resolveRef.current) {
                  resolveRef.current({
                    success: false,
                    error: "Authentication cancelled",
                  });
                  resolveRef.current = null;
                }
              }, 300);
            }
          }
        }, 500);

        // Safety: max timeout so the promise doesn't hang forever
        timeoutRef.current = setTimeout(() => {
          cleanup();
          if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close();
          }
          if (resolveRef.current) {
            resolveRef.current({
              success: false,
              error: "Authentication timed out. Please try again.",
            });
            resolveRef.current = null;
          }
        }, OAUTH_TIMEOUT_MS);
      });
    },
    [cleanup],
  );

  return { openGoogleOAuth };
}
