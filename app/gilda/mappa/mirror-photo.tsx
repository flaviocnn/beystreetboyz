"use client";
import { memberDisplayName } from "../../lib/member-name";
import { useEffect, useRef, useState } from "react";
import { drawPixelPlayer, type Avatar } from "../../lib/pixel-player";
import type { PlayerMember } from "../../lib/client-api";
import type { PersonalStage } from "../../lib/decks";
import { achievementCaption, topEightStages, wrapPortraitText, type MirrorAchievement } from "../../lib/mirror-achievement";
import { MIRROR_MOTTOS, mirrorMotto } from "../../lib/mirror-mottos";

const BACKGROUNDS = [
  { name: "Fenici", ink: "#351d2c", paper: "#fff0d4", mid: "#a54146", light: "#f4a457", accent: "#ffd66d" },
  { name: "Metal", ink: "#172630", paper: "#edf2ed", mid: "#526570", light: "#9cbbc2", accent: "#e4ebed" },
  { name: "Punk", ink: "#282038", paper: "#f7e8ef", mid: "#813b77", light: "#d682a9", accent: "#e7df63" },
  { name: "Nessuno", ink: "#17203d", paper: "#eceddf", mid: "#536fa1", light: "#a7bdd6", accent: "#dfc77b" },
  { name: "Inferno", ink: "#240f1b", paper: "#fff0d1", mid: "#6e202c", light: "#ef6838", accent: "#ffce62" },
];
const POSES = ["Frontale", "Trionfante", "Sdraiato", "Guanto di sfida"];
export function drawPortrait(canvas: HTMLCanvasElement, avatar: Avatar, name: string, background: number, pose: number, achievement: MirrorAchievement | null = null, mottoId = "guild-seal") {
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const caption = achievementCaption(achievement, (value, size) => { ctx.font = `bold ${size}px monospace`; return ctx.measureText(value).width; });
  ctx.font = "bold 10px monospace";
  const motto = mirrorMotto(mottoId);
  const mottoLines = motto ? wrapPortraitText(motto, value => ctx.measureText(value).width, 295) : [];
  const mottoExtra = Math.max(0, mottoLines.length - 1) * 14;
  const height = (caption ? 435 + caption.height + 38 : 450) + mottoExtra;
  canvas.height = height * 3;
  ctx.imageSmoothingEnabled = false; ctx.scale(3, 3);
  const theme = BACKGROUNDS[background] || BACKGROUNDS[0];
  const box = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const text = (value: string, y: number, size: number, color = theme.paper, maxWidth?: number) => { ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = "center"; ctx.fillText(value, 180, y, maxWidth); };
  box(theme.ink, 0, 0, 360, height); box(theme.paper, 10, 10, 340, height - 20); box(theme.ink, 15, 15, 330, height - 30);
  for (let x = 25; x < 340; x += 14) { box(theme.accent, x, 23, 7, 3); box(theme.accent, x, height - 27, 7, 3); }
  text("R A N K E D", 54, 14, theme.accent);
  text("BeyStreetBoyz", 85, 30);
  text("GILDA DEL GRIFONE / TORINO", 106, 9, theme.light);
  // Pixel mirror, geometric floor and light beams, all rendered without external assets.
  box(theme.accent, 57, 124, 246, 221); box(theme.paper, 63, 130, 234, 208); box(theme.mid, 68, 135, 224, 199);
  if (background === 0) {
    // Flame wings rise behind the avatar.
    for (let row = 0; row < 8; row++) {
      box(row % 2 ? theme.accent : theme.light, 77 + row * 5, 270 - row * 16, 52 - row * 3, 11);
      box(row % 2 ? theme.accent : theme.light, 232 - row * 2, 270 - row * 16, 52 - row * 3, 11);
    }
    for (let x = 91; x < 282; x += 31) for (let y = 157; y < 298; y += 43) box(theme.accent, x + (y % 3) * 3, y, 4, 7);
  } else if (background === 1) {
    // Riveted steel plates and reflective seams.
    for (let y = 137; y < 332; y += 28) {
      box(theme.ink, 70, y, 220, 3);
      for (let x = 75 + (Math.floor(y / 28) % 2) * 17; x < 288; x += 34) {
        box(theme.light, x, y + 6, 16, 3); box(theme.accent, x + 3, y + 16, 4, 4);
      }
    }
  } else if (background === 2) {
    // Checkerboard and bright graffiti bolts.
    for (let y = 137; y < 331; y += 18) for (let x = 70; x < 289; x += 18) if ((Math.floor(x / 18) + Math.floor(y / 18)) % 2) box(theme.ink, x, y, 18, 18);
    for (const x of [88, 251]) for (let y = 163; y < 290; y += 31) {
      box(theme.accent, x, y, 20, 5); box(theme.accent, x + 7, y + 5, 5, 12); box(theme.accent, x + 2, y + 17, 20, 5);
    }
  } else if (background === 4) {
    // Obsidian towers, a blazing portal and rising lava flames.
    box(theme.ink, 117, 149, 126, 166); box(theme.light, 124, 155, 112, 160);
    box(theme.accent, 131, 164, 98, 150); box(theme.mid, 141, 174, 78, 140);
    for (const x of [73, 253]) {
      box(theme.ink, x, 172, 34, 146);
      for (let y = 180; y < 310; y += 20) box(theme.mid, x + 4, y, 24, 3);
      box(theme.ink, x + 7, 156, 20, 20);
    }
    for (let i = 0; i < 12; i++) {
      const x = 72 + i * 18, h = 20 + (i * 17) % 49;
      box(theme.light, x, 302 - h, 13, h);
      box(theme.accent, x + 4, 310 - h, 5, h - 8);
      box(theme.accent, 80 + (i * 47) % 200, 145 + (i * 29) % 115, 3, 5);
    }
  }
  if (background !== 4) { box(theme.light, 81, 149, 9, 136); box(theme.light, 97, 152, 4, 77); }
  box(theme.ink, 69, 302, 222, 31);
  for (let y = 305; y < 334; y += 10) for (let x = 70; x < 290; x += 20) if ((x / 20 + y / 10) % 2 < 1) box(theme.mid, x, y, 19, 9);
  if (background === 4) for (let x = 73; x < 285; x += 21) { box(theme.light, x, 312 + x % 9, 17, 3); box(theme.accent, x + 4, 315 + x % 9, 8, 2); }
  ctx.save();
  ctx.translate(pose === 2 ? 171 : 180, pose === 2 ? 256 : 230);
  if (pose === 2) ctx.rotate(-Math.PI / 2);
  ctx.scale(3, 3);
  drawPixelPlayer(ctx, 0, 0, "down", false, 0, avatar);
  if (pose === 1) {
    box(theme.ink, -19, -11, 8, 16); box(theme.ink, 11, -11, 8, 16);
    box(theme.accent, -17, -9, 4, 6); box(theme.accent, 13, -9, 4, 6);
  } else if (pose === 3) {
    box(theme.ink, 11, 5, 14, 10); box(theme.accent, 20, 0, 17, 17);
    box(theme.paper, 23, 3, 5, 6); box(theme.ink, 25, 15, 9, 3);
  }
  ctx.restore();
  if (pose === 1) { box(theme.accent, 113, 167, 7, 7); box(theme.accent, 243, 160, 7, 7); }
  for (const [x, y] of [[112, 169], [248, 189], [268, 275]]) { box(theme.paper, x - 5, y, 15, 5); box(theme.paper, x, y - 5, 5, 15); }
  for (const [x, y] of [[49, 116], [294, 116], [49, 333], [294, 333]]) box(theme.accent, x, y, 17, 17);
  const displayName = name.trim() || "UN MEMBRO DELLA GILDA";
  let fontSize = 22;
  ctx.font = `bold ${fontSize}px monospace`;
  while (ctx.measureText(displayName).width > 295 && fontSize > 11) { fontSize--; ctx.font = `bold ${fontSize}px monospace`; }
  text(displayName, 375, fontSize, theme.paper, 295);
  mottoLines.forEach((line, index) => text(line, 398 + index * 14, 10, theme.light));
  text("MEMBER PORTRAIT  /  BEYSTREETBOYZ", 414 + mottoExtra, 8, theme.accent);
  if (caption) {
    box(theme.accent, 25, 430 + mottoExtra, 310, 3);
    box(theme.mid, 25, 435 + mottoExtra, 310, caption.height);
    for (const line of caption.lines) text(line.text, 435 + mottoExtra + line.y, line.size, line.accent ? theme.accent : theme.paper);
  }
}

