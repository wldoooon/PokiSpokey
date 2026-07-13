"use client";

import { useState, useEffect } from "react";

const LANGUAGE_MAP: Record<string, string> = {
    english: "en-US",
    germany: "de-DE",
    french:  "fr",
    spanish: "es",
};

export function useLanguageTool(query: string, language: string) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed || trimmed.length < 2) {
            setSuggestions([]);
            return;
        }

        const ltLang = LANGUAGE_MAP[language.toLowerCase()] ?? "en-US";
        const controller = new AbortController();

        const fetchSuggestions = async () => {
            setIsLoading(true);
            try {
                const body = new URLSearchParams({ language: ltLang, text: trimmed });
                const res = await fetch("https://api.languagetool.org/v2/check", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: body.toString(),
                    signal: controller.signal,
                });

                if (!res.ok) { setSuggestions([]); return; }

                const data = await res.json();
                const words: string[] = [];

                for (const match of data.matches ?? []) {
                    if (match.rule?.issueType !== "misspelling") continue;
                    for (const r of match.replacements?.slice(0, 3) ?? []) {
                        const w = r.value?.toLowerCase();
                        if (w && !words.includes(w)) words.push(w);
                    }
                }

                setSuggestions(words.slice(0, 5));
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                setSuggestions([]);
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        };

        const id = setTimeout(fetchSuggestions, 400);
        return () => { clearTimeout(id); controller.abort(); };
    }, [query, language]);

    return { suggestions, isLoading };
}
