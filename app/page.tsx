"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameAudio, usePopupSound } from "./lib/game-audio";
import { drawPixelPlayer, type Direction } from "./lib/pixel-player";
import { type PlayerMember, readResponse } from "./lib/client-api";
import { useDialogFocus } from "./lib/dialog-focus";
import { createIdleEncounter, updateIdleEncounter, VISITORS } from "./lib/idle-visitor";
import { ACHIEVEMENT_HOUSE, drawAchievementHouse } from "./lib/achievement-house";

type Place = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  detail: string;
  x: number;
  y: number;
};

const WORLD = { width: 1600, height: 1100 };
const START = { x: 800, y: 500 };
const PALETTE = {
  ink: "#202322",
  dark: "#515753",
  mid: "#9ba39b",
  pale: "#d8ddd4",
  paper: "#f2f3ea",
};
const torinoWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Europe/Rome" });
const isChampionshipWednesday = (date: Date) => torinoWeekday.format(date) === "Wednesday";

const places: Place[] = [
  {
    id: "intesa",
    name: "Intesa · Banca della Gilda",
    eyebrow: "LA GRINGOTTS DELLA GILDA",
    description:
      "Colonne di marmo, porte dorate e contabili dalle sembianze di ratto. La banca-fantasy della Gilda custodisce il registro degli introiti delle tappe.",
    detail: "Visita la sala · Registro economico riservato allo staff · Nessun pagamento online",
    x: 440,
    y: 255,
  },
  {
    id: "dora",
    name: "Parco Dora Skatepark",
    eyebrow: "PARCO DORA · TORINO",
    description:
      "Cemento, acciaio e memoria industriale: uno spazio urbano sotto le grandi strutture delle ex acciaierie.",
    detail: "Bowl · Street plaza · Archeologia industriale",
    x: 1210,
    y: 250,
  },
  {
    id: "wistery",
    name: "Wistery Club",
    eyebrow: "COORDINATE SCONOSCIUTE",
    description:
      "Patria dei Cobalt Flames, il Wistery è avvolto nelle tenebre. Solo i membri della Gilda possono varcare la soglia e forgiare il proprio avatar.",
    detail: "ATELIER SEGRETO · RISERVATO AI MEMBRI DELLA GILDA",
    x: 800,
    y: 950,
  },
  {
    id: "staff",
    name: "Il Palazzo dello Staff",
    eyebrow: "ACCESSO RISERVATO · TORINO QUEST",
    description: "L'archivio dei membri della città. Il personale autorizzato può creare e gestire le iscrizioni.",
    detail: "Accesso automatico per i membri con ruolo staff",
    x: 420,
    y: 680,
  },
  {
    id: "guild",
    name: "La Gilda del Grifone",
    eyebrow: "SALA DEI MEMBRI · TORINO QUEST",
    description: "Varca la soglia con le credenziali consegnate dallo staff. All'interno ti aspetta la mappa della Gilda e la classifica.",
    detail: "Accesso membri · Classifica della Gilda",
    x: 1160,
    y: 680,
  },
  {
    id: "achievements", name: "Casa delle Imprese", eyebrow: "IL TUO ALBUM PERSONALE",
    description: "Le tue prime tappe, i podi, le vittorie e i deck memorabili. Scopri dieci imprese, segui il progresso e scegli i distintivi da esporre.",
    detail: "Distintivi · Titoli · Ricompense per lo specchio · Nessun punto extra in classifica",
    x: ACHIEVEMENT_HOUSE.x, y: ACHIEVEMENT_HOUSE.y,
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
  ctx.fillRect(40, 450, WORLD.width - 80, 110);
  ctx.fillRect(750, 40, 100, WORLD.height - 80);
  ctx.fillRect(360, 770, 860, 75);
  ctx.fillRect(810, 1010, 540, 54);
  ctx.fillRect(1290, 980, 60, 50);
  for (const [x, y, h] of [[245, 400, 100], [410, 335, 115], [1180, 330, 120], [390, 735, 110], [1130, 735, 110]]) ctx.fillRect(x, y, 60, h);
  ctx.strokeStyle = PALETTE.mid;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(40, 458, WORLD.width - 80, 94);
  ctx.strokeRect(758, 40, 84, WORLD.height - 80);
  ctx.setLineDash([]);
  ctx.fillStyle = PALETTE.mid;
  for (let y = 470; y < 545; y += 18) {
    for (let x = 48; x < WORLD.width - 40; x += 28) {
      ctx.fillRect(x + ((y / 18) % 2) * 8, y, 13, 3);
    }
  }
  for (let y = 48; y < WORLD.height - 40; y += 18) {
    for (let x = 770; x < 835; x += 28) {
      ctx.fillRect(x + ((y / 18) % 2) * 8, y, 13, 3);
    }
  }
  // Small paved forecourts keep entrances clear and give each landmark a plot.
  for (const p of places) {
    ctx.fillStyle = "#c5cdc0"; ctx.fillRect(p.x - 108, p.y + 65, 216, 52);
    ctx.fillStyle = "#e6e9df"; ctx.fillRect(p.x - 103, p.y + 69, 206, 44);
    ctx.fillStyle = "#b6c0af";
    for (let x = p.x - 96; x < p.x + 100; x += 24) ctx.fillRect(x, p.y + 106, 12, 2);
  }
  for (const [x, y] of [[625, 420], [975, 420], [625, 865], [975, 865]]) {
    ctx.fillStyle = "#66765e"; ctx.fillRect(x - 24, y, 48, 18);
    ctx.fillStyle = "#a9b99b"; ctx.fillRect(x - 21, y - 5, 42, 15);
    ctx.fillStyle = "#e4d6a4";
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 17 + i * 10, y - 3, 4, 4);
  }
  pixelText(ctx, "QUARTIERE DEI BLADER", 800, 430, 11, "center", PALETTE.dark);
  for (const [x, top, bottom] of [[665, "↖ INTESA", "STAFF ↙"], [935, "DORA ↗", "GILDA ↘"]] as const) {
    ctx.fillStyle = PALETTE.dark; ctx.fillRect(x - 3, 552, 6, 47);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(x - 51, 557, 102, 34);
    ctx.fillStyle = "#d6dfca"; ctx.fillRect(x - 48, 560, 96, 28);
    pixelText(ctx, top, x, 567, 10); pixelText(ctx, bottom, x, 581, 10);
  }
  for (const [x, y] of [[345, 420], [1305, 420], [310, 800], [1280, 800]]) {
    ctx.fillStyle = "#27362c"; ctx.fillRect(x - 2, y - 30, 4, 38); ctx.fillRect(x - 8, y - 37, 16, 14);
    ctx.fillStyle = "#ece5bc"; ctx.fillRect(x - 5, y - 34, 10, 8);
    ctx.fillStyle = "#7f8e77"; ctx.fillRect(x - 7, y + 8, 14, 4);
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
  ctx.fillStyle = "#829477"; ctx.fillRect(x - 12, y - 7, 9, 9);
  ctx.fillStyle = "#becbb0"; ctx.fillRect(x - 8, y - 9, 5, 4);
  ctx.fillStyle = "#38493b"; ctx.fillRect(x + 7, y + 6, 7, 6);
}

function drawBeybladeGarden(ctx: CanvasRenderingContext2D, now: number) {
  ctx.save();
  // Compact garden to the left of Intesa, with a path to the main road.
  ctx.translate(70, 242);
  ctx.scale(0.82, 1);
  ctx.translate(-355, -202);
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(355, 202, 274, 130);
  ctx.fillStyle = "#d0dac5";
  ctx.fillRect(359, 206, 266, 122);
  ctx.fillStyle = PALETTE.pale;
  ctx.fillRect(380, 259, 226, 43);
  ctx.fillRect(582, 280, 24, 110);
  for (let x = 370; x < 625; x += 20) {
    ctx.fillStyle = PALETTE.dark;
    ctx.fillRect(x, 315, 3, 5);
    ctx.fillRect(x + 5, 319, 3, 3);
  }
  drawTree(ctx, 378, 227);
  drawTree(ctx, 607, 227);
  // Flower beds and a little slatted bench.
  for (const x of [376, 607]) {
    for (let y = 274; y <= 302; y += 14) {
      ctx.fillStyle = PALETTE.dark;
      ctx.fillRect(x, y, 2, 7);
      ctx.fillStyle = y === 274 ? "#edb94e" : "#ed737a";
      ctx.fillRect(x - 3, y - 3, 8, 4);
      ctx.fillStyle = PALETTE.paper;
      ctx.fillRect(x, y - 3, 2, 2);
    }
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(399, 301, 4, 11);
  ctx.fillRect(426, 301, 4, 11);
  ctx.fillStyle = PALETTE.dark;
  ctx.fillRect(395, 290, 39, 5);
  ctx.fillRect(395, 297, 39, 6);
  pixelText(ctx, "BEY GARDEN", 492, 216, 10);

  // Stepped, pixel-art stadium: two tops orbit and spin in the bowl.
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(467, 266, 56, 27);
  ctx.fillRect(473, 260, 44, 39);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(471, 269, 48, 21);
  ctx.fillRect(476, 264, 38, 31);
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(478, 270, 34, 19);
  for (let i = 0; i < 2; i++) {
    const angle = now / 240 + i * Math.PI;
    const x = Math.round(495 + Math.cos(angle) * 12);
    const y = Math.round(279 + Math.sin(angle) * 6);
    ctx.fillStyle = PALETTE.dark;
    ctx.fillRect(x - 5, y + 3, 11, 2);
    ctx.fillStyle = i === 0 ? "#527fee" : "#ed737a";
    ctx.fillRect(x - 5, y - 2, 11, 5);
    ctx.fillRect(x - 2, y - 5, 5, 11);
    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(x - 1, y - 1, 3, 3);
  }
  // Exactly three friends, with different outfits and happy, raised arms.
  const friends = [
    { x: 445, y: 254, color: 2, style: 0 },
    { x: 545, y: 254, color: 5, style: 1 },
    { x: 550, y: 302, color: 4, style: 0 },
  ];
  friends.forEach((friend, index) => {
    const cheer = Math.sin(now / 230 + index * 2) > 0.4;
    const y = friend.y - (cheer ? 3 : 0);
    drawPixelPlayer(ctx, friend.x, y, "down", false, now, {
      avatarStyle: friend.style, avatarColor: friend.color,
    });
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(friend.x - 3, y + 1, 2, 2);
    ctx.fillRect(friend.x + 3, y + 1, 2, 2);
    ctx.fillRect(friend.x - 1, y + 3, 4, 2);
    if (index === 1) {
      // Cigarette and a few drifting pixel puffs for this NPC only.
      ctx.fillStyle = PALETTE.paper;
      ctx.fillRect(friend.x + 5, y + 2, 8, 2);
      ctx.fillStyle = "#ed737a";
      ctx.fillRect(friend.x + 12, y + 2, 2, 2);
      for (let puff = 0; puff < 3; puff++) {
        const rise = (now / 90 + puff * 7) % 22;
        ctx.globalAlpha = 0.65 * (1 - rise / 22);
        ctx.fillStyle = PALETTE.dark;
        ctx.fillRect(friend.x + 13 + Math.round(Math.sin(rise / 4) * 3), Math.round(y - rise), 3, 3);
      }
      ctx.globalAlpha = 1;
    }
    if (cheer) {
      ctx.fillRect(friend.x - 15, y + 3, 5, 7);
      ctx.fillRect(friend.x + 11, y + 3, 5, 7);
      ctx.fillStyle = PALETTE.paper;
      ctx.fillRect(friend.x - 14, y + 3, 3, 3);
      ctx.fillRect(friend.x + 12, y + 3, 3, 3);
      pixelText(ctx, index === 2 ? "♪" : "!", friend.x + 18, y - 18, 12);
    }
  });
  ctx.restore();
}

function drawHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label?: string,
) {
  ctx.fillStyle = "#20232220"; ctx.fillRect(x + 9, y + 28, w + 8, h - 15);
  ctx.fillStyle = "#69766a";
  ctx.beginPath(); ctx.moveTo(x - 12, y + 18); ctx.lineTo(x + w / 2, y - 14); ctx.lineTo(x + w + 12, y + 18); ctx.closePath(); ctx.fill();
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
  ctx.fillStyle = "#bbc3b6";
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) ctx.fillRect(x + 10 + col * 23 + row % 2 * 6, y + 60 + row * 9, 14, 2);
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
  ctx.fillStyle = PALETTE.ink; ctx.fillRect(x + w / 2 - 10, y + h - 36, 20, 25);
  ctx.fillStyle = PALETTE.mid; ctx.fillRect(x + w / 2 - 6, y + h - 32, 12, 21);
  ctx.fillStyle = PALETTE.paper; ctx.fillRect(x + w / 2 + 2, y + h - 23, 3, 3);
  ctx.fillStyle = PALETTE.dark; ctx.fillRect(x - 6, y + 20, w + 12, 6);
  if (label) pixelText(ctx, label, x + w / 2, y + h - 10, 9);
}

