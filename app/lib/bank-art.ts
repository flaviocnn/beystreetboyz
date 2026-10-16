import { drawPixelPlayer, type Avatar } from "./pixel-player";
function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
function label(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 14, color = "#f7f0d9") { ctx.font = `bold ${size}px monospace`; ctx.textAlign = "center"; ctx.fillStyle = color; ctx.fillText(value, x, y); }
export function drawBankExterior(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  rect(ctx, "#20232225", -59, -102, 136, 195);
  rect(ctx, "#26352d", -68, -112, 136, 194); rect(ctx, "#dfe3d2", -61, -104, 122, 177);
  for (let row = 0; row < 7; row++) rect(ctx, "#b3bdab", -60, -95 + row * 24, 120, 2);
  // Stepped triangular pediment, marble colonnade and a heavy gilded vault door.
  for (let row = 0; row < 6; row++) rect(ctx, row % 2 ? "#dfe3d2" : "#adb9a7", -68 + row * 10, -116 - row * 8, 136 - row * 20, 8);
  rect(ctx, "#26352d", -71, -116, 142, 8); rect(ctx, "#d5bd77", -7, -145, 14, 16);
  for (const column of [-54, -30, 24, 48]) {
    rect(ctx, "#829180", column, -97, 12, 158); rect(ctx, "#f6f4e5", column + 2, -91, 6, 146);
    rect(ctx, "#ced6c2", column - 4, -103, 20, 9); rect(ctx, "#ced6c2", column - 4, 58, 20, 10);
  }
  rect(ctx, "#26352d", -20, 18, 40, 51); rect(ctx, "#9b844d", -16, 23, 32, 43);
  rect(ctx, "#d9c187", -12, 27, 24, 35); rect(ctx, "#27372d", -2, 27, 4, 35);
  rect(ctx, "#27372d", -8, 41, 16, 5); rect(ctx, "#f7edbe", -5, 38, 10, 10);
  rect(ctx, "#a6b59e", -69, 70, 138, 8); rect(ctx, "#d9deca", -76, 78, 152, 8);
  rect(ctx, "#26352d", -56, -19, 112, 24); label(ctx, "BANCA", 0, -2, 14, "#ead6a0");
  label(ctx, "INTESA", 0, 102, 12, "#26352d"); ctx.restore();
}
function ratClerk(ctx: CanvasRenderingContext2D, x: number, y: number, now: number, coat: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(2, 2);
  rect(ctx, "#192820", -14, -22, 28, 48); rect(ctx, coat, -11, -1, 22, 25);
  rect(ctx, "#a9a28b", -12, -23, 24, 23); rect(ctx, "#d0b5a1", -17, -28, 10, 11); rect(ctx, "#d0b5a1", 7, -28, 10, 11);
  rect(ctx, "#eee0bd", -7, -17, 14, 14); rect(ctx, "#202d25", -8, -16, 4, 4); rect(ctx, "#202d25", 4, -16, 4, 4);
  rect(ctx, "#b98580", -3, -9, 6, 4); rect(ctx, "#f5ead4", -2, -4, 4, 5);
  for (const dx of [-16, 8]) { rect(ctx, "#424c3d", dx, -10, 8, 1); rect(ctx, "#424c3d", dx, -6, 8, 1); }
  rect(ctx, "#f1e6bd", -2, 1, 4, 17); rect(ctx, "#d7b972", -4, 6, 8, 4);
  const hand = Math.floor(now / 260) % 2;
  rect(ctx, "#bcb299", -17, 11 + hand * 2, 8, 6); rect(ctx, "#bcb299", 9, 11, 8, 6);
  rect(ctx, "#d8bc76", -19, 10 + hand * 2, 3, 10); ctx.restore();
}
export function drawBankRoom(ctx: CanvasRenderingContext2D, now: number, player: { x: number; y: number; dir: "up" | "down" | "left" | "right"; walking: boolean }, avatar: Avatar) {
  const dark = "#1e3027", gold = "#dec68b";
  rect(ctx, "#d3dcc6", 0, 0, 1000, 540);
  for (let y = 170; y < 540; y += 40) for (let x = 0; x < 1000; x += 40) rect(ctx, (x + y) % 80 ? "#e8eadb" : "#bbcbb1", x, y, 39, 39);
  rect(ctx, dark, 0, 0, 1000, 168); rect(ctx, gold, 0, 164, 1000, 8);
  label(ctx, "GRINGOTTS DELLA GILDA", 500, 45, 25, gold); label(ctx, "UN CENTESIMO NON SI PERDE. UN INCASSO NON SI DUPLICA.", 500, 72, 12);
  rect(ctx, "#6e856b", 396, 87, 208, 154); rect(ctx, gold, 406, 96, 188, 135); rect(ctx, dark, 415, 105, 170, 117);
  ctx.strokeStyle = "#91a28a"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(500, 163, 42, 0, Math.PI * 2); ctx.stroke();
  rect(ctx, gold, 496, 128, 8, 70); rect(ctx, gold, 465, 159, 70, 8);
  for (const x of [48, 340, 632, 924]) {
    const top = x === 340 || x === 632 ? 92 : 14;
    rect(ctx, "#93a68b", x, top, 27, 249 - top); rect(ctx, "#eceddb", x + 5, top + 8, 14, 236 - top);
    rect(ctx, "#d5dec4", x - 9, top, 45, 17); rect(ctx, "#b0c0a1", x - 9, 237, 45, 14);
  }
  for (const [x, coat] of [[240, "#465f4b"], [500, "#644d45"], [760, "#47556d"]] as const) {
    ratClerk(ctx, x, 240, now, coat);
    rect(ctx, dark, x - 90, 269, 180, 54); rect(ctx, "#6e8763", x - 82, 276, 164, 38); rect(ctx, gold, x - 86, 269, 172, 6);
    rect(ctx, "#f4edd4", x - 29, 279, 58, 26); rect(ctx, "#576c51", x - 22, 284, 44, 3); rect(ctx, "#576c51", x - 22, 294, 30, 3);
    for (let i = 0; i < 3; i++) rect(ctx, gold, x + 39 + i * 9, 289 - i * 4, 12, 7);
  }
  label(ctx, "RATILDE", 240, 348, 12, dark); label(ctx, "REGISTRO INTROITI", 500, 348, 12, dark); label(ctx, "MASTRO RODI", 760, 348, 12, dark);
  rect(ctx, "#4d6b51", 440, 395, 120, 145); rect(ctx, gold, 446, 395, 3, 145); rect(ctx, gold, 551, 395, 3, 145);
  drawPixelPlayer(ctx, player.x, player.y, player.dir, player.walking, now, avatar);
}
