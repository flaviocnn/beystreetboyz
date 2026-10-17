export type Direction = "up" | "down" | "left" | "right";
export type Avatar = { avatarStyle: number; avatarColor: number };
export type PlayerPose = "standing" | "portrait" | "triumphant" | "reclining" | "challenge";
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

const INK = "#252d35", SKIN = "#efd9b6", SKIN_SHADE = "#c6a17c", PAPER = "#f5f1dc";
const STEEL = "#8599a6", STEEL_LIGHT = "#d7e4e6", GOLD = "#e4bd65";
function tint(hex: string, target: number, amount: number) {
  const channels = [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + target * amount));
  return `#${channels.map(value => value.toString(16).padStart(2, "0")).join("")}`;
}
// Precomputed palettes keep the map's per-frame drawing allocation-light.
const PALETTES = AVATAR_COLORS.map(({ hex }) => ({ main: hex, shade: tint(hex, 28, .38), light: tint(hex, 255, .38) }));

/** Shared 2px grid, constant foot anchor, rear-to-front layers and four real views.
 * Style/color IDs and map collision dimensions deliberately remain unchanged. */
export function drawPixelPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Direction, walking: boolean, t: number, avatar?: Avatar | null, requestedPose: PlayerPose = "standing") {
  const requestedStyle = avatar?.avatarStyle ?? 0;
  const selected = Number.isInteger(requestedStyle) && requestedStyle >= 0 && requestedStyle < AVATAR_STYLES.length ? requestedStyle : 0;
  const style = selected % BASE_STYLE_COUNT, feminine = selected >= BASE_STYLE_COUNT;
  const palette = PALETTES[avatar?.avatarColor ?? 0] || PALETTES[0];
  const { main, shade, light } = palette;
  const back = dir === "up", side = dir === "left" || dir === "right";
  const pose = dir === "down" ? requestedPose : "standing", reclining = pose === "reclining";
  const stride = pose === "standing" && walking && Number.isFinite(t) ? [0, 1, 0, -1][Math.floor(Math.max(0, t) / 130) % 4] : 0;
  const hair = style === 6 || style === 3 ? "#546775" : style === 4 || style === 7 ? shade : "#504238";
  const box = (color: string, px: number, py: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(px, py, w, h); };
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  if (reclining) { box("#25352b25", -27, 20, 57, 4); box("#25352b15", -30, 21, 64, 2); }
  else { box("#25352b25", -12, 24, 24, 4); box("#25352b15", -16, 25, 32, 2); }
  ctx.translate(0, stride ? -2 : 0);
  ctx.scale(dir === "left" ? -2 : 2, 2);
  // Only the reclining torso turns: its head stays upright and limbs are redrawn.
  ctx.save();
  if (reclining) { ctx.translate(-8, 3); ctx.rotate(-Math.PI / 2); }

  // Cloaks, wings and long hair belong behind the face and moving arms.
  if ([2, 3, 8, 10].includes(style)) {
    box(INK, -6, 2, 12, 10); box(shade, -5, 3, 10, 8);
    box(main, -5, 3, 2, 7); box(INK, -1, 10, 2, 2);
  }
  if (style === 7 || style === 11) {
    const wing = style === 7 ? GOLD : shade;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1);
      if (reclining) {
        box(INK, 4, 0, 3, 9); box(wing, 5, 1, 1, 7); box(main, 4, 4, 1, 4);
      } else {
        box(INK, 5, 0, 3, 9); box(INK, 8, -3, 2, 10); box(INK, 10, -5, 1, 9);
        box(wing, 6, 1, 2, 6); box(wing, 8, -2, 1, 7); box(main, 5, 5, 1, 4);
        if (style === 7) { box(PAPER, 9, -4, 1, 4); box(light, 6, 2, 1, 4); }
      }
      ctx.restore();
    }
  }
  if (style === 11 && !reclining) {
    box(INK, 6, 10, 4, 2); box(INK, 9, 7, 2, 4); box(main, 6, 10, 3, 1);
    box(main, 9, 7, 1, 3); box(INK, 8, 5, 4, 2); box(light, 9, 5, 1, 1);
  }
  if (!reclining && (feminine || style === 9)) {
    if (style === 1 || style === 9 || style === 5) {
      box(INK, -7, -5, 3, 9); box(hair, -6, -4, 2, 7); box(main, -7, -3, 2, 1);
      if (feminine && style === 9) { box(INK, 4, -5, 3, 8); box(hair, 5, -4, 1, 6); }
    } else {
      box(INK, -6, -5, 12, 8); box(hair, -5, -4, 10, 6);
      box(INK, -2, 2, 4, 2); box(light, -5, -2, 1, 3);
    }
  }

  // Alternating feet and hands, rather than sliding the whole lower body.
  for (const s of reclining ? [] : [-1, 1]) {
    const spread = pose === "challenge" ? 2 : pose === "triumphant" ? 1 : 0;
    const legX = (s < 0 ? -4 : 1) + s * spread, lift = s * stride;
    if (spread) box(INK, s < 0 ? -4 - spread : 1, 8, 3 + spread, 2);
    box(INK, legX, 8, 3, 5 + lift); box("#4d5962", legX + 1, 9, 1, 2);
    box(INK, legX - (side ? 0 : 1), 12 + lift, 4, 2);
    box(style === 1 ? PAPER : STEEL, legX, 13 + lift, 3, 1);
    if (style === 5) box(main, legX + 1, 9, 1, 3);
  }
  const torsoX = side ? -3 : -4, torsoW = side ? 7 : 8;
  box(INK, torsoX - 1, 3, torsoW + 2, 6);
  box(style === 5 || style === 9 || style === 10 ? shade : main, torsoX, 4, torsoW, 4);
  box(light, torsoX, 4, 1, 3); box(shade, torsoX + torsoW - 2, 5, 2, 3);
  box(INK, torsoX, 8, torsoW, 1);
  box(SKIN_SHADE, -1, 1, 3, 3); box(SKIN, -1, 2, 2, 1);

  if (style === 0) {
    if (back) { box(INK, -3, 4, 6, 5); box(shade, -2, 4, 4, 4); box(light, -2, 5, 4, 1); }
    else { box(PAPER, -3, 4, 1, 4); box(PAPER, 2, 4, 1, 4); box(GOLD, 0, 7, 1, 1); }
  } else if (style === 1) {
    box(PAPER, side ? 0 : -2, 5, side ? 2 : 4, 1); box(INK, -1, 7, 2, 1);
  } else if (style === 2) {
    box(INK, -5, 8, 10, 3); box(main, -4, 8, 8, 2); box(GOLD, 0, 5, 1, 4);
    if (!reclining) {
      const staffX = pose === "challenge" ? -9 : pose === "triumphant" ? 11 : 8;
      const staffY = pose === "triumphant" ? -10 : 0;
      box(INK, staffX, -2 + staffY, 2, 16); box("#9e7752", staffX, staffY, 1, 13);
      box(GOLD, staffX - 1, -3 + staffY, 4, 4); box(light, staffX, -2 + staffY, 2, 2);
    }
  } else if (style === 3 || style === 6) {
    box(STEEL, torsoX, 4, torsoW, 4); box(STEEL_LIGHT, torsoX, 4, torsoW - 1, 1);
    box(main, -1, 5, 2, 2); box(INK, -1, 8, 2, 1);
  } else if (style === 4 || style === 7 || style === 11) {
    box(INK, -2, 4, 4, 4); box(style === 7 ? GOLD : light, -1, 4, 2, 3);
    box(main, -2, 6, 4, 1);
  } else if (style === 5 || style === 9 || style === 10) {
    box(INK, -2, 4, 4, 4); box(main, -1, 4, 2, 3);
    box(STEEL_LIGHT, -4, 4, 1, 1); box(STEEL_LIGHT, 3, 4, 1, 1);
    if (back) { box(PAPER, -1, 5, 2, 2); box(INK, 0, 6, 1, 1); }
  } else if (style === 8) {
    box(INK, -3, 4, 6, 4); box(GOLD, -2, 4, 1, 4); box(GOLD, 1, 4, 1, 4);
    box(PAPER, -1, 4, 2, 2); box(main, -2, 8, 4, 1);
  }
  // Arm silhouettes stay clear of chest symbols. Profile uses the near arm only.
  const armor = style === 3 || style === 6, hand = armor ? STEEL_LIGHT : SKIN;
  if (pose === "triumphant") {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1);
      box(INK, 4, 2, 4, 3); box(INK, 6, 0, 4, 3); box(INK, 8, -5, 3, 7);
      box(armor ? STEEL : main, 5, 2, 2, 2); box(main, 7, 0, 2, 2); box(light, 9, -4, 1, 5);
      box(INK, 8, -8, 4, 4); box(hand, 9, -7, 2, 2); box(SKIN_SHADE, 10, -5, 1, 1);
      box(PAPER, 9, -4, 2, 1);
      ctx.restore();
    }
  } else if (pose === "challenge") {
    // A bent rear arm and a foreshortened, rounded glove aimed at the viewer.
    box(INK, -7, 3, 3, 5); box(main, -6, 4, 1, 3); box(INK, -8, 5, 4, 3); box(hand, -7, 6, 2, 1);
    box(INK, 4, 4, 6, 4); box(main, 5, 5, 4, 2); box(INK, 7, 1, 3, 5);
    box(INK, 8, -1, 5, 6); box(INK, 9, -2, 3, 1); box(INK, 13, 1, 1, 3);
    box(main, 9, -1, 3, 4); box(light, 9, 0, 2, 1); box(shade, 12, 1, 1, 3);
    box(PAPER, 8, 4, 4, 1); box(INK, 10, 2, 2, 1);
  } else if (pose === "portrait") {
    box(INK, -6, 4, 3, 5); box(main, -5, 4, 1, 3); box(hand, -5, 7, 1, 1);
    box(INK, 4, 3, 3, 3); box(main, 5, 4, 1, 1); box(INK, 5, 5, 3, 3);
    box(main, 6, 5, 1, 2); box(INK, 3, 7, 4, 2); box(hand, 4, 7, 2, 1);
  } else if (!reclining) {
    for (const s of side ? [1] : [-1, 1]) {
      const ax = s < 0 ? -6 : 4, swing = s * stride;
      box(INK, ax, 4 + swing, 3, 5);
      box(armor ? STEEL : main, ax + 1, 4 + swing, 1, 3);
      box(hand, ax + 1, 7 + swing, 1, 1);
    }
  }
  if (style === 3) {
    const sx = pose === "triumphant" ? -12 : -8, sy = pose === "triumphant" ? -3 : 5;
    box(INK, sx, sy, 4, 5); box(main, sx + 1, sy, 2, 4); box(GOLD, sx + 1, sy + 1, 2, 1);
    const swordX = pose === "triumphant" ? 10 : 7, swordY = pose === "triumphant" ? -14 : 1;
    box(INK, swordX, swordY, 1, 9); box(STEEL_LIGHT, swordX, swordY, 1, 6); box(GOLD, swordX - 1, swordY + 6, 3, 1);
  }
  if (style === 6) {
    box(INK, -7, 3, 3, 3); box(STEEL_LIGHT, -6, 3, 2, 1);
    box(INK, 4, 3, 3, 3); box(STEEL, 4, 3, 2, 2);
  }

  ctx.restore();
  if (reclining) {
    if (style === 11) {
      box(INK, 5, 8, 12, 2); box(INK, 15, 3, 2, 6); box(main, 6, 8, 10, 1);
      box(main, 15, 4, 1, 4); box(INK, 14, 1, 4, 2); box(light, 15, 1, 1, 1);
    }
    // Relaxed, asymmetric legs: one stretched out, one knee bent. No rotated feet.
    box(INK, 0, 2, 6, 4); box(INK, 4, 0, 5, 4); box(INK, 7, -1, 3, 6);
    box("#4d5962", 1, 3, 4, 2); box("#4d5962", 5, 1, 3, 2); box("#4d5962", 8, 0, 1, 3);
    box(INK, 9, 2, 4, 3); box(STEEL, 10, 4, 3, 1);
    box(INK, 0, 6, 12, 3); box("#4d5962", 1, 6, 10, 2); box(INK, 11, 6, 4, 4); box(STEEL, 12, 9, 3, 1);
    // Far arm supports the upright head; near hand rests across the torso.
    box(INK, -14, -4, 3, 6); box(INK, -13, 0, 4, 4); box(INK, -11, 2, 7, 3);
    box(main, -13, -2, 1, 3); box(main, -12, 1, 2, 2); box(main, -10, 3, 5, 1); box(hand, -13, -3, 2, 2);
    box(INK, -5, 0, 3, 6); box(main, -4, 1, 1, 4); box(INK, -4, 4, 6, 3); box(hand, -1, 4, 2, 1);
    if (style === 2) {
      box(INK, -7, 10, 23, 1); box("#9e7752", -6, 10, 21, 1);
      box(GOLD, -9, 9, 3, 3); box(light, -8, 10, 1, 1);
    }
  }
  ctx.save();
  if (reclining) {
    ctx.translate(-8, -2);
    if (feminine || style === 9) { box(INK, -6, -5, 12, 8); box(hair, -5, -4, 10, 6); }
    // Connect the head to the reclining shoulder instead of leaving it floating.
    box(INK, 1, 1, 3, 3); box(SKIN_SHADE, 1, 1, 2, 2);
  } else if (pose === "challenge") ctx.translate(-1, 1);
  // Stepped head contour, warm face, small eyes and a genuinely different profile.
  box(INK, -4, -9, 8, 1); box(INK, -5, -8, 10, 7); box(INK, -4, -1, 8, 2);
  box(hair, -4, -8, 8, 6); box("#75604b", -3, -8, 4, 1);
  if (!back) {
    box(SKIN_SHADE, side ? 0 : -4, -5, side ? 5 : 8, 5);
    box(SKIN, side ? 1 : -3, -5, side ? 4 : 6, 4);
    box(SKIN, side ? 5 : -5, -3, 1, 2); if (!side) box(SKIN_SHADE, 4, -3, 1, 2);
    box(hair, -4, -6, side ? 6 : 8, 2); box(hair, side ? -3 : -4, -4, 2, 2);
    if (side) { box(INK, 3, -3, 1, 1); box(SKIN_SHADE, 4, -1, 1, 1); }
    else { box(INK, -2, -3, 1, 1); box(INK, 2, -3, 1, 1); box(SKIN_SHADE, 0, -1, 2, 1); }
    if (feminine) box(hair, side ? 2 : -3, -4, side ? 2 : 1, 1);
  } else {
    box(hair, -4, -6, 8, 6); box("#75604b", -3, -7, 2, 3);
    if (feminine) { box(hair, -4, -1, 8, 4); box(main, -2, 1, 4, 1); }
  }

  // Headwear is directional too: no front visor or facial details on the back.
  if (style === 0 || style === 1) {
    box(INK, -5, -10, 9, 3); box(main, -4, -10, 7, 2); box(light, -3, -10, 3, 1);
    const brimX = side ? (style === 1 ? -7 : 3) : -5;
    box(INK, brimX, -8, side ? 5 : 10, 1); box(shade, brimX, -9, side ? 5 : 10, 1);
    if (back) box(PAPER, -1, -8, 2, 1);
  } else if (style === 2) {
    box(INK, -7, -9, 14, 2); box(INK, -4, -12, 9, 3); box(INK, -2, -15, 5, 3); box(INK, 1, -15, 2, 1);
    box(main, -4, -11, 8, 2); box(main, -2, -14, 4, 3); box(light, -1, -14, 1, 2);
    box(GOLD, -4, -10, 8, 1); box(PAPER, 1, -12, 1, 1);
  } else if (style === 3 || style === 6) {
    box(INK, -5, -10, 10, 5); box(STEEL, -4, -10, 8, 4); box(STEEL_LIGHT, -3, -10, 5, 1);
    box(STEEL, -5, -6, 2, 5); box(STEEL, 3, -6, 2, 5);
    if (style === 3) {
      box(INK, -1, -14, 3, 4); box(main, -1, -14, 2, 4); box(light, -1, -14, 1, 2);
      if (!back) box(STEEL_LIGHT, side ? 3 : 0, -6, 1, 3);
    } else {
      box(INK, -4, -6, 8, 3); box(back ? STEEL : main, -3, -5, 6, 1);
      if (!back) box(light, side ? 2 : -2, -5, 2, 1);
      box(STEEL, -3, -2, 6, 2); box(STEEL_LIGHT, -2, -2, 2, 1);
      if (feminine) { box(INK, -6, -8, 2, 3); box(main, -6, -7, 1, 2); }
    }
  } else if (style === 4 || style === 7) {
    for (const [px, py, height] of [[-4, -12, 4], [0, -15, 7], [3, -11, 3]]) {
      box(INK, px, py, 2, height); box(main, px, py + 1, 1, height - 1);
      box(style === 7 ? GOLD : light, px, py + 2, 1, 2);
    }
    box(shade, -4, -8, 8, 1);
  } else if (style === 5) {
    box(INK, -2, -15, 4, 7); box(main, -1, -15, 2, 7); box(light, -1, -14, 1, 3);
    if (side) { box(INK, -4, -12, 3, 4); box(main, -3, -11, 1, 3); }
    if (!back) box(STEEL_LIGHT, side ? 0 : -4, -1, 1, 1);
  } else if (style === 8) {
    box(INK, -5, -10, 10, 3); box(INK, -7, -10, 3, 4); box(INK, 4, -10, 3, 4);
    box("#43505a", -6, -9, 2, 1); box("#43505a", 4, -9, 2, 1);
    box(main, -4, -8, 8, 1); box(GOLD, side ? 3 : -1, -8, 1, 1);
  } else if (style === 9) {
    box(main, -4, -8, 5, 2); box(shade, -4, -6, 2, 2); box(GOLD, side ? 0 : 4, -1, 1, 1);
  } else if (style === 10) {
    box(INK, -4, -10, 8, 2); box(INK, -6, -8, 2, 9); box(INK, 4, -8, 2, 9);
    box(main, -4, -9, 8, 1); box(shade, -5, -7, 1, 7); box(shade, 4, -7, 1, 7);
    if (back) { box(shade, -4, -8, 8, 8); box(main, -3, -8, 1, 5); box(INK, -1, -1, 2, 1); }
    else { box(INK, side ? 1 : -3, -2, side ? 4 : 7, 3); box(main, side ? 2 : -2, -1, side ? 2 : 5, 1); }
  } else if (style === 11) {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1);
      box(INK, 3, -11, 3, 4); box(INK, 5, -14, 2, 4);
      box(GOLD, 4, -11, 1, 3); box(PAPER, 5, -13, 1, 3);
      ctx.restore();
    }
    if (!back) { box("#c54b58", side ? 3 : -2, -3, 1, 1); if (!side) box("#c54b58", 2, -3, 1, 1); }
    box(main, -3, -8, 6, 1);
  }
  ctx.restore();
  ctx.restore();
}
