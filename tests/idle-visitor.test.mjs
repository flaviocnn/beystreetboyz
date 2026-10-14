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
