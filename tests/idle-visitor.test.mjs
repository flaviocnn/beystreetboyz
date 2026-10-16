import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/lib/idle-visitor.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { createIdleEncounter, updateIdleEncounter } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const player = { x: 500, y: 500 };
const openGround = (x, y) => x >= 28 && x <= 1500 && y >= 35 && y <= 1000;
function advance(state, time, options = {}) {
  for (let t = 0; t < time; t += 100) updateIdleEncounter(state, options.player ?? player, Math.min(100, time - t), options.paused ?? false, options.canWalk ?? openGround, () => options.random ?? 0);
}

test("waits 30 seconds, walks to the player and speaks once per idle period", () => {
  const state = createIdleEncounter(player);
  advance(state, 29900); assert.equal(state.visitor, null);
  advance(state, 100); assert.equal(state.visitor.phase, "walking");
  assert.ok(Math.hypot(state.visitor.x - player.x, state.visitor.y - player.y) > 38);
  advance(state, 2500); assert.equal(state.visitor.phase, "talking");
  advance(state, 60000); assert.equal(state.visitor, null); assert.equal(state.armed, false);
});

test("movement restarts the countdown, including short taps", () => {
  const state = createIdleEncounter(player);
  advance(state, 29900);
  const moved = { x: 508, y: 500 };
  advance(state, 100, { player: moved }); assert.equal(state.idle, 0);
  advance(state, 29900, { player: moved }); assert.equal(state.visitor, null);
  advance(state, 100, { player: moved, random: .9 }); assert.equal(state.visitor.kind, 1);
});

test("hidden tabs and location modals do not consume the idle timer", () => {
  const state = createIdleEncounter(player);
  advance(state, 20000); advance(state, 60000, { paused: true });
  assert.equal(state.idle, 0); assert.equal(state.visitor, null);
  advance(state, 29900); assert.equal(state.visitor, null);
});

test("finds a clear approach when a wall blocks the initial spawn direction", () => {
  const state = createIdleEncounter(player);
  const canWalk = (x, y) => openGround(x, y) && !(x > 530 && x < 580);
  advance(state, 30000, { canWalk }); assert.ok(state.visitor);
  while (state.visitor.phase === "walking") {
    assert.ok(canWalk(state.visitor.x, state.visitor.y)); advance(state, 100, { canWalk });
  }
  assert.equal(state.visitor.phase, "talking");
});

test("arrival tolerance stops both visitors and opens dialogue despite fractional-frame rounding", () => {
  const point = { x: 800.123456789, y: 500.987654321 };
  for (const kind of [0, 1]) for (let i = 0; i < 128; i++) {
    const angle = i * Math.PI / 64 + .013;
    const state = createIdleEncounter(point); state.armed = false;
    state.visitor = { x: point.x + Math.cos(angle) * 38.00000000000003, y: point.y + Math.sin(angle) * 38.00000000000003,
      kind, dir: "down", phase: "walking", age: 0 };
    updateIdleEncounter(state, point, 1000 / 60, false, openGround);
    assert.equal(state.visitor.phase, "talking", `kind=${kind}, angle=${angle}`);
    const stopped = { x: state.visitor.x, y: state.visitor.y };
    updateIdleEncounter(state, point, 1000 / 60, false, openGround);
    assert.deepEqual({ x: state.visitor.x, y: state.visitor.y }, stopped);
    assert.ok(state.visitor.age > 0);
  }
});

test("every spawn direction reaches dialogue with real 60fps-sized updates", () => {
  for (let i = 0; i < 64; i++) {
    const state = createIdleEncounter(player);
    advance(state, 30000, { random: i / 64 });
    for (let frame = 0; frame < 240 && state.visitor.phase === "walking"; frame++) updateIdleEncounter(state, player, 1000 / 60, false, openGround);
    assert.equal(state.visitor.phase, "talking");
  }
});
