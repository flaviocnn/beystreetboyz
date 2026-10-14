import { drawPixelPlayer, type Avatar } from "../../lib/pixel-player";

export type PlaceId = "board" | "mirror" | "champion" | "library";
export const WORLD = { width: 1450, height: 1080 };
export const START = { x: 725, y: 700 };
export const PLACES: { id: PlaceId; name: string; x: number; y: number; symbol: string }[] = [
  { id: "board", name: "Classifica della Gilda", x: 725, y: 505, symbol: "B" },
  { id: "mirror", name: "Specchio dei blader", x: 310, y: 535, symbol: "S" },
  { id: "champion", name: "Statua di GranBurstone", x: 1120, y: 535, symbol: "C" },
  { id: "library", name: "Libreria dei giochi", x: 360, y: 875, symbol: "L" },
];
const SOLIDS = [
  { x: 588, y: 305, w: 274, h: 151 },
  { x: 218, y: 260, w: 184, h: 240 },
  { x: 1035, y: 285, w: 170, h: 210 },
  { x: 204, y: 663, w: 312, h: 170 },
  { x: 987, y: 740, w: 190, h: 95 },
  { x: 92, y: 586, w: 52, h: 70 },
  { x: 1306, y: 586, w: 52, h: 70 },
];
export function canWalk(x: number, y: number) {
  return x >= 36 && x <= WORLD.width - 36 && y >= 225 && y <= WORLD.height - 40
    && !SOLIDS.some((r) => x + 13 > r.x && x - 13 < r.x + r.w && y + 23 > r.y && y + 9 < r.y + r.h);
}
export function nearbyPlace(x: number, y: number): PlaceId | null {
  const closest = PLACES.map((p) => ({ p, d: Math.hypot(x - p.x, y - p.y) })).sort((a, b) => a.d - b.d)[0];
  return closest.d < 108 ? closest.p.id : null;
}
function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = "#27332a", size = 13) {
  ctx.fillStyle = color; ctx.font = `bold ${size}px ui-monospace, monospace`; ctx.textAlign = "center"; ctx.fillText(text, x, y);
}
export function drawChampion(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  rect(ctx, "#28332f", -49, 39, 98, 17);
  rect(ctx, "#889985", -43, 30, 86, 16);
  rect(ctx, "#c3cdaf", -33, 0, 66, 34);
  rect(ctx, "#78866d", -33, 22, 66, 8);
  // A bronze champion holds a launcher and the previous season's trophy.
  rect(ctx, "#3f463b", -21, -45, 42, 47);
  rect(ctx, "#aa9864", -16, -46, 32, 37);
  rect(ctx, "#d8c482", -12, -43, 9, 31);
  rect(ctx, "#59604b", -21, -9, 16, 16); rect(ctx, "#59604b", 5, -9, 16, 16);
  rect(ctx, "#3f463b", -23, -79, 46, 35);
  rect(ctx, "#bba875", -17, -72, 34, 26);
  rect(ctx, "#dec98b", -17, -72, 11, 26);
  rect(ctx, "#3f463b", -9, -64, 5, 5); rect(ctx, "#3f463b", 7, -64, 5, 5);
  rect(ctx, "#d8bc64", -24, -87, 48, 10);
  for (const i of [-20, -4, 12]) rect(ctx, "#ead48e", i, -96, 8, 12);
  rect(ctx, "#bba875", -35, -45, 16, 12); rect(ctx, "#bba875", 19, -54, 16, 12);
  rect(ctx, "#46524e", -43, -34, 28, 8); rect(ctx, "#8fa39a", -37, -38, 16, 8);
  rect(ctx, "#574f35", 27, -69, 10, 23); rect(ctx, "#ead48e", 17, -88, 30, 20);
  rect(ctx, "#aa884b", 22, -73, 20, 10); rect(ctx, "#ead48e", 23, -53, 18, 5);
  ctx.restore();
}
export const GAMES = [
  { title: "Scacchi", kind: "Strategia", color: "#a6b6a1", text: "Un re da proteggere, una mossa alla volta. Il tavolo della strategia aspetta il prossimo sfidante." },
  { title: "Dama", kind: "Duello", color: "#cd9280", text: "Pedine rosse e nere, diagonali e sorprese. Un classico per una sfida tra due membri." },
  { title: "Domino", kind: "Tessere", color: "#d0bd85", text: "Una scatola piena di tessere e combinazioni. Qualcuno ha già mescolato i pezzi sul tavolo." },
  { title: "Mancala", kind: "Tattica", color: "#9cbaad", text: "Piccole pietre, tante possibilità. Conta, distribuisci e prepara la tua prossima mossa." },
  { title: "Backgammon", kind: "Dadi e strategia", color: "#a6a6ce", text: "Dadi e pedine si incontrano sul tabellone. Fortuna e tattica siedono allo stesso tavolo." },
  { title: "Reversi", kind: "Controllo del territorio", color: "#95b8c4", text: "Una pedina può cambiare tutto: la Gilda custodisce anche il tabellone dei grandi ribaltamenti." },
  { title: "Scale e serpenti", kind: "Percorso", color: "#c4a3b0", text: "Una salita, una discesa e un lancio di dadi. La scatola più imprevedibile dello scaffale." },
  { title: "Ludo", kind: "Sfida a colori", color: "#c6c28e", text: "Quattro colori e una corsa verso casa. Il rito perfetto per ritrovarsi dopo la ranked." },
];

