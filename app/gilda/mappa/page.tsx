"use client";
import dynamic from "next/dynamic";
import "./throne.css";
import "./slot-machine.css";
import "./blackjack.css";
import { memberDisplayName } from "../../lib/member-name";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameAudio, usePopupSound } from "../../lib/game-audio";
import { drawPixelPlayer, type Direction } from "../../lib/pixel-player";
import { type PlayerMember as Member } from "../../lib/client-api";
import { useDialogFocus } from "../../lib/dialog-focus";
import { WORLD, START, PLACES, GAMES, canWalk, nearbyPlace, guildCamera, drawGuildWorld, drawRoomDetails, drawChampion, type PlaceId, type RankingPreview } from "./guild-world";
import ThroneCard from "./throne-card";
import { useReigningChampion } from "../../lib/use-reigning-champion";
import type { ReigningChampion } from "../../lib/reigning-champion";
import AchievementProfile from "../../components/achievement-profile";
import type { AchievementId } from "../../lib/achievements";
import { useWorldWeather, WorldWeatherBadge } from "../../components/world-weather";
import { createAtmospherePaint, drawWorldAtmosphere } from "../../lib/world-atmosphere";
import { WorldDpad, WorldGuide, WorldHud, WorldInteraction } from "../../components/world-controls";
import { KEY_DIRECTIONS, WALK_SPEED, isWorldInputTarget, drawWorldOverview } from "../../lib/world-game";
import { getGameData, getGameSession } from "../../lib/game-data";
import { loadGuildEntry } from "../../lib/guild-entry";

const MirrorPhoto = dynamic(() => import("./mirror-photo"), { loading: () => <p role="status">Preparo lo specchio…</p> });
const GuildBoard = dynamic(() => import("./guild-board"), { loading: () => <p role="status">Apro la bacheca…</p> });
const StageArchive = dynamic(() => import("./stage-archive"), { loading: () => <p role="status">Sfoglio l’archivio…</p> });
const SlotMachine = dynamic(() => import("./slot-machine"), { loading: () => <p role="status">Accendo la slot…</p> });
const Blackjack = dynamic(() => import("./blackjack"), { loading: () => <p role="status">Preparo il tavolo…</p> });

type RankingRow = { id: string; firstName: string; lastName: string | null; challongeUsername: string | null; score: number; rank: number; achievements?: { badgeIds: AchievementId[]; title: string | null } };
function beginWalk(keys: Set<Direction>, player: { x: number; y: number; dir: Direction }, direction: Direction) {
  // Make short taps move too, even when released before the next animation frame.
  if (!keys.has(direction)) {
    const x = player.x + (direction === "left" ? -8 : direction === "right" ? 8 : 0);
    const y = player.y + (direction === "up" ? -8 : direction === "down" ? 8 : 0);
    if (canWalk(x, y)) { player.x = x; player.y = y; player.dir = direction; keys.add(direction); return true; }
    player.dir = direction;
  }
  keys.add(direction);
  return false;
}