export default function MirrorPhoto({ member, onClick }: { member: PlayerMember; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState(memberDisplayName(member));
  const [background, setBackground] = useState(0), [pose, setPose] = useState(0);
  const [mottoId, setMottoId] = useState("guild-seal");
  const [photo, setPhoto] = useState<{ url: string; blob: Blob; width: number; height: number } | null>(null);
  const [message, setMessage] = useState("");
  const [stages, setStages] = useState<PersonalStage[]>([]), [stageSlug, setStageSlug] = useState("");
  const [stagesStatus, setStagesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadStages, setReloadStages] = useState(0);
  const achievement = stages.find(stage => stage.slug === stageSlug) ?? null;
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/guild/stages", { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data?.stages)) throw new Error("stages_unavailable");
      if (controller.signal.aborted) return;
      setStages(topEightStages(data.stages)); setStagesStatus("ready");
    }).catch(() => { if (!controller.signal.aborted) setStagesStatus("error"); });
    return () => controller.abort();
  }, [member.id, reloadStages]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let live = true, url = "";
    setPhoto(null); setMessage("");
    drawPortrait(canvas, member, name, background, pose, achievement, mottoId);
    const width = canvas.width, height = canvas.height;
    canvas.toBlob((blob) => {
      if (!blob || !live) return;
      url = URL.createObjectURL(blob); setPhoto({ url, blob, width, height });
    }, "image/png");
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [member, name, background, pose, achievement, mottoId]);
  async function shareInstagram() {
    if (!photo) return;
    onClick();
    const file = new File([photo.blob], "Ranked-BeyStreetBoyz.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: "Ranked BeyStreetBoyz", text: achievement ? `${achievement.name} · ${achievement.finalRank}° posto · Ranked BeyStreetBoyz` : "Il mio avatar della Gilda del Grifone" });
        return;
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") return;
      }
    }
    const link = document.createElement("a");
    link.href = photo.url; link.download = file.name; link.click();
    setMessage("Foto scaricata. Apri Instagram e caricala dal tuo dispositivo.");
  }
  return <div className="mirror-workshop">
    <div className="mirror-photo-preview"><canvas ref={canvasRef} hidden />{photo && <img src={photo.url} width={photo.width} height={photo.height} alt={`Ritratto pixel art di ${name || "un membro"}, con il brand Ranked BeyStreetBoyz${achievement ? `, ${achievement.name}, ${achievement.finalRank}° posto${achievement.deck ? ", con deck registrato" : ""}` : ""}`} />}</div>
    <div className="mirror-photo-options"><p>Uno specchio, il tuo avatar, il tuo sigillo. Crea una cartolina da portare con te.</p>
      <label className="mirror-name">NOME SULLA FOTO<input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome o nickname" /></label>
      <label className="mirror-name">FRASE SULLA FOTO<select value={mottoId} onChange={event => { setMottoId(event.target.value); onClick(); }}>
        <option value="">Nessuna · nascondi la scritta</option>
        {MIRROR_MOTTOS.map(motto => <option key={motto.id} value={motto.id}>{motto.text}</option>)}
      </select></label>
      <fieldset><legend>BACKGROUND</legend><div className="mirror-choices">{BACKGROUNDS.map((theme, index) => <button key={theme.name} aria-pressed={background === index} onClick={() => { setBackground(index); onClick(); }}>{theme.name}</button>)}</div></fieldset>
      <fieldset><legend>POSA</legend><div className="mirror-choices">{POSES.map((label, index) => <button key={label} aria-pressed={pose === index} onClick={() => { setPose(index); onClick(); }}>{label}</button>)}</div></fieldset>
      <fieldset className="mirror-achievement"><legend>PIAZZAMENTO DI TAPPA</legend>
        {stagesStatus === "loading" ? <p role="status">Cerco le tue tappe in top 8…</p> : stagesStatus === "error" ? <div><p role="alert">Non riesco a caricare le tappe. Puoi comunque creare il ritratto semplice.</p><button className="text-button" onClick={() => { onClick(); setStagesStatus("loading"); setReloadStages(value => value + 1); }}>RIPROVA</button></div> : stages.length ? <>
          <label className="mirror-name">TAPPA DA MOSTRARE<select value={stageSlug} onChange={event => { setStageSlug(event.target.value); onClick(); }}><option value="">Nessuna · solo ritratto</option>{stages.map(stage => <option key={stage.slug} value={stage.slug}>{stage.name} · {stage.finalRank}° posto · {stage.eventDate}</option>)}</select></label>
          {achievement && <p>{achievement.deck ? "Il deck registrato sarà incluso automaticamente nella foto." : "Nessun deck registrato per questa tappa: la foto includerà nome e piazzamento. Puoi aggiungere il deck nell’Archivio delle Tappe."}</p>}
        </> : <p>Non hai ancora risultati in top 8 importati. Le tappe compariranno qui dopo la sincronizzazione dello staff.</p>}
      </fieldset>
      {photo ? <a className="solid-button" href={photo.url} download="Ranked-BeyStreetBoyz.png" onClick={() => { onClick(); setMessage("Ritratto pronto: se richiesto, conferma il salvataggio nel browser."); }}>SCARICA PNG <span>↓</span></a> : <p role="status">Preparo il ritratto…</p>}
      <button className="outline-button" disabled={!photo} onClick={() => void shareInstagram()}>CONDIVIDI SU INSTAGRAM ↗</button>
      <p className="mirror-photo-hint">Formato ritratto · {photo ? `${photo.width} × ${photo.height}` : "1080 × 1350"} px{achievement && <><br />L’altezza si adatta al testo per non tagliare nome e componenti.</>}<br />Su mobile scegli Instagram dal menu di condivisione. Se il dispositivo non lo supporta, la foto viene scaricata per caricarla nell’app.</p>
      {message && <p className="mirror-save-message" role="status">{message}</p>}
    </div>
  </div>;
}
