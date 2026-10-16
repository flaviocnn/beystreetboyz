import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_STYLES, AVATAR_COLORS, BASE_STYLE_COUNT, drawPixelPlayer } from '../app/lib/pixel-player.ts';

// A tiny integer rasterizer tests the actual painter without a native dependency.
function render(style = 0, color = 0, direction = 'down', walking = false, time = 0) {
  const pixels = new Map(), stack = [], rects = [];
  let transform = [1, 1, 0, 0];
  const ctx = {
    fillStyle: '',
    save() { stack.push([...transform]); },
    restore() { assert.ok(stack.length); transform = stack.pop(); },
    translate(x, y) { transform[2] += x * transform[0]; transform[3] += y * transform[1]; },
    scale(x, y) { transform[0] *= x; transform[1] *= y; },
    fillRect(x, y, width, height) {
      assert.ok([x, y, width, height].every(Number.isInteger));
      assert.ok(width > 0 && height > 0);
      const [sx, sy, tx, ty] = transform;
      const left = Math.min(x * sx + tx, (x + width) * sx + tx), top = y * sy + ty;
      const right = Math.max(x * sx + tx, (x + width) * sx + tx), bottom = (y + height) * sy + ty;
      rects.push({ left, top, right, bottom, color: this.fillStyle });
      for (let px = left; px < right; px++) for (let py = top; py < bottom; py++) pixels.set(`${px},${py}`, this.fillStyle);
    },
  };
  drawPixelPlayer(ctx, 0, 0, direction, walking, time, { avatarStyle: style, avatarColor: color });
  assert.deepEqual(transform, [1, 1, 0, 0]); assert.equal(stack.length, 0);
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
