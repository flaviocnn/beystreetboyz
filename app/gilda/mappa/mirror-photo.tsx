"use client";
import { memberDisplayName } from "../../lib/member-name";
import { useEffect, useMemo, useRef, useState } from "react";
import { drawPixelPlayer, type Avatar } from "../../lib/pixel-player";
import type { PlayerMember } from "../../lib/client-api";
import type { PersonalStage } from "../../lib/decks";
import { achievementCaption, topEightStages, wrapPortraitText, type MirrorAchievement } from "../../lib/mirror-achievement";
import { ATTACK_MOTTO, MIRROR_MOTTOS, mirrorMotto } from "../../lib/mirror-mottos";
import { achievementDefinition, achievementTitle, type AchievementAlbum } from "../../lib/achievements";
import { drawChampionThrone } from "../../lib/throne-art";
import type { ChampionState } from "../../lib/use-reigning-champion";
import { canExportThrone } from "../../lib/reigning-champion";
import { getAchievementAlbum, getGameData } from "../../lib/game-data";

const BACKGROUNDS = [
  { name: "Fenici", ink: "#351d2c", paper: "#fff0d4", mid: "#a54146", light: "#f4a457", accent: "#ffd66d" },
  { name: "Metal", ink: "#172630", paper: "#edf2ed", mid: "#526570", light: "#9cbbc2", accent: "#e4ebed" },
  { name: "Punk", ink: "#282038", paper: "#f7e8ef", mid: "#813b77", light: "#d682a9", accent: "#e7df63" },
  { name: "Nessuno", ink: "#17203d", paper: "#eceddf", mid: "#536fa1", light: "#a7bdd6", accent: "#dfc77b" },
  { name: "Inferno", ink: "#240f1b", paper: "#fff0d1", mid: "#6e202c", light: "#ef6838", accent: "#ffce62" },
];
const POSES = ["Frontale", "Trionfante", "Sdraiato", "Guanto di sfida"];
type PortraitRewards = { frame: string; labels: string[] };
export function drawPortrait(canvas: HTMLCanvasElement, avatar: Avatar, name: string, background: number, pose: number, achievement: MirrorAchievement | null = null, mottoId = "guild-seal", throne = false, rewards: PortraitRewards = { frame: "", labels: [] }) {
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const caption = achievementCaption(achievement, (value, size) => { ctx.font = `bold ${size}px monospace`; return ctx.measureText(value).width; });
  ctx.font = "bold 10px monospace";
  const motto = mirrorMotto(mottoId);
  const mottoLines = motto ? wrapPortraitText(motto, value => ctx.measureText(value).width, 295) : [];
  const mottoExtra = Math.max(0, mottoLines.length - 1) * 14;
  const rewardLines = rewards.labels.flatMap(label => wrapPortraitText(label, value => ctx.measureText(value).width, 285));
  const rewardExtra = rewardLines.length ? 28 + rewardLines.length * 13 : 0;
  const baseHeight = (caption ? 435 + caption.height + 38 : 450) + mottoExtra;
  const height = baseHeight + rewardExtra;
  canvas.height = height * 3;
  ctx.imageSmoothingEnabled = false; ctx.scale(3, 3);
  const theme = BACKGROUNDS[background] || BACKGROUNDS[0];
  const box = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const text = (value: string, y: number, size: number, color = theme.paper, maxWidth?: number) => { ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = "center"; ctx.fillText(value, 180, y, maxWidth); };
  box(theme.ink, 0, 0, 360, height); box(theme.paper, 10, 10, 340, height - 20); box(theme.ink, 15, 15, 330, height - 30);
  if (rewards.frame) {
    const color = rewards.frame === "bronze" ? "#cd995f" : "#ffd66d";
    box(color, 4, 4, 352, 5); box(color, 4, height - 9, 352, 5); box(color, 4, 4, 5, height - 8); box(color, 351, 4, 5, height - 8);
    if (rewards.frame === "sparks") for (let y = 26; y < height - 24; y += 28) { box(color, 19, y, 5, 7); box(color, 336, y + 9, 5, 7); }
  }
  for (let x = 25; x < 340; x += 14) { box(theme.accent, x, 23, 7, 3); box(theme.accent, x, height - 27, 7, 3); }
  text("R A N K E D", 54, 14, theme.accent);
  text("BeyStreetBoyz", 85, 30);
  text(throne ? "CAMPIONE IN CARICA / TRONO DELLA GILDA" : "GILDA DEL GRIFONE / TORINO", 106, 9, theme.light);
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
  if (throne) drawChampionThrone(ctx, 180, 245, avatar, 0, .94);
  else {
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
  }
  if (!throne && pose === 1) { box(theme.accent, 113, 167, 7, 7); box(theme.accent, 243, 160, 7, 7); }
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
    for (const line of caption.lines) {
      const y = 435 + mottoExtra + line.y;
      if (!line.deckEntry) { text(line.text, y, line.size, line.accent ? theme.accent : theme.paper); continue; }
      // Minimal top-view Beyblade: stepped blade ring and a contrasting core.
      // Only the first line gets a bullet; wrapped components stay aligned.
      if (line.bullet) {
        box(theme.accent, 38, y - 10, 6, 2); box(theme.accent, 35, y - 8, 12, 6);
        box(theme.accent, 38, y - 2, 6, 2); box(theme.ink, 39, y - 7, 4, 4);
        box(theme.paper, 40, y - 6, 2, 2);
      }
      ctx.fillStyle = theme.paper; ctx.font = `bold ${line.size}px monospace`; ctx.textAlign = "left";
      ctx.fillText(line.text, 55, y);
    }
  }
  if (rewardLines.length) {
    box(theme.accent, 34, baseHeight - 12, 292, 2);
    rewardLines.forEach((line, index) => text(line, baseHeight + 6 + index * 13, 10, theme.light));
  }
}

