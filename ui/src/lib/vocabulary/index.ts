import { ALL_ENGLISH_SEO_WORDS } from "./english-words";
import { ALL_JAPANESE_SEO_WORDS } from "./japanese-words";
import { ALL_SPANISH_SEO_WORDS } from "./spanish-words";
import { ALL_FRENCH_SEO_WORDS } from "./french-words";
import { ALL_GERMAN_SEO_WORDS } from "./german-words";

export const LANGUAGE_VOCABULARY_MAP: Record<string, string[]> = {
  english: ALL_ENGLISH_SEO_WORDS,
  japanese: ALL_JAPANESE_SEO_WORDS,
  spanish: ALL_SPANISH_SEO_WORDS,
  french: ALL_FRENCH_SEO_WORDS,
  german: ALL_GERMAN_SEO_WORDS,
};

export {
  ALL_ENGLISH_SEO_WORDS,
  ALL_JAPANESE_SEO_WORDS,
  ALL_SPANISH_SEO_WORDS,
  ALL_FRENCH_SEO_WORDS,
  ALL_GERMAN_SEO_WORDS,
};
