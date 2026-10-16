import type { Direction } from "./pixel-player";

export const WALK_SPEED = .19;
export const INTERACTION_RADIUS = 120;
export const KEY_DIRECTIONS: Record<string, Direction> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
export function playerHitsSolid(x: number, y: number, rect: { x: number; y: number; w: number; h: number }) {
  return x + 13 > rect.x && x - 13 < rect.x + rect.w && y + 23 > rect.y && y + 9 < rect.y + rect.h;
}
export function drawInteractionSpot(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.fillStyle = "#f4e4a1"; ctx.fillRect(x - 15, y - 15, 30, 30);
  ctx.strokeStyle = "#536b45"; ctx.lineWidth = 2; ctx.strokeRect(x - 20, y - 20, 40, 40);
  ctx.fillStyle = "#293b2c"; ctx.font = "bold 18px monospace"; ctx.textAlign = "center"; ctx.fillText("!", x, y + 7); ctx.restore();
}
export function worldCamera(width: number, height: number, player: { x: number; y: number }, world: { width: number; height: number }) {
  // CSS pixels, not device pixels: identical sprites and walking speed in both rooms.
  const scale = Math.min(1, Math.max(.5, Math.min(width, height) / 600));
  const axis = (size: number, viewport: number, position: number, anchor: number) => viewport > size
    ? (size - viewport) / 2 : Math.max(0, Math.min(size - viewport, position - viewport * anchor));
  return { scale, x: axis(world.width, width / scale, player.x, .5), y: axis(world.height, height / scale, player.y, .78) };
}
export function isWorldInputTarget(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('input, textarea, select, button, a, summary, [contenteditable="true"], [role="dialog"], [data-world-weather], [data-world-menu]');
}
export function drawWorldOverview(ctx: CanvasRenderingContext2D, world: { width: number; height: number }, player: { x: number; y: number }, places: { x: number; y: number; symbol?: string }[]) {
  const size = 136, x = ctx.canvas.width - size - 16, y = ctx.canvas.width <= 600 ? 174 : 132;
  const scale = (size - 24) / Math.max(world.width, world.height);
  ctx.save(); ctx.fillStyle = "#f2f3ea"; ctx.fillRect(x, y, size, size); ctx.strokeStyle = "#25352b"; ctx.lineWidth = 2; ctx.strokeRect(x, y, size, size);
  ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
  for (const place of places) { ctx.fillStyle = "#3c5941"; ctx.fillText(place.symbol || "◆", x + 12 + place.x * scale, y + 18 + place.y * scale); }
  ctx.fillStyle = "#b64239"; ctx.fillRect(x + 9 + player.x * scale, y + 9 + player.y * scale, 7, 7);
  ctx.restore();
}
