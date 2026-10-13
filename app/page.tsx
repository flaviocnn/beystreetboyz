"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Direction = "up" | "down" | "left" | "right";
type Place = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  detail: string;
  x: number;
  y: number;
};

const WORLD = { width: 1500, height: 940 };
const START = { x: 735, y: 455 };
const PALETTE = {
  ink: "#202322",
  dark: "#515753",
  mid: "#9ba39b",
  pale: "#d8ddd4",
  paper: "#f2f3ea",
};

const places: Place[] = [
  {
    id: "intesa",
    name: "Grattacielo Intesa Sanpaolo",
    eyebrow: "CORSO INGHILTERRA · TORINO",
    description:
      "Una torre bioclimatica alta 167 metri, progettata da Renzo Piano come una lanterna trasparente sulla città.",
    detail: "44 piani · Serra panoramica · Auditorium sospeso",
    x: 260,
    y: 245,
  },
  {
    id: "dora",
    name: "Parco Dora Skatepark",
    eyebrow: "PARCO DORA · TORINO",
    description:
      "Cemento, acciaio e memoria industriale: uno spazio urbano sotto le grandi strutture delle ex acciaierie.",
    detail: "Bowl · Street plaza · Archeologia industriale",
    x: 1190,
    y: 235,
  },
  {
    id: "wistery",
    name: "Wistery Club",
    eyebrow: "COORDINATE SCONOSCIUTE",
    description:
      "Patria dei Cobalt Flames, il Wistery è un luogo misterioso e proibito, avvolto nelle tenebre. Per ora non è possibile accedere.",
    detail: "ACCESSO NEGATO · LUOGO PROIBITO · TORNA PRESTO",
    x: 1045,
    y: 735,
  },
  {
    id: "staff",
    name: "Il Palazzo dello Staff",
    eyebrow: "ACCESSO RISERVATO · TORINO QUEST",
    description: "L'archivio dei membri della città. Il personale autorizzato può creare e gestire le iscrizioni.",
    detail: "Serve la parola d'ordine per entrare",
    x: 485,
    y: 470,
  },
  {
    id: "guild",
    name: "La Gilda del Grifone",
    eyebrow: "SALA DEI MEMBRI · TORINO QUEST",
    description: "Varca la soglia con le credenziali consegnate dallo staff. All'interno ti aspetta la mappa della Gilda e la classifica.",
    detail: "Accesso membri · Classifica della Gilda",
    x: 975,
    y: 465,
  },
];

function pixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 11,
  align: CanvasTextAlign = "center",
  color = PALETTE.ink,
) {
  ctx.save();
  ctx.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = PALETTE.pale;
  for (let y = 18; y < WORLD.height; y += 30) {
    for (let x = 16 + ((y / 30) % 2) * 8; x < WORLD.width; x += 34) {
      ctx.fillRect(x, y, 3, 8);
      ctx.fillRect(x + 6, y + 4, 2, 4);
    }
  }

  // Main walkways, assembled from tiny tiles to keep the old-console texture.
  ctx.fillStyle = "#e5e8df";
  ctx.fillRect(0, 390, WORLD.width, 150);
  ctx.fillRect(650, 0, 170, WORLD.height);
  ctx.fillRect(780, 665, 330, 135);
  ctx.strokeStyle = PALETTE.mid;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(-4, 402, WORLD.width + 8, 126);
  ctx.strokeRect(662, -4, 146, WORLD.height + 8);
  ctx.setLineDash([]);
  ctx.fillStyle = PALETTE.mid;
  for (let y = 410; y < 525; y += 18) {
    for (let x = 8; x < WORLD.width; x += 28) {
      ctx.fillRect(x + ((y / 18) % 2) * 8, y, 13, 3);
    }
  }
  for (let y = 8; y < WORLD.height; y += 18) {
    for (let x = 672; x < 805; x += 28) {
      ctx.fillRect(x + ((y / 18) % 2) * 8, y, 13, 3);
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(x - 3, y + 13, 6, 13);
  ctx.fillStyle = PALETTE.dark;
  ctx.fillRect(x - 14, y - 4, 28, 19);
  ctx.fillRect(x - 9, y - 11, 18, 29);
  ctx.fillStyle = PALETTE.pale;
  ctx.fillRect(x - 7, y - 6, 5, 5);
  ctx.fillRect(x + 4, y + 4, 5, 5);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 14, y - 4, 28, 19);
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label?: string,
) {
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(x - 5, y + 12, w + 10, h - 7);
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 18);
  ctx.lineTo(x + w / 2, y - 14);
  ctx.lineTo(x + w + 12, y + 18);
  ctx.lineTo(x + w + 7, y + 25);
  ctx.lineTo(x + w / 2, y - 4);
  ctx.lineTo(x - 7, y + 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.pale;
  ctx.fillRect(x + 7, y + 28, w - 14, h - 27);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y + 20, w, h - 20);
  ctx.fillStyle = PALETTE.ink;
  for (let wx = x + 10; wx < x + w - 8; wx += 30) {
    ctx.fillRect(wx, y + 37, 18, 13);
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(wx + 3, y + 40, 12, 7);
    ctx.fillStyle = PALETTE.ink;
  }
  if (label) pixelText(ctx, label, x + w / 2, y + h - 10, 9);
}

