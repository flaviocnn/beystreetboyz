"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "torino-quest-audio";

export function useGameAudio() {
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
    if (window.localStorage.getItem(STORAGE_KEY) === "off") {
      enabledRef.current = false;
      setEnabled(false);
    }
    const begin = () => void activate();
    window.addEventListener("keydown", begin);
    window.addEventListener("pointerdown", begin);
    return () => {
      window.removeEventListener("keydown", begin);
      window.removeEventListener("pointerdown", begin);
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, [activate]);

  useEffect(() => {
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33];
    const bass = [130.81, 130.81, 146.83, 146.83, 110, 110, 123.47, 123.47];
    let beat = 0;
    const timer = window.setInterval(() => {
      if (!enabledRef.current || contextRef.current?.state !== "running") return;
      tone(melody[beat % melody.length], .105, .018);
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
    tone(92, .035, .024);
  }, [tone]);

  const toggle = useCallback(() => {
    if (enabledRef.current) {
      tone(330, .07, .04);
      enabledRef.current = false;
      setEnabled(false);
      window.localStorage.setItem(STORAGE_KEY, "off");
      window.setTimeout(() => void contextRef.current?.suspend(), 85);
    } else {
      enabledRef.current = true;
      setEnabled(true);
      window.localStorage.setItem(STORAGE_KEY, "on");
      void activate().then(() => tone(659.25, .09, .04));
    }
  }, [activate, tone]);

  return { enabled, toggle, playClick, playStep };
}
