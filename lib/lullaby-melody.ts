// Pentatonic kalimba-style lullaby melody for the Filipino "Awitin" easter egg.
// All sound is synthesised with plain Web Audio API — no extra dependencies.
//
// Structure: 4 bars of 3/4 at 68 BPM (≈ 10.6 s per loop).
// Each "note" is a sine-wave with a fast attack + exponential decay (kalimba/music-box shape).
// A quiet second harmonic (2× freq at 12% gain) adds warmth.

const BPM        = 68;
const BEAT       = 60 / BPM;           // seconds per beat
const LOOP_BEATS = 12;                  // 4 bars × 3 beats
export const LOOP_DUR = LOOP_BEATS * BEAT; // ≈ 10.59 s

// Frequencies used (C pentatonic, two octaves)
const C3 = 130.81, G3 = 196.00, A3 = 220.00;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.00;

type Note = { beat: number; freq: number; dur: number; vol: number };

// 4-bar melody: ascending/descending pentatonic + bass pulse
const PATTERN: Note[] = [
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

function playKalimbaNote(
  ctx:  AudioContext,
  dest: AudioNode,
  freq: number,
  t:    number,
  dur:  number,
  vol:  number,
) {
  // Fundamental
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

  // 2nd harmonic — adds warmth without changing the kalimba character
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
 * Schedule `loops` repetitions of the lullaby melody starting at `from`
 * (an AudioContext timestamp).  All nodes route through `dest` so the
 * caller can mute everything at once via a master GainNode.
 */
export function scheduleMelody(
  ctx:   AudioContext,
  dest:  AudioNode,
  from:  number,
  loops = 2,
) {
  for (let i = 0; i < loops; i++) {
    const base = from + i * LOOP_DUR;
    for (const n of PATTERN) {
      playKalimbaNote(ctx, dest, n.freq, base + n.beat * BEAT, n.dur, n.vol);
    }
  }
}
