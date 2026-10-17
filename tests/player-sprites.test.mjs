import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { AVATAR_STYLES, AVATAR_COLORS, BASE_STYLE_COUNT, drawPixelPlayer } from '../app/lib/pixel-player.ts';
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (error) { if (s.startsWith('.')) { const u = new URL(s + '.ts', c.parentURL); if (existsSync(u)) return { url: u.href, shortCircuit: true }; } throw error; } } });
const { drawMirrorPose, MIRROR_POSES } = await import('../app/lib/mirror-poses.ts');

// A tiny integer rasterizer tests the actual painter without a native dependency.
function render(style = 0, color = 0, direction = 'down', walking = false, time = 0, pose = 'standing', portraitFrame = false) {
  const pixels = new Map(), stack = [], rects = [];
  let transform = [1, 0, 0, 1, 0, 0];
  const ctx = {
    fillStyle: '',
    save() { stack.push([...transform]); },
    restore() { assert.ok(stack.length); transform = stack.pop(); },
    translate(x, y) { const [a, b, c, d] = transform; transform[4] += a * x + c * y; transform[5] += b * x + d * y; },
    scale(x, y) { transform[0] *= x; transform[1] *= x; transform[2] *= y; transform[3] *= y; },
    rotate(angle) {
      const [a, b, c, d, x, y] = transform, cos = Math.round(Math.cos(angle)), sin = Math.round(Math.sin(angle));
      assert.ok(Math.abs(cos - Math.cos(angle)) < 1e-9 && Math.abs(sin - Math.sin(angle)) < 1e-9, 'Only pixel-perfect quarter turns');
      transform = [a * cos + c * sin, b * cos + d * sin, c * cos - a * sin, d * cos - b * sin, x, y];
    },
    fillRect(x, y, width, height) {
      assert.ok([x, y, width, height].every(Number.isInteger));
      assert.ok(width > 0 && height > 0);
      const [a, b, c, d, tx, ty] = transform;
      const points = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([px, py]) => [a * px + c * py + tx, b * px + d * py + ty]);
      const left = Math.min(...points.map(p => p[0])), right = Math.max(...points.map(p => p[0]));
      const top = Math.min(...points.map(p => p[1])), bottom = Math.max(...points.map(p => p[1]));
      rects.push({ left, top, right, bottom, color: this.fillStyle });
      for (let px = left; px < right; px++) for (let py = top; py < bottom; py++) pixels.set(`${px},${py}`, this.fillStyle);
    },
  };
  const avatar = { avatarStyle: style, avatarColor: color };
  if (portraitFrame) drawMirrorPose(ctx, 180, pose === 2 ? 260 : 230, avatar, pose, 3);
  else drawPixelPlayer(ctx, 0, 0, direction, walking, time, avatar, pose);
  assert.deepEqual(transform, [1, 0, 0, 1, 0, 0]); assert.equal(stack.length, 0);
  return { pixels, rects };
}
const signature = pixels => JSON.stringify([...pixels].sort(([a], [b]) => a.localeCompare(b)));
test('all 24 skins, eight colors and four walking views fit existing Wistery thumbnails on an integer pixel grid', () => {
  assert.equal(AVATAR_STYLES.length, 24); assert.equal(BASE_STYLE_COUNT, 12); assert.equal(AVATAR_COLORS.length, 8);
  for (let style = 0; style < 24; style++) for (let color = 0; color < 8; color++) {
    for (const direction of ['down', 'up', 'left', 'right']) for (const t of [0, 130, 260, 390]) {
      const { rects } = render(style, color, direction, true, t);
      for (const r of rects) {
        assert.ok(r.left >= -24 && r.right <= 24 && r.top >= -33 && r.bottom <= 29, `${style}/${direction}/${t}: ${JSON.stringify(r)}`);
        if (r.color.length === 7) assert.ok([r.left, r.right, r.top, r.bottom].every(value => value % 2 === 0));
      }
    }
  }
});
test('every skin has an identifiable front, rear and feminine variant; profile turns truly mirror', () => {
  for (let style = 0; style < 24; style++) {
    const front = signature(render(style).pixels), back = render(style, 0, 'up');
    assert.notEqual(front, signature(back.pixels));
    if (style < 12) assert.notEqual(front, signature(render(style + 12).pixels));
    const right = render(style, 0, 'right').pixels, left = render(style, 0, 'left').pixels;
    for (const [coordinate, color] of right) {
      const [x, y] = coordinate.split(',').map(Number);
      assert.equal(left.get(`${-x - 1},${y}`), color, `${style}: ${coordinate}`);
    }
    for (let x = -6; x < 6; x++) for (let y = -10; y < 0; y++) assert.notEqual(back.pixels.get(`${x},${y}`), '#efd9b6', 'No front face showing through the back of the head');
  }
  assert.equal(new Set(AVATAR_STYLES.map((_, style) => signature(render(style).pixels))).size, 24);
});
test('color is preserved in every outfit; idle is stable, walking alternates and unknown IDs safely fall back', () => {
  for (let style = 0; style < 24; style++) {
    assert.equal(new Set(AVATAR_COLORS.map((_, color) => signature(render(style, color).pixels))).size, 8);
    assert.equal(signature(render(style).pixels), signature(render(style, 0, 'down', false, 390).pixels));
    const steps = [0, 130, 260, 390].map(t => signature(render(style, 0, 'down', true, t).pixels));
    assert.equal(new Set(steps).size, 3);
  }
  for (const style of [-1, 999, NaN, 1.5]) assert.equal(signature(render(style, 99).pixels), signature(render().pixels));
});
test('four real portrait poses preserve all 24 skins and eight colors, fitting inside the mirror frame', () => {
  assert.deepEqual(MIRROR_POSES.map(p => p.label), ['Frontale', 'Trionfante', 'Sdraiato', 'Ti sfido!']);
  for (let style = 0; style < 24; style++) for (let color = 0; color < 8; color++) {
    const signatures = [];
    for (let index = 0; index < 4; index++) {
      const { rects } = render(style, color, 'down', false, 0, index, true);
      for (const r of rects) assert.ok(r.left >= 68 && r.right <= 292 && r.top >= 135 && r.bottom <= 334, `${style}/${index}: ${JSON.stringify(r)}`);
      signatures.push(signature(render(style, color, 'down', false, 0, MIRROR_POSES[index].pose).pixels));
    }
    assert.equal(new Set(signatures).size, 4);
  }
});
test('reclining keeps the face upright, and normal walking is independent of mirror selection', () => {
  const relaxed = render(0, 0, 'down', false, 0, 'reclining').pixels;
  assert.equal(relaxed.get('-20,-10'), '#252d35'); assert.equal(relaxed.get('-12,-10'), '#252d35');
  for (const dir of ['up', 'left', 'right']) assert.equal(signature(render(0, 0, dir, true, 130, 'triumphant').pixels), signature(render(0, 0, dir, true, 130).pixels));
  const source = readFileSync(new URL('../app/gilda/mappa/mirror-photo.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /ctx\.rotate\(/);
  assert.match(source, /<PosePreview avatar=\{member\} index=\{index\}/);
});
test('challenge points a bare index at the viewer instead of a colored boxing glove in every skin', () => {
  for (let style = 0; style < 24; style++) for (let color = 0; color < 8; color++) {
    const { pixels } = render(style, color, 'down', false, 0, 'challenge');
    assert.equal(pixels.get('22,-8'), '#efd9b6', 'Exposed fingertip');
    assert.equal(pixels.get('20,-6'), '#f5f1dc', 'Visible fingernail');
    assert.equal(pixels.get('18,4'), '#efd9b6', 'Bare palm');
    for (const x of [16, 20, 24]) assert.equal(pixels.get(`${x},6`), '#c6a17c', 'Curled finger folds');
  }
});
