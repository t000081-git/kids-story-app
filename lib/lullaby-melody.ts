// ─── Lullaby Melodies ────────────────────────────────────────────────────────
// Five distinct Web Audio API melody styles for children's stories.
// All use sine waves with fast attack + exponential decay (kalimba / music-box).
// Pick the right style via getMelodyStyle(theme), then call scheduleMelody().

// ─── Types ───────────────────────────────────────────────────────────────────
export type MelodyStyle = "kalimba" | "sparkle" | "adventure" | "nature" | "haunted";

type Note = { beat: number; freq: number; dur: number; vol: number };

// ─── Theme → Style mapping ────────────────────────────────────────────────────
const SPARKLE_THEMES = new Set([
  "magic", "unicorns", "fairies", "wizards", "dream-world",
  "candy-world", "ballerina", "butterflies", "mermaids",
  "princesses", "circus", "toy-workshop",
]);

const ADVENTURE_THEMES = new Set([
  "dinosaurs", "pirates", "knights", "ninjas", "space",
  "robots", "superheroes", "firefighter", "astronaut", "cowboy",
  "explorer", "cars-trucks", "trains", "secret-agent", "ocean-dive",
  "volcano", "time-travel",
]);

const NATURE_THEMES = new Set([
  "animals", "farm-animals", "forest", "beach", "mountain",
  "snowy-day", "arctic", "sea-life",
]);

export function getMelodyStyle(theme: string): MelodyStyle {
  if (theme === "haunted") return "haunted";
  if (SPARKLE_THEMES.has(theme))   return "sparkle";
  if (ADVENTURE_THEMES.has(theme)) return "adventure";
  if (NATURE_THEMES.has(theme))    return "nature";
  return "kalimba"; // dragons, general custom themes
}

// ─── Timing constants per style ──────────────────────────────────────────────
// Each melody is composed in a fixed metre; loop duration = bars × beats × beat_dur.
const BPM: Record<MelodyStyle, number> = {
  kalimba:   68,  // gentle 3/4, 4 bars = 12 beats
  sparkle:   80,  // light 3/4, 4 bars = 12 beats
  adventure: 76,  // rhythmic 4/4, 4 bars = 16 beats
  nature:    63,  // flowing 3/4, 4 bars = 12 beats
  haunted:   56,  // sparse 4/4, 4 bars = 16 beats
};

const LOOP_BEATS: Record<MelodyStyle, number> = {
  kalimba:   12,
  sparkle:   12,
  adventure: 16,
  nature:    12,
  haunted:   16,
};

function loopDur(style: MelodyStyle): number {
  return LOOP_BEATS[style] * (60 / BPM[style]);
}

export function getMelodyLoopDur(style: MelodyStyle): number {
  return loopDur(style);
}

// ─── Note patterns ────────────────────────────────────────────────────────────

// Note frequencies (Hz)
const A2  = 110.00;
const D3  = 146.83;
const E3  = 164.81;
const G3  = 196.00;
const A3  = 220.00;
const C3  = 130.81;
const Db4 = 277.18; // C#4
const D4  = 293.66;
const E4  = 329.63;
const Fs4 = 369.99; // F#4
const G4  = 392.00;
const A4  = 440.00;
const B4  = 493.88;
const C5  = 523.25;
const Db5 = 554.37; // C#5
const D5  = 587.33;
const E5  = 659.25;
const Fs5 = 739.99; // F#5
const G5  = 783.99;
const A5  = 880.00;
const C6  = 1046.50;
const D6  = 1174.66;

// ── 1. KALIMBA — gentle pentatonic (C), default for calm/dragon/general themes
//    68 BPM · 3/4 · 4 bars = 12 beats · loop ≈ 10.6 s
const PATTERN_KALIMBA: Note[] = [
  // melody — top register
  { beat: 0,  freq: C5, dur: 0.80, vol: 0.10 },
  { beat: 1,  freq: E5, dur: 0.80, vol: 0.10 },
  { beat: 2,  freq: G5, dur: 0.80, vol: 0.10 },
  { beat: 3,  freq: A5, dur: 0.80, vol: 0.10 },
  { beat: 4,  freq: G5, dur: 0.80, vol: 0.09 },
  { beat: 5,  freq: E5, dur: 0.80, vol: 0.09 },
  { beat: 6,  freq: D5, dur: 0.80, vol: 0.10 },
  { beat: 7,  freq: E5, dur: 0.80, vol: 0.10 },
  { beat: 8,  freq: G5, dur: 0.80, vol: 0.10 },
  { beat: 9,  freq: A5, dur: 1.00, vol: 0.11 },
  { beat: 11, freq: C5, dur: 1.60, vol: 0.09 },
  // bass — quiet foundation
  { beat: 0,  freq: C3, dur: 2.60, vol: 0.05 },
  { beat: 3,  freq: A3, dur: 2.60, vol: 0.05 },
  { beat: 6,  freq: G3, dur: 2.60, vol: 0.05 },
  { beat: 9,  freq: C3, dur: 3.00, vol: 0.05 },
];

