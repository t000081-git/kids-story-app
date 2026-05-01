"use client";

import { useEffect, useRef, useState } from "react";

// Synthesized ambient bedtime soundscape:
//   - continuous gentle wind (filtered noise, very soft)
//   - whoosh aligned with each comet appearance (every 10s)
//   - low-frequency thunder rumble aligned with the magical pulses
//
// All sounds are generated in-browser via Web Audio API, so there are
// no audio files to ship. Audio starts only after the user clicks the
// toggle (browser autoplay policies require a user gesture anyway).

const STORAGE_KEY = "ks-sounds";

function fillNoise(buffer: AudioBuffer) {
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

export default function NightSounds() {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);

  // Restore preference (sounds OFF by default; only "on" reads as on)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "on") setEnabled(true);
  }, []);

  // Persist preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  }, [enabled]);

  // Set up / tear down audio
  useEffect(() => {
    if (!enabled) return;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    ctxRef.current = ctx;

    const IDLE_GAIN = 0.6;
    const STORY_GAIN = 0.12;
    const initialMode =
      typeof window !== "undefined" && window.__ksMode === "story"
        ? "story"
        : "idle";

    const master = ctx.createGain();
    master.gain.value = initialMode === "story" ? STORY_GAIN : IDLE_GAIN;
    master.connect(ctx.destination);

    // When the app enters the storytelling phase, dim ambient sounds
    // so the speaker / Read-to-me voice is the focus. Ramp smoothly
    // so the transition isn't jarring.
    const handleMode = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode;
      const target = mode === "story" ? STORY_GAIN : IDLE_GAIN;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(target, now + 1.5);
    };
    window.addEventListener("ks-mode", handleMode);

    // ---- Continuous wind (cloud drift) ----
    const windBuf = ctx.createBuffer(1, ctx.sampleRate * 30, ctx.sampleRate);
    fillNoise(windBuf);
    const wind = ctx.createBufferSource();
    wind.buffer = windBuf;
    wind.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 600;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.014;

    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start();

    // ---- Comet whoosh ----
    const playWhoosh = () => {
      const now = ctx.currentTime;
      const dur = 2.4;
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      fillNoise(buf);

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.linearRampToValueAtTime(1900, now + dur * 0.7);
      filter.Q.value = 0.6;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.35);
      gain.gain.linearRampToValueAtTime(0.04, now + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, now + dur);

      src.connect(filter).connect(gain).connect(master);
      src.start(now);
      src.stop(now + dur);
    };

    // ---- Thunder rumble ----
    const playThunder = () => {
      const now = ctx.currentTime;
      const dur = 3.2;
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      fillNoise(buf);

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 130;

      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 45;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.45);
      gain.gain.linearRampToValueAtTime(0.05, now + 1.1);
      gain.gain.linearRampToValueAtTime(0, now + dur);

      src.connect(lp).connect(hp).connect(gain).connect(master);
      src.start(now);
      src.stop(now + dur);
    };

    // Track lifecycle to bail out of in-flight cricket timers cleanly
    const alive = { aborted: false };

    // ---- Crickets ----
    // Multiple cricket "voices" at slightly different pitches, each
    // chirping with random gaps. A short burst is 2-3 chirps in quick
    // succession. The whole layer feels like a forest at night.
    const playChirp = (frequency: number) => {
      if (alive.aborted) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(50, frequency * 0.95),
        now + 0.05,
      );

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.013, now + 0.005);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);

      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + 0.06);
    };

    const scheduleCricket = (baseFreq: number, initialDelay: number) => {
      const burst = () => {
        if (alive.aborted) return;
        const chirpCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
        for (let i = 0; i < chirpCount; i++) {
          const id = window.setTimeout(() => {
            playChirp(baseFreq + (Math.random() - 0.5) * 80);
          }, i * 75);
          timersRef.current.push(id);
        }
        // Random rest 1.6 - 4.4s before next burst
        const next = 1600 + Math.random() * 2800;
        const id = window.setTimeout(burst, next);
        timersRef.current.push(id);
      };
      const id = window.setTimeout(burst, initialDelay);
      timersRef.current.push(id);
    };

    // Schedule a recurring callback aligned to a real-world clock so
    // it tracks the CSS animations (which started at page load), not
    // the moment the user toggled sounds on. Each tick recalculates
    // from performance.now() so timer drift doesn't accumulate.
    const scheduleAligned = (
      callback: () => void,
      firstAtSec: number,
      periodSec: number,
    ) => {
      const tick = () => {
        if (alive.aborted) return;
        callback();
        scheduleNext();
      };
      const scheduleNext = () => {
        if (alive.aborted) return;
        const nowSec = performance.now() / 1000;
        let nextSec: number;
        if (nowSec <= firstAtSec) {
          nextSec = firstAtSec;
        } else {
          const cycles = Math.floor((nowSec - firstAtSec) / periodSec) + 1;
          nextSec = firstAtSec + cycles * periodSec;
        }
        const delayMs = Math.max(0, (nextSec - nowSec) * 1000);
        const id = window.setTimeout(tick, delayMs);
        timersRef.current.push(id);
      };
      scheduleNext();
    };

    // Resume context (some browsers start it suspended)
    ctx.resume().catch(() => {});

    // Read each animation's real timing from the WAAPI. Critical:
    // Animation.startTime is the document-timeline time when the
    // animation became active (post-hydration), but does NOT include
    // animation-delay. The delay lives separately on the effect's
    // computed timing. So a pulse with `animation-delay: -9s` has
    // startTime = 160 (hydration), delay = -9000 — the first cycle's
    // 92% point is at startTime + delay + (0.92 * duration) =
    // 160 - 9000 + 17480 = 8640 ms. Without subtracting the delay,
    // audio fires nine seconds late on pulse 2 and ~1s early on the
    // comet because the visible-on-screen offset is also wrong.
    type AnimTiming = { startTime: number; delay: number; duration: number };
    const animTiming = (el: Element | null | undefined): AnimTiming | null => {
      if (!el) return null;
      const a = el.getAnimations({ subtree: false })[0];
      if (!a?.effect) return null;
      const ct = a.effect.getComputedTiming();
      const startTime = Number(a.startTime ?? 0);
      const delay = Number(ct.delay ?? 0);
      const duration = Number(ct.duration ?? 0);
      if (!duration) return null;
      return { startTime, delay, duration };
    };

    const scheduleForElement = (
      el: Element | null | undefined,
      callback: () => void,
      cycleOffsetMs: number,
    ) => {
      const t = animTiming(el);
      if (!t) return;
      const firstAtSec = (t.startTime + t.delay + cycleOffsetMs) / 1000;
      const periodSec = t.duration / 1000;
      scheduleAligned(callback, firstAtSec, periodSec);
    };

    // Visual sync points (cycle position, ms):
    //   - Comet visible at ~6% of its 20s cycle (1200 ms). The keyframe
    //     puts the streak's right edge at x = -20vw at 1% and +125vw
    //     at 25%, so x = 0 around 4.3% and the comet body is fully on
    //     screen by ~6%. The whoosh's 0.35s attack peaks ~7.75% of
    //     cycle, with the comet well inside the viewport.
    //   - Pulse flash starts at 92% (opacity ramps from 0 to 0.45
    //     between 92% and 93%). Thunder's 0.45s attack peaks near the
    //     visual peak at 95%.
    document
      .querySelectorAll(".ks-comet")
      .forEach((el) => scheduleForElement(el, playWhoosh, 1200));

    const pulseEls = document.querySelectorAll(".ks-pulse");
    scheduleForElement(pulseEls[0], playThunder, 12880);
    scheduleForElement(pulseEls[1], playThunder, 17480);

    // Three cricket voices at different pitches, staggered start
    scheduleCricket(3800, 200);
    scheduleCricket(4500, 900);
    scheduleCricket(5200, 1700);

    return () => {
      alive.aborted = true;
      window.removeEventListener("ks-mode", handleMode);
      timersRef.current.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      timersRef.current = [];
      try {
        wind.stop();
      } catch {
        // already stopped
      }
      ctx.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((v) => !v)}
      aria-pressed={enabled}
      title={enabled ? "Mute night sounds" : "Play gentle night sounds"}
      className="fixed bottom-4 right-4 z-20 rounded-full border-2 border-amber-100/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-amber-50/90 hover:bg-white/15 transition-colors"
    >
      {enabled ? "🔊 Sounds on" : "🔈 Sounds off"}
    </button>
  );
}
