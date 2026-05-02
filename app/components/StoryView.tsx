"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
  const [autoNarrate, setAutoNarrate]     = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  // Refs for stale-closure safety inside async speech event callbacks
  const autoNarrateRef  = useRef(false);
  const pageIdxRef      = useRef(pageIdx);
  const totalRef        = useRef(story.pages.length);
  // Always points to the latest handleListen (updated every render)
  const handleListenRef = useRef<() => void>(() => {});
  // Set to true in utterance.onend (no setState = no re-render = no self-cancel)
  const autoPlayPendingRef   = useRef(false);
  // Adaptive karaoke: measure actual chars/ms from previous page to calibrate next page
  const calibratedRateRef    = useRef<number | null>(null);
  const speechStartTimeRef   = useRef<number | null>(null);
  // Tracks current imageLoaded state without stale closure in the auto-play effect
  const imageLoadedRef       = useRef(false);
  // Hold strong references to prefetch Image objects so the browser doesn't
  // GC them mid-request and cancel the in-flight illustration fetches.
  const prefetchRefsRef      = useRef<HTMLImageElement[]>([]);

  useEffect(() => { autoNarrateRef.current  = autoNarrate;   }, [autoNarrate]);
  useEffect(() => { imageLoadedRef.current  = imageLoaded;   }, [imageLoaded]);
  useEffect(() => {
    pageIdxRef.current = pageIdx;
    totalRef.current   = story.pages.length;
  }, [pageIdx, story.pages.length]);

  const prefersReduced = useReducedMotion();

  const wordSegments = useMemo(() => splitWords(story.pages[pageIdx]), [story, pageIdx]);
  const total  = story.pages.length;
  const isFirst = pageIdx === 0;
  const isLast  = pageIdx === total - 1;

  const imageUrls = useMemo(
    () => story.pages.map((text, i) => buildImageUrl(theme, text, i + 1)),
    [story, theme],
  );

  // Prefetch ALL page illustrations upfront and keep strong refs so the
  // browser doesn't GC the Image objects mid-request (which would cancel
  // the in-flight fetch).  Cache-Control: immutable on the route means
  // subsequent renders get instant cache hits.
  useEffect(() => {
    prefetchRefsRef.current = imageUrls.map((u) => {
      const img = new Image();
      img.src = u;
      return img;
    });
    return () => { prefetchRefsRef.current = []; };
  }, [imageUrls]);

  // Re-kick the next page's prefetch whenever we land on a new page — this
  // acts as a second safety net in case the initial global prefetch missed it
  // or the Pollinations.ai response hadn't arrived yet.
  useEffect(() => {
    if (pageIdx < imageUrls.length - 1) {
      const img = new Image();
      img.src = imageUrls[pageIdx + 1];
      // Keep alongside the global refs so it stays alive
      prefetchRefsRef.current[pageIdx + 1] = img;
    }
  }, [pageIdx, imageUrls]);

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
    imageLoadedRef.current = false; // reset synchronously so auto-play effect sees false
    setImageError(false);
    setHighlight(-1);
  }, [pageIdx]);

  // Auto-narration: fires whenever pageIdx changes.  If autoPlayPendingRef is
  // set (meaning the page advance came from utterance.onend, not a tap), we
  // wait for the illustration to load before starting narration.
  // Polls imageLoadedRef every 150ms; starts after image loads OR after 4s
  // (whichever comes first) so the reader always hears the full story.
  useEffect(() => {
    if (!autoPlayPendingRef.current) return;
    autoPlayPendingRef.current = false;
    let tid: ReturnType<typeof setTimeout>   | null = null;
    let iid: ReturnType<typeof setInterval>  | null = null;

    function beginNarration() {
      if (iid) { clearInterval(iid); iid = null; }
      // Small buffer (400ms) so the new page text animation settles first
      tid = setTimeout(() => handleListenRef.current(), 400);
    }

    if (imageLoadedRef.current) {
      beginNarration();
    } else {
      // Poll every 100ms; give Pollinations.ai up to 8s before giving up.
      // With a warm prefetch cache the image fires in <50ms so narration
      // starts with effectively no perceptible delay.
      const deadline = Date.now() + 8000;
      iid = setInterval(() => {
        if (imageLoadedRef.current || Date.now() >= deadline) beginNarration();
      }, 100);
    }

    // Only cancel if the user manually navigates away before narration starts
    return () => { if (tid) clearTimeout(tid); if (iid) clearInterval(iid); };
  }, [pageIdx]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const pageText    = story.pages[pageIdx];
    let boundaryFired = false;
    let fallbackIval: ReturnType<typeof setInterval> | null = null;
    let safetyTimer:  ReturnType<typeof setTimeout>  | null = null;

    // ── Karaoke fallback (iOS Safari: onboundary never fires) ──────────────
    // Runs an interval every 80ms that continuously estimates which word is
    // currently being spoken based on elapsed time.  This is more resilient
    // than pre-scheduled per-word timers because it self-corrects every tick
    // rather than locking in the drift from the first tick.
    //
    // Rate default: 10 chars/sec at rate=1.0.
    //   iOS TTS at ~125 wpm × ~5 chars/word × 1 space = ~10.4 chars/sec.
    //   Previous approach used 13 chars/sec (≈ 25% too fast → highlights
    //   ran 1-2 words ahead of the voice).  10 is a much better baseline.
    //   After page 1, calibratedRateRef holds the measured chars/ms from the
    //   actual utterance duration, so pages 2+ self-calibrate automatically.
    function startFallback() {
      if (fallbackIval !== null) return; // already running
      const charsPerMs = calibratedRateRef.current ?? (10 * utterance.rate / 1000);
      fallbackIval = setInterval(() => {
        if (boundaryFired || speechStartTimeRef.current === null) return;
        const elapsed  = Date.now() - speechStartTimeRef.current;
        const charPos  = elapsed * charsPerMs;
        // Find the last word whose start offset ≤ estimated char position
        let active = -1;
        for (const w of wordSegments) {
          if (w.start <= charPos) active = w.start;
          else break;
        }
        if (active >= 0) setHighlight(active);
      }, 80);
    }

    // onstart fires when iOS audio actually begins — record the exact moment
    // and start the rolling highlight estimator immediately.
    utterance.onstart = () => {
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
      speechStartTimeRef.current = Date.now();
      startFallback();
    };
    // Safety net: if onstart never fires (some Android WebViews), kick after 600ms.
    safetyTimer = setTimeout(() => {
      speechStartTimeRef.current = Date.now();
      startFallback();
    }, 600);

    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === "word" || e.name === "sentence") { boundaryFired = true; setHighlight(e.charIndex); }
    };

    function cleanup() {
      if (safetyTimer)  { clearTimeout(safetyTimer);  safetyTimer  = null; }
      if (fallbackIval) { clearInterval(fallbackIval); fallbackIval = null; }
      setIsPlaying(false);
      setHighlight(-1);
    }

    utterance.onend = () => {
      // Measure actual speech duration → calibrate chars/ms for next page
      if (speechStartTimeRef.current !== null) {
        const elapsed = Date.now() - speechStartTimeRef.current;
        if (elapsed > 500 && pageText.length > 10) {
          calibratedRateRef.current = pageText.length / elapsed;
        }
        speechStartTimeRef.current = null;
      }
      cleanup();
      // Auto-narration: set ref BEFORE setPageIdx so the pageIdx effect
      // sees it as true in the same React flush.
      if (autoNarrateRef.current && pageIdxRef.current < totalRef.current - 1) {
        autoPlayPendingRef.current = true;
        setPageIdx((p) => p + 1);
      }
    };
    utterance.onerror = cleanup;

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  // Keep the ref current so the autoPlayPending effect always calls the
  // freshest version of handleListen (with the right pageIdx in closure).
  handleListenRef.current = handleListen;

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

  /** Save story to Vercel KV → get short URL → turn local star into galaxy. */
  async function handleCloudSave() {
    if (!savedEntry || isSavingCloud || isPermanent) return;
    setIsSavingCloud(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: story.title, pages: story.pages, theme, language }),
      });
      if (!res.ok) throw new Error("save failed");
      const { url } = (await res.json()) as { id: string; url: string };
      const fullUrl = `${window.location.origin}${url}`;
      // Update localStorage entry: shareUrl → cloud URL, which turns star → galaxy
      updateSavedStory(savedEntry.id, { shareUrl: fullUrl });
      window.dispatchEvent(new CustomEvent("ks-stories-updated"));
      setIsPermanent(true);
      navigator.clipboard?.writeText(fullUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch {
      // Silent fail — button stays clickable so user can retry
    } finally {
      setIsSavingCloud(false);
    }
  }

  return (
    <div
      className="w-full max-w-2xl flex flex-col gap-2"
      style={{ maxHeight: "calc(100dvh - 1.5rem)" }}
    >
      {/* ── Story card ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative rounded-2xl border-2 border-amber-900/15 bg-amber-50/80 p-3 sm:p-5 shadow-lg shadow-amber-900/10 flex flex-col overflow-hidden">

        {/* Provenance ribbon — diagonal bookmark strip in the top-right corner.
            The wrapper clips the rotated strip at the card's rounded corner.
            Sits entirely within the corner so it never overlaps title or content. */}
        {loadedSavedInfo && (
          <div
            className="absolute top-0 right-0 w-[88px] h-[88px] overflow-hidden
                       rounded-tr-2xl pointer-events-none select-none"
            aria-hidden="true"
          >
            <div
              className="absolute bg-red-700 text-white text-center
                         shadow-[0_2px_8px_rgba(0,0,0,0.28)]"
              style={{
                width: "120px",
                top: "19px",
                right: "-32px",
                transform: "rotate(45deg)",
                padding: "5px 0 6px",
              }}
            >
              {/* Rating stars */}
              <p className="text-[11px] font-semibold leading-none tracking-wide">
                {"★".repeat(loadedSavedInfo.rating)}
                <span className="opacity-30">{"★".repeat(5 - loadedSavedInfo.rating)}</span>
              </p>
              {/* Save date */}
              <p className="text-[8px] opacity-90 font-mono mt-[3px] leading-none">
                {new Date(loadedSavedInfo.savedAt).toLocaleDateString()}
              </p>
              {/* Browser · OS */}
              {loadedSavedInfo.userAgent && (
                <p className="text-[7px] opacity-65 font-mono mt-[2px] leading-none">
                  {parseBrowser(loadedSavedInfo.userAgent)}
                </p>
              )}
            </div>
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
                  {/* Cloud save → short URL → local star becomes a galaxy */}
                  <button
                    onClick={handleCloudSave}
                    disabled={isSavingCloud || isPermanent}
                    className={`text-xs rounded-full border px-3 py-0.5 transition-colors disabled:cursor-default
                                ${isPermanent
                                  ? "border-violet-400/50 text-violet-700 bg-violet-100/40"
                                  : "border-amber-700/40 text-amber-800 hover:bg-amber-100/60 disabled:opacity-60"}`}
                  >
                    {isSavingCloud ? "Saving…" : isPermanent
                      ? (copied ? "✓ Copied!" : "🌌 Cloud saved ✓")
                      : "🌌 Save to cloud"}
                  </button>
                </div>
                <p className="text-[10px] text-amber-700/60 italic">
                  {isPermanent
                    ? "Galaxy star ✦ share the link — works on any device, forever"
                    : "Cloud save creates a short link and upgrades your star to a galaxy"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Read to me + Auto-narration toggle */}
        {supported && (
          <div className="flex-shrink-0 flex items-center justify-center gap-3 pt-1.5 sm:pt-2">
            <button
              onClick={handleListen}
              className="rounded-full border-2 border-amber-900/30 px-5 sm:px-6 py-1 sm:py-1.5 text-sm sm:text-base text-amber-900 transition-colors hover:bg-amber-900/5"
            >
              {isPlaying ? "■ Stop" : "▶ Read to me"}
            </button>

            {/* Auto-narration checkbox: advances pages automatically until the end */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none group">
              <button
                type="button"
                role="checkbox"
                aria-checked={autoNarrate}
                onClick={() => setAutoNarrate((v) => !v)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center
                            transition-colors flex-shrink-0
                            ${autoNarrate
                              ? "bg-amber-700 border-amber-700"
                              : "border-amber-900/30 bg-transparent group-hover:border-amber-700/50"}`}
              >
                {autoNarrate && (
                  <span className="text-white text-[9px] font-bold leading-none">✓</span>
                )}
              </button>
              <span
                onClick={() => setAutoNarrate((v) => !v)}
                className="text-xs text-amber-900/55 group-hover:text-amber-900/80 transition-colors"
              >
                Auto-narration
              </span>
            </label>
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
