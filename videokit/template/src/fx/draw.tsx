import React from 'react';
import {useVideoConfig} from 'remotion';
import {LightTex} from './light';

// Lines that draw themselves: orbits, arrows, outlines, a route on a map - with a glowing pen tip while
// they're drawing. And trails behind moving things.
export type Pt = [number, number];

// points round an ellipse (an orbit) from angle a0 to a1 (radians)
export const ellipsePoints = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = Math.PI * 2, n = 96): Pt[] =>
  Array.from({length: n + 1}, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });

// a smooth curve from a to b, bowed out by `bend` (fraction of the distance; negative bends the other way)
export const curvePoints = (a: Pt, b: Pt, bend = 0.25, n = 48): Pt[] => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const c: Pt = [mx - dy * bend, my + dx * bend];
  return Array.from({length: n + 1}, (_, i) => {
    const s = i / n;
    return [(1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * c[0] + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * c[1] + s * s * b[1]];
  });
};

// the first `p` (0..1) of a polyline, by length
const partial = (pts: Pt[], p: number): Pt[] => {
  if (p >= 1) return pts;
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let left = total * Math.max(0, p);
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < seg.length; i++) {
    if (left >= seg[i]) {
      out.push(pts[i + 1]);
      left -= seg[i];
    } else {
      const f = seg[i] ? left / seg[i] : 0;
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]);
      break;
    }
  }
  return out;
};

// A line drawn on as p goes 0 -> 1. glow: a soft glow under it and a bright pen tip while drawing;
// dash: e.g. '10 8' for a dashed line; arrow: an arrowhead once it's drawn.
export const DrawPath: React.FC<{points: Pt[]; p: number; color?: string; width?: number; glow?: boolean; dash?: string; arrow?: boolean; opacity?: number}> = ({
  points,
  p,
  color = '255,214,107',
  width = 4,
  glow = true,
  dash,
  arrow = false,
  opacity = 1,
}) => {
  const {width: W, height: H} = useVideoConfig();
  if (p <= 0 || points.length < 2) return null;
  const pts = partial(points, p);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const tip = pts[pts.length - 1];
  const prev = pts[Math.max(0, pts.length - 2)];
  const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
  const head = width * 4;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {glow && <path d={d} fill="none" stroke={`rgba(${color},0.25)`} strokeWidth={width * 4} strokeLinecap="round" strokeLinejoin="round" />}
        <path d={d} fill="none" stroke="rgba(3,5,15,0.5)" strokeWidth={width + 3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
        <path d={d} fill="none" stroke={`rgb(${color})`} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
        {arrow && p >= 0.98 && (
          <path
            d={`M ${tip[0] + Math.cos(ang) * head * 0.4} ${tip[1] + Math.sin(ang) * head * 0.4} L ${tip[0] + Math.cos(ang + 2.5) * head} ${tip[1] + Math.sin(ang + 2.5) * head} L ${tip[0] + Math.cos(ang - 2.5) * head} ${tip[1] + Math.sin(ang - 2.5) * head} Z`}
            fill={`rgb(${color})`}
            stroke="rgba(3,5,15,0.5)"
            strokeWidth={2}
          />
        )}
      </svg>
      {glow && p < 1 && (
        <>
          <LightTex src="glow.png" x={tip[0]} y={tip[1]} w={width * 16} color={color} opacity={0.8} />
          <LightTex src="glow.png" x={tip[0]} y={tip[1]} w={width * 5} color="255,255,245" opacity={0.95} />
        </>
      )}
    </div>
  );
};

// A tapering trail behind something moving along path(t) (story seconds): a comet's tail, a beam of
// light. Drawn as one ribbon with one fading fill (no beads where pieces overlap) and a soft glow round it.
export const Trail: React.FC<{t: number; path: (t: number) => {x: number; y: number}; length?: number; color?: string; width?: number; samples?: number; opacity?: number; glow?: boolean}> = ({
  t,
  path,
  length = 0.6,
  color = '200,225,255',
  width = 10,
  samples = 32,
  opacity = 1,
  glow = true,
}) => {
  const {width: W, height: H} = useVideoConfig();
  const pts = Array.from({length: samples}, (_, i) => path(t - (length * i) / (samples - 1)));
  const head = pts[0];
  const tail = pts[pts.length - 1];
  if (Math.hypot(head.x - tail.x, head.y - tail.y) < 2) return null;
  const ribbon = (wd: number) => {
    const left: string[] = [];
    const right: string[] = [];
    pts.forEach((q, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const half = (wd / 2) * Math.pow(1 - i / (pts.length - 1), 0.8);
      left.push(`${(q.x - (dy / len) * half).toFixed(1)},${(q.y + (dx / len) * half).toFixed(1)}`);
      right.unshift(`${(q.x + (dy / len) * half).toFixed(1)},${(q.y - (dx / len) * half).toFixed(1)}`);
    });
    return [...left, ...right].join(' ');
  };
  const id = `trail-${color.replace(/\D/g, '')}-${width}`;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity}}>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={head.x} y1={head.y} x2={tail.x} y2={tail.y}>
          <stop offset="0" stopColor={`rgb(${color})`} stopOpacity={0.95} />
          <stop offset="0.35" stopColor={`rgb(${color})`} stopOpacity={0.5} />
          <stop offset="1" stopColor={`rgb(${color})`} stopOpacity={0} />
        </linearGradient>
      </defs>
      {glow && <polygon points={ribbon(width * 3.2)} fill={`url(#${id})`} opacity={0.22} />}
      <polygon points={ribbon(width)} fill={`url(#${id})`} />
    </svg>
  );
};