function drawIntesa(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#20232225"; ctx.fillRect(-54, -103, 136, 194);
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
  // Glass highlights, a recessed entrance and greenery in the roof conservatory.
  ctx.fillStyle = "#f8fff780";
  ctx.fillRect(-37, -110, 9, 179); ctx.fillRect(23, -110, 5, 179);
  ctx.fillStyle = "#6d8169";
  for (const gx of [-28, -6, 22]) { ctx.fillRect(gx, -143, 8, 7); ctx.fillRect(gx + 2, -147, 4, 5); }
  ctx.fillStyle = PALETTE.ink; ctx.fillRect(-21, 52, 42, 29);
  ctx.fillStyle = "#9eb5ac"; ctx.fillRect(-16, 56, 13, 21); ctx.fillRect(3, 56, 13, 21);
  ctx.fillStyle = PALETTE.paper; ctx.fillRect(-18, 49, 36, 4);
  ctx.fillStyle = PALETTE.dark; ctx.fillRect(-38, 82, 76, 5);
  pixelText(ctx, "INTESA", 0, 98, 12);
  ctx.restore();
}

function drawSkatepark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#20232220"; ctx.fillRect(-110, -42, 240, 134);
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
  // Weathered red steel, ramps and rails recall the industrial canopy.
  ctx.fillStyle = "#88705b";
  for (const px of [-116, -39, 36, 113]) { ctx.fillRect(px, -88, 4, 39); ctx.fillRect(px - 4, -52, 12, 5); }
  ctx.fillStyle = "#b3beb5"; ctx.fillRect(-97, 57, 31, 13); ctx.fillRect(67, 57, 31, 13);
  ctx.fillStyle = "#eff2e8"; ctx.fillRect(-97, 57, 31, 3); ctx.fillRect(67, 57, 31, 3);
  ctx.fillStyle = PALETTE.dark; ctx.fillRect(-22, 54, 44, 4); ctx.fillRect(-19, 58, 3, 15); ctx.fillRect(16, 58, 3, 15);
  ctx.fillStyle = PALETTE.paper; ctx.fillRect(-21, -13, 4, 32);
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
  ctx.fillStyle = "#777fb6"; ctx.fillRect(-45, -26, 11, 6); ctx.fillRect(34, -26, 11, 6);
  ctx.fillStyle = "#434c70";
  for (let row = 0; row < 5; row++) {
    ctx.fillRect(-65, -16 + row * 14, 12 + row % 2 * 6, 3);
    ctx.fillRect(49, -11 + row * 14, 15, 3);
  }
  ctx.fillStyle = "#777fb6"; ctx.fillRect(-7, -55, 5, 11); ctx.fillRect(1, -61, 5, 17); ctx.fillRect(8, -52, 4, 8);
  ctx.fillStyle = "#303b38";
  for (let leaf = 0; leaf < 6; leaf++) { ctx.fillRect(-78 + leaf % 2 * 6, -28 + leaf * 12, 8, 8); ctx.fillRect(69 - leaf % 2 * 6, -20 + leaf * 12, 8, 8); }
  ctx.strokeStyle = PALETTE.paper;
  ctx.lineWidth = 3;
  ctx.strokeRect(-73, -60, 146, 125);
  pixelText(ctx, "WISTERY", 0, 88, 12);
  ctx.restore();
}

