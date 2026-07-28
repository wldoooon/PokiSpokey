"use client"

import { memo, useRef, useEffect, useId } from "react"
import { tokenize } from "wakachigaki"
import { TranscriptWord } from "./transcript-word"

// Matches hiragana, katakana, and kanji — used to detect Japanese text only
const CJK_RE = /[\u3040-\u30FF\u4E00-\u9FFF]/
const KANJI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF]/
const KATAKANA_RE = /[\u30A0-\u30FF]/

// Align sentence_reading (hiragana) back to sentence_text character positions.
// Returns two parallel arrays over reading positions:
//   alignStart[ri] = first text char index for this reading position
//   alignEnd[ri]   = exclusive-end text char index for this reading position
// Non-kanji chars map 1:1. Kanji sequences consume multiple reading chars and
// all map to the same text span (start=kanjiBlockStart, end=kanjiBlockEnd).
function alignReadingToText(text: string, reading: string) {
  const alignStart = new Array<number>(reading.length).fill(0)
  const alignEnd   = new Array<number>(reading.length).fill(0)

  if (!text || !reading) return { alignStart, alignEnd }

  let ti = 0, ri = 0

  while (ti < text.length && ri < reading.length) {
    if (!KANJI_RE.test(text[ti])) {
      alignStart[ri] = ti
      alignEnd[ri]   = ti + 1

      const tChar = text[ti]
      const tHira = KATAKANA_RE.test(tChar)
        ? String.fromCharCode(tChar.charCodeAt(0) - 0x60)
        : tChar

      const rHira = KATAKANA_RE.test(reading[ri])
        ? String.fromCharCode(reading[ri].charCodeAt(0) - 0x60)
        : reading[ri]

      if (tHira === rHira) {
        ti++
        ri++
      } else {
        ri++
      }
    } else {
      const kanjiStart = ti
      while (ti < text.length && KANJI_RE.test(text[ti])) ti++
      const kanjiEnd = ti

      let anchorHira = ""
      if (ti < text.length) {
        const nextChar = text[ti]
        anchorHira = KATAKANA_RE.test(nextChar)
          ? String.fromCharCode(nextChar.charCodeAt(0) - 0x60)
          : nextChar
      }

      const rStart = ri
      let rEnd = ri
      if (anchorHira) {
        while (rEnd < reading.length) {
          const rChar = reading[rEnd]
          const rHira = KATAKANA_RE.test(rChar)
            ? String.fromCharCode(rChar.charCodeAt(0) - 0x60)
            : rChar
          if (rHira === anchorHira) break
          rEnd++
        }
      } else {
        rEnd = reading.length
      }

      for (let r = rStart; r < rEnd; r++) {
        alignStart[r] = kanjiStart
        alignEnd[r]   = kanjiEnd
      }
      ri = rEnd
    }
  }

  return { alignStart, alignEnd }
}


