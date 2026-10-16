import { drawPixelPlayer, type Avatar } from "../../lib/pixel-player";
import { drawChampionThrone } from "../../lib/throne-art";
import type { ReigningChampion } from "../../lib/reigning-champion";
import { worldCamera, INTERACTION_RADIUS, playerHitsSolid, drawInteractionSpot } from "../../lib/world-game";

export type PlaceId = "board" | "ranking" | "mirror" | "champion" | "library" | "archive" | "throne";
export const WORLD = { width: 1600, height: 1480 };
export const START = { x: 800, y: 620 };
export const PLACES: { id: PlaceId; name: string; x: number; y: number; symbol: string }[] = [
  { id: "ranking", name: "Classifica della Gilda", x: 645, y: 535, symbol: "R" },
  { id: "throne", name: "Trono del Campione", x: 985, y: 545, symbol: "T" },
  { id: "mirror", name: "Specchio dei blader", x: 535, y: 995, symbol: "S" },
  { id: "archive", name: "Archivio delle Tappe", x: 1045, y: 975, symbol: "A" },
  { id: "board", name: "Bacheca della Gilda", x: 310, y: 1360, symbol: "B" },
  { id: "champion", name: "Statua di GranBurstone", x: 800, y: 1365, symbol: "C" },
  { id: "library", name: "Libreria dei giochi", x: 1260, y: 1365, symbol: "L" },
];
// Sprite footprints and collision geometry share a single layout definition.
export const FURNITURE = {
  ranking: { x: 515, y: 275, w: 260, h: 190 },
  throne: { x: 886, y: 252, w: 198, h: 224 },
  mirror: { x: 455, y: 725, w: 160, h: 210 },
  archive: { x: 915, y: 780, w: 260, h: 132 },
  board: { x: 180, y: 1160, w: 260, h: 140 },
  champion: { x: 726, y: 1110, w: 148, h: 206 },
  library: { x: 1110, y: 1145, w: 300, h: 165 },
};
const SOLIDS = Object.values(FURNITURE);
export const THRONE = { x: 985, y: 380, scale: 1.15 };
export type RankingPreview = { name: string; rank: number; score: number };
export function guildCamera(width: number, height: number, player: { x: number; y: number }) {
  return worldCamera(width, height, player, WORLD);
}
export function canWalk(x: number, y: number) {
  return x >= 36 && x <= WORLD.width - 36 && y >= 205 && y <= WORLD.height - 40
    && !SOLIDS.some((r) => playerHitsSolid(x, y, r));
}
export function nearbyPlace(x: number, y: number): PlaceId | null {
  const closest = PLACES.map((p) => ({ p, d: Math.hypot(x - p.x, y - p.y) })).sort((a, b) => a.d - b.d)[0];
  return closest.d < INTERACTION_RADIUS ? closest.p.id : null;
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
  { id: "slot", title: "Beycoin Spin", kind: "1 BC a giro", color: "#d0bd85", symbol: "◉" },
  { id: "blackjack", title: "Blackjack", kind: "2 BC a mano", color: "#9cbaad", symbol: "21" },
];

