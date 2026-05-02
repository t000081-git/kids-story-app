import { NextResponse } from "next/server";

export const maxDuration = 60;

const THEME_STYLE: Record<string, string> = {
  animals: "cute friendly animals, lush forest meadow",
  dinosaurs: "friendly cartoon dinosaurs, prehistoric landscape",
  dragons: "friendly young dragon and a cozy castle dungeon, warm torch light, fantasy",
  magic: "enchanted forest, glowing fairy lights and sparkles",
  pirates: "young friendly pirates and a treasure island, sunny seas",
  princesses: "kind princess and a fairy-tale castle, soft pastel colors",
  knights: "young knight in shiny armor on a peaceful quest, gentle countryside",
  mermaids: "colorful mermaid and a sparkling underwater kingdom of coral",
  unicorns: "rainbow unicorn in an enchanted meadow of flowers",
  fairies: "tiny fairies and glowing magical garden lights, fireflies",
  wizards: "young wizard casting gentle sparkles in a cozy enchanted library",
  robots: "friendly cartoon robots in a bright, hopeful futuristic city",
  superheroes: "young cartoon superheroes flying over a friendly city in soft daylight",
  space: "rocket ship and friendly aliens among colorful planets and twinkling stars",
  "sea-life": "colorful coral reef and friendly undersea creatures, sunlit water",
  ninjas: "young ninja on a peaceful forest path with cherry blossoms and lanterns",
  "cars-trucks": "cheerful cartoon cars and trucks on a sunlit country road",
  trains: "friendly steam train chugging through rolling green hills",
  "farm-animals": "happy farm animals in a sunny barnyard, soft and cute",
  "snowy-day": "children sledding on a snowy hill, gentle snowflakes, cozy and warm",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const theme = url.searchParams.get("theme") ?? "";
  const text = url.searchParams.get("text") ?? "";
  const seed = url.searchParams.get("seed") ?? "1";

  if (!theme || theme.length > 100) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }
  if (!text || text.length > 600) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  // Use the preset style descriptor when available; fall back to the raw
  // custom-theme text so user-typed themes still get a real illustration.
  const themeStyle = THEME_STYLE[theme] ?? theme;
  const summary = text.replace(/\s+/g, " ").trim().slice(0, 180);
  const prompt = `soft watercolor children's storybook illustration, ${themeStyle}, ${summary}, warm pastel palette, hand-painted, gentle lighting, cozy, no text, no words, no letters`;

  const params = new URLSearchParams({
    width: "768",
    height: "512",
    nologo: "true",
    safe: "true",
    seed: String(parseInt(seed, 10) || 1),
  });

  const upstream = await fetch(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`,
    {
      headers: {
        "User-Agent": "kids-story-app/0.1 (https://github.com/t000081-git/kids-story-app)",
      },
    },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "The illustrator is sketching slowly. Please try again." },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
