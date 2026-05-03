import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

// Use Edge runtime so Vercel Hobby allows up to 30 s instead of the
// default 10 s serverless limit. Story generation on free-tier LLMs
// routinely takes 8-20 s — Edge is the only way to stay within Hobby.
export const runtime = "edge";
export const maxDuration = 30;

// Free-only model chain — all three are raced in parallel via Promise.any().
// The fastest non-rate-limited model wins. Having three increases reliability
// because OpenRouter free models are often rate-limited upstream.
const MODELS = [
  "openai/gpt-oss-20b:free",
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-nano-9b-v2:free",
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
  "ar",
  "tl",
] as const;
type Language = (typeof LANGUAGES)[number];

const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  ar: "Arabic",
  tl: "Filipino (Tagalog)",
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

  const tagalogExtra = language === "tl" ? `

TAGALOG LANGUAGE RULES — strictly follow these:
- Write in authentic, natural Filipino/Tagalog throughout — NOT Taglish or English-heavy text.
- Use real, existing Tagalog words. Do NOT invent or hallucinate Tagalog-sounding words.
- Prefer native Tagalog vocabulary over borrowed English words wherever a native word exists. Examples: use "araw" not "sun", "gabi" not "night", "ulap" not "cloud", "ilog" not "river", "puno" not "tree", "tahimik" not "quiet", "maganda" not "beautiful", "malakas" not "strong", "mabilis" not "fast".
- English loanwords that have no Tagalog equivalent (e.g. proper names, brand-new concepts) are allowed, but native Tagalog words are always preferred.
- Follow natural Tagalog sentence structure (verb-subject-object or verb-focus pattern is common).
- The child's name should remain spelled exactly as given — do not translate or alter it.` : "";

  const arabicExtra = language === "ar" ? `

ARABIC LANGUAGE RULES — strictly follow ALL of these without exception:
- Write EXCLUSIVELY in Modern Standard Arabic (الفصحى / Fusha) using proper Arabic script.
- Every single word must be a real, correct Arabic word written in Arabic letters — NO English words, NO Latin characters anywhere in the story text.
- Do NOT mix in English under any circumstances — not for objects, animals, names of things, or any other reason. Always use the proper Arabic word (e.g. قطة not "cat", شجرة not "tree", سماء not "sky", نجمة not "star", قمر not "moon").
- Do NOT use Arabizi (Arabic words written in English letters like "habibi" in Latin script).
- Use correct Arabic grammar throughout: proper masculine/feminine agreement, dual forms (مثنى), correct plural forms (جموع), correct verb conjugation.
- Sentence structure must follow natural Arabic patterns (الجملة الفعلية or الجملة الاسمية) — not translated word-for-word from English.
- Numbers must be written as Arabic words (واحد، اثنان، ثلاثة) not as numerals.
- The child's name stays spelled exactly as given by the user — do not translate or alter it.
- Write as a native Arabic children's author would — a fluent Arabic speaker must be able to read it naturally aloud.` : "";

  return `You are a warm, gentle storyteller who writes magical bedtime stories for young children (ages 4-8).

Each story must:
- Be genuinely kind, safe, and age-appropriate (no violence, scary content, or heavy emotional themes)
- Have a clear beginning, middle, and gentle resolution across exactly ${pageCount} short pages
- Star the child whose name is given as the main character
- Match the requested theme
- Use simple, vivid, imaginative language a child can follow when read aloud
- End on a warm, hopeful note
- Each page should be 2-4 short sentences (about 30-60 words)

Write the entire story (both the title AND every page) in ${langName}. The child's name should remain spelled exactly as given by the user, even when the rest of the text is in ${langName}.${tagalogExtra}${arabicExtra}

You MUST respond with ONLY a valid JSON object in this exact format, with no additional text before or after:
{
  "title": "Story title in ${langName}",
  "pages": [
${Array.from({ length: pageCount }, () => `    "Story text here — do NOT include a 'Page N:' prefix"`).join(",\n")}
  ]
}

IMPORTANT: Each page string must contain ONLY the story prose — never start a page with "Page 1:", "Page 2:", or any page label.
The "pages" array MUST contain exactly ${pageCount} string entries.`;
}

function buildLullabyPrompt(pageCount: number): string {
  return `You are a gentle Filipino lullaby writer. Create a beautiful Tagalog bedtime lullaby for a young child.

The lullaby has exactly ${pageCount} stanzas. Each stanza (page) must:
- Contain exactly 4 short lines of Tagalog verse
- Each line should be 6-10 syllables, natural to sing aloud
- Use a simple AABB or ABAB rhyme scheme in Tagalog
- Be soothing, dreamy, and safe for young children (ages 2-8)
- Flow like a traditional Filipino lullaby (in the spirit of "Sa Ugoy ng Duyan" or "Ili-Ili Tulog Anay")
- Weave the child's name naturally into the lullaby (spelled exactly as given)

Format each stanza as 4 lines separated by newline characters (\\n), like:
"Matulog na, [name], matulog na,\\nSa tahimik na gabi ng buwan,\\nAng mga bituin ay nagbabantay,\\nHanggang umaga, mahal kita."

Write the entire lullaby in Filipino/Tagalog. The title should also be in Tagalog.

You MUST respond with ONLY a valid JSON object in this exact format, no extra text:
{
  "title": "Lullaby title in Tagalog",
  "pages": [
${Array.from({ length: pageCount }, () => `    "4-line stanza here with \\\\n between each line"`).join(",\n")}
  ]
}

The "pages" array MUST contain exactly ${pageCount} string entries.
NEVER add "Page N:" prefixes.`;
}

type GeneratedStory = { title: string; pages: string[] };

// Each model attempt gets 25 s. All models are fired IN PARALLEL so the
// fastest one wins — we're not limited by the slowest queue any more.
// Belt-and-suspenders: AbortController + Promise.race both enforce the limit
// so we're not relying on either alone (AbortController can be flaky in
// some Edge runtimes).
const MODEL_TIMEOUT_MS = 25_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms),
  );
  return Promise.race([promise, timeout]);
}

async function tryGenerate(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  pageCount: number,
): Promise<GeneratedStory> {
  const controller = new AbortController();
  // AbortController as a best-effort cancel on the outgoing fetch
  const abortTimer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const upstream = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        signal: controller.signal,
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

    // Strip any "Page N:" / "Page N." / "Page N -" prefixes the LLM may still
    // emit despite the prompt instruction (belt-and-suspenders).
    const pages = (parsed.pages as string[]).map((p) =>
      p.trim().replace(/^[Pp]age\s*\d+\s*[:.\-–—]\s*/u, ""),
    );
    return { title: parsed.title.trim(), pages };
  } finally {
    clearTimeout(abortTimer);
  }
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

  // Race all models in parallel — fastest wins. Plain JSON response is
  // simpler and universally compatible (SSE streaming had issues on iOS
  // Safari). The 30 s Edge budget + 25 s per-model timeout is enough
  // headroom without needing a streaming keep-alive.
  try {
    const story = await withTimeout(
      Promise.any(
        MODELS.map((model) =>
          tryGenerate(apiKey, model, systemPrompt, userPrompt, pageCount),
        ),
      ),
      MODEL_TIMEOUT_MS,
    );
    return NextResponse.json(story);
  } catch (err) {
    console.error("All models failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        error:
          "The storyteller is having a quiet moment. Please try again — sometimes a second try is all it takes.",
      },
      { status: 502 },
    );
  }
}
