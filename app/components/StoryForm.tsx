"use client";

import { useState, type FormEvent } from "react";
import type { Length, StoryRequest, Theme } from "./StoryApp";

const THEMES: { value: Theme; label: string; emoji: string }[] = [
  { value: "animals",      label: "Animals",         emoji: "🦊" },
  { value: "dinosaurs",    label: "Dinosaurs",        emoji: "🦕" },
  { value: "dragons",      label: "Dragons & Dungeons", emoji: "🐉" },
  { value: "magic",        label: "Magic",            emoji: "✨" },
  { value: "pirates",      label: "Pirates",          emoji: "🏴‍☠️" },
  { value: "princesses",   label: "Princesses",       emoji: "👸" },
  { value: "knights",      label: "Knights",          emoji: "🛡️" },
  { value: "mermaids",     label: "Mermaids",         emoji: "🧜‍♀️" },
  { value: "unicorns",     label: "Unicorns",         emoji: "🦄" },
  { value: "fairies",      label: "Fairies",          emoji: "🧚" },
  { value: "wizards",      label: "Wizards",          emoji: "🧙" },
  { value: "robots",       label: "Robots",           emoji: "🤖" },
  { value: "superheroes",  label: "Superheroes",      emoji: "🦸" },
  { value: "space",        label: "Space",            emoji: "🚀" },
  { value: "sea-life",     label: "Sea Life",         emoji: "🐠" },
  { value: "ninjas",       label: "Ninjas",           emoji: "🥷" },
  { value: "cars-trucks",  label: "Cars & Trucks",    emoji: "🚗" },
  { value: "trains",       label: "Trains",           emoji: "🚂" },
  { value: "farm-animals", label: "Farm Animals",     emoji: "🐮" },
  { value: "snowy-day",    label: "Snowy Day",        emoji: "⛄" },
];

const LENGTHS: { value: Length; label: string; pages: string }[] = [
  { value: "short",  label: "Short",  pages: "2 pages" },
  { value: "medium", label: "Medium", pages: "4 pages" },
  { value: "long",   label: "Long",   pages: "6 pages" },
];

