import type { Direction } from "./pixel-player";
export function joystickDirections(x: number, y: number): Direction[] {
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) <= 10) return [];
  const result: Direction[] = [], diagonal = Math.tan(Math.PI / 8);
  if (Math.abs(x) > Math.abs(y) * diagonal) result.push(x < 0 ? "left" : "right");
  if (Math.abs(y) > Math.abs(x) * diagonal) result.push(y < 0 ? "up" : "down");
  return result;
}
export function joystickKnob(x: number, y: number) {
  const distance = Math.hypot(x, y), scale = distance > 32 ? 32 / distance : 1;
  return { x: x * scale, y: y * scale };
}
export function createJoystick(onDirection: (direction: Direction, active: boolean) => void) {
  let active = new Set<Direction>();
  function set(next: Direction[]) {
    const directions = new Set(next);
    for (const dir of active) if (!directions.has(dir)) onDirection(dir, false);
    for (const dir of directions) if (!active.has(dir)) onDirection(dir, true);
    active = directions;
  }
  return { move(x: number, y: number) { set(joystickDirections(x, y)); }, stop() { set([]); } };
}
