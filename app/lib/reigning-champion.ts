import type { Deck } from "./decks";
import type { Avatar } from "./pixel-player";
export type ReigningChampion = Avatar & {
  memberId: string | null; displayName: string; deck: Deck | null;
  stage: { slug: string; name: string; eventDate: string; sourceUrl: string };
};
export type ChampionResponse = { champion: ReigningChampion | null; canUseThrone: boolean };
export function ownsThrone(champion: ReigningChampion | null, memberId: string) {
  return !!champion?.memberId && champion.memberId === memberId;
}
export function canExportThrone(data: ChampionResponse | null, memberId: string, stageSlug: string) {
  return !!data?.canUseThrone && ownsThrone(data.champion, memberId) && data.champion?.stage.slug === stageSlug;
}