export default function MirrorPhoto({ member, onClick, championState }: { member: PlayerMember; onClick: () => void; championState: ChampionState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState(memberDisplayName(member));
  const [background, setBackground] = useState(0), [pose, setPose] = useState(0);
  const [mottoId, setMottoId] = useState("guild-seal");
  const [photo, setPhoto] = useState<{ url: string; blob: Blob; width: number; height: number; throneStage: string | null } | null>(null);
  const [throneSelected, setThroneSelected] = useState(false), [throneNotice, setThroneNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [stages, setStages] = useState<PersonalStage[]>([]), [stageSlug, setStageSlug] = useState("");
  const [stagesStatus, setStagesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadStages, setReloadStages] = useState(0);
  const [album, setAlbum] = useState<AchievementAlbum | null>(null), [frame, setFrame] = useState("");
  const [showBadges, setShowBadges] = useState(false);
  const attackUnlocked = album?.achievements.some(a => a.id === "attack" && a.qualified) ?? false;
  const podiumUnlocked = album?.achievements.some(a => a.id === "podiums" && a.qualified) ?? false;
  const effectiveFrame = (frame === "sparks" && attackUnlocked) || (frame === "bronze" && podiumUnlocked) ? frame : "";
  const effectiveMotto = mottoId === ATTACK_MOTTO.id && !attackUnlocked ? "guild-seal" : mottoId;
  const rewards = useMemo(() => ({ frame: effectiveFrame, labels: showBadges && album ? [achievementTitle(album.titleId), ...album.showcase.map(id => achievementDefinition(id)?.name)].flatMap(value => value ? [value] : []) : [] }), [effectiveFrame, showBadges, album]);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const data = await getAchievementAlbum(member.id); if (!controller.signal.aborted) setAlbum(data);
      } catch { if (!controller.signal.aborted) setAlbum(null); }
    };
    void refresh(); const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [member.id]);
  const throne = throneSelected && championState.canUseThrone && championState.champion?.memberId === member.id;
  const portraitName = throne ? championState.champion!.displayName : name;
  const achievement = useMemo(() => throne && championState.champion
    ? { name: championState.champion.stage.name, finalRank: 1, deck: championState.champion.deck }
    : stages.find(stage => stage.slug === stageSlug) ?? null, [throne, championState.champion, stages, stageSlug]);
  const throneStage = throne ? championState.champion!.stage.slug : null;
  useEffect(() => {
    const controller = new AbortController();
    void getGameData<{ stages: PersonalStage[] }>("/api/guild/stages", member.id, 30000, reloadStages > 0).then(data => {
      if (!Array.isArray(data?.stages)) throw new Error("stages_unavailable");
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
    drawPortrait(canvas, member, portraitName, background, pose, achievement, effectiveMotto, throne, rewards);
    const width = canvas.width, height = canvas.height;
    canvas.toBlob((blob) => {
      if (!blob || !live) return;
      url = URL.createObjectURL(blob); setPhoto({ url, blob, width, height, throneStage });
    }, "image/png");
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [member, portraitName, background, pose, achievement, effectiveMotto, throne, throneStage, rewards]);
  async function authorizePhoto(selected: NonNullable<typeof photo>) {
    if (!selected.throneStage) return true;
    const latest = await championState.refresh();
    if (canExportThrone(latest, member.id, selected.throneStage)) return true;
    setThroneSelected(false);
    setThroneNotice("Il titolo non è più attivo oppure non è verificabile. Il ritratto del trono non è stato esportato: puoi usare il ritratto normale.");
    return false;
  }
  async function downloadThrone() {
    if (!photo || exporting) return;
    const selected = photo; setExporting(true); onClick();
    try {
      if (!await authorizePhoto(selected)) return;
      const url = URL.createObjectURL(selected.blob), link = document.createElement("a");
      link.href = url; link.download = "Ranked-BeyStreetBoyz-Campione.png"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } finally { setExporting(false); }
  }
  async function shareInstagram() {
    if (!photo || exporting) return;
    const selected = photo;
    onClick();
    if (!await authorizePhoto(selected)) return;
    const file = new File([selected.blob], "Ranked-BeyStreetBoyz.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: "Ranked BeyStreetBoyz", text: achievement ? `${achievement.name} · ${achievement.finalRank}° posto · Ranked BeyStreetBoyz` : "Il mio avatar della Gilda del Grifone" });
        return;
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") return;
      }
    }
    const link = document.createElement("a");
    const url = URL.createObjectURL(file);
    link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    setMessage("Foto scaricata. Apri Instagram e caricala dal tuo dispositivo.");
  }
  return <div className="mirror-workshop">
    <div className="mirror-photo-preview"><canvas ref={canvasRef} hidden />{photo && <img src={photo.url} width={photo.width} height={photo.height} alt={`Ritratto pixel art di ${portraitName || "un membro"}${throne ? ", campione in carica incoronato sul trono" : ""}, con il brand Ranked BeyStreetBoyz${achievement ? `, ${achievement.name}, ${achievement.finalRank}° posto${achievement.deck ? ", con deck registrato" : ""}` : ""}`} />}</div>
    <div className="mirror-photo-options"><p>Uno specchio, il tuo avatar, il tuo sigillo. Crea una cartolina da portare con te.</p>
      <fieldset><legend>RITRATTO DEL CAMPIONE</legend>
        {championState.canUseThrone && championState.champion?.memberId === member.id ? <label className="mirror-throne-choice"><input type="checkbox" checked={throne} onChange={event => { setThroneSelected(event.target.checked); setThroneNotice(""); onClick(); }} /> Sul trono · Campione di {championState.champion.stage.name}</label>
          : <p>{championState.loading ? "Verifico il campione in carica…" : "Il ritratto sul trono è riservato al vincitore in carica, fino ai risultati della tappa successiva."}</p>}
        {throne && <p>Ritratto esclusivo: avatar incoronato, username ufficiale, tappa vinta e deck, se registrato. Il titolo viene riverificato prima dell’esportazione.</p>}
        {throneNotice && <p role="status">{throneNotice}</p>}
      </fieldset>
      <label className="mirror-name">NOME SULLA FOTO<input value={portraitName} disabled={throne} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome o nickname" /></label>
      <label className="mirror-name">FRASE SULLA FOTO<select value={effectiveMotto} onChange={event => { setMottoId(event.target.value); onClick(); }}>
        <option value="">Nessuna · nascondi la scritta</option>
        {MIRROR_MOTTOS.map(motto => <option key={motto.id} value={motto.id}>{motto.text}</option>)}
        {attackUnlocked && <option value={ATTACK_MOTTO.id}>{ATTACK_MOTTO.text} · Impresa Nessuna difesa</option>}
      </select></label>
      <fieldset><legend>RICOMPENSE DELLE IMPRESE</legend>
        <label className="mirror-name">CORNICE<select value={effectiveFrame} onChange={event => { setFrame(event.target.value); onClick(); }}><option value="">Classica</option>{podiumUnlocked && <option value="bronze">Bronzo vivo · Abituato al podio</option>}{attackUnlocked && <option value="sparks">Scintille · Nessuna difesa</option>}</select></label>
        <label className="mirror-throne-choice"><input type="checkbox" checked={showBadges} onChange={event => { setShowBadges(event.target.checked); onClick(); }} /> Mostra il titolo e i distintivi della mia vetrina</label>
        <a href="/imprese">Gestisci le imprese e la vetrina →</a>
      </fieldset>
      <fieldset><legend>BACKGROUND</legend><div className="mirror-choices">{BACKGROUNDS.map((theme, index) => <button key={theme.name} aria-pressed={background === index} onClick={() => { setBackground(index); onClick(); }}>{theme.name}</button>)}</div></fieldset>
      <fieldset disabled={throne}><legend>POSA{throne ? " · SUL TRONO" : ""}</legend><div className="mirror-choices">{POSES.map((label, index) => <button key={label} aria-pressed={!throne && pose === index} onClick={() => { setPose(index); onClick(); }}>{label}</button>)}</div></fieldset>
      <fieldset className="mirror-achievement" disabled={throne}><legend>PIAZZAMENTO DI TAPPA{throne ? " · TAPPA VINTA INCLUSA" : ""}</legend>
        {throne && achievement ? <p>{achievement.name} · 1° posto{achievement.deck ? " · Il deck registrato sarà incluso automaticamente." : " · Nessun deck registrato per questa tappa."}</p> : stagesStatus === "loading" ? <p role="status">Cerco le tue tappe in top 8…</p> : stagesStatus === "error" ? <div><p role="alert">Non riesco a caricare le tappe. Puoi comunque creare il ritratto semplice.</p><button className="text-button" onClick={() => { onClick(); setStagesStatus("loading"); setReloadStages(value => value + 1); }}>RIPROVA</button></div> : stages.length ? <>
          <label className="mirror-name">TAPPA DA MOSTRARE<select value={stageSlug} onChange={event => { setStageSlug(event.target.value); onClick(); }}><option value="">Nessuna · solo ritratto</option>{stages.map(stage => <option key={stage.slug} value={stage.slug}>{stage.name} · {stage.finalRank}° posto · {stage.eventDate}</option>)}</select></label>
          {achievement && <p>{achievement.deck ? "Il deck registrato sarà incluso automaticamente nella foto." : "Nessun deck registrato per questa tappa: la foto includerà nome e piazzamento. Puoi aggiungere il deck nell’Archivio delle Tappe."}</p>}
        </> : <p>Non hai ancora risultati in top 8 importati. Le tappe compariranno qui dopo la sincronizzazione dello staff.</p>}
      </fieldset>
      {photo ? photo.throneStage ? <button className="solid-button" disabled={exporting} onClick={() => void downloadThrone()}>{exporting ? "VERIFICO IL TITOLO…" : "SCARICA PNG DEL CAMPIONE ↓"}</button> : <a className="solid-button" href={photo.url} download="Ranked-BeyStreetBoyz.png" onClick={() => { onClick(); setMessage("Ritratto pronto: se richiesto, conferma il salvataggio nel browser."); }}>SCARICA PNG <span>↓</span></a> : <p role="status">Preparo il ritratto…</p>}
      <button className="outline-button" disabled={!photo || exporting} onClick={() => void shareInstagram()}>CONDIVIDI SU INSTAGRAM ↗</button>
      <p className="mirror-photo-hint">Formato ritratto · {photo ? `${photo.width} × ${photo.height}` : "1080 × 1350"} px{achievement && <><br />L’altezza si adatta al testo per non tagliare nome e componenti.</>}<br />Su mobile scegli Instagram dal menu di condivisione. Se il dispositivo non lo supporta, la foto viene scaricata per caricarla nell’app.</p>
      {message && <p className="mirror-save-message" role="status">{message}</p>}
    </div>
  </div>;
}
