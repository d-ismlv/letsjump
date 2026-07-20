"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DropzoneForecast,
  ForecastHour,
  HourStatus,
  LiveConditions,
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

const ENDED_STYLE = {
  badge: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  ring: "ring-zinc-500/10",
};

const STATUS_DOT: Record<HourStatus, string> = {
  go: "bg-emerald-500",
  consider: "bg-amber-400",
  nogo: "bg-rose-500",
};

// Short reason per limiting factor, shown on hover of the status dot.
const LIMITER_TEXT: Record<NonNullable<ForecastHour["limiter"]>, string> = {
  wind: "wind over limit",
  gust: "gusts",
  rain: "rain",
  thunder: "thunderstorm",
  cloud: "solid cloud deck",
  data: "incomplete weather data",
};

function dotTitle(h: ForecastHour): string {
  const verdict = { go: "GO", consider: "CONSIDER", nogo: "NO-GO" }[h.status];
  if (!h.limiter) return `${verdict}: within limits`;
  if (h.limiter === "gust") {
    const spread = Math.max(0, h.gustMs - h.windMs);
    if (spread >= LIMITS.gustSpreadConsider) {
      return `${verdict}: gust spread ${spread.toFixed(1)} m/s ${h.status === "nogo" ? "is too high" : "is unsettled"}`;
    }
    return `${verdict}: ${h.status === "nogo" ? "gusts over limit" : "gusts close to limit"}`;
  }
  return `${verdict}: ${LIMITER_TEXT[h.limiter]}`;
}

const ROW_TINT: Record<HourStatus, string> = {
  go: "",
  consider: "bg-amber-50/60 dark:bg-amber-500/[0.06]",
  nogo: "bg-rose-50/70 dark:bg-rose-500/[0.07]",
};

export default function Dashboard({
  forecasts,
  todayISO,
}: {
  forecasts: DropzoneForecast[];
  todayISO: string;
}) {
  // The first available day is not necessarily today, and the two DZs can stop
  // at different times. Tabs come from one calendar and cards match dateISO,
  // never the position of a day in an individual forecast array.
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const dayOptions =
    forecasts.find((f) => f.days.length)?.days.map((d) => ({
      dateISO: d.dateISO,
      label: d.label,
    })) ?? [];
  const selectedDateISO = dayOptions[selectedDayIndex]?.dateISO ?? null;

  return (
    <>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full bg-zinc-100 p-1 dark:bg-zinc-800/80">
          {dayOptions.map(({ dateISO, label }, i) => (
            <button
              key={dateISO}
              onClick={() => setSelectedDayIndex(i)}
              className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                selectedDayIndex === i
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
          <DzCard
            key={f.dz.id}
            forecast={f}
            selectedDateISO={selectedDateISO}
            todayISO={todayISO}
          />
        ))}
      </div>
    </>
  );
}