function drawIntesa(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  // Slender glass tower, external structural ribs and the rooftop greenhouse.
  ctx.fillStyle = PALETTE.pale;
  ctx.fillRect(-60, -115, 120, 194);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-68, -121, 136, 8);
  ctx.fillRect(-69, 75, 138, 10);
  ctx.fillRect(-66, -113, 7, 188);
  ctx.fillRect(59, -113, 7, 188);
  ctx.fillStyle = PALETTE.mid;
  for (let row = -108; row < 71; row += 13) {
    ctx.fillRect(-54, row, 108, 7);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-50, row + 2, 31, 3);
    ctx.fillRect(-14, row + 2, 28, 3);
    ctx.fillRect(19, row + 2, 31, 3);
    ctx.fillStyle = PALETTE.mid;
  }
  // Visible exoskeleton and asymmetric service core.
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-46, -113, 4, 188);
  ctx.fillRect(42, -113, 4, 188);
  ctx.fillRect(13, -113, 5, 188);
  ctx.fillRect(-71, -70, 9, 83);
  // Panoramic bioclimatic greenhouse and antenna.
  ctx.fillRect(-7, -160, 14, 28);
  ctx.fillRect(-45, -134, 90, 8);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(-43, -158, 86, 32);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-36, -151, 72, 17);
  ctx.fillStyle = PALETTE.mid;
  for (let gx = -31; gx <= 29; gx += 15) ctx.fillRect(gx, -149, 5, 13);
  pixelText(ctx, "INTESA", 0, 98, 12);
  ctx.restore();
}

function drawSkatepark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  // Concrete skate plaza below Parco Dora's monumental industrial canopy.
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-128, -101, 256, 10);
  ctx.fillRect(-119, -91, 9, 46);
  ctx.fillRect(-42, -91, 9, 46);
  ctx.fillRect(33, -91, 9, 46);
  ctx.fillRect(110, -91, 9, 46);
  ctx.fillStyle = PALETTE.mid;
  for (let bx = -112; bx < 112; bx += 28) ctx.fillRect(bx, -98, 17, 4);
  ctx.fillStyle = PALETTE.pale;
  ctx.fillRect(-118, -51, 236, 131);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(-118, -51, 236, 131);
  ctx.strokeStyle = PALETTE.mid;
  ctx.lineWidth = 2;
  for (let i = -100; i < 110; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, -48);
    ctx.lineTo(i + 100, 74);
    ctx.stroke();
  }
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(-53, 9, 38, Math.PI, 0, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(54, 9, 38, Math.PI, 0, true);
  ctx.stroke();
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-10, -17, 20, 54);
  ctx.fillRect(-82, 50, 164, 7);
  pixelText(ctx, "PARCO DORA", 0, 101, 12);
  ctx.restore();
}

function drawWistery(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = PALETTE.ink;
  for (let r = 128; r > 52; r -= 13) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#111413";
  ctx.fillRect(-73, -60, 146, 125);
  ctx.fillRect(-86, -44, 172, 15);
  ctx.fillStyle = PALETTE.dark;
  ctx.fillRect(-58, -44, 116, 92);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-17, -13, 34, 61);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-10, -5, 4, 4);
  ctx.fillRect(32, -27, 15, 9);
  ctx.fillRect(-47, -27, 15, 9);
  ctx.strokeStyle = PALETTE.paper;
  ctx.lineWidth = 3;
  ctx.strokeRect(-73, -60, 146, 125);
  pixelText(ctx, "WISTERY", 0, 88, 12);
  ctx.restore();
}

