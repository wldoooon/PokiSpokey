'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

const SENTENCES = [
  {
    words: ["The", "quieter", "you", "become,", "the", "more", "you", "hear."],
    keywordIdx: 1,
    source: "Movies",
    lang: "EN",
    flag: "https://flagcdn.com/us.svg",
    translations: [
      { text: "Plus tu te tais, plus tu entends.", lang: "FR", flag: "https://flagcdn.com/fr.svg" },
      { text: "Cuanto más callado estás, más escuchas.", lang: "ES", flag: "https://flagcdn.com/es.svg" },
      { text: "Je stiller du wirst, desto mehr hörst du.", lang: "DE", flag: "https://flagcdn.com/de.svg" },
    ],
  },
  {
    words: ["Paris", "est", "toujours", "une", "bonne", "idée."],
    keywordIdx: 2,
    source: "News",
    lang: "FR",
    flag: "https://flagcdn.com/fr.svg",
    translations: [
      { text: "Paris is always a good idea.", lang: "EN", flag: "https://flagcdn.com/us.svg" },
      { text: "París siempre es una buena idea.", lang: "ES", flag: "https://flagcdn.com/es.svg" },
      { text: "Paris ist immer eine gute Idee.", lang: "DE", flag: "https://flagcdn.com/de.svg" },
    ],
  },
  {
    words: ["No", "llores,", "sonríe", "porque", "sucedió."],
    keywordIdx: 2,
    source: "Podcasts",
    lang: "ES",
    flag: "https://flagcdn.com/es.svg",
    translations: [
      { text: "Don't cry, smile because it happened.", lang: "EN", flag: "https://flagcdn.com/us.svg" },
      { text: "Ne pleure pas, souris parce que c'est arrivé.", lang: "FR", flag: "https://flagcdn.com/fr.svg" },
      { text: "Wein nicht, lächle, weil es passiert ist.", lang: "DE", flag: "https://flagcdn.com/de.svg" },
    ],
  },
]

const languageFlags = [
  { flag: 'https://flagcdn.com/us.svg', label: 'English' },
  { flag: 'https://flagcdn.com/fr.svg', label: 'French' },
  { flag: 'https://flagcdn.com/de.svg', label: 'German' },
]

const ArticlePreviewCard = () => {
  const [sentenceIdx, setSentenceIdx] = useState(0)
  const [wordIdx, setWordIdx] = useState(0)
  const [phase, setPhase] = useState<'words' | 'translating'>('words')
  const [translationIdx, setTranslationIdx] = useState(0)

  useEffect(() => {
    const sentence = SENTENCES[sentenceIdx]

    if (phase === 'words') {
      const isKeyword = wordIdx === sentence.keywordIdx
      const isLast = wordIdx >= sentence.words.length - 1
      const delay = isLast ? 700 : isKeyword ? 820 : 430

      const t = setTimeout(() => {
        if (isLast) {
          setPhase('translating')
          setTranslationIdx(0)
        } else {
          setWordIdx(w => w + 1)
        }
      }, delay)
      return () => clearTimeout(t)
    }

    if (phase === 'translating') {
      const isLastTranslation = translationIdx >= sentence.translations.length - 1

      const t = setTimeout(() => {
        if (isLastTranslation) {
          setSentenceIdx(s => (s + 1) % SENTENCES.length)
          setWordIdx(0)
          setPhase('words')
        } else {
          setTranslationIdx(i => i + 1)
        }
      }, 1600)
      return () => clearTimeout(t)
    }
  }, [sentenceIdx, wordIdx, phase, translationIdx])

  const sentence = SENTENCES[sentenceIdx]

  return (
    <div className="relative w-full h-full border border-border/50 bg-card/50 overflow-hidden flex flex-col">

      {/* ── Top: word-by-word transcript panel ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-3 px-6 bg-gradient-to-br from-muted/20 via-background to-muted/10 overflow-hidden">

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />

        {/* Language flag + source — inline above sentence */}
        <div className="flex items-center gap-2 z-10">
          <div className="h-5 w-5 rounded-full overflow-hidden border-2 border-background shadow-md bg-muted flex-shrink-0">
            <img src={sentence.flag} className="w-full h-full object-cover" alt={sentence.lang} />
          </div>
          <span className="text-[10px] text-muted-foreground/50 font-mono tracking-wide">{sentence.source}</span>
        </div>

        {/* Sentence with jumping word highlight */}
        <div className="flex flex-wrap items-center justify-center gap-y-1 text-center">
          {sentence.words.map((word, i) => (
            <span
              key={`${sentenceIdx}-${i}`}
              className={cn(
                "mr-0.5 px-1 py-0.5 border-2 rounded-md transition-all duration-150 ease-out inline-flex items-center text-sm font-medium",
                i === wordIdx && phase === 'words'
                  ? "border-primary text-foreground font-bold scale-105"
                  : "border-transparent text-foreground/65"
              )}
            >
              {word}
            </span>
          ))}
        </div>

        {/* Translation */}
        <div className="h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${sentenceIdx}-${translationIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="flex items-center gap-2"
            >
              <div className="h-5 w-5 rounded-full overflow-hidden border-2 border-background shadow-md bg-muted flex-shrink-0">
                <img src={sentence.translations[translationIdx].flag} className="w-full h-full object-cover" alt={sentence.translations[translationIdx].lang} />
              </div>
              <span className="text-xs text-muted-foreground">
                {sentence.translations[translationIdx].text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>


      </div>

      {/* ── Content ── */}
      <div className="px-6 py-5 border-t border-border/40">

        <h3 className="text-lg font-bold text-foreground mb-1.5">Master Real Expressions</h3>

        <p className="text-xs text-muted-foreground leading-relaxed font-medium">
          Learn how native speakers use idioms and slang — within your favorite movies and shows.
        </p>

        {/* Flags + sentence progress dots */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex">
            {languageFlags.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.15, zIndex: 20 }}
                transition={{ type: 'spring', stiffness: 260 }}
                className="-ms-3 h-8 w-8 relative z-10 first:ms-0"
              >
                <div className="w-full h-full rounded-full border-2 border-background overflow-hidden shadow-md bg-muted">
                  <img src={item.flag} className="w-full h-full object-cover" alt={item.label} />
                </div>
              </motion.div>
            ))}
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 260 }}
              className="-ms-3 relative z-0"
            >
              <div className="bg-muted h-8 w-8 flex justify-center items-center text-muted-foreground border-2 border-background rounded-full text-xs font-black shadow-md">
                +3
              </div>
            </motion.div>
          </div>

          {/* Sentence progress pills */}
          <div className="flex items-center gap-1.5">
            {SENTENCES.map((_, i) => (
              <motion.div
                key={i}
                animate={{ width: i === sentenceIdx ? 16 : 6, opacity: i === sentenceIdx ? 1 : 0.3 }}
                transition={{ duration: 0.3 }}
                className="h-1.5 rounded-full bg-primary"
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

export default ArticlePreviewCard
