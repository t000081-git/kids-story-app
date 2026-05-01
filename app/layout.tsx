import type { Metadata } from "next";
import { Fredoka, Lora } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kids Story — A bedtime story just for you",
  description:
    "Tell us your name, pick a theme, and we'll write a personalized bedtime story.",
};

// App identity — shown at ~33 % opacity so it's present but unobtrusive.
// BUILD_TIME is evaluated at Next.js build time (static page), so it acts
// as a deployment timestamp — change it to confirm a new deploy is live.
const APP_VERSION = "v1.7";
const APP_CREATOR = "C.L.R.";
// Kuwait Time = UTC+3, no DST
const BUILD_TIME = (() => {
  const kw = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return kw.toISOString().replace(/[-:T]/g, "").slice(0, 14) + " KWT";
})();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Creator watermark — fixed upper-left, readable on close inspection */}
        <div
          aria-hidden="true"
          style={{ opacity: 0.33 }}
          className="fixed top-2 left-3 z-50 select-none pointer-events-none
                     text-[10px] leading-tight tracking-widest text-amber-200/80
                     font-mono"
        >
          {APP_CREATOR}
          <br />
          <span className="text-[9px] tracking-wider">{APP_VERSION}</span>
          <br />
          <span className="text-[8px] tracking-normal opacity-80">{BUILD_TIME}</span>
        </div>
      </body>
    </html>
  );
}
