import type { Metadata } from "next";
import { Investigation } from "./investigation";

export const metadata: Metadata = { title: "OSINT Open Doors" };

export default function Home() {
  return <Investigation />;
}
