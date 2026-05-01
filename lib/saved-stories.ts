import type { Language } from "@/app/components/StoryApp";

export type SavedStory = {
  id: string;
  title: string;
  pages: string[];
  theme: string;
  language: Language;
  rating: number;
  savedAt: number;
};

export type ShareableStory = {
  title: string;
  pages: string[];
  theme: string;
  language: Language;
};

const STORAGE_KEY = "kids-saved-stories";
const MAX_SAVED = 50;

export function listSavedStories(): SavedStory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers — short random string.
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

export function saveStory(
  story: Omit<SavedStory, "id" | "savedAt">,
): SavedStory {
  const saved: SavedStory = {
    ...story,
    id: generateId(),
    savedAt: Date.now(),
  };
  const list = listSavedStories();
  list.unshift(saved);
  if (list.length > MAX_SAVED) list.length = MAX_SAVED;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return saved;
}

export function deleteSavedStory(id: string): void {
  if (typeof window === "undefined") return;
  const list = listSavedStories().filter((s) => s.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ---- Share-link encoding ----
//
// We don't have a server-side database in this build, so a "share
// link" carries the entire story in the URL hash as URL-safe base64
// JSON. The recipient's browser decodes it and renders the story
// directly — no API call, no auth, instantly portable.

function utf8ToB64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64UrlToUtf8(b64: string): string {
  const fixed = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = fixed + "=".repeat((4 - (fixed.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(story: ShareableStory): string {
  const json = JSON.stringify(story);
  const encoded = utf8ToB64Url(json);
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = `s=${encoded}`;
  return url.toString();
}

export function readSharedStoryFromHash(): ShareableStory | null {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash.replace(/^#/, "");
    const match = hash.match(/^s=(.+)$/);
    if (!match) return null;
    const json = b64UrlToUtf8(match[1]);
    const parsed = JSON.parse(json) as Partial<ShareableStory>;
    if (
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.pages) ||
      !parsed.pages.every((p) => typeof p === "string") ||
      typeof parsed.theme !== "string" ||
      typeof parsed.language !== "string"
    ) {
      return null;
    }
    return parsed as ShareableStory;
  } catch {
    return null;
  }
}

export function clearShareHash(): void {
  if (typeof window === "undefined") return;
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}