// The room is painted once into an offscreen canvas; only players and markers animate.
export function drawGuildWorld(ctx: CanvasRenderingContext2D) {
  rect(ctx, "#dbe0d3", 0, 0, WORLD.width, WORLD.height);
  for (let y = 200; y < WORLD.height; y += 42) for (let x = 0; x < WORLD.width; x += 42) {
    rect(ctx, (Math.floor(x / 42) + Math.floor(y / 42)) % 2 ? "#e7e9dd" : "#d3dbce", x, y, 41, 41);
    rect(ctx, "#becbb8", x + 3, y + 3, 3, 3);
  }
  rect(ctx, "#a1b394", 618, 200, 214, 880); rect(ctx, "#526a56", 630, 200, 190, 880);
  rect(ctx, "#a1b394", 230, 580, 990, 76); rect(ctx, "#61795d", 230, 588, 990, 60);
  for (let y = 228; y < 1060; y += 54) for (const x of [642, 796]) rect(ctx, "#93aa85", x, y, 12, 12);
  rect(ctx, "#27332a", 0, 0, WORLD.width, 185);
  for (let x = 30; x < WORLD.width; x += 65) rect(ctx, "#35473b", x, 25, 52, 140);
  rect(ctx, "#8a9f82", 0, 185, WORLD.width, 18);
  label(ctx, "RANKED", 725, 65, "#b9cbaa", 22);
  label(ctx, "BeyStreetBoyz", 725, 117, "#edf1df", 42);
  label(ctx, "LA GILDA DEL GRIFONE", 725, 152, "#b9cbaa", 13);
  for (const x of [130, 1320]) {
    rect(ctx, "#9ead8a", x - 32, 32, 64, 125); label(ctx, "G", x, 116, "#27332a", 68);
    rect(ctx, "#344935", x - 26, 586, 52, 70); rect(ctx, "#8da284", x - 20, 575, 40, 67);
    rect(ctx, "#c1ccab", x - 30, 574, 60, 12);
  }
  // Leaderboard.
  rect(ctx, "#27332a", 588, 305, 274, 151); rect(ctx, "#e9eedb", 596, 313, 258, 135);
  rect(ctx, "#27332a", 608, 325, 234, 28); label(ctx, "CLASSIFICA DELLA GILDA", 725, 344, "#edf1df", 14);
  for (let i = 0; i < 3; i++) { rect(ctx, "#627953", 620, 370 + i * 22, 18, 11); rect(ctx, "#879b76", 650, 370 + i * 22, 158 - i * 30, 11); }
  // Full-length mirror and golden frame.
  rect(ctx, "#30372e", 218, 267, 184, 232); rect(ctx, "#bdad76", 224, 259, 172, 230);
  rect(ctx, "#776e49", 237, 272, 146, 203); rect(ctx, "#a7c6c2", 245, 281, 130, 187);
  rect(ctx, "#d5e7d9", 254, 291, 10, 145); rect(ctx, "#d5e7d9", 270, 295, 6, 96);
  rect(ctx, "#8ca9a5", 284, 450, 82, 10);
  for (const x of [218, 385]) { rect(ctx, "#dec990", x, 248, 17, 20); rect(ctx, "#dec990", x, 478, 17, 23); }
  label(ctx, "SPECCHIO DEI BLADER", 310, 239);
  // Champion alcove, pedestal and plaque.
  rect(ctx, "#bcc9b0", 1018, 288, 204, 210); rect(ctx, "#879e7d", 1035, 300, 170, 180);
  drawChampion(ctx, 1120, 385, 1.5);
  rect(ctx, "#26372b", 1038, 470, 164, 29); label(ctx, "GranBurstone", 1120, 490, "#edd995", 16);
  label(ctx, "CAMPIONE RANKED · 2025", 1120, 260, "#344332", 13);
  // Shelves full of differently sized board-game boxes.
  rect(ctx, "#26352a", 204, 663, 312, 170); rect(ctx, "#8b9571", 212, 671, 296, 154);
  for (let row = 0; row < 3; row++) {
    rect(ctx, "#374331", 220, 677 + row * 47, 280, 37);
    for (let col = 0; col < 7; col++) {
      const x = 225 + col * 39, y = 682 + row * 47, h = 24 + (col % 3) * 3;
      rect(ctx, GAMES[(row * 7 + col) % GAMES.length].color, x, y + 31 - h, 32, h);
      rect(ctx, "#f0edd8", x + 4, y + 20, 23, 3); rect(ctx, "#475740", x + 4, y + 10, 5, 5);
    }
  }
  label(ctx, "LA LIBRERIA DEI GIOCHI", 360, 644);
  // Communal gaming table: checkerboard, dice and spare seats.
  rect(ctx, "#303d2e", 987, 740, 190, 95); rect(ctx, "#a6b28a", 995, 748, 174, 79);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) rect(ctx, (row + col) % 2 ? "#435340" : "#e4e6cc", 1013 + col * 9, 760 + row * 9, 9, 9);
  rect(ctx, "#edf0de", 1118, 771, 18, 18); rect(ctx, "#33432f", 1123, 776, 4, 4); rect(ctx, "#33432f", 1128, 781, 4, 4);
  rect(ctx, "#617251", 1020, 851, 38, 25); rect(ctx, "#617251", 1110, 851, 38, 25);
  label(ctx, "UN ALTRO TURNO?", 1082, 906, "#52664b", 12);
  label(ctx, "← SPECCHIO     CAMPIONE →", 725, 677, "#e8efdc", 12);
  label(ctx, "↖ LIBRERIA", 725, 972, "#e8efdc", 12);
}
export function drawRoomDetails(ctx: CanvasRenderingContext2D, near: PlaceId | null, now: number, avatar: Avatar) {
  // A live reflection of the member's saved avatar.
  ctx.save(); ctx.beginPath(); ctx.rect(246, 282, 128, 186); ctx.clip();
  ctx.translate(310, 375); ctx.scale(2, 2);
  drawPixelPlayer(ctx, 0, 0, "down", false, now, avatar); ctx.restore();
  for (const p of PLACES) {
    const active = p.id === near;
    rect(ctx, active ? "#f4e4a1" : "#dce6ce", p.x - 15, p.y - 15, 30, 30);
    ctx.strokeStyle = "#293b2c"; ctx.lineWidth = 3; ctx.strokeRect(p.x - 15, p.y - 15, 30, 30);
    label(ctx, active ? "!" : p.symbol, p.x, p.y + 6, "#293b2c", 17);
    if (active) {
      ctx.strokeStyle = "#536b45"; ctx.setLineDash([7, 5]); ctx.strokeRect(p.x - 34, p.y - 28, 68, 56); ctx.setLineDash([]);
    }
  }
}
export function drawMinimap(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = 144, h = 103, left = 12, top = 12;
  rect(ctx, "#1d2c24e8", left, top, w, h);
  ctx.strokeStyle = "#bacab1"; ctx.lineWidth = 2; ctx.strokeRect(left, top, w, h);
  label(ctx, "MAPPA DELLA GILDA", left + w / 2, top + 15, "#dce7d1", 9);
  const project = (px: number, py: number) => [left + 10 + px / WORLD.width * 124, top + 25 + (py - 200) / (WORLD.height - 200) * 65];
  for (const p of PLACES) { const [mx, my] = project(p.x, p.y); label(ctx, p.symbol, mx, my + 3, "#dce7d1", 11); }
  const [px, py] = project(x, y); rect(ctx, "#edcc75", px - 3, py - 3, 6, 6);
}
