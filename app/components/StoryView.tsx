"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Language, LoadedSavedInfo, Story, Theme } from "./StoryApp";
import type { SavedStory, ShareableStory } from "@/lib/saved-stories";
import { buildShareUrl, updateSavedStory } from "@/lib/saved-stories";
import { parseBrowser, parseOS } from "./SavedStoryStars";

// ─── Magic Ink animation ─────────────────────────────────────────────────────
const inkContainerExit = {
  opacity: 0,
  transition: { duration: 0.18, ease: "easeIn" as const },
};

const LANG_BCP47: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
};

function buildImageUrl(theme: string, pageText: string, seed: number): string {
  const params = new URLSearchParams({ theme, text: pageText, seed: String(seed) });
  return `/api/illustration?${params.toString()}`;
}

const THEME_EMOJI: Record<Theme, string[]> = {
  animals:      ["🦊", "🐰", "🦉", "🐢", "🦔", "🐿️"],
  dinosaurs:    ["🦕", "🦖", "🌋", "🌿", "🥚", "🦴"],
  dragons:      ["🐉", "🏰", "⚔️", "💎", "🛡️", "🗝️"],
  magic:        ["✨", "🪄", "🧚", "🦄", "🌟", "🔮"],
  pirates:      ["🏴‍☠️", "⛵", "💰", "🦜", "🗺️", "⚓"],
  princesses:   ["👸", "🏰", "👑", "💖", "🌹", "✨"],
  knights:      ["🛡️", "⚔️", "🏰", "🐎", "🏹", "🌟"],
  mermaids:     ["🧜‍♀️", "🐚", "🌊", "🐠", "💎", "🐬"],
  unicorns:     ["🦄", "🌈", "✨", "🌸", "🌟", "💖"],
  fairies:      ["🧚", "🌷", "🦋", "✨", "🌟", "🍄"],
  wizards:      ["🧙", "🪄", "📜", "🌟", "🔮", "🏰"],
  robots:       ["🤖", "⚙️", "🔧", "🚀", "💡", "🛠️"],
  superheroes:  ["🦸", "🦸‍♀️", "💥", "🌟", "🏙️", "🌈"],
  space:        ["🚀", "🌙", "⭐", "🪐", "🌟", "👽"],
  "sea-life":   ["🐠", "🐡", "🐙", "🐢", "🪸", "🐬"],
  ninjas:       ["🥷", "🌸", "🌿", "🌙", "⛩️", "🌟"],
  "cars-trucks":["🚗", "🚙", "🚛", "🏎️", "🛻", "🚐"],
  trains:       ["🚂", "🚆", "🛤️", "🌄", "🏞️", "🌲"],
  "farm-animals":["🐮", "🐷", "🐔", "🐑", "🦆", "🌾"],
  "snowy-day":  ["⛄", "❄️", "🛷", "☕", "🧤", "🌨️"],
};

const THEME_GRADIENT: Record<Theme, string> = {
  animals:       "from-emerald-200 via-amber-100 to-orange-200",
  dinosaurs:     "from-lime-200 via-amber-100 to-rose-200",
  dragons:       "from-rose-200 via-amber-100 to-violet-200",
  magic:         "from-fuchsia-200 via-amber-100 to-sky-200",
  pirates:       "from-blue-300 via-amber-100 to-orange-200",
  princesses:    "from-pink-200 via-rose-100 to-violet-200",
  knights:       "from-slate-300 via-amber-100 to-stone-300",
  mermaids:      "from-teal-200 via-cyan-100 to-blue-200",
  unicorns:      "from-pink-200 via-violet-100 to-sky-200",
  fairies:       "from-emerald-200 via-pink-100 to-violet-200",
  wizards:       "from-indigo-300 via-violet-200 to-amber-100",
  robots:        "from-sky-300 via-slate-100 to-emerald-200",
  superheroes:   "from-blue-300 via-amber-100 to-rose-200",
  space:         "from-indigo-300 via-purple-200 to-amber-100",
  "sea-life":    "from-cyan-200 via-blue-100 to-teal-200",
  ninjas:        "from-stone-300 via-pink-100 to-emerald-200",
  "cars-trucks": "from-orange-200 via-amber-100 to-yellow-200",
  trains:        "from-amber-200 via-emerald-100 to-stone-200",
  "farm-animals":"from-amber-200 via-yellow-100 to-emerald-200",
  "snowy-day":   "from-sky-200 via-slate-100 to-blue-200",
};

const FALLBACK_EMOJI    = ["✨", "🌙", "⭐", "🌟", "🪄", "💫"];
const FALLBACK_GRADIENT = "from-violet-200 via-amber-100 to-fuchsia-200";

