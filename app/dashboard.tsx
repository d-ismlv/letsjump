"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DropzoneForecast,
  ForecastHour,
  HourStatus,
  Verdict,
} from "@/lib/types";
import { JUMP_FROM, LIMITS } from "@/lib/decision";
import { BoltIcon, DropletIcon, WindArrow, skyIconFor } from "./icons";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const compass = (deg: number) => COMPASS[Math.round(deg / 45) % 8];

const VERDICT: Record<
  Verdict,
  { badge: string; ring: string; chip: string; accent: string }
> = {
  GO: {
    badge: "bg-emerald-500 text-white",
    ring: "ring-emerald-500/20",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    accent: "border-emerald-400 dark:border-emerald-500",
  },
  CONSIDER: {
    badge: "bg-amber-400 text-black",
    ring: "ring-amber-400/20",
    chip: "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
    accent: "border-amber-400",
  },
  "NO-GO": {
    badge: "bg-rose-600 text-white",
    ring: "ring-rose-500/20",
    chip: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    accent: "border-rose-400 dark:border-rose-500",
  },
};

const STATUS_DOT: Record<HourStatus, string> = {
  go: "bg-emerald-500",
  consider: "bg-amber-400",
  nogo: "bg-rose-500",
};

// Short reason per limiting factor, shown on hover of the status dot.
const LIMITER_TEXT: Record<NonNullable<ForecastHour["limiter"]>, string> = {
  wind: "wind over limit",
  gust: "gusts over limit",
  rain: "rain",
  thunder: "thunderstorm",
  cloud: "solid cloud deck",
};

function dotTitle(h: ForecastHour): string {
  const verdict = { go: "GO", consider: "CONSIDER", nogo: "NO-GO" }[h.status];
  if (!h.limiter) return `${verdict}: within limits`;
  return `${verdict}: ${LIMITER_TEXT[h.limiter]}`;
}

const ROW_TINT: Record<HourStatus, string> = {
  go: "",
  consider: "bg-amber-50/60 dark:bg-amber-500/[0.06]",
  nogo: "bg-rose-50/70 dark:bg-rose-500/[0.07]",
};

