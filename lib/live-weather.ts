import { LIMITS } from "./decision";
import type { Dropzone, HourStatus, LiveConditions } from "./types";

type MetarCloud = { cover?: string; base?: number };
type Metar = {
  reportTime?: string;
  wdir?: number;
  wspd?: number;
  wgst?: number;
  visib?: string | number;
  cover?: string;
  clouds?: MetarCloud[];
};

const rank: Record<HourStatus, number> = { go: 0, consider: 1, nogo: 2 };
const worst = (a: HourStatus, b: HourStatus) => (rank[a] >= rank[b] ? a : b);
const knotsToMs = (knots: number) => knots * 0.514444;

export async function fetchLiveConditions(dz: Dropzone): Promise<LiveConditions> {
  const [metar, onsiteGustMs] = await Promise.all([
    fetchMetar(dz.metarStation),
    dz.id === "gryttjom" ? fetchGryttjomGust() : Promise.resolve(null),
  ]);

  const fallback: LiveConditions = {
    status: "consider",
    observedAt: null,
    windMs: null,
    gustMs: null,
    bearingDeg: null,
    visibilityKm: null,
    ceilingFt: null,
    cloudCover: null,
    station: dz.metarStation,
    stationDistanceKm: dz.metarDistanceKm,
    onsiteGustMs,
    reasons: ["Live observation unavailable"],
    available: onsiteGustMs != null,
  };

  if (!metar) {
    if (onsiteGustMs == null) return fallback;
    const gustStatus = band(onsiteGustMs, LIMITS.gustGood, LIMITS.gustMax);
    return {
      ...fallback,
      status: worst("consider", gustStatus),
      observedAt: new Date().toISOString(),
      reasons: [
        "Aviation observation unavailable",
        ...(gustStatus === "go" ? [] : [`Onsite gust ${onsiteGustMs.toFixed(1)} m/s`]),
      ],
      available: false,
    };
  }

  const observedAt = metar.reportTime ?? null;
  const ageMs = observedAt ? Date.now() - Date.parse(observedAt) : Number.POSITIVE_INFINITY;
  if (ageMs > 90 * 60 * 1000) {
    return {
      ...fallback,
      observedAt,
      reasons: ["Live aviation observation is stale"],
    };
  }

  const windMs = finite(metar.wspd) ? knotsToMs(metar.wspd) : null;
  const metarGustMs = finite(metar.wgst) ? knotsToMs(metar.wgst) : null;
  const gustMs = maxNullable(metarGustMs, onsiteGustMs);
  const visibilityKm = parseVisibilityKm(metar.visib);
  const ceilingFt = lowestCeiling(metar.clouds);
  let status: HourStatus = "go";
  const reasons: string[] = [];

  if (windMs != null) {
    const s = band(windMs, LIMITS.windGood, LIMITS.windMax);
    status = worst(status, s);
    if (s !== "go") reasons.push(`Wind ${windMs.toFixed(1)} m/s`);
  }
  if (gustMs != null) {
    const s = band(gustMs, LIMITS.gustGood, LIMITS.gustMax);
    status = worst(status, s);
    if (s !== "go") reasons.push(`Gust ${gustMs.toFixed(1)} m/s`);
  }

  if (visibilityKm != null && visibilityKm < 10) {
    const s: HourStatus = visibilityKm < 5 ? "nogo" : "consider";
    status = worst(status, contextual(dz, s));
    reasons.push(`Visibility ${visibilityKm.toFixed(0)} km`);
  }

  if (ceilingFt != null && ceilingFt <= 8_000) {
    const s: HourStatus = ceilingFt <= 3_000 ? "nogo" : "consider";
    status = worst(status, contextual(dz, s));
    reasons.push(`Low ${metar.cover ?? "cloud"} ceiling`);
  }

  return {
    status,
    observedAt,
    windMs,
    gustMs,
    bearingDeg: finite(metar.wdir) ? metar.wdir : null,
    visibilityKm,
    ceilingFt,
    cloudCover: metar.cover ?? null,
    station: dz.metarStation,
    stationDistanceKm: dz.metarDistanceKm,
    onsiteGustMs,
    reasons,
    available: true,
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

async function fetchGryttjomGust(): Promise<number | null> {
  try {
    const res = await fetch("https://insidan.skydive.se/Weather", {
      headers: { "User-Agent": "letsjump/2.0" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/(?:Max gust last 30 min|Max stöt senaste 30 min):\s*([\d.,]+)\s*m\/s/i);
    if (!match) return null;
    const value = Number(match[1].replace(",", "."));
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function contextual(dz: Dropzone, status: HourStatus): HourStatus {
  // A remote station is regional context, not a hard stop at the DZ.
  return dz.metarDistanceKm > 20 && status === "nogo" ? "consider" : status;
}

function band(value: number, good: number, max: number): HourStatus {
  if (value <= good) return "go";
  if (value <= max) return "consider";
  return "nogo";
}

function lowestCeiling(clouds: MetarCloud[] | undefined): number | null {
  const bases = (clouds ?? [])
    .filter((c) => (c.cover === "BKN" || c.cover === "OVC") && finite(c.base))
    .map((c) => c.base as number);
  return bases.length ? Math.min(...bases) : null;
}

function parseVisibilityKm(value: Metar["visib"]): number | null {
  if (value == null) return null;
  const miles = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(miles)) return null;
  // AWC encodes the METAR 9999 (10 km or more) value as "6+" statute miles.
  if (typeof value === "string" && value.includes("+") && miles >= 6) return 10;
  return miles * 1.60934;
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
