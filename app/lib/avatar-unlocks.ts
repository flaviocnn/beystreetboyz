import { BASE_STYLE_COUNT } from "./pixel-player";
export const DEMON_ACHIEVEMENT = "demon-slayer" as const;
export function isDemonicStyle(style: number) { return style % BASE_STYLE_COUNT === 11; }
export function unlockedAvatarStyle(style: number, demonUnlocked: boolean) {
  return isDemonicStyle(style) && !demonUnlocked ? style >= BASE_STYLE_COUNT ? BASE_STYLE_COUNT : 0 : style;
}
