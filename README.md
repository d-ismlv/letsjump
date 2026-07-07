<div align="center">

# 🪂 Let's jump

**Forecast-based GO / CONSIDER / NO-GO for two Swedish dropzones.**

<a href="#quick-start">Quick start</a> ·
<a href="#how-it-works">How it works</a> ·
<a href="https://github.com/d-ismlv/letsjump/pkgs/container/letsjump">Container</a>

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

<img src="docs/screenshot.png" alt="Let's jump — forecast-based GO / CONSIDER / NO-GO for FK Aros and Skydive Stockholm" width="820" />

</div>

"Should I drive ~70 min to the dropzone?" — one page that turns the forecast into
a **GO / CONSIDER / NO-GO** verdict for **FK Aros** (Västerås) and **Skydive
Stockholm** (Gryttjom), for today and tomorrow. Wind, gusts, rain, cloud and
thunder, scored hour-by-hour over the 09:00–21:00 window.

Forecast only — always confirm actual ops on each club's jump table.

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

A Next.js process pulls the [Open-Meteo](https://open-meteo.com) hourly forecast
(`best_match`, which blends in MET Nordic 1 km over Scandinavia) for each
airfield's exact coordinates, and a pure decision engine
([lib/decision.ts](lib/decision.ts)) scores each hour on the worst of wind, gust,
rain, thunder and cloud, then rolls the window up into a verdict and best window.

It's **convective-aware** — rain is judged on probability, WMO weather codes and
CAPE, not just point rainfall, so scattered showers and thunder aren't missed. A
shower *chance* only makes a day **CONSIDER** (you jump the holes between cells);
**NO-GO** is reserved for real stoppers — steady rain, thunder (⚡), over-limit
wind, or a solid cloud deck. Thresholds live in `LIMITS` in
[lib/decision.ts](lib/decision.ts) and are still being calibrated against real
jump days.

<sub>Data © <a href="https://open-meteo.com">Open-Meteo</a> (CC BY 4.0). Not an operational authority — check the radar before driving.</sub>
