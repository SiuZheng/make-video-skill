import React from 'react';
import {useVideoConfig} from 'remotion';
import {OUTLINE} from '../fx';
import {clamp, easeInOut, easeOut, lerp, prog} from '../lib';
import {FONT, GOLD, INK, SUB} from '../theme';
import data from './shorts.json';

// The Shorts: 1080 x 1920, each built from lines of the narration (kit.shorts in scripts/build.py).
export const SW = 1080;
export const SH = 1920;

export type SWord = {w: string; a: number; b: number};
export type SLine = {line: number; start: number; end: number; words: SWord[]};
export type ShortData = {header: string; duration: number; lines: SLine[]; cues: Record<string, number>};
export const SHORTS = data as unknown as Record<string, ShortData>;
export type SceneProps = {t: number; c: Record<string, number>};

// Where things can go on a phone. The top ~15% is under the status bar and YouTube's search and camera
// icons (the user saw the old header, centred at 168-215 px, covered there), so the header hangs from a
// top edge below it and shrinks toward that edge, never moving up. The captions sit low in the middle,
// the picture between; the bottom fifth and a strip down the right are under YouTube's buttons and titles.
export const HEADER_TOP = 290;
export const CAPTION_Y = 1340;
export const SAFE = {top: 420, bottom: 1260, left: 40, right: 940};

// The hook across the top (*gold* words), big from the first frame (the feed shows it), then tucked
// smaller once the picture needs the room (its top edge stays at HEADER_TOP). Numbers stay on one line with their units. growAt: when it
// grows back to full size (a Short that loops: its last frame then matches its first). hideAt: fade it out
// then instead (the user prefers the hook only at the start, not over every scene).
export const Header: React.FC<{text: string; t: number; opacity?: number; shrinkAt?: number; growAt?: number; hideAt?: number}> = ({text, t, opacity: o0 = 1, shrinkAt = 3.2, growAt, hideAt}) => {
  const opacity = hideAt === undefined ? o0 : o0 * (1 - prog(t, hideAt, hideAt + 0.4));
  if (hideAt !== undefined) shrinkAt = 1e9;
  if (opacity <= 0) return null;
  const s = 1 + 0.05 * Math.sin(Math.PI * prog(t, 0, 0.5));
  const k = easeInOut(prog(t, shrinkAt, shrinkAt + 0.6)) * (growAt === undefined ? 1 : 1 - easeInOut(prog(t, growAt, growAt + 0.9)));
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: HEADER_TOP,
        transform: `scale(${s})`,
        transformOrigin: '50% 0',
        textAlign: 'center',
        opacity,
        // (longhands, not `font`: the shorthand resets line-height, so animating it leaves the line height
        // depending on which frames the browser tab drew before - and the header jumping between chunks)
        fontWeight: 900,
        fontSize: lerp(64, 46, k),
        fontFamily: FONT,
        textWrap: 'balance',
        lineHeight: 1.12,
        letterSpacing: '-0.02em',
        color: INK,
        ...OUTLINE,
        WebkitTextStroke: '12px rgba(3,5,15,0.9)',
      }}
    >
      {text
        .replace(/(\d[\d.,]*) (billion|million|thousand|km|kg|light-years?|years?)/g, '$1 $2')
        .split('*')
        .map((p, i) => (
          <span key={i} style={{color: i % 2 ? GOLD : INK}}>
            {p}
          </span>
        ))}
    </div>
  );
};

// Captions: phrases of at most four words, broken where the speaker pauses, the word being said in gold.
type Phrase = {words: SWord[]; a: number; b: number};
const phrasesOf = (lines: SLine[]) => {
  const out: Phrase[] = [];
  for (const ln of lines) {
    let run: SWord[] = [];
    const flush = () => {
      const parts = Math.ceil(run.length / 4);
      for (let k = 0; k < parts; k++) {
        const ws = run.slice(Math.round((k * run.length) / parts), Math.round(((k + 1) * run.length) / parts));
        if (ws.length) out.push({words: ws, a: ws[0].a, b: ws[ws.length - 1].b});
      }
      run = [];
    };
    for (const w of ln.words) {
      run.push(w);
      if (/[.,?!…;:]$/.test(w.w)) flush();
    }
    flush();
  }
  return out;
};
const phraseCache = new Map<SLine[], Phrase[]>();

export const Captions: React.FC<{t: number; lines: SLine[]; y?: number; opacity?: number; size?: number}> = ({t, lines, y = CAPTION_Y, opacity = 1, size = 70}) => {
  if (!phraseCache.has(lines)) phraseCache.set(lines, phrasesOf(lines));
  const phrases = phraseCache.get(lines)!;
  const k = phrases.findIndex((p, i) => t >= p.a - 0.05 && t < Math.min(phrases[i + 1]?.a ?? Infinity, p.b + 0.5) - 0.05);
  if (k < 0 || opacity <= 0) return null;
  const p = phrases[k];
  const pin = easeOut(prog(t, p.a - 0.05, p.a + 0.07));
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        right: 70,
        top: y,
        transform: `translateY(-50%) scale(${lerp(0.9, 1, pin)})`,
        opacity: opacity * pin,
        textAlign: 'center',
        fontWeight: 900,
        fontSize: size,
        fontFamily: FONT,
        lineHeight: 1.16,
        letterSpacing: '-0.01em',
        ...OUTLINE,
        WebkitTextStroke: '12px rgba(3,5,15,0.9)',
      }}
    >
      {p.words.map((w, i) => {
        const next = p.words[i + 1]?.a ?? p.b + 0.3;
        const now = t >= w.a - 0.03 && t < next - 0.03;
        return (
          <span key={i} style={{color: now ? GOLD : INK, display: 'inline-block', transform: `scale(${now ? 1.04 : 1})`, margin: '0 0.2em'}}>
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

// a big number or word in the picture (a counter, a year)
export const Big: React.FC<{x: number; y: number; text: string; size?: number; color?: string; opacity?: number; sub?: string}> = ({x, y, text, size = 96, color = INK, opacity = 1, sub}) =>
  opacity <= 0 ? null : (
    <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', textAlign: 'center', whiteSpace: 'nowrap', opacity}}>
      <div style={{font: `900 ${size}px ${FONT}`, color, letterSpacing: '-0.02em', ...OUTLINE, WebkitTextStroke: '12px rgba(3,5,15,0.9)'}}>{text}</div>
      {sub && <div style={{font: `800 ${Math.round(size * 0.36)}px ${FONT}`, color: SUB, marginTop: 4, ...OUTLINE, WebkitTextStroke: '8px rgba(3,5,15,0.9)'}}>{sub}</div>}
    </div>
  );

// a vertical dimension line from y1 to y2 at x, drawn downwards as p goes 0 -> 1
export const VMeasure: React.FC<{x: number; y1: number; y2: number; p: number; color?: string}> = ({x, y1, y2, p, color = 'rgba(234,242,255,0.85)'}) => {
  const {width, height} = useVideoConfig();
  if (p <= 0) return null;
  const ye = lerp(y1, y2, easeInOut(clamp(p * 1.3)));
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <line x1={x} y1={y1} x2={x} y2={ye} stroke={color} strokeWidth={3} strokeDasharray="10 8" />
      <line x1={x - 14} y1={y1} x2={x + 14} y2={y1} stroke={color} strokeWidth={3} />
      {p > 0.75 && <line x1={x - 14} y1={y2} x2={x + 14} y2={y2} stroke={color} strokeWidth={3} opacity={prog(p, 0.75, 0.85)} />}
    </svg>
  );
};
