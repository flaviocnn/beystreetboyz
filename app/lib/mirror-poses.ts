import { drawPixelPlayer, type Avatar, type PlayerPose } from "./pixel-player";

export const MIRROR_POSES: { label: string; pose: PlayerPose }[] = [
  { label: "Frontale", pose: "portrait" },
  { label: "Trionfante", pose: "triumphant" },
  { label: "Sdraiato", pose: "reclining" },
  { label: "Guanto di sfida", pose: "challenge" },
];

export function drawMirrorPose(ctx: CanvasRenderingContext2D, x: number, y: number, avatar: Avatar, poseIndex: number, scale = 1) {
  const selected = MIRROR_POSES[poseIndex] || MIRROR_POSES[0];
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  drawPixelPlayer(ctx, 0, 0, "down", false, 0, avatar, selected.pose);
  ctx.restore();
}
