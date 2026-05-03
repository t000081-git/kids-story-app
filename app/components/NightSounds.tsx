"use client";

import { useEffect, useRef, useState } from "react";

// Synthesized ambient bedtime soundscape:
//   - continuous gentle wind (filtered noise, very soft)
//   - whoosh aligned with each comet appearance (every 10s)
//   - low-frequency thunder rumble aligned with the magical pulses
//   - cricket chirps layered on top
//
// All sounds are generated in-browser via Web Audio API.
// AudioContext is created INSIDE the toggle onClick handler so Chrome's
// transient user-activation flag is still valid — creating it in useEffect
// (which fires asynchronously, after the click event) means the flag has
// already expired and the context starts suspended with no way to resume.

const STORAGE_KEY = "ks-sounds";

function fillNoise(buffer: AudioBuffer) {
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

type CtorType = typeof AudioContext;

function getCtorSafe(): CtorType | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: CtorType }).webkitAudioContext ??
    null
  );
}

export default function NightSounds() {
  const [enabled, setEnabled] = useState(false);
  const ctxRef    = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);

  // Restore preference (sounds OFF by default)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "on") setEnabled(true);
  }, []);

  // Persist preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  }, [enabled]);

  // Create/resume AudioContext — MUST be called from a user gesture
  function ensureCtx() {
    const Ctor = getCtorSafe();
    if (!Ctor) return;
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new Ctor();
    }
    ctxRef.current.resume().catch(() => {});
  }

  function handleToggle() {
    const next = !enabled;
    if (next) ensureCtx(); // ← inside click handler = transient activation valid
    setEnabled(next);
  }

  // Set up / tear down audio
  useEffect(() => {
    if (!enabled) return;

    const Ctor = getCtorSafe();
    if (!Ctor) return;

    // Use the context created in handleToggle (running) if available;
    // otherwise create a fallback for the localStorage-restore case.
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new Ctor();
      ctxRef.current.resume().catch(() => {});
      // localStorage restore: context may still be suspended — retry on first gesture
      if (ctxRef.current.state === "suspended") {
        const doResume = () => ctxRef.current?.resume().catch(() => {});
        window.addEventListener("pointerdown", doResume, { once: true });
      }
    }

    const ctx = ctxRef.current;

    const IDLE_GAIN  = 0.6;
    const STORY_GAIN = 0.12;
    const initialMode =
      typeof window !== "undefined" && window.__ksMode === "story"
        ? "story"
        : "idle";

    const master = ctx.createGain();
    master.gain.value = initialMode === "story" ? STORY_GAIN : IDLE_GAIN;
    master.connect(ctx.destination);

    const handleMode = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode;
      const target = mode === "story" ? STORY_GAIN : IDLE_GAIN;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(target, now + 1.5);
    };
    window.addEventListener("ks-mode", handleMode);

    // ---- Continuous wind ----
    const windBuf = ctx.createBuffer(1, ctx.sampleRate * 30, ctx.sampleRate);
    fillNoise(windBuf);
    const wind       = ctx.createBufferSource();
    wind.buffer      = windBuf;
    wind.loop        = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type  = "lowpass";
    windFilter.frequency.value = 600;

    const windGain   = ctx.createGain();
    windGain.gain.value = 0.014;

    wind.connect(windFilter).connect(windGain).connect(master);

    // ---- Comet whoosh ----
    const playWhoosh = () => {
      const now = ctx.currentTime;
      const dur = 2.4;
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
      fillNoise(buf);

      const src    = ctx.createBufferSource();
      src.buffer   = buf;

      const filter = ctx.createBiquadFilter();
      filter.type  = "bandpass";
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

      const lp  = ctx.createBiquadFilter();
      lp.type   = "lowpass";
      lp.frequency.value = 320;   // wider band → more audible body on earbuds

      const hp  = ctx.createBiquadFilter();
      hp.type   = "highpass";
      hp.frequency.value = 30;    // keep sub-bass where earbuds can reproduce it

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.45);  // 6× louder peak
      gain.gain.linearRampToValueAtTime(0.28, now + 1.1);
      gain.gain.linearRampToValueAtTime(0, now + dur);

      src.connect(lp).connect(hp).connect(gain).connect(master);
      src.start(now);
      src.stop(now + dur);
    };

    const alive = { aborted: false };

    // ---- Crickets ----
    const playChirp = (frequency: number) => {
      if (alive.aborted) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type  = "sine";
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
        const chirpCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < chirpCount; i++) {
          const id = window.setTimeout(() => {
            playChirp(baseFreq + (Math.random() - 0.5) * 80);
          }, i * 75);
          timersRef.current.push(id);
        }
        const next = 1600 + Math.random() * 2800;
        const id = window.setTimeout(burst, next);
        timersRef.current.push(id);
      };
      const id = window.setTimeout(burst, initialDelay);
      timersRef.current.push(id);
    };

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

    type AnimTiming = { startTime: number; delay: number; duration: number };
    const animTiming = (el: Element | null | undefined): AnimTiming | null => {
      if (!el) return null;
      const a = el.getAnimations({ subtree: false })[0];
      if (!a?.effect) return null;
      const ct        = a.effect.getComputedTiming();
      const startTime = Number(a.startTime ?? 0);
      const delay     = Number(ct.delay ?? 0);
      const duration  = Number(ct.duration ?? 0);
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
      const periodSec  = t.duration / 1000;
      scheduleAligned(callback, firstAtSec, periodSec);
    };

    // resume() is async — chain directly off the Promise so audio starts
    // as soon as Chrome grants the activation, with no state-string check.
    ctx.resume().then(() => {
      if (alive.aborted) return;

      wind.start();

      document
        .querySelectorAll(".ks-comet")
        .forEach((el) => scheduleForElement(el, playWhoosh, 1200));

      const pulseEls = document.querySelectorAll(".ks-pulse");
      scheduleForElement(pulseEls[0], playThunder, 12880);
      scheduleForElement(pulseEls[1], playThunder, 17480);

      scheduleCricket(3800,  200);
      scheduleCricket(4500,  900);
      scheduleCricket(5200, 1700);
    }).catch(() => {});

    return () => {
      alive.aborted = true;
      window.removeEventListener("ks-mode", handleMode);
      timersRef.current.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      timersRef.current = [];
      try { wind.stop(); } catch { /* already stopped */ }
      ctx.close().catch(() => {});
      ctxRef.current = null; // fresh context on next enable
    };
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={enabled}
      title={enabled ? "Mute night sounds" : "Play gentle night sounds"}
      className="fixed bottom-4 right-4 z-20 rounded-full border-2 border-amber-100/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-amber-50/90 hover:bg-white/15 transition-colors"
    >
      {enabled ? "🔊 Sounds on" : "🔈 Sounds off"}
    </button>
  );
}