function drawStaffPalace(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-88, -91, 176, 12);
  ctx.fillRect(-77, -112, 154, 20);
  ctx.fillRect(-64, -130, 128, 17);
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(-78, -78, 156, 143);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-68, -69, 136, 124);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(-78, -79, 156, 144);
  for (const windowX of [-53, 30]) {
    for (const windowY of [-55, -18]) {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(windowX, windowY, 24, 23);
      ctx.fillStyle = PALETTE.mid;
      ctx.fillRect(windowX + 4, windowY + 4, 16, 15);
    }
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-15, 15, 30, 50);
  ctx.fillRect(-96, 59, 192, 10);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-8, 22, 5, 5);
  pixelText(ctx, "STAFF", 0, 87, 12);
  ctx.restore();
}

function drawGuild(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.moveTo(-108, -72);
  ctx.lineTo(0, -134);
  ctx.lineTo(108, -72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(-94, -71, 188, 133);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-83, -61, 166, 112);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(-94, -71, 188, 133);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-23, 0, 46, 61);
  ctx.fillRect(-72, -37, 30, 30);
  ctx.fillRect(42, -37, 30, 30);
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(-66, -31, 18, 18);
  ctx.fillRect(48, -31, 18, 18);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-13, -103, 26, 25);
  ctx.fillStyle = PALETTE.paper;
  pixelText(ctx, "G", 0, -90, 17, "center", PALETTE.paper);
  pixelText(ctx, "GILDA DEL GRIFONE", 0, 87, 11);
  ctx.restore();
}

function drawMarker(ctx: CanvasRenderingContext2D, place: Place, active: boolean, t: number) {
  const y = place.y - 164 + Math.sin(t / 260) * 5;
  ctx.save();
  ctx.translate(place.x, y);
  ctx.fillStyle = active ? PALETTE.ink : PALETTE.paper;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 4;
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeRect(-16, -16, 32, 32);
  pixelText(ctx, active ? "!" : "?", 0, 0, 17, "center", active ? PALETTE.paper : PALETTE.ink);
  ctx.beginPath();
  ctx.moveTo(-7, 17);
  ctx.lineTo(7, 17);
  ctx.lineTo(0, 27);
  ctx.closePath();
  ctx.fillStyle = PALETTE.ink;
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Direction, walking: boolean, t: number) {
  const step = walking && Math.floor(t / 130) % 2 ? 2 : 0;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = "rgba(32,35,34,.18)";
  ctx.fillRect(-12, 15, 24, 7);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-9, -15, 18, 5);
  ctx.fillRect(-13, -10, 26, 16);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-8, -7, 16, 10);
  ctx.fillStyle = PALETTE.ink;
  if (dir === "left") ctx.fillRect(-9, -4, 4, 4);
  else if (dir === "right") ctx.fillRect(5, -4, 4, 4);
  else {
    ctx.fillRect(-7, -4, 4, 4);
    ctx.fillRect(3, -4, 4, 4);
  }
  ctx.fillRect(-11, 6, 22, 13);
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(-6, 8, 12, 7);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-11 - step, 18, 8, 8);
  ctx.fillRect(3 + step, 18, 8, 8);
  ctx.restore();
}

function useGameAudio() {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const contextRef = useRef<AudioContext | null>(null);

  const tone = useCallback((frequency: number, duration: number, volume: number, type: OscillatorType = "square") => {
    const context = contextRef.current;
    if (!context || context.state !== "running" || !enabledRef.current) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);

  const activate = useCallback(async () => {
    if (!enabledRef.current) return;
    if (!contextRef.current) contextRef.current = new AudioContext();
    if (contextRef.current.state === "suspended") await contextRef.current.resume();
  }, []);

  useEffect(() => {
    const begin = () => void activate();
    window.addEventListener("keydown", begin, { once: true });
    window.addEventListener("pointerdown", begin, { once: true });
    return () => {
      window.removeEventListener("keydown", begin);
      window.removeEventListener("pointerdown", begin);
    };
  }, [activate]);

  useEffect(() => {
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33];
    const bass = [130.81, 130.81, 146.83, 146.83, 110, 110, 123.47, 123.47];
    let beat = 0;
    const timer = window.setInterval(() => {
      if (!enabledRef.current || contextRef.current?.state !== "running") return;
      tone(melody[beat % melody.length], .105, .018, "square");
      if (beat % 2 === 0) tone(bass[Math.floor(beat / 2) % bass.length], .16, .025, "triangle");
      beat += 1;
    }, 185);
    return () => window.clearInterval(timer);
  }, [tone]);

  const playClick = useCallback(() => {
    void activate().then(() => {
      tone(740, .055, .045);
      window.setTimeout(() => tone(988, .07, .035), 45);
    });
  }, [activate, tone]);

  const playStep = useCallback(() => {
    tone(92, .035, .024, "square");
  }, [tone]);

  const toggle = useCallback(() => {
    if (enabledRef.current) {
      tone(330, .07, .04);
      enabledRef.current = false;
      setEnabled(false);
      window.setTimeout(() => void contextRef.current?.suspend(), 85);
    } else {
      enabledRef.current = true;
      setEnabled(true);
      void activate().then(() => tone(659.25, .09, .04));
    }
  }, [activate, tone]);

  return { enabled, toggle, playClick, playStep };
}

