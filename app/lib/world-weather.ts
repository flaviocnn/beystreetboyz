export const TORINO = { latitude: 45.0703, longitude: 7.6869, timezone: "Europe/Rome" } as const;
export const WEATHER_INTERVAL = 15 * 60 * 1000;
export const WEATHER_MAX_AGE = 3 * 60 * 60 * 1000;
export type TorinoWeather = { observedAt: number; temperature: number; code: number; cloud: number; precipitation: number; snow: number; wind: number; windDirection: number };
export type WeatherResponse = { weather: TorinoWeather | null; fetchedAt: number; serverNow: number; stale: boolean };
export const WEATHER_CODES = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
export function validWeather(input: unknown, now: number): input is TorinoWeather {
  if (!input || typeof input !== "object") return false;
  const w = input as TorinoWeather;
  return [w.observedAt, w.temperature, w.code, w.cloud, w.precipitation, w.snow, w.wind, w.windDirection].every(Number.isFinite)
    && w.observedAt <= now + 15 * 60000 && now - w.observedAt <= WEATHER_MAX_AGE
    && WEATHER_CODES.has(w.code) && w.temperature >= -60 && w.temperature <= 60 && w.cloud >= 0 && w.cloud <= 100
    && w.precipitation >= 0 && w.precipitation <= 200 && w.snow >= 0 && w.snow <= 100 && w.wind >= 0 && w.wind <= 300 && w.windDirection >= 0 && w.windDirection <= 360;
}
export function parseWeather(input: unknown, now: number): TorinoWeather | null {
  const c = (input as { current?: Record<string, unknown> } | null)?.current;
  if (!c) return null;
  const w = { observedAt: typeof c.time === "number" ? c.time * 1000 : NaN, temperature: c.temperature_2m, code: c.weather_code,
    cloud: c.cloud_cover, precipitation: c.precipitation, snow: c.snowfall, wind: c.wind_speed_10m, windDirection: c.wind_direction_10m };
  return validWeather(w, now) ? w : null;
}
export function weatherKind(w: TorinoWeather | null) {
  if (!w) return "unknown";
  if ([95, 96, 99].includes(w.code)) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(w.code) || w.snow > 0) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(w.code) || w.precipitation > 0) return "rain";
  if ([45, 48].includes(w.code)) return "fog";
  return w.code === 3 || w.cloud >= 70 ? "cloud" : [1, 2].includes(w.code) || w.cloud >= 20 ? "partly" : "clear";
}
export function weatherLabel(w: TorinoWeather | null) {
  return { unknown: "Meteo non disponibile", storm: "Temporale", snow: "Neve", rain: "Pioggia", fog: "Nebbia", cloud: "Nuvoloso", partly: "Parzialmente nuvoloso", clear: "Sereno" }[weatherKind(w)];
}
const radians = Math.PI / 180;
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
// Solar position from UTC Julian days: independent of browser timezone, DST or
// cached sunrise dates. Approximate astronomical light, not a weather observation.
export function solarLight(timestamp: number) {
  const days = timestamp / 86400000 + 2440587.5 - 2451545;
  const anomaly = radians * (357.5291 + .98560028 * days);
  const longitude = anomaly + radians * (1.9148 * Math.sin(anomaly) + .02 * Math.sin(2 * anomaly) + .0003 * Math.sin(3 * anomaly) + 102.9372 + 180);
  const obliquity = radians * 23.4397;
  const declination = Math.asin(Math.sin(longitude) * Math.sin(obliquity));
  const rightAscension = Math.atan2(Math.sin(longitude) * Math.cos(obliquity), Math.cos(longitude));
  const hour = radians * (280.16 + 360.9856235 * days + TORINO.longitude) - rightAscension;
  const latitude = radians * TORINO.latitude;
  const altitude = Math.asin(Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hour)) / radians;
  const daylight = clamp((altitude + 6) / 18);
  const phase = altitude < -6 ? "Notte" : altitude > 9 ? "Giorno" : Math.sin(hour) < 0 ? "Alba" : "Tramonto";
  return { altitude, daylight: daylight * daylight * (3 - 2 * daylight), phase, warmth: clamp(1 - Math.abs(altitude - 1) / 9) };
}
export function environmentTargets(now: number, weather: TorinoWeather | null, indoor = false) {
  const light = solarLight(now), w = weather && validWeather(weather, now) ? weather : null;
  const kind = weatherKind(w), cloud = (w?.cloud ?? 0) / 100;
  return {
    darkness: indoor ? .09 * (1 - light.daylight) + cloud * .025 : clamp(.44 * (1 - light.daylight) + cloud * .15 * light.daylight, 0, .5),
    warmth: light.warmth * (indoor ? .025 : .095) * (1 - cloud * .7),
    rain: !indoor && (kind === "rain" || kind === "storm") ? clamp(.25 + (w?.precipitation ?? 0) / 5, .25, 1) : 0,
    snow: !indoor && kind === "snow" ? clamp(.3 + (w?.snow ?? 0), .3, 1) : 0,
    fog: !indoor && kind === "fog" ? .23 : 0,
    wind: !indoor ? clamp((w?.wind ?? 0) / 60, 0, 1) * Math.sin(((w?.windDirection ?? 0) + 180) * radians) : 0,
  };
}
