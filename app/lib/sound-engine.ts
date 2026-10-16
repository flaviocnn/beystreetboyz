export type GameSound = "click" | "step" | "open" | "close" | "message" | "error" | "spin" | "win";
export class SoundEngine {
  enabled = true;
  private context: AudioContext | null = null;
  private disposed = false;
  private last = new Map<GameSound, number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private createContext: () => AudioContext;
  private hidden: () => boolean;
  constructor(createContext: () => AudioContext, hidden: () => boolean = () => document.hidden) { this.createContext = createContext; this.hidden = hidden; }
  async activate() {
    if (!this.enabled || this.disposed || this.hidden()) return;
    try { this.context ??= this.createContext(); if (this.context.state === "suspended") await this.context.resume(); } catch { /* Audio is optional; respect browser autoplay restrictions. */ }
  }
  tone(frequency: number, duration: number, volume: number, type: OscillatorType = "square") {
    const context = this.context;
    if (!frequency || !this.enabled || this.disposed || this.hidden() || context?.state !== "running") return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
  }
  async play(kind: GameSound) {
    if (!this.enabled || this.disposed || this.hidden()) return;
    const now = performance.now(), gap = kind === "step" ? 180 : kind === "message" || kind === "error" ? 220 : 65;
    if (now - (this.last.get(kind) ?? -Infinity) < gap) return;
    this.last.set(kind, now); await this.activate();
    const notes = { click: [740, 988], step: [92], open: [523, 1047], close: [784, 392], message: [659, 880], error: [220, 165], spin: [392, 523], win: [880, 1319] }[kind];
    this.tone(notes[0], kind === "step" ? .035 : .07, kind === "step" ? .024 : .04, kind === "click" || kind === "step" ? "square" : "triangle");
    if (notes.length > 1) { const timer = setTimeout(() => { this.timers.delete(timer); this.tone(notes[1], .1, .035, "triangle"); }, 65); this.timers.add(timer); }
  }
  dispose() { this.disposed = true; for (const timer of this.timers) clearTimeout(timer); this.timers.clear(); void this.context?.close(); this.context = null; }
}