function drawStaffPalace(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#20232225"; ctx.fillRect(-70, -68, 161, 143);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-88, -91, 176, 12);
  ctx.fillRect(-77, -112, 154, 20);
  ctx.fillRect(-64, -130, 128, 17);
  ctx.fillStyle = PALETTE.mid;
  ctx.fillRect(-78, -78, 156, 143);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-68, -69, 136, 124);
  ctx.fillStyle = "#bec6b8";
  for (let row = 0; row < 10; row++) for (let col = 0; col < 6; col++) ctx.fillRect(-64 + col * 21 + row % 2 * 5, -64 + row * 11, 13, 2);
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
  // Stone columns, carved pediment and broad front steps.
  for (const px of [-68, -24, 18, 62]) {
    ctx.fillStyle = "#829080"; ctx.fillRect(px, -61, 6, 115);
    ctx.fillStyle = "#f2f3ea"; ctx.fillRect(px - 2, -65, 10, 5); ctx.fillRect(px - 2, 49, 10, 6);
  }
  ctx.fillStyle = "#d7ddcd"; ctx.fillRect(-55, -124, 110, 8);
  pixelText(ctx, "ARCHIVIO", 0, -101, 10);
  ctx.fillStyle = PALETTE.dark; ctx.fillRect(-45, 68, 90, 5);
  ctx.fillStyle = PALETTE.mid; ctx.fillRect(-51, 73, 102, 5);
  pixelText(ctx, "STAFF", 0, 87, 12);
  ctx.restore();
}

