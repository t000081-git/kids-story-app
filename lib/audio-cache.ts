// Persistent ElevenLabs audio cache using localStorage.
// Each entry stores the raw base64 audio + alignment data returned by /api/narrate.
// Cache key is a hash of (text, language, theme, sing) so identical narration requests
// are served from cache without consuming ElevenLabs credits.
//
// LRU eviction kicks in at MAX_ENTRIES so we never exceed ~4-5 MB of storage.

const CACHE_PREFIX = "ks_audio_";
const META_KEY     = "ks_audio_meta";
const MAX_ENTRIES  = 28; // ~4 MB at ~150 KB avg per page

type Meta = { entries: { key: string; ts: number }[] };

export type CachedAudio = {
  audioBase64: string;
  alignment: {
    characters:                    string[];
    character_start_times_seconds: number[];
    character_end_times_seconds:   number[];
  };
};

// Fast non-crypto hash (djb2) — enough for cache key uniqueness
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function makeKey(text: string, language: string, theme: string, sing: boolean): string {
  return CACHE_PREFIX + hashStr(`${text}|${language}|${theme}|${sing ? "s" : "r"}`);
}

function readMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as Meta;
  } catch {}
  return { entries: [] };
}

function writeMeta(meta: Meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
}

export function getAudioCache(
  text: string, language: string, theme: string, sing: boolean,
): CachedAudio | null {
  if (typeof window === "undefined") return null;
  const key = makeKey(text, language, theme, sing);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedAudio;
    // Bump LRU timestamp
    const meta = readMeta();
    const e = meta.entries.find((x) => x.key === key);
    if (e) { e.ts = Date.now(); writeMeta(meta); }
    return data;
  } catch {
    return null;
  }
}

export function setAudioCache(
  text: string, language: string, theme: string, sing: boolean,
  data: CachedAudio,
): void {
  if (typeof window === "undefined") return;
  const key  = makeKey(text, language, theme, sing);
  const meta = readMeta();

  // Evict LRU entries until under the limit
  while (meta.entries.length >= MAX_ENTRIES) {
    meta.entries.sort((a, b) => a.ts - b.ts);
    const evicted = meta.entries.shift()!;
    try { localStorage.removeItem(evicted.key); } catch {}
  }

  const tryWrite = () => {
    localStorage.setItem(key, JSON.stringify(data));
    const idx = meta.entries.findIndex((x) => x.key === key);
    if (idx >= 0) meta.entries[idx].ts = Date.now();
    else meta.entries.push({ key, ts: Date.now() });
    writeMeta(meta);
  };

  try {
    tryWrite();
  } catch (err) {
    // Quota exceeded — evict half and retry once
    if (err instanceof DOMException) {
      meta.entries.sort((a, b) => a.ts - b.ts);
      const half = meta.entries.splice(0, Math.ceil(meta.entries.length / 2));
      half.forEach(({ key: k }) => { try { localStorage.removeItem(k); } catch {} });
      writeMeta(meta);
      try { tryWrite(); } catch { /* give up silently */ }
    }
  }
}
