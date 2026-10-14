"use client";
import { useEffect, useRef, useState } from "react";
import { drawPixelPlayer, type Avatar } from "../../lib/pixel-player";
import type { PlayerMember } from "../../lib/client-api";

const BACKGROUNDS = [
  { name: "Fenici", ink: "#351d2c", paper: "#fff0d4", mid: "#a54146", light: "#f4a457", accent: "#ffd66d" },
  { name: "Metal", ink: "#172630", paper: "#edf2ed", mid: "#526570", light: "#9cbbc2", accent: "#e4ebed" },
  { name: "Punk", ink: "#282038", paper: "#f7e8ef", mid: "#813b77", light: "#d682a9", accent: "#e7df63" },
  { name: "Nessuno", ink: "#17203d", paper: "#eceddf", mid: "#536fa1", light: "#a7bdd6", accent: "#dfc77b" },
];
const POSES = ["Frontale", "Trionfante", "Sdraiato", "Guanto di sfida"];
export function drawPortrait(canvas: HTMLCanvasElement, avatar: Avatar, name: string, background: number, pose: number) {
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false; ctx.scale(3, 3);
  const theme = BACKGROUNDS[background] || BACKGROUNDS[0];
  const box = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const text = (value: string, y: number, size: number, color = theme.paper) => { ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = "center"; ctx.fillText(value, 180, y); };
  box(theme.ink, 0, 0, 360, 450); box(theme.paper, 10, 10, 340, 430); box(theme.ink, 15, 15, 330, 420);
  for (let x = 25; x < 340; x += 14) { box(theme.accent, x, 23, 7, 3); box(theme.accent, x, 423, 7, 3); }
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
  }
  box(theme.light, 81, 149, 9, 136); box(theme.light, 97, 152, 4, 77);
  box(theme.ink, 69, 302, 222, 31);
  for (let y = 305; y < 334; y += 10) for (let x = 70; x < 290; x += 20) if ((x / 20 + y / 10) % 2 < 1) box(theme.mid, x, y, 19, 9);
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
  text(displayName, 375, fontSize);
  text("IL MIO SIGILLO. LA MIA GILDA.", 398, 10, theme.light);
  text("MEMBER PORTRAIT  /  BEYSTREETBOYZ", 414, 8, theme.accent);
}

export default function MirrorPhoto({ member, onClick }: { member: PlayerMember; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState(member.firstName.slice(0, 24));
  const [background, setBackground] = useState(0), [pose, setPose] = useState(0);
  const [photo, setPhoto] = useState<{ url: string; blob: Blob } | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let live = true, url = "";
    setPhoto(null); setMessage("");
    drawPortrait(canvas, member, name, background, pose);
    canvas.toBlob((blob) => {
      if (!blob || !live) return;
      url = URL.createObjectURL(blob); setPhoto({ url, blob });
    }, "image/png");
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [member, name, background, pose]);
  async function shareInstagram() {
    if (!photo) return;
    onClick();
    const file = new File([photo.blob], "Ranked-BeyStreetBoyz.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: "Ranked BeyStreetBoyz", text: "Il mio avatar della Gilda del Grifone" });
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
    <div className="mirror-photo-preview"><canvas ref={canvasRef} hidden />{photo && <img src={photo.url} width={1080} height={1350} alt={`Ritratto pixel art di ${name || "un membro"}, con il brand Ranked BeyStreetBoyz`} />}</div>
    <div className="mirror-photo-options"><p>Uno specchio, il tuo avatar, il tuo sigillo. Crea una cartolina da portare con te.</p>
      <label className="mirror-name">NOME SULLA FOTO<input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome o nickname" /></label>
      <fieldset><legend>BACKGROUND</legend><div className="mirror-choices">{BACKGROUNDS.map((theme, index) => <button key={theme.name} aria-pressed={background === index} onClick={() => { setBackground(index); onClick(); }}>{theme.name}</button>)}</div></fieldset>
      <fieldset><legend>POSA</legend><div className="mirror-choices">{POSES.map((label, index) => <button key={label} aria-pressed={pose === index} onClick={() => { setPose(index); onClick(); }}>{label}</button>)}</div></fieldset>
      {photo ? <a className="solid-button" href={photo.url} download="Ranked-BeyStreetBoyz.png" onClick={() => { onClick(); setMessage("Ritratto pronto: se richiesto, conferma il salvataggio nel browser."); }}>SCARICA PNG <span>↓</span></a> : <p role="status">Preparo il ritratto…</p>}
      <button className="outline-button" disabled={!photo} onClick={() => void shareInstagram()}>CONDIVIDI SU INSTAGRAM ↗</button>
      <p className="mirror-photo-hint">Formato ritratto · 1080 × 1350 px<br />Su mobile scegli Instagram dal menu di condivisione. Se il dispositivo non lo supporta, la foto viene scaricata per caricarla nell’app.</p>
      {message && <p className="mirror-save-message" role="status">{message}</p>}
    </div>
  </div>;
}
