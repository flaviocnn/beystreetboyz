import { ACHIEVEMENT_HOUSE } from "./achievement-house";
import { INTERACTION_RADIUS, playerHitsSolid } from "./world-game";

export const CITY_WORLD = { width: 1600, height: 1100 };
export const CITY_START = { x: 800, y: 500 };
// Interaction is at the front door, never in the middle of a solid building.
export const CITY_ENTRANCES: Record<string, { x: number; y: number }> = {
  intesa: { x: 440, y: 355 }, dora: { x: 1210, y: 365 },
  staff: { x: 420, y: 780 }, guild: { x: 1160, y: 785 },
  wistery: { x: 800, y: 1040 }, achievements: { x: 1320, y: 1015 },
};
const SOLIDS = [
  { x: 370, y: 95, w: 140, h: 245 }, { x: 324, y: 550, w: 192, h: 198 },
  { x: 1052, y: 546, w: 216, h: 208 }, { x: 714, y: 890, w: 172, h: 125 },
  { x: 593, y: 86, w: 144, h: 119 }, { x: 78, y: 861, w: 174, h: 126 },
  ACHIEVEMENT_HOUSE.solid, { x: 428, y: 901, w: 150, h: 117 },
];
export function canWalkCity(x: number, y: number) {
  return x >= 28 && x <= CITY_WORLD.width - 28 && y >= 35 && y <= CITY_WORLD.height - 30 && !SOLIDS.some(solid => playerHitsSolid(x, y, solid));
}
export function nearbyCityPlace(x: number, y: number) {
  const closest = Object.entries(CITY_ENTRANCES).map(([id, point]) => ({ id, distance: Math.hypot(x - point.x, y - point.y) })).sort((a, b) => a.distance - b.distance)[0];
  return closest.distance < INTERACTION_RADIUS ? closest.id : null;
}
