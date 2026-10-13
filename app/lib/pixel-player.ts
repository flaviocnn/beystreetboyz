export type Direction = "up" | "down" | "left" | "right";
export type Avatar = { avatarStyle: number; avatarColor: number };
export const AVATAR_STYLES = ["Esploratore", "Skater", "Mago", "Cavaliere", "Cobalt Flame"];
export const AVATAR_COLORS = [
  { name: "Salvia", hex: "#9ba39b" }, { name: "Cobalto", hex: "#527fee" },
  { name: "Viola", hex: "#af79dc" }, { name: "Corallo", hex: "#ed737a" },
  { name: "Ambra", hex: "#edb94e" }, { name: "Smeraldo", hex: "#50b884" },
  { name: "Ghiaccio", hex: "#6fcbd2" }, { name: "Rosa", hex: "#e6a0cc" },
];

export function drawPixelPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Direction, walking: boolean, t: number, avatar?: Avatar | null) {
  const style = avatar?.avatarStyle ?? 0;
  const color = AVATAR_COLORS[avatar?.avatarColor ?? 0]?.hex || AVATAR_COLORS[0].hex;
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
  if (dir === "up") ctx.fillRect(-8, -7, 16, 10);
  else if (dir === "left") ctx.fillRect(-9, -4, 4, 4);
  else if (dir === "right") ctx.fillRect(5, -4, 4, 4);
  else {
    ctx.fillRect(-7, -4, 4, 4);
    ctx.fillRect(3, -4, 4, 4);
  }
  ctx.fillRect(-11, 6, 22, 13);
  ctx.fillStyle = color;
  ctx.fillRect(-6, 8, 12, 7);
  ctx.fillStyle = "#202322";
  ctx.fillRect(-11 - step, 18, 8, 8);
  ctx.fillRect(3 + step, 18, 8, 8);
  // Each silhouette is drawn on the same pixel grid and follows the player direction.
  if (style === 1) {
    ctx.fillStyle = color; ctx.fillRect(-10, -17, 20, 7);
    ctx.fillRect(dir === "left" ? -17 : 5, -12, 12, 4);
    ctx.fillRect(-15, 7, 5, 10); ctx.fillRect(10, 7, 5, 10);
    ctx.fillStyle = "#f2f3ea"; ctx.fillRect(-5, 10, 10, 3);
  } else if (style === 2) {
    ctx.fillStyle = "#202322"; ctx.fillRect(-16, -14, 32, 5); ctx.fillRect(-9, -23, 18, 10); ctx.fillRect(-4, -30, 8, 7);
    ctx.fillStyle = color; ctx.fillRect(-6, -21, 12, 8); ctx.fillRect(-2, -27, 4, 6); ctx.fillRect(-10, 12, 20, 9);
    ctx.fillStyle = "#edcf79"; ctx.fillRect(17, -1, 3, 27); ctx.fillRect(14, -5, 9, 7);
  } else if (style === 3) {
    ctx.fillStyle = "#87959b"; ctx.fillRect(-10, -17, 20, 10); ctx.fillRect(-14, -10, 5, 14); ctx.fillRect(9, -10, 5, 14);
    ctx.fillStyle = color; ctx.fillRect(-3, -24, 6, 9); ctx.fillRect(-17, 7, 10, 17);
    ctx.fillStyle = "#202322"; ctx.fillRect(-14, 10, 4, 9);
    ctx.fillStyle = "#dee3da"; ctx.fillRect(14, 3, 3, 18);
  } else if (style === 4) {
    ctx.fillStyle = color; ctx.fillRect(-7, -23, 5, 11); ctx.fillRect(2, -27, 5, 15); ctx.fillRect(9, -20, 5, 11);
    ctx.fillRect(-16, 6, 5, 13); ctx.fillRect(11, 6, 5, 13);
    ctx.fillStyle = "#202322"; ctx.fillRect(-7, 7, 14, 12);
    ctx.fillStyle = color; ctx.fillRect(-2, 8, 4, 9); ctx.fillRect(-5, 12, 10, 5);
  } else {
    ctx.fillStyle = color; ctx.fillRect(-8, -15, 16, 4); ctx.fillRect(-15, 8, 5, 11);
  }
  ctx.restore();
}
