import { achievementDefinition, type AchievementId } from "../lib/achievements";
import "./achievement-profile.css";
export default function AchievementProfile({ profile }: { profile?: { badgeIds: AchievementId[]; title: string | null } }) {
  if (!profile || (!profile.badgeIds.length && !profile.title)) return null;
  return <span className="achievement-profile-caption">{profile.title && <span>{profile.title}</span>}{profile.badgeIds.map(id => { const d = achievementDefinition(id); return d ? <span key={id} title={d.name} aria-label={d.name}><i aria-hidden="true">{d.icon}</i> {d.name}</span> : null; })}</span>;
}
