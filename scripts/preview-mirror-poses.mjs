// Native canvas is only needed for this optional developer contact sheet.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (error) { if (s.startsWith('.')) { const u = new URL(s + '.ts', c.parentURL); if (existsSync(u)) return { url: u.href, shortCircuit: true }; } throw error; } } });
const { drawMirrorPose, MIRROR_POSES } = await import('../app/lib/mirror-poses.ts');
const { AVATAR_STYLES } = await import('../app/lib/pixel-player.ts');
const { createCanvas } = await import(process.env.CANVAS_MODULE || '@napi-rs/canvas');
const output = resolve(process.argv[2] || '.local-data/mirror-poses.png');
const canvas = createCanvas(1120, 1300), ctx = canvas.getContext('2d');
ctx.fillStyle = '#e9edde'; ctx.fillRect(0, 0, 1120, 1300);
ctx.fillStyle = '#25352b'; ctx.font = 'bold 24px monospace'; ctx.fillText('SPECCHIO DEL BLADER / POSE', 24, 36);
for (const [column, { label }] of MIRROR_POSES.entries()) { ctx.font = 'bold 16px monospace'; ctx.fillText(label, 24 + column * 276, 68); }
for (const [row, style] of [0, 2, 7, 11, 17, 22].entries()) {
  for (let pose = 0; pose < 4; pose++) {
    const x = 16 + pose * 276, y = 88 + row * 200;
    ctx.fillStyle = '#faf8eb'; ctx.fillRect(x, y, 264, 188);
    drawMirrorPose(ctx, x + 130, y + (pose === 2 ? 123 : 110), { avatarStyle: style, avatarColor: row + 1 }, pose, 2.5);
    ctx.fillStyle = '#25352b'; ctx.font = '12px monospace'; ctx.fillText(AVATAR_STYLES[style], x + 12, y + 178);
  }
}
await mkdir(dirname(output), { recursive: true }); await writeFile(output, canvas.toBuffer('image/png'));
console.log(output);
