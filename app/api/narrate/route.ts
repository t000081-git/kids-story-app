import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

// Adventure themes → deep male narrator (Adventure Male)
const ADVENTURE_THEMES = new Set([
  "dinosaurs", "dragons", "pirates", "knights", "ninjas",
  "space", "robots", "superheroes", "cars-trucks", "trains",
  "firefighter", "astronaut", "cowboy", "explorer",
  "volcano", "time-travel", "haunted", "mountain",
  "secret-agent", "ocean-dive",
]);

// Voice IDs (all user-created, work on free tier)
const VOICE_ADVENTURE_MALE  = "Eio1eLNHG4jFMyXwGco4"; // Adventure Male
const VOICE_GENTLE_FEMALE   = "GkSPWYK0dF40OoSR1gj3"; // Smooth voice female
const VOICE_GRANDMA_ARABIC  = "fhJPNMe92P5iPjL1reZT"; // Grandma Arabic

const ALL_VOICES = [VOICE_ADVENTURE_MALE, VOICE_GENTLE_FEMALE, VOICE_GRANDMA_ARABIC];

function pickVoice(language: string, theme: string): string {
  if (language === "tl") return ALL_VOICES[Math.floor(Math.random() * ALL_VOICES.length)];
  if (language === "ar") return VOICE_GRANDMA_ARABIC;
  return ADVENTURE_THEMES.has(theme) ? VOICE_ADVENTURE_MALE : VOICE_GENTLE_FEMALE;
}

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  let body: { text?: unknown; language?: unknown; theme?: unknown; sing?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  const language = typeof body.language === "string" ? body.language : "en";
  const theme    = typeof body.theme    === "string" ? body.theme    : "";
  const sing     = body.sing === true;
  const voiceId  = process.env.ELEVENLABS_VOICE_ID ?? pickVoice(language, theme);

  const voiceSettings = sing ? {
    stability:        0.25,
    similarity_boost: 0.50,
    style:            0.90,
    use_speaker_boost: true,
  } : {
    stability:        0.50,
    similarity_boost: 0.75,
    style:            0.20,
    use_speaker_boost: true,
  };

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: voiceSettings,
      }),
    },
  ).catch(() => null);

  if (!upstream?.ok) {
    const errText = await upstream?.text().catch(() => "");
    console.error("ElevenLabs error:", upstream?.status, errText?.slice(0, 200));
    return NextResponse.json({ error: "TTS unavailable" }, { status: 502 });
  }

  const data = await upstream.json() as {
    audio_base64: string;
    alignment: {
      characters:                    string[];
      character_start_times_seconds: number[];
      character_end_times_seconds:   number[];
    };
  };

  return NextResponse.json({
    audioBase64: data.audio_base64,
    alignment:   data.alignment,
  });
}
