"use client";
import { useEffect, useRef, useState } from "react";
import { drawPixelPlayer, type Avatar, type Direction } from "../../lib/pixel-player";
import type { PlayerMember } from "../../lib/client-api";

const THEMES = [
  { name: "Cobalto", ink: "#17203d", paper: "#eceddf", mid: "#536fa1", light: "#a7bdd6", accent: "#dfc77b" },
  { name: "Salvia", ink: "#253a30", paper: "#eff0df", mid: "#627c60", light: "#b0c7a1", accent: "#e5ca7c" },
  { name: "Crepuscolo", ink: "#302239", paper: "#f2e8df", mid: "#846184", light: "#c5a6bd", accent: "#edb191" },
];
export function drawPortrait(canvas: HTMLCanvasElement, avatar: Avatar, name: string, themeIndex: number, direction: Direction) {
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false; ctx.scale(3, 3);
  const theme = THEMES[themeIndex];
  const box = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const text = (value: string, y: number, size: number, color = theme.paper) => { ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = "center"; ctx.fillText(value, 180, y); };
  box(theme.ink, 0, 0, 360, 450); box(theme.paper, 10, 10, 340, 430); box(theme.ink, 15, 15, 330, 420);
  for (let x = 25; x < 340; x += 14) { box(theme.accent, x, 23, 7, 3); box(theme.accent, x, 423, 7, 3); }
  text("R A N K E D", 54, 14, theme.accent);
  text("BeyStreetBoyz", 85, 30);
  text("GILDA DEL GRIFONE / TORINO", 106, 9, theme.light);
  // Pixel mirror, geometric floor and light beams, all rendered without external assets.
  box(theme.accent, 57, 124, 246, 221); box(theme.paper, 63, 130, 234, 208); box(theme.mid, 68, 135, 224, 199);
  for (let y = 138; y < 333; y += 12) for (let x = 72; x < 291; x += 12) {
    if ((Math.floor(x / 12) + Math.floor(y / 12)) % 5 === 0) box(theme.light, x, y, 3, 3);
  }
  box(theme.light, 81, 149, 9, 136); box(theme.light, 97, 152, 4, 77);
  box(theme.ink, 69, 302, 222, 31);
  for (let y = 305; y < 334; y += 10) for (let x = 70; x < 290; x += 20) if ((x / 20 + y / 10) % 2 < 1) box(theme.mid, x, y, 19, 9);
  ctx.save(); ctx.translate(180, 230); ctx.scale(3, 3); drawPixelPlayer(ctx, 0, 0, direction, false, 0, avatar); ctx.restore();
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
  const [theme, setTheme] = useState(0), [direction, setDirection] = useState<Direction>("down");
  const [photo, setPhoto] = useState<{ url: string; blob: Blob } | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let live = true, url = "";
    setPhoto(null); setMessage("");
    drawPortrait(canvas, member, name, theme, direction);
    canvas.toBlob((blob) => {
      if (!blob || !live) return;
      url = URL.createObjectURL(blob); setPhoto({ url, blob });
    }, "image/png");
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [member, name, theme, direction]);
  async function share() {
    if (!photo) return;
    const file = new File([photo.blob], "Ranked-BeyStreetBoyz.png", { type: "image/png" });
    if (!navigator.canShare?.({ files: [file] })) { setMessage("Usa SCARICA PNG per salvare il ritratto sul tuo dispositivo."); return; }
    try { await navigator.share({ files: [file], title: "Ranked BeyStreetBoyz · Il mio avatar" }); }
    catch (cause) { if (!(cause instanceof Error && cause.name === "AbortError")) setMessage("Condivisione non disponibile. Puoi usare SCARICA PNG."); }
  }
  return <div className="mirror-workshop">
    <div className="mirror-photo-preview"><canvas ref={canvasRef} hidden />{photo && <img src={photo.url} width={1080} height={1350} alt={`Ritratto pixel art di ${name || "un membro"}, con il brand Ranked BeyStreetBoyz`} />}</div>
    <div className="mirror-photo-options"><p>Uno specchio, il tuo avatar, il tuo sigillo. Crea una cartolina da portare con te.</p>
      <label className="mirror-name">NOME SULLA FOTO<input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome o nickname" /></label>
      <fieldset><legend>CORNICE</legend><div className="mirror-choices">{THEMES.map((t, i) => <button key={t.name} aria-pressed={theme === i} onClick={() => { setTheme(i); onClick(); }}>{t.name}</button>)}</div></fieldset>
      <fieldset><legend>POSA</legend><div className="mirror-choices">{([['left', '← Profilo'], ['down', 'Frontale'], ['right', 'Profilo →']] as const).map(([value, label]) => <button key={value} aria-pressed={direction === value} onClick={() => { setDirection(value); onClick(); }}>{label}</button>)}</div></fieldset>
      {photo ? <a className="solid-button" href={photo.url} download="Ranked-BeyStreetBoyz.png" onClick={() => { onClick(); setMessage("Ritratto pronto: se richiesto, conferma il salvataggio nel browser."); }}>SCARICA PNG <span>↓</span></a> : <p role="status">Preparo il ritratto…</p>}
      <button className="outline-button" disabled={!photo} onClick={() => void share()}>CONDIVIDI LA FOTO ↗</button>
      <p className="mirror-photo-hint">Formato ritratto · 1080 × 1350 px<br />Su mobile puoi anche tenere premuto sul ritratto per salvarlo. Il colore e il personaggio sono quelli scelti al Wistery.</p>
      {message && <p className="mirror-save-message" role="status">{message}</p>}
    </div>
  </div>;
}
