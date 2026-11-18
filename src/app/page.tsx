import { SearchApp } from "@/components/search-app";
import { SOURCES } from "@/server/sources";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-12">
      {/* The consent text lists the services from the same list the engine uses. */}
      <SearchApp services={SOURCES.map((s) => s.label)} />
    </main>
  );
}
