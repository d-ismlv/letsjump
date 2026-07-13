import type { Metadata } from "next";
import Link from "next/link";
import { LATE_MARGIN, LIMITS } from "@/lib/decision";

export const metadata: Metadata = {
  title: "How decisions work — Let's jump",
  description: "The GO, CONSIDER and NO-GO rules.",
};

const segmentTone = {
  go: "border-emerald-500/50 text-emerald-700 dark:text-emerald-300",
  consider: "border-amber-500/50 text-amber-700 dark:text-amber-300",
  nogo: "border-rose-500/50 text-rose-700 dark:text-rose-300",
};

export default function HowItWorksPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-9">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 underline decoration-dotted underline-offset-4 hover:text-zinc-900 dark:hover:text-white"
        >
          ← Back to the forecast
        </Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
          How the decision works
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Each hour is rated by its worst weather factor. Consecutive usable hours
          become jump windows, and those windows produce the day headline. This is
          a driving aid; DZ rules and onsite conditions always take priority.
        </p>
      </header>

      <div className="space-y-10">
        <section aria-label="Decision flow">
          <div className="flex items-center justify-center gap-3 border-y border-zinc-200 py-4 text-center text-sm dark:border-zinc-800">
            <span>Forecast + live data</span>
            <span className="text-zinc-400">→</span>
            <span>Worst hourly factor</span>
            <span className="text-zinc-400">→</span>
            <span>Windows + day verdict</span>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">1. Wind limits</h2>
          <p className="mb-4 mt-2 text-sm text-zinc-500">
            Wind speed and gust spread are separate checks. For example, 4 m/s
            wind with a 10 m/s gust has an acceptable spread, but the absolute
            gust still makes the hour CONSIDER.
          </p>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left">Signal</th>
                  <th className="px-4 py-3 text-center">GO</th>
                  <th className="px-4 py-3 text-center">CONSIDER</th>
                  <th className="px-4 py-3 text-center">NO-GO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-center dark:divide-zinc-800">
                <RuleRow label="Mean wind" go={`< ${LIMITS.windConsider}`} consider={`= ${LIMITS.windConsider}`} nogo={`> ${LIMITS.windNoGoAbove} m/s`} />
                <RuleRow label="Max gust" go={`< ${LIMITS.gustConsider}`} consider={`= ${LIMITS.gustConsider}`} nogo={`> ${LIMITS.gustNoGoAbove} m/s`} />
                <RuleRow label="Gust − wind" go={`< ${LIMITS.gustSpreadConsider}`} consider={`${LIMITS.gustSpreadConsider}–${LIMITS.gustSpreadNoGo}`} nogo={`> ${LIMITS.gustSpreadNoGo} m/s`} />
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            The formal hold is {LIMITS.formalWindHold} m/s; this app turns red above 10.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Jump windows</h2>
          <p className="mt-2 text-sm text-zinc-500">
            The app shows every usable run of at least two hours. A temporary stop
            does not hide a later restart. Wind that remains bad from at least
            three hours before closing is treated as a likely end to operations.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Timeline title="Weather clears again" result="Shown: 09–13 · 16–20">
              <Segment tone="go">09–13</Segment>
              <Segment tone="nogo">14–15<br />wind</Segment>
              <Segment tone="go">16–20</Segment>
            </Timeline>
            <Timeline title="No late recovery" result="Shown: 09–16 · stop ~17">
              <Segment tone="go">09–16</Segment>
              <Segment tone="consider">17</Segment>
              <Segment tone="nogo">18–20<br />wind</Segment>
            </Timeline>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Other hourly limits</h2>
          <p className="mt-2 text-sm text-zinc-500">
            An hour takes the worst result below. Missing or contradictory data
            is never allowed to become green.
          </p>
          <dl className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
            <Limit label="Steady rain">≤{LIMITS.rainGood} GO · ≤{LIMITS.rainMax} CONSIDER · &gt;{LIMITS.rainMax} NO-GO mm/h</Limit>
            <Limit label="Rain probability">≥{LIMITS.probConsider}% is CONSIDER; probability alone is never NO-GO</Limit>
            <Limit label="Low cloud">≤{LIMITS.cloudGoodLow}% GO · &gt;{LIMITS.cloudMaxLow}% NO-GO</Limit>
            <Limit label="Mid cloud">≤{LIMITS.cloudGoodMid}% GO · &gt;{LIMITS.cloudMaxMid}% NO-GO</Limit>
            <Limit label="Thunder">WMO 95/96/99, or CAPE ≥{LIMITS.capeConvective} with rain ≥{LIMITS.probStorm}%: NO-GO</Limit>
            <Limit label="Data quality">Incomplete or conflicting cloud data: CONSIDER</Limit>
          </dl>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Day headline</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Hourly ratings are grouped into consecutive runs. These are the base
            rules before uncertainty and late-operation adjustments.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Verdict dot="bg-emerald-500" title="GO">At least two consecutive GO hours</Verdict>
            <Verdict dot="bg-amber-400" title="CONSIDER">One GO hour, or three consecutive non-NO-GO hours</Verdict>
            <Verdict dot="bg-rose-500" title="NO-GO">No usable run or no forecast window</Verdict>
          </div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            A GO candidate is downgraded to CONSIDER by thunder, rain probability
            ≥{LIMITS.probUnsettled}%, a window that only starts in the final
            {LATE_MARGIN} hours, or terminal wind with no recovery. A short midday
            wind hold can split the windows without downgrading the whole day.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Live and informational data</h2>
          <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Info title="Live observations">
              Preferred for the current hour and today&apos;s headline. They never
              alter tomorrow&apos;s forecast.
            </Info>
            <Info title="Cloud base">
              Lowest METAR layer; click feet to show metres. Ceiling uses BKN/OVC/VV.
            </Info>
            <Info title="Temperature">
              Display only. Future: Open-Meteo. Current: onsite when available, otherwise METAR.
            </Info>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Gryttjom temperature is onsite. Aros uses ESOW METAR until its Skyview
            exposes a server-readable surface value. Gust spread is calculated
            only when mean wind and gust come from the same station.
          </p>
        </section>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-200 pt-5 text-xs text-zinc-500 dark:border-zinc-800">
          <a className="underline underline-offset-4" href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo ↗</a>
          <a className="underline underline-offset-4" href="https://aviationweather.gov/data/api/" target="_blank" rel="noreferrer">METAR API ↗</a>
          <a className="underline underline-offset-4" href="https://insidan.skydive.se/Weather" target="_blank" rel="noreferrer">Gryttjom weather ↗</a>
        </nav>
      </div>
    </main>
  );
}

