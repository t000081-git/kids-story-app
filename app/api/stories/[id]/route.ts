/**
 * GET /api/stories/[id]
 * Retrieve a story from Vercel KV by its short id.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStoryFromKV } from "@/lib/story-kv";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const story = await getStoryFromKV(id);
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  return NextResponse.json(story);
}
