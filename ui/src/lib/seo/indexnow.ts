import { LANGUAGE_VOCABULARY_MAP } from "@/lib/vocabulary";

export const INDEXNOW_KEY = "c78912e541b64a2f8b7e21a093e1b782";
export const INDEXNOW_HOST = "pokispokey.com";
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export interface IndexNowResult {
  batchIndex: number;
  urlCount: number;
  status: number;
  statusText: string;
  success: boolean;
}

/**
 * Builds all programmatic search URLs across all 5 languages.
 */
export function getAllIndexableUrls(): string[] {
  const baseUrl = `https://${INDEXNOW_HOST}`;
  const urls: string[] = [
    baseUrl,
    `${baseUrl}/pricing`,
    `${baseUrl}/changelog`,
  ];

  for (const [language, words] of Object.entries(LANGUAGE_VOCABULARY_MAP)) {
    for (const word of words) {
      urls.push(`${baseUrl}/search/${encodeURIComponent(word)}/${language}`);
    }
  }

  return urls;
}

/**
 * Submits URLs to IndexNow in chunks of up to 10,000 URLs per request.
 */
export async function submitUrlsToIndexNow(urls?: string[]): Promise<IndexNowResult[]> {
  const targetUrls = urls && urls.length > 0 ? urls : getAllIndexableUrls();
  const BATCH_SIZE = 10000;
  const results: IndexNowResult[] = [];

  for (let i = 0; i < targetUrls.length; i += BATCH_SIZE) {
    const chunk = targetUrls.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    const payload = {
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: chunk,
    };

    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      results.push({
        batchIndex: batchNumber,
        urlCount: chunk.length,
        status: response.status,
        statusText: response.statusText,
        success: response.ok || response.status === 200 || response.status === 202,
      });
    } catch (error: any) {
      results.push({
        batchIndex: batchNumber,
        urlCount: chunk.length,
        status: 500,
        statusText: error?.message || "Network Error",
        success: false,
      });
    }
  }

  return results;
}
