import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

// Free-only model chain. We try the primary, then the fallback, with
// up to two attempts each so a single flaky response doesn't surface
// to the user as "no story came back".
const MODELS = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
] as const;

for (const m of MODELS) {
  if (!m.endsWith(":free")) {
    throw new Error(
      `Refusing to start: model "${m}" is not a :free model. Kids Story is configured to never incur paid API costs.`,
    );
  }
}

const THEMES = [
  "animals",
  "dinosaurs",
  "dragons",
  "magic",
  "pirates",
  "princesses",
  "knights",
  "mermaids",
  "unicorns",
  "fairies",
  "wizards",
  "robots",
  "superheroes",
  "space",
  "sea-life",
  "ninjas",
  "cars-trucks",
  "trains",
  "farm-animals",
  "snowy-day",
] as const;

const LENGTHS = ["short", "medium", "long"] as const;
type Length = (typeof LENGTHS)[number];

const PAGE_COUNT: Record<Length, number> = {
  short: 2,
  medium: 4,
  long: 6,
};

const LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "zh",
  "ja",
  "ko",
] as const;
type Language = (typeof LANGUAGES)[number];

const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Mandarin Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
};

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]{0,49}$/;
const CUSTOM_THEME_PATTERN = /^[A-Za-z][A-Za-z0-9\s'\-,&]{0,49}$/;

const PRESET_PROMPT: Record<string, string> = {
  dragons:
    "dragons and enchanted dungeons (a friendly, kind dragon; brave young heroes; a cozy castle)",
  pirates:
    "kind, adventurous pirates and a hidden treasure island, sailing under sunny skies",
  princesses:
    "kind princesses in a fairy-tale kingdom, with caring friends and gentle magic",
  knights:
    "brave young knights on a noble, peaceful quest with horses and friendly companions",
  mermaids:
    "joyful mermaids and a sparkling underwater kingdom of coral and friendly sea creatures",
  unicorns:
    "rainbow unicorns galloping through an enchanted meadow of flowers and sparkles",
  fairies:
    "tiny fairies tending a glowing magical garden full of fireflies and dewdrops",
  wizards:
    "kind young wizards casting gentle, sparkling spells in a cozy enchanted library",
  robots:
    "friendly helpful robots on a curious adventure in a bright, hopeful future",
  superheroes:
    "kind young superheroes using their special powers to help neighbors and save the day",
  space:
    "a magical space adventure with friendly aliens, twinkling stars, and shimmering planets",
  "sea-life":
    "a colorful coral reef brimming with friendly fish, dolphins, and gentle sea turtles",
  ninjas:
    "stealthy young ninjas on a peaceful adventure through a moonlit bamboo forest",
  "cars-trucks":
    "cheerful talking cars and trucks on a sunny road trip through rolling hills",
  trains:
    "a friendly little steam train chugging through wonderful places it has never seen",
  "farm-animals":
    "happy farm animals enjoying a sunny day in a cozy barnyard",
  "snowy-day":
    "a gentle snowy winter day with sledding, snowmen, and warm cocoa by the fire",
};

function buildSystemPrompt(pageCount: number, language: Language): string {
  const langName = LANGUAGE_NAME[language];
  return `You are a warm, gentle storyteller who writes magical bedtime stories for young children (ages 4-8).

Each story must:
- Be genuinely kind, safe, and age-appropriate (no violence, scary content, or heavy emotional themes)
- Have a clear beginning, middle, and gentle resolution across exactly ${pageCount} short pages
- Star the child whose name is given as the main character
- Match the requested theme
- Use simple, vivid, imaginative language a child can follow when read aloud
- End on a warm, hopeful note
- Each page should be 2-4 short sentences (about 30-60 words)

Write the entire story (both the title AND every page) in ${langName}. The child's name should remain spelled exactly as given by the user, even when the rest of the text is in ${langName}.

You MUST respond with ONLY a valid JSON object in this exact format, with no additional text before or after:
{
  "title": "Story title in ${langName}",
  "pages": [
${Array.from({ length: pageCount }, (_, i) => `    "Page ${i + 1} text in ${langName}..."`).join(",\n")}
  ]
}

The "pages" array MUST contain exactly ${pageCount} string entries.`;
}

type GeneratedStory = { title: string; pages: string[] };

async function tryGenerate(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  pageCount: number,
): Promise<GeneratedStory> {
  const upstream = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kids-story-app-green.vercel.app",
        "X-Title": "Kids Story",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
      }),
    },
  );

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    throw new Error(`upstream ${upstream.status}: ${errText.slice(0, 200)}`);
  }

  const data = await upstream.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("empty content");
  }

  // Some models wrap JSON in ```json ... ``` even when asked for raw.
  // Strip that defensively before parsing.
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: { title?: unknown; pages?: unknown };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("invalid json");
  }

  if (
    typeof parsed.title !== "string" ||
    !parsed.title.trim() ||
    !Array.isArray(parsed.pages) ||
    parsed.pages.length !== pageCount ||
    !parsed.pages.every((p) => typeof p === "string" && p.trim().length > 0)
  ) {
    throw new Error("invalid shape");
  }

  return { title: parsed.title.trim(), pages: parsed.pages as string[] };
}

