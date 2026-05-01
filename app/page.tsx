import NightSounds from "./components/NightSounds";
import StoryApp from "./components/StoryApp";
import SavedStoryStars from "./components/SavedStoryStars";

export default function Home() {
  return (
    <>
      {/* Only saved-story stars appear in the background — no NightSky clutter */}
      <SavedStoryStars />
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-3 sm:px-6 sm:py-4 overflow-hidden">
        <StoryApp />
      </main>
      <NightSounds />
    </>
  );
}
