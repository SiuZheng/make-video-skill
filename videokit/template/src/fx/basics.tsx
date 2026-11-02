import React from 'react';
import {Img, staticFile} from 'remotion';
import props from '../art/props.json';
import {LightTex} from './light';

// Props are pictures in public/art/props (src/art/props.json has their sizes, written by build.py).
export const PROPS = props as unknown as Record<string, [number, number]>;

// A prop picture centred on (x, y), w px wide. light: a CSS filter from light.tsx (rim(), halo()) so it
// sits in the scene's light; glow: a coloured glow behind it.
export const Sticker: React.FC<{name: string; x: number; y: number; w: number; rot?: number; opacity?: number; glow?: string; light?: string; flip?: boolean; shine?: number}> = ({
  name,
  x,
  y,
  w,
  rot = 0,
  opacity = 1,
  glow,
  light,
  flip = false,
  shine,
}) => {
  const [pw, ph] = PROPS[name] ?? [1, 1];
  const h = (w * ph) / pw;
  const src = staticFile(`art/props/${name}.png`);
  const transform = `rotate(${rot}deg) scaleX(${flip ? -1 : 1})`;
  return (
    <>
      {glow && <Glow x={x} y={y} r={w * 0.85} color={glow} opacity={0.55 * opacity} />}
      <Img src={src} style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform, opacity, filter: light}} />
      {/* shine 0..1: a band of light sweeping across it, cut to its own outline */}
      {shine !== undefined && shine > 0 && shine < 1 && (
        <div
          style={{
            position: 'absolute',
            left: x - w / 2,
            top: y - h / 2,
            width: w,
            height: h,
            transform,
            background: 'linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 60%)',
            backgroundSize: '300% 100%',
            backgroundPosition: `${100 - shine * 100}% 0`,
            maskImage: `url(${src})`,
            WebkitMaskImage: `url(${src})`,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            mixBlendMode: 'screen',
            opacity,
          }}
        />
      )}
    </>
  );
};

// a soft round glow (color: any CSS colour) - a gaussian falloff from public/fx/glow.png, no banding
export const Glow: React.FC<{x: number; y: number; r: number; color: string; opacity?: number}> = ({x, y, r, color, opacity = 1}) => (
  <LightTex src="glow.png" x={x} y={y} w={r * 1.7} color={color} opacity={opacity} blend="normal" />
);

// a glowing grain of light: a star, a spark, a far planet
export const Speck: React.FC<{x: number; y: number; r: number; color: string; glow?: number; opacity?: number}> = ({x, y, r, color, glow = 8, opacity = 1}) => (
  <>
    <Glow x={x} y={y} r={r * glow} color={color} opacity={0.6 * opacity} />
    <div style={{position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: color, opacity, boxShadow: `0 0 ${r * 2}px ${color}`}} />
  </>
);

