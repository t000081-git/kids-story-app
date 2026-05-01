"use client";

const STARS: { left: string; top: string; size: number; delay: string; duration: string; char: string }[] = [
  { left: "8%",  top: "12%", size: 14, delay: "0s",   duration: "3.2s", char: "✦" },
  { left: "22%", top: "6%",  size: 10, delay: "0.6s", duration: "4.1s", char: "✧" },
  { left: "38%", top: "18%", size: 8,  delay: "1.4s", duration: "2.8s", char: "·" },
  { left: "55%", top: "9%",  size: 12, delay: "0.2s", duration: "3.6s", char: "✦" },
  { left: "70%", top: "16%", size: 9,  delay: "1.0s", duration: "3.0s", char: "⋆" },
  { left: "86%", top: "22%", size: 11, delay: "2.0s", duration: "4.4s", char: "✧" },
  { left: "14%", top: "32%", size: 8,  delay: "1.7s", duration: "3.4s", char: "·" },
  { left: "62%", top: "30%", size: 10, delay: "0.8s", duration: "3.8s", char: "⋆" },
  { left: "82%", top: "44%", size: 9,  delay: "2.4s", duration: "4.0s", char: "✦" },
  { left: "5%",  top: "58%", size: 8,  delay: "0.4s", duration: "3.3s", char: "·" },
  { left: "92%", top: "68%", size: 10, delay: "1.2s", duration: "3.7s", char: "✧" },
  { left: "30%", top: "78%", size: 9,  delay: "2.2s", duration: "4.2s", char: "⋆" },
  // extra stars
  { left: "3%",  top: "26%", size: 7,  delay: "0.9s", duration: "3.1s", char: "·" },
  { left: "46%", top: "4%",  size: 6,  delay: "1.5s", duration: "2.6s", char: "·" },
  { left: "75%", top: "5%",  size: 9,  delay: "0.3s", duration: "3.5s", char: "✧" },
  { left: "18%", top: "46%", size: 11, delay: "1.9s", duration: "4.3s", char: "✦" },
  { left: "48%", top: "40%", size: 7,  delay: "0.7s", duration: "3.0s", char: "·" },
  { left: "72%", top: "56%", size: 12, delay: "2.6s", duration: "4.6s", char: "✦" },
  { left: "26%", top: "62%", size: 8,  delay: "1.1s", duration: "3.4s", char: "⋆" },
  { left: "44%", top: "70%", size: 9,  delay: "0.5s", duration: "3.7s", char: "✧" },
  { left: "58%", top: "84%", size: 10, delay: "1.6s", duration: "4.0s", char: "✦" },
  { left: "10%", top: "88%", size: 8,  delay: "2.3s", duration: "3.5s", char: "⋆" },
  { left: "78%", top: "82%", size: 9,  delay: "0.1s", duration: "3.2s", char: "·" },
  { left: "94%", top: "52%", size: 7,  delay: "1.3s", duration: "2.9s", char: "·" },
];

const CLOUDS: { top: string; duration: string; delay: string; size: number; opacity: number }[] = [
  { top: "14%", duration: "55s", delay: "0s",   size: 60, opacity: 0.55 },
  { top: "38%", duration: "75s", delay: "-20s", size: 48, opacity: 0.4  },
  { top: "62%", duration: "65s", delay: "-40s", size: 54, opacity: 0.45 },
];

const FIREFLIES: { left: string; top: string; delay: string; duration: string }[] = [
  { left: "18%", top: "50%", delay: "0.5s", duration: "3.2s" },
  { left: "78%", top: "55%", delay: "1.8s", duration: "3.8s" },
  { left: "44%", top: "70%", delay: "2.5s", duration: "3.5s" },
];

const COMETS: { top: string; width: number; duration: string; delay: string; tilt: number }[] = [
  { top: "12%", width: 90, duration: "20s", delay: "0s",   tilt: 20 },
  { top: "48%", width: 80, duration: "20s", delay: "-10s", tilt: 18 },
];

const PULSES: { left: string; top: string; size: string; color: string; duration: string; delay: string }[] = [
  // Soft amber/peach magical pulse near top-left
  {
    left: "-8%", top: "-6%",
    size: "55%",
    color: "rgba(255, 220, 160, 0.55)",
    duration: "14s",
    delay: "0s",
  },
  // Soft violet pulse near bottom-right, offset in time
  {
    left: "52%", top: "55%",
    size: "60%",
    color: "rgba(190, 170, 255, 0.45)",
    duration: "19s",
    delay: "-9s",
  },
];

export default function NightSky() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Magical lightning pulses (soft, kid-friendly) */}
      {PULSES.map((p, i) => (
        <div
          key={`p${i}`}
          className="ks-pulse absolute"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 60%)`,
            opacity: 0,
            animation: `ks-pulse ${p.duration} ease-in-out ${p.delay} infinite`,
            mixBlendMode: "screen",
          }}
        />
      ))}

      {/* Stars */}
      {STARS.map((s, i) => (
        <span
          key={`s${i}`}
          className="ks-twinkle absolute text-amber-100 select-none"
          style={{
            left: s.left,
            top: s.top,
            fontSize: `${s.size}px`,
            animation: `ks-twinkle ${s.duration} ease-in-out ${s.delay} infinite`,
          }}
        >
          {s.char}
        </span>
      ))}

      {/* Moon */}
      <span
        className="ks-glow absolute select-none"
        style={{
          right: "8%",
          top: "8%",
          fontSize: "84px",
          animation:
            "ks-float 8s ease-in-out infinite, ks-glow 6s ease-in-out infinite",
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
            top: c.top,
            left: 0,
            width: `${c.width}px`,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255, 232, 180, 0.7) 75%, rgba(255, 255, 240, 0.95) 97%, transparent 100%)",
            transform: `rotate(${c.tilt}deg)`,
            transformOrigin: "right center",
            filter:
              "blur(0.3px) drop-shadow(0 0 3px rgba(255, 220, 150, 0.6))",
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
            top: c.top,
            left: "0",
            fontSize: `${c.size}px`,
            opacity: c.opacity,
            filter: "blur(0.4px)",
            animation: `ks-drift ${c.duration} linear ${c.delay} infinite`,
          }}
        >
          ☁️
        </span>
      ))}

      {/* Fireflies */}
      {FIREFLIES.map((f, i) => (
        <span
          key={`f${i}`}
          className="ks-shimmer absolute block rounded-full"
          style={{
            left: f.left,
            top: f.top,
            width: "10px",
            height: "10px",
            background:
              "radial-gradient(circle, rgba(255,225,140,0.95) 0%, rgba(255,200,80,0.4) 60%, rgba(255,200,80,0) 100%)",
            animation: `ks-shimmer ${f.duration} ease-in-out ${f.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
