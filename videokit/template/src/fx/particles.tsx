import React from 'react';
import {useVideoConfig} from 'remotion';
import {hash} from '../lib';
import {LightTex} from './light';

// Particles give a still picture life and depth: dust in a light beam, sparkles when something
// magical happens, embers off a fire or a star, snow, big soft bokeh discs in the foreground (depth of
// field), fireflies on a summer night. Positions are fixed by the seed, so every render is the same.
export type ParticleKind = 'dust' | 'sparkle' | 'ember' | 'snow' | 'bokeh' | 'firefly';

const COLOR: Record<ParticleKind, string> = {dust: '230,236,255', sparkle: '255,246,210', ember: '255,170,80', snow: '255,255,255', bokeh: '200,215,255', firefly: '220,255,140'};

export const Particles: React.FC<{
  t: number;
  kind?: ParticleKind;
  n?: number;
  seed?: string;
  color?: string; // 'r,g,b'
  area?: [number, number, number, number]; // x0, y0, x1, y1 (default: the whole frame)
  size?: number;
  speed?: number;
  opacity?: number;
}> = ({t, kind = 'dust', n = 60, seed = 'p', color, area, size = 1, speed = 1, opacity = 1}) => {
  const {width, height} = useVideoConfig();
  const [x0, y0, x1, y1] = area ?? [0, 0, width, height];
  const w = x1 - x0;
  const h = y1 - y0;
  const c = color ?? COLOR[kind];
  const id = `pg-${seed}-${kind}`;
  const wrap = (v: number, m: number) => ((v % m) + m) % m;
  if (kind === 'bokeh') {
    // out-of-focus highlights: real lens bokeh (an even disc, soft edge, faint bright rim), drifting
    return (
      <>
        {Array.from({length: n}, (_, i) => {
          const s = hash(`${seed}s${i}`);
          const ph = hash(`${seed}p${i}`) * 6.28;
          const x = x0 + wrap(hash(`${seed}x${i}`) * w + speed * 6 * t * (s - 0.5), w);
          const y = y0 + hash(`${seed}y${i}`) * h + Math.sin(t * 0.2 + ph) * 18;
          const r = (24 + 50 * s) * size;
          return <LightTex key={i} src="bokeh.png" x={x} y={y} w={2 * r} color={c} opacity={(0.08 + 0.14 * s) * opacity * (0.85 + 0.15 * Math.sin(t * 0.7 + ph))} />;
        })}
      </>
    );
  }
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, opacity, pointerEvents: 'none'}}>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor={`rgb(${c})`} stopOpacity={1} />
          <stop offset="35%" stopColor={`rgb(${c})`} stopOpacity={0.6} />
          <stop offset="100%" stopColor={`rgb(${c})`} stopOpacity={0} />
        </radialGradient>
      </defs>
      {Array.from({length: n}, (_, i) => {
        const u = hash(`${seed}x${i}`);
        const v = hash(`${seed}y${i}`);
        const s = hash(`${seed}s${i}`);
        const ph = hash(`${seed}p${i}`) * 6.28;
        let x = x0 + u * w;
        let y = y0 + v * h;
        let r = (1.2 + 2 * s) * size;
        let o = 0.3 + 0.4 * s;
        if (kind === 'dust') {
          x = x0 + wrap(u * w + speed * (8 + 10 * s) * t, w);
          y += Math.sin(t * 0.3 + ph) * 12;
          o *= 0.75 + 0.25 * Math.sin(t * 1.1 + ph);
        } else if (kind === 'sparkle') {
          o = Math.pow(Math.max(0, Math.sin(t * (2 + 3 * s) * speed + ph)), 6);
          r = (2 + 4 * s) * size;
        } else if (kind === 'ember') {
          y = y0 + wrap(v * h - speed * (30 + 40 * s) * t, h);
          x += Math.sin(t * 1.3 + ph) * 20;
          o *= 0.6 + 0.4 * Math.sin(t * 9 + ph * 3);
        } else if (kind === 'snow') {
          y = y0 + wrap(v * h + speed * (25 + 30 * s) * t, h);
          x += Math.sin(t * 0.8 + ph) * 18;
          o = 0.5 + 0.4 * s;
        } else if (kind === 'firefly') {
          x += Math.sin(t * 0.45 * speed + ph) * 40 + Math.sin(t * 0.9 + ph * 2) * 14;
          y += Math.cos(t * 0.38 * speed + ph) * 30;
          o = Math.pow(Math.max(0, Math.sin(t * (0.9 + s) + ph)), 2);
          r = (2 + 2 * s) * size;
        }
        if (o <= 0.01) return null;
        return (
          <g key={i} opacity={o}>
            <circle cx={x} cy={y} r={r * 3.2} fill={`url(#${id})`} />
            {(kind === 'sparkle' || kind === 'firefly' || kind === 'ember') && <circle cx={x} cy={y} r={r * 0.6} fill={`rgb(${c})`} />}
            {kind === 'sparkle' && (
              <>
                <line x1={x - r * 4} y1={y} x2={x + r * 4} y2={y} stroke={`rgb(${c})`} strokeWidth={1.2} strokeLinecap="round" />
                <line x1={x} y1={y - r * 4} x2={x} y2={y + r * 4} stroke={`rgb(${c})`} strokeWidth={1.2} strokeLinecap="round" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};
