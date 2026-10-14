export type Direction = "up" | "down" | "left" | "right";
export type Avatar = { avatarStyle: number; avatarColor: number };
export const BASE_STYLE_COUNT = 12;
export const AVATAR_STYLES = [
  "Esploratore", "Skater", "Mago", "Cavaliere", "Cobalt Flame",
  "BeyStreetBoyz", "Metallico", "Fenice", "Torero Nero", "Bad Girl", "Bad Guy", "Demoniaco",
  "Esploratrice", "Skater · donna", "Maga", "Cavaliera", "Cobalt Flame · donna",
  "BeyStreetGirl", "Metallica", "Fenice · donna", "Torera Nera", "Bad Girl · alternativa", "Bad Girl · Hood", "Demoniaca",
];
export const AVATAR_COLORS = [
  { name: "Salvia", hex: "#9ba39b" }, { name: "Cobalto", hex: "#527fee" },
  { name: "Viola", hex: "#af79dc" }, { name: "Corallo", hex: "#ed737a" },
  { name: "Ambra", hex: "#edb94e" }, { name: "Smeraldo", hex: "#50b884" },
  { name: "Ghiaccio", hex: "#6fcbd2" }, { name: "Rosa", hex: "#e6a0cc" },
];

export function drawPixelPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Direction, walking: boolean, t: number, avatar?: Avatar | null) {
  const selectedStyle = avatar?.avatarStyle ?? 0;
  const feminine = selectedStyle >= BASE_STYLE_COUNT;
  const style = selectedStyle % BASE_STYLE_COUNT;
  const color = AVATAR_COLORS[avatar?.avatarColor ?? 0]?.hex || AVATAR_COLORS[0].hex;
  const step = walking && Math.floor(t / 130) % 2 ? 2 : 0;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = "rgba(32,35,34,.18)";
  ctx.fillRect(-11, 23, 22, 4); ctx.fillRect(-15, 24, 30, 2);
  ctx.translate(0, walking ? -step / 2 : 0);
  ctx.fillStyle = "#202322";
  ctx.fillRect(-9, -15, 18, 5);
  ctx.fillRect(-13, -10, 26, 16);
  ctx.fillStyle = "#f2f3ea";
  ctx.fillRect(-8, -7, 16, 10);
  ctx.fillStyle = "#c5cbb9"; ctx.fillRect(-8, 0, 16, 3);
  ctx.fillStyle = "#71806d"; ctx.fillRect(-8, -13, 8, 3);
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
  ctx.fillRect(-15, 7 + step, 5, 10); ctx.fillRect(10, 9 - step, 5, 10);
  ctx.fillStyle = "#e4e8da";
  ctx.fillRect(-14, 14 + step, 3, 4); ctx.fillRect(11, 16 - step, 3, 4);
  ctx.fillStyle = "#202322";
  ctx.fillRect(-9, 18 + step, 7, 7);
  ctx.fillRect(3, 20 - step, 7, 7);
  ctx.fillStyle = "#7d897c"; ctx.fillRect(-9, 23 + step, 7, 2); ctx.fillRect(3, 25 - step, 7, 2);
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
  } else if (style === 5) {
    // Punk: tall mohawk, studded jacket and bright trouser stripe.
    ctx.fillStyle = "#202322"; ctx.fillRect(-4, -32, 8, 20); ctx.fillRect(-13, 7, 26, 13);
    ctx.fillStyle = color; ctx.fillRect(-3, -31, 6, 17); ctx.fillRect(-12, -26, 5, 13);
    ctx.fillRect(-9, 10, 18, 4); ctx.fillRect(-14, 10, 4, 9); ctx.fillRect(10, 10, 4, 9);
    ctx.fillStyle = "#f2f3ea"; ctx.fillRect(-7, 15, 3, 3); ctx.fillRect(4, 15, 3, 3);
  } else if (style === 6) {
    // Metallic: angular helmet, reflective visor and armored shoulders.
    ctx.fillStyle = "#737f85"; ctx.fillRect(-12, -19, 24, 13); ctx.fillRect(-17, 6, 8, 12); ctx.fillRect(9, 6, 8, 12);
    ctx.fillStyle = "#dfe6e8"; ctx.fillRect(-9, -17, 18, 5); ctx.fillRect(-8, 8, 16, 9);
    ctx.fillStyle = color; ctx.fillRect(-9, -9, 18, 4); ctx.fillRect(-4, 11, 8, 4);
    ctx.fillStyle = "#202322"; ctx.fillRect(-12, -6, 24, 3); ctx.fillRect(-3, -22, 6, 4);
  } else if (style === 7) {
    // Phoenix: feathered crest and two distinct flame wings.
    ctx.fillStyle = color; ctx.fillRect(-6, -29, 6, 15); ctx.fillRect(2, -34, 5, 20);
    ctx.fillRect(-18, 1, 7, 18); ctx.fillRect(11, 1, 7, 18);
    ctx.fillStyle = "#edb94e"; ctx.fillRect(-22, -8, 6, 19); ctx.fillRect(16, -8, 6, 19);
    ctx.fillRect(-15, 8, 7, 10); ctx.fillRect(8, 8, 7, 10);
    ctx.fillStyle = color; ctx.fillRect(-8, 8, 16, 10);
    ctx.fillStyle = "#f2f3ea"; ctx.fillRect(-3, 10, 6, 5);
  } else if (style === 8) {
    // Torero Nero: broad dark hat, colored band and flowing cape.
    ctx.fillStyle = "#202322"; ctx.fillRect(-20, -19, 40, 6); ctx.fillRect(-13, -29, 26, 13);
    ctx.fillRect(-18, 5, 8, 18); ctx.fillRect(10, 5, 8, 18);
    ctx.fillStyle = color; ctx.fillRect(-12, -22, 24, 4); ctx.fillRect(-17, 10, 7, 9);
    ctx.fillRect(10, 10, 7, 9); ctx.fillRect(-7, 8, 14, 9);
    ctx.fillStyle = "#edb94e"; ctx.fillRect(-3, 8, 6, 12);
  } else if (style === 9) {
    // Bad Girl: side ponytail, asymmetrical fringe and studded jacket.
    ctx.fillStyle = "#202322"; ctx.fillRect(-11, -21, 22, 10); ctx.fillRect(11, -20, 7, 19);
    ctx.fillRect(-14, 8, 28, 11); ctx.fillRect(15, 4, 4, 6);
    ctx.fillStyle = color; ctx.fillRect(-9, -18, 10, 5); ctx.fillRect(13, -18, 4, 13);
    ctx.fillRect(-8, 10, 16, 6);
    ctx.fillStyle = "#f2f3ea"; ctx.fillRect(-11, 14, 3, 3); ctx.fillRect(8, 14, 3, 3);
  } else if (style === 10) {
    // Bad Guy: hood, mask and dark coat.
    ctx.fillStyle = "#202322"; ctx.fillRect(-15, -21, 30, 20); ctx.fillRect(-16, 7, 32, 15);
    ctx.fillStyle = color; ctx.fillRect(-12, -18, 24, 5); ctx.fillRect(-12, 7, 5, 13);
    ctx.fillRect(7, 7, 5, 13); ctx.fillRect(-5, 10, 10, 3);
    ctx.fillStyle = "#f2f3ea"; ctx.fillRect(-8, -8, 16, 5);
    ctx.fillStyle = "#202322"; ctx.fillRect(-7, -6, 14, 3);
  } else if (style === 11) {
    // Horns, bat wings, glowing eyes and a forked tail.
    ctx.fillStyle = "#27202f";
    ctx.fillRect(-20, 0, 9, 19); ctx.fillRect(11, 0, 9, 19);
    ctx.fillRect(-23, -6, 5, 16); ctx.fillRect(18, -6, 5, 16);
    ctx.fillStyle = color;
    ctx.fillRect(-19, 3, 6, 11); ctx.fillRect(13, 3, 6, 11);
    ctx.fillRect(-12, -24, 5, 13); ctx.fillRect(7, -24, 5, 13);
    ctx.fillStyle = "#f1d8b1";
    ctx.fillRect(-14, -28, 4, 8); ctx.fillRect(10, -28, 4, 8);
    ctx.fillStyle = "#e86f52";
    if (dir !== "up") { ctx.fillRect(-7, -4, 4, 3); ctx.fillRect(3, -4, 4, 3); }
    ctx.fillRect(15, 17, 3, 10); ctx.fillRect(16, 24, 6, 3); ctx.fillRect(20, 18, 3, 7);
    ctx.fillStyle = color; ctx.fillRect(-6, 8, 12, 9);
    ctx.fillStyle = "#f1d8b1"; ctx.fillRect(-2, 9, 4, 5);
  } else {
    ctx.fillStyle = color; ctx.fillRect(-8, -15, 16, 4); ctx.fillRect(-15, 8, 5, 11);
  }
  if (feminine) {
    // Outfit-specific hair and tailoring preserve each skin's silhouette.
    const hair = style === 6 || style === 3 ? "#aab8bf" : style === 7 || style === 4 ? color : "#414039";
    ctx.fillStyle = "#202322";
    if (style === 5) { ctx.fillRect(10, -17, 7, 21); ctx.fillStyle = color; ctx.fillRect(12, -15, 3, 17); }
    else if (style === 9 || style === 1) {
      ctx.fillRect(-19, -12, 7, 17); ctx.fillRect(12, -12, 7, 17);
      ctx.fillStyle = hair; ctx.fillRect(-18, -10, 4, 12); ctx.fillRect(14, -10, 4, 12);
    } else {
      ctx.fillRect(-14, -6, 5, 18); ctx.fillRect(9, -6, 5, 18);
      ctx.fillStyle = hair; ctx.fillRect(-13, -4, 3, 13); ctx.fillRect(10, -4, 3, 13);
    }
    ctx.fillStyle = color; ctx.fillRect(-13, 6, 3, 3); ctx.fillRect(10, 6, 3, 3);
    ctx.fillStyle = "#202322"; ctx.fillRect(-9, 10, 3, 7); ctx.fillRect(6, 10, 3, 7);
    ctx.fillStyle = "#ecdfb4"; ctx.fillRect(-5, 16, 10, 2);
  }
  // Shared small highlights keep every outfit readable at map scale.
  ctx.fillStyle = "#ffffff35"; ctx.fillRect(-6, 8, 3, 7);
  ctx.fillStyle = "#101b2138"; ctx.fillRect(5, 9, 3, 9);
  if (dir === "up") {
    ctx.fillStyle = "#303a34"; ctx.fillRect(-7, -6, 14, 8);
    ctx.fillStyle = "#647160"; ctx.fillRect(-6, -5, 4, 3);
    ctx.fillStyle = color; ctx.fillRect(-5, 9, 10, 8);
    ctx.fillStyle = "#ffffff55"; ctx.fillRect(-3, 10, 6, 2);
    ctx.fillStyle = "#202322"; ctx.fillRect(-5, 15, 10, 2);
  } else if (style !== 6 && style !== 10 && style !== 11) {
    ctx.fillStyle = "#ffffff";
    if (dir !== "right") ctx.fillRect(-6, -4, 1, 1);
    if (dir !== "left") ctx.fillRect(4, -4, 1, 1);
    ctx.fillStyle = "#75816c"; ctx.fillRect(dir === "left" ? -7 : dir === "right" ? 5 : -2, 1, 3, 1);
  }
  ctx.restore();
}
