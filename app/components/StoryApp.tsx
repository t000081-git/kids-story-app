"use client";

import { useEffect, useState } from "react";
import StoryForm from "./StoryForm";
import StoryView from "./StoryView";
import {
  listSavedStories,
  saveStory,
  readSharedStoryFromHash,
  clearShareHash,
} from "@/lib/saved-stories";
import type { SavedStory } from "@/lib/saved-stories";

export type Theme =
  | "animals"      | "dinosaurs"   | "dragons"      | "magic"
  | "pirates"      | "princesses"  | "knights"       | "mermaids"
  | "unicorns"     | "fairies"     | "wizards"       | "robots"
  | "superheroes"  | "space"       | "sea-life"      | "ninjas"
  | "cars-trucks"  | "trains"      | "farm-animals"  | "snowy-day"
  | "ballerina"    | "chef"        | "firefighter"   | "astronaut"
  | "cowboy"       | "circus"      | "explorer"      | "arctic"
  | "butterflies"  | "candy-world" | "volcano"       | "time-travel"
  | "haunted"      | "beach"       | "mountain"      | "forest"
  | "secret-agent" | "toy-workshop"| "ocean-dive"    | "dream-world";
export type Length = "short" | "medium" | "long";
export type Language = "en" | "ar" | "tl";
export type Story = { title: string; pages: string[] };

export type StoryRequest = {
  name: string;
  theme: Theme | string;
  length: Length;
  language: Language;
};

type Status = "idle" | "loading" | "error" | "done";

/** Info carried from a saved story into the reader (for provenance badge). */
export type LoadedSavedInfo = {
  rating: number;
  savedAt: number;
  userAgent?: string;
};

declare global {
  interface Window {
    __ksMode?: "idle" | "story";
  }
}

export default function StoryApp() {
  const [status, setStatus]   = useState<Status>("idle");
  const [story, setStory]     = useState<Story | null>(null);
  const [theme, setTheme]     = useState<string>("animals");
  const [language, setLanguage] = useState<Language>("en");
  const [error, setError]     = useState<string>("");
  // Non-null when a saved story is being replayed (shows provenance badge).
  const [loadedSavedInfo, setLoadedSavedInfo] = useState<LoadedSavedInfo | null>(null);

  // Dispatch a mode event so the ambient soundscape can lower its
  // volume during the storytelling phase.
  useEffect(() => {
    const mode: "idle" | "story" = status === "done" && story ? "story" : "idle";
    window.__ksMode = mode;
    window.dispatchEvent(new CustomEvent("ks-mode", { detail: { mode } }));
  }, [status, story]);

  // Load saved stories + handle incoming share links on mount.
  // Also listen for star-click events from SavedStoryStars.
  useEffect(() => {
    const shared = readSharedStoryFromHash();
    if (shared) {
      clearShareHash();
      setStory({ title: shared.title, pages: shared.pages });
      setTheme(shared.theme);
      setLanguage(shared.language as Language);
      setStatus("done");
    }

    function onLoadSaved(e: Event) {
      const saved = (e as CustomEvent<SavedStory>).detail;
      loadSavedStory(saved);
    }
    window.addEventListener("ks-load-saved", onLoadSaved);
    return () => window.removeEventListener("ks-load-saved", onLoadSaved);
  }, []);

  async function generate(req: StoryRequest) {
    setStatus("loading");
    setError("");
    setTheme(req.theme);
    setLanguage(req.language);
    setLoadedSavedInfo(null);

    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStory(data);
      setStatus("done");
    } catch {
      setError("Could not reach the storyteller. Please check your connection.");
      setStatus("error");
    }
  }

  function reset() {
    setStory(null);
    setStatus("idle");
    setError("");
    setLoadedSavedInfo(null);
  }

  /** Save a story entry; returns the created SavedStory (includes generated id). */
  function handleSaveStory(
    entry: Omit<SavedStory, "id" | "savedAt">,
  ): SavedStory {
    const saved = saveStory(entry);
    // Notify SavedStoryStars to refresh.
    window.dispatchEvent(new CustomEvent("ks-stories-updated"));
    return saved;
  }

  function loadSavedStory(saved: SavedStory) {
    setStory({ title: saved.title, pages: saved.pages });
    setTheme(saved.theme);
    setLanguage(saved.language as Language);
    setStatus("done");
    setError("");
    setLoadedSavedInfo({
      rating:    saved.rating,
      savedAt:   saved.savedAt,
      userAgent: saved.userAgent,
    });
  }

  if (status === "done" && story) {
    return (
      <StoryView
        story={story}
        theme={theme as Theme}
        language={language}
        onWriteAnother={reset}
        onSave={handleSaveStory}
        loadedSavedInfo={loadedSavedInfo}
      />
    );
  }

  return (
    <StoryForm
      onSubmit={generate}
      isLoading={status === "loading"}
      error={error}
    />
  );
}
