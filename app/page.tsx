import NightSky from "./components/NightSky";
import NightSounds from "./components/NightSounds";
import StoryApp from "./components/StoryApp";
import SavedStoryStars from "./components/SavedStoryStars";

export default function Home() {
  return (
    <>
      <NightSky />
      {/* Saved-story interactive stars — behind the card (z-12),
          pointer-events disabled on container so it never blocks the UI */}
      <SavedStoryStars />
      {/* z-20 ensures the card sits above the background stars */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-3 sm:px-6 sm:py-4 overflow-hidden">
        <StoryApp />
      </main>
      <NightSounds />
    </>
  );
}
