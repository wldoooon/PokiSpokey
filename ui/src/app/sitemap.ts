import { MetadataRoute } from "next";
import { LANGUAGE_VOCABULARY_MAP } from "@/lib/vocabulary";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://pokispokey.com";
  const now = new Date();

  // 1. Static Core Pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/refund`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // 2. Programmatic Multi-Language Search Pages (English, Japanese, Spanish, French, German)
  const wordPages: MetadataRoute.Sitemap = [];

  for (const [language, words] of Object.entries(LANGUAGE_VOCABULARY_MAP)) {
    for (const word of words) {
      wordPages.push({
        url: `${baseUrl}/search/${encodeURIComponent(word)}/${language}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return [...staticPages, ...wordPages];
}
