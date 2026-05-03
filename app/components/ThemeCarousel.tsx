"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "./StoryApp";

interface ThemeItem {
  value: Theme | string;
  label: string;
  emoji: string;
}

interface Props {
  themes: ThemeItem[];
  selected: Theme | string;
  onSelect: (t: Theme | string) => void;
  customActive: boolean;
  isLoading: boolean;
}

// px per row (tile height + gap-3):  80+12 mobile, 108+12 desktop
const TILE_H_MOBILE  = 92;
const TILE_H_DESKTOP = 120;
const BASE_SPEED     = 10;   // px/s at rest
const MAX_BOOST      = 650;  // px/s ceiling
const HALF_LIFE      = 0.7;  // seconds for excess speed to halve
const TICK_BASE_PX   = 26;   // px between roulette clicks at moderate speed

export default function ThemeCarousel({ themes, selected, onSelect, customActive, isLoading }: Props) {
  const innerRef    = useRef<HTMLDivElement>(null);
  const speedRef    = useRef(BASE_SPEED);
  const posRef      = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const frameRef    = useRef<number>(0);
  const loopHRef    = useRef(0);
  const audioRef    = useRef<AudioContext | null>(null);
  const tickAccRef  = useRef(0);
  const touchRef    = useRef<{ y: number; time: number } | null>(null);

  // Prime the AudioContext on the first genuine user gesture (click / touchstart).
  // wheel events are NOT counted as user gestures by Chrome's autoplay policy,
  // so an AudioContext created inside handleWheel starts suspended and can never
  // be resumed via that event. Pre-creating it here, inside a click/touch handler,
  // guarantees it starts in "running" state before any scroll attempt.
  useEffect(() => {
    const Ctor =
      typeof window === "undefined" ? null :
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
      null;

    const prime = () => {
      if (!Ctor) return;
      if (!audioRef.current) {
        audioRef.current = new Ctor(); // created inside a click = starts running
      }
      if (audioRef.current.state === "suspended") {
        audioRef.current.resume().catch(() => {});
      }
    };

    document.addEventListener("click",      prime, { once: true });
    document.addEventListener("touchstart", prime, { once: true });
    return () => {
      document.removeEventListener("click",      prime);
      document.removeEventListener("touchstart", prime);
    };
  }, []);

  // Measure loop height (height of one full set of themes)
  useEffect(() => {
    const measure = () => {
      const wide = window.innerWidth >= 640;
      const tileH = wide ? TILE_H_DESKTOP : TILE_H_MOBILE;
      loopHRef.current = Math.ceil(themes.length / 2) * tileH;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [themes.length]);

  // rAF scroll loop — runs for the lifetime of the component
  useEffect(() => {
    const tick = (now: number) => {
      const el = innerRef.current;
      if (el && lastTimeRef.current !== null) {
        const dt  = Math.min((now - lastTimeRef.current) / 1000, 0.1);
        const spd = speedRef.current;
        const lh  = loopHRef.current;

        // Advance position
        posRef.current += spd * dt;
        if (lh > 0) posRef.current = ((posRef.current % lh) + lh) % lh;
        el.style.transform = `translateY(${-posRef.current}px)`;

        // Exponential decay toward base speed
        const excess = spd - BASE_SPEED;
        if (Math.abs(excess) > 0.3) {
          const decayed = excess * Math.pow(0.5, dt / HALF_LIFE);
          speedRef.current = BASE_SPEED + decayed;
        } else {
          speedRef.current = BASE_SPEED;
        }

        // Roulette tick sound when spinning fast
        const absSpd = Math.abs(spd);
        if (absSpd > BASE_SPEED + 30 && audioRef.current) {
          tickAccRef.current += Math.abs(spd * dt);
          const tickEvery = Math.max(4, TICK_BASE_PX * (BASE_SPEED / absSpd));
          if (tickAccRef.current >= tickEvery) {
            tickAccRef.current = 0;
            playTick(audioRef.current, Math.min(1, (absSpd - BASE_SPEED) / 350));
          }
        }
      }
      lastTimeRef.current = now;
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  function getAudio(): AudioContext | null {
    if (audioRef.current) return audioRef.current;
    const Ctor =
      typeof window === "undefined" ? null :
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
      null;
    if (!Ctor) return null;
    const ctx = new Ctor();
    audioRef.current = ctx;
    return ctx;
  }

  function boost(velocityPxPerS: number) {
    // Swipe UP (negative dy) → negative velocity → increase speed
    const delta = -velocityPxPerS * 0.45;
    speedRef.current = Math.max(-MAX_BOOST, Math.min(MAX_BOOST, speedRef.current + delta));
  }

  function handleTouchStart(e: React.TouchEvent) {
    const ctx = getAudio();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    touchRef.current = { y: e.touches[0].clientY, time: Date.now() };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current) return;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const dt = Math.max(0.05, (Date.now() - touchRef.current.time) / 1000);
    boost(dy / dt);
    touchRef.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault(); // prevent page scroll while swiping carousel
  }

  function handleMouseDown() {
    const ctx = getAudio();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const ctx = getAudio();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    boost(-e.deltaY * 2.5);
  }

  const doubled = [...themes, ...themes];

  return (
    <div
      className="relative h-[180px] sm:h-[240px] overflow-hidden select-none"
      style={{
        backgroundColor: "rgba(8, 6, 28, 0.5)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div ref={innerRef} className="grid grid-cols-2 gap-3">
        {doubled.map((t, i) => {
          const sel = !customActive && selected === t.value;
          return (
            <button
              key={`${String(t.value)}-${i}`}
              type="button"
              onClick={() => onSelect(t.value as Theme)}
              disabled={isLoading}
              aria-label={t.label}
              className={
                "rounded-lg border-2 p-3 sm:p-4 min-h-[80px] sm:min-h-[108px] " +
                "flex flex-col items-center justify-center transition-colors " +
                "disabled:opacity-50 backdrop-blur-sm " +
                (sel
                  ? "border-amber-200 bg-amber-100/15 text-amber-50 shadow-[0_0_18px_rgba(252,211,77,0.25)]"
                  : "border-amber-100/20 bg-white/5 text-amber-50/85 hover:bg-white/10")
              }
              aria-pressed={sel}
            >
              <div className="text-2xl sm:text-3xl mb-0.5 sm:mb-1 leading-none">{t.emoji}</div>
              <div className="text-xs sm:text-sm leading-tight">{t.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Soft marimba-like plink: two sine partials tuned to marimba harmonic ratios.
// Fundamental stays in the warm mid register (180–380 Hz) so fast spins never
// produce harsh high-pitched noise. A second partial at 2.76× the fundamental
// adds the characteristic "hollow wood" warmth without being sharp.
function playTick(ctx: AudioContext, intensity: number) {
  try {
    const now  = ctx.currentTime;
    // Fundamental: 180 Hz (slow spin) → 380 Hz (fast spin) — stays mid-register
    const fund = 180 + intensity * 200;
    const vol  = 0.025 + intensity * 0.055; // softer ceiling (max ~0.08)
    const dur  = 0.10;                    // slightly longer for a softer feel

    // ── Fundamental sine ──────────────────────────────────────────────────
    const osc1  = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(fund, now);
    // Gentle downward pitch-bend gives a natural "struck wood" quality
    osc1.frequency.exponentialRampToValueAtTime(fund * 0.62, now + dur);
    gain1.gain.setValueAtTime(vol, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + dur + 0.01);

    // ── 2nd partial at 2.76× (marimba harmonic) — lower volume, decays faster
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(fund * 2.76, now);
    osc2.frequency.exponentialRampToValueAtTime(fund * 2.76 * 0.58, now + dur * 0.55);
    gain2.gain.setValueAtTime(vol * 0.22, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.55);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + dur * 0.60);
  } catch {
    // AudioContext in bad state — ignore silently
  }
}
