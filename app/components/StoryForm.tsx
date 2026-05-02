"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Language, Length, StoryRequest, Theme } from "./StoryApp";
import ThemeCarousel from "./ThemeCarousel";

const ALL_THEMES: { value: Theme; label: string; emoji: string }[] = [
  { value: "animals",      label: "Animals",           emoji: "🦊" },
  { value: "dinosaurs",    label: "Dinosaurs",          emoji: "🦕" },
  { value: "dragons",      label: "Dragons",            emoji: "🐉" },
  { value: "magic",        label: "Magic",              emoji: "✨" },
  { value: "pirates",      label: "Pirates",            emoji: "🏴‍☠️" },
  { value: "princesses",   label: "Princesses",         emoji: "👸" },
  { value: "knights",      label: "Knights",            emoji: "🛡️" },
  { value: "mermaids",     label: "Mermaids",           emoji: "🧜‍♀️" },
  { value: "unicorns",     label: "Unicorns",           emoji: "🦄" },
  { value: "fairies",      label: "Fairies",            emoji: "🧚" },
  { value: "wizards",      label: "Wizards",            emoji: "🧙" },
  { value: "robots",       label: "Robots",             emoji: "🤖" },
  { value: "superheroes",  label: "Superheroes",        emoji: "🦸" },
  { value: "space",        label: "Space",              emoji: "🚀" },
  { value: "sea-life",     label: "Sea Life",           emoji: "🐠" },
  { value: "ninjas",       label: "Ninjas",             emoji: "🥷" },
  { value: "cars-trucks",  label: "Cars & Trucks",      emoji: "🚗" },
  { value: "trains",       label: "Trains",             emoji: "🚂" },
  { value: "farm-animals", label: "Farm Animals",       emoji: "🐮" },
  { value: "snowy-day",    label: "Snowy Day",          emoji: "⛄" },
  { value: "ballerina",    label: "Ballerina",          emoji: "🩰" },
  { value: "chef",         label: "Chef",               emoji: "👨‍🍳" },
  { value: "firefighter",  label: "Firefighter",        emoji: "🚒" },
  { value: "astronaut",    label: "Astronaut",          emoji: "👨‍🚀" },
  { value: "cowboy",       label: "Cowboy",             emoji: "🤠" },
  { value: "circus",       label: "Circus",             emoji: "🎪" },
  { value: "explorer",     label: "Explorer",           emoji: "🗺️" },
  { value: "arctic",       label: "Arctic",             emoji: "🐧" },
  { value: "butterflies",  label: "Butterflies",        emoji: "🦋" },
  { value: "candy-world",  label: "Candy World",        emoji: "🍭" },
  { value: "volcano",      label: "Volcano",            emoji: "🌋" },
  { value: "time-travel",  label: "Time Travel",        emoji: "⏰" },
  { value: "haunted",      label: "Haunted",            emoji: "👻" },
  { value: "beach",        label: "Beach",              emoji: "🏖️" },
  { value: "mountain",     label: "Mountain",           emoji: "⛰️" },
  { value: "forest",       label: "Forest",             emoji: "🌲" },
  { value: "secret-agent", label: "Secret Agent",       emoji: "🕵️" },
  { value: "toy-workshop", label: "Toy Workshop",       emoji: "🧸" },
  { value: "ocean-dive",   label: "Ocean Dive",         emoji: "🤿" },
  { value: "dream-world",  label: "Dream World",        emoji: "💭" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LENGTHS: { value: Length; label: string; pages: string }[] = [
  { value: "short",  label: "Short",  pages: "2 pages" },
  { value: "medium", label: "Medium", pages: "4 pages" },
  { value: "long",   label: "Long",   pages: "6 pages" },
];

const NAME_PATTERN         = /^[\p{L}][\p{L}\s'-]{0,49}$/u;
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
  const shuffledThemes = useMemo(() => shuffle(ALL_THEMES), []);

  const [name,        setName]        = useState("");
  const [theme,       setTheme]       = useState<Theme>("animals");
  const [customTheme, setCustomTheme] = useState("");
  const [showCustom,  setShowCustom]  = useState(false);
  const [length,      setLength]      = useState<Length>("medium");
  const [language,    setLanguage]    = useState<Language>("en");

  const trimmedName        = name.trim();
  const trimmedCustomTheme = customTheme.trim();
  const nameValid          = NAME_PATTERN.test(trimmedName);
  const customActive       = showCustom && trimmedCustomTheme.length > 0;
  const customValid        = !customActive || CUSTOM_THEME_PATTERN.test(trimmedCustomTheme);
  const effectiveTheme     = customActive ? trimmedCustomTheme : theme;

  function selectPreset(t: Theme) {
    setTheme(t);
    setCustomTheme("");
    setShowCustom(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nameValid || !customValid) return;
    onSubmit({ name: trimmedName, theme: effectiveTheme, length, language });
  }

  return (
    <div className="w-full max-w-2xl text-center">
      <h1
        className="text-4xl sm:text-6xl md:text-7xl text-amber-100 mb-2 sm:mb-6 tracking-tight drop-shadow-[0_2px_18px_rgba(255,215,130,0.45)] font-semibold"
        style={{ fontFamily: "var(--font-fredoka), system-ui, sans-serif", textShadow: "0 2px 14px rgba(0,0,0,0.55)" }}
      >
        Kids Story
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-8">
        {/* Name */}
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <label
            htmlFor="name"
            className="text-xl sm:text-2xl md:text-3xl text-amber-50/90 italic leading-snug"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)" }}
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
          <ThemeCarousel
            themes={shuffledThemes}
            selected={theme}
            onSelect={(t) => selectPreset(t as Theme)}
            customActive={customActive}
            isLoading={isLoading}
          />

          {/* Collapsible custom theme input */}
          {!showCustom ? (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              disabled={isLoading}
              className="self-start text-xs sm:text-sm text-amber-50/50 italic hover:text-amber-50/80 transition-colors disabled:opacity-50"
            >
              ✏️ Or pick your own…
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                id="custom-theme"
                type="text"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                placeholder="e.g. ballerina, firefighter, chef…"
                maxLength={50}
                disabled={isLoading}
                autoFocus
                aria-invalid={!customValid}
                className={
                  "flex-1 rounded-lg border-2 bg-white/5 backdrop-blur-sm px-3 py-2 text-sm text-amber-50 placeholder:text-amber-50/35 focus:outline-none disabled:opacity-50 transition-colors " +
                  (customActive
                    ? customValid
                      ? "border-amber-200 shadow-[0_0_18px_rgba(252,211,77,0.25)]"
                      : "border-rose-300/70"
                    : "border-amber-100/20 focus:border-amber-200")
                }
              />
              <button
                type="button"
                onClick={() => { setShowCustom(false); setCustomTheme(""); }}
                disabled={isLoading}
                className="text-amber-50/40 hover:text-amber-50/80 transition-colors text-lg leading-none px-1"
                aria-label="Cancel custom theme"
              >✕</button>
            </div>
          )}
          {showCustom && customActive && !customValid && (
            <p className="text-left text-xs text-rose-200 italic">
              Letters, numbers, spaces, hyphens and apostrophes only — keep it under 50 characters.
            </p>
          )}
        </div>

        {/* Length */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <span className="text-left text-base sm:text-lg text-amber-50/85">How long?</span>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLength(l.value)}
                disabled={isLoading}
                className={
                  "rounded-lg border-2 p-2 sm:p-3 transition-colors disabled:opacity-50 backdrop-blur-sm " +
                  (length === l.value
                    ? "border-amber-200 bg-amber-100/15 text-amber-50 shadow-[0_0_18px_rgba(252,211,77,0.25)]"
                    : "border-amber-100/20 bg-white/5 text-amber-50/85 hover:bg-white/10")
                }
                aria-pressed={length === l.value}
              >
                <div className="text-sm sm:text-base">{l.label}</div>
                <div className="text-xs text-amber-50/60">{l.pages}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Language — compact flag icons only */}
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-amber-50/50 mr-1">Language:</span>
          {([["en", "🇬🇧"], ["ar", "🇸🇦"], ["tl", "🇵🇭"]] as [Language, string][]).map(([lang, flag]) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              disabled={isLoading}
              aria-label={lang === "en" ? "English" : lang === "ar" ? "Arabic" : "Filipino"}
              aria-pressed={language === lang}
              className={
                "w-10 h-10 rounded-full border-2 text-xl flex items-center justify-center transition-colors disabled:opacity-50 " +
                (language === lang
                  ? "border-amber-200 bg-amber-100/15 shadow-[0_0_12px_rgba(252,211,77,0.3)]"
                  : "border-amber-100/20 bg-white/5 hover:bg-white/10")
              }
            >
              {flag}
            </button>
          ))}
        </div>

        {/* Moon CTA — fixed top-right, same position the decorative moon occupied */}
        <button
          type="submit"
          disabled={isLoading || !nameValid || !customValid}
          className="fixed z-10 focus:outline-none group disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ right: "7%", top: "5%" }}
          aria-label={isLoading ? "Writing your story…" : "Tell me a story"}
        >
          <div className="relative" style={{ width: 110, height: 118 }}>
            {/* Moon emoji — same animation as the old decorative moon */}
            <span
              className="absolute top-0 left-0 right-0 text-center leading-none select-none
                         transition-[filter] duration-200
                         group-hover:drop-shadow-[0_0_32px_rgba(255,215,80,0.95)]"
              style={{
                fontSize: 84,
                filter: "drop-shadow(0 0 18px rgba(255,200,80,0.45))",
                animation: "ks-float 8s ease-in-out infinite, ks-glow 6s ease-in-out infinite",
              }}
            >
              🌙
            </span>
            {/* "tell me a story" curved along the bottom arc of the crescent */}
            <svg
              viewBox="0 0 110 118"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <defs>
                <path id="ks-moon-cta" d="M 8,96 Q 55,116 102,96" fill="none" />
              </defs>
              <text style={{
                fill: "rgba(255,232,160,0.95)",
                fontSize: "9.5px",
                fontWeight: "700",
                letterSpacing: "1.8px",
              }}>
                <textPath href="#ks-moon-cta" startOffset="50%" textAnchor="middle">
                  {isLoading ? "writing…" : "tell me a story"}
                </textPath>
              </text>
            </svg>
          </div>
        </button>
      </form>

      {error && <p className="mt-6 text-amber-100 italic">{error}</p>}
    </div>
  );
}
