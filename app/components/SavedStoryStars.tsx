"use client";

/**
 * SavedStoryStars
 * ────────────────
 * Renders each saved story as an interactive star/galaxy icon scattered in
 * the night-sky background.
 *
 *  • Local saves          → gold 5-pointed star (size ∝ rating)
 *  • Permanent-link saves → purple galaxy orb   (size ∝ rating)
 *
 * Hover → tooltip with title / rating / date.
 * Click → dispatches `ks-load-saved` custom event (StoryApp handles it).
 *
 * Stars are placed in "safe zones" that avoid the centre content card:
 *   – top 12 % of viewport  (always safe)
 *   – bottom 12 %           (always safe)
 *   – left 18 %             (safe on ≥640 px screens)
 *   – right 18 %            (safe on ≥640 px screens)
 *
 * Positions are deterministic (seeded from story id) so they don't jump.
 */

import { useEffect, useState } from "react";
import { listSavedStories } from "@/lib/saved-stories";
import type { SavedStory } from "@/lib/saved-stories";

// ── Seeded pseudo-random ─────────────────────────────────────────────────────
function rand(seed: string, n: number): number {
  let h = (n + 1) * 2654435761;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2246822519) >>> 0;
  }
  return h / 0xffffffff;
}

// ── Star sizes (px) for ratings 1–5 ─────────────────────────────────────────
const SIZES = [13, 17, 22, 28, 36];

// ── Placement zones ──────────────────────────────────────────────────────────
type Zone = { x0: number; x1: number; y0: number; y1: number };

function getZones(wide: boolean): Zone[] {
  const top: Zone    = { x0:  0, x1: 100, y0:  0, y1: 12 };
  const bottom: Zone = { x0:  0, x1: 100, y0: 88, y1: 100 };
  if (!wide) return [top, bottom];
  return [
    top,
    bottom,
    { x0:  0, x1: 18, y0: 12, y1: 88 }, // left margin
    { x0: 82, x1: 100, y0: 12, y1: 88 }, // right margin
  ];
}

function posFor(story: SavedStory, idx: number, wide: boolean): { x: number; y: number } {
  const zones = getZones(wide);
  const zone  = zones[idx % zones.length];
  const x = zone.x0 + rand(story.id, 0) * (zone.x1 - zone.x0);
  const y = zone.y0 + rand(story.id, 1) * (zone.y1 - zone.y0);
  return { x, y };
}

// ── Browser / OS label for provenance (re-exported for StoryView) ─────────────
export function parseBrowser(ua: string): string {
  if (/Edg/i.test(ua))     return "Edge";
  if (/Chrome/i.test(ua))  return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua))  return "Safari";
  return "Browser";
}
export function parseOS(ua: string): string {
  if (/iPhone|iPad/i.test(ua))  return "iOS";
  if (/Android/i.test(ua))      return "Android";
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua))      return "Windows";
  return "Device";
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SavedStoryStars() {
  const [stories, setStories]   = useState<SavedStory[]>([]);
  const [hovered, setHovered]   = useState<string | null>(null);
  const [wide, setWide]         = useState(false);

  function refresh() { setStories(listSavedStories()); }

  useEffect(() => {
    refresh();
    setWide(window.innerWidth >= 640);

    const onResize  = () => setWide(window.innerWidth >= 640);
    const onUpdated = () => refresh();

    window.addEventListener("resize",             onResize);
    window.addEventListener("ks-stories-updated", onUpdated);
    return () => {
      window.removeEventListener("resize",             onResize);
      window.removeEventListener("ks-stories-updated", onUpdated);
    };
  }, []);

  if (stories.length === 0) return null;

  return (
    // pointer-events:none on container so it never blocks the main card.
    // Individual stars re-enable pointer-events.
    <div
      className="fixed inset-0 pointer-events-none select-none"
      style={{ zIndex: 12 }}
      aria-hidden="true"
    >
      {stories.map((story, i) => {
        const pos   = posFor(story, i, wide);
        const size  = SIZES[Math.min((story.rating || 1) - 1, 4)];
        const isGalaxy = !!story.shareUrl;
        const delay = rand(story.id, 2) * 3;
        const dur   = 2.2 + rand(story.id, 3) * 1.8;
        const isHov = hovered === story.id;

        return (
          <div
            key={story.id}
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              left:      `${pos.x}%`,
              top:       `${pos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onMouseEnter={() => setHovered(story.id)}
            onMouseLeave={() => setHovered(null)}
            onTouchStart={() => setHovered(story.id)}
            onTouchEnd={() => {
              setTimeout(() => setHovered(null), 1800);
              window.dispatchEvent(
                new CustomEvent("ks-load-saved", { detail: story }),
              );
            }}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("ks-load-saved", { detail: story }),
              );
            }}
          >
            {/* ── Star / Galaxy shape ── */}
            <div
              className={isGalaxy ? "ks-galaxy-star" : "ks-saved-star"}
              style={{
                width:  size,
                height: size,
                "--anim-delay": `${delay}s`,
                "--anim-dur":   `${dur}s`,
              } as React.CSSProperties}
            />

            {/* ── Hover tooltip ── */}
            {isHov && (
              <div
                className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2
                           bg-[#0f0b28]/92 border border-amber-200/20 rounded-xl
                           p-2.5 min-w-[150px] max-w-[200px] shadow-xl
                           backdrop-blur-sm pointer-events-none"
              >
                <p className="text-xs text-amber-100 font-medium leading-snug line-clamp-2 mb-1">
                  {story.title}
                </p>
                <p className="text-[11px] text-amber-400 tracking-wider">
                  {"★".repeat(story.rating)}
                  <span className="text-amber-900/50">{"★".repeat(5 - story.rating)}</span>
                </p>
                <p className="text-[9px] text-amber-50/45 mt-0.5">
                  {isGalaxy ? "🌌 Permanent link" : "⭐ Saved locally"}{" "}
                  · {new Date(story.savedAt).toLocaleDateString()}
                </p>
                {story.userAgent && (
                  <p className="text-[9px] text-amber-50/35 mt-0.5 truncate">
                    {parseBrowser(story.userAgent)} · {parseOS(story.userAgent)}
                  </p>
                )}
                <p className="text-[9px] text-amber-300/50 mt-1 italic">
                  Tap to read
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
