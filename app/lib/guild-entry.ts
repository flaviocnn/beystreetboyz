import type { PlayerMember } from "./client-api";

/** Only verified access blocks the room. Optional data can arrive (or fail) later. */
export async function loadGuildEntry<T>(options: {
  session: () => Promise<{ member: PlayerMember | null }>;
  ranking: (memberId: string) => Promise<T>;
  access: (member: PlayerMember | null) => void;
  ranked: (data: T) => void;
  accessError: (error: unknown) => void;
  rankingError: (error: unknown) => void;
  passwordRequired: () => void;
  active: () => boolean;
}) {
  try {
    const { member } = await options.session();
    if (!options.active()) return;
    if (member?.mustChangePassword) { options.passwordRequired(); return; }
    options.access(member);
    if (member) {
      void Promise.resolve().then(async () => {
        if (!options.active()) return;
        try { const data = await options.ranking(member.id); if (options.active()) options.ranked(data); }
        catch (error) { if (options.active()) options.rankingError(error); }
      });
    }
  } catch (error) { if (options.active()) options.accessError(error); }
}