// ── 2. SPARKLE — bright major pentatonic (C), twinkling bell-like
//    80 BPM · 3/4 · 4 bars = 12 beats · loop = 9.0 s
const PATTERN_SPARKLE: Note[] = [
  // sparkling upper melody
  { beat: 0,   freq: C5,  dur: 0.45, vol: 0.07 },
  { beat: 0.5, freq: E5,  dur: 0.45, vol: 0.07 },
  { beat: 1,   freq: G5,  dur: 0.45, vol: 0.08 },
  { beat: 1.5, freq: C6,  dur: 0.60, vol: 0.09 },
  { beat: 2,   freq: A5,  dur: 0.45, vol: 0.08 },
  { beat: 2.5, freq: G5,  dur: 0.45, vol: 0.07 },
  { beat: 3,   freq: E5,  dur: 0.45, vol: 0.07 },
  { beat: 3.5, freq: C5,  dur: 0.45, vol: 0.07 },
  { beat: 4,   freq: D5,  dur: 0.45, vol: 0.07 },
  { beat: 4.5, freq: E5,  dur: 0.45, vol: 0.07 },
  { beat: 5,   freq: G5,  dur: 0.45, vol: 0.08 },
  { beat: 5.5, freq: A5,  dur: 0.50, vol: 0.08 },
  { beat: 6,   freq: C6,  dur: 0.80, vol: 0.10 },
  { beat: 7,   freq: A5,  dur: 0.45, vol: 0.08 },
  { beat: 7.5, freq: G5,  dur: 0.45, vol: 0.07 },
  { beat: 8,   freq: E5,  dur: 0.45, vol: 0.07 },
  { beat: 8.5, freq: G5,  dur: 0.45, vol: 0.07 },
  { beat: 9,   freq: A5,  dur: 0.45, vol: 0.08 },
  { beat: 9.5, freq: G5,  dur: 0.45, vol: 0.07 },
  { beat: 10,  freq: E5,  dur: 0.45, vol: 0.07 },
  { beat: 10.5,freq: D5,  dur: 0.45, vol: 0.06 },
  { beat: 11,  freq: C5,  dur: 1.40, vol: 0.08 },
  // gentle bass
  { beat: 0,   freq: C3,  dur: 3.5,  vol: 0.04 },
  { beat: 3,   freq: G3,  dur: 3.5,  vol: 0.04 },
  { beat: 6,   freq: A3,  dur: 3.5,  vol: 0.04 },
  { beat: 9,   freq: G3,  dur: 3.5,  vol: 0.04 },
];

// ── 3. ADVENTURE — G major pentatonic, rhythmic and slightly bouncy
//    76 BPM · 4/4 · 4 bars = 16 beats · loop ≈ 12.6 s
const PATTERN_ADVENTURE: Note[] = [
  // marching melody
  { beat: 0,   freq: G4,  dur: 0.70, vol: 0.09 },
  { beat: 1,   freq: A4,  dur: 0.70, vol: 0.09 },
  { beat: 2,   freq: B4,  dur: 0.70, vol: 0.09 },
  { beat: 3,   freq: D5,  dur: 0.80, vol: 0.10 },
  { beat: 4,   freq: G5,  dur: 0.60, vol: 0.10 },
  { beat: 5,   freq: D5,  dur: 0.60, vol: 0.09 },
  { beat: 6,   freq: B4,  dur: 0.70, vol: 0.09 },
  { beat: 7,   freq: A4,  dur: 0.70, vol: 0.08 },
  { beat: 8,   freq: G4,  dur: 0.50, vol: 0.09 },
  { beat: 8.5, freq: A4,  dur: 0.50, vol: 0.09 },
  { beat: 9,   freq: B4,  dur: 0.50, vol: 0.09 },
  { beat: 9.5, freq: D5,  dur: 0.50, vol: 0.10 },
  { beat: 10,  freq: G5,  dur: 1.10, vol: 0.11 },
  { beat: 12,  freq: D5,  dur: 0.50, vol: 0.09 },
  { beat: 12.5,freq: B4,  dur: 0.50, vol: 0.09 },
  { beat: 13,  freq: A4,  dur: 0.50, vol: 0.08 },
  { beat: 13.5,freq: G4,  dur: 0.50, vol: 0.08 },
  { beat: 14,  freq: D4,  dur: 1.80, vol: 0.08 },
  // steady bass
  { beat: 0,   freq: G3,  dur: 2.20, vol: 0.05 },
  { beat: 4,   freq: D3,  dur: 2.20, vol: 0.05 },
  { beat: 8,   freq: G3,  dur: 2.20, vol: 0.05 },
  { beat: 12,  freq: D3,  dur: 2.20, vol: 0.05 },
];

