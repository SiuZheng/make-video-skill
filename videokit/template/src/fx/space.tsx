import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {hash} from '../lib';
import {PLATFORM} from './mode';

// Space, drawn in code: twinkling stars in parallax layers, soft nebula colour, out-of-focus dust in
// front, and light-speed streaks. Sizes follow the composition (16:9 or 9:16).

const wrap = (v: number, m: number) => ((v % m) + m) % m;
const starCache: Record<string, {x: number; y: number; r: number; o: number; f: number; ph: number}[]> = {};
const starsFor = (seed: string, n: number) => {
  const key = `${seed}:${n}`;
  if (!starCache[key]) {
    starCache[key] = Array.from({length: n}, (_, i) => ({
      x: hash(`${seed}x${i}`),
      y: hash(`${seed}y${i}`),
      r: 0.6 + Math.pow(hash(`${seed}r${i}`), 3) * 2.4,
      o: 0.25 + hash(`${seed}o${i}`) * 0.75,
      f: 0.6 + hash(`${seed}f${i}`) * 2.2,
      ph: hash(`${seed}p${i}`) * 6.28,
    }));
  }
  return starCache[key];
};

// a field of twinkling stars; offset/offsetY scroll it (wrapping), for parallax
export const Stars: React.FC<{t: number; seed?: string; n?: number; drift?: number; offset?: number; offsetY?: number; opacity?: number; size?: number}> = ({
  t,
  seed = 'sky',
  n = 260,
  drift = 0,
  offset = 0,
  offsetY = 0,
  opacity = 1,
  size = 1,
}) => {
  const {width: w, height: h} = useVideoConfig();
  return (
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {starsFor(seed, n).map((s, i) => (
        <circle key={i} cx={wrap(s.x * w + drift * t + offset, w)} cy={wrap(s.y * h + offsetY, h)} r={s.r * size} fill="#FFFFFF" opacity={s.o * (0.65 + 0.35 * Math.sin(t * s.f + s.ph))} />
      ))}
    </svg>
  );
};

