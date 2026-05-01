"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Language, Story, Theme } from "./StoryApp";

// ─── Magic Ink animation variants ────────────────────────────────────────────
// Container: orchestrates the word-by-word stagger and handles page exit.
const inkContainerVariants = {
  hidden: { opacity: 1 }, // container itself stays visible; words handle opacity
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,   // 30 ms between each word blooming
      delayChildren: 0.06,     // slight pause before the first word
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18, ease: "easeIn" as const },
  },
};

// Each word: fades in, rises 7 px, and un-blurs — like ink soaking into paper.
const inkWordVariants = {
  hidden: {
    opacity: 0,
    y: 7,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const, // fast rise, gentle settle
    },
  },
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
  const params = new URLSearchParams({
    theme,
    text: pageText,
    seed: String(seed),
  });
  return `/api/illustration?${params.toString()}`;
}

const THEME_EMOJI: Record<Theme, string[]> = {
  animals: ["🦊", "🐰", "🦉", "🐢", "🦔", "🐿️"],
  dinosaurs: ["🦕", "🦖", "🌋", "🌿", "🥚", "🦴"],
  dragons: ["🐉", "🏰", "⚔️", "💎", "🛡️", "🗝️"],
  magic: ["✨", "🪄", "🧚", "🦄", "🌟", "🔮"],
  pirates: ["🏴‍☠️", "⛵", "💰", "🦜", "🗺️", "⚓"],
  princesses: ["👸", "🏰", "👑", "💖", "🌹", "✨"],
  knights: ["🛡️", "⚔️", "🏰", "🐎", "🏹", "🌟"],
  mermaids: ["🧜‍♀️", "🐚", "🌊", "🐠", "💎", "🐬"],
  unicorns: ["🦄", "🌈", "✨", "🌸", "🌟", "💖"],
  fairies: ["🧚", "🌷", "🦋", "✨", "🌟", "🍄"],
  wizards: ["🧙", "🪄", "📜", "🌟", "🔮", "🏰"],
  robots: ["🤖", "⚙️", "🔧", "🚀", "💡", "🛠️"],
  superheroes: ["🦸", "🦸‍♀️", "💥", "🌟", "🏙️", "🌈"],
  space: ["🚀", "🌙", "⭐", "🪐", "🌟", "👽"],
  "sea-life": ["🐠", "🐡", "🐙", "🐢", "🪸", "🐬"],
  ninjas: ["🥷", "🌸", "🌿", "🌙", "⛩️", "🌟"],
  "cars-trucks": ["🚗", "🚙", "🚛", "🏎️", "🛻", "🚐"],
  trains: ["🚂", "🚆", "🛤️", "🌄", "🏞️", "🌲"],
  "farm-animals": ["🐮", "🐷", "🐔", "🐑", "🦆", "🌾"],
  "snowy-day": ["⛄", "❄️", "🛷", "☕", "🧤", "🌨️"],
};

const THEME_GRADIENT: Record<Theme, string> = {
  animals: "from-emerald-200 via-amber-100 to-orange-200",
  dinosaurs: "from-lime-200 via-amber-100 to-rose-200",
  dragons: "from-rose-200 via-amber-100 to-violet-200",
  magic: "from-fuchsia-200 via-amber-100 to-sky-200",
  pirates: "from-blue-300 via-amber-100 to-orange-200",
  princesses: "from-pink-200 via-rose-100 to-violet-200",
  knights: "from-slate-300 via-amber-100 to-stone-300",
  mermaids: "from-teal-200 via-cyan-100 to-blue-200",
  unicorns: "from-pink-200 via-violet-100 to-sky-200",
  fairies: "from-emerald-200 via-pink-100 to-violet-200",
  wizards: "from-indigo-300 via-violet-200 to-amber-100",
  robots: "from-sky-300 via-slate-100 to-emerald-200",
  superheroes: "from-blue-300 via-amber-100 to-rose-200",
  space: "from-indigo-300 via-purple-200 to-amber-100",
  "sea-life": "from-cyan-200 via-blue-100 to-teal-200",
  ninjas: "from-stone-300 via-pink-100 to-emerald-200",
  "cars-trucks": "from-orange-200 via-amber-100 to-yellow-200",
  trains: "from-amber-200 via-emerald-100 to-stone-200",
  "farm-animals": "from-amber-200 via-yellow-100 to-emerald-200",
  "snowy-day": "from-sky-200 via-slate-100 to-blue-200",
};

const FALLBACK_EMOJI = ["✨", "🌙", "⭐", "🌟", "🪄", "💫"];
const FALLBACK_GRADIENT = "from-violet-200 via-amber-100 to-fuchsia-200";

function emojiFor(theme: string): string[] {
  return THEME_EMOJI[theme as Theme] ?? FALLBACK_EMOJI;
}