// ── 4. NATURE — A major pentatonic, flowing pastoral arpeggios
//    63 BPM · 3/4 · 4 bars = 12 beats · loop ≈ 11.4 s
const PATTERN_NATURE: Note[] = [
  { beat: 0,   freq: A4,  dur: 0.85, vol: 0.09 },
  { beat: 1,   freq: Db5, dur: 0.85, vol: 0.09 },
  { beat: 2,   freq: E5,  dur: 0.85, vol: 0.10 },
  { beat: 3,   freq: Db5, dur: 0.85, vol: 0.09 },
  { beat: 4,   freq: A4,  dur: 0.85, vol: 0.09 },
  { beat: 5,   freq: Fs4, dur: 0.85, vol: 0.08 },
  { beat: 6,   freq: E4,  dur: 0.85, vol: 0.09 },
  { beat: 7,   freq: Fs4, dur: 0.85, vol: 0.09 },
  { beat: 8,   freq: A4,  dur: 0.85, vol: 0.09 },
  { beat: 9,   freq: E5,  dur: 1.20, vol: 0.10 },
  { beat: 11,  freq: Db5, dur: 1.50, vol: 0.09 },
  // bass drone
  { beat: 0,   freq: A3,  dur: 3.20, vol: 0.05 },
  { beat: 3,   freq: E3,  dur: 3.20, vol: 0.05 },
  { beat: 6,   freq: A3,  dur: 3.20, vol: 0.05 },
  { beat: 9,   freq: E3,  dur: 3.20, vol: 0.05 },
];

// ── 5. HAUNTED — A natural minor, sparse and eerie (but child-safe / fun-spooky)
//    56 BPM · 4/4 · 4 bars = 16 beats · loop ≈ 17.1 s
const PATTERN_HAUNTED: Note[] = [
  { beat: 0,   freq: A4,  dur: 1.60, vol: 0.08 },
  { beat: 2,   freq: G4,  dur: 1.60, vol: 0.08 },
  { beat: 4,   freq: E4,  dur: 1.60, vol: 0.08 },
  { beat: 6,   freq: C5,  dur: 2.20, vol: 0.09 },
  { beat: 8,   freq: A3,  dur: 1.60, vol: 0.07 },
  { beat: 10,  freq: C5,  dur: 1.00, vol: 0.08 },
  { beat: 11,  freq: E5,  dur: 1.00, vol: 0.09 },
  { beat: 12,  freq: G4,  dur: 0.80, vol: 0.08 },
  { beat: 13,  freq: A4,  dur: 0.80, vol: 0.08 },
  { beat: 14,  freq: C5,  dur: 2.50, vol: 0.10 },
  // deep drone
  { beat: 0,   freq: A2,  dur: 4.50, vol: 0.04 },
  { beat: 4,   freq: A2,  dur: 4.50, vol: 0.04 },
  { beat: 8,   freq: A2,  dur: 4.50, vol: 0.04 },
  { beat: 12,  freq: A2,  dur: 4.50, vol: 0.04 },
];

const PATTERNS: Record<MelodyStyle, Note[]> = {
  kalimba:   PATTERN_KALIMBA,
  sparkle:   PATTERN_SPARKLE,
  adventure: PATTERN_ADVENTURE,
  nature:    PATTERN_NATURE,
  haunted:   PATTERN_HAUNTED,
};

// ─── Playback helpers ────────────────────────────────────────────────────────
function playNote(
  ctx:  AudioContext,
  dest: AudioNode,
  freq: number,
  t:    number,
  dur:  number,
  vol:  number,
) {
  // Fundamental sine wave
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.02);

  // Subtle 2nd harmonic for warmth
  const osc2  = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, t);
  gain2.gain.setValueAtTime(0, t);
  gain2.gain.linearRampToValueAtTime(vol * 0.12, t + 0.004);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.45);
  osc2.connect(gain2);
  gain2.connect(dest);
  osc2.start(t);
  osc2.stop(t + dur * 0.50);
}

/**
 * Schedule `loops` repetitions of a melody starting at `from` (an AudioContext
 * timestamp). All nodes route through `dest` so the caller can mute via a GainNode.
 *
 * @param style  Which melody pattern to use (defaults to "kalimba").
 */
export function scheduleMelody(
  ctx:   AudioContext,
  dest:  AudioNode,
  from:  number,
  loops  = 2,
  style: MelodyStyle = "kalimba",
) {
  const pattern = PATTERNS[style];
  const beat    = 60 / BPM[style];
  const dur     = loopDur(style);

  for (let i = 0; i < loops; i++) {
    const base = from + i * dur;
    for (const n of pattern) {
      playNote(ctx, dest, n.freq, base + n.beat * beat, n.dur, n.vol);
    }
  }
}

// Keep legacy export so old code that imported LOOP_DUR directly still compiles.
// Represents the default "kalimba" loop duration.
export const LOOP_DUR = loopDur("kalimba");
