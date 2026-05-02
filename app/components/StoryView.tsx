"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Language, LoadedSavedInfo, Story, Theme } from "./StoryApp";
import { scheduleMelody, getMelodyStyle, getMelodyLoopDur } from "@/lib/lullaby-melody";
import { getAudioCache, setAudioCache } from "@/lib/audio-cache";
import type { SavedStory, ShareableStory } from "@/lib/saved-stories";
import { buildShareUrl, updateSavedStory } from "@/lib/saved-stories";
import { parseBrowser, parseOS } from "./SavedStoryStars";

// ─── ElevenLabs alignment type ───────────────────────────────────────────────
type ELAlignment = {
  characters:                    string[];
  character_start_times_seconds: number[];
  character_end_times_seconds:   number[];
};

// ─── Magic Ink animation ─────────────────────────────────────────────────────
const inkContainerExit = {
  opacity: 0,
  transition: { duration: 0.18, ease: "easeIn" as const },
};

const LANG_BCP47: Record<Language, string> = {
  en: "en-US",
  ar: "ar-SA",
  tl: "fil-PH",
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
  ballerina:    ["🩰", "🌸", "✨", "💃", "🌟", "👑"],
  chef:         ["👨‍🍳", "🍕", "🎂", "🥐", "🌟", "🥄"],
  firefighter:  ["🚒", "🔥", "👩‍🚒", "🌟", "🦺", "💪"],
  astronaut:    ["👨‍🚀", "🌙", "⭐", "🛸", "🌌", "🪐"],
  cowboy:       ["🤠", "🐎", "🌵", "⭐", "🌅", "🌟"],
  circus:       ["🎪", "🎠", "🤹", "🎡", "🌟", "🎭"],
  explorer:     ["🗺️", "🧭", "🌿", "⛺", "🌟", "🦁"],
  arctic:       ["🐧", "❄️", "🐻‍❄️", "🌨️", "⛄", "🌟"],
  butterflies:  ["🦋", "🌸", "🌺", "🌿", "✨", "🌼"],
  "candy-world":["🍭", "🍬", "🍫", "🧁", "🌟", "🍰"],
  volcano:      ["🌋", "🦕", "🌊", "⚡", "🌟", "🏔️"],
  "time-travel":["⏰", "🕰️", "⚡", "🌟", "🔬", "🚀"],
  haunted:      ["👻", "🏚️", "🕷️", "🌙", "🦇", "✨"],
  beach:        ["🏖️", "🌊", "🐚", "🌴", "☀️", "🦀"],
  mountain:     ["⛰️", "🏔️", "🦅", "🌟", "🎿", "🌲"],
  forest:       ["🌲", "🍄", "🦊", "🌿", "🌙", "✨"],
  "secret-agent":["🕵️", "🔍", "💼", "🌟", "🕶️", "⚡"],
  "toy-workshop":["🧸", "🎁", "🔧", "🌟", "⚙️", "🎪"],
  "ocean-dive": ["🤿", "🐙", "🦑", "🐠", "🌊", "💎"],
  "dream-world":["💭", "🌙", "⭐", "🌈", "✨", "🦋"],
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
  ballerina:     "from-pink-200 via-rose-100 to-fuchsia-200",
  chef:          "from-amber-200 via-yellow-100 to-orange-200",
  firefighter:   "from-red-300 via-amber-100 to-orange-200",
  astronaut:     "from-indigo-300 via-slate-200 to-blue-200",
  cowboy:        "from-amber-300 via-orange-100 to-stone-200",
  circus:        "from-red-200 via-yellow-100 to-violet-200",
  explorer:      "from-emerald-300 via-amber-100 to-stone-200",
  arctic:        "from-sky-200 via-blue-100 to-slate-200",
  butterflies:   "from-fuchsia-200 via-pink-100 to-amber-200",
  "candy-world": "from-pink-200 via-rose-100 to-amber-200",
  volcano:       "from-red-300 via-orange-200 to-amber-100",
  "time-travel": "from-violet-300 via-blue-200 to-amber-100",
  haunted:       "from-slate-300 via-purple-200 to-stone-200",
  beach:         "from-sky-200 via-amber-100 to-cyan-200",
  mountain:      "from-stone-300 via-sky-100 to-emerald-200",
  forest:        "from-emerald-300 via-green-100 to-amber-200",
  "secret-agent":"from-slate-300 via-blue-100 to-indigo-200",
  "toy-workshop":"from-amber-200 via-pink-100 to-violet-200",
  "ocean-dive":  "from-cyan-300 via-blue-200 to-teal-200",
  "dream-world": "from-violet-200 via-pink-100 to-sky-200",
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
  const [sing, setSing]                   = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isFetching,   setIsFetching]    = useState(false); // loading EL audio

  // Stable voice index for Tagalog — picked once per story session so all
  // pages use the same narrator voice rather than changing page-to-page.
  const sessionVoiceIdxRef = useRef(Math.floor(Math.random() * 3));

  // Refs for stale-closure safety inside async speech event callbacks
  const autoNarrateRef  = useRef(false);
  const singRef         = useRef(false);
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
  // Per-page prefetch status — true once the browser has fully received the
  // image data (or received an error).  Auto-narration reads these instead of
  // the <img> element's onLoad so it doesn't need to wait for the DOM.
  const pageImgReadyRef      = useRef<boolean[]>([]);
  const pageImgErrorRef      = useRef<boolean[]>([]);
  // Hold strong references to prefetch Image objects so the browser doesn't
  // GC them mid-request and cancel the in-flight illustration fetches.
  const prefetchRefsRef      = useRef<HTMLImageElement[]>([]);
  // ElevenLabs audio playback
  const audioCtxRef          = useRef<AudioContext | null>(null);
  const audioSrcRef          = useRef<AudioBufferSourceNode | null>(null);
  const audioFetchAbortRef   = useRef<AbortController | null>(null);
  // Per-page audio cache so re-plays and auto-narration are instant (no re-fetch)
  const pageAudioRef         = useRef<Map<number, { buffer: AudioBuffer; alignment: ELAlignment }>>(new Map());
  // Lullaby melody (Filipino easter egg)
  const melodyGainRef           = useRef<GainNode | null>(null);
  const melodyScheduledUntilRef = useRef(0);

  useEffect(() => { autoNarrateRef.current  = autoNarrate;   }, [autoNarrate]);
  useEffect(() => {
    singRef.current = sing;
    // Clear audio cache so switching sing/speak mode re-fetches with new settings
    pageAudioRef.current.clear();
    // Reset melody scheduling cursor so next start re-schedules fresh
    melodyScheduledUntilRef.current = 0;
  }, [sing]);

  // Lullaby melody — plays as background music while sing mode is active.
  // Uses a setInterval keepalive so the music never stops mid-story.
  useEffect(() => {
    if (!sing || !isPlaying) {
      const g = melodyGainRef.current;
      if (!g || g.context.state === "closed") return;
      const t = g.context.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0, g.gain.value), t);
      g.gain.linearRampToValueAtTime(0, t + 0.4);
      return;
    }

    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") return;

    const style   = getMelodyStyle(theme);
    const loopDur = getMelodyLoopDur(style);

    // Create gain node if needed (or if context was recreated)
    if (!melodyGainRef.current || melodyGainRef.current.context !== ctx) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(ctx.destination);
      melodyGainRef.current = g;
    }
    const g   = melodyGainRef.current;
    const now = ctx.currentTime;

    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0.65, now + 1.0);

    // Initial burst: schedule 3 loops ahead
    if (melodyScheduledUntilRef.current <= now + 0.1) {
      scheduleMelody(ctx, g, now, 3, style);
      melodyScheduledUntilRef.current = now + 3 * loopDur;
    }

    // Keepalive: every ~8 s check if we're within 20 s of running out;
    // if so, schedule 3 more loops. This keeps music going indefinitely.
    const iv = setInterval(() => {
      const c = audioCtxRef.current;
      const gn = melodyGainRef.current;
      if (!c || c.state === "closed" || !gn) return;
      const t2 = c.currentTime;
      const ld = getMelodyLoopDur(getMelodyStyle(theme));
      if (melodyScheduledUntilRef.current <= t2 + 20) {
        scheduleMelody(c, gn, melodyScheduledUntilRef.current, 3, getMelodyStyle(theme));
        melodyScheduledUntilRef.current += 3 * ld;
      }
    }, 8_000);

    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sing, isPlaying, theme]);
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

  // ── Background pre-load for ALL pages ──────────────────────────────────
  // Fires once when the story first appears.  Every page's illustration is
  // fetched in parallel and strong Image refs are kept alive so the browser
  // never GCs them mid-request.  Cache-Control: immutable on the API route
  // means the browser caches each response; when the <img> element later
  // renders with the same URL it gets an instant cache hit.
  //
  // pageImgReadyRef[i] / pageImgErrorRef[i] are set as each fetch finishes.
  // The page-change effect below reads these to skip "Painting…" on pages
  // whose images are already in the cache.
  useEffect(() => {
    const n = imageUrls.length;
    pageImgReadyRef.current = new Array(n).fill(false);
    pageImgErrorRef.current = new Array(n).fill(false);

    const imgs = imageUrls.map((url, i) => {
      const img = new Image();
      img.onload = () => {
        pageImgReadyRef.current[i] = true;
        // If the user is currently on this page and still waiting, flip
        // imageLoaded so the placeholder disappears without a re-navigate.
        if (i === pageIdxRef.current) {
          setImageLoaded(true);
          imageLoadedRef.current = true;
        }
      };
      img.onerror = () => {
        pageImgReadyRef.current[i] = true;  // treat error as "done"
        pageImgErrorRef.current[i] = true;
        if (i === pageIdxRef.current) {
          setImageError(true);
          setImageLoaded(true);
          imageLoadedRef.current = true;
        }
      };
      img.src = url;
      return img;
    });
    prefetchRefsRef.current = imgs;
    return () => { prefetchRefsRef.current = []; };
  }, [imageUrls]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Stop all audio (Web Speech + ElevenLabs) and any in-flight fetch
    window.speechSynthesis?.cancel();
    try { audioSrcRef.current?.stop(); } catch { /* already stopped */ }
    audioSrcRef.current = null;
    audioFetchAbortRef.current?.abort();
    audioFetchAbortRef.current = null;
    setIsPlaying(false);
    setIsFetching(false);
    setHighlight(-1);
    // If this page's image was already fetched in the background, show it
    // immediately — no "Painting your picture…" placeholder needed.
    const ready = pageImgReadyRef.current[pageIdx] ?? false;
    const error = pageImgErrorRef.current[pageIdx] ?? false;
    setImageLoaded(ready);
    imageLoadedRef.current = ready;
    setImageError(error);
  }, [pageIdx]);

  // Auto-narration: fires whenever pageIdx changes.  If autoPlayPendingRef is
  // set (the page advance came from utterance.onend, not a manual tap), wait
  // for the illustration to be ready before starting narration.
  //
  // We check pageImgReadyRef (set by the background prefetch onload/onerror)
  // rather than the <img> element's own onLoad — the prefetch tracks network
  // completion, which is earlier and more reliable.  For a story whose images
  // were all pre-loaded in the background, this check is true immediately and
  // narration starts after just the 400 ms text-animation settle time.
  useEffect(() => {
    if (!autoPlayPendingRef.current) return;
    autoPlayPendingRef.current = false;
    let tid: ReturnType<typeof setTimeout>   | null = null;
    let iid: ReturnType<typeof setInterval>  | null = null;

    function beginNarration() {
      if (iid) { clearInterval(iid); iid = null; }
      // 400ms buffer so the page-turn text bloom animation settles first
      tid = setTimeout(() => handleListenRef.current(), 400);
    }

    if (pageImgReadyRef.current[pageIdx]) {
      beginNarration();
    } else {
      // Image still loading — poll every 100ms.  No hard deadline: we keep
      // waiting until the prefetch either succeeds or errors (onerror also
      // sets ready=true so we never hang).
      iid = setInterval(() => {
        if (pageImgReadyRef.current[pageIdx]) beginNarration();
      }, 100);
    }

    // Clean up if the user manually navigates away before narration starts
    return () => { if (tid) clearTimeout(tid); if (iid) clearInterval(iid); };
  }, [pageIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio helpers ─────────────────────────────────────────────────────────

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  async function base64ToAudioBuffer(b64: string): Promise<AudioBuffer> {
    const binary = atob(b64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return getAudioCtx().decodeAudioData(bytes.buffer);
  }

  // Play a decoded AudioBuffer with pixel-perfect karaoke using EL timestamps.
  function playElevenLabs(buffer: AudioBuffer, alignment: ELAlignment, forPageIdx: number) {
    const ctx = getAudioCtx();
    try { audioSrcRef.current?.stop(); } catch { /* already stopped */ }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    audioSrcRef.current = src;

    // Schedule one setTimeout per word using the exact character start time
    // from ElevenLabs — eliminates all estimation drift.
    const charTimes = alignment.character_start_times_seconds;
    const wordTimers: ReturnType<typeof setTimeout>[] = [];
    wordSegments.forEach(({ start }) => {
      const t = charTimes[start];
      if (t !== undefined) {
        wordTimers.push(setTimeout(() => setHighlight(start), t * 1000));
      }
    });

    src.onended = () => {
      wordTimers.forEach(clearTimeout);
      audioSrcRef.current = null;
      setIsPlaying(false);
      setHighlight(-1);
      // Auto-narration
      if (autoNarrateRef.current && pageIdxRef.current < totalRef.current - 1) {
        autoPlayPendingRef.current = true;
        setPageIdx((p) => p + 1);
      }
    };

    src.start(0);
    setIsPlaying(true);

    // Background-prefetch the NEXT page's audio while this one plays so
    // auto-narration transitions are instant (no loading gap between pages).
    const nextIdx = forPageIdx + 1;
    if (nextIdx < story.pages.length && !pageAudioRef.current.has(nextIdx)) {
      const nextText  = story.pages[nextIdx];
      const nextSing  = singRef.current;
      const themeStr2 = theme as string;

      // Check persistent cache first — zero credits if already there
      const nextPersisted = getAudioCache(nextText, language, themeStr2, nextSing);
      if (nextPersisted) {
        base64ToAudioBuffer(nextPersisted.audioBase64)
          .then((buf) => pageAudioRef.current.set(nextIdx, { buffer: buf, alignment: nextPersisted.alignment }))
          .catch(() => {});
      } else {
        fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nextText, language, theme, sing: nextSing, voiceIdx: sessionVoiceIdxRef.current }),
        })
          .then((r) => r.ok ? r.json() : Promise.reject())
          .then((data: { audioBase64: string; alignment: ELAlignment }) => {
            setAudioCache(nextText, language, themeStr2, nextSing, { audioBase64: data.audioBase64, alignment: data.alignment });
            return base64ToAudioBuffer(data.audioBase64).then((buf) => {
              pageAudioRef.current.set(nextIdx, { buffer: buf, alignment: data.alignment });
            });
          })
          .catch(() => {});
      }
    }
  }

  // ── Web Speech API fallback (iOS Safari / offline) ────────────────────────
  function playWebSpeech() {
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

    function startFallback() {
      if (fallbackIval !== null) return;
      const charsPerMs = calibratedRateRef.current ?? (10 * utterance.rate / 1000);
      fallbackIval = setInterval(() => {
        if (boundaryFired || speechStartTimeRef.current === null) return;
        const elapsed = Date.now() - speechStartTimeRef.current;
        const charPos = elapsed * charsPerMs;
        let active = -1;
        for (const w of wordSegments) {
          if (w.start <= charPos) active = w.start;
          else break;
        }
        if (active >= 0) setHighlight(active);
      }, 80);
    }

    utterance.onstart = () => {
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
      speechStartTimeRef.current = Date.now();
      startFallback();
    };
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
      if (speechStartTimeRef.current !== null) {
        const elapsed = Date.now() - speechStartTimeRef.current;
        if (elapsed > 500 && pageText.length > 10)
          calibratedRateRef.current = pageText.length / elapsed;
        speechStartTimeRef.current = null;
      }
      cleanup();
      if (autoNarrateRef.current && pageIdxRef.current < totalRef.current - 1) {
        autoPlayPendingRef.current = true;
        setPageIdx((p) => p + 1);
      }
    };
    utterance.onerror = cleanup;

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  // ── Main entry point ──────────────────────────────────────────────────────
  // Tries ElevenLabs first (beautiful voice + perfect karaoke timing).
  // Falls back to Web Speech API if EL isn't configured or the request fails.
  async function handleListen() {
    // Stop button: cancel everything in-flight
    if (isPlaying || isFetching) {
      window.speechSynthesis?.cancel();
      try { audioSrcRef.current?.stop(); } catch { /* already stopped */ }
      audioSrcRef.current = null;
      audioFetchAbortRef.current?.abort();
      audioFetchAbortRef.current = null;
      setIsPlaying(false);
      setIsFetching(false);
      setHighlight(-1);
      return;
    }

    // 1. In-memory cache (fastest — already decoded AudioBuffer)
    const cached = pageAudioRef.current.get(pageIdx);
    if (cached) {
      playElevenLabs(cached.buffer, cached.alignment, pageIdx);
      return;
    }

    // 2. Persistent localStorage cache (no ElevenLabs credits consumed on replay)
    const pageText   = story.pages[pageIdx];
    const themeStr   = theme as string;
    const persisted  = getAudioCache(pageText, language, themeStr, sing);
    if (persisted) {
      try {
        const buffer = await base64ToAudioBuffer(persisted.audioBase64);
        pageAudioRef.current.set(pageIdx, { buffer, alignment: persisted.alignment });
        playElevenLabs(buffer, persisted.alignment, pageIdx);
        return;
      } catch {
        // Corrupt cache entry — fall through to fresh fetch
      }
    }

    // 3. Fetch from ElevenLabs
    const abort = new AbortController();
    audioFetchAbortRef.current = abort;
    setIsFetching(true);

    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pageText, language, theme, sing, voiceIdx: sessionVoiceIdxRef.current }),
        signal: abort.signal,
      });

      if (res.ok) {
        const data = await res.json() as { audioBase64: string; alignment: ELAlignment };
        // Persist to localStorage so future replays skip ElevenLabs entirely
        setAudioCache(pageText, language, themeStr, sing, { audioBase64: data.audioBase64, alignment: data.alignment });
        const buffer = await base64ToAudioBuffer(data.audioBase64);
        pageAudioRef.current.set(pageIdx, { buffer, alignment: data.alignment });
        setIsFetching(false);
        audioFetchAbortRef.current = null;
        playElevenLabs(buffer, data.alignment, pageIdx);
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // user hit Stop
    }

    // ElevenLabs unavailable — fall back to Web Speech API
    setIsFetching(false);
    audioFetchAbortRef.current = null;
    if (supported) playWebSpeech();
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
          style={{ maxHeight: "min(32vh, 230px)" }}
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
        {/* overflow-y-auto: text scrolls within the card rather than clipping.
            flex flex-col: lets motion.p use my-auto to stay vertically centered
            when the content is short enough to fit without scrolling. */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain py-1">
          <AnimatePresence mode="wait">
            <motion.p
              key={pageIdx}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={prefersReduced
                ? { opacity: 0, transition: { duration: 0.15 } }
                : inkContainerExit}
              className={"my-auto py-1 text-sm sm:text-xl md:text-2xl leading-relaxed text-amber-950 text-center" + (language === "tl" ? " whitespace-pre-line" : "")}
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

        {/* ── Rating + save (last page only, not when replaying a saved story) ── */}
        {isLast && !loadedSavedInfo && (
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
        <div className="flex-shrink-0 flex items-center justify-center gap-3 pt-1.5 sm:pt-2">
            <button
              onClick={() => { void handleListen(); }}
              disabled={false}
              className="rounded-full border-2 border-amber-900/30 px-5 sm:px-6 py-1 sm:py-1.5 text-sm sm:text-base text-amber-900 transition-colors hover:bg-amber-900/5 disabled:opacity-60"
            >
              {isPlaying ? "■ Stop" : isFetching ? "⏳ Loading…" : "▶ Read to me"}
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

            {/* 🇵🇭 Easter egg: lullaby sing mode — only visible when Filipino + auto-narrate */}
            {language === "tl" && autoNarrate && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={sing}
                  onClick={() => setSing((v) => !v)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center
                              transition-colors flex-shrink-0
                              ${sing
                                ? "bg-fuchsia-600 border-fuchsia-600"
                                : "border-amber-900/30 bg-transparent group-hover:border-fuchsia-500/50"}`}
                >
                  {sing && (
                    <span className="text-white text-[9px] font-bold leading-none">✓</span>
                  )}
                </button>
                <span
                  onClick={() => setSing((v) => !v)}
                  className="text-xs text-amber-900/45 group-hover:text-fuchsia-700/80 transition-colors"
                >
                  🎵 Awitin
                </span>
              </label>
            )}
          </div>
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