function GameMap({
  nearby,
  onNearbyChange,
  modalOpen,
  onStep,
}: {
  nearby: Place | null;
  onNearbyChange: (place: Place | null) => void;
  modalOpen: boolean;
  onStep: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({ ...START, dir: "down" as Direction });
  const keysRef = useRef(new Set<Direction>());
  const nearbyRef = useRef<Place | null>(nearby);
  const modalRef = useRef(modalOpen);

  useEffect(() => {
    nearbyRef.current = nearby;
  }, [nearby]);
  useEffect(() => {
    modalRef.current = modalOpen;
    if (modalOpen) keysRef.current.clear();
  }, [modalOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(420, Math.floor(rect.height));
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let last = performance.now();
    let lastFootstep = 0;
    const render = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const player = playerRef.current;
      const keys = keysRef.current;
      let dx = 0;
      let dy = 0;
      if (!modalRef.current) {
        if (keys.has("left")) dx -= 1;
        if (keys.has("right")) dx += 1;
        if (keys.has("up")) dy -= 1;
        if (keys.has("down")) dy += 1;
      }
      if (dx && dy) {
        dx *= 0.707;
        dy *= 0.707;
      }
      const speed = 0.19 * dt;
      player.x = Math.max(28, Math.min(WORLD.width - 28, player.x + dx * speed));
      player.y = Math.max(35, Math.min(WORLD.height - 30, player.y + dy * speed));
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? "left" : "right";
      else if (dy) player.dir = dy < 0 ? "up" : "down";
      if ((dx || dy) && now - lastFootstep > 245) {
        onStep();
        lastFootstep = now;
      }

      let closest: Place | null = null;
      let closestDistance = Infinity;
      for (const place of places) {
        const distance = Math.hypot(player.x - place.x, player.y - place.y);
        if (distance < 142 && distance < closestDistance) {
          closest = place;
          closestDistance = distance;
        }
      }
      if (closest?.id !== nearbyRef.current?.id) {
        nearbyRef.current = closest;
        onNearbyChange(closest);
      }

      const cameraX = Math.max(0, Math.min(WORLD.width - canvas.width, player.x - canvas.width / 2));
      const cameraY = Math.max(0, Math.min(WORLD.height - canvas.height, player.y - canvas.height / 2));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-Math.round(cameraX), -Math.round(cameraY));
      drawGround(ctx);
      drawHouse(ctx, 470, 80, 120, 105, "CAFFÈ");
      drawHouse(ctx, 50, 665, 150, 112, "PORTA SUSA");
      drawHouse(ctx, 1260, 630, 135, 108, "OFFICINE");
      drawHouse(ctx, 410, 720, 126, 103);
      drawTree(ctx, 515, 285);
      drawTree(ctx, 580, 322);
      drawTree(ctx, 1330, 420);
      drawTree(ctx, 1290, 468);
      drawTree(ctx, 320, 560);
      drawTree(ctx, 375, 600);
      drawIntesa(ctx, places[0].x, places[0].y);
      drawSkatepark(ctx, places[1].x, places[1].y);
      drawWistery(ctx, places[2].x, places[2].y);
      drawStaffPalace(ctx, places[3].x, places[3].y);
      drawGuild(ctx, places[4].x, places[4].y);
      for (const place of places) drawMarker(ctx, place, closest?.id === place.id, now);
      drawPlayer(ctx, player.x, player.y, player.dir, Boolean(dx || dy), now);
      ctx.restore();
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [onNearbyChange, onStep]);

  const setDirection = (direction: Direction, active: boolean) => {
    if (active) keysRef.current.add(direction);
    else keysRef.current.delete(direction);
  };

  useEffect(() => {
    const map: Record<string, Direction> = {
      ArrowUp: "up",
      w: "up",
      ArrowDown: "down",
      s: "down",
      ArrowLeft: "left",
      a: "left",
      ArrowRight: "right",
      d: "right",
    };
    const down = (event: KeyboardEvent) => {
      const dir = map[event.key];
      if (dir) {
        event.preventDefault();
        setDirection(dir, true);
      }
    };
    const up = (event: KeyboardEvent) => {
      const dir = map[event.key];
      if (dir) setDirection(dir, false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", () => keysRef.current.clear());
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="map-canvas" aria-label="Mappa interattiva di Torino in stile videogame 8-bit" />
      <div className="dpad" aria-label="Controlli movimento">
        {(["up", "left", "down", "right"] as Direction[]).map((direction) => (
          <button
            key={direction}
            className={`dpad-${direction}`}
            aria-label={`Vai ${direction}`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDirection(direction, true);
            }}
            onPointerUp={() => setDirection(direction, false)}
            onPointerCancel={() => setDirection(direction, false)}
          >
            {direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→"}
          </button>
        ))}
      </div>
    </>
  );
}

export default function Home() {
  const [nearby, setNearby] = useState<Place | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);
  const { enabled: audioEnabled, toggle: toggleAudio, playClick, playStep } = useGameAudio();
  const openSelected = useCallback(() => {
    if (nearby) {
      playClick();
      setSelected(nearby);
    }
  }, [nearby, playClick]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && nearby && !selected) {
        event.preventDefault();
        playClick();
        setSelected(nearby);
      }
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearby, playClick, selected]);

  return (
    <main className="game-shell">
      <GameMap nearby={nearby} onNearbyChange={setNearby} modalOpen={Boolean(selected)} onStep={playStep} />

      <header className="game-header">
        <div className="brand-mark" aria-hidden="true">T</div>
        <div>
          <p className="kicker">ESPLORA LA CITTÀ</p>
          <h1>Torino, un passo alla volta.</h1>
        </div>
      </header>

      <aside className="instructions">
        <span className="key">↑</span><span className="key">↓</span><span className="key">←</span><span className="key">→</span>
        <span>MUOVITI</span>
        <i />
        <span className="key wide">ENTER</span>
        <span>ESPLORA</span>
      </aside>

      <button className="audio-toggle" onClick={toggleAudio} aria-pressed={audioEnabled} aria-label={audioEnabled ? "Disattiva audio" : "Attiva audio"}>
        <span aria-hidden="true">{audioEnabled ? "♫" : "×"}</span>
        {audioEnabled ? "AUDIO ON" : "AUDIO OFF"}
      </button>

      <div className={`interaction-prompt ${nearby ? "is-visible" : ""}`} aria-live="polite">
        {nearby && (
          <button onClick={openSelected}>
            <span className="prompt-icon">!</span>
            <span><small>SEI VICINO A</small>{nearby.name}</span>
            <kbd>INVIO ↵</kbd>
          </button>
        )}
      </div>

      <div className="map-index" aria-label="Luoghi presenti sulla mappa">
        <span>05 LUOGHI</span>
        <div>{places.map((place) => <i key={place.id} className={nearby?.id === place.id ? "active" : ""} />)}</div>
      </div>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <section
            className={`place-modal place-${selected.id}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="close-button" onClick={() => { playClick(); setSelected(null); }} autoFocus aria-label="Chiudi">×</button>
            <p className="modal-count">LOCATION / {String(places.findIndex((p) => p.id === selected.id) + 1).padStart(2, "0")}</p>
            <div className="modal-pixel-art" aria-hidden="true"><span /><span /><span /></div>
            <p className="modal-eyebrow">{selected.eyebrow}</p>
            <h2 id="modal-title">{selected.name}</h2>
            <p className="modal-description">{selected.description}</p>
            <p className="modal-detail">{selected.detail}</p>
            {(selected.id === "staff" || selected.id === "guild") && (
              <a className="modal-enter" href={selected.id === "staff" ? "/staff" : "/gilda"} onClick={playClick}>
                {selected.id === "staff" ? "ENTRA NEL PALAZZO" : "ENTRA NELLA GILDA"} <span>→</span>
              </a>
            )}
            <div className="modal-footer"><span>TORINO QUEST</span><span>ESC PER CHIUDERE</span></div>
          </section>
        </div>
      )}
    </main>
  );
}
