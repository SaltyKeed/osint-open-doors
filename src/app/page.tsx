import { SearchApp } from "@/components/search-app";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
        OSINT Open Doors
      </h1>
      <SearchApp />
    </main>
  );
}
