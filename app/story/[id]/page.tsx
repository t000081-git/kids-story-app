/**
 * /story/[id]  — cloud-saved story viewer
 *
 * Server component: fetches story from Vercel KV, then hands off to the
 * client StoryDisplay wrapper for the full interactive reading experience.
 * If the id is unknown, renders a friendly 404.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NightSky from "@/app/components/NightSky";
import StoryDisplay from "./StoryDisplay";
import { getStoryFromKV } from "@/lib/story-kv";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const story = await getStoryFromKV(id);
  if (!story) return { title: "Story not found — Kids Story" };
  return {
    title: `${story.title} — Kids Story`,
    description: `A personalized bedtime story: ${story.title}`,
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStoryFromKV(id);
  if (!story) notFound();

  return (
    <>
      <NightSky />
      <StoryDisplay story={story} />
    </>
  );
}
