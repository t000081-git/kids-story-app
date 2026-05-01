import NightSky from "./components/NightSky";
import NightSounds from "./components/NightSounds";
import StoryApp from "./components/StoryApp";

export default function Home() {
  return (
    <>
      <NightSky />
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-3 sm:px-6 sm:py-4 overflow-hidden">
        <StoryApp />
      </main>
      <NightSounds />
    </>
  );
}
