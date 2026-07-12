import Link from "next/link";
import { DROPZONES } from "@/lib/dropzones";
import { fetchDropzoneForecast } from "@/lib/forecast";
import Dashboard, { Freshness, Legend } from "./dashboard";

// Render per request so current observations, remaining hours and freshness
// reflect the wall clock. Individual upstream fetches keep short source caches.
export const dynamic = "force-dynamic";

export default async function Home() {
  const forecasts = await Promise.all(DROPZONES.map(fetchDropzoneForecast));
  const now = new Date();
  const generatedAt = now.toISOString();
  const todayISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
  }).format(now);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
          <span aria-hidden="true">🪂</span>
          <span>Let&apos;s jump</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Live conditions + forecast for both dropzones
        </p>
        <Freshness generatedAt={generatedAt} />
        <Link
          href="/how-it-works"
          className="mt-2 inline-block text-xs font-medium text-zinc-500 underline decoration-dotted underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          How GO / CONSIDER / NO-GO works →
        </Link>
      </header>

      <Dashboard forecasts={forecasts} todayISO={todayISO} />
      <Legend />
    </main>
  );
}