function RuleRow({ label, go, consider, nogo }: { label: string; go: string; consider: string; nogo: string }) {
  return (
    <tr>
      <th className="px-4 py-3 text-left font-semibold">{label}</th>
      <td className="px-4 py-3">{go}</td>
      <td className="px-4 py-3">{consider}</td>
      <td className="px-4 py-3">{nogo}</td>
    </tr>
  );
}

function Timeline({ title, result, children }: { title: string; result: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 flex text-center text-xs font-medium">{children}</div>
      <p className="mt-3 text-sm font-semibold tabular-nums">{result}</p>
    </article>
  );
}

function Segment({ tone, children }: { tone: keyof typeof segmentTone; children: React.ReactNode }) {
  return (
    <span className={`flex min-h-11 flex-1 items-center justify-center border-t-2 bg-zinc-50 px-2 dark:bg-zinc-900/50 ${segmentTone[tone]}`}>
      {children}
    </span>
  );
}

function Limit({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr]">
      <dt className="font-semibold">{label}</dt>
      <dd className="text-zinc-500 dark:text-zinc-400">{children}</dd>
    </div>
  );
}

function Verdict({ dot, title, children }: { dot: string; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="flex items-center gap-2 font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{title}</h3>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{children}</p>
    </article>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-zinc-500 dark:text-zinc-400">{children}</p>
    </article>
  );
}
