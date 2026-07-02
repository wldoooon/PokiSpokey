"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Clips, TranscriptResponse, SearchResponse } from "@/lib/types";
import { apiClient } from "@/lib/apiClient";
import { useUsageStore } from "@/stores/usage-store";

export const fetchSearchResults = async (
  query: string,
  language: string,
  category: string | null,
  subCategory: string | null,
  pageParam: number = 1,
) => {
  const params = new URLSearchParams();
  params.append("q", query);
  params.append("language", language);
  params.append("page", pageParam.toString());
  if (category) {
    params.append("category", category);
  }
  if (subCategory) {
    params.append("sub_category", subCategory);
  }

  const response = await apiClient.get<SearchResponse>(
    `/api/v1/search?${params.toString()}`,
  );

  // ── Live usage meter update ───────────────────────────────────────────────
  // The backend injects RateLimit-* headers on every search response.
  // Read them here and push into the store so the sidebar meter updates
  // immediately after each search without needing a full page refresh.
  const remaining = parseInt(response.headers["ratelimit-remaining"] ?? "", 10);
  const limit = parseInt(response.headers["ratelimit-limit"] ?? "", 10);
  if (!isNaN(remaining) && !isNaN(limit)) {
    useUsageStore.getState().updateUsage("search", {
      remaining,
      limit,
      current: Math.max(0, limit - remaining),
    });
  }
  // ── END live update ───────────────────────────────────────────────────────

  return response.data;
};


export const useSearch = (
  query: string,
  language: string = "english",
  category: string | null = null,
  subCategory: string | null = null,
) => {
  return useQuery<SearchResponse, Error>({
    queryKey: ["search", query, language, category, subCategory],
    queryFn: () =>
      fetchSearchResults(query, language, category, subCategory, 1),
    enabled: !!query && query.trim().length > 0, // Auto-fetch if query exists
    staleTime: 1000 * 60 * 5, // Cache results for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch just because I clicked the window
  });
};

export const useInfiniteSearch = (
  query: string,
  language: string = "english",
  category: string | null = null,
  subCategory: string | null = null,
) => {
  return useInfiniteQuery<SearchResponse, Error>({
    queryKey: ["searchInfinite", query, language, category, subCategory],
    queryFn: ({ pageParam = 1 }) =>
      fetchSearchResults(
        query,
        language,
        category,
        subCategory,
        pageParam as number,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !lastPage.hits) return undefined;
      
      const totalCollected = allPages.reduce((acc, page) => acc + page.hits.length, 0);
      
      // If we haven't reached the total yet, there's more to fetch
      if (totalCollected < lastPage.total) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: !!query && query.trim().length > 0,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const fetchTranscript = async (
  videoId: string,
  language: string,
  centerPosition?: number,
) => {
  const params = new URLSearchParams();
  params.append("language", language);
  if (centerPosition !== undefined) {
    params.append("center_position", centerPosition.toString());
  }
  const response = await apiClient.get<TranscriptResponse>(
    `/api/v1/videos/${videoId}/transcript?${params.toString()}`,
  );
  return response.data;
};

export const useTranscript = (
  videoId: string,
  language: string = "english",
  centerPosition?: number,
) => {
  return useQuery<TranscriptResponse, Error>({
    queryKey: ["transcript", videoId, language, centerPosition],
    queryFn: () => fetchTranscript(videoId, language, centerPosition),
    enabled: !!videoId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};

/**
 * Hook to prefetch transcripts for the next few clips in the playlist
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useTranscriptPrefetch = (
  playlist: any[],
  currentIndex: number,
  language: string = "english"
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!playlist || playlist.length === 0) return;

    // Prefetch current + next 2 clips (i=0 = current clip, so AudioCard gets a cache hit)
    const prefetchCount = 2;
    for (let i = 0; i <= prefetchCount; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < playlist.length) {
            const nextClip = playlist[nextIndex];
            
            queryClient.prefetchQuery({
                queryKey: ["transcript", nextClip.video_id, language, nextClip.position],
                queryFn: () => fetchTranscript(nextClip.video_id, language, nextClip.position),
                staleTime: 1000 * 60 * 5, // 5 minutes
            });
        }
    }
  }, [currentIndex, playlist, language, queryClient]);
};

// ── Translation ─────────────────────────────────────────────────────────────

type TranslateBatchResponse = {
  translations: string[];
  source_lang: string;
};

export const fetchTranslateBatch = async (
  sentences: string[],
  targetLang: string,
  sourceLang: string = "auto",
): Promise<TranslateBatchResponse> => {
  const response = await apiClient.post<TranslateBatchResponse>(
    "/api/v1/translate",
    { sentences, target_lang: targetLang, source_lang: sourceLang },
  );
  return response.data;
};

/**
 * Batch-translate all sentences for a clip in one API call.
 * Cache key includes position so same video at different timestamps gets its own cache entry.
 * staleTime: Infinity — translations never change.
 */
export const useTranslateBatch = (
  sentences: { sentence_text: string; start_time: number }[],
  videoId: string,
  position: number | undefined,
  targetLang: string | null,
) => {
  const sentenceTexts = sentences.map((s) => s.sentence_text);

  return useQuery<TranslateBatchResponse, Error>({
    queryKey: ["translation", videoId, position, targetLang, sentenceTexts.length],
    queryFn: () => fetchTranslateBatch(sentenceTexts, targetLang!, "auto"),
    enabled: !!videoId && !!targetLang && sentences.length > 0,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });
};

/**
 * Prefetch translations for the next 2 clips using a waterfall:
 * wait for transcript to be ready (cached or in-flight), then immediately fire translation.
 *
 * Fixes two bugs from the old approach:
 *  1. Off-by-one: started at i=0 (current clip), redundant with useTranslateBatch.
 *  2. Race condition: getQueryData snapshot was always empty while transcript was in-flight,
 *     so translation prefetch silently skipped every time.
 *
 * ensureQueryData deduplicates — if useTranscriptPrefetch already started the fetch,
 * this just attaches to the same promise and waits for it to resolve.
 */
export const useTranslationPrefetch = (
  playlist: any[],
  currentIndex: number,
  targetLang: string | null,
  language: string = "english",
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!playlist || playlist.length === 0 || !targetLang) return;

    for (let i = 1; i <= 2; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex >= playlist.length) continue;

      const clip = playlist[nextIndex];
      const transcriptKey = ["transcript", clip.video_id, language, clip.position] as const;
      // Wait for transcript (instant if cached, waits if in-flight, fetches if neither)
      queryClient
        .ensureQueryData<TranscriptResponse>({
          queryKey: transcriptKey,
          queryFn: () => fetchTranscript(clip.video_id, language, clip.position),
          staleTime: 1000 * 60 * 5,
        })
        .then((transcriptData) => {
          if (!transcriptData?.sentences?.length) return;
          const sentenceTexts = transcriptData.sentences.map((s: any) => s.sentence_text);
          const translationKey = ["translation", clip.video_id, clip.position, targetLang, sentenceTexts.length];
          if (queryClient.getQueryData(translationKey)) return;
          queryClient.prefetchQuery({
            queryKey: translationKey,
            queryFn: () => fetchTranslateBatch(sentenceTexts, targetLang, "auto"),
            staleTime: Infinity,
          });
        })
        .catch(() => {
          // Transcript fetch failed — translation will load on arrival, not a crash
        });
    }
  }, [currentIndex, playlist, targetLang, language, queryClient]);
};
