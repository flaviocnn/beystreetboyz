import { createHash } from "node:crypto";
export type Row = Record<string, string | number | boolean | null | Date>;
export type Snapshot = { members: Row[]; guild_messages: Row[]; tournament_stages: Row[]; tournament_results: Row[]; challonge_identities?: Row[] };
export const fields = {
  members: ["id", "first_name", "last_name", "fiscal_code", "document_number", "email", "phone", "challonge_username", "challonge_id", "membership_status", "payment_method", "payment_paid", "fee_cents", "must_change_password", "auth_version", "avatar_style", "avatar_color", "password_salt", "password_hash", "score", "created_at"],
  guild_messages: ["id", "member_id", "day", "body", "created_at"],
  tournament_stages: ["slug", "name", "event_date", "source_url", "attendance", "coefficient_milli", "synced_at"],
  tournament_results: ["stage_slug", "source_key", "display_name", "challonge_username", "source_challonge_username", "member_id", "group_name", "swiss_wins", "swiss_losses", "final_rank", "base_points", "stage_points"],
} as const;
const lower = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const canonical = (value: unknown): unknown => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
export const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

export function normalizeSource(input: Snapshot): Snapshot {
  const normalized: Record<string, Row[]> = {};
  for (const table of Object.keys(fields) as (keyof typeof fields)[]) {
    if (!Array.isArray(input?.[table]) || input[table].length > 5000) throw new Error("invalid_snapshot");
    normalized[table] = input[table].map(row => {
      if (!row || fields[table].some(key => !Object.hasOwn(row, key))) throw new Error("missing_columns");
      const result = Object.fromEntries(fields[table].map(key => [key, row[key]]));
      if (table === "members") for (const key of ["payment_paid", "must_change_password"]) {
        if (result[key] === 0 || result[key] === 1) result[key] = !!result[key];
        if (typeof result[key] !== "boolean" && !(key === "payment_paid" && result[key] === null)) throw new Error("invalid_boolean");
      }
      if (table === "tournament_stages") {
        const value = result.synced_at;
        // D1 stores seconds; PostgreSQL uses timestamptz.
        const dateText = String(value);
        const utcText = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(dateText) ? dateText.replace(" ", "T") + "Z" : dateText;
        const ms = typeof value === "number" ? (value < 1e12 ? value * 1000 : value) : Date.parse(utcText);
        if (!Number.isFinite(ms)) throw new Error("invalid_timestamp");
        result.synced_at = new Date(ms).toISOString();
      }
      return result;
    });
  }
  return normalized as Snapshot;
}

export function createProductionPlan(sourceInput: Snapshot, current: Snapshot) {
  const source = normalizeSource(sourceInput);
  const idMap = new Map<Row[string], Row[string]>();
  const usedTargets = new Set<unknown>();
  let linkedMembers = 0;
  const plannedMembers = source.members.map(historic => {
    const candidates = current.members.filter(row => row.id === historic.id ||
      ["challonge_username", "fiscal_code", "email", "challonge_id"].some(key => lower(row[key]) && lower(row[key]) === lower(historic[key])));
    if (candidates.length > 1) throw new Error("ambiguous_member_match");
    const live = candidates[0];
    if (!live) { idMap.set(historic.id, historic.id); return historic; }
    if (usedTargets.has(live.id)) throw new Error("duplicate_member_match");
    usedTargets.add(live.id);
    for (const key of ["fiscal_code", "email", "challonge_id"]) if (lower(live[key]) && lower(historic[key]) && lower(live[key]) !== lower(historic[key])) throw new Error("identity_conflict");
    idMap.set(historic.id, live.id);
    linkedMembers++;
    return { ...historic, id: live.id,
      challonge_id: live.challonge_id || historic.challonge_id,
      challonge_username: live.challonge_username || historic.challonge_username,
      // Preserve live sessions, verified OAuth identities and recent appearance choices.
      auth_version: live.auth_version, avatar_style: live.avatar_style, avatar_color: live.avatar_color,
    };
  });
  const remap = (id: Row[string]) => id === null ? null : idMap.get(id) ?? id;
  const allMemberIds = new Set([...current.members, ...plannedMembers].map(m => m.id));
  const messages: Row[] = source.guild_messages.map(row => ({ ...row, member_id: remap(row.member_id) }));
  for (const row of messages) {
    if (!allMemberIds.has(row.member_id)) throw new Error("orphan_message");
    const live = current.guild_messages.find(m => m.id === row.id || (m.member_id === row.member_id && m.day === row.day));
    if (live && fingerprint({ ...live, id: row.id }) !== fingerprint(row)) throw new Error("message_conflict");
  }
  const results: Row[] = source.tournament_results.map(row => ({ ...row, member_id: remap(row.member_id) }));
  const stageIds = new Set([...source.tournament_stages, ...current.tournament_stages].map(s => s.slug));
  const unique = new Set<string>();
  for (const result of results) {
    if (!stageIds.has(result.stage_slug) || (result.member_id && !allMemberIds.has(result.member_id))) throw new Error("orphan_result");
    const key = `${result.stage_slug}:${result.source_key}`;
    if (unique.has(key)) throw new Error("duplicate_result");
    unique.add(key);
    const live = current.tournament_results.find(r => r.stage_slug === result.stage_slug && r.source_key === result.source_key);
    if (live && fingerprint(live) !== fingerprint(result)) throw new Error("result_conflict");
  }
  // Check the historical totals before moving anything.
  for (const member of source.members) {
    const expected = source.tournament_results.filter(r => r.member_id === member.id).map(r => Number(r.stage_points)).sort((a, b) => b - a).slice(0, 10).reduce((s, n) => s + n, 0);
    if (expected !== member.score) throw new Error("historical_score_mismatch");
  }
  return { members: plannedMembers, guild_messages: messages, tournament_stages: source.tournament_stages, tournament_results: results,
    idMap: Object.fromEntries(idMap as Map<string, string>),
    summary: { sourceMembers: source.members.length, linkedMembers, insertedMembers: source.members.length - linkedMembers,
      sourceMessages: messages.length, sourceStages: source.tournament_stages.length, sourceResults: results.length,
      historicalPoints: plannedMembers.reduce((s, m) => s + Number(m.score), 0) } };
}
