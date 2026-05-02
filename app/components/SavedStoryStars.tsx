"use client";

/**
 * SavedStoryStars
 * ────────────────
 * Renders each saved story as an interactive star/galaxy icon in the
 * night-sky background.
 *
 *  • Local saves          → gold 5-pointed star (size ∝ rating)
 *  • Permanent-link saves → purple galaxy orb   (size ∝ rating)
 *
 * Hover → tooltip with title / rating / date.
 * Click → dispatches `ks-load-saved` custom event (StoryApp handles it).
 *
 * Visibility strategy
 * ───────────────────
 * Stars live at z-[50] (above everything) with pointer-events:none on the
 * container so they never block card interactions.  Individual stars re-
 * enable pointer-events.  Stars are placed in "safe zones" that avoid the
 * centre content card so they sit visibly in the dark margins:
 *   – top 15 % of viewport
 *   – bottom 15 %
 *   – left 22 %  (only on ≥640 px screens)
 *   – right 22 % (only on ≥640 px screens)
 *
 * Stars are hidden while a story is being read (ks-mode = "story") to keep
 * the reading view clean.
 */

import { useEffect, useRef, useState } from "react";
import { deleteSavedStory, listSavedStories } from "@/lib/saved-stories";
import type { SavedStory } from "@/lib/saved-stories";

declare global {
  interface Window { __ksMode?: "idle" | "story"; }
}

// ── Seeded pseudo-random (stable positions per story id) ─────────────────────
function rand(seed: string, n: number): number {
  let h = (n + 1) * 2654435761;
  for (let i = 0; i < seed.length; i++)
    h = (Math.imul(h ^ seed.charCodeAt(i), 2246822519)) >>> 0;
  return h / 0xffffffff;
}

// ── Star sizes (px) for ratings 1–5 ─────────────────────────────────────────
const SIZES = [14, 18, 24, 30, 38];

// ── Placement zones ──────────────────────────────────────────────────────────
// Ordered so the first few saved stories always land in the upper portion of
// the screen (top strip → upper margins → lower margins → bottom strip).
// This prevents a lonely 2nd star from appearing at the very bottom.
type Zone = { x0: number; x1: number; y0: number; y1: number };

function getZones(wide: boolean): Zone[] {
  const bottom: Zone = { x0:  2, x1: 98, y0: 86, y1: 98 };

  // Mobile: moon occupies roughly x 62–93%, y 4–18% (fixed, top-right).
  // Limit the top strip to the left 60% so stars never land behind the moon.
  if (!wide) {
    const top: Zone = { x0: 2, x1: 60, y0: 2, y1: 14 };
    return [top, top, top, top, bottom, bottom];
  }

  // Desktop: moon occupies roughly x 82–93%, y 4–16%.
  // Top strip is limited to x ≤ 80; rightUpper starts below the moon (y ≥ 18).
  const top:        Zone = { x0:  2, x1: 80,  y0:  2, y1: 14 };
  const leftUpper:  Zone = { x0:  0, x1: 21,  y0: 15, y1: 47 };
  const rightUpper: Zone = { x0: 79, x1: 100, y0: 18, y1: 47 };
  const leftLower:  Zone = { x0:  0, x1: 21,  y0: 53, y1: 85 };
  const rightLower: Zone = { x0: 79, x1: 100, y0: 53, y1: 85 };

  return [top, leftUpper, rightUpper, top, leftLower, rightLower, bottom];
}

function posFor(story: SavedStory, idx: number, wide: boolean) {
  const zones = getZones(wide);
  const zone  = zones[idx % zones.length];
  return {
    x: zone.x0 + rand(story.id, 0) * (zone.x1 - zone.x0),
    y: zone.y0 + rand(story.id, 1) * (zone.y1 - zone.y0),
  };
}

