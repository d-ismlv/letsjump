import type {
  DayForecast,
  ForecastHour,
  HourStatus,
  Limiter,
  Verdict,
} from "./types";

// Jumping window (local time). DZs don't run loads outside daylight ops.
export const JUMP_FROM = 9;
export const JUMP_TO = 21; // inclusive of the 21:00 row
// Hours before a DZ's close that count as "evening only". If the sole jumpable
// stretch starts within this margin of closing, turnout is a coin-flip — people
// leave or the day gets called for low interest.
export const LATE_MARGIN = 3;

// Thresholds for a licensed (B/C/D) sport jumper. Tune here.
// Wind/gust in m/s, rain in mm/h, cloud in % cover.
export const LIMITS = {
  windGood: 8,
  windMax: 11,
  gustGood: 8.5,
  gustMax: 14,
  // A large gap between sustained wind and the hourly maximum gust is a useful
  // turbulence signal even when the absolute gust remains below the hard limit.
  gustSpreadGood: 4,
  gustSpreadMax: 7,
  // Rain AMOUNT (mm/h). Scattered showers you can jump around ("holes"); it's
  // steady rain sitting over the DZ that actually stops the day.
  rainGood: 0.2, // dry enough
  rainMax: 1.0, // steady rain — no jumping
  // Rain PROBABILITY only ever downgrades to CONSIDER, never NO-GO: a high chance
  // of a passing shower is a "watch it" day, not a washout — holes come and go.
  probConsider: 35, // % chance at/above this = CONSIDER for that hour
  // A day is "unsettled" if any window hour reaches this — enough that a green GO
  // headline would be over-confident, even if the point forecast shows no rain AT
  // the field. Deliberately conservative (a point forecast misses nearby cells).
  probUnsettled: 45,
  // Clouds: a solid low/mid layer means no climb to altitude / no ground sight.
  // High cloud (cirrus) doesn't stop jumping, so it's excluded.
  cloudGoodLow: 35,
  cloudGoodMid: 55,
  cloudMaxLow: 65,
  cloudMaxMid: 85,
  // Thunder heuristic: convective instability (CAPE, J/kg) with real rain odds.
  capeConvective: 250,
  probStorm: 55,
} as const;

// WMO weather codes.
const THUNDER_CODES = new Set([95, 96, 99]);
const SHOWER_CODES = new Set([80, 81, 82, 85, 86]);
const VIOLENT_SHOWER = 82; // violent rain shower — a genuine stopper

type Sample = {
  windMs: number;
  gustMs: number;
  precipMmH: number;
  precipProb: number;
  weatherCode: number;
  cape: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  cloudTotal: number;
  dataComplete: boolean;
};

// Is this hour at risk of thunder / convective showers? These are jumping-stoppers
// and are notoriously under-represented by the deterministic point rainfall value.
export function isThunder(s: {
  weatherCode: number;
  cape: number;
  precipProb: number;
}): boolean {
  if (THUNDER_CODES.has(s.weatherCode)) return true;
  if (s.cape >= LIMITS.capeConvective && s.precipProb >= LIMITS.probStorm) return true;
  return false;
}

