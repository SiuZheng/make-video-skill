import {useCurrentFrame} from 'remotion';
import timeline from './timeline.json';

// Written by scripts/build.py. Every time in it is on the "story clock" the narration was recorded at;
// the film plays it SPEED times faster, so scenes are written in story seconds (see useT).
export type Word = {w: string; a: number; b: number};
export type Line = {i: number; section: number; start: number; end: number; text: string; file: string; words: Word[]};
export type Section = {n: number; title: string; first: number; last: number; start: number; end: number};
export type Timeline = {
  title: string;
  format: 'long' | 'short' | 'both';
  fps: number;
  width: number;
  height: number;
  speed: number;
  duration: number;
  lines: Line[];
  sections: Section[];
  cues: Record<string, number>;
  moves: Record<string, string>;
};

export const TL = timeline as unknown as Timeline;
export const CUE = TL.cues;
export const LINES = TL.lines;
export const SEC: Record<number, Section> = Object.fromEntries(TL.sections.map((s) => [s.n, s]));
export const FPS = TL.fps;
export const W = TL.width;
export const H = TL.height;
export const SPEED = TL.speed;
export const DURATION_FRAMES = Math.max(1, Math.round((TL.duration / SPEED) * FPS));

// story-clock seconds at the current frame
export const useT = () => (useCurrentFrame() / FPS) * SPEED;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
// 0 before a, 1 after b, linear between
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const easeIn = (p: number) => p * p * p;
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
// a pop-in with a little overshoot
export const pop = (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : easeOut(p) * (1 + 0.25 * Math.sin(Math.PI * p)));
// visible between a and b, fading in and out over f seconds
export const fade = (t: number, a: number, b: number, f = 0.4) => prog(t, a, a + f) * (1 - prog(t, b - f, b));
// deterministic 0..1 noise from a string seed
export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
};
export const fmt = (v: number) => Math.round(v).toLocaleString('en-US');
// when a phrase is spoken inside narration line i (from its word timings)
export const phraseAt = (i: number, phrase: string) => {
  const ln = LINES[i];
  const norm = (s: string) => s.toLowerCase().replace(/[^0-9a-z]/g, '');
  const want = phrase.split(/\s+/).map(norm);
  for (let k = 0; k + want.length <= ln.words.length; k++) {
    if (want.every((w, j) => norm(ln.words[k + j].w) === w)) return ln.words[k].a;
  }
  const k = ln.text.indexOf(phrase);
  return ln.start + ((ln.end - ln.start) * Math.max(0, k)) / ln.text.length;
};
