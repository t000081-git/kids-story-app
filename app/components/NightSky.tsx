"use client";

// Note: static twinkling STARS removed — saved-story gold stars and spiral
// galaxies (SavedStoryStars) fill that role and grow as users save stories.
// FIREFLIES removed per user request.

const CLOUDS: { top: string; duration: string; delay: string; size: number; opacity: number }[] = [
  { top: "14%", duration: "55s", delay: "0s",   size: 60, opacity: 0.55 },
  { top: "38%", duration: "75s", delay: "-20s", size: 48, opacity: 0.4  },
  { top: "62%", duration: "65s", delay: "-40s", size: 54, opacity: 0.45 },
];

const COMETS: { top: string; width: number; duration: string; delay: string; tilt: number }[] = [
  { top: "12%", width: 90, duration: "20s", delay: "0s",   tilt: 20 },
  { top: "48%", width: 80, duration: "20s", delay: "-10s", tilt: 18 },
];

const PULSES: { left: string; top: string; size: string; color: string; duration: string; delay: string }[] = [
  { left: "-8%", top: "-6%",  size: "55%", color: "rgba(255, 220, 160, 0.55)", duration: "14s", delay: "0s"  },
  { left: "52%", top:  "55%", size: "60%", color: "rgba(190, 170, 255, 0.45)", duration: "19s", delay: "-9s" },
];

export default function NightSky() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Magical lightning pulses */}
      {PULSES.map((p, i) => (
        <div
          key={`p${i}`}
          className="ks-pulse absolute"
          style={{
            left: p.left, top: p.top, width: p.size, height: p.size,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 60%)`,
            opacity: 0,
            animation: `ks-pulse ${p.duration} ease-in-out ${p.delay} infinite`,
            mixBlendMode: "screen",
          }}
        />
      ))}

      {/* Moon */}
      <span
        className="ks-glow absolute select-none"
        style={{
          right: "8%", top: "8%", fontSize: "84px",
          animation: "ks-float 8s ease-in-out infinite, ks-glow 6s ease-in-out infinite",
        }}
      >
        🌙
      </span>

      {/* Comets */}
      {COMETS.map((c, i) => (
        <div
          key={`co${i}`}
          className="ks-comet absolute"
          style={{
            top: c.top, left: 0, width: `${c.width}px`, height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(255, 232, 180, 0.7) 75%, rgba(255, 255, 240, 0.95) 97%, transparent 100%)",
            transform: `rotate(${c.tilt}deg)`,
            transformOrigin: "right center",
            filter: "blur(0.3px) drop-shadow(0 0 3px rgba(255, 220, 150, 0.6))",
            borderRadius: "9999px",
            animation: `ks-comet ${c.duration} linear ${c.delay} infinite`,
          }}
        />
      ))}

      {/* Clouds */}
      {CLOUDS.map((c, i) => (
        <span
          key={`c${i}`}
          className="ks-drift absolute select-none"
          style={{
            top: c.top, left: "0", fontSize: `${c.size}px`,
            opacity: c.opacity, filter: "blur(0.4px)",
            animation: `ks-drift ${c.duration} linear ${c.delay} infinite`,
          }}
        >
          ☁️
        </span>
      ))}
    </div>
  );
}
