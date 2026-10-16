import { createWeatherService } from "../../../lib/weather-service";
const readWeather = createWeatherService((url, init) => fetch(url, init));
export async function GET() {
  const data = await readWeather();
  return Response.json(data, { status: data.weather ? 200 : 503, headers: { "Cache-Control": data.stale ? "public, max-age=0, s-maxage=60" : "public, max-age=60, s-maxage=300, stale-if-error=10800" } });
}