function drawGuild(ctx: CanvasRenderingContext2D, x: number, y: number, wednesday: boolean, now: number) {
  ctx.save();
  ctx.translate(x, y);
  if (wednesday) {
    const pulse = .7 + Math.sin(now / 550) * .15;
    ctx.fillStyle = `rgba(248, 201, 99, ${.13 * pulse})`;
    ctx.fillRect(-118, -140, 236, 220);
    ctx.fillStyle = `rgba(255, 213, 109, ${.28 * pulse})`;
    ctx.fillRect(-105, -80, 210, 150);
    for (const [sparkX, sparkY] of [[-105, -105], [103, -100], [-116, 24], [113, 20]]) {
      ctx.fillStyle = "#f8d671";
      ctx.fillRect(sparkX, sparkY, 7, 7);
      ctx.fillRect(sparkX - 4, sparkY + 2, 15, 3);
    }
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.moveTo(-108, -72);
  ctx.lineTo(0, -134);
  ctx.lineTo(108, -72);
  ctx.closePath();
  ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = "#626f61"; ctx.lineWidth = 2;
  for (let ry = -119; ry < -72; ry += 10) { ctx.beginPath(); ctx.moveTo(-108, ry); ctx.lineTo(108, ry); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = wednesday ? "#d9bb75" : PALETTE.mid;
  ctx.fillRect(-94, -71, 188, 133);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-83, -61, 166, 112);
  ctx.fillStyle = "#c4cdbb";
  for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) ctx.fillRect(-78 + col * 22 + row % 2 * 5, -56 + row * 13, 14, 2);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(-94, -71, 188, 133);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-23, 0, 46, 61);
  ctx.fillRect(-72, -37, 30, 30);
  ctx.fillRect(42, -37, 30, 30);
  ctx.fillStyle = wednesday ? "#f6d77d" : PALETTE.mid;
  ctx.fillRect(-66, -31, 18, 18);
  ctx.fillRect(48, -31, 18, 18);
  for (const px of [-79, 67]) {
    ctx.fillStyle = "#566f58"; ctx.fillRect(px, 2, 12, 33);
    ctx.fillStyle = "#ced9be"; ctx.fillRect(px + 4, 8, 4, 15);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(px - 2, -1, 16, 3);
  }
  ctx.fillStyle = PALETTE.dark; ctx.fillRect(-42, 62, 84, 6);
  ctx.fillStyle = PALETTE.mid; ctx.fillRect(-48, 68, 96, 6);
  if (wednesday) {
    ctx.fillStyle = "#f6d77d";
    ctx.fillRect(-14, 7, 28, 50);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-2, 7, 4, 50);
    ctx.fillStyle = "#8b623c";
    ctx.fillRect(-94, 60, 188, 7);
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-13, -103, 26, 25);
  ctx.fillStyle = PALETTE.paper;
  pixelText(ctx, "G", 0, -90, 17, "center", PALETTE.paper);
  pixelText(ctx, "GILDA DEL GRIFONE", 0, 87, 11);
  if (wednesday) pixelText(ctx, "MERCOLEDÌ · TAPPA RANKED", 0, 110, 10, "center", "#6b4a1e");
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

