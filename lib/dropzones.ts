import type { Dropzone } from "./types";

// The two dropzones within ~70 min drive. Coordinates are the actual airfields
// so the forecast grid cell is the landing area, not the nearest town.
export const DROPZONES: Dropzone[] = [
  {
    id: "aros",
    club: "Fallskärmsklubben Aros",
    name: "FK Aros",
    place: "Johannisberg, Västerås",
    lat: 59.577,
    lon: 16.5,
    jumpUrl: "https://skyview.fkaros.se/",
    weatherUrl: "https://skyview.fkaros.se/",
    metarStation: "ESOW",
    metarDistanceKm: 8,
    closeWeekday: 20, // last lift ~20:30
    closeWeekend: 20,
  },
  {
    id: "gryttjom",
    club: "Skydive Stockholm",
    name: "Skydive Stockholm",
    place: "Gryttjom, Tierp",
    lat: 60.287,
    lon: 17.422,
    jumpUrl: "https://insidan.skydive.se/Skyview",
    weatherUrl: "https://insidan.skydive.se/Weather",
    metarStation: "ESCM",
    metarDistanceKm: 44,
    closeWeekday: 20,
    closeWeekend: 18,
  },
];
