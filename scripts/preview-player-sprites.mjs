// Developer-only contact sheet; no browser, database or account changes.
// CANVAS_MODULE may point to a bundled @napi-rs/canvas installation.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AVATAR_STYLES, AVATAR_COLORS, drawPixelPlayer } from '../app/lib/pixel-player.ts';
const { createCanvas } = await import(process.env.CANVAS_MODULE || '@napi-rs/canvas');
const output = resolve(process.argv[2] || '.local-data/player-sprites.png');
const canvas = createCanvas(1280, 1160), ctx = canvas.getContext('2d');
ctx.fillStyle = '#e9edde'; ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#25352b'; ctx.font = 'bold 23px monospace'; ctx.fillText('BEYSTREETBOYZ / PERSONAGGI', 24, 32);
ctx.font = '13px monospace'; ctx.fillText('Fronte / destra / retro / sinistra · 24 skin · colori a rotazione', 24, 56);
for (let i = 0; i < AVATAR_STYLES.length; i++) {
  const x = 16 + i % 4 * 316, y = 76 + Math.floor(i / 4) * 178;
  ctx.fillStyle = '#f8f7ec'; ctx.fillRect(x, y, 304, 166);
  ctx.fillStyle = '#25352b'; ctx.font = 'bold 14px monospace'; ctx.fillText(`${i + 1}. ${AVATAR_STYLES[i]}`, x + 12, y + 22);
  for (const [column, direction] of ['down', 'right', 'up', 'left'].entries()) {
    ctx.save(); ctx.translate(x + 40 + column * 74, y + 99); ctx.scale(1.4, 1.4);
    ctx.imageSmoothingEnabled = false;
    const sprite = createCanvas(96, 96);
    drawPixelPlayer(sprite.getContext('2d'), 48, 48, direction, false, 0, { avatarStyle: i, avatarColor: i % AVATAR_COLORS.length });
    ctx.drawImage(sprite, -48, -48);
    ctx.restore();
  }
  ctx.font = '11px monospace'; ctx.fillStyle = '#5d6f61'; ctx.fillText(AVATAR_COLORS[i % AVATAR_COLORS.length].name, x + 12, y + 154);
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, canvas.toBuffer('image/png'));
console.log(output);