export default function Dashboard({
  forecasts,
}: {
  forecasts: DropzoneForecast[];
}) {
  // Day index shared across both DZs (0 = today, 1 = tomorrow).
  const [day, setDay] = useState(0);
  const dayLabels =
    forecasts.find((f) => f.days.length)?.days.map((d) => d.label) ??
    ["Today", "Tomorrow"];

  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-800/80">
          {dayLabels.map((label, i) => (
            <button
              key={label}
              onClick={() => setDay(i)}
              className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                day === i
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {forecasts.map((f) => (
          <DzCard key={f.dz.id} forecast={f} day={day} />
        ))}
      </div>
    </>
  );
}

function DzCard({
  forecast,
  day,
}: {
  forecast: DropzoneForecast;
  day: number;
}) {
  const { dz, days, error } = forecast;
  const d = days[day] ?? null;
  const style = d ? VERDICT[d.verdict] : VERDICT["NO-GO"];

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ${style.ring} dark:border-zinc-800 dark:bg-zinc-950`}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{dz.name}</h2>
          <p className="text-sm text-zinc-500">{dz.place}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`rounded-lg px-3 py-1.5 text-sm font-bold tracking-wide ${style.badge}`}
          >
            {d?.verdict ?? "NO DATA"}
          </span>
          {/* The best window is always shown green (it's the good stretch);
              height is reserved so NO-GO/error never shifts the table. */}
          <div className="flex h-5 items-center">
            {error ? (
              <span className="text-xs text-rose-600" title={error}>
                forecast unavailable
              </span>
            ) : d?.bestWindow ? (
              <span
                className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                title={d.summary}
              >
                {bestChanceLabel(d.bestWindow, d.close)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {d && d.hours.length > 0 && <HourTable hours={d.hours} />}

      <div className="mt-auto border-t border-zinc-100 px-5 py-3 dark:border-zinc-800/70">
        <a
          href={dz.jumpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          Check {dz.club} jump table →
        </a>
      </div>
    </section>
  );
}

function HourTable({ hours }: { hours: ForecastHour[] }) {
  return (
    <div className="overflow-x-auto px-2 pb-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-zinc-400">
            <th className="py-2 pl-3 text-left font-medium">Time</th>
            <th className="py-2 pl-4 text-left font-medium">Sky</th>
            <th className="py-2 text-right font-medium">Wind</th>
            <th className="py-2 text-right font-medium">Gust</th>
            <th className="py-2 text-right font-medium">Rain</th>
            <th className="py-2 pr-3 text-center font-medium">Go</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => {
            // Jump-relevant cloud = the low/mid deck the plane must climb through.
            // Use it for both icon and %, so they match the verdict dot (total
            // cloud can disagree wildly with the low/mid layers in the data).
            const deck = Math.max(h.cloudLow, h.cloudMid);
            const Sky = h.thunder ? BoltIcon : skyIconFor(deck, h.precipMmH);
            return (
              <tr
                key={h.time}
                className={`border-t border-zinc-100 dark:border-zinc-800/60 ${ROW_TINT[h.status]}`}
              >
                <td className="py-2 pl-3 text-left font-medium tabular-nums">
                  {pad(h.hour)}
                </td>
                <td className="py-2 pl-4">
                  {/* Fixed-width row so every icon lands on the same vertical line. */}
                  <div className="flex w-16 items-center gap-2">
                    <Sky className="h-5 w-5 shrink-0" />
                    <span className="text-xs tabular-nums text-zinc-400">
                      {deck}%
                    </span>
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums">
                  <span className="inline-flex items-center justify-end gap-1">
                    <WindArrow
                      bearingDeg={h.bearingDeg}
                      className="h-3.5 w-3.5 text-zinc-400"
                    />
                    <span className="font-medium">{h.windMs.toFixed(0)}</span>
                    <span className="w-6 text-left text-[11px] text-zinc-400">
                      {compass(h.bearingDeg)}
                    </span>
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums text-zinc-500">
                  {h.gustMs.toFixed(0)}
                </td>
                <td className="py-2 text-right">
                  <RainCell h={h} />
                </td>
                <td className="py-2 pr-3 text-center">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[h.status]}`}
                    title={dotTitle(h)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Rain cell leads with the signal that actually caught the storms: probability
// and thunder risk, not just the (often ~0) point rainfall amount.
function RainCell({ h }: { h: ForecastHour }) {
  if (h.thunder) {
    return (
      <span className="inline-flex items-center justify-end gap-0.5 font-medium text-amber-600 dark:text-amber-400">
        <BoltIcon className="h-3.5 w-3.5" />
        {h.precipProb}%
      </span>
    );
  }
  if (h.precipMmH >= 0.1) {
    return (
      <span className="inline-flex items-center justify-end gap-0.5 text-sky-600 dark:text-sky-400">
        <DropletIcon className="h-3 w-3" />
        {h.precipMmH.toFixed(1)}
        <span className="ml-0.5 text-[11px] text-zinc-400">{h.precipProb}%</span>
      </span>
    );
  }
  if (h.precipProb >= 25) {
    return (
      <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
        {h.precipProb}%
      </span>
    );
  }
  return <span className="text-zinc-300 dark:text-zinc-600">·</span>;
}

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;

// "All day" when the good run covers the whole jumping window, else the range.
function bestChanceLabel(w: { from: number; to: number }, close: number): string {
  if (w.from <= JUMP_FROM && w.to >= close) return "All day";
  return `${pad(w.from)}–${pad(w.to)}`;
}

// Shows how fresh the forecast is and auto-refreshes past a staleness threshold
// (and immediately if the local day has rolled over since it was generated).
const REFRESH_MS = 15 * 60 * 1000;
const localDay = (t: number) =>
  new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

export function Freshness({ generatedAt }: { generatedAt: string }) {
  const router = useRouter();
  const gen = new Date(generatedAt).getTime();
  const [now, setNow] = useState(gen);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (now - gen >= REFRESH_MS || localDay(now) !== localDay(gen)) {
      router.refresh();
    }
  }, [now, gen, router]);

  const ageMin = Math.max(0, Math.floor((now - gen) / 60_000));
  const stale = now - gen >= REFRESH_MS;
  const label = ageMin < 1 ? "just now" : `${ageMin} min ago`;

  return (
    <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          stale ? "bg-amber-400" : "bg-emerald-500"
        }`}
      />
      Forecast updated {label}
    </div>
  );
}

export function Legend() {
  return (
    <p className="mt-6 text-center text-xs leading-relaxed text-zinc-400">
      From {pad(JUMP_FROM)}{" "}to each DZ&apos;s close (Aros 20:00; Gryttjom 20:00,
      18:00 weekends) · forecast only (check the jump table + radar for actual
      ops). NO-GO needs wind &gt; {LIMITS.windMax} m/s,
      gust &gt; {LIMITS.gustMax} m/s, steady rain &gt; {LIMITS.rainMax} mm/h,
      thunder (⚡), or solid low/mid cloud. A shower chance only dials it down to
      CONSIDER — scattered cells leave holes to jump.
    </p>
  );
}
