import type {
  Dropzone,
  DayForecast,
  DropzoneForecast,
  ForecastHour,
} from "./types";
import { JUMP_FROM, rateDay, rateHour } from "./decision";

const HOURLY = [
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "cape",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
] as const;

type Hourly = Record<(typeof HOURLY)[number], number[]> & { time: string[] };

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function fetchDropzoneForecast(
  dz: Dropzone,
): Promise<DropzoneForecast> {
  const params = new URLSearchParams({
    latitude: String(dz.lat),
    longitude: String(dz.lon),
    hourly: HOURLY.join(","),
    // best_match blends in MET Nordic (1 km) over Scandinavia — highest
    // resolution available for these fields.
    models: "best_match",
    wind_speed_unit: "ms",
    timezone: "Europe/Stockholm",
    // 3 days gives a buffer so the today/tomorrow window survives a midnight
    // rollover even while the upstream fetch is still cached from before 00:00.
    forecast_days: "3",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;

  let data: { hourly: Hourly };
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "letsjump/2.0" },
      // Forecast changes slowly; refresh every 15 min.
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    return { dz, days: [], error: err instanceof Error ? err.message : String(err) };
  }

  // Last operating hour for this DZ on a given local date (weekends differ).
  const closeFor = (date: string) => {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    const weekend = day === 0 || day === 6;
    return weekend ? dz.closeWeekend : dz.closeWeekday;
  };

  const h = data.hourly;
  // Group jumping-window hours by local date.
  const byDate = new Map<string, ForecastHour[]>();
  for (let i = 0; i < h.time.length; i++) {
    const iso = h.time[i]; // "2026-07-06T09:00" (already Europe/Stockholm)
    const date = iso.slice(0, 10);
    const hour = Number(iso.slice(11, 13));
    if (hour < JUMP_FROM || hour > closeFor(date)) continue;

    const sample = {
      windMs: h.wind_speed_10m[i] ?? 0,
      gustMs: h.wind_gusts_10m[i] ?? 0,
      precipMmH: h.precipitation[i] ?? 0,
      precipProb: h.precipitation_probability?.[i] ?? 0,
      weatherCode: h.weather_code?.[i] ?? 0,
      cape: h.cape?.[i] ?? 0,
      cloudLow: h.cloud_cover_low[i] ?? 0,
      cloudMid: h.cloud_cover_mid[i] ?? 0,
    };
    const { status, limiter, thunder } = rateHour(sample);

    const row: ForecastHour = {
      time: iso,
      hour,
      windMs: sample.windMs,
      gustMs: sample.gustMs,
      bearingDeg: h.wind_direction_10m[i] ?? 0,
      precipMmH: sample.precipMmH,
      precipProb: sample.precipProb,
      weatherCode: sample.weatherCode,
      cape: sample.cape,
      thunder,
      cloudLow: sample.cloudLow,
      cloudMid: sample.cloudMid,
      cloudHigh: h.cloud_cover_high[i] ?? 0,
      cloudTotal: h.cloud_cover[i] ?? 0,
      status,
      limiter,
    };
    const list = byDate.get(date) ?? [];
    list.push(row);
    byDate.set(date, list);
  }

  // Compute "today" from the wall clock at render time (not fetch time) so the
  // day labels roll over at local midnight regardless of the cached fetch.
  const todayISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
  }).format(new Date());

  const dates = [...byDate.keys()].sort().filter((d) => d >= todayISO);
  const days: DayForecast[] = dates.slice(0, 2).map((date) => {
    const diff = Math.round(
      (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${todayISO}T12:00:00Z`)) /
        86_400_000,
    );
    const label =
      diff === 0
        ? "Today"
        : diff === 1
          ? "Tomorrow"
          : WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()];
    return rateDay(byDate.get(date) ?? [], {
      dateISO: date,
      label,
      close: closeFor(date),
    });
  });

  return { dz, days, error: null };
}
