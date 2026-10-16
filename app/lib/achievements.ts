import { attackBitCount, isFullAttackDeck, isTopEight, parseDeck } from "./decks";

export const ACHIEVEMENTS = [
  { id: "welcome", name: "Benvenuto, Blader", icon: "I", category: "Gilda", target: 1, rule: "Accedi alla piattaforma con il tuo account.", reward: "Distintivo di benvenuto." },
  { id: "identity", name: "Questo sono io", icon: "✦", category: "Gilda", target: 1, rule: "Salva un nuovo stile o colore per il tuo avatar al Wistery.", reward: "Distintivo identità." },
  { id: "voice", name: "Una voce nella Gilda", icon: "…", category: "Gilda", target: 1, rule: "Pubblica il tuo primo messaggio sulla bacheca.", reward: "Distintivo della community." },
  { id: "first-stage", name: "Si comincia", icon: "⚑", category: "Campionato", target: 1, rule: "Gioca la tua prima tappa di campionato.", reward: "Distintivo della prima tappa." },
  { id: "regular", name: "Presenza costante", icon: "III", category: "Campionato", target: 3, rule: "Gioca tre tappe distinte nella stessa stagione (anno solare).", reward: "Titolo “Volto della Gilda”.", title: "Volto della Gilda" },
  { id: "top-eight", name: "Tra i migliori", icon: "8", category: "Campionato", target: 1, rule: "Concludi una tappa nei primi otto della classifica finale.", reward: "Distintivo Top 8." },
  { id: "deck", name: "Deck agli atti", icon: "≡", category: "Deck", target: 1, rule: "Registra un deck completo di tre Beyblade per una tua tappa in Top 8.", reward: "Distintivo del collezionista di deck." },
  { id: "podiums", name: "Abituato al podio", icon: "▥", category: "Campionato", target: 3, rule: "Ottieni tre piazzamenti nei primi tre in tappe distinte della stessa stagione (anno solare).", reward: "Cornice “Bronzo vivo” per lo specchio.", frame: "bronze" },
  { id: "winner", name: "Sul gradino più alto", icon: "♜", category: "Campionato", target: 1, rule: "Vinci una tappa ufficiale. Il distintivo rimane anche quando il trono cambia campione.", reward: "Titolo “Vincitore di tappa”.", title: "Vincitore di tappa" },
  { id: "attack", name: "Nessuna difesa", icon: "✷", category: "Deck", target: 3, rule: "Vinci una tappa con tre bit Attacco e registra il tuo deck.", reward: "Cornice “Scintille” e motto “Tre Bey. Una sola direzione.”", frame: "sparks" },
  { id: "demon-slayer", name: "Sconfiggi il Demone!", icon: "♆", category: "Speciali", target: 1, rule: "Sconfiggi il Demone e ricevi il riconoscimento della Gilda.", reward: "Skin Demoniaco e Demoniaca.", manual: true },
] as const;
export type AchievementId = typeof ACHIEVEMENTS[number]["id"];
export const BEYCOIN_REWARDS: Record<AchievementId, number> = {
  welcome: 10, identity: 15, voice: 15, "first-stage": 25, regular: 40,
  "top-eight": 50, deck: 30, podiums: 100, winner: 150, attack: 200, "demon-slayer": 50,
};
export type AchievementStage = { slug: string; name: string; eventDate: string; finalRank: number | null; deck: unknown; version: number | null };
export type AchievementFacts = { loggedIn: boolean; avatarChanged: boolean; hasMessage: boolean; stages: AchievementStage[]; manualAchievements?: AchievementId[] };
export type AchievementEvidence = { stageSlug?: string; stageName?: string; eventDate?: string; season?: string; deckVersion?: number; bits?: string[]; manual?: boolean; grantedBy?: string };
export type AchievementProgress = { id: AchievementId; progress: number; target: number; qualified: boolean; evidence: AchievementEvidence };
export type PersonalAchievement = AchievementProgress & { earnedAt: string | null; coinReward: number };
export type BeycoinMovement = { id: string; achievementId: AchievementId | null; amount: number; reason: string; createdAt: string };
export type AchievementAlbum = { achievements: PersonalAchievement[]; newlyUnlocked: AchievementId[]; showcase: AchievementId[]; titleId: AchievementId | null;
  beycoins: { balance: number; delta: number; history: BeycoinMovement[] } };

export function achievementDefinition(id: string) { return ACHIEVEMENTS.find(a => a.id === id); }
export function achievementTitle(id: string | null) {
  const definition = id ? achievementDefinition(id) : null;
  return definition && "title" in definition ? definition.title : null;
}
export function evaluateAchievements(facts: AchievementFacts): AchievementProgress[] {
  // One participation per stage, even if legacy data contains duplicates.
  const stages = [...new Map(facts.stages.map(stage => [stage.slug, stage])).values()]
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.slug.localeCompare(b.slug));
  const podiums = stages.filter(stage => stage.finalRank !== null && stage.finalRank >= 1 && stage.finalRank <= 3);
  function seasonCount(rows: AchievementStage[]) {
    const counts = new Map<string, number>();
    for (const stage of rows) { const year = stage.eventDate.slice(0, 4); counts.set(year, (counts.get(year) ?? 0) + 1); }
    return [...counts].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0] ?? [null, 0] as const;
  }
  const [regularSeason, regularCount] = seasonCount(stages), [podiumSeason, podiumCount] = seasonCount(podiums);
  const deckStage = stages.find(s => isTopEight(s.finalRank) && parseDeck(s.deck));
  const winners = stages.filter(s => s.finalRank === 1);
  const attackStage = winners.find(s => isFullAttackDeck(s.deck));
  const attackProgressStage = attackStage ?? [...winners].sort((a, b) => attackBitCount(b.deck) - attackBitCount(a.deck))[0];
  const sources: Partial<Record<AchievementId, AchievementStage>> = {
    "first-stage": stages[0], "top-eight": stages.find(s => isTopEight(s.finalRank)), deck: deckStage,
    winner: winners[0], attack: attackProgressStage,
  };
  const progress: Record<AchievementId, number> = {
    welcome: Number(facts.loggedIn), identity: Number(facts.avatarChanged), voice: Number(facts.hasMessage),
    "first-stage": Math.min(1, stages.length), regular: regularCount,
    "top-eight": Number(!!sources["top-eight"]), deck: Number(!!deckStage), podiums: podiumCount,
    winner: Number(winners.length > 0), attack: attackProgressStage ? attackBitCount(attackProgressStage.deck) : 0,
    "demon-slayer": Number(facts.manualAchievements?.includes("demon-slayer") ?? false),
  };
  return ACHIEVEMENTS.map(definition => {
    const stage = sources[definition.id], evidence: AchievementEvidence = {};
    if (stage) Object.assign(evidence, { stageSlug: stage.slug, stageName: stage.name, eventDate: stage.eventDate });
    if (definition.id === "regular" && regularSeason) evidence.season = regularSeason;
    if (definition.id === "podiums" && podiumSeason) evidence.season = podiumSeason;
    if (definition.id === "attack" && stage) {
      evidence.deckVersion = stage.version ?? 0;
      evidence.bits = parseDeck(stage.deck)?.map(bey => bey.bit.value) ?? [];
    }
    const value = Math.min(definition.target, progress[definition.id]);
    return { id: definition.id, progress: value, target: definition.target, qualified: value >= definition.target, evidence };
  });
}
