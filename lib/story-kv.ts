/**
 * story-kv.ts
 * ────────────
 * Thin wrapper around @vercel/kv for storing and retrieving stories.
 *
 * Key format:  story:{id}
 * TTL:         2 years (Vercel KV free tier supports long TTLs)
 *
 * Short ID:    7 base-62 characters (~56 billion unique values)
 *              e.g. "xK9mP2a"  →  /story/xK9mP2a
 */

import { kv } from "@vercel/kv";

export type StoredStory = {
  id: string;
  title: string;
  pages: string[];
  theme: string;
  language: string;
  savedAt: number;
};

const TTL_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 years

/** Save a story to KV; returns the generated short id. */
export async function saveStoryToKV(
  story: Omit<StoredStory, "id" | "savedAt">,
): Promise<string> {
  const id    = generateShortId();
  const entry: StoredStory = { ...story, id, savedAt: Date.now() };
  await kv.set(`story:${id}`, entry, { ex: TTL_SECONDS });
  return id;
}

/** Retrieve a story from KV by its short id. Returns null if not found. */
export async function getStoryFromKV(id: string): Promise<StoredStory | null> {
  // Reject obviously invalid ids before hitting KV
  if (!/^[A-Za-z0-9]{4,12}$/.test(id)) return null;
  return kv.get<StoredStory>(`story:${id}`);
}

// ── Short-id generator ────────────────────────────────────────────────────────
const B62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateShortId(): string {
  const buf = new Uint8Array(7);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => B62[b % 62]).join("");
}