// A big Sun up close: limb darkening (hot white middle, deep orange edge), boiling granulation,
// sunspots, a red chromosphere rim, spicules flickering along the edge and prominence loops standing
// off it. flares: angles (radians, 0 = right, PI = left) where loops stand; spots: [dx, dy, size] as
// fractions of r. For a small, distant sun use SunDisk.
export const Sun: React.FC<{x: number; y: number; r: number; t: number; opacity?: number; flares?: number[]; spots?: [number, number, number][]}> = ({
  x,
  y,
  r,
  t,
  opacity = 1,
  flares = [],
  spots = [],
}) => {
  const g = Math.max(6, r * 0.014);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity}}>
      <Glow x={x} y={y} r={r * 1.55} color="rgba(255,150,60,0.42)" />
      <div
        style={{
          position: 'absolute',
          left: x - r,
          top: y - r,
          width: 2 * r,
          height: 2 * r,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'radial-gradient(circle, #FFF6DA 0%, #FFE4A0 45%, #FFC566 70%, #FF9C3A 86%, #F2701F 95%, #D8521A 100%)',
          boxShadow: `0 0 ${r * 0.12}px ${r * 0.03}px rgba(255,140,50,0.75)`,
        }}
      >
        {/* granulation: public/fx/granulation.png (tileable cells), at two scales drifting apart: it boils */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${staticFile('fx/granulation.png')}), url(${staticFile('fx/granulation.png')})`,
            backgroundSize: `${g * 26}px ${g * 26}px, ${g * 41}px ${g * 41}px`,
            backgroundPosition: `${t * 5}px ${t * 3}px, ${-t * 4}px ${t * 2}px`,
            mixBlendMode: 'overlay',
            opacity: 0.55,
          }}
        />
        {spots.map(([dx, dy, s], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r + dx * r - s * r,
              top: r + dy * r - s * r * 0.8,
              width: 2 * s * r,
              height: 1.6 * s * r,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(60,20,8,0.95) 0%, rgba(90,30,10,0.85) 30%, rgba(170,70,20,0.45) 55%, transparent 72%)',
            }}
          />
        ))}
        <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, transparent 62%, rgba(150,45,10,0.3) 90%, rgba(110,25,5,0.55) 100%)'}} />
      </div>
      <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {/* spicules: little flames all along the edge */}
        {Array.from({length: 90}, (_, i) => {
          const a = (i / 90) * Math.PI * 2 + 0.013 * i;
          const len = r * (0.008 + 0.012 * (0.5 + 0.5 * Math.sin(t * (2 + (i % 5)) + i * 1.7)));
          return (
            <line key={i} x1={x + r * Math.cos(a)} y1={y + r * Math.sin(a)} x2={x + (r + len) * Math.cos(a)} y2={y + (r + len) * Math.sin(a)} stroke="rgba(255,120,50,0.75)" strokeWidth={Math.max(2, r * 0.004)} strokeLinecap="round" />
          );
        })}
        {/* prominences: loops of glowing gas */}
        {flares.map((a, i) => {
          const w = 0.045 + 0.02 * Math.sin(i * 2.3);
          const lift = r * (0.05 + 0.02 * Math.sin(i * 1.7)) * (1 + 0.12 * Math.sin(t * 0.7 + i));
          const p0 = {x: x + r * Math.cos(a - w), y: y + r * Math.sin(a - w)};
          const p1 = {x: x + r * Math.cos(a + w), y: y + r * Math.sin(a + w)};
          const pm = {x: x + (r + lift * 2.2) * Math.cos(a), y: y + (r + lift * 2.2) * Math.sin(a)};
          const d = `M ${p0.x} ${p0.y} Q ${pm.x} ${pm.y} ${p1.x} ${p1.y}`;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="rgba(255,80,30,0.18)" strokeWidth={r * 0.07} strokeLinecap="round" />
              <path d={d} fill="none" stroke="rgba(255,100,40,0.4)" strokeWidth={r * 0.035} strokeLinecap="round" />
              <path d={d} fill="none" stroke="rgba(255,150,70,0.75)" strokeWidth={r * 0.016} strokeLinecap="round" />
              <path d={d} fill="none" stroke="rgba(255,226,170,0.85)" strokeWidth={Math.max(2, r * 0.005)} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// the Sun (or any star), drawn in code: a hot core, a corona that breathes, slow rays
export const SunDisk: React.FC<{x: number; y: number; r: number; t: number; opacity?: number; hue?: 'gold' | 'red' | 'white'}> = ({x, y, r, t, opacity = 1, hue = 'gold'}) => {
  const breathe = 1 + 0.025 * Math.sin(t * 1.3);
  const core = {
    gold: 'radial-gradient(circle at 42% 38%, #FFFBE6 0%, #FFE58A 30%, #FFB53D 70%, #FF8A22 100%)',
    red: 'radial-gradient(circle at 42% 38%, #FFE2C8 0%, #FF9A5A 35%, #E8502A 75%, #B5301A 100%)',
    white: 'radial-gradient(circle at 42% 38%, #FFFFFF 0%, #EAF2FF 40%, #A9C8FF 85%, #7FA6F0 100%)',
  }[hue];
  const glow = {gold: 'rgba(255,170,60,0.55)', red: 'rgba(255,100,60,0.5)', white: 'rgba(160,200,255,0.5)'}[hue];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity}}>
      <Glow x={x} y={y} r={r * 2.6 * breathe} color={glow} />
      <div
        style={{
          position: 'absolute',
          left: x - r * 1.6,
          top: y - r * 1.6,
          width: r * 3.2,
          height: r * 3.2,
          borderRadius: '50%',
          background: 'repeating-conic-gradient(from 0deg, rgba(255,200,90,0.16) 0deg 6deg, transparent 6deg 15deg)',
          transform: `rotate(${t * 4}deg)`,
          maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
        }}
      />
      <div style={{position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: core, boxShadow: `0 0 ${r * 0.35}px ${glow}`}} />
    </div>
  );
};
