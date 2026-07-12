import type {
  Dropzone,
  DayForecast,
  DropzoneForecast,
  ForecastHour,
} from "./types";
import { JUMP_FROM, rateDay, rateHour } from "./decision";
import { fetchLiveConditions } from "./live-weather";

const HOURLY = [
  "temperature_2m",
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
  const livePromise = fetchLiveConditions(dz);
  const params = new URLSearchParams({
    latitude: String(dz.lat),
    longitude: String(dz.lon),
    hourly: HOURLY.join(","),
    // best_match uses MET Nordic where a field is available and falls back to
    // other models for fields such as layered cloud and CAPE.
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
    return {
      dz,
      days: [],
      live: await livePromise,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Last operating hour for this DZ on a given local date (weekends differ).
  const closeFor = (date: string) => {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    const weekend = day === 0 || day === 6;
    return weekend ? dz.closeWeekend : dz.closeWeekday;
  };

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
  }).format(now);
  const currentHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Stockholm",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  const live = await livePromise;

  const h = data.hourly;
  // Group jumping-window hours by local date.
  const byDate = new Map<string, ForecastHour[]>();
  for (let i = 0; i < h.time.length; i++) {
    const iso = h.time[i]; // "2026-07-06T09:00" (already Europe/Stockholm)
    const date = iso.slice(0, 10);
    const hour = Number(iso.slice(11, 13));
    if (
      hour < JUMP_FROM ||
      hour > closeFor(date) ||
      (date === todayISO && hour < currentHour)
    ) continue;

    const values = [
      h.wind_speed_10m[i],
      h.wind_gusts_10m[i],
      h.precipitation[i],
      h.precipitation_probability?.[i],
      h.weather_code?.[i],
      h.cape?.[i],
      h.cloud_cover_low[i],
      h.cloud_cover_mid[i],
      h.cloud_cover_high[i],
      h.cloud_cover[i],
    ];
    const dataComplete = values.every(Number.isFinite);

    const sample = {
      windMs: h.wind_speed_10m[i] ?? 0,
      gustMs: h.wind_gusts_10m[i] ?? 0,
      precipMmH: h.precipitation[i] ?? 0,
      precipProb: h.precipitation_probability?.[i] ?? 0,
      weatherCode: h.weather_code?.[i] ?? 0,
      cape: h.cape?.[i] ?? 0,
      cloudLow: h.cloud_cover_low[i] ?? 0,
      cloudMid: h.cloud_cover_mid[i] ?? 0,
      cloudHigh: h.cloud_cover_high[i] ?? 0,
      cloudTotal: h.cloud_cover[i] ?? 0,
      dataComplete,
    };
    const { status, limiter, thunder, cloudUncertain } = rateHour(sample);
    const liveTemperature =
      date === todayISO && hour === currentHour ? live.temperatureC : null;

    const row: ForecastHour = {
      time: iso,
      hour,
      temperatureC: liveTemperature ??
        (Number.isFinite(h.temperature_2m[i]) ? h.temperature_2m[i] : null),
      temperatureSource: liveTemperature != null
        ? (live.temperatureSource ?? "metar")
        : "forecast",
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
      cloudHigh: sample.cloudHigh,
      cloudTotal: sample.cloudTotal,
      cloudUncertain,
      dataComplete,
      status,
      limiter,
    };
    const list = byDate.get(date) ?? [];
    list.push(row);
    byDate.set(date, list);
  }

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

  return { dz, days, live, error: null };
}
