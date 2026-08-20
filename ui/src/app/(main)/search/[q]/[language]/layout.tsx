import { Metadata } from "next";
import Script from "next/script";

type Props = {
  params: Promise<{ q: string; language: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: Promise<{ q: string; language: string }> }): Promise<Metadata> {
  const { q, language } = await params;
  const query = decodeURIComponent(q);
  const formattedLanguage = language.charAt(0).toUpperCase() + language.slice(1);
  const baseUrl = "https://pokispokey.com";
  const canonicalUrl = `${baseUrl}/search/${encodeURIComponent(query)}/${language.toLowerCase()}`;

  const title = `"${query}" in ${formattedLanguage}: Meaning, Pronunciation & Video Examples`;
  const description = `Hear how native speakers pronounce "${query}" in real ${formattedLanguage} movies, podcasts, and video clips with interactive dual subtitles on PokiSpokey.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    keywords: [
      `pronounce ${query}`,
      `${query} pronunciation`,
      `${query} in ${formattedLanguage}`,
      `${query} meaning in context`,
      `${query} video examples`,
      `how to use ${query}`,
      `learn ${formattedLanguage} with videos`,
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
          alt: `PokiSpokey - ${query} in ${formattedLanguage}`,
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

export default async function SearchSegmentLayout({
  children,
  params,
}: Props) {
  const { q, language } = await params;
  const query = decodeURIComponent(q);
  const formattedLanguage = language.charAt(0).toUpperCase() + language.slice(1);
  const baseUrl = "https://pokispokey.com";
  const pageUrl = `${baseUrl}/search/${encodeURIComponent(query)}/${language.toLowerCase()}`;

  // Structured Data (JSON-LD) for Google Video & DefinedTerm SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl,
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": `${formattedLanguage} Search`,
            "item": `${baseUrl}/search?language=${language.toLowerCase()}`,
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": query,
            "item": pageUrl,
          },
        ],
      },
      {
        "@type": "DefinedTerm",
        "name": query,
        "inDefinedTermSet": `${baseUrl}/search?language=${language.toLowerCase()}`,
        "description": `Authentic spoken pronunciation, video context, and subtitles for "${query}" in ${formattedLanguage}.`,
        "url": pageUrl,
      },
      {
        "@type": "VideoObject",
        "name": `How to pronounce "${query}" in real ${formattedLanguage} conversations`,
        "description": `Watch and listen to native speakers pronounce "${query}" in authentic video clips on PokiSpokey.`,
        "thumbnailUrl": [
          `${baseUrl}/main_logo.png`
        ],
        "uploadDate": "2026-01-01T00:00:00Z",
        "embedUrl": pageUrl,
        "potentialAction": {
          "@type": "SeekToAction",
          "target": `${pageUrl}?t={seek_to_second_number}`,
          "startOffset-input": "required name=seek_to_second_number",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
