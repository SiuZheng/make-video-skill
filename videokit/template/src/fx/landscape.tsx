import React from 'react';
import {useVideoConfig} from 'remotion';
import {hash} from '../lib';

// Depth for any ground-level shot: ranges of hills or crater rims along the horizon and big blurred
// boulders right in front of the lens. Put each in a CamLayer (depth.tsx) at its depth - a far Ridge
// ~0.3, a near one ~0.55, Boulders ~1.5 - so the camera's drift slides them past each other. Cartoon
// look: flat fills, one shadowed face (light from the upper left), a dark outline. Colours default to
// the lilac Moon of the Moon-golf Short; pass your own palette for other worlds.

export type RidgeColors = {fill: string; shade: string; line: string};
const FAR: RidgeColors = {fill: '#6B61A6', shade: '#554B8E', line: '#1A1030'};
const NEAR: RidgeColors = {fill: '#857CB8', shade: '#665D9C', line: '#1A1030'};

// a range of rounded peaks standing on the horizon at y0. Draw it before the ground, which hides its feet
// (they reach 80 px below y0). far: taller, paler, thinner outline. h scales the heights.
export const Ridge: React.FC<{y0: number; seed?: string; far?: boolean; h?: number; opacity?: number; colors?: RidgeColors}> = ({y0, seed = 'ridge', far = false, h = 1, opacity = 1, colors}) => {
  const {width, height} = useVideoConfig();
  const c = colors ?? (far ? FAR : NEAR);
  const n = far ? 9 : 7;
  const step = (width + 2400) / n;
  const base = y0 + 80;
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity}}>
      {Array.from({length: n + 1}, (_, i) => {
        const x = -1200 + (i + 0.6 * hash(`${seed}x${i}`)) * step;
        const ht = (far ? 70 + 120 * hash(`${seed}h${i}`) : 28 + 60 * hash(`${seed}h${i}`)) * h;
        const w = (far ? 240 : 190) + 170 * hash(`${seed}w${i}`);
        const top = y0 - ht;
        const body = `M ${x - w} ${base} C ${x - w * 0.55} ${base - ht * 0.2} ${x - w * 0.35} ${top} ${x} ${top} C ${x + w * 0.3} ${top} ${x + w * 0.55} ${base - ht * 0.3} ${x + w} ${base} Z`;
        const dark = `M ${x} ${top} C ${x + w * 0.3} ${top} ${x + w * 0.55} ${base - ht * 0.3} ${x + w} ${base} L ${x + w * 0.2} ${base} C ${x + w * 0.15} ${base - ht * 0.5} ${x + w * 0.1} ${top + ht * 0.3} ${x} ${top} Z`;
        return (
          <g key={i}>
            <path d={body} fill={c.fill} />
            <path d={dark} fill={c.shade} />
            <path d={body} fill="none" stroke={c.line} strokeWidth={far ? 4 : 5} />
          </g>
        );
      })}
    </svg>
  );
};

// big boulders right in front of the lens, out of focus, framing the bottom corners (y: where they stand;
// below the frame by default, so only their tops show). Keep them in the bottom UI band of a Short.
export const Boulders: React.FC<{seed?: string; y?: number; left?: boolean; right?: boolean; blur?: number; colors?: [string, string, string]; line?: string}> = ({
  seed = 'fg',
  y,
  left = true,
  right = true,
  blur = 5,
  colors = ['#857CB8', '#5B5480', '#3A3260'],
  line = '#1A1030',
}) => {
  const {width, height} = useVideoConfig();
  const yy = y ?? height + 10;
  const rock = (cx: number, r: number, k: string) => {
    const pts = Array.from({length: 9}, (_, i) => {
      const a = Math.PI + (i / 8) * Math.PI;
      const rr = r * (0.8 + 0.35 * hash(`${k}${i}`));
      return [cx + Math.cos(a) * rr * 1.3, yy + Math.sin(a) * rr * 0.85];
    });
    let d = `M ${pts[0][0].toFixed(1)} ${yy + 60} L ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    return d + ` L ${pts[8][0].toFixed(1)} ${yy + 60} Z`;
  };
  const rocks: [number, number, string][] = [];
  if (left) rocks.push([-40 + 90 * hash(`${seed}l`), 200 + 70 * hash(`${seed}lr`), `${seed}L`]);
  if (right) rocks.push([width + 30 - 90 * hash(`${seed}r`), 170 + 70 * hash(`${seed}rr`), `${seed}R`]);
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: `blur(${blur}px)`}}>
      <defs>
        <linearGradient id={`boulder-${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="0.45" stopColor={colors[1]} />
          <stop offset="1" stopColor={colors[2]} />
        </linearGradient>
      </defs>
      {rocks.map(([cx, r, k]) => (
        <path key={k} d={rock(cx, r, k)} fill={`url(#boulder-${seed})`} stroke={line} strokeWidth={9} strokeLinejoin="round" />
      ))}
    </svg>
  );
};
