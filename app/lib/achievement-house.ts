export const ACHIEVEMENT_HOUSE = { x: 1320, y: 935, solid: { x: 1200, y: 800, w: 240, h: 180 } };
export function drawAchievementHouse(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const rect = (color: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x + a, y + b, w, h); };
  const ink = "#25352b", dark = "#4c6047", pale = "#dce3c6", stone = "#aab994", gold = "#c2ad66";
  rect("#8a967c", -126, 42, 252, 8);
  rect(ink, -120, -123, 240, 163); rect(stone, -114, -117, 228, 151);
  rect(ink, -130, -137, 260, 16); rect(dark, -116, -149, 232, 12); rect(ink, -101, -156, 202, 7);
  for (const a of [-114, -44, 38, 108]) { rect(pale, a, -114, 7, 145); rect(ink, a - 3, -115, 13, 5); rect(ink, a - 3, 27, 13, 7); }
  for (const a of [-98, 55]) {
    rect(ink, a, -103, 44, 74); rect(dark, a + 5, -98, 34, 64);
    rect(gold, a + 15, -77, 15, 18); rect(gold, a + 10, -79, 5, 11); rect(gold, a + 30, -79, 5, 11);
    rect(gold, a + 20, -59, 5, 11); rect(gold, a + 14, -48, 17, 4);
    rect(pale, a + 7, -94, 3, 18);
  }
  rect(ink, -31, -81, 62, 121); rect(dark, -25, -75, 50, 115);
  rect(stone, -21, -71, 18, 107); rect(stone, 3, -71, 18, 107);
  rect(gold, -8, 3, 3, 7); rect(gold, 5, 3, 3, 7);
  rect(ink, -41, 34, 82, 7); rect(pale, -49, 41, 98, 7); rect(ink, -56, 48, 112, 5);
  rect(ink, -70, -132, 140, 30); rect(pale, -66, -128, 132, 22);
  ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.font = "bold 10px monospace"; ctx.fillText("CASA DELLE IMPRESE", x, y - 113);
  for (const a of [-93, 93]) { rect(ink, a - 15, 47, 30, 6); rect(dark, a - 12, 38, 24, 10); rect(gold, a - 8, 35, 4, 5); rect(gold, a + 5, 33, 4, 6); }
}
