export type ChallongeTournament = {
  id: string; name: string; ref: string; sourceUrl: string;
  eventDate: string | null; startsAt: string | null; community: string | null;
};
export const BSB_COMMUNITY = { id: "197576", identifier: "c3fc3026d7761c60969ca7eb", name: "BeyStreetBoyz" };
export const UPCOMING_STATES = new Set(["pending", "checking_in", "checked_in", "accepting_predictions"]);
export function challongeEventDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + "T12:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
