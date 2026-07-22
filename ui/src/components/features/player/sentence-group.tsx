"use client"

import { memo } from "react"
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

export const SentenceGroup = memo(({
  group,
  searchQuery,
  onSearchWord,
  onExplainWordInContext,
}: SentenceGroupProps) => {
  return (
    <div className="flex items-center justify-center text-center px-4 py-1">
      <div className="relative text-sm sm:text-2xl font-medium leading-snug inline-block text-foreground tracking-tight">
        {group.map((sentence, sIdx) => {
          const query = searchQuery.toLowerCase().trim()
          const rawWords: Word[] = (sentence.words as Word[] | undefined) || []

          // FALLBACK: When word-level timestamps are missing, split sentence_text
          // into individual words and distribute the sentence's time range evenly.
          // This ensures every clip is clickable, highlightable, and visible.
          // Detect real word-level data: words must be single tokens (no spaces in text)
          // Manticore sometimes stores the entire sentence as a single "word" entry —
          // those have spaces in their text and must be treated as no word-level data.
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

          const queryParts = query.split(/\s+/).filter(part => part.length > 0)
          const punctuationRegex = /[.,!?;:()\[\]{}"']/g

          return (
            <span key={`${sentence.start_time}-${sIdx}`}>
              {words.map((w, wi) => {
                const wordText = (w.text || "").trim()
                const cleanWord = wordText.toLowerCase().replace(punctuationRegex, '')
                const isSearchMatch = queryParts.length > 0 && queryParts.some(part => {
                  const cleanPart = part.toLowerCase().replace(punctuationRegex, '')
                  return cleanWord.length > 0 && cleanPart.length > 0 && cleanWord === cleanPart
                })

                return (
                  <TranscriptWord
                    key={`${sentence.start_time}-${w.start}-${wi}`}
                    wordText={wordText}
                    start={w.start}
                    end={w.end}
                    isSearchMatch={isSearchMatch}
                    onSearchWord={onSearchWord}
                    onExplainWordInContext={(word) => {
                      const sentenceText =
                        sentence.sentence_text ||
                        words.map((ww: Word) => ww.text).join(" ")
                      onExplainWordInContext?.({
                        word,
                        sentence: sentenceText,
                      })
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
