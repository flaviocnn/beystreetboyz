// Stable IDs let future additions/unlocks extend the catalog without changing
// existing choices. All current entries are available to every member.
export const MIRROR_MOTTOS = [
  { id: "guild-seal", text: "IL MIO SIGILLO. LA MIA GILDA." },
  { id: "phoenix", text: "La fenice brucia sempre" },
  { id: "falling-in-love", text: "Io non mi innamorerò . Però mi sta piacendo" },
  { id: "if-there-were", text: "Se ci fosse" },
  { id: "not-overdo", text: "Non volevo esagerare" },
  { id: "how-is-it-possible", text: "Dai cazzo ma come si fa" },
] as const;
export const ATTACK_MOTTO = { id: "attack-trio", text: "Tre Bey. Una sola direzione." } as const;

export function mirrorMotto(id: string) {
  if (id === ATTACK_MOTTO.id) return ATTACK_MOTTO.text;
  return MIRROR_MOTTOS.find(motto => motto.id === id)?.text ?? "";
}
