import type { Metadata } from "next";
import { SOURCES } from "@/server/sources";
import { Investigation } from "./investigation";

export const metadata: Metadata = { title: "OSINT Open Doors" };

export default function Home() {
  // The consent text lists the services from the same list the engine uses.
  return <Investigation services={SOURCES.map((s) => s.label)} />;
}