const NAME_PATTERN         = /^[A-Za-z][A-Za-z\s'-]{0,49}$/;
const CUSTOM_THEME_PATTERN = /^[A-Za-z][A-Za-z0-9\s'\-,&]{0,49}$/;

export default function StoryForm({
  onSubmit,
  isLoading,
  error,
}: {
  onSubmit: (req: StoryRequest) => void;
  isLoading: boolean;
  error: string;
}) {
  const [name, setName]               = useState("");
  const [theme, setTheme]             = useState<Theme>("animals");
  const [customTheme, setCustomTheme] = useState("");
  const [length, setLength]           = useState<Length>("medium");

  const trimmedName        = name.trim();
  const trimmedCustomTheme = customTheme.trim();
  const nameValid          = NAME_PATTERN.test(trimmedName);
  const customActive       = trimmedCustomTheme.length > 0;
  const customValid        = !customActive || CUSTOM_THEME_PATTERN.test(trimmedCustomTheme);
  const effectiveTheme     = customActive ? trimmedCustomTheme : theme;

  function selectPreset(t: Theme) { setTheme(t); setCustomTheme(""); }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nameValid || !customValid) return;
    // Language is always English — selector removed.
    onSubmit({ name: trimmedName, theme: effectiveTheme, length, language: "en" });
  }

  return (
    <div className="w-full max-w-2xl text-center">
      <h1
        className="text-4xl sm:text-6xl md:text-7xl text-amber-100 mb-2 sm:mb-6 tracking-tight drop-shadow-[0_2px_18px_rgba(255,215,130,0.45)] font-semibold"
        style={{ fontFamily: "var(--font-fredoka), system-ui, sans-serif" }}
      >
        Kids Story
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-10">
        {/* Name */}
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <label
            htmlFor="name"
            className="text-xl sm:text-2xl md:text-3xl text-amber-50/90 italic leading-snug"
          >
            A bedtime story made just for
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="child's name"
            maxLength={50}
            disabled={isLoading}
            autoFocus
            aria-label="Your name"
            className="w-full max-w-md bg-transparent border-b-2 border-amber-200/40 pb-1 sm:pb-2 text-2xl sm:text-3xl md:text-4xl text-center italic text-amber-100 placeholder:text-amber-100/40 focus:border-amber-200 focus:outline-none disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Theme carousel */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <span className="text-left text-base sm:text-lg text-amber-50/85">Pick a theme</span>
          <div
            className="ks-vscroll-wrap relative h-[180px] sm:h-[240px] overflow-hidden"
            style={{
              backgroundColor: "rgba(8, 6, 28, 0.5)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
            }}
          >
            <div className="ks-vscroll-inner grid grid-cols-2 gap-3">
              {[...THEMES, ...THEMES].map((t, i) => {
                const selected = !customActive && theme === t.value;
                return (
                  <button
                    key={`${t.value}-${i}`}
                    type="button"
                    onClick={() => selectPreset(t.value)}
                    disabled={isLoading}
                    aria-label={t.label}
                    className={
                      "rounded-lg border-2 p-3 sm:p-4 min-h-[80px] sm:min-h-[108px] flex flex-col items-center justify-center transition-colors disabled:opacity-50 backdrop-blur-sm " +
                      (selected
                        ? "border-amber-200 bg-amber-100/15 text-amber-50 shadow-[0_0_18px_rgba(252,211,77,0.25)]"
                        : "border-amber-100/20 bg-white/5 text-amber-50/85 hover:bg-white/10")
                    }
                    aria-pressed={selected}
                  >
                    <div className="text-2xl sm:text-3xl mb-0.5 sm:mb-1 leading-none">{t.emoji}</div>
                    <div className="text-xs sm:text-sm leading-tight">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom theme */}
          <div className="mt-0.5 sm:mt-1 flex flex-col gap-0.5 sm:gap-1">
            <label htmlFor="custom-theme" className="text-left text-xs sm:text-sm text-amber-50/65 italic">
              Or pick your own:
            </label>
            <input
              id="custom-theme"
              type="text"
              value={customTheme}
              onChange={(e) => setCustomTheme(e.target.value)}
              placeholder="pirates, princesses, robots…"
              maxLength={50}
              disabled={isLoading}
              aria-invalid={!customValid}
              className={
                "w-full rounded-lg border-2 bg-white/5 backdrop-blur-sm p-2 sm:p-3 text-sm sm:text-base text-amber-50 placeholder:text-amber-50/35 focus:outline-none disabled:opacity-50 transition-colors " +
                (customActive
                  ? customValid
                    ? "border-amber-200 shadow-[0_0_18px_rgba(252,211,77,0.25)]"
                    : "border-rose-300/70"
                  : "border-amber-100/20 focus:border-amber-200")
              }
            />
            {customActive && !customValid && (
              <p className="text-left text-xs text-rose-200 italic">
                Letters, numbers, spaces, hyphens and apostrophes only — keep it under 50 characters.
              </p>
            )}
          </div>
        </div>

        {/* Length */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <span className="text-left text-base sm:text-lg text-amber-50/85">How long?</span>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {LENGTHS.map((l) => {
              const selected = length === l.value;
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLength(l.value)}
                  disabled={isLoading}
                  className={
                    "rounded-lg border-2 p-2 sm:p-3 transition-colors disabled:opacity-50 backdrop-blur-sm " +
                    (selected
                      ? "border-amber-200 bg-amber-100/15 text-amber-50 shadow-[0_0_18px_rgba(252,211,77,0.25)]"
                      : "border-amber-100/20 bg-white/5 text-amber-50/85 hover:bg-white/10")
                  }
                  aria-pressed={selected}
                >
                  <div className="text-sm sm:text-base">{l.label}</div>
                  <div className="text-xs text-amber-50/60">{l.pages}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !nameValid || !customValid}
          className="self-center rounded-full bg-amber-200 px-6 py-2.5 sm:px-10 sm:py-4 text-base sm:text-lg text-amber-950 transition-colors hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(252,211,77,0.35)]"
        >
          {isLoading ? "Writing your story…" : "Tell me a story"}
        </button>
      </form>

      {error && <p className="mt-6 text-amber-100 italic">{error}</p>}
    </div>
  );
}