function emojiFor(theme: string)    { return THEME_EMOJI[theme as Theme]    ?? FALLBACK_EMOJI; }
function gradientFor(theme: string) { return THEME_GRADIENT[theme as Theme] ?? FALLBACK_GRADIENT; }

function pickBestVoice(voices: SpeechSynthesisVoice[], language: Language) {
  const lp = language.toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(lp));
  if (!matching.length)
    return voices.find((v) => v.lang.toLowerCase().startsWith("en") && v.default)
        ?? voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  const tiers = [
    /premium|enhanced|neural/i,
    /(google|microsoft).*/i,
    /samantha|ava|allison|karen|moira|tessa|fiona|nicky|serena|kyoko|otoya|yuna|mei-jia|tian-tian/i,
  ];
  for (const re of tiers) {
    const v = matching.find((x) => re.test(x.name));
    if (v) return v;
  }
  return matching.find((v) => v.default) ?? matching[0];
}

function splitWords(text: string) {
  const out: { word: string; ws: string; start: number; end: number }[] = [];
  const re = /(\S+)(\s*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null)
    out.push({ word: m[1], ws: m[2] ?? "", start: m.index, end: m.index + m[1].length });
  return out;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function StoryView({
  story,
  theme,
  language,
  onWriteAnother,
  onSave,
  loadedSavedInfo,
}: {
  story: Story;
  theme: Theme | string;
  language: Language;
  onWriteAnother: () => void;
  /** Returns the created SavedStory so we can store its id for share-linking. */
  onSave?: (entry: Omit<SavedStory, "id" | "savedAt">) => SavedStory;
  /** Non-null when reading a previously saved story (shows provenance badge). */
  loadedSavedInfo?: LoadedSavedInfo | null;
}) {
  const [pageIdx, setPageIdx]             = useState(0);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [supported, setSupported]         = useState(true);
  const [voices, setVoices]               = useState<SpeechSynthesisVoice[]>([]);
  const [imageLoaded, setImageLoaded]     = useState(false);
  const [imageError, setImageError]       = useState(false);
  const [highlightCharIdx, setHighlight]  = useState(-1);

  // Rating + save
  const [rating, setRating]               = useState(0);
  const [hoveredStar, setHoveredStar]     = useState(0);
  const [savedEntry, setSavedEntry]       = useState<SavedStory | null>(null);
  const [copied, setCopied]               = useState(false);
  const [isPermanent, setIsPermanent]     = useState(false);

  const prefersReduced = useReducedMotion();

  const wordSegments = useMemo(() => splitWords(story.pages[pageIdx]), [story, pageIdx]);
  const total  = story.pages.length;
  const isFirst = pageIdx === 0;
  const isLast  = pageIdx === total - 1;

  const imageUrls = useMemo(
    () => story.pages.map((text, i) => buildImageUrl(theme, text, i + 1)),
    [story, theme],
  );

  useEffect(() => {
    imageUrls.forEach((u) => { const img = new Image(); img.src = u; });
  }, [imageUrls]);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (!ok) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => {
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener?.("voiceschanged", load);
    };
  }, []);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setImageLoaded(false);
    setImageError(false);
    setHighlight(-1);
  }, [pageIdx]);

  function handleListen() {
    if (!supported) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setHighlight(-1);
      return;
    }

    const utterance  = new SpeechSynthesisUtterance(story.pages[pageIdx]);
    utterance.rate   = 0.95;
    utterance.pitch  = 1.0;
    utterance.volume = 1.0;
    utterance.lang   = LANG_BCP47[language];

    const voice = pickBestVoice(voices, language);
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang || LANG_BCP47[language]; }

    const pageText = story.pages[pageIdx];
    let boundaryFired = false;
    let fallbackId: ReturnType<typeof setInterval> | null = null;

    const gracePeriod = setTimeout(() => {
      const startTime  = Date.now();
      const charsPerMs = (13 * utterance.rate) / 1000;
      fallbackId = setInterval(() => {
        if (boundaryFired) { clearInterval(fallbackId!); fallbackId = null; return; }
        setHighlight(Math.min(Math.floor((Date.now() - startTime) * charsPerMs), pageText.length - 1));
      }, 80);
    }, 300);

    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === "word" || e.name === "sentence") { boundaryFired = true; setHighlight(e.charIndex); }
    };
    function cleanup() {
      clearTimeout(gracePeriod);
      if (fallbackId) clearInterval(fallbackId);
      setIsPlaying(false);
      setHighlight(-1);
    }
    utterance.onend   = cleanup;
    utterance.onerror = cleanup;

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  function handleSave() {
    if (!onSave || rating === 0) return;
    const entry = onSave({
      title:     story.title,
      pages:     story.pages,
      theme,
      language,
      rating,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
    setSavedEntry(entry);
  }

  function handleGetPermanentLink() {
    if (!savedEntry) return;
    const shareable: ShareableStory = {
      title: story.title, pages: story.pages, theme, language,
    };
    const url = buildShareUrl(shareable);
    // Mark this saved story as having a permanent link
    updateSavedStory(savedEntry.id, { shareUrl: url });
    window.dispatchEvent(new CustomEvent("ks-stories-updated"));
    setIsPermanent(true);
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div
      className="w-full max-w-2xl flex flex-col gap-2"
      style={{ maxHeight: "calc(100dvh - 1.5rem)" }}
    >
      {/* ── Story card ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative rounded-2xl border-2 border-amber-900/15 bg-amber-50/80 p-3 sm:p-5 shadow-lg shadow-amber-900/10 flex flex-col overflow-hidden">

        {/* Provenance badge — top-right corner of card, clearly visible */}
        {loadedSavedInfo && (
          <div
            className="absolute top-2 right-2.5 text-right pointer-events-none select-none
                       bg-amber-900/10 rounded-lg px-2 py-1 backdrop-blur-sm
                       border border-amber-900/10"
            aria-hidden="true"
          >
            <div className="text-[13px] text-amber-700 leading-tight tracking-wider font-medium">
              {"★".repeat(loadedSavedInfo.rating)}
              <span className="text-amber-900/25">{"★".repeat(5 - loadedSavedInfo.rating)}</span>
            </div>
            <div className="text-[10px] text-amber-800/90 font-mono mt-0.5">
              {new Date(loadedSavedInfo.savedAt).toLocaleDateString()}
            </div>
            {loadedSavedInfo.userAgent && (
              <div className="text-[9px] text-amber-700/75 font-mono max-w-[110px] truncate mt-0.5">
                {parseBrowser(loadedSavedInfo.userAgent)} · {parseOS(loadedSavedInfo.userAgent)}
              </div>
            )}
          </div>
        )}

        {/* ← New story (top-left, every page) */}
        <button
          onClick={onWriteAnother}
          className="absolute top-2 left-2.5 text-[11px] text-amber-800/50 hover:text-amber-800 transition-colors rounded-full px-2 py-0.5 hover:bg-amber-900/8 leading-tight"
          aria-label="Back to main screen"
        >
          ✕ New story
        </button>

        {/* Title */}
        <h1 className="flex-shrink-0 text-xl sm:text-3xl md:text-4xl text-amber-900 mt-3 mb-0.5 sm:mb-1 text-center tracking-tight">
          {story.title}
        </h1>

        {/* Page counter */}
        <p className="flex-shrink-0 text-xs sm:text-sm text-amber-800/60 mb-2 sm:mb-3 text-center italic">
          Page {pageIdx + 1} of {total}
        </p>

        {/* Illustration */}
        <div
          className="flex-shrink-0 relative w-full overflow-hidden rounded-xl border-2 border-amber-900/15 mb-2 sm:mb-3 aspect-[5/3]"
          style={{ maxHeight: "min(38vh, 260px)" }}
        >
          {imageError ? (
            <div className={`h-full w-full bg-gradient-to-br ${gradientFor(theme)} flex items-center justify-center`}>
              <div className="flex gap-2 text-5xl sm:text-6xl drop-shadow-sm">
                {(() => {
                  const e = emojiFor(theme);
                  return [e[pageIdx % e.length], e[(pageIdx + 1) % e.length], e[(pageIdx + 2) % e.length]].join(" ");
                })()}
              </div>
            </div>
          ) : (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-amber-100/50 text-amber-800/60 text-sm italic">
                  Painting your picture…
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={imageUrls[pageIdx]}
                src={imageUrls[pageIdx]}
                alt={`Illustration for page ${pageIdx + 1}`}
                className={"h-full w-full object-cover transition-opacity duration-500 " + (imageLoaded ? "opacity-100" : "opacity-0")}
                onLoad={() => setImageLoaded(true)}
                onError={() => { setImageError(true); setImageLoaded(true); }}
              />
            </>
          )}
        </div>

        {/* Story text — Magic Ink bloom */}
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden py-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={pageIdx}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={prefersReduced
                ? { opacity: 0, transition: { duration: 0.15 } }
                : inkContainerExit}
              className="text-sm sm:text-xl md:text-2xl leading-relaxed text-amber-950 text-center"
            >
              {wordSegments.map((s, idx) => {
                const isActive = isPlaying && highlightCharIdx >= s.start && highlightCharIdx < s.end;
                return (
                  <Fragment key={idx}>
                    <motion.span
                      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      transition={prefersReduced ? { duration: 0.15 } : {
                        duration: 0.45, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1],
                      }}
                      className={isActive ? "kid-highlight" : undefined}
                      style={{ display: "inline-block" }}
                    >
                      {s.word}
                    </motion.span>
                    {s.ws}
                  </Fragment>
                );
              })}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Rating + save (last page only) ── */}
        {isLast && (
          <div className="flex-shrink-0 mt-1 border-t border-amber-900/10 bg-amber-950/12 rounded-xl mx-[-0.25rem] px-3 pt-2 pb-1.5 flex flex-col items-center gap-1">
            {!savedEntry ? (
              /* Not yet saved — show stars */
              <>
                <p className="text-xs text-amber-700 italic">Did you enjoy this story?</p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoveredStar || rating);
                    return (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className={`text-2xl sm:text-3xl leading-none px-0.5 transition-all select-none
                                    ${active ? "ks-rating-star-active" : "ks-rating-star-inactive"}`}
                        style={active ? ({ "--spark-delay": `${(star - 1) * 0.1}s` } as React.CSSProperties) : {}}
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                {rating > 0 && (
                  <button
                    onClick={handleSave}
                    className="text-xs rounded-full border border-amber-700/40 px-3 py-0.5 text-amber-800 hover:bg-amber-100/60 transition-colors"
                  >
                    💾 Save this story
                  </button>
                )}
              </>
            ) : (
              /* Saved — show share options */
              <div className="flex flex-col items-center gap-1 w-full">
                <p className="text-xs text-amber-700 italic">
                  ✨ Saved! {"★".repeat(savedEntry.rating)}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {/* Share (URL hash — quick copy) */}
                  <button
                    onClick={() => {
                      const url = buildShareUrl({ title: story.title, pages: story.pages, theme, language });
                      navigator.clipboard?.writeText(url).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      });
                    }}
                    className="text-xs rounded-full border border-amber-700/40 px-3 py-0.5 text-amber-800 hover:bg-amber-100/60 transition-colors"
                  >
                    {copied && !isPermanent ? "✓ Copied!" : "🔗 Share"}
                  </button>
                  {/* Permanent link — saves shareUrl to localStorage → becomes galaxy star */}
                  <button
                    onClick={handleGetPermanentLink}
                    className={`text-xs rounded-full border px-3 py-0.5 transition-colors
                                ${isPermanent
                                  ? "border-violet-400/50 text-violet-700 bg-violet-100/40"
                                  : "border-amber-700/40 text-amber-800 hover:bg-amber-100/60"}`}
                  >
                    {isPermanent
                      ? (copied ? "✓ Copied!" : "🌌 Permanent link ✓")
                      : "🌌 Get permanent link"}
                  </button>
                </div>
                <p className="text-[10px] text-amber-700/60 italic">
                  {isPermanent
                    ? "Story saved as a galaxy star ✦ anyone with the link can read it"
                    : "Permanent link works on any device, forever"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Read to me */}
        {supported && (
          <div className="flex-shrink-0 flex justify-center pt-1.5 sm:pt-2">
            <button
              onClick={handleListen}
              className="rounded-full border-2 border-amber-900/30 px-5 sm:px-6 py-1 sm:py-1.5 text-sm sm:text-base text-amber-900 transition-colors hover:bg-amber-900/5"
            >
              {isPlaying ? "■ Stop" : "▶ Read to me"}
            </button>
          </div>
        )}
      </div>

      {/* ── Navigation — always at the same position ─────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2">
        <button
          onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          className="rounded-full border-2 border-amber-100/30 px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base text-amber-50 transition-colors hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm"
        >
          ← Previous
        </button>

        {isLast ? (
          <button
            onClick={onWriteAnother}
            className="rounded-full bg-amber-200 px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base text-amber-950 transition-colors hover:bg-amber-100 shadow-[0_0_18px_rgba(252,211,77,0.3)]"
          >
            Write another story
          </button>
        ) : (
          <button
            onClick={() => setPageIdx((i) => Math.min(total - 1, i + 1))}
            className="rounded-full bg-amber-200 px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base text-amber-950 transition-colors hover:bg-amber-100 shadow-[0_0_18px_rgba(252,211,77,0.3)]"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
