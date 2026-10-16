import { drawPixelPlayer, type Avatar } from "./pixel-player";
export function drawChampionThrone(ctx: CanvasRenderingContext2D, x: number, y: number, avatar: Avatar | null, now = 0, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const box = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const gold = "#e9c76c", dark = "#29352e";
  ctx.globalAlpha = .12 + Math.sin(now / 1100) * .03;
  for (let i = 0; i < 4; i++) box(gold, -82 + i * 7, -113 + i * 7, 164 - i * 14, 180 - i * 14);
  ctx.globalAlpha = 1;
  box(dark, -61, -98, 122, 152); box(gold, -55, -94, 110, 144);
  box("#826342", -48, -87, 96, 133); box("#563b57", -42, -81, 84, 117);
  for (const tx of [-38, -6, 26]) { box(gold, tx, -108, 12, 17); box("#fff1b6", tx + 3, -110, 6, 6); }
  box("#b69651", -49, 30, 98, 18);
  if (avatar) {
    ctx.save(); ctx.translate(0, -8); ctx.scale(1.6, 1.6); drawPixelPlayer(ctx, 0, 0, "down", false, 0, avatar); ctx.restore();
    box(gold, -16, -38, 32, 7);
    for (const tx of [-16, -3, 10]) box("#fff1b6", tx, -45, 6, 9);
    box("#bc6262", -2, -36, 4, 4);
  }
  for (const tx of [-61, 39]) { box(dark, tx, 0, 22, 46); box(gold, tx + 3, 3, 16, 10); box("#a58b54", tx + 5, 17, 12, 27); }
  box(dark, -70, 48, 140, 13); box(gold, -65, 48, 130, 6);
  box("#8d9c7b", -78, 61, 156, 10); box("#b7c2a0", -86, 71, 172, 8);
  ctx.restore();
}
