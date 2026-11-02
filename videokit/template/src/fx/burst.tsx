import React from 'react';
import {useVideoConfig} from 'remotion';
import {easeOut, hash, prog} from '../lib';
import {LightTex} from './light';

// A burst for an impact or a big reveal: a flash, sparks flying out and fading, and a shockwave ring
// racing outward. Pair it with sound.impact() (and shake() on the camera).
export const Burst: React.FC<{t: number; at: number; x: number; y: number; color?: string; n?: number; radius?: number; dur?: number; ring?: boolean; seed?: string}> = ({
  t,
  at,
  x,
  y,
  color = '255,214,150',
  n = 28,
  radius = 280,
  dur = 1.1,
  ring = true,
  seed = 'burst',
}) => {
  const {width, height} = useVideoConfig();
  const p = prog(t, at, at + dur);
  if (p <= 0 || p >= 1) return null;
  const e = easeOut(p);
  const fadeOut = (1 - p) * (1 - p);
  return (
    <div style={{position: 'absolute', left: 0, top: 0}}>
      <LightTex src="glow.png" x={x} y={y} w={radius * 2.2 * (0.6 + 0.4 * e)} color={color} opacity={0.9 * fadeOut} />
      <LightTex src="glow.png" x={x} y={y} w={radius * 0.6} color="255,252,240" opacity={Math.max(0, 1 - p * 3)} />
      <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', mixBlendMode: 'screen'}}>
        {ring && (
          <>
            <circle cx={x} cy={y} r={radius * 1.3 * e} fill="none" stroke={`rgba(${color},${0.35 * (1 - p)})`} strokeWidth={30 * (1 - p)} />
            <circle cx={x} cy={y} r={radius * 1.3 * e} fill="none" stroke={`rgba(255,250,235,${0.85 * (1 - p)})`} strokeWidth={5 * (1 - p) + 1} />
          </>
        )}
        {Array.from({length: n}, (_, i) => {
          const a = hash(`${seed}a${i}`) * Math.PI * 2;
          const sp = 0.45 + hash(`${seed}s${i}`) * 0.75;
          const d = radius * sp * e;
          const len = 26 + 60 * (1 - p) * sp;
          const x2 = x + Math.cos(a) * d;
          const y2 = y + Math.sin(a) * d;
          return (
            <line
              key={i}
              x1={x + Math.cos(a) * Math.max(0, d - len)}
              y1={y + Math.sin(a) * Math.max(0, d - len)}
              x2={x2}
              y2={y2}
              stroke={i % 3 ? `rgb(${color})` : 'rgb(255,252,240)'}
              strokeWidth={3.5 * (1 - p) + 0.5}
              strokeLinecap="round"
              opacity={1 - p}
            />
          );
        })}
      </svg>
    </div>
  );
};
