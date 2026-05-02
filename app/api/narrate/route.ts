/**
 * /api/narrate
 * ────────────
 * Calls ElevenLabs text-to-speech with the "with-timestamps" endpoint so
 * the client gets both the audio (base64 MP3) and character-level timing
 * for pixel-perfect karaoke word highlighting.
 *
 * Falls back gracefully: if ELEVENLABS_API_KEY is absent, returns 503 and
 * StoryView falls back to the browser's Web Speech API automatically.
 *
 * Required env var:
 *   ELEVENLABS_API_KEY   — from https://elevenlabs.io → Profile → API Keys
 *
 * Optional env var:
 *   ELEVENLABS_VOICE_ID  — default is Rachel (21m00Tcm4TlvDq8ikWAM),
 *                          warm and narrative; replace with any EL voice ID
 */

import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

// Rachel — warm, narrative, works well for bedtime stories.
// eleven_multilingual_v2 handles all 9 languages the app supports.
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Return 503 so StoryView silently falls back to Web Speech API.
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  let body: { text?: unknown; language?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE;

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
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability:        0.50,
          similarity_boost: 0.75,
          style:            0.20,
          use_speaker_boost: true,
        },
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
