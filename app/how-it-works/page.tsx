import type { Metadata } from "next";
import Link from "next/link";
import { JUMP_FROM, LATE_MARGIN, LIMITS } from "@/lib/decision";

export const metadata: Metadata = {
  title: "How decisions work — Let's jump",
  description: "Every rule used for the GO, CONSIDER and NO-GO weather verdicts.",
};

const RuleTable = ({
  rows,
}: {
  rows: { factor: string; go: string; consider: string; nogo: string }[];
}) => (
  <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
    <table className="w-full min-w-[680px] text-left text-sm">
      <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
        <tr>
          <th className="px-4 py-3 font-semibold">Factor</th>
          <th className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-300">GO</th>
          <th className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-300">CONSIDER</th>
          <th className="px-4 py-3 font-semibold text-rose-700 dark:text-rose-300">NO-GO</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {rows.map((row) => (
          <tr key={row.factor} className="align-top">
            <th className="px-4 py-3 font-semibold">{row.factor}</th>
            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{row.go}</td>
            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{row.consider}</td>
            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{row.nogo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function HowItWorksPage() {
  const hourlyRules = [
    {
      factor: "Mean wind",
      go: `< ${LIMITS.windConsider} m/s`,
      consider: `Exactly ${LIMITS.windConsider} m/s`,
      nogo: `> ${LIMITS.windNoGoAbove} m/s`,
    },
    {
      factor: "Absolute gust",
      go: `< ${LIMITS.gustConsider} m/s`,
      consider: `Exactly ${LIMITS.gustConsider} m/s`,
      nogo: `> ${LIMITS.gustNoGoAbove} m/s`,
    },
    {
      factor: "Gust spread (gust − wind)",
      go: `< ${LIMITS.gustSpreadConsider} m/s`,
      consider: `${LIMITS.gustSpreadConsider}–${LIMITS.gustSpreadNoGo} m/s`,
      nogo: `> ${LIMITS.gustSpreadNoGo} m/s`,
    },
    {
      factor: "Steady rain",
      go: `≤ ${LIMITS.rainGood} mm/h`,
      consider: `> ${LIMITS.rainGood} to ${LIMITS.rainMax} mm/h`,
      nogo: `> ${LIMITS.rainMax} mm/h`,
    },
    {
      factor: "Rain probability",
      go: `< ${LIMITS.probConsider}%`,
      consider: `≥ ${LIMITS.probConsider}%`,
      nogo: "Never by probability alone",
    },
    {
      factor: "Low cloud cover",
      go: `≤ ${LIMITS.cloudGoodLow}%`,
      consider: `> ${LIMITS.cloudGoodLow} to ${LIMITS.cloudMaxLow}%`,
      nogo: `> ${LIMITS.cloudMaxLow}%`,
    },
    {
      factor: "Mid cloud cover",
      go: `≤ ${LIMITS.cloudGoodMid}%`,
      consider: `> ${LIMITS.cloudGoodMid} to ${LIMITS.cloudMaxMid}%`,
      nogo: `> ${LIMITS.cloudMaxMid}%`,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-10">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 underline decoration-dotted underline-offset-4 hover:text-zinc-900 dark:hover:text-white"
        >
          ← Back to the forecast
        </Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
          How the decision works
        </h1>
        <p className="mt-3 max-w-3xl text-zinc-600 dark:text-zinc-300">
          Every forecast hour is scored on its worst weather factor. The hourly
          scores are then combined into the day&apos;s GO, CONSIDER or NO-GO headline.
          This is a driving aid, not an operational decision or a substitute for
          the DZ&apos;s limits and the conditions at the landing area.
        </p>
      </header>

      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-semibold">1. Hour-by-hour thresholds</h2>
          <p className="mb-4 mt-2 text-sm text-zinc-500">
            The worst result in a row wins. A steady 2 m/s wind with a 5.3 m/s
            gust is GO on wind: its spread is only 3.3 m/s. Spread becomes
            CONSIDER at exactly {LIMITS.gustSpreadConsider} m/s and NO-GO only
            above {LIMITS.gustSpreadNoGo} m/s. Independently, exactly
            {LIMITS.gustConsider} m/s wind or gust is CONSIDER and anything above
            it is NO-GO. The formal jump hold is {LIMITS.formalWindHold} m/s, but
            this driving aid turns red sooner.
          </p>
          <RuleTable rows={hourlyRules} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">2. Special weather rules</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard title="Thunder and showers">
              WMO thunder codes 95, 96 and 99 are NO-GO. CAPE ≥ {LIMITS.capeConvective} J/kg
              together with rain probability ≥ {LIMITS.probStorm}% is also
              treated as thunder risk. Ordinary shower codes 80, 81, 85 and 86
              are CONSIDER; violent shower code 82 is NO-GO.
            </InfoCard>
            <InfoCard title="Cloud uncertainty">
              High cloud alone does not stop jumping. Low and mid layers do.
              Total cloud ≥ 80%, WMO overcast code 3, low/mid deck ≤ {LIMITS.cloudGoodLow}%
              and high cloud &lt; 60% is a source conflict, so the hour becomes
              CONSIDER instead of silently turning green.
            </InfoCard>
            <InfoCard title="Missing data">
              An hour with an incomplete required forecast field is at least
              CONSIDER. Missing or stale live observations are stated explicitly
              and cannot support a green live panel.
            </InfoCard>
            <InfoCard title="Observed ceiling">
              The aviation ceiling is the lowest BKN, OVC or vertical-visibility
              METAR layer. At or below {LIMITS.ceilingNoGoFt.toLocaleString("en-US")} ft
              it is NO-GO; above that through {LIMITS.ceilingConsiderFt.toLocaleString("en-US")} ft
              it is CONSIDER. A station more than {LIMITS.remoteStationKm} km away
              can only downgrade this ceiling signal to CONSIDER.
            </InfoCard>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. From hours to the day headline</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-600 marker:text-zinc-400 dark:text-zinc-300">
            <li>Only forecast hours from {String(JUMP_FROM).padStart(2, "0")}:00 to that DZ&apos;s closing time are used.</li>
            <li>Two consecutive GO hours produce a GO candidate.</li>
            <li>One GO hour, or three consecutive hours that are not NO-GO, produces CONSIDER.</li>
            <li>Otherwise the day is NO-GO.</li>
            <li>No usable forecast hours for the operating window is also NO-GO.</li>
            <li>Any thunder risk or rain probability ≥ {LIMITS.probUnsettled}% downgrades a GO day to CONSIDER.</li>
            <li>Any forecast wind or gust ≥ {LIMITS.windConsider} m/s also prevents a GO day headline because it is close to the {LIMITS.formalWindHold} m/s formal hold.</li>
            <li>A clear window starting within the final {LATE_MARGIN} hours before closing is shown as CONSIDER because it may be too late for reliable operations.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Live observations</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Current METAR data comes from ESOW for Aros and ESCM as regional
            context for Gryttjom. Gryttjom&apos;s own page also supplies its maximum
            gust over the last 30 minutes. Live values are shown and applied only
            on today&apos;s tab; they never leak into tomorrow&apos;s forecast. A bad live
            observation can downgrade today&apos;s headline to CONSIDER, but it does
            not erase a useful forecast window later in the day.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Gust spread is calculated only when mean wind and gust come from the
            same station. The onsite Gryttjom gust is never subtracted from ESCM&apos;s
            mean wind 44 km away.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Cloud base: what is known</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            The live box displays the lowest cloud layer reported in the METAR,
            in feet above ground. Click the value to convert it to metres. This
            may be a FEW or SCT layer; the stricter ceiling rule above applies
            only to BKN, OVC or vertical visibility.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            The hourly forecast currently uses Open-Meteo&apos;s general best-match
            low, mid and high cloud-cover percentages. That feed does not provide
            a general cloud-base altitude, so the app does not invent one for
            future hours. DMI has a model-specific cloud-base field, but it is a
            separate limited-range model source and is not mixed into this
            decision yet.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Temperature sources</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Temperature is informational and never changes a verdict. Future
            hourly values are Open-Meteo&apos;s 2 m forecast. For the current hour,
            the app prefers a server-readable onsite observation, then falls back
            to the METAR temperature. Gryttjom exposes its onsite temperature on
            its Weather page, so that value replaces the current forecast hour.
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            FK Aros Skyview renders its live surface temperature only after a
            browser establishes a Blazor session; the normal server response is
            a placeholder. Until Aros provides a stable server-readable endpoint,
            the app uses ESOW METAR for the current Aros hour and does not confuse
            Skyview&apos;s FL020/FL050/FL100 temperatures with surface temperature.
            Hover an hourly temperature to see its source.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="font-semibold">Data sources</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
            <a className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-white" href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo forecast ↗</a>
            <a className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-white" href="https://aviationweather.gov/data/api/" target="_blank" rel="noreferrer">AviationWeather METAR API ↗</a>
            <a className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-white" href="https://insidan.skydive.se/Weather" target="_blank" rel="noreferrer">Gryttjom onsite wind ↗</a>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300">{children}</p>
    </article>
  );
}