export async function POST(req: Request) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown";

  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `You've reached the limit of 5 stories per hour. Please try again in ${rl.minutesUntilReset} minute${rl.minutesUntilReset === 1 ? "" : "s"}.`,
      },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    theme?: unknown;
    length?: unknown;
    language?: unknown;
  } | null;

  const rawName = typeof body?.name === "string" ? body.name.trim() : "";
  if (!NAME_PATTERN.test(rawName)) {
    return NextResponse.json(
      {
        error:
          "Please enter a name (letters, spaces, hyphens, and apostrophes only).",
      },
      { status: 400 },
    );
  }

  const rawTheme = typeof body?.theme === "string" ? body.theme.trim() : "";
  const isPresetTheme = (THEMES as readonly string[]).includes(rawTheme);
  const isCustomTheme =
    !isPresetTheme && CUSTOM_THEME_PATTERN.test(rawTheme);
  if (!isPresetTheme && !isCustomTheme) {
    return NextResponse.json(
      {
        error:
          "Please pick a theme — letters, numbers, spaces, hyphens or apostrophes only, under 50 characters.",
      },
      { status: 400 },
    );
  }
  const themePhrase = PRESET_PROMPT[rawTheme] ?? rawTheme;

  const length = body?.length as Length;
  if (!LENGTHS.includes(length)) {
    return NextResponse.json(
      { error: "Please pick a length." },
      { status: 400 },
    );
  }

  const language =
    typeof body?.language === "string" && (LANGUAGES as readonly string[]).includes(body.language)
      ? (body.language as Language)
      : "en";

  const pageCount = PAGE_COUNT[length];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The site is not yet configured. Please contact the site owner." },
      { status: 500 },
    );
  }

  const systemPrompt = buildSystemPrompt(pageCount, language);
  const userPrompt = `Write a ${pageCount}-page bedtime story for a child named ${rawName}. The theme is: ${themePhrase}. Write the entire story in ${LANGUAGE_NAME[language]}.`;

  // Try each model up to twice. A single flaky response no longer
  // surfaces as a user-facing error.
  let lastError: unknown = null;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const story = await tryGenerate(
          apiKey,
          model,
          systemPrompt,
          userPrompt,
          pageCount,
        );
        return NextResponse.json(story);
      } catch (e) {
        lastError = e;
        console.error(
          `Story generation failed (model=${model}, attempt=${attempt + 1}):`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  console.error("All models exhausted:", lastError);
  return NextResponse.json(
    {
      error:
        "The storyteller is having a quiet moment. Please try again — sometimes a second try is all it takes.",
    },
    { status: 502 },
  );
}