// Score a single hour. Returns worst-of status + the limiting factor.
export function rateHour(s: Sample): {
  status: HourStatus;
  limiter: Limiter;
  thunder: boolean;
  cloudUncertain: boolean;
} {
  const thunder = isThunder(s);

  // Best-match can combine fields from different models. If the total/WMO sky
  // says overcast while every layer says mostly clear, that is uncertainty — not
  // permission to paint the hour green. High-only cloud remains harmless.
  const deck = Math.max(s.cloudLow, s.cloudMid);
  const cloudUncertain =
    s.cloudTotal >= 80 &&
    s.weatherCode === 3 &&
    deck <= LIMITS.cloudGoodLow &&
    s.cloudHigh < 60;

  // Rain factor: NO-GO only comes from steady rain (amount), thunder, or a violent
  // shower. Probability and ordinary showers cap out at CONSIDER — you can still
  // jump the holes between cells.
  const probStatus: HourStatus =
    s.precipProb >= LIMITS.probConsider ? "consider" : "go";
  const codeStatus: HourStatus = thunder
    ? "nogo"
    : s.weatherCode === VIOLENT_SHOWER
      ? "nogo"
      : SHOWER_CODES.has(s.weatherCode)
        ? "consider"
        : "go";
  const rainStatus = worst(
    worst(band(s.precipMmH, LIMITS.rainGood, LIMITS.rainMax), probStatus),
    codeStatus,
  );

  const factors: { key: Exclude<Limiter, null>; status: HourStatus }[] = [
    { key: "wind", status: band(s.windMs, LIMITS.windGood, LIMITS.windMax) },
    {
      key: "gust",
      status: worst(
        band(s.gustMs, LIMITS.gustGood, LIMITS.gustMax),
        band(
          Math.max(0, s.gustMs - s.windMs),
          LIMITS.gustSpreadGood,
          LIMITS.gustSpreadMax,
        ),
      ),
    },
    { key: thunder ? "thunder" : "rain", status: rainStatus },
    {
      key: "cloud",
      status: worst(
        cloudUncertain ? "consider" : "go",
        worst(
          band(s.cloudLow, LIMITS.cloudGoodLow, LIMITS.cloudMaxLow),
          band(s.cloudMid, LIMITS.cloudGoodMid, LIMITS.cloudMaxMid),
        ),
      ),
    },
    { key: "data", status: s.dataComplete ? "go" : "consider" },
  ];

  let status: HourStatus = "go";
  let limiter: Limiter = null;
  const rank = { go: 0, consider: 1, nogo: 2 } as const;
  for (const f of factors) {
    if (rank[f.status] > rank[status]) {
      status = f.status;
      limiter = f.key;
    }
  }
  return { status, limiter, thunder, cloudUncertain };
}

// value below `good` = go, below `max` = consider, else nogo.
function band(value: number, good: number, max: number): HourStatus {
  if (value <= good) return "go";
  if (value <= max) return "consider";
  return "nogo";
}

