import React from 'react';
import {Img, staticFile} from 'remotion';
import chars from '../art/characters.json';
import {FPS, clamp, easeInOut, lerp, prog} from '../lib';
import {ContactShadow} from './light';

// Characters are sprite pictures in public/art/<who>/<pose>.png, all on one canvas with the feet at
// (centerX, baseline) - src/art/characters.json, written by build.py. A character should always be
// doing something in the scene (standing on it, riding it, pointing at it, reacting), never just
// floating on top: give her a track of keys tied to what's on screen.
type CharInfo = {width: number; height: number; baseline: number; centerX: number; poses: string[]};
export const CHARS = chars as unknown as Record<string, CharInfo>;
const FIRST = Object.keys(CHARS)[0] ?? '';

// One pose, feet (or the bottom of a floating pose) at (x, y). sx / sy squash from the feet. light: a
// CSS filter (rim() from light.tsx) so she's lit like the scene; shadow: a contact shadow at her feet.
export const Guide: React.FC<{who?: string; pose: string; x: number; y: number; s: number; flip?: boolean; rot?: number; opacity?: number; sx?: number; sy?: number; light?: string; shadow?: number}> = ({
  who = FIRST,
  pose,
  x,
  y,
  s,
  flip = false,
  rot = 0,
  opacity = 1,
  sx = 1,
  sy = 1,
  light,
  shadow = 0,
}) => {
  const c = CHARS[who];
  if (!c) return null;
  return (
    <>
      {shadow > 0 && <ContactShadow x={x} y={y + 2} w={c.width * s * 0.55} opacity={shadow * opacity} />}
      <Img
        src={staticFile(`art/${who}/${pose}.png`)}
        style={{
          position: 'absolute',
          left: x - c.centerX * s,
          top: y - c.baseline * s,
          width: c.width * s,
          height: c.height * s,
          transform: `scale(${(flip ? -1 : 1) * sx}, ${sy}) rotate(${rot}deg)`,
          transformOrigin: `${c.centerX * s}px ${c.baseline * s}px`,
          opacity,
          filter: light,
        }}
      />
    </>
  );
};

// A character's moves: from each key's time on she does `pose` at a fixed spot or `follow`ing something
// in the scene, easing there over `move` seconds; `bob` floats her; `rot` tilts her. pose 'a|b' swaps
// between two pictures (a wave, a blink) every 0.3 s.
export type Pos = {x: number; y: number};
export type GKey = {at: number; pose: string; x?: number; y?: number; follow?: (t: number) => Pos; s: number; flip?: boolean; rot?: number; move?: number; bob?: boolean; opacity?: number};
type GState = {pose: string; act: string; bob: boolean; x: number; y: number; s: number; flip: boolean; rot: number; opacity: number};

export const makeTrack = (keys: GKey[]) => {
  const placeOf = (key: GKey, t: number): Pos => (key.follow ? key.follow(t) : {x: key.x ?? 0, y: key.y ?? 0});
  const poseOf = (key: GKey, t: number) => {
    const alt = key.pose.split('|');
    return alt.length > 1 ? alt[Math.floor(t / 0.3) % alt.length] : key.pose;
  };
  return (t: number): GState | null => {
    if (!keys.length || t < keys[0].at) return null;
    let k = 0;
    while (k + 1 < keys.length && keys[k + 1].at <= t) k++;
    const cur = keys[k];
    const prev = keys[Math.max(0, k - 1)];
    const p = cur.move ? easeInOut(prog(t, cur.at, cur.at + cur.move)) : 1;
    const a = placeOf(prev, t);
    const b = placeOf(cur, t);
    return {
      pose: poseOf(cur, t),
      act: cur.pose,
      bob: cur.bob ?? false,
      x: lerp(a.x, b.x, p),
      y: lerp(a.y, b.y, p) + (cur.bob ? Math.sin(t * 1.9) * 9 * cur.s * 2.4 : 0),
      s: lerp(prev.s, cur.s, p),
      flip: cur.flip ?? false,
      rot: lerp(prev.rot ?? 0, cur.rot ?? 0, p),
      opacity: lerp(prev.opacity ?? 1, cur.opacity ?? 1, cur.move ? p : prog(t, cur.at, cur.at + 0.4)),
    };
  };
};
export type Track = ReturnType<typeof makeTrack>;

// a little squash and stretch whenever she changes what she's doing
const BOUNCE = 0.3;
const squash = (track: Track, t: number) => {
  const now = track(t)?.act;
  for (let k = 1; k <= Math.round(BOUNCE * FPS); k++) {
    if (track(t - k / FPS)?.act !== now) {
      const p = (k - 1) / FPS / BOUNCE;
      const a = 0.08 * (1 - p) * (1 - p);
      const cc = Math.cos(3 * Math.PI * p);
      return {sx: 1 + 0.5 * a * cc, sy: 1 - a * cc};
    }
  }
  return {sx: 1, sy: 1};
};

// her, as the track says at time t: leaning into sideways moves, swaying a little when floating, and
// always breathing and swaying a touch (breathe: 0 turns it off, 0.4 for sleep) so she's never frozen
export const TrackGuide: React.FC<{t: number; track: Track; who?: string; opacity?: number; light?: string; shadow?: number; breathe?: number}> = ({t, track, who, opacity = 1, light, shadow, breathe = 1}) => {
  const g = track(t);
  if (!g || g.opacity * opacity <= 0.01) return null;
  const before = track(t - 2 / FPS);
  const vx = before ? (g.x - before.x) * (FPS / 2) : 0;
  const lean = clamp(vx / 45, -14, 14) * (g.flip ? -1 : 1) + (g.bob ? Math.sin(t * 1.3) * 3 : 0.8 * breathe * Math.sin(t * 1.3 + 0.7));
  const sq = squash(track, t);
  const br = 0.014 * breathe * Math.sin(t * 2.6);
  return <Guide who={who} pose={g.pose} x={g.x} y={g.y} s={g.s} flip={g.flip} opacity={g.opacity * opacity} rot={g.rot + lean} light={light} shadow={g.bob ? 0 : shadow} sx={sq.sx * (1 - 0.4 * br)} sy={sq.sy * (1 + br)} />;
};
