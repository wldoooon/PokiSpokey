"use client";

import { useState, useEffect } from "react";

export interface Suggestion {
  word: string;
  score: number;
}

const WIKTIONARY_LANG: Record<string, string> = {
  Germany: "de",
  French:  "fr",
  Spanish: "es",
};

async function fetchEnglish(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch(
    `https://api.datamuse.com/sug?s=${encodeURIComponent(query)}`,
    { signal }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.slice(0, 5);
}

async function fetchWiktionary(query: string, lang: string, signal: AbortSignal): Promise<Suggestion[]> {
  const url = `https://${lang}.wiktionary.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&namespace=0&format=json&origin=*`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  const words: string[] = (data[1] ?? []).filter((w: string) => !w.includes(" "));
  return words.slice(0, 5).map((word, i) => ({ word, score: 100 - i }));
}

export function useDatamuse(query: string, language: string = "English") {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const fetchSuggestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const wiktLang = WIKTIONARY_LANG[language];
        const results = wiktLang
          ? await fetchWiktionary(trimmedQuery, wiktLang, controller.signal)
          : await fetchEnglish(trimmedQuery, controller.signal);
        setSuggestions(results);
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [query, language]);

  return { suggestions, isLoading, error };
}