function GameMap({
  nearby,
  onNearbyChange,
  modalOpen,
  onStep,
  member,
  wednesday,
}: {
  nearby: Place | null;
  onNearbyChange: (place: Place | null) => void;
  modalOpen: boolean;
  onStep: () => void;
  member: PlayerMember | null;
  wednesday: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({ ...START, dir: "down" as Direction });
  const keysRef = useRef(new Set<Direction>());
  const nearbyRef = useRef<Place | null>(nearby);
  const modalRef = useRef(modalOpen);
  const memberRef = useRef(member);
  const canWalkRef = useRef<(x: number, y: number) => boolean>(() => false);
  const encounterRef = useRef(createIdleEncounter(START));
  const [visitorSpeech, setVisitorSpeech] = useState<number | null>(null);
  const speechRef = useRef<number | null>(null);
  usePopupSound(visitorSpeech !== null && !modalOpen);
  useEffect(() => { memberRef.current = member; }, [member]);

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
    const scenery = document.createElement("canvas");
    scenery.width = WORLD.width; scenery.height = WORLD.height;
    const scene = scenery.getContext("2d");
    if (!scene) return;
    drawGround(scene);
    drawHouse(scene, 605, 100, 120, 105, "CAFFÈ");
    drawHouse(scene, 90, 875, 150, 112, "PORTA SUSA");
    drawAchievementHouse(scene, ACHIEVEMENT_HOUSE.x, ACHIEVEMENT_HOUSE.y);
    drawHouse(scene, 440, 915, 126, 103);
    for (const [x, y] of [[90, 120], [150, 150], [600, 300], [650, 335], [1000, 145], [1440, 350], [1390, 390], [230, 650], [210, 700], [1350, 650], [1370, 700], [630, 1020], [980, 1030]]) drawTree(scene, x, y);
    drawIntesa(scene, places[0].x, places[0].y);
    drawSkatepark(scene, places[1].x, places[1].y);
    drawWistery(scene, places[2].x, places[2].y);
    drawStaffPalace(scene, places[3].x, places[3].y);
    // All entry points sit on forecourts; solid footprints keep the avatar outside walls.
    const solids = [
      { x: 370, y: 95, w: 140, h: 245 }, { x: 324, y: 550, w: 192, h: 198 },
      { x: 1052, y: 546, w: 216, h: 208 }, { x: 714, y: 890, w: 172, h: 125 },
      { x: 593, y: 86, w: 144, h: 119 }, { x: 78, y: 861, w: 174, h: 126 },
      ACHIEVEMENT_HOUSE.solid, { x: 428, y: 901, w: 150, h: 117 },
    ];
    const canWalk = (x: number, y: number) => x >= 28 && x <= WORLD.width - 28 && y >= 35 && y <= WORLD.height - 30
      && !solids.some(r => x + 10 > r.x && x - 10 < r.x + r.w && y + 24 > r.y && y + 14 < r.y + r.h);
    canWalkRef.current = canWalk;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(140, Math.floor(rect.height));
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let last = performance.now();
    let lastFootstep = 0;
    const render = (now: number) => {
      const elapsed = Math.min(100, now - last);
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
      const beforeX = player.x, beforeY = player.y;
      if (canWalk(player.x + dx * speed, player.y)) player.x += dx * speed;
      if (canWalk(player.x, player.y + dy * speed)) player.y += dy * speed;
      const walking = player.x !== beforeX || player.y !== beforeY;
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? "left" : "right";
      else if (dy) player.dir = dy < 0 ? "up" : "down";
      if (walking && now - lastFootstep > 245) {
        onStep();
        lastFootstep = now;
      }
      updateIdleEncounter(encounterRef.current, player, elapsed, modalRef.current || document.hidden, canWalk);
      const visitor = encounterRef.current.visitor;
      const speech = visitor?.phase === "talking" ? visitor.kind : null;
      if (speech !== speechRef.current) { speechRef.current = speech; setVisitorSpeech(speech); }

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

      const zoom = canvas.width < 520 ? .85 : Math.max(.72, Math.min(1, canvas.width / 1100));
      const viewWidth = canvas.width / zoom, viewHeight = canvas.height / zoom;
      const cameraX = viewWidth > WORLD.width ? (WORLD.width - viewWidth) / 2 : Math.max(0, Math.min(WORLD.width - viewWidth, player.x - viewWidth / 2));
      const cameraY = viewHeight > WORLD.height ? (WORLD.height - viewHeight) / 2 : Math.max(0, Math.min(WORLD.height - viewHeight, player.y - viewHeight / 2));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = PALETTE.paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(-Math.round(cameraX), -Math.round(cameraY));
      ctx.drawImage(scenery, 0, 0);
      drawBeybladeGarden(ctx, now);
      drawGuild(ctx, places[4].x, places[4].y, wednesday, now);
      for (const place of places) drawMarker(ctx, place, closest?.id === place.id, now);
      if (visitor) {
        ctx.save();
        ctx.globalAlpha = visitor.phase === "leaving" ? Math.max(0, 1 - visitor.age / 1000) : 1;
        drawPixelPlayer(ctx, visitor.x, visitor.y, visitor.dir, visitor.phase === "walking" && !modalRef.current, now, VISITORS[visitor.kind]);
        pixelText(ctx, visitor.kind === 0 ? "DARK" : "PHOENIX", visitor.x, visitor.y - 44, 10, "center", visitor.kind === 0 ? "#664581" : "#97601f");
        ctx.restore();
      }
      drawPixelPlayer(ctx, player.x, player.y, player.dir, walking, now, memberRef.current?.mustChangePassword ? null : memberRef.current);
      ctx.restore();
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [onNearbyChange, onStep, wednesday]);

  const setDirection = (direction: Direction, active: boolean) => {
    if (active && !modalRef.current) {
      if (!keysRef.current.has(direction)) {
        const player = playerRef.current;
        const x = player.x + (direction === "left" ? -8 : direction === "right" ? 8 : 0);
        const y = player.y + (direction === "up" ? -8 : direction === "down" ? 8 : 0);
        if (canWalkRef.current(x, y)) { player.x = x; player.y = y; }
        player.dir = direction;
      }
      keysRef.current.add(direction);
    }
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
      if (dir && !modalRef.current) {
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
    const clearKeys = () => keysRef.current.clear();
    window.addEventListener("blur", clearKeys);
    document.addEventListener("visibilitychange", clearKeys);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", clearKeys);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="map-canvas" aria-label="Mappa interattiva di Torino in stile videogame 8-bit" />
      {visitorSpeech !== null && !modalOpen && <aside className={`visitor-dialogue visitor-${visitorSpeech}`} role="status" aria-live="polite">
        <span className="visitor-dialogue-label">UN INCONTRO IN CITTÀ</span>
        <strong>{VISITORS[visitorSpeech].name}</strong>
        <p>«{VISITORS[visitorSpeech].message}»</p>
        <button aria-label="Chiudi il messaggio dell’NPC" onClick={() => { encounterRef.current.visitor = null; speechRef.current = null; setVisitorSpeech(null); }}>×</button>
      </aside>}
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
            onLostPointerCapture={() => setDirection(direction, false)}
          >
            {direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→"}
          </button>
        ))}
      </div>
    </>
  );
}