function GuildRoom({ onOpen, onNear, onStep, paused, member, champion, leaders }: {
  member: Member; onOpen: (id: PlaceId) => void; onNear: (id: PlaceId | null) => void; onStep: () => void; paused: boolean;
  champion: ReigningChampion | null;
  leaders: RankingPreview[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weather = useWorldWeather(), weatherRef = useRef(weather);
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  const playerRef = useRef({ ...START, dir: "up" as Direction });
  const keysRef = useRef(new Set<Direction>());
  const guideRef = useRef(false), leadersRef = useRef(leaders);
  useEffect(() => { leadersRef.current = leaders; }, [leaders]);
  const championRef = useRef(champion);
  useEffect(() => { championRef.current = champion; }, [champion]);
  const nearRef = useRef<PlaceId | null>(null), pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; if (paused) keysRef.current.clear(); }, [paused]);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const background = document.createElement("canvas"); background.width = WORLD.width; background.height = WORLD.height;
    const backgroundContext = background.getContext("2d");
    if (!backgroundContext) return;
    drawGuildWorld(backgroundContext);
    const resize = () => { const rect = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.floor(rect.width)); canvas.height = Math.max(1, Math.floor(rect.height)); ctx.imageSmoothingEnabled = false; };
    resize(); const observer = new ResizeObserver(resize); observer.observe(canvas);
    let frame = 0, last = performance.now(), lastFootstep = 0;
    const atmosphere = createAtmospherePaint();
    const render = (now: number) => {
      const dt = Math.min(32, now - last); last = now;
      const player = playerRef.current, keys = keysRef.current;
      let dx = 0, dy = 0;
      if (!pausedRef.current) { if (keys.has("left")) dx--; if (keys.has("right")) dx++; if (keys.has("up")) dy--; if (keys.has("down")) dy++; }
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
      const beforeX = player.x, beforeY = player.y, speed = WALK_SPEED * dt;
      if (canWalk(player.x + dx * speed, player.y)) player.x += dx * speed;
      if (canWalk(player.x, player.y + dy * speed)) player.y += dy * speed;
      const walking = beforeX !== player.x || beforeY !== player.y;
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? "left" : "right"; else if (dy) player.dir = dy < 0 ? "up" : "down";
      if (walking && now - lastFootstep > 245) { onStep(); lastFootstep = now; }
      const near = nearbyPlace(player.x, player.y);
      if (near !== nearRef.current) { nearRef.current = near; onNear(near); }
      const camera = guildCamera(canvas.width, canvas.height, player);
      ctx.fillStyle = "#dbe0d3"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(camera.scale, camera.scale); ctx.translate(-Math.round(camera.x), -Math.round(camera.y)); ctx.drawImage(background, 0, 0);
      drawRoomDetails(ctx, near, now, member, championRef.current, leadersRef.current); drawPixelPlayer(ctx, player.x, player.y, player.dir, walking, now, member); ctx.restore();
      drawWorldAtmosphere(ctx, canvas.width, canvas.height, now, weatherRef.current, atmosphere, true);
      if (guideRef.current) drawWorldOverview(ctx, WORLD, player, PLACES);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const keydown = (event: KeyboardEvent) => {
      if (pausedRef.current || isWorldInputTarget(event.target)) return;
      const direction = KEY_DIRECTIONS[event.key] || KEY_DIRECTIONS[event.key.toLowerCase()];
      if (direction) { event.preventDefault(); if (beginWalk(keysRef.current, playerRef.current, direction)) onStep(); }
      if (event.key === "Enter" && nearRef.current && !event.repeat) { event.preventDefault(); onOpen(nearRef.current); }
    };
    const keyup = (event: KeyboardEvent) => { const direction = KEY_DIRECTIONS[event.key] || KEY_DIRECTIONS[event.key.toLowerCase()]; if (direction) keysRef.current.delete(direction); };
    const blur = () => keysRef.current.clear();
    const focus = (event: FocusEvent) => { if (isWorldInputTarget(event.target)) blur(); };
    document.addEventListener("focusin", focus);
    window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup); window.addEventListener("blur", blur); document.addEventListener("visibilitychange", blur);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("focusin", focus); window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", blur); };
  }, [onOpen, onNear, onStep, member]);
  return <>
    <canvas ref={canvasRef} className="guild-canvas" tabIndex={0} onPointerDown={event => event.currentTarget.focus()} aria-label="Mappa della Gilda: classifica e trono sulla pedana centrale a nord, specchio nell'ala ovest e archivio tappe nell'ala est. Nella galleria a sud: bacheca a sinistra, statua annuale al centro, libreria a destra. Muoviti con le frecce o i pulsanti touch e interagisci vicino agli oggetti." />
    <WorldWeatherBadge indoor />
    <WorldGuide places={PLACES} onChange={value => { guideRef.current = value; }} paused={paused} />
    <WorldDpad paused={paused} onDirection={(direction, active) => { if (active && !pausedRef.current) { if (beginWalk(keysRef.current, playerRef.current, direction)) onStep(); } else keysRef.current.delete(direction); }} />
  </>;
}
function ChampionPortrait() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const ctx = ref.current?.getContext("2d"); if (ctx) { ctx.clearRect(0, 0, 360, 350); ctx.imageSmoothingEnabled = false; drawChampion(ctx, 180, 220, 2); } }, []);
  return <canvas ref={ref} width={360} height={350} aria-label="Statua pixel art di GranBurstone con corona, trofeo e lanciatore" />;
}
function Library({ onClick, memberId }: { onClick: () => void; memberId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <><p className="guild-object-description">Scegli un gioco e porta i tuoi Beycoin al tavolo.</p>
    <div className="library-shelves library-playable-shelves" aria-label="Giochi della Gilda">{GAMES.map(g => <button key={g.id} style={{ "--box-color": g.color } as React.CSSProperties} aria-pressed={g.id === selected} onClick={() => { setSelected(g.id); onClick(); }}><span className="game-box-symbol" aria-hidden="true">{g.symbol}</span><strong>{g.title}</strong><small>{g.kind}</small></button>)}</div>
    {selected === "slot" && <SlotMachine memberId={memberId} />}
    {selected === "blackjack" && <Blackjack memberId={memberId} />}
  </>;
}

export default function GuildMapPage() {
  const [loading, setLoading] = useState(true), [member, setMember] = useState<Member | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]), [error, setError] = useState("");
  const [accessError, setAccessError] = useState(""), [rankingLoaded, setRankingLoaded] = useState(false);
  const leaders = useMemo(() => ranking.slice(0, 3).map(row => ({ name: memberDisplayName(row), rank: row.rank, score: row.score })), [ranking]);
  const [near, setNear] = useState<PlaceId | null>(null), [opened, setOpened] = useState<PlaceId | null>(null);
  const championState = useReigningChampion(member?.id);
  usePopupSound(near);
  useDialogFocus(!!opened);
  const { playClick, playStep } = useGameAudio("guild");
  const open = useCallback((id: PlaceId) => setOpened(id), []);
  const close = useCallback(() => setOpened(null), []);
  const updateNear = useCallback((id: PlaceId | null) => setNear(id), []);
  useEffect(() => {
    // Warm only the nearby object's JavaScript; its private data still loads on open.
    const pending = near === "mirror" ? import("./mirror-photo") : near === "archive" ? import("./stage-archive") : near === "board" ? import("./guild-board") : null;
    void pending?.catch(() => {});
  }, [near]);
  useEffect(() => {
    let live = true;
    void loadGuildEntry({ session: getGameSession,
      ranking: id => getGameData<{ ranking: RankingRow[] }>("/api/guild/ranking", id),
      access: current => { setMember(current); setLoading(false); },
      ranked: result => { setRanking(result.ranking); setRankingLoaded(true); },
      accessError: cause => { setAccessError(cause instanceof Error ? cause.message : "Impossibile caricare la Gilda"); setLoading(false); },
      rankingError: cause => { setError(cause instanceof Error ? cause.message : "Classifica non disponibile"); setRankingLoaded(true); },
      passwordRequired: () => window.location.replace("/gilda"), active: () => live,
    });
    return () => { live = false; };
  }, []);
  const [rankingBusy, setRankingBusy] = useState(false);
  const refreshRanking = useCallback(async (force = false) => {
    if (!member) return;
    setRankingBusy(true);
    try { const data = await getGameData<{ ranking: RankingRow[] }>("/api/guild/ranking", member.id, 30000, force); setRanking(data.ranking); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Classifica non disponibile"); }
    finally { setRankingBusy(false); setRankingLoaded(true); }
  }, [member]);
  useEffect(() => {
    if (!member) return;
    const refresh = () => { if (!document.hidden) void refreshRanking(); };
    const interval = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [member, refreshRanking]);
  useEffect(() => { let live = true; if (opened === "ranking") void Promise.resolve().then(() => { if (live) void refreshRanking(); }); return () => { live = false; }; }, [opened, refreshRanking]);
  useEffect(() => {
    if (!opened) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [opened, close]);
  const nearby = PLACES.find((p) => p.id === near), selected = PLACES.find((p) => p.id === opened);
  return <main className="game-shell guild-map-shell world-shell">
    <WorldHud title="Gilda del Grifone" paused={!!opened}>
      {championState.champion && <button className="world-champion" onClick={() => open("throne")}>♛ Campione in carica: <strong>{championState.champion.displayName}</strong> →</button>}
    </WorldHud>
    {loading ? <div className="guild-map-message" role="status">Verifico il tuo accesso…</div> : !member ? <div className="guild-map-message"><h1>La porta è chiusa.</h1><p>{accessError || "Accedi con le tue credenziali per entrare."}</p><a className="solid-button" href="/gilda">VAI ALL’ACCESSO →</a></div> : <>
      <div className="guild-stage"><GuildRoom onOpen={open} onNear={updateNear} onStep={playStep} paused={!!opened} member={member} champion={championState.champion} leaders={leaders} />
        <WorldInteraction name={!opened ? nearby?.name : undefined} onOpen={() => { if (nearby) open(nearby.id); }} />
      </div>
      {opened && selected && <div className="guild-overlay" onMouseDown={close}><section className={`ranking-card guild-object-card guild-object-${opened}`} role="dialog" aria-modal="true" aria-labelledby="guild-object-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={close} aria-label="Chiudi">×</button>
        <p className="section-kicker">RANKED BEYSTREETBOYZ / {opened === "mirror" ? "IL TUO RITRATTO" : opened === "throne" ? "IL CAMPIONE IN CARICA" : opened === "champion" ? "ALBO D’ORO" : opened === "library" ? "UN ALTRO TURNO" : opened === "ranking" ? "CLASSIFICA" : opened === "archive" ? "LE TUE TAPPE E I TUOI DECK" : "BACHECA"}</p>
        <h2 id="guild-object-title">{selected.name}</h2>
        {opened === "mirror" && <MirrorPhoto member={member} onClick={playClick} championState={championState} />}
        {opened === "throne" && <ThroneCard state={championState} />}
        {opened === "champion" && <div className="champion-memorial"><div className="champion-sprite"><ChampionPortrait /></div><p className="champion-year">CAMPIONE RANKED · 2025</p><h3>GranBurstone</h3><p>Al campione della ranked dell’anno scorso.<br />Il suo nome resta scolpito nella storia della Gilda.</p><blockquote>Un trofeo passa di mano.<br />Una leggenda resta.</blockquote></div>}
        {opened === "library" && <Library onClick={playClick} memberId={member.id} />}
        {opened === "board" && <GuildBoard member={member} onClick={playClick} />}
        {opened === "archive" && <StageArchive onClick={playClick} memberId={member.id} />}
        {opened === "ranking" && <><p className="ranking-note">Le prestazioni dei membri, tappa dopo tappa. A pari punti contano vittorie di tappa e migliori prestazioni.</p><div className="ranking-refresh"><span>Aggiornamento automatico ogni minuto</span><button className="text-button" disabled={rankingBusy} onClick={() => void refreshRanking(true)}>{rankingBusy ? "AGGIORNO…" : "AGGIORNA ORA ↻"}</button></div>{!rankingLoaded && <p role="status">Carico la classifica. La sala è già pronta da esplorare.</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="ranking-list">{ranking.map(row => <div className={`ranking-row ${row.id === member.id ? "is-you" : ""}`} key={row.id}><span>{String(row.rank).padStart(2, "0")}</span><strong>{memberDisplayName(row)}{row.id === member.id ? " · TU" : ""}<AchievementProfile profile={row.achievements} /></strong><b>{row.score} PT</b></div>)}</div></>}
      </section></div>}
    </>}
  </main>;
}
