"use client";

import { useEffect, useState } from "react";
import StoryForm from "./StoryForm";
import StoryView from "./StoryView";

export type Theme =
  | "animals"
  | "dinosaurs"
  | "dragons"
  | "magic"
  | "pirates"
  | "princesses"
  | "knights"
  | "mermaids"
  | "unicorns"
  | "fairies"
  | "wizards"
  | "robots"
  | "superheroes"
  | "space"
  | "sea-life"
  | "ninjas"
  | "cars-trucks"
  | "trains"
  | "farm-animals"
  | "snowy-day";
export type Length = "short" | "medium" | "long";
export type Language =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "zh"
  | "ja"
  | "ko";
export type Story = { title: string; pages: string[] };

export type StoryRequest = {
  name: string;
  theme: Theme | string;
  length: Length;
  language: Language;
};

type Status = "idle" | "loading" | "error" | "done";

declare global {
  interface Window {
    __ksMode?: "idle" | "story";
  }
}

export default function StoryApp() {
  const [status, setStatus] = useState<Status>("idle");
  const [story, setStory] = useState<Story | null>(null);
  const [theme, setTheme] = useState<string>("animals");
  const [language, setLanguage] = useState<Language>("en");
  const [error, setError] = useState<string>("");

  // Dispatch a mode event so the ambient soundscape can lower its
  // volume during the storytelling phase.
  useEffect(() => {
    const mode: "idle" | "story" = status === "done" && story ? "story" : "idle";
    window.__ksMode = mode;
    window.dispatchEvent(new CustomEvent("ks-mode", { detail: { mode } }));
  }, [status, story]);

  async function generate(req: StoryRequest) {
    setStatus("loading");
    setError("");
    setTheme(req.theme);
    setLanguage(req.language);

    try {
      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      // Validation errors (400/429/500) come back as plain JSON before the
      // stream opens. Everything else is an SSE stream.
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ?? "Something went wrong. Please try again.",
        );
        setStatus("error");
        return;
      }

      if (!res.body) {
        setError("Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      // Read the SSE stream — ignore heartbeat comments (": heartbeat"),
      // act on "data: {...}" lines.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let resolved = false;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6)) as
            | { error: string }
            | { title: string; pages: string[] };
          if ("error" in data) {
            setError(data.error);
            setStatus("error");
          } else {
            setStory(data);
            setStatus("done");
          }
          resolved = true;
          break outer;
        }
      }

      if (!resolved) {
        setError("Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setError("Could not reach the storyteller. Please check your connection.");
      setStatus("error");
    }
  }

  function reset() {
    setStory(null);
    setStatus("idle");
    setError("");
  }

  if (status === "done" && story) {
    return (
      <StoryView
        story={story}
        theme={theme as Theme}
        language={language}
        onWriteAnother={reset}
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
