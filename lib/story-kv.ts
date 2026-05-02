/**
 * story-kv.ts
 * ────────────
 * Thin wrapper around @upstash/redis for storing and retrieving stories.
 * (@vercel/kv was deprecated; Upstash Redis is its replacement on Vercel.)
 *
 * Required env vars (set in Vercel dashboard → Integrations → Upstash Redis):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Key format:  story:{id}
 * TTL:         2 years
 * Short ID:    7 base-62 characters (~56 billion unique values)
 *              e.g. "xK9mP2a"  →  /story/xK9mP2a
 */

import { Redis } from "@upstash/redis";

export type StoredStory = {
  id: string;
  title: string;
  pages: string[];
  theme: string;
  language: string;
  savedAt: number;
};

const TTL_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 years

function getRedis() {
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

/** Save a story to Redis; returns the generated short id. */
export async function saveStoryToKV(
  story: Omit<StoredStory, "id" | "savedAt">,
): Promise<string> {
  const id    = generateShortId();
  const entry: StoredStory = { ...story, id, savedAt: Date.now() };
  await getRedis().set(`story:${id}`, entry, { ex: TTL_SECONDS });
  return id;
}

/** Retrieve a story by its short id. Returns null if not found. */
export async function getStoryFromKV(id: string): Promise<StoredStory | null> {
  if (!/^[A-Za-z0-9]{4,12}$/.test(id)) return null;
  return getRedis().get<StoredStory>(`story:${id}`);
}

// ── Short-id generator ────────────────────────────────────────────────────────
const B62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateShortId(): string {
  const buf = new Uint8Array(7);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => B62[b % 62]).join("");
}