function gradientFor(theme: string): string {
  return THEME_GRADIENT[theme as Theme] ?? FALLBACK_GRADIENT;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  language: Language,
): SpeechSynthesisVoice | undefined {
  const langPrefix = language.toLowerCase();
  const matching = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix),
  );
  if (matching.length === 0) {
    // Fallback: first English voice if language has no installed voice.
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith("en") && v.default) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en"))
    );
  }

  const tiers: RegExp[] = [
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

// Split text into segments preserving whitespace, with character offsets
// matching the original string. Used for karaoke-style word highlighting.
function splitWords(text: string): { word: string; ws: string; start: number; end: number }[] {
  const out: { word: string; ws: string; start: number; end: number }[] = [];
  const re = /(\S+)(\s*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({
      word: m[1],
      ws: m[2] ?? "",
      start: m.index,
      end: m.index + m[1].length,
    });
  }
  return out;
}

export default function StoryView({
  story,
  theme,
  language,
  onWriteAnother,
}: {
  story: Story;
  theme: Theme | string;
  language: Language;
  onWriteAnother: () => void;
}) {
  const [pageIdx, setPageIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [highlightCharIdx, setHighlightCharIdx] = useState(-1);

  // Respect the OS "reduce motion" accessibility setting.
  const prefersReduced = useReducedMotion();

  const wordSegments = useMemo(
    () => splitWords(story.pages[pageIdx]),
    [story, pageIdx],
  );

  const total = story.pages.length;
  const isFirst = pageIdx === 0;
  const isLast = pageIdx === total - 1;

  const imageUrls = useMemo(
    () => story.pages.map((text, i) => buildImageUrl(theme, text, i + 1)),
    [story, theme],
  );

  useEffect(() => {
    // Pre-warm all illustrations in parallel so navigation feels instant.
    imageUrls.forEach((u) => {
      const i = new Image();
      i.src = u;
    });
  }, [imageUrls]);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (!ok) return;

    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }
    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setImageLoaded(false);
    setImageError(false);
    setHighlightCharIdx(-1);
  }, [pageIdx]);

  function handleListen() {
    if (!supported) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setHighlightCharIdx(-1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(story.pages[pageIdx]);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = LANG_BCP47[language];

    const voice = pickBestVoice(voices, language);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || LANG_BCP47[language];
    }

    // Karaoke-style word boundary tracking. Most browsers fire
    // word-level boundary events; if not, the audio still plays and
    // we just don't highlight (graceful degradation).
    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === "word" || event.name === "sentence") {
        setHighlightCharIdx(event.charIndex);
      }
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setHighlightCharIdx(-1);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setHighlightCharIdx(-1);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-2xl border-2 border-amber-900/15 bg-amber-50/80 p-3 sm:p-6 md:p-10 shadow-lg shadow-amber-900/10 flex flex-col">
        <h1 className="text-xl sm:text-3xl md:text-4xl text-amber-900 mb-0.5 sm:mb-2 text-center tracking-tight">
          {story.title}
        </h1>
        <p className="text-xs sm:text-sm text-amber-800/60 mb-2 sm:mb-6 text-center italic">
          Page {pageIdx + 1} of {total}
        </p>

        <div className="relative w-full overflow-hidden rounded-xl border-2 border-amber-900/15 aspect-[5/3] sm:aspect-[3/2] mb-2 sm:mb-6">
          {imageError ? (
            <div
              className={`h-full w-full bg-gradient-to-br ${gradientFor(theme)} flex items-center justify-center`}
            >
              <div className="flex gap-2 text-5xl sm:text-6xl md:text-7xl drop-shadow-sm">
                {(() => {
                  const e = emojiFor(theme);
                  return [
                    e[pageIdx % e.length],
                    e[(pageIdx + 1) % e.length],
                    e[(pageIdx + 2) % e.length],
                  ].join(" ");
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
                className={
                  "h-full w-full object-cover transition-opacity duration-500 " +
                  (imageLoaded ? "opacity-100" : "opacity-0")
                }
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
              />
            </>
          )}
        </div>

        <div className="min-h-[4rem] sm:min-h-[8rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={pageIdx}
              variants={prefersReduced ? undefined : inkContainerVariants}
              initial={prefersReduced ? { opacity: 0 } : "hidden"}
              animate={prefersReduced ? { opacity: 1 } : "visible"}
              exit={prefersReduced ? { opacity: 0 } : "exit"}
              transition={prefersReduced ? { duration: 0.15 } : undefined}
              className="text-sm sm:text-xl md:text-2xl leading-relaxed text-amber-950 text-center"
            >
              {wordSegments.map((s, idx) => {
                const isActive =
                  isPlaying &&
                  highlightCharIdx >= s.start &&
                  highlightCharIdx < s.end;
                return (
                  <Fragment key={idx}>
                    <motion.span
                      variants={prefersReduced ? undefined : inkWordVariants}
                      className={isActive ? "kid-highlight" : undefined}
                      // keep inline so text reflows naturally
                      style={{ display: "inline" }}
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

        {supported && (
          <div className="mt-2 sm:mt-6 flex justify-center">
            <button
              onClick={handleListen}
              className="rounded-full border-2 border-amber-900/30 px-5 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base text-amber-900 transition-colors hover:bg-amber-900/5"
            >
              {isPlaying ? "■ Stop" : "▶ Read to me"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 sm:mt-6 flex items-center justify-between gap-2">
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
