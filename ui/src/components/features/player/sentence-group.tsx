"use client"

import { memo, useRef, useEffect, useId } from "react"
import { TranscriptWord } from "./transcript-word"

type Word = { text: string; start: number; end: number }
type Sentence = {
  start_time: number
  end_time: number
  sentence_text?: string
  words?: Word[]
}

type SentenceGroupProps = {
  group: Sentence[]
  searchQuery: string
  onSearchWord?: (word: string) => void
  onExplainWordInContext?: (payload: { word: string; sentence: string }) => void
}

const HIGHLIGHT_BG = "oklch(0.708 0.195 38.402 / 0.35)"

export const SentenceGroup = memo(({
  group,
  searchQuery,
  onSearchWord,
  onExplainWordInContext,
}: SentenceGroupProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Each instance gets a unique highlight key so multiple SentenceGroup
  // components (prev/active/next) don't overwrite each other in the global
  // CSS.highlights registry.
  const rawId = useId()
  const highlightKey = `ts-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`

  // Inject a per-instance ::highlight() rule. CSS variables don't work inside
  // ::highlight() rules — use hardcoded oklch values from --primary.
  useEffect(() => {
    if (!CSS.highlights) return
    const styleId = `hl-style-${highlightKey}`
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style")
      style.id = styleId
      style.textContent = `::highlight(${highlightKey}) { background-color: ${HIGHLIGHT_BG}; }`
      document.head.appendChild(style)
    }
    return () => {
      document.getElementById(styleId)?.remove()
      CSS.highlights?.delete(highlightKey)
    }
  }, [highlightKey])

  // CSS Custom Highlight API — works for all languages including CJK.
  //
  // Key fix: build a per-character position map (charMap) that skips ALL
  // whitespace characters. This means fullText never has spaces regardless
  // of how TranscriptWord renders (inline space, trailing space, etc.).
  // Intl.Segmenter splits the query into natural Japanese word segments so
  // multi-morpheme queries like '食べる時間' are each found independently.
  useEffect(() => {
    if (!CSS.highlights) return
    CSS.highlights.delete(highlightKey)

    const query = searchQuery.trim()
    if (!query || !containerRef.current) return

    // Build a char-level map skipping all whitespace.
    // charMap[i] = { node, offset } for the i-th non-whitespace char.
    const walker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT)
    const charMap: { node: Text; offset: number }[] = []
    let fullText = ""

    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      const content = node.textContent ?? ""
      for (let i = 0; i < content.length; i++) {
        if (/\s/.test(content[i])) continue
        charMap.push({ node, offset: i })
        fullText += content[i].toLowerCase()
      }
    }

    if (!fullText) return

    // Match the WHOLE query as one contiguous string. fullText has all
    // whitespace stripped, so the phrase matches across token boundaries
    // (e.g. 'ありがとうございます' spans the tokens ありがとう+ご+ざ+い+ます).
    // Do NOT segment the query into morphemes — highlighting each segment
    // independently lights up every 'ます'/'ござい' in the transcript.
    const term = query.toLowerCase().replace(/\s+/g, "")
    if (!term) return

    const ranges: Range[] = []
    let pos = fullText.indexOf(term)
    while (pos !== -1) {
      const end = pos + term.length
      if (end <= charMap.length) {
        const range = new Range()
        range.setStart(charMap[pos].node, charMap[pos].offset)
        range.setEnd(charMap[end - 1].node, charMap[end - 1].offset + 1)
        ranges.push(range)
      }
      pos = fullText.indexOf(term, pos + 1)
    }

    if (ranges.length > 0) {
      CSS.highlights.set(highlightKey, new Highlight(...ranges))
    }
  }, [searchQuery, group, highlightKey])

  return (
    <div className="flex items-center justify-center text-center px-4 py-1">
      <div ref={containerRef} className="relative text-sm sm:text-2xl font-medium leading-snug inline-block text-foreground tracking-tight">
        {group.map((sentence, sIdx) => {
          const rawWords: Word[] = (sentence.words as Word[] | undefined) || []

          const hasWordLevelData = rawWords.length > 1 &&
            rawWords.every(w => w.text && !w.text.trim().includes(' ')) &&
            rawWords.some(w => w.start > 0 || w.end > 0)

          const queryNorm = searchQuery.trim().toLowerCase().replace(/\s/g, "")

          let words: Word[] = rawWords
          if (!hasWordLevelData && sentence.sentence_text) {
            const cleanText = sentence.sentence_text.replace(/<[^>]*>/g, '')
            const duration = sentence.end_time - sentence.start_time

            // Use Intl.Segmenter to split CJK/Japanese sentences into real words.
            // Falls back to whitespace split for Latin text or unsupported envs.
            let parts: string[] = []
            try {
              if ("Segmenter" in Intl) {
                const seg = new (Intl as any).Segmenter("ja", { granularity: "word" })
                parts = [...seg.segment(cleanText)]
                  .map((s: any) => s.segment as string)
                  .filter(s => s.trim().length > 0)
              }
            } catch {}
            if (!parts.length) {
              parts = cleanText.split(/\s+/).filter(t => t.length > 0)
            }

            const wordDuration = parts.length > 0 ? duration / parts.length : duration
            words = parts.map((text, i) => ({
              text,
              start: sentence.start_time + i * wordDuration,
              end: sentence.start_time + (i + 1) * wordDuration,
            }))
          }

          return (
            <span key={`${sentence.start_time}-${sIdx}`}>
              {words.map((w, wi) => {
                const wordNorm = (w.text || "").toLowerCase().replace(/\s/g, "")
                const isMatch = !!queryNorm && wordNorm.includes(queryNorm)
                return (
                  <TranscriptWord
                    key={`${sentence.start_time}-${w.start}-${wi}`}
                    wordText={(w.text || "").trim()}
                    start={w.start}
                    end={w.end}
                    isSearchMatch={isMatch}
                    onSearchWord={onSearchWord}
                    onExplainWordInContext={(word) => {
                      const sentenceText =
                        sentence.sentence_text ||
                        words.map((ww: Word) => ww.text).join(" ")
                      onExplainWordInContext?.({ word, sentence: sentenceText })
                    }}
                  />
                )
              })}
            </span>
          )
        })}
      </div>
    </div>
  )
})

SentenceGroup.displayName = "SentenceGroup"
