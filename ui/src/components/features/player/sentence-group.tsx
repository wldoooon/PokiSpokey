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

const HIGHLIGHT_FG = "oklch(0.708 0.195 38.402)"
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
      style.textContent = `::highlight(${highlightKey}) { background-color: ${HIGHLIGHT_BG}; color: ${HIGHLIGHT_FG}; }`
      document.head.appendChild(style)
    }
    return () => {
      document.getElementById(styleId)?.remove()
      CSS.highlights?.delete(highlightKey)
    }
  }, [highlightKey])

  // CSS Custom Highlight API — works for all languages including CJK.
  // CJK tokens are stored as individual characters separated by DOM spaces,
  // so we skip whitespace-only text nodes and concatenate the rest. A Range
  // can span multiple text nodes, so the browser highlights across them.
  useEffect(() => {
    if (!CSS.highlights) return
    CSS.highlights.delete(highlightKey)

    const query = searchQuery.trim()
    if (!query || !containerRef.current) return

    // Collect non-whitespace text nodes with cumulative char offsets
    const walker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT)
    const textNodes: { node: Text; start: number; end: number }[] = []
    let cursor = 0
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      const content = node.textContent ?? ""
      if (!content.trim()) continue
      textNodes.push({ node, start: cursor, end: cursor + content.length })
      cursor += content.length
    }

    // Strip spaces: lets CJK characters match across token gaps
    // and lets Latin multi-word queries match across adjacent tokens
    const fullText = textNodes.map(n => (n.node.textContent ?? "").toLowerCase()).join("")
    const queryNorm = query.toLowerCase().replace(/\s+/g, "")
    if (!queryNorm) return

    const ranges: Range[] = []
    let pos = fullText.indexOf(queryNorm)
    while (pos !== -1) {
      const matchEnd = pos + queryNorm.length
      const startEntry = textNodes.find(n => n.start <= pos && pos < n.end)
      const endEntry = textNodes.find(n => n.start < matchEnd && matchEnd <= n.end)
      if (startEntry && endEntry) {
        const range = new Range()
        range.setStart(startEntry.node, pos - startEntry.start)
        range.setEnd(endEntry.node, matchEnd - endEntry.start)
        ranges.push(range)
      }
      pos = fullText.indexOf(queryNorm, pos + queryNorm.length)
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

          const hasWordLevelData = rawWords.length > 0 &&
            rawWords.every(w => w.text && !w.text.trim().includes(' ')) &&
            rawWords.some(w => w.start > 0 || w.end > 0)

          let words: Word[] = rawWords
          if (!hasWordLevelData && sentence.sentence_text) {
            const cleanText = sentence.sentence_text.replace(/<[^>]*>/g, '')
            const textParts = cleanText.split(/\s+/).filter(t => t.length > 0)
            const duration = sentence.end_time - sentence.start_time
            const wordDuration = textParts.length > 0 ? duration / textParts.length : duration
            words = textParts.map((text, i) => ({
              text,
              start: sentence.start_time + i * wordDuration,
              end: sentence.start_time + (i + 1) * wordDuration,
            }))
          }

          return (
            <span key={`${sentence.start_time}-${sIdx}`}>
              {words.map((w, wi) => (
                <TranscriptWord
                  key={`${sentence.start_time}-${w.start}-${wi}`}
                  wordText={(w.text || "").trim()}
                  start={w.start}
                  end={w.end}
                  isSearchMatch={false}
                  onSearchWord={onSearchWord}
                  onExplainWordInContext={(word) => {
                    const sentenceText =
                      sentence.sentence_text ||
                      words.map((ww: Word) => ww.text).join(" ")
                    onExplainWordInContext?.({ word, sentence: sentenceText })
                  }}
                />
              ))}
            </span>
          )
        })}
      </div>
    </div>
  )
})

SentenceGroup.displayName = "SentenceGroup"
