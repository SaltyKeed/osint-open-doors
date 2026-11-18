"use client";

import { useEffect, useState } from "react";

// Status bar at the top of every screen (D28), inspired by the OSIRIS dashboard.
// It reminds the visitor of the privacy promise. Decorative for screen readers:
// the same promise is written on the search screen.
export function HudBar() {
  // The clock starts after the first render: the server and the browser would
  // otherwise render two different times (hydration error).
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = () => new Date().toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const first = setTimeout(() => setTime(format()), 0);
    const clock = setInterval(() => setTime(format()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(clock);
    };
  }, []);

  return (
    <header
      aria-hidden
      className="sticky top-0 z-40 flex h-10 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 font-mono text-xs tracking-[0.18em] uppercase backdrop-blur sm:px-6"
    >
      <span className="flex items-center gap-3">
        <span className="font-bold text-primary">OSINT Open Doors</span>
        <span className="hidden text-muted-foreground sm:inline">CPNE · Portes ouvertes</span>
      </span>
      <span className="flex items-center gap-4">
        <span className="flex items-center gap-2 text-verified">
          <span className="size-2 animate-pulse rounded-full bg-verified" />
          <span className="hidden sm:inline">Aucune donnée conservée</span>
          <span className="sm:hidden">Rien conservé</span>
        </span>
        <span className="text-gold tabular-nums">{time ?? "--:--:--"}</span>
      </span>
    </header>
  );
}