export default function Home() {
  const [member, setMember] = useState<PlayerMember | null>(null);
  const [wednesday, setWednesday] = useState(false);
  useEffect(() => {
    const update = () => setWednesday(isChampionshipWednesday(new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { void fetch("/api/member/session", { cache: "no-store" }).then(readResponse).then((result) => setMember(result.member)).catch(() => setMember(null)); }, []);
  const [nearby, setNearby] = useState<Place | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);
  usePopupSound(Boolean(nearby));
  useDialogFocus(Boolean(selected));
  const { enabled: audioEnabled, toggle: toggleAudio, playClick, playStep } = useGameAudio();
  const openSelected = useCallback(() => {
    if (nearby) {
      setSelected(nearby);
    }
  }, [nearby, playClick]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && nearby && !selected && !event.repeat && !(event.target instanceof Element && event.target.closest('button, a, input, textarea, select'))) {
        event.preventDefault();
        setSelected(nearby);
      }
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearby, playClick, selected]);

  return (
    <main className="game-shell">
      <GameMap nearby={nearby} onNearbyChange={setNearby} modalOpen={Boolean(selected)} onStep={playStep} member={member} wednesday={wednesday} />

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
        <span className="key wide">INVIO</span>
        <span>INTERAGISCI</span>
      </aside>

      <button className="audio-toggle" onClick={toggleAudio} aria-pressed={audioEnabled} aria-label={audioEnabled ? "Disattiva audio" : "Attiva audio"}>
        <span aria-hidden="true">{audioEnabled ? "♫" : "×"}</span>
        {audioEnabled ? "AUDIO ON" : "AUDIO OFF"}
      </button>

      <div className={`interaction-prompt ${nearby ? "is-visible" : ""}`} aria-live="polite">
        {nearby && (
          <button onClick={openSelected}>
            <span className="prompt-icon">!</span>
            <span><small>SEI VICINO A</small>{nearby.name}{nearby.id === "guild" && <em className="guild-event-hint">{wednesday ? "È mercoledì! Stasera c’è una tappa del campionato." : "Ogni mercoledì sera: tappe di campionato!"}</em>}</span>
            <kbd>INVIO ↵</kbd>
          </button>
        )}
      </div>

      <div className="map-index" aria-label="Luoghi presenti sulla mappa">
        <span>{String(places.length).padStart(2, "0")} LUOGHI</span>
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
            <button className="close-button" onClick={() => setSelected(null)} aria-label="Chiudi">×</button>
            <p className="modal-count">LUOGO / {String(places.findIndex((p) => p.id === selected.id) + 1).padStart(2, "0")}</p>
            <div className="modal-pixel-art" aria-hidden="true"><span /><span /><span /></div>
            <p className="modal-eyebrow">{selected.eyebrow}</p>
            <h2 id="modal-title">{selected.name}</h2>
            <p className="modal-description">{selected.description}</p>
            <p className="modal-detail">{selected.detail}</p>
            {selected.id === "guild" && <p className="guild-event-modal">{wednesday ? "La Gilda si è accesa: stasera è il momento delle tappe di campionato!" : "Il mercoledì sera la Gilda si accende per le tappe di campionato."}</p>}
            {selected.id === "wistery" && <a className="modal-enter" href={member && !member.mustChangePassword ? "/wistery" : "/gilda"} onClick={playClick}>{member && !member.mustChangePassword ? "Personalizza il tuo avatar" : "Accedi per entrare"} →</a>}
            {selected.id === "intesa" && <a className="modal-enter" href="/banca" onClick={playClick}>Entra nella banca della Gilda →</a>}
            {selected.id === "achievements" && <a className="modal-enter" href="/imprese" onClick={playClick}>Apri il tuo album delle imprese →</a>}
            {(selected.id === "staff" || selected.id === "guild") && (
              <a className="modal-enter" href={selected.id === "staff" ? "/staff" : "/gilda"} onClick={playClick}>
                {selected.id === "staff" ? "Accedi all’area staff" : "Entra nella Gilda"} <span>→</span>
              </a>
            )}
            <div className="modal-footer"><span>FRECCE / TAB · INVIO PER SCEGLIERE</span><span>ESC PER CHIUDERE</span></div>
          </section>
        </div>
      )}
    </main>
  );
}
