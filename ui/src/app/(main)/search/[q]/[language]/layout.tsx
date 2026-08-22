import { Metadata } from "next";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SearchHit {
  video_id: string;
  sentence_text: string;
  video_title?: string;
}

interface SearchApiResponse {
  total: number;
  hits: SearchHit[];
}

type Props = {
  params: Promise<{ q: string; language: string }>;
  children: React.ReactNode;
};

// ─── Server-side subtitle pre-fetch ──────────────────────────────────────────
// Runs on the SERVER only. Fetches the top 3 real dialogue clips for the
// searched word so Googlebot receives unique per-word subtitle text in raw
// HTML. The interactive player in page.tsx is completely unaffected.
async function fetchPreviewClips(
  query: string,
  language: string
): Promise<SearchHit[]> {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:5001";
    const params = new URLSearchParams({ q: query, language, page: "1" });
    const res = await fetch(
      `${backendUrl}/api/v1/search?${params.toString()}`,
      {
        // Cache for 1 hour per word — avoids hammering the backend on every crawl
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    const data: SearchApiResponse = await res.json();
    return (data.hits ?? []).slice(0, 3);
  } catch {
    // Silent fail — if the backend is unreachable during build/crawl the page
    // still renders normally for real users; the sr-only section is just empty.
    return [];
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ q: string; language: string }>;
}): Promise<Metadata> {
  const { q, language } = await params;
  const query = decodeURIComponent(q);
  const formattedLanguage =
    language.charAt(0).toUpperCase() + language.slice(1);
  const baseUrl = "https://pokispokey.com";
  const canonicalUrl = `${baseUrl}/search/${encodeURIComponent(query)}/${language.toLowerCase()}`;

  // Smart title highlighting the diverse content mix (Movies, Anime/Cartoons, Talks & Street Dialogue)
  const isJapanese = language.toLowerCase() === "japanese" || language.toLowerCase() === "ja";
  const mediaHook = isJapanese ? "Anime, Movies & Talks" : "Movies, Talks & Conversations";
  const title = `"${query}" in Context: Real ${formattedLanguage} ${mediaHook}`;
  
  const description = `See how native speakers use "${query}" in real ${formattedLanguage} movies, anime, street conversations & talks. Watch authentic dialogue scenes with dual subtitles on PokiSpokey.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    keywords: [
      // 1. Context & Sentence Usage (Competing with Linguee & Reverso)
      `"${query}" in context`,
      `how to use "${query}" in ${formattedLanguage}`,
      `"${query}" in real sentences`,
      `"${query}" meaning in context`,
      `"${query}" real life dialogue`,

      // 2. Real Media: Movies, Anime, Cartoons & TV
      `"${query}" movie clips`,
      `"${query}" anime clips`,
      `"${query}" cartoon scenes`,
      `"${query}" in TV shows`,
      `hear "${query}" in real movies`,

      // 3. Natural Speech: Talks, Podcasts & Street Conversations
      `"${query}" street conversations`,
      `"${query}" in podcasts and talks`,
      `how native speakers say "${query}"`,
      `"${query}" everyday speech`,

      // 4. Spoken Pronunciation & Accents (Competing with YouGlish & Forvo)
      `how to pronounce "${query}"`,
      `"${query}" pronunciation in ${formattedLanguage}`,
      `"${query}" native speaker accent`,
      `pronounce "${query}" with video clips`,

      // 5. Interactive Dual Subtitles & Language Learning
      `"${query}" with dual subtitles`,
      `learn ${formattedLanguage} with video clips`,
      `learn ${formattedLanguage} from movies and anime`,
      "PokiSpokey",
    ],
    openGraph: {
      title: `${title} | PokiSpokey`,
      description,
      url: canonicalUrl,
      siteName: "PokiSpokey",
      type: "video.other",
      images: [
        {
          url: "/main_logo.png",
          width: 512,
          height: 512,
          alt: `PokiSpokey - "${query}" in real ${formattedLanguage} clips and dialogue`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | PokiSpokey`,
      description,
      images: ["/main_logo.png"],
    },
  };
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default async function SearchSegmentLayout({ children, params }: Props) {
  const { q, language } = await params;
  const query = decodeURIComponent(q);
  const formattedLanguage =
    language.charAt(0).toUpperCase() + language.slice(1);
  const baseUrl = "https://pokispokey.com";
  const pageUrl = `${baseUrl}/search/${encodeURIComponent(query)}/${language.toLowerCase()}`;

  // Fetch top 3 real subtitle clips server-side for Googlebot
  const previewClips = await fetchPreviewClips(query, language);

  // ── Structured Data (JSON-LD) ───────────────────────────────────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: `${formattedLanguage} Search`,
            item: `${baseUrl}/search?language=${language.toLowerCase()}`,
          },
          { "@type": "ListItem", position: 3, name: query, item: pageUrl },
        ],
      },
      {
        "@type": "DefinedTerm",
        name: query,
        inDefinedTermSet: `${baseUrl}/search?language=${language.toLowerCase()}`,
        description: `Authentic spoken pronunciation, video context, movie & anime dialogue, and dual subtitles for "${query}" in ${formattedLanguage}.`,
        url: pageUrl,
      },
      {
        "@type": "VideoObject",
        name: `How native speakers use and pronounce "${query}" in real ${formattedLanguage} clips`,
        description: `Watch authentic movies, anime, talks, and street conversations where native speakers use "${query}" with interactive dual subtitles on PokiSpokey.`,
        thumbnailUrl: [`${baseUrl}/main_logo.png`],
        uploadDate: "2026-01-01T00:00:00Z",
        embedUrl: pageUrl,
        potentialAction: {
          "@type": "SeekToAction",
          target: `${pageUrl}?t={seek_to_second_number}`,
          "startOffset-input": "required name=seek_to_second_number",
        },
      },
    ],
  };

  return (
    <>
      {/* ── Structured data ─────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/*
       * ── SSR Subtitle Context Section ─────────────────────────────────────
       * Rendered on the SERVER. Invisible to real users (sr-only = not displayed
       * on screen). Fully readable by Googlebot in raw HTML — no JS required.
       *
       * Each word produces a completely different set of real dialogue quotes,
       * making every one of the 20,580 pages genuinely unique in Google's eyes.
       * The interactive player below (page.tsx) is completely unaffected.
       */}
      {previewClips.length > 0 && (
        <section
          aria-label={`Real native speaker examples for "${query}" in ${formattedLanguage} movies, anime, talks, and conversations`}
          className="sr-only"
        >
          <h2>
            How native speakers use &ldquo;{query}&rdquo; in real{" "}
            {formattedLanguage} movies, anime, talks, and street conversations:
          </h2>
          <ol>
            {previewClips.map((clip, i) => (
              <li key={`${clip.video_id}-${i}`}>
                <blockquote
                  cite={`https://www.youtube.com/watch?v=${clip.video_id}`}
                >
                  &ldquo;{clip.sentence_text}&rdquo;
                </blockquote>
                {clip.video_title && <cite>— {clip.video_title}</cite>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Interactive player (page.tsx) — completely untouched ────────── */}
      {children}
    </>
  );
}
