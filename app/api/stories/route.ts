/**
 * POST /api/stories
 * Save a story to Vercel KV. Returns { id, url } where url = "/story/{id}".
 *
 * The client then updates the localStorage entry's shareUrl to the full URL,
 * which turns its background star from gold → purple galaxy.
 */

import { NextRequest, NextResponse } from "next/server";
import { saveStoryToKV } from "@/lib/story-kv";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { title, pages, theme, language } = body;

    if (
      typeof title    !== "string" ||
      !Array.isArray(pages)        ||
      !pages.every((p) => typeof p === "string") ||
      typeof theme    !== "string" ||
      typeof language !== "string"
    ) {
      return NextResponse.json({ error: "Invalid story data" }, { status: 400 });
    }

    const id = await saveStoryToKV({
      title,
      pages: pages as string[],
      theme,
      language,
    });

    return NextResponse.json({ id, url: `/story/${id}` });
  } catch (err) {
    console.error("[stories] POST failed:", err);
    return NextResponse.json({ error: "Failed to save story" }, { status: 500 });
  }
}