// Clear spatial hierarchy: a central ranked dais, two personal wings, then
// the community gallery. Furniture never occupies the connecting promenades.
function floorArea(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  rect(ctx, "#a7b49e", x, y, w, h);
  rect(ctx, color, x + 5, y + 5, w - 10, h - 10);
  for (const dx of [14, w - 20]) for (const dy of [14, h - 20]) rect(ctx, "#b8c3aa", x + dx, y + dy, 6, 6);
}
function boardSprite(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = FURNITURE.board;
  rect(ctx, "#2b3b30", x, y, w, h); rect(ctx, "#c4bda0", x + 7, y + 7, w - 14, h - 14);
  rect(ctx, "#485a42", x + 15, y + 15, w - 30, 23);
  label(ctx, "BACHECA", x + w / 2, y + 31, "#edf1df", 13);
  for (let i = 0; i < 3; i++) {
    const px = x + 22 + i * 74, py = y + 51 + (i % 2) * 7;
    rect(ctx, i === 1 ? "#d1ddd0" : "#ede3be", px, py, 64, 65);
    rect(ctx, "#344633", px + 28, py - 3, 6, 6);
    for (let line = 0; line < 3; line++) rect(ctx, "#8b9a79", px + 10, py + 18 + line * 12, 44 - line * 6, 3);
  }
}
function rankingSprite(ctx: CanvasRenderingContext2D, leaders: RankingPreview[] = []) {
  const { x, y, w, h } = FURNITURE.ranking;
  rect(ctx, "#283b30", x - 8, y + h - 2, w + 16, 14);
  rect(ctx, "#2b3b30", x, y, w, h); rect(ctx, "#c7ba88", x + 5, y + 5, w - 10, h - 10);
  rect(ctx, "#e7e9d9", x + 10, y + 10, w - 20, h - 20);
  rect(ctx, "#304637", x + 10, y + 10, w - 20, 45);
  label(ctx, "CLASSIFICA RANKED", x + w / 2, y + 31, "#f0dc98", 16);
  label(ctx, "STAGIONE IN CORSO", x + w / 2, y + 46, "#c4d0b3", 8);
  for (let i = 0; i < 3; i++) {
    const row = leaders[i], ry = y + 67 + i * 35;
    rect(ctx, i === 0 ? "#d8c995" : "#d4ddc8", x + 17, ry - 3, w - 34, 29);
    label(ctx, String(row?.rank ?? i + 1).padStart(2, "0"), x + 34, ry + 16, "#52644c", 12);
    if (row) {
      ctx.fillStyle = "#273a2c"; ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
      ctx.fillText(row.name, x + 54, ry + 15, 136);
      ctx.textAlign = "right"; ctx.font = "bold 10px monospace"; ctx.fillText(String(row.score), x + w - 24, ry + 15);
    } else {
      rect(ctx, "#8da17c", x + 58, ry + 5, 120 - i * 20, 5);
      rect(ctx, "#a2b091", x + 58, ry + 15, 81 - i * 15, 3);
    }
  }
  label(ctx, "TUTTI I MEMBRI · TUTTE LE TAPPE", x + w / 2, y + h - 8, "#66765b", 8);
}
function mirrorSprite(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = FURNITURE.mirror;
  rect(ctx, "#6d694c", x - 7, y + h, w + 14, 9);
  rect(ctx, "#526454", x, y, w, h); rect(ctx, "#c6b77d", x + 5, y + 5, w - 10, h - 10);
  rect(ctx, "#7d805e", x + 15, y + 15, w - 30, h - 30);
  rect(ctx, "#a7c6c2", x + 22, y + 22, w - 44, h - 44);
  rect(ctx, "#e0ece0", x + 29, y + 30, 7, 125); rect(ctx, "#d2e4d8", x + 42, y + 35, 4, 75);
  for (const px of [x, x + w - 14]) for (const py of [y - 5, y + h - 12]) rect(ctx, "#e0cc91", px, py, 14, 16);
}
function archiveSprite(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = FURNITURE.archive;
  rect(ctx, "#3a4b37", x, y, w, h); rect(ctx, "#8e9e79", x + 7, y + 7, w - 14, h - 14);
  rect(ctx, "#c5ceb1", x + 15, y + 14, w - 30, 22);
  label(ctx, "LE TUE TAPPE · I TUOI DECK", x + w / 2, y + 30, "#3e513b", 10);
  rect(ctx, "#eae4c8", x + 20, y + 50, 104, 61); rect(ctx, "#f5eed8", x + 24, y + 54, 44, 53);
  rect(ctx, "#d9d2af", x + 73, y + 54, 47, 53); rect(ctx, "#5b6e4c", x + 68, y + 52, 5, 57);
  for (let row = 0; row < 4; row++) for (const dx of [31, 82]) rect(ctx, "#8e9c74", x + dx, y + 63 + row * 10, 28, 3);
  for (let i = 0; i < 3; i++) {
    const bx = x + 143 + i * 31;
    rect(ctx, "#344a38", bx, y + 70, 25, 25);
    rect(ctx, ["#b8ced2", "#d6bd7d", "#c19a8c"][i], bx + 3, y + 73, 19, 19);
    rect(ctx, "#f4edd7", bx + 10, y + 80, 5, 5);
  }
}
function librarySprite(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = FURNITURE.library;
  rect(ctx, "#354730", x, y, w, h); rect(ctx, "#9ca17c", x + 7, y + 7, w - 14, h - 14);
  for (let row = 0; row < 3; row++) {
    rect(ctx, "#40503a", x + 14, y + 13 + row * 47, w - 28, 36);
    for (let col = 0; col < 7; col++) {
      const bx = x + 20 + col * 37, by = y + 18 + row * 47, bh = 22 + (col % 3) * 3;
      rect(ctx, GAMES[(row * 7 + col) % GAMES.length].color, bx, by + 28 - bh, 29, bh);
      rect(ctx, "#eeecd7", bx + 4, by + 18, 21, 3); rect(ctx, "#4a5c42", bx + 4, by + 8, 5, 5);
    }
  }
}
export function drawGuildWorld(ctx: CanvasRenderingContext2D) {
  rect(ctx, "#dbe0d3", 0, 0, WORLD.width, WORLD.height);
  for (let y = 190; y < WORLD.height; y += 48) for (let x = 0; x < WORLD.width; x += 48) {
    rect(ctx, (x / 48 + Math.floor(y / 48)) % 2 ? "#e5e8dc" : "#d7dfd0", x, y, 47, 47);
  }
  // Broad, unobstructed promenades. No decorative furniture on the main axis.
  rect(ctx, "#b6c3a8", 710, 190, 180, WORLD.height - 190);
  rect(ctx, "#698267", 718, 190, 164, WORLD.height - 190);
  for (const y of [570, 955]) { rect(ctx, "#b6c3a8", 110, y, 1380, 78); rect(ctx, "#7c9273", 110, y + 6, 1380, 66); }
  for (let y = 615; y < WORLD.height; y += 70) for (const x of [730, 859]) rect(ctx, "#9db38b", x, y, 10, 10);
  rect(ctx, "#273b2e", 0, 0, WORLD.width, 165);
  rect(ctx, "#879d7b", 0, 165, WORLD.width, 16);
  label(ctx, "RANKED BEYSTREETBOYZ", 800, 92, "#e0e7ca", 28);
  label(ctx, "LA GILDA DEL GRIFONE", 800, 128, "#b9cbaa", 12);
  // The primary focus is a shared dais, with equal space for ranked and throne.
  floorArea(ctx, 475, 210, 655, 355, "#cbd4ba");
  rect(ctx, "#bdc7ad", 490, 565, 625, 9); rect(ctx, "#d5dcc5", 505, 574, 595, 8);
  rankingSprite(ctx);
  drawChampionThrone(ctx, THRONE.x, THRONE.y, null, 0, THRONE.scale);
  label(ctx, "TRONO DEL CAMPIONE", THRONE.x, 231, "#4e6046", 13);
  // Personal wings, intentionally one level below the ranked dais.
  floorArea(ctx, 390, 680, 290, 360, "#d1dbc5");
  mirrorSprite(ctx); label(ctx, "SPECCHIO DEI BLADER", 535, 705, "#455e45", 15);
  floorArea(ctx, 890, 710, 310, 330, "#d1dbc5");
  archiveSprite(ctx); label(ctx, "ARCHIVIO DELLE TAPPE", 1045, 752, "#455e45", 15);
  label(ctx, "←  SPECCHIO", 635, 660, "#52694d", 12);
  label(ctx, "TAPPE E DECK  →", 965, 660, "#52694d", 12);
  // The community gallery is quiet and separated from the competition area.
  floorArea(ctx, 130, 1080, 1340, 350, "#d4d9c5");
  label(ctx, "LA VITA DELLA GILDA", 800, 1060, "#6d7d61", 13);
  boardSprite(ctx);
  drawChampion(ctx, 800, 1225, 1.1);
  rect(ctx, "#344934", 726, 1290, 148, 26);
  label(ctx, "GranBurstone", 800, 1308, "#e3d39a", 13);
  label(ctx, "CAMPIONE ANNUALE · 2025", 800, 1112, "#66775a", 10);
  librarySprite(ctx); label(ctx, "LIBRERIA DEI GIOCHI", 1260, 1123, "#66775a", 12);
  label(ctx, "MESSAGGI DEI MEMBRI", 310, 1137, "#66775a", 12);
  label(ctx, "INGRESSO", 800, 1456, "#e0e8d2", 11);
}
export function drawRoomDetails(ctx: CanvasRenderingContext2D, near: PlaceId | null, now: number, avatar: Avatar, champion: ReigningChampion | null = null, leaders: RankingPreview[] = []) {
  rankingSprite(ctx, leaders);
  drawChampionThrone(ctx, THRONE.x, THRONE.y, champion, now, THRONE.scale);
  rect(ctx, "#53684c", 877, 488, 216, 28);
  ctx.fillStyle = "#f0df9b"; ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
  ctx.fillText(champion?.displayName ?? "IN ATTESA DEL CAMPIONE", THRONE.x, 507, 198);
  const mirror = FURNITURE.mirror;
  ctx.save(); ctx.beginPath(); ctx.rect(mirror.x + 23, mirror.y + 23, mirror.w - 46, mirror.h - 46); ctx.clip();
  ctx.translate(mirror.x + mirror.w / 2, mirror.y + mirror.h / 2 + 5); ctx.scale(2.1, 2.1);
  drawPixelPlayer(ctx, 0, 0, "down", false, now, avatar); ctx.restore();
  // A single active floor marker, rather than seven competing labels.
  const place = PLACES.find(p => p.id === near);
  if (place) drawInteractionSpot(ctx, place.x, place.y);
}
export function drawMinimap(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = 144, h = 112, left = 12, top = 12;
  rect(ctx, "#1d2c24ef", left, top, w, h);
  ctx.strokeStyle = "#bacab1"; ctx.lineWidth = 2; ctx.strokeRect(left, top, w, h);
  label(ctx, "MAPPA DELLA GILDA", left + w / 2, top + 15, "#dce7d1", 9);
  const project = (px: number, py: number) => [left + 10 + px / WORLD.width * 124, top + 27 + (py - 190) / (WORLD.height - 190) * 72];
  for (const p of PLACES) { const [mx, my] = project(p.x, p.y); label(ctx, p.symbol, mx, my + 3, "#dce7d1", 11); }
  const [px, py] = project(x, y); rect(ctx, "#edcc75", px - 3, py - 3, 6, 6);
}