type Word = { text: string; start: number; end: number }
type Sentence = {
  start_time: number
  end_time: number
  sentence_text?: string
  sentence_reading?: string
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
  // Builds a per-character position map skipping all whitespace so the query
  // matches across TranscriptWord token boundaries (e.g. 'ありがとうございます'
  // spans multiple wakachigaki tokens but is found as one contiguous range).
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

    // Reading-based fallback: hiragana query vs kanji transcript.
    // If exact match failed, check each sentence's sentence_reading field.
    // On match, highlight the entire sentence span in the DOM.
    if (ranges.length === 0 && CJK_RE.test(term)) {
      let charPos = 0
      for (const sentence of group) {
        const reading = (sentence.sentence_reading || "").replace(/\s/g, "")
        const rawWords: Word[] = (sentence.words as Word[] | undefined) || []
        const hasWordLevel = rawWords.length > 1 &&
          rawWords.every(w => w.text && !w.text.trim().includes(" ")) &&
          rawWords.some(w => w.start > 0 || w.end > 0)

        let parts: string[]
        if (!hasWordLevel && sentence.sentence_text) {
          const clean = sentence.sentence_text.replace(/<[^>]*>/g, "")
          if (CJK_RE.test(clean)) {
            try { parts = (tokenize(clean) as string[]).filter((t: string) => t.trim().length > 0) }
            catch { parts = clean.split(/\s+/).filter(t => t.length > 0) }
          } else {
            parts = clean.split(/\s+/).filter(t => t.length > 0)
          }
        } else {
          parts = rawWords.map(w => (w.text || "").trim()).filter(t => t.length > 0)
        }

        const sentenceLen = parts.join("").replace(/\s/g, "").length
        const endPos = charPos + sentenceLen - 1

        const readingMatchPos = reading ? reading.indexOf(term) : -1
        if (readingMatchPos !== -1 && sentenceLen > 0) {
          const strippedText = parts.join("").replace(/\s/g, "")
          const { alignStart, alignEnd } = alignReadingToText(strippedText, reading)
          const textStart = alignStart[readingMatchPos]
          const textEnd   = alignEnd[readingMatchPos + term.length - 1]

          if (textStart >= 0 && textEnd > textStart) {
            const cmStart = charPos + textStart
            const cmEnd   = charPos + textEnd - 1  // inclusive
            if (cmStart < charMap.length && cmEnd < charMap.length) {
              const range = new Range()
              range.setStart(charMap[cmStart].node, charMap[cmStart].offset)
              range.setEnd(charMap[cmEnd].node, charMap[cmEnd].offset + 1)
              ranges.push(range)
            }
          }
        }

        charPos += sentenceLen
      }
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

            let parts: string[]
            if (CJK_RE.test(cleanText)) {
              // Japanese — use wakachigaki (MeCab/NEologd-trained, 92% accuracy)
              try {
                parts = (tokenize(cleanText) as string[]).filter((t: string) => t.trim().length > 0)
              } catch {
                parts = cleanText.split(/\s+/).filter(t => t.length > 0)
              }
            } else {
              // All other languages — simple whitespace split
              parts = cleanText.split(/\s+/).filter(t => t.length > 0)
            }

            const wordDuration = parts.length > 0 ? duration / parts.length : duration
            words = parts.map((text, i) => ({
              text,
              start: sentence.start_time + i * wordDuration,
              end: sentence.start_time + (i + 1) * wordDuration,
            }))
          }

          const sentenceText = words.map(w => (w.text || "").trim()).join("")
          const sentenceNorm = sentenceText.toLowerCase().replace(/\s/g, "")

          const matchCharSpans: { start: number; end: number }[] = []
          if (queryNorm) {
            let p = sentenceNorm.indexOf(queryNorm)
            while (p !== -1) {
              matchCharSpans.push({ start: p, end: p + queryNorm.length })
              p = sentenceNorm.indexOf(queryNorm, p + 1)
            }

            if (matchCharSpans.length === 0 && CJK_RE.test(queryNorm) && sentence.sentence_reading) {
              const reading = sentence.sentence_reading.replace(/\s/g, "")
              const readingMatchPos = reading.indexOf(queryNorm)
              if (readingMatchPos !== -1) {
                const { alignStart, alignEnd } = alignReadingToText(sentenceText, reading)
                const textStart = alignStart[readingMatchPos]
                const textEnd = alignEnd[readingMatchPos + queryNorm.length - 1]
                if (textStart >= 0 && textEnd > textStart) {
                  matchCharSpans.push({ start: textStart, end: textEnd })
                }
              }
            }
          }

          let charOffset = 0

          return (
            <span key={`${sentence.start_time}-${sIdx}`}>
              {words.map((w, wi) => {
                const wordStr = (w.text || "").trim()
                const wordLen = wordStr.length
                const wordCharStart = charOffset
                const wordCharEnd = charOffset + wordLen
                charOffset += wordLen

                const wordNorm = wordStr.toLowerCase().replace(/\s/g, "")
                let isMatch = false

                if (queryNorm) {
                  if (matchCharSpans.length > 0) {
                    isMatch = matchCharSpans.some(
                      span => Math.max(wordCharStart, span.start) < Math.min(wordCharEnd, span.end)
                    )
                  } else {
                    isMatch = wordNorm.includes(queryNorm)
                  }
                }

                return (
                  <TranscriptWord
                    key={`${sentence.start_time}-${w.start}-${wi}`}
                    wordText={wordStr}
                    start={w.start}
                    end={w.end}
                    isSearchMatch={isMatch}
                    onSearchWord={onSearchWord}
                    onExplainWordInContext={(word) => {
                      const sentenceTextFull =
                        sentence.sentence_text ||
                        words.map((ww: Word) => ww.text).join(" ")
                      onExplainWordInContext?.({ word, sentence: sentenceTextFull })
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