function worst(a: HourStatus, b: HourStatus): HourStatus {
  const rank = { go: 0, consider: 1, nogo: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
}

const LIMITER_LABEL: Record<Exclude<Limiter, null>, string> = {
  wind: "wind",
  gust: "gusts",
  rain: "rain",
  thunder: "thunderstorms",
  cloud: "cloud",
  data: "weather data",
};

// Roll up a day's jumping-window hours into one verdict + summary + best window.
export function rateDay(
  hours: ForecastHour[],
  meta: { dateISO: string; label: string; close: number },
): DayForecast {
  if (!hours.length) {
    return {
      ...meta,
      hours,
      verdict: "NO-GO",
      summary: "No forecast data for the jumping window.",
      bestWindow: null,
    };
  }

  const goHours = hours.filter((h) => h.status === "go").length;
  const bestGo = longestRun(hours, (h) => h.status === "go");
  const bestOk = longestRun(hours, (h) => h.status !== "nogo");
  const stormy = hours.some((h) => h.thunder);
  // Conservative: real rain odds anywhere in the window make a green GO
  // over-confident — the point forecast can't see cells drifting over from nearby.
  const unsettled =
    stormy || hours.some((h) => h.precipProb >= LIMITS.probUnsettled);

  let verdict: Verdict;
  if (bestGo.len >= 2) verdict = "GO";
  else if (goHours >= 1 || bestOk.len >= 3) verdict = "CONSIDER";
  else verdict = "NO-GO";

  // Never headline a full GO on an unsettled day. A clear morning still shows its
  // green best-window chip so the "go early" signal isn't lost.
  if (unsettled && verdict === "GO") verdict = "CONSIDER";

  // Evening-only clearance: if nothing is jumpable until the last few hours
  // before this DZ's close, don't headline GO — by then people have left or the
  // day gets called for low interest.
  const lateStart = meta.close - LATE_MARGIN;
  const firstGo = hours.find((h) => h.status === "go");
  const eveningOnly =
    bestGo.len >= 2 && firstGo != null && firstGo.hour >= lateStart;
  if (eveningOnly && verdict === "GO") verdict = "CONSIDER";

  // Best window = longest clean-air run, falling back to the longest non-nogo run.
  const clearWindow = bestGo.len >= 2;
  const runForWindow = clearWindow ? bestGo : bestOk.len >= 2 ? bestOk : null;
  const bestWindow = runForWindow
    ? {
        from: hours[runForWindow.start].hour,
        to: hours[runForWindow.end].hour,
        quality: clearWindow ? "clear" as const : "marginal" as const,
      }
    : null;

  return {
    ...meta,
    hours,
    verdict,
    summary: summarise(hours, verdict, bestWindow, stormy, eveningOnly),
    bestWindow,
  };
}

function summarise(
  hours: ForecastHour[],
  verdict: Verdict,
  bestWindow: { from: number; to: number; quality: "clear" | "marginal" } | null,
  stormy: boolean,
  eveningOnly: boolean,
): string {
  const window = bestWindow
    ? `${pad(bestWindow.from)}–${pad(bestWindow.to)}`
    : null;

  // Call out the first stormy hour — that's what usually ends the day.
  const firstStorm = hours.find((h) => h.thunder);
  const stormNote = firstStorm
    ? `Thunder/showers risk from ~${pad(firstStorm.hour)}.`
    : "";
  // Or, absent point-thunder, the first hour with real rain odds.
  const firstWet = hours.find((h) => h.precipProb >= LIMITS.probUnsettled);
  const wetNote = firstWet
    ? `Showers possible from ~${pad(firstWet.hour)}.`
    : "";

  if (verdict === "GO" && window) {
    // Warn if it deteriorates later in the day so "GO" doesn't hide an afternoon
    // washout — go early is still the right call, but say so.
    const decline = bestWindow
      ? hours.find((h) => h.hour > bestWindow.to && h.status !== "go")
      : undefined;
    if (decline) {
      const what = decline.limiter ? LIMITER_LABEL[decline.limiter] : "conditions";
      return `Clear window ${window} — go early; then ${what} after ~${pad(decline.hour)}.`;
    }
    return `Clear-air window ${window} within limits — worth the drive.`;
  }
  if (verdict === "CONSIDER") {
    if (stormy || wetNote) {
      const w = window ? `Best chance ${window}. ` : "";
      const note = stormy ? stormNote : wetNote;
      return `${w}${note} Unsettled — check the radar before driving.`.trim();
    }
    if (eveningOnly && window) {
      return `Only clears late (${window}). Turnout iffy — the day may get called.`;
    }
    const blocker = dominantLimiter(hours.filter((h) => h.status !== "go"));
    const w = window ? `Marginal window ${window}. ` : "";
    return `${w}${blocker ? `Watch the ${blocker}.` : "Mixed conditions — keep an eye on it."}`;
  }
  const blocker = dominantLimiter(hours.filter((h) => h.status === "nogo"));
  return blocker
    ? `${cap(blocker)} out of limits across the day — stay home.`
    : "Out of limits across the day — stay home.";
}

function dominantLimiter(hours: ForecastHour[]): string | null {
  const counts = new Map<Exclude<Limiter, null>, number>();
  for (const h of hours) {
    if (h.limiter) counts.set(h.limiter, (counts.get(h.limiter) ?? 0) + 1);
  }
  let best: Exclude<Limiter, null> | null = null;
  let n = 0;
  for (const [k, v] of counts) {
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best ? LIMITER_LABEL[best] : null;
}

// Longest consecutive run of hours matching a predicate.
function longestRun(
  hours: ForecastHour[],
  ok: (h: ForecastHour) => boolean,
): { len: number; start: number; end: number } {
  let best = { len: 0, start: -1, end: -1 };
  let curStart = -1;
  for (let i = 0; i < hours.length; i++) {
    if (ok(hours[i])) {
      if (curStart === -1) curStart = i;
      const len = i - curStart + 1;
      if (len > best.len) best = { len, start: curStart, end: i };
    } else {
      curStart = -1;
    }
  }
  return best;
}

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
