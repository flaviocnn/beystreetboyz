import { parseWeather, WEATHER_INTERVAL, WEATHER_MAX_AGE, type WeatherResponse } from "./world-weather";
type FetchWeather = (url: string, init: RequestInit & { next: { revalidate: number } }) => Promise<Response>;
export function weatherUrl(key?: string) {
  const url = new URL(key ? "https://customer-api.open-meteo.com/v1/forecast" : "https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({ latitude: "45.0703", longitude: "7.6869", current: "temperature_2m,weather_code,cloud_cover,precipitation,snowfall,wind_speed_10m,wind_direction_10m", timezone: "Europe/Rome", timeformat: "unixtime", forecast_days: "1", ...(key ? { apikey: key } : {}) }).toString();
  return url.toString();
}
export function createWeatherService(fetcher: FetchWeather, clock = Date.now) {
  let last: WeatherResponse | null = null, pending: Promise<WeatherResponse> | null = null, retryAt = 0;
  const fallback = (): WeatherResponse => ({ weather: last?.weather && clock() - last.weather.observedAt <= WEATHER_MAX_AGE ? last.weather : null, fetchedAt: last?.fetchedAt ?? 0, serverNow: clock(), stale: true });
  return async (): Promise<WeatherResponse> => {
    if (last && clock() - last.fetchedAt < WEATHER_INTERVAL && clock() - (last.weather?.observedAt ?? 0) < WEATHER_MAX_AGE) return { ...last, serverNow: clock() };
    if (pending) return pending;
    if (clock() < retryAt) return fallback();
    pending = Promise.resolve().then(async () => {
      try {
        const response = await fetcher(weatherUrl(process.env.OPEN_METEO_API_KEY), { next: { revalidate: WEATHER_INTERVAL / 1000 }, signal: AbortSignal.timeout(7000) });
        if (!response.ok) throw new Error("weather_unavailable");
        const weather = parseWeather(await response.json(), clock());
        if (!weather) throw new Error("invalid_weather");
        last = { weather, fetchedAt: clock(), serverNow: clock(), stale: clock() - weather.observedAt > 45 * 60000 };
        return last;
      } catch { retryAt = clock() + 60000; return fallback(); }
      finally { pending = null; }
    });
    return pending;
  };
}