// big soft clouds of colour, drifting (radial gradients, no blur filters: cheap)
export const Nebula: React.FC<{t: number; colors: string[]; seed?: string; camX?: number; camY?: number; opacity?: number}> = ({t, colors, seed = 'neb', camX = 0, camY = 0, opacity = 1}) => {
  const {width: w, height: h} = useVideoConfig();
  return (
    <AbsoluteFill style={{opacity}}>
      {colors.map((col, i) => {
        const r = (380 + hash(`${seed}r${i}`) * 420) * (Math.max(w, h) / 1920);
        const x = wrap(hash(`${seed}x${i}`) * (w + 800) + camX * 0.1 + t * (4 + i * 2), w + 800) - 400;
        const y = hash(`${seed}y${i}`) * h + camY * 0.1 + Math.sin(t * 0.07 + i) * 30;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - r,
              top: y - r * 0.62,
              width: 2 * r,
              height: 1.24 * r,
              borderRadius: '50%',
              background: `radial-gradient(ellipse, ${col} 0%, transparent 68%)`,
              transform: `rotate(${hash(`${seed}a${i}`) * 180 + t * 0.6}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// deep space with depth: nebula colour and three layers of stars that move at different speeds as the
// camera pans (camX, camY): the far ones barely, the near ones a lot
export const Space: React.FC<{t: number; camX?: number; camY?: number; nebula?: string[]; seed?: string}> = ({t, camX = 0, camY = 0, nebula, seed = 'sky'}) => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse at 60% 40%, rgba(40,52,130,0.22) 0%, transparent 62%), #03050F'}}>
    {nebula && <Nebula t={t} colors={nebula} camX={camX} camY={camY} />}
    <Stars t={t} seed={`${seed}far`} n={300} offset={-camX * 0.12} offsetY={-camY * 0.12} opacity={0.6} size={0.7} />
    <Stars t={t} seed={`${seed}mid`} n={140} offset={-camX * 0.35} offsetY={-camY * 0.35} opacity={0.85} />
    <Stars t={t} seed={`${seed}near`} n={45} offset={-camX * 0.8} offsetY={-camY * 0.8} size={1.5} />
  </AbsoluteFill>
);

// soft out-of-focus specks drifting in front of everything (depth of field); half as strong in a TikTok
// export (mode.ts), whose re-encode smears things moving across the whole frame
const DUST = Array.from({length: 34}, (_, i) => ({x: hash(`dx${i}`), y: hash(`dy${i}`), r: 6 + Math.pow(hash(`dr${i}`), 2) * 34, o: 0.05 + hash(`do${i}`) * 0.13, v: 6 + hash(`dv${i}`) * 14}));
export const Dust: React.FC<{t: number; camX?: number; camY?: number; opacity?: number}> = ({t, camX = 0, camY = 0, opacity = 1}) => {
  const {width: w, height: h} = useVideoConfig();
  return (
    <AbsoluteFill style={{opacity: PLATFORM === 'tiktok' ? opacity * 0.5 : opacity, pointerEvents: 'none'}}>
      {DUST.map((d, i) => {
        const x = wrap(d.x * (w + 200) - camX * 1.7 - t * d.v, w + 200) - 100;
        const y = wrap(d.y * (h + 200) - camY * 1.7 + Math.sin(t * 0.3 + i) * 20, h + 200) - 100;
        return <div key={i} style={{position: 'absolute', left: x - d.r, top: y - d.r, width: 2 * d.r, height: 2 * d.r, borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,230,255,0.9) 0%, rgba(220,230,255,0.25) 45%, transparent 70%)', opacity: d.o}} />;
      })}
    </AbsoluteFill>
  );
};

// light speed: stars stretched into streaks rushing out from the middle (w 0..1: how fast)
const STREAKS = Array.from({length: 240}, (_, i) => ({a: hash(`sa${i}`) * Math.PI * 2, r: 40 + hash(`sr${i}`) * 900, o: 0.35 + hash(`so${i}`) * 0.65, c: hash(`sc${i}`) < 0.2 ? '#9FD0FF' : hash(`sc${i}`) > 0.9 ? '#FFD9A8' : '#FFFFFF'}));
export const Warp: React.FC<{w: number; t: number; reverse?: boolean}> = ({w, t, reverse = false}) => {
  const {width, height} = useVideoConfig();
  if (w <= 0.001) return null;
  const k = Math.max(width, height) / 1920;
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0}}>
      {STREAKS.map((s, i) => {
        const run = (((s.r + (reverse ? -1 : 1) * t * 1400 * w) % 1000) + 1000) % 1000 + 30;
        const len = 20 + 520 * w * w * (run / 1000);
        const sq = height > width ? 1.3 : 0.75;
        return (
          <line
            key={i}
            x1={width / 2 + Math.cos(s.a) * run * k}
            y1={height / 2 + Math.sin(s.a) * run * k * sq}
            x2={width / 2 + Math.cos(s.a) * (run + len) * k}
            y2={height / 2 + Math.sin(s.a) * (run + len) * k * sq}
            stroke={s.c}
            strokeWidth={1 + 2 * w * (run / 1000)}
            strokeLinecap="round"
            opacity={s.o * Math.min(1, w * 1.6)}
          />
        );
      })}
    </svg>
  );
};

// Stars streaming past in depth, toward or away from a vanishing point (x, y): the camera falling back
// (stars rush in and shrink: a pull back) or flying forward (out: true, they rush out at you). p is how far
// we've travelled (any increasing number: tie it to the camera move), v how fast right now (0..1, for the
// streaks' length). Each star recycles when it's gone, so it never runs out.
const TUNNEL = Array.from({length: 160}, (_, i) => ({ph: hash(`tz${i}`), a: hash(`ta${i}`) * Math.PI * 2, r: 60 + Math.pow(hash(`tr${i}`), 0.7) * 1100, o: 0.4 + hash(`to${i}`) * 0.6, c: hash(`tc${i}`) < 0.2 ? '#A9D2FF' : hash(`tc${i}`) > 0.9 ? '#FFDDB0' : '#FFFFFF'}));
export const StarTunnel: React.FC<{p: number; v: number; x: number; y: number; out?: boolean; loops?: number; opacity?: number}> = ({p, v, x, y, out = false, loops = 2.5, opacity = 1}) => {
  const {width, height} = useVideoConfig();
  if (opacity <= 0.001) return null;
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {TUNNEL.map((s, i) => {
        const z = (((s.ph + p * loops) % 1) + 1) % 1; // 0 = near the camera, 1 = far away
        const zz = out ? 1 - z : z;
        const r = s.r / (0.25 + 2.75 * zz);
        const len = Math.min(r * 0.9, 18 + r * 0.55 * v);
        const r2 = out ? r - len : r + len; // the streak trails behind its motion
        const fadeIn = Math.min(1, (out ? z : 1 - z) * 6);
        const o = s.o * fadeIn * Math.min(1, (1 - zz) * 3) * (0.35 + 0.65 * v);
        if (o <= 0.02) return null;
        return (
          <line key={i} x1={x + Math.cos(s.a) * r} y1={y + Math.sin(s.a) * r} x2={x + Math.cos(s.a) * r2} y2={y + Math.sin(s.a) * r2} stroke={s.c} strokeWidth={0.8 + 2.2 * (1 - zz)} strokeLinecap="round" opacity={o} />
        );
      })}
    </svg>
  );
};
