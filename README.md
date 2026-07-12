<div align="center">

# 🪂&ensp;Let&apos;s jump

**Live conditions + forecast-based GO / CONSIDER / NO-GO for two Swedish dropzones.**

<a href="#quick-start">Quick start</a> ·
<a href="#how-it-works">How it works</a> ·
<a href="https://github.com/d-ismlv/letsjump/pkgs/container/letsjump">Container</a>

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

<img src="docs/screenshot.png" alt="Let's jump — live conditions and forecast for FK Aros and Skydive Stockholm" width="820" />

</div>

"Should I drive ~70 min to the dropzone?" — one page that combines current
observations with a **GO / CONSIDER / NO-GO** forecast for **FK Aros** (Västerås) and **Skydive
Stockholm** (Gryttjom), for today and tomorrow. Wind, gusts, rain, cloud and
thunder, scored hour-by-hour over the 09:00–21:00 window.

Decision aid only — always confirm actual ops and conditions at the DZ.

## Quick start

```yaml
# docker-compose.yml
services:
  letsjump:
    image: ghcr.io/d-ismlv/letsjump:latest
    ports: ["32325:32325"]
    restart: unless-stopped
```

```bash
docker compose up -d          # → http://localhost:32325
```

Stateless: nothing to persist, no secrets to set. Or run it locally:

```bash
npm install && npm run dev    # → http://localhost:3000
```

## How it works

Everything runs server-side, in four steps:

1. **Observe now.** Pull the latest aviation observation from ESOW for Aros and
   ESCM as regional context for Gryttjom. Gryttjom's public weather page also
   supplies its onsite maximum gust over the last 30 minutes. The source and
   distance are shown, and both cards link to the DZ's live wind page.
2. **Fetch the outlook.** Pull the hourly forecast from
   [Open-Meteo](https://open-meteo.com) for each airfield's coordinates, using
   MET Nordic where available and best-match fields for the rest.
3. **Score each remaining hour.** Every hour from now until closing is rated
   go / consider / no-go on the *worst* of five factors: wind, gusts, rain,
   thunder, and cloud.
4. **Reconcile.** Live wind, visibility and aviation ceiling can only downgrade
   today's headline. Contradictory or incomplete forecast fields never score GO.
   The remaining hours become one outlook per dropzone, plus the best window.

| Verdict | What it means |
|---|---|
| 🟢 **GO** | Live conditions and a solid forecast window are within limits |
| 🟡 **CONSIDER** | Jumpable but unsettled: showers possible, go early or watch the radar |
| 🔴 **NO-GO** | A real stopper all day |

The hard part is summer storms. A plain forecast can read "0 mm" at the field
while a cell dumps rain a few kilometres away, so the engine also weighs rain
*probability* and atmospheric instability (CAPE), not just millimetres. It also
matches how jumpers actually behave: a shower *chance* only drops a day to
CONSIDER (you jump the holes between clouds), while thunder, steady rain, or a
solid cloud deck are the real NO-GO. An unexplained total-cloud/low-cloud
disagreement is marked uncertain instead of silently becoming green. Steady wind
and gusts are scored separately from gust spread: 8–9 m/s can remain green when
steady, while a large jump from mean wind to the peak is treated as a turbulence
signal. All the thresholds live in `LIMITS`
([lib/decision.ts](lib/decision.ts)) and are still being tuned against real jump
days.

<sub>Forecast data © <a href="https://open-meteo.com">Open-Meteo</a> (CC BY 4.0). Live aviation observations via <a href="https://aviationweather.gov/data/api/">AviationWeather.gov</a>; onsite gust via Skydive Stockholm. Not an operational authority — check Skyview, onsite wind and <a href="https://www.smhi.se/vader/radar-och-satellit/radar-med-blixt">SMHI radar + lightning</a>.</sub>
