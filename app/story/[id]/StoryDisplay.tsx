"use client";

/**
 * StoryDisplay
 * ─────────────
 * Client wrapper rendered by the /story/[id] server page.
 * Gives someone who followed a cloud-share link the same full reading
 * experience as on the main page, plus the option to save locally.
 */

import { useState } from "react";
import StoryView from "@/app/components/StoryView";
import SavedStoryStars from "@/app/components/SavedStoryStars";
import NightSounds from "@/app/components/NightSounds";
import { saveStory } from "@/lib/saved-stories";
import type { SavedStory } from "@/lib/saved-stories";
import type { StoredStory } from "@/lib/story-kv";
import type { Language, Theme } from "@/app/components/StoryApp";

export default function StoryDisplay({ story }: { story: StoredStory }) {
  const [done, setDone] = useState(false);

  function handleSave(entry: Omit<SavedStory, "id" | "savedAt">): SavedStory {
    const saved = saveStory(entry);
    window.dispatchEvent(new CustomEvent("ks-stories-updated"));
    return saved;
  }

  if (done) {
    // "New story" → go home
    if (typeof window !== "undefined") window.location.href = "/";
    return null;
  }

  return (
    <>
      <SavedStoryStars />
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-3 sm:px-6 sm:py-4 overflow-hidden">
        <StoryView
          story={{ title: story.title, pages: story.pages }}
          theme={story.theme as Theme}
          language={story.language as Language}
          onWriteAnother={() => setDone(true)}
          onSave={handleSave}
        />
      </main>
      <NightSounds />
    </>
  );
}