function DzCard({
  forecast,
  selectedDateISO,
  todayISO,
}: {
  forecast: DropzoneForecast;
  selectedDateISO: string | null;
  todayISO: string;
}) {
  const { dz, days, error } = forecast;
  const d = days.find((candidate) => candidate.dateISO === selectedDateISO) ?? null;
  // Live observations describe the wall clock, not the first forecast tab.
  // Comparing dates prevents tomorrow from inheriting current observations.
  const showLive = d?.dateISO === todayISO;
  const dayEnded = Boolean(
    showLive && d && d.hours.length > 0 && d.hours.every((hour) => hour.isPast),
  );
  const verdict = d ? effectiveVerdict(d.verdict, showLive ? forecast.live : null) : "NO-GO";
  const style = dayEnded ? ENDED_STYLE : VERDICT[verdict];

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ${style.ring} dark:border-zinc-800 dark:bg-zinc-950`}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{dz.name}</h2>
          <p className="text-sm text-zinc-500">{dz.place}</p>
          {d && (
            <p className="whitespace-nowrap text-xs text-zinc-400">
              Closes {pad(d.close)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`rounded-lg px-3 py-1.5 text-sm font-bold tracking-wide ${style.badge}`}
          >
            {dayEnded ? "DAY ENDED" : d ? verdict : "NO DATA"}
          </span>
          {/* Height is reserved so ended/NO-GO/error never shifts the table. */}
          <div className="flex h-5 items-center">
            {!dayEnded && error ? (
              <span className="text-xs text-rose-600" title={error}>
                forecast unavailable
              </span>
            ) : !dayEnded && d && d.windows.length > 0 ? (
              <span
                className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  d.likelyEarlyStopFrom == null && d.windows[0].quality === "clear"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"
                }`}
                title={d.summary}
              >
                {chanceLabel(d.windows, d.close, d.likelyEarlyStopFrom)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {showLive && !dayEnded && (
        <LiveConditionsPanel live={forecast.live} />
      )}

      {d && d.hours.length > 0 && <HourTable hours={d.hours} />}

      <div className="mt-auto border-t border-zinc-100 px-5 py-3 dark:border-zinc-800/70">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a
            href={dz.skyviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
          >
            Open Skyview →
          </a>
          {dz.weatherUrl !== dz.skyviewUrl && (
            <a
              href={dz.weatherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
            >
              Live DZ wind →
            </a>
          )}
          <a
            href="https://www.smhi.se/vader/radar-och-satellit/radar-med-blixt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
          >
            Radar + lightning →
          </a>
        </div>
      </div>
    </section>
  );
}

function effectiveVerdict(
  forecast: Verdict,
  live: LiveConditions | null,
): Verdict {
  if (!live || live.status === "go" || forecast === "NO-GO") return forecast;
  // A bad current observation must prevent a green headline, but it should not
  // erase a genuinely useful later window by claiming the entire day is NO-GO.
  return "CONSIDER";
}

function LiveConditionsPanel({
  live,
}: {
  live: LiveConditions;
}) {
  const [showCloudBaseMetres, setShowCloudBaseMetres] = useState(false);
  const observed = live.observedAt
    ? new Date(live.observedAt).toLocaleTimeString("en-GB", {
        timeZone: "Europe/Stockholm",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const retrievalLabel =
    live.dataState === "fresh"
      ? observed
        ? `Observed ${observed}`
        : "Observed"
      : live.dataState === "partial"
        ? "Partial data"
        : live.dataState === "stale"
          ? observed
            ? `Stale · ${observed}`
            : "Stale data"
          : "Data unavailable";
  const sourceLabel =
    live.dataState === "partial"
      ? live.onsiteGustMs != null && live.temperatureSource === "onsite"
        ? "Onsite temperature + gust"
        : live.onsiteGustMs != null
          ? "Onsite gust only"
          : "Onsite temperature only"
      : live.dataState === "unavailable"
        ? `${live.station} unavailable`
        : live.onsiteGustMs != null
          ? `DZ gust + ${live.station} · ${live.stationDistanceKm} km`
          : `${live.station} · ${live.stationDistanceKm} km away`;
  const cloudBaseLabel = live.cloudBaseFt == null
    ? null
    : showCloudBaseMetres
      ? `${Math.round((live.cloudBaseFt * 0.3048) / 10) * 10} m`
      : `${live.cloudBaseFt.toLocaleString("en-US")} ft`;

  return (
    <div className="mx-3 mb-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60 lg:h-[72px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
        <span className="truncate text-xs text-zinc-500" title={sourceLabel}>
          {sourceLabel}
        </span>
        <span className="whitespace-nowrap text-[11px] text-zinc-400">
          {retrievalLabel}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
        {live.windMs != null && (
          <span className="whitespace-nowrap"><span className="text-zinc-400">Mean wind</span> {live.windMs.toFixed(1)} m/s</span>
        )}
        {live.gustMs != null && (
          <span className="whitespace-nowrap"><span className="text-zinc-400">Max gust</span> {live.gustMs.toFixed(1)} m/s</span>
        )}
        {cloudBaseLabel && (
          <span className="whitespace-nowrap">
            <span className="text-zinc-400">Cloud base</span>{" "}
            <button
              type="button"
              onClick={() => setShowCloudBaseMetres((value) => !value)}
              aria-label={`Cloud base ${cloudBaseLabel}. Show ${showCloudBaseMetres ? "feet" : "metres"}`}
              title={`Lowest reported METAR cloud layer. Click to show ${showCloudBaseMetres ? "feet" : "metres"}`}
              className="rounded-sm font-medium underline decoration-dotted underline-offset-2 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:hover:text-zinc-200"
            >
              {cloudBaseLabel}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function HourTable({ hours }: { hours: ForecastHour[] }) {
  return (
    <div className="overflow-x-auto px-2 pb-2">
      <table className="w-full min-w-[270px] table-fixed text-sm max-[375px]:text-[13px] min-[376px]:min-w-[325px]">
        {/* Fixed widths so columns sit in the exact same place on every day/DZ.
            Totals are 270px on narrow phones and 325px on wider screens. */}
        <colgroup>
          <col className="w-[42px] min-[376px]:w-[50px]" />
          <col className="w-[38px] min-[376px]:w-[46px]" />
          <col className="w-[42px] min-[376px]:w-[50px]" />
          <col className="w-[50px] min-[376px]:w-[58px]" />
          <col className="w-[37px] min-[376px]:w-[45px]" />
          <col className="w-[39px] min-[376px]:w-[47px]" />
          <col className="w-[22px] min-[376px]:w-[29px]" />
        </colgroup>
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-zinc-400 max-[375px]:text-[10px]">
            <th className="py-2 pl-1 text-left font-medium">Time</th>
            <th className="py-2 text-center font-medium">Sky</th>
            <th className="py-2 text-center font-medium">Temp</th>
            <th className="py-2 text-center font-medium">Wind</th>
            <th className="py-2 text-center font-medium">Gust</th>
            <th className="py-2 text-center font-medium">Rain</th>
            <th className="py-2 text-center font-medium">Go</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => {
            // Jump-relevant cloud = the low/mid deck the plane must climb through.
            // Use it for both icon and %, so they match the verdict dot (total
            // cloud can disagree wildly with the low/mid layers in the data).
            const deck = h.cloudUncertain
              ? h.cloudTotal
              : Math.max(h.cloudLow, h.cloudMid);
            const Sky = h.thunder ? BoltIcon : skyIconFor(deck, h.precipMmH);
            return (
              <tr
                key={h.time}
                data-past={h.isPast ? "true" : undefined}
                title={h.isPast
                  ? "Past hour"
                  : h.isCurrent
                    ? "Current hour; live observations are preferred where available"
                    : undefined}
                className={`border-t border-zinc-100 transition-opacity dark:border-zinc-800/60 ${h.isPast ? "opacity-40 grayscale" : ROW_TINT[h.status]}`}
              >
                <td className="py-2 pl-1 text-left font-medium tabular-nums">
                  {pad(h.hour)}
                </td>
                <td className="py-2">
                  {/* Fixed-width row so every icon lands on the same vertical line. */}
                  <div className="flex items-center justify-center gap-1 max-[375px]:gap-0.5">
                    <Sky className="h-5 w-5 shrink-0 max-[375px]:h-[18px] max-[375px]:w-[18px]" />
                    <span
                      className={`text-xs tabular-nums ${h.cloudUncertain ? "font-medium text-zinc-500 dark:text-zinc-300" : "text-zinc-400"}`}
                      title={h.cloudUncertain ? "Cloud sources disagree; treating as uncertain" : undefined}
                      aria-label={h.cloudUncertain ? `${deck}% cloud; forecast sources disagree` : `${deck}% cloud`}
                    >
                      {deck}%
                    </span>
                  </div>
                </td>
                <td
                  className="py-2 text-center tabular-nums text-zinc-500"
                  title={temperatureSourceLabel(h.temperatureSource)}
                >
                  {h.temperatureC == null ? "·" : `${h.temperatureC.toFixed(1)}°`}
                </td>
                <td
                  className="py-2 text-center tabular-nums"
                  title={windSourceLabel(h.windSource)}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <WindArrow
                      bearingDeg={h.bearingDeg}
                      className="h-3.5 w-3.5 text-zinc-400 max-[375px]:h-3 max-[375px]:w-3"
                    />
                    <span className="font-medium">
                      {h.windMs.toFixed(h.windSource === "forecast" ? 0 : 1)}
                    </span>
                    <span className="w-6 text-left text-[11px] text-zinc-400 max-[375px]:w-5 max-[375px]:text-[10px]">
                      {compass(h.bearingDeg)}
                    </span>
                  </span>
                </td>
                <td
                  className="py-2 text-center tabular-nums text-zinc-500"
                  title={windSourceLabel(h.gustSource)}
                >
                  {h.gustMs.toFixed(1)}
                </td>
                <td className="py-2 text-center">
                  <RainCell h={h} />
                </td>
                <td className="py-2 text-center">
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

function temperatureSourceLabel(source: ForecastHour["temperatureSource"]): string {
  if (source === "onsite") return "Current onsite Skyview observation";
  if (source === "metar") return "Current METAR observation";
  return "Open-Meteo 2 m forecast";
}

function windSourceLabel(source: ForecastHour["windSource"]): string {
  if (source === "onsite") return "Current onsite DZ observation";
  if (source === "metar") return "Current METAR observation";
  return "Open-Meteo forecast";
}

// Rain cell leads with the signal that actually caught the storms: probability
// and thunder risk, not just the (often ~0) point rainfall amount.
function RainCell({ h }: { h: ForecastHour }) {
  if (h.thunder) {
    return (
      <span className="inline-flex items-center justify-center gap-0.5 font-medium text-amber-600 dark:text-amber-400">
        <BoltIcon className="h-3.5 w-3.5" />
        {h.precipProb}%
      </span>
    );
  }
  if (h.precipMmH >= 0.1) {
    return (
      <span className="inline-flex items-center justify-center gap-0.5 text-sky-600 dark:text-sky-400">
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

// Compact every usable run into the card chip without wrapping.
function chanceLabel(
  windows: { from: number; to: number; quality: "clear" | "marginal" }[],
  close: number,
  likelyEarlyStopFrom: number | null,
): string {
  const allDay =
    windows.length === 1 &&
    windows[0].from <= JUMP_FROM &&
    windows[0].to >= close;
  if (allDay) return "All day";
  const ranges = windows.map((w) => `${w.from}–${w.to}`).join(" · ");
  return likelyEarlyStopFrom == null
    ? ranges
    : `${ranges} · stop ~${likelyEarlyStopFrom}`;
}

// Shows how fresh the forecast is and auto-refreshes past a staleness threshold
// (and immediately if the local day has rolled over since it was generated).
const REFRESH_MS = 15 * 60 * 1000;
const localDay = (t: number) =>
  new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
const localHour = (t: number) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(t);

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
    if (
      now - gen >= REFRESH_MS ||
      localDay(now) !== localDay(gen) ||
      localHour(now) !== localHour(gen)
    ) {
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
      Weather checked {label}
    </div>
  );
}

export function Legend() {
  return (
    <p className="mt-6 text-center text-xs leading-relaxed text-zinc-400">
      Live observations adjust today&apos;s outlook; rows cover {pad(JUMP_FROM)}–close.
      Missing or conflicting cloud data can&apos;t score GO. NO-GO: wind &gt; {LIMITS.windNoGoAbove} m/s,
      gust spread &gt; {LIMITS.gustSpreadNoGo} m/s, rain &gt; {LIMITS.rainMax} mm/h,
      thunder, or solid low/mid cloud. Showers alone mean CONSIDER.
    </p>
  );
}
