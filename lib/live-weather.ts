import {
  gustSpeedStatus,
  gustSpreadStatus,
  LIMITS,
  windSpeedStatus,
} from "./decision";
import type { Dropzone, HourStatus, LiveConditions } from "./types";

type MetarCloud = { cover?: string; base?: number };
type Metar = {
  reportTime?: string;
  temp?: number;
  wdir?: number;
  wspd?: number;
  wgst?: number;
  cover?: string;
  clouds?: MetarCloud[];
};

type OnsiteWeather = {
  gustMs: number | null;
  temperatureC: number | null;
};

const rank: Record<HourStatus, number> = { go: 0, consider: 1, nogo: 2 };
const worst = (a: HourStatus, b: HourStatus) => (rank[a] >= rank[b] ? a : b);
const knotsToMs = (knots: number) => knots * 0.514444;

export async function fetchLiveConditions(dz: Dropzone): Promise<LiveConditions> {
  const [metar, onsiteWeather] = await Promise.all([
    fetchMetar(dz.metarStation),
    dz.id === "gryttjom" ? fetchGryttjomWeather() : Promise.resolve(null),
  ]);
  const onsiteGustMs = onsiteWeather?.gustMs ?? null;
  const onsiteTemperatureC = onsiteWeather?.temperatureC ?? null;
  const hasOnsiteData = onsiteGustMs != null || onsiteTemperatureC != null;

  const fallback: LiveConditions = {
    status: "consider",
    dataState: hasOnsiteData ? "partial" : "unavailable",
    observedAt: null,
    windMs: null,
    gustMs: onsiteGustMs,
    temperatureC: onsiteTemperatureC,
    temperatureSource: onsiteTemperatureC == null ? null : "onsite",
    bearingDeg: null,
    cloudBaseFt: null,
    ceilingFt: null,
    cloudCover: null,
    station: dz.metarStation,
    stationDistanceKm: dz.metarDistanceKm,
    onsiteGustMs,
    reasons: ["Live observation unavailable"],
  };

  if (!metar) {
    if (!hasOnsiteData) return fallback;
    const gustStatus = onsiteGustMs == null ? "go" : gustSpeedStatus(onsiteGustMs);
    return {
      ...fallback,
      status: worst("consider", gustStatus),
      dataState: "partial",
      observedAt: new Date().toISOString(),
      reasons: [
        "Aviation observation unavailable",
        ...(gustStatus === "go"
          ? []
          : [gustStatus === "consider" ? "Max gust close to limit" : "Max gust over limit"]),
      ],
    };
  }

  const observedAt = metar.reportTime ?? null;
  const ageMs = observedAt ? Date.now() - Date.parse(observedAt) : Number.POSITIVE_INFINITY;
  if (ageMs > 90 * 60 * 1000) {
    return {
      ...fallback,
      dataState: hasOnsiteData ? "partial" : "stale",
      observedAt,
      reasons: ["Live aviation observation is stale"],
    };
  }

  const windMs = finite(metar.wspd) ? knotsToMs(metar.wspd) : null;
  const metarGustMs = finite(metar.wgst) ? knotsToMs(metar.wgst) : null;
  const metarTemperatureC = finite(metar.temp) ? metar.temp : null;
  const gustComesFromOnsite =
    onsiteGustMs != null && (metarGustMs == null || onsiteGustMs >= metarGustMs);
  const gustMs = maxNullable(metarGustMs, onsiteGustMs);
  const cloudBaseFt = lowestCloudBase(metar.clouds);
  const ceilingFt = lowestCeiling(metar.clouds);
  let status: HourStatus = "go";
  const reasons: string[] = [];

  if (windMs != null) {
    const s = windSpeedStatus(windMs);
    status = worst(status, s);
    if (s !== "go") {
      reasons.push(s === "consider" ? "Mean wind close to limit" : "Mean wind over limit");
    }
  }
  if (gustMs != null) {
    const s = gustSpeedStatus(gustMs);
    status = worst(status, s);
    if (s !== "go") {
      reasons.push(s === "consider" ? "Max gust close to limit" : "Max gust over limit");
    }
  }
  // Only compare values measured at the same station. Gryttjom's onsite gust
  // and ESCM's mean wind are useful separately, but their difference is not a
  // meaningful gust spread across 44 km.
  if (!gustComesFromOnsite && windMs != null && metarGustMs != null) {
    const spread = Math.max(0, metarGustMs - windMs);
    const s = gustSpreadStatus(spread);
    status = worst(status, s);
    if (s !== "go") {
      reasons.push(s === "consider" ? "Gust spread is unsettled" : "Gust spread is too high");
    }
  }

  if (ceilingFt != null && ceilingFt <= LIMITS.ceilingConsiderFt) {
    const s: HourStatus = ceilingFt <= LIMITS.ceilingNoGoFt ? "nogo" : "consider";
    status = worst(status, contextual(dz, s));
    reasons.push(`Low ${metar.cover ?? "cloud"} ceiling`);
  }

  return {
    status,
    dataState: "fresh",
    observedAt,
    windMs,
    gustMs,
    temperatureC: onsiteTemperatureC ?? metarTemperatureC,
    temperatureSource: onsiteTemperatureC != null
      ? "onsite"
      : metarTemperatureC != null
        ? "metar"
        : null,
    bearingDeg: finite(metar.wdir) ? metar.wdir : null,
    cloudBaseFt,
    ceilingFt,
    cloudCover: metar.cover ?? null,
    station: dz.metarStation,
    stationDistanceKm: dz.metarDistanceKm,
    onsiteGustMs,
    reasons,
  };
}

async function fetchMetar(station: string): Promise<Metar | null> {
  try {
    const params = new URLSearchParams({ ids: station, format: "json", hours: "2" });
    const res = await fetch(`https://aviationweather.gov/api/data/metar?${params}`, {
      headers: { "User-Agent": "letsjump/2.0 contact-weather-app" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Metar[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchGryttjomWeather(): Promise<OnsiteWeather | null> {
  try {
    const res = await fetch("https://insidan.skydive.se/Weather", {
      headers: { "User-Agent": "letsjump/2.0" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const gustMatch = html.match(/(?:Max gust last 30 min|Max stöt senaste 30 min):\s*([\d.,]+)\s*m\/s/i);
    const temperatureMatch = html.match(/<h2[^>]*>\s*([+-]?[\d.,]+)\s*°C\s*<\/h2>/i);
    const gustMs = parseDecimal(gustMatch?.[1]);
    const temperatureC = parseDecimal(temperatureMatch?.[1]);
    return gustMs == null && temperatureC == null
      ? null
      : { gustMs, temperatureC };
  } catch {
    return null;
  }
}

function parseDecimal(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function contextual(dz: Dropzone, status: HourStatus): HourStatus {
  // A remote station is regional context, not a hard stop at the DZ.
  return dz.metarDistanceKm > LIMITS.remoteStationKm && status === "nogo"
    ? "consider"
    : status;
}

function lowestCeiling(clouds: MetarCloud[] | undefined): number | null {
  const bases = (clouds ?? [])
    .filter((c) =>
      (c.cover === "BKN" || c.cover === "OVC" || c.cover === "VV") &&
      finite(c.base),
    )
    .map((c) => c.base as number);
  return bases.length ? Math.min(...bases) : null;
}

function lowestCloudBase(clouds: MetarCloud[] | undefined): number | null {
  const bases = (clouds ?? [])
    .filter((c) => finite(c.base))
    .map((c) => c.base as number);
  return bases.length ? Math.min(...bases) : null;
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
