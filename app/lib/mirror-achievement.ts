import type { Deck, PersonalStage } from "./decks";

export type MirrorAchievement = Pick<PersonalStage, "name" | "finalRank" | "deck">;
export function topEightStages(stages: PersonalStage[]) {
  return stages.filter(stage => Number.isInteger(stage.finalRank) && stage.finalRank !== null && stage.finalRank >= 1 && stage.finalRank <= 8);
}
export function wrapPortraitText(value: string, measure: (text: string) => number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of value.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= width) { line = candidate; continue; }
    if (line) { lines.push(line); line = ""; }
    // Long custom component names must wrap too, never be silently truncated.
    for (const character of word) {
      if (line && measure(line + character) > width) { lines.push(line); line = ""; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}
export function deckBeyText(bey: Deck[number]) {
  return `${bey.blades.map(part => part.value).join(" + ")} / ${bey.ratchet.value} / ${bey.bit.value}`;
}
export function achievementCaption(stage: MirrorAchievement | null, measure: (text: string, size: number) => number) {
  const rank = stage?.finalRank;
  if (!stage || typeof rank !== "number" || !Number.isInteger(rank) || rank < 1 || rank > 8) return null;
  const lines: { text: string; size: number; y: number; accent: boolean }[] = [];
  let y = 22;
  function add(value: string, size: number, accent = false) {
    for (const text of wrapPortraitText(value, text => measure(text, size), 284)) {
      lines.push({ text, size, y, accent }); y += size + 5;
    }
    y += 6;
  }
  add(rank === 1 ? "1° POSTO · VINCITORE" : `${rank}° POSTO · TOP 8`, 18, true);
  add(stage.name, 14);
  if (stage.deck) {
    add("IL DECK DELLA TAPPA", 10, true);
    stage.deck.forEach((bey, index) => add(`BEY ${index + 1}: ${deckBeyText(bey)}`, 12));
  }
  return { lines, height: y + 6 };
}