// ── Browser / OS helpers (also exported for StoryView provenance badge) ───────
export function parseBrowser(ua: string): string {
  if (/Edg/i.test(ua))     return "Edge";
  if (/Chrome/i.test(ua))  return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua))  return "Safari";
  return "Browser";
}
export function parseOS(ua: string): string {
  if (/iPhone|iPad/i.test(ua))         return "iOS";
  if (/Android/i.test(ua))             return "Android";
  if (/Macintosh|Mac OS/i.test(ua))    return "macOS";
  if (/Windows/i.test(ua))             return "Windows";
  return "Device";
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SavedStoryStars() {
  const [stories,       setStories]       = useState<SavedStory[]>([]);
  const [hovered,       setHovered]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [wide,          setWide]          = useState(false);
  const [inStory,       setInStory]       = useState(false);
  const hideTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function refresh() { setStories(listSavedStories()); }

  function loadStory(story: SavedStory) {
    window.dispatchEvent(new CustomEvent("ks-load-saved", { detail: story }));
  }

  function showTooltip(id: string) {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setHovered(id);
  }
  function scheduleHide() {
    hideTimeout.current = setTimeout(() => {
      setHovered(null);
      setConfirmDelete(null); // reset confirm state when tooltip disappears
    }, 180);
  }
  function cancelHide() {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }
  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    deleteSavedStory(id);
    setHovered(null);
    setConfirmDelete(null);
    refresh();
    window.dispatchEvent(new CustomEvent("ks-stories-updated"));
  }

  useEffect(() => {
    refresh();
    setWide(window.innerWidth >= 640);
    setInStory(window.__ksMode === "story");

    const onResize  = () => setWide(window.innerWidth >= 640);
    const onUpdated = () => refresh();
    const onMode    = (e: Event) => {
      setInStory((e as CustomEvent<{ mode: string }>).detail?.mode === "story");
    };

    window.addEventListener("resize",             onResize);
    window.addEventListener("ks-stories-updated", onUpdated);
    window.addEventListener("ks-mode",            onMode);
    return () => {
      window.removeEventListener("resize",             onResize);
      window.removeEventListener("ks-stories-updated", onUpdated);
      window.removeEventListener("ks-mode",            onMode);
    };
  }, []);

  // Hidden while reading a story, or when no saves exist yet
  if (inStory || stories.length === 0) return null;

  return (
    // z-[50] puts stars above the main content layer (z-20) so they're
    // always visible in the margin areas.
    // pointer-events:none on the container means only the star elements
    // themselves capture clicks — the transparent space between stars
    // passes all events through to the card below.
    <div
      className="fixed inset-0 pointer-events-none select-none"
      style={{ zIndex: 50 }}
      aria-hidden="true"
    >
      {stories.map((story, i) => {
        const pos     = posFor(story, i, wide);
        const isGalaxy = !!story.shareUrl;
        const size    = Math.round(SIZES[Math.min((story.rating || 1) - 1, 4)] * (isGalaxy ? 1.25 : 1));
        const delay   = rand(story.id, 2) * 3;
        // Stars twinkle fast (2.2–4s); galaxies spin slowly (15–25s)
        const dur     = isGalaxy
          ? 15 + rand(story.id, 3) * 10
          : 2.2 + rand(story.id, 3) * 1.8;
        const isHov   = hovered === story.id;

        // ── Tooltip placement: keep within all four screen edges ──────────
        // Vertical: show below star when near top (y < 22), else above
        // Horizontal: left-anchor near left edge, right-anchor near right edge
        const tipBelow  = pos.y < 22;
        const tipLeft   = pos.x < 20;   // anchor to left side of star
        const tipRight  = pos.x > 80;   // anchor to right side of star
        const tipVert   = tipBelow ? "top-full mt-2"    : "bottom-full mb-2";
        const tipHoriz  = tipLeft  ? "left-0"
                        : tipRight ? "right-0"
                        : "left-1/2 -translate-x-1/2";

        return (
          <div
            key={story.id}
            className="absolute pointer-events-auto cursor-pointer"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)" }}
            onMouseEnter={() => showTooltip(story.id)}
            onMouseLeave={scheduleHide}
            onTouchStart={() => {
              longPressRef.current = setTimeout(() => {
                longPressRef.current = null;
                showTooltip(story.id);
              }, 500);
            }}
            onTouchEnd={() => {
              if (longPressRef.current) {
                clearTimeout(longPressRef.current);
                longPressRef.current = null;
                loadStory(story);
              }
            }}
            onTouchMove={() => {
              if (longPressRef.current) {
                clearTimeout(longPressRef.current);
                longPressRef.current = null;
              }
            }}
            onClick={() => loadStory(story)}
          >
            {/* Star / galaxy shape */}
            <div
              className={isGalaxy ? "ks-galaxy-star" : "ks-saved-star"}
              style={{
                width: size, height: size,
                "--anim-delay": `${delay}s`,
                "--anim-dur":   `${dur}s`,
              } as React.CSSProperties}
            />

            {/* Tooltip — sticky: stays open when mouse moves into tooltip.
                stopPropagation prevents clicks inside from firing the outer
                onClick (which loads the story) — use the explicit Read button. */}
            {isHov && (
              <div
                className={`absolute z-[60] ${tipVert} ${tipHoriz}
                           bg-[#0f0b28]/95 border border-amber-200/25 rounded-xl
                           p-2.5 min-w-[150px] max-w-[200px] shadow-xl
                           backdrop-blur-sm`}
                onMouseEnter={cancelHide}
                onMouseLeave={scheduleHide}
                onClick={(e) => e.stopPropagation()}
              >
                {confirmDelete === story.id ? (
                  /* ── Inline delete confirmation ── */
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-amber-100 leading-snug">
                      Delete this story?
                    </p>
                    <p className="text-[10px] text-amber-50/50 leading-snug line-clamp-2">
                      {story.title}
                    </p>
                    <div className="flex gap-1.5 mt-0.5">
                      <button
                        className="flex-1 text-[10px] rounded border border-red-400/40 bg-red-900/30 text-red-200 hover:bg-red-800/50 transition-colors py-1 leading-none"
                        onClick={(e) => handleDelete(e, story.id)}
                      >
                        🗑 Delete
                      </button>
                      <button
                        className="flex-1 text-[10px] rounded border border-amber-200/20 text-amber-50/60 hover:text-amber-50/90 transition-colors py-1 leading-none"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal story info ── */
                  <>
                    {/* Delete — opens inline confirmation, does NOT delete immediately */}
                    <button
                      className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-amber-50/40 hover:text-red-300 hover:bg-red-900/30 transition-colors text-xs leading-none"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(story.id); }}
                      aria-label="Delete saved story"
                      title="Delete"
                    >✕</button>

                    <p className="text-xs text-amber-100 font-medium leading-snug line-clamp-2 mb-1 pr-5">
                      {story.title}
                    </p>
                    <p className="text-[11px] text-amber-400 tracking-wide">
                      {"★".repeat(story.rating)}
                      <span className="text-amber-900/50">{"★".repeat(5 - story.rating)}</span>
                    </p>
                    <p className="text-[9px] text-amber-50/50 mt-0.5">
                      {isGalaxy ? "🌌 Cloud saved" : "⭐ Local"}{" "}
                      · {new Date(story.savedAt).toLocaleDateString()}
                    </p>
                    {story.userAgent && (
                      <p className="text-[9px] text-amber-50/35 mt-0.5 truncate">
                        {parseBrowser(story.userAgent)} · {parseOS(story.userAgent)}
                      </p>
                    )}
                    {/* Explicit read button — works on both desktop and mobile */}
                    <button
                      className="mt-1.5 w-full text-left text-[10px] text-amber-300/70 hover:text-amber-200 transition-colors italic leading-none"
                      onClick={(e) => { e.stopPropagation(); loadStory(story); }}
                    >
                      ▶ Read story
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
