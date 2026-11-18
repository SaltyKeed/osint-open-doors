import type { Metadata } from "next";
import { Atkinson_Hyperlegible, JetBrains_Mono } from "next/font/google";
import { HudBar } from "@/components/hud-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// next/font downloads the fonts at build time and serves them locally:
// the visitor's browser never contacts Google.

// Body: Atkinson Hyperlegible, designed for readability (kiosk, all ages).
// Only 400 and 700 exist: use font-normal or font-bold, never font-medium.
const body = Atkinson_Hyperlegible({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Titles, labels and figures: JetBrains Mono, the monospace font of the OSIRIS
// dashboard (D28). Figures keep the same width, so counters do not shake.
const hud = JetBrains_Mono({
  variable: "--font-hud",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "OSINT Open Doors",
  description: "Outil de sensibilisation : découvre ce qu'on peut trouver sur toi en ligne.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${body.variable} ${hud.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <HudBar />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
