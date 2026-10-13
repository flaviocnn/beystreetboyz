export type Direction = "up" | "down" | "left" | "right";

export function drawPixelPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Direction, walking: boolean, t: number) {
  const step = walking && Math.floor(t / 130) % 2 ? 2 : 0;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = "rgba(32,35,34,.18)";
  ctx.fillRect(-12, 15, 24, 7);
  ctx.fillStyle = "#202322";
  ctx.fillRect(-9, -15, 18, 5);
  ctx.fillRect(-13, -10, 26, 16);
  ctx.fillStyle = "#f2f3ea";
  ctx.fillRect(-8, -7, 16, 10);
  ctx.fillStyle = "#202322";
  if (dir === "left") ctx.fillRect(-9, -4, 4, 4);
  else if (dir === "right") ctx.fillRect(5, -4, 4, 4);
  else {
    ctx.fillRect(-7, -4, 4, 4);
    ctx.fillRect(3, -4, 4, 4);
  }
  ctx.fillRect(-11, 6, 22, 13);
  ctx.fillStyle = "#9ba39b";
  ctx.fillRect(-6, 8, 12, 7);
  ctx.fillStyle = "#202322";
  ctx.fillRect(-11 - step, 18, 8, 8);
  ctx.fillRect(3 + step, 18, 8, 8);
  ctx.restore();
}
