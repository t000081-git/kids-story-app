import NightSky from "./components/NightSky";
import NightSounds from "./components/NightSounds";
import StoryApp from "./components/StoryApp";
import SavedStoryStars from "./components/SavedStoryStars";

export default function Home() {
  return (
    <>
      {/* NightSky: comets, clouds, lightning pulses, moon — no static stars
          (saved-story stars fill that role and grow over time) */}
      <NightSky />
      {/* Saved-story stars above everything, in the dark margins */}
      <SavedStoryStars />
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-3 sm:px-6 sm:py-4 overflow-hidden">
        <StoryApp />
      </main>
      <NightSounds />
    </>
  );
}
