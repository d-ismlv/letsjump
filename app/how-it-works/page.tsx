import type { Metadata } from "next";
import Link from "next/link";
import { JUMP_FROM, LATE_MARGIN, LIMITS } from "@/lib/decision";

export const metadata: Metadata = {
  title: "How decisions work — Let's jump",
  description: "The GO, CONSIDER and NO-GO rules at a glance.",
};

const status = {
  go: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  consider: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
  nogo: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
};

export default function HowItWorksPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 underline decoration-dotted underline-offset-4 hover:text-zinc-900 dark:hover:text-white"
        >
          ← Forecast
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          How the dots become a verdict
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Worst factor wins. Decision aid only—DZ rules and onsite conditions win.
        </p>
      </header>

      <div className="space-y-8">
        <section aria-label="Decision flow" className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center text-xs sm:text-sm">
          <FlowBox icon="🌦️" label="Forecast + live" />
          <span className="text-zinc-400">→</span>
          <FlowBox icon="⚠️" label="Worst factor" />
          <span className="text-zinc-400">→</span>
          <FlowBox icon="🟢" label="Hour → windows → day" />
        </section>

        <section>
          <SectionTitle icon="🪂">Wind—the hard boundary</SectionTitle>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr><th className="px-4 py-3 text-left">Signal</th><th className="px-4 py-3 text-center text-emerald-700">GO</th><th className="px-4 py-3 text-center text-amber-700">CONSIDER</th><th className="px-4 py-3 text-center text-rose-700">NO-GO</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-center dark:divide-zinc-800">
                <RuleRow label="Mean wind" go={`< ${LIMITS.windConsider}`} consider={`= ${LIMITS.windConsider}`} nogo={`> ${LIMITS.windNoGoAbove} m/s`} />
                <RuleRow label="Max gust" go={`< ${LIMITS.gustConsider}`} consider={`= ${LIMITS.gustConsider}`} nogo={`> ${LIMITS.gustNoGoAbove} m/s`} />
                <RuleRow label="Gust − wind" go={`< ${LIMITS.gustSpreadConsider}`} consider={`${LIMITS.gustSpreadConsider}–${LIMITS.gustSpreadNoGo}`} nogo={`> ${LIMITS.gustSpreadNoGo} m/s`} />
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Formal hold: {LIMITS.formalWindHold} m/s. The app turns red above 10.
          </p>
        </section>

        <section>
          <SectionTitle icon="🕒">Every usable window is shown</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TimelineCard title="Weather clears again" result="09–13 · 16–20">
              <Segment tone="go">09–13</Segment>
              <Segment tone="nogo">14–15<br />wind</Segment>
              <Segment tone="go">16–20</Segment>
            </TimelineCard>
            <TimelineCard title="No late recovery" result="09–16 · stop ~17">
              <Segment tone="go">09–16</Segment>
              <Segment tone="consider">17</Segment>
              <Segment tone="nogo">18–20<br />wind</Segment>
            </TimelineCard>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Wind starts by closing − {LATE_MARGIN} h and stays bad → CONSIDER, likely early stop.
          </p>
        </section>

        <section>
          <SectionTitle icon="🌧️">Other hourly limits</SectionTitle>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Limit label="Steady rain" value={`≤${LIMITS.rainGood} GO · ≤${LIMITS.rainMax} CONSIDER · >${LIMITS.rainMax} NO-GO mm/h`} />
            <Limit label="Rain chance" value={`≥${LIMITS.probConsider}% CONSIDER · never NO-GO alone`} />
            <Limit label="Low cloud" value={`≤${LIMITS.cloudGoodLow}% GO · >${LIMITS.cloudMaxLow}% NO-GO`} />
            <Limit label="Mid cloud" value={`≤${LIMITS.cloudGoodMid}% GO · >${LIMITS.cloudMaxMid}% NO-GO`} />
            <Limit label="Thunder" value={`WMO 95/96/99, or CAPE ≥${LIMITS.capeConvective} + rain ≥${LIMITS.probStorm}% → NO-GO`} />
            <Limit label="Data conflict / missing" value="CONSIDER—never silently green" />
          </div>
        </section>

        <section>
          <SectionTitle icon="🏁">Day headline</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <VerdictCard tone="go" title="GO">≥2 consecutive green hours</VerdictCard>
            <VerdictCard tone="consider" title="CONSIDER">1 green hour, or ≥3 consecutive non-red hours</VerdictCard>
            <VerdictCard tone="nogo" title="NO-GO">No usable run / no forecast window</VerdictCard>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Tag>≥10 m/s anywhere</Tag><Tag>rain chance ≥{LIMITS.probUnsettled}%</Tag><Tag>thunder</Tag><Tag>only clears in final {LATE_MARGIN} h</Tag><Tag>terminal wind</Tag>
            <span className="self-center text-zinc-400">→ downgrade GO to CONSIDER</span>
          </div>
        </section>

        <section>
          <SectionTitle icon="📡">Live + display-only data</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <DataCard title="Live applies">Today only. Never tomorrow.</DataCard>
            <DataCard title="Cloud base">Lowest METAR layer; click ft ↔ m. Ceiling uses BKN/OVC/VV.</DataCard>
            <DataCard title="Temperature">No verdict effect. Forecast: Open-Meteo. Current: onsite, else METAR.</DataCard>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Gryttjom temperature is onsite. Aros uses ESOW METAR until Skyview exposes a server-readable surface endpoint.
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

function FlowBox({ icon, label }: { icon: string; label: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-white px-2 py-3 dark:border-zinc-800 dark:bg-zinc-950"><span className="block text-lg">{icon}</span>{label}</div>;
}

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return <h2 className="flex items-center gap-2 text-lg font-semibold"><span>{icon}</span>{children}</h2>;
}

function RuleRow({ label, go, consider, nogo }: { label: string; go: string; consider: string; nogo: string }) {
  return <tr><th className="px-4 py-3 text-left font-semibold">{label}</th><td className="px-4 py-3">{go}</td><td className="px-4 py-3">{consider}</td><td className="px-4 py-3">{nogo}</td></tr>;
}

function TimelineCard({ title, result, children }: { title: string; result: string; children: React.ReactNode }) {
  return <article className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"><h3 className="text-sm font-semibold">{title}</h3><div className="mt-3 flex overflow-hidden rounded-lg text-center text-xs font-semibold">{children}</div><div className="mt-3 text-center text-sm font-bold tabular-nums">↑ {result}</div></article>;
}

function Segment({ tone, children }: { tone: keyof typeof status; children: React.ReactNode }) {
  return <span className={`flex min-h-12 flex-1 items-center justify-center border px-2 ${status[tone]}`}>{children}</span>;
}

function Limit({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"><strong>{label}</strong><span className="text-right text-zinc-500 dark:text-zinc-400">{value}</span></div>;
}

function VerdictCard({ tone, title, children }: { tone: keyof typeof status; title: string; children: React.ReactNode }) {
  return <article className={`rounded-xl border p-4 ${status[tone]}`}><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm">{children}</p></article>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900 dark:bg-amber-400/10 dark:text-amber-300">{children}</span>;
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{children}</p></article>;
}
