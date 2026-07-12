import { DROPZONES } from "@/lib/dropzones";
import { fetchDropzoneForecast } from "@/lib/forecast";
import Dashboard, { Freshness, Legend } from "./dashboard";

// Render per request so current observations, remaining hours and freshness
// reflect the wall clock. Individual upstream fetches keep short source caches.
export const dynamic = "force-dynamic";

export default async function Home() {
  const forecasts = await Promise.all(DROPZONES.map(fetchDropzoneForecast));
  const generatedAt = new Date().toISOString();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Let&apos;s jump
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Live conditions + forecast for both dropzones
        </p>
        <Freshness generatedAt={generatedAt} />
      </header>

      <Dashboard forecasts={forecasts} />
      <Legend />
    </main>
  );
}
