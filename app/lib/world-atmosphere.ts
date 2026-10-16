import { environmentTargets, type TorinoWeather } from "./world-weather";
export type AtmospherePaint = ReturnType<typeof environmentTargets> & { last: number };
export function createAtmospherePaint(): AtmospherePaint { return { darkness: 0, warmth: 0, rain: 0, snow: 0, fog: 0, wind: 0, last: 0 }; }
export function drawWorldAtmosphere(ctx: CanvasRenderingContext2D, width: number, height: number, frameTime: number, state: { now: number | null; weather: TorinoWeather | null; reducedMotion: boolean }, paint: AtmospherePaint, indoor = false) {
  if (state.now === null) return;
  const target = environmentTargets(state.now, state.weather, indoor), dt = paint.last ? Math.min(100, frameTime - paint.last) : 16;
  paint.last = frameTime;
  for (const key of ["darkness", "warmth", "rain", "snow", "fog", "wind"] as const) paint[key] += (target[key] - paint[key]) * Math.min(1, dt / 1800);
  ctx.save();
  ctx.fillStyle = `rgba(14,26,53,${paint.darkness})`; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = `rgba(244,162,88,${paint.warmth})`; ctx.fillRect(0, 0, width, height);
  if (paint.fog > .005) {
    ctx.fillStyle = `rgba(216,226,226,${paint.fog})`; ctx.fillRect(0, 0, width, height);
  }
  if (!indoor) {
    const time = state.reducedMotion ? 0 : frameTime / 1000;
    const count = Math.min(state.reducedMotion ? 16 : 110, Math.ceil(width * height / 15000));
    const wrap = (value: number, max: number) => ((value % max) + max) % max;
    if (paint.rain > .02) {
      ctx.fillStyle = `rgba(161,196,216,${paint.rain * .75})`;
      for (let i = 0; i < count; i++) {
        const y = wrap(i * 137 + time * (280 + i % 5 * 20), height + 20) - 10;
        const x = wrap(i * 193 + time * paint.wind * 180, width);
        ctx.fillRect(Math.round(x), Math.round(y), 2, 8 + i % 5);
        if (Math.abs(paint.wind) > .15) ctx.fillRect(Math.round(x + Math.sign(paint.wind) * 2), Math.round(y + 6), 2, 5);
      }
    }
    if (paint.snow > .02) {
      ctx.fillStyle = `rgba(249,251,244,${paint.snow * .85})`;
      for (let i = 0; i < count; i++) {
        const x = wrap(i * 173 + time * paint.wind * 65 + Math.sin(time + i) * 9, width);
        const y = wrap(i * 113 + time * (25 + i % 5 * 7), height);
        ctx.fillRect(Math.round(x), Math.round(y), 2 + i % 2, 2 + i % 2);
      }
    }
  }
  ctx.restore();
}
