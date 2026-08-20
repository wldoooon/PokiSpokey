import { NextResponse } from "next/server";
import { submitUrlsToIndexNow, getAllIndexableUrls } from "@/lib/seo/indexnow";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow sufficient time for batch POSTs

export async function GET() {
  const totalUrls = getAllIndexableUrls();
  const results = await submitUrlsToIndexNow(totalUrls);

  const allSuccessful = results.every((r) => r.success);

  return NextResponse.json({
    message: allSuccessful
      ? "Successfully submitted all batches to IndexNow!"
      : "Some batches failed to submit.",
    totalUrls: totalUrls.length,
    batchesSubmitted: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const urls: string[] | undefined = Array.isArray(body?.urls) ? body.urls : undefined;

    const results = await submitUrlsToIndexNow(urls);
    const allSuccessful = results.every((r) => r.success);

    return NextResponse.json({
      message: allSuccessful
        ? "Successfully submitted requested URLs to IndexNow!"
        : "Some batches failed to submit.",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
