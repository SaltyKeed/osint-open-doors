import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
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

// Titles: Bricolage Grotesque, a variable grotesque; the optical size axis
// refines large titles.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSINT Open Doors",
  description: "Outil de sensibilisation : découvre ce qu'on peut trouver sur toi en ligne.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
