import { DROPZONES } from "@/lib/dropzones";
import { fetchDropzoneForecast } from "@/lib/forecast";
import Dashboard, { Freshness, Legend } from "./dashboard";

// Render per request so the day labels and freshness reflect the current time;
// the Open-Meteo fetch itself is cached 15 min (see lib/forecast.ts).
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
          Forecast-based GO / CONSIDER / NO-GO for both dropzones
        </p>
        <Freshness generatedAt={generatedAt} />
      </header>

      <Dashboard forecasts={forecasts} />
      <Legend />
    </main>
  );
}
