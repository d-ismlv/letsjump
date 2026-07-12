export type Verdict = "GO" | "CONSIDER" | "NO-GO";

export type Dropzone = {
  id: "aros" | "gryttjom";
  club: string; // full club name
  name: string; // short DZ name
  place: string; // town / field
  lat: number;
  lon: number;
  jumpUrl: string; // where to check the jump table / manifest
  weatherUrl: string; // DZ's own live wind/weather page
  metarStation: string; // nearest useful aviation observation
  metarDistanceKm: number; // distance from DZ; controls observation confidence
  closeWeekday: number; // last operating hour, Mon–Fri (local)
  closeWeekend: number; // last operating hour, Sat/Sun (local)
};

// Per-hour forecast within the jumping window.
export type ForecastHour = {
  time: string; // ISO local (Europe/Stockholm)
  hour: number; // 0-23, local
  windMs: number;
  gustMs: number;
  bearingDeg: number; // direction wind comes FROM
  precipMmH: number;
  precipProb: number; // 0-100
  weatherCode: number; // WMO code
  cape: number; // J/kg convective potential
  thunder: boolean; // thunderstorm / convective risk this hour
  cloudLow: number; // %
  cloudMid: number; // %
  cloudHigh: number; // %
  cloudTotal: number; // %
  cloudUncertain: boolean; // total/WMO cloud conflicts with the layer fields
  dataComplete: boolean; // false means the hour is never allowed to score GO
  status: HourStatus; // per-hour jumpability
  limiter: Limiter; // worst factor this hour
};

export type HourStatus = "go" | "consider" | "nogo";

export type Limiter =
  | "wind"
  | "gust"
  | "rain"
  | "thunder"
  | "cloud"
  | "data"
  | null;

export type LiveConditions = {
  status: HourStatus;
  observedAt: string | null;
  windMs: number | null;
  gustMs: number | null;
  bearingDeg: number | null;
  visibilityKm: number | null;
  ceilingFt: number | null;
  cloudCover: string | null;
  station: string;
  stationDistanceKm: number;
  onsiteGustMs: number | null;
  reasons: string[];
  available: boolean;
};

export type DayForecast = {
  dateISO: string; // yyyy-mm-dd (local)
  label: string; // "Today" | "Tomorrow" | weekday
  close: number; // last operating hour this date (local)
  hours: ForecastHour[]; // jumping-window hours only
  verdict: Verdict;
  summary: string; // one-line human reason
  bestWindow: {
    from: number;
    to: number;
    quality: "clear" | "marginal";
  } | null; // local hours, inclusive
};

export type DropzoneForecast = {
  dz: Dropzone;
  days: DayForecast[]; // [today, tomorrow]
  live: LiveConditions;
  error: string | null;
};
