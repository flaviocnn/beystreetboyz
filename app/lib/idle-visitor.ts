import type { Direction } from "./pixel-player";

export const VISITORS = [
  { name: "Membro dei Dark Blader", message: "sono un membro della Dark, la Dark vincerà!", avatarStyle: 10, avatarColor: 2 },
  { name: "Membro dei Phoenix Bladers", message: "La fenice brucia sempre!", avatarStyle: 7, avatarColor: 4 },
] as const;
type Position = { x: number; y: number };
export type Visitor = Position & { kind: number; dir: Direction; phase: "walking" | "talking" | "leaving"; age: number };
export type IdleEncounter = { idle: number; armed: boolean; previous: Position; visitor: Visitor | null };
export function createIdleEncounter(player: Position): IdleEncounter {
  return { idle: 0, armed: true, previous: { ...player }, visitor: null };
}

// A clear approach is chosen before spawning, so a visitor cannot cross a building.
function spawnPoint(player: Position, canWalk: (x: number, y: number) => boolean, random: number) {
  for (const radius of [180, 140, 100, 64]) for (let i = 0; i < 16; i++) {
    const angle = random * Math.PI * 2 + i * Math.PI / 8;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let clear = true;
    for (let d = 0; d <= radius; d += 4) if (!canWalk(player.x + dx * d, player.y + dy * d)) { clear = false; break; }
    if (clear) return { x: player.x + dx * radius, y: player.y + dy * radius };
  }
  return null;
}

export function updateIdleEncounter(state: IdleEncounter, player: Position, elapsed: number, paused: boolean, canWalk: (x: number, y: number) => boolean, random = Math.random) {
  const moved = Math.hypot(player.x - state.previous.x, player.y - state.previous.y) > .01;
  state.previous = { ...player };
  if (moved) { state.idle = 0; state.armed = true; state.visitor = null; }
  // Time spent in another tab or reading a location does not trigger an encounter.
  if (paused) { state.idle = 0; return; }
  if (!moved && state.armed && !state.visitor) {
    state.idle += elapsed;
    if (state.idle >= 30_000) {
      const point = spawnPoint(player, canWalk, random());
      state.armed = false;
      if (point) state.visitor = { ...point, kind: random() < .5 ? 0 : 1, dir: "down", phase: "walking", age: 0 };
    }
  }
  const npc = state.visitor;
  if (!npc) return;
  if (npc.phase === "walking") {
    const dx = player.x - npc.x, dy = player.y - npc.y, distance = Math.hypot(dx, dy);
    npc.dir = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "up" : "down";
    if (distance <= 38) { npc.phase = "talking"; npc.age = 0; }
    else {
      const step = Math.min(distance - 38, elapsed * .075);
      npc.x += dx / distance * step; npc.y += dy / distance * step;
    }
  } else {
    npc.age += elapsed;
    if (npc.phase === "talking" && npc.age >= 9000) { npc.phase = "leaving"; npc.age = 0; }
    if (npc.phase === "leaving" && npc.age >= 1000) state.visitor = null;
  }
}
