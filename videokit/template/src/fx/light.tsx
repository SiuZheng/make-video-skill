import React from 'react';
import {AbsoluteFill, Img, staticFile, useVideoConfig} from 'remotion';
import {hash} from '../lib';
import {PLATFORM} from './mode';

// Lighting is what makes flat drawings look like a picture: one clear light direction per scene, glows
// that light what's around them, edges that fall off into dark, a colour grade for the mood, fine grain.
// The light itself is drawn from pre-rendered textures in public/fx (videokit/assets/make_fx.py):
// gaussian glows, soft volumetric rays, real lens-flare parts, film leaks, fog - computed in float and
// dithered, so they're smooth where CSS gradients would band or look like a striped fan.
// Colours are 'r,g,b' strings.

const SCREEN: React.CSSProperties = {mixBlendMode: 'screen', pointerEvents: 'none'};
const fx = (name: string) => staticFile(`fx/${name}`);

// A white texture from public/fx used as the shape of coloured light, centred on (x, y).
export const LightTex: React.FC<{src: string; x: number; y: number; w: number; h?: number; color: string; opacity?: number; rot?: number; blend?: React.CSSProperties['mixBlendMode']}> = ({
  src,
  x,
  y,
  w,
  h,
  color,
  opacity = 1,
  rot = 0,
  blend = 'screen',
}) => {
  const hh = h ?? w;
  if (opacity <= 0.002 || w <= 0) return null;
  const url = `url(${fx(src)})`;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - hh / 2,
        width: w,
        height: hh,
        background: color.includes('(') || color.startsWith('#') ? color : `rgb(${color})`,
        opacity: Math.min(1, opacity),
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        transform: rot ? `rotate(${rot}deg)` : undefined,
        mixBlendMode: blend,
        pointerEvents: 'none',
      }}
    />
  );
};

// darker edges, over everything (strength 0.35-0.7); a smooth falloff, no visible ring
export const Vignette: React.FC<{strength?: number; inner?: number; color?: string}> = ({strength = 0.55, inner = 0.45, color = '3,4,12'}) => {
  const k = (f: number) => inner * 100 + (100 - inner * 100) * f;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 78% 74% at 50% 50%, rgba(${color},0) ${k(0)}%, rgba(${color},${strength * 0.08}) ${k(0.25)}%, rgba(${color},${strength * 0.3}) ${k(0.5)}%, rgba(${color},${strength * 0.62}) ${k(0.75)}%, rgba(${color},${strength}) 100%)`,
        pointerEvents: 'none',
      }}
    />
  );
};

// a light source's glow: hot core, halo, wide faint spill (gaussian falloffs, screen-blended)
export const Bloom: React.FC<{x: number; y: number; r: number; color?: string; intensity?: number}> = ({x, y, r, color = '255,214,150', intensity = 1}) => (
  <>
    <LightTex src="glow.png" x={x} y={y} w={r * 3.6} color={color} opacity={0.2 * intensity} />
    <LightTex src="glow.png" x={x} y={y} w={r * 1.5} color={color} opacity={0.5 * intensity} />
    <LightTex src="glow.png" x={x} y={y} w={r * 0.55} color="255,250,236" opacity={0.85 * intensity} />
  </>
);

// volumetric shafts of light from (x, y): two layers of soft rays turning slowly against each other,
// so they shimmer like light through haze. r: how far they reach. (rays is ignored: kept for old scenes)
export const GodRays: React.FC<{x: number; y: number; t: number; r?: number; color?: string; rays?: number; opacity?: number; spin?: number}> = ({
  x,
  y,
  t,
  r = 1100,
  color = '255,226,170',
  opacity = 0.5,
  spin = 2,
}) => (
  <>
    <LightTex src="rays_a.png" x={x} y={y} w={r * 2} color={color} opacity={opacity} rot={t * spin} />
    <LightTex src="rays_b.png" x={x} y={y} w={r * 2.3} color={color} opacity={opacity * 0.7} rot={-t * spin * 0.6 + 17} />
    <LightTex src="glow.png" x={x} y={y} w={r * 0.8} color={color} opacity={opacity * 0.6} />
  </>
);

// a lens flare from a bright light at (x, y): glare, diffraction spikes, an anamorphic streak, and ghosts
// on the line from the light through the middle of the frame (they slide as the light moves)
const GHOSTS: [number, number, string, number, number][] = [
  // [how far along the axis, size (fraction of the frame's short side), texture, opacity, hue turn]
  [0.32, 0.05, 'ghost.png', 0.22, 0],
  [0.58, 0.1, 'ghost_hex.png', 0.12, 40],
  [0.86, 0.035, 'ghost.png', 0.3, 160],
  [1.18, 0.13, 'ghost_hex.png', 0.08, 0],
  [1.5, 0.06, 'ghost.png', 0.16, 250],
  [1.95, 0.18, 'ghost.png', 0.06, 90],
];
export const LensFlare: React.FC<{x: number; y: number; intensity?: number; color?: string; spikes?: boolean}> = ({x, y, intensity = 1, color = '255,236,200', spikes = true}) => {
  const {width, height} = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;
  const s = Math.min(width, height);
  return (
    <AbsoluteFill style={SCREEN}>
      <LightTex src="glow.png" x={x} y={y} w={s * 1.2} color={color} opacity={0.32 * intensity} />
      {spikes && <LightTex src="starburst.png" x={x} y={y} w={s * 0.75} color={color} opacity={0.7 * intensity} rot={(x / width) * 30} />}
      <LightTex src="streak.png" x={x} y={y} w={width * 1.1} h={width * 0.07} color="190,215,255" opacity={0.55 * intensity} />
      {GHOSTS.map(([f, size, tex, a, hue], i) => {
        const gx = x + (cx - x) * f * 2;
        const gy = y + (cy - y) * f * 2;
        const r = s * size;
        return (
          <Img
            key={i}
            src={fx(tex)}
            style={{
              position: 'absolute',
              left: gx - r,
              top: gy - r,
              width: 2 * r,
              height: 2 * r,
              opacity: a * intensity,
              mixBlendMode: 'screen',
              filter: hue ? `hue-rotate(${hue}deg)` : undefined,
              transform: tex === 'ghost_hex.png' ? `rotate(${(x / width) * 40}deg)` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// a warm burst of film light washing across the frame: for transitions and big moments (p 0..1)
export const LightLeak: React.FC<{p: number; from?: 'left' | 'right'; variant?: 1 | 2 | 3}> = ({p, from = 'left', variant = 1}) => {
  const {width, height} = useVideoConfig();
  if (p <= 0 || p >= 1) return null;
  const k = Math.sin(Math.PI * p);
  const dir = from === 'left' ? 1 : -1;
  const x0 = (p - 0.5) * width * 1.1 * dir;
  return (
    <AbsoluteFill style={{...SCREEN, opacity: k}}>
      <Img src={fx(`leak_${variant}.png`)} style={{position: 'absolute', left: -width * 0.3 + x0, top: -height * 0.1, width: width * 1.6, height: height * 1.2, opacity: 0.95}} />
      <Img src={fx(`leak_${(variant % 3) + 1}.png`)} style={{position: 'absolute', left: -width * 0.2 - x0 * 0.5, top: -height * 0.2, width: width * 1.4, height: height * 1.4, opacity: 0.55, transform: 'scaleX(-1)'}} />
      <AbsoluteFill style={{background: `rgba(255,220,180,${0.14 * k * k * k})`}} />
    </AbsoluteFill>
  );
};

// drifting fog or haze: soft clouds (two layers at different sizes and speeds, for depth); y0..y1
// fades it in vertically (e.g. thick near the ground). color: what light it catches.
export const Fog: React.FC<{t: number; color?: string; opacity?: number; scale?: number; speed?: number; y0?: number; y1?: number; seed?: string}> = ({
  t,
  color = '200,212,240',
  opacity = 0.22,
  scale = 1,
  speed = 10,
  y0,
  y1,
  seed = 'fog',
}) => {
  const off = hash(seed) * 1000;
  const band = y0 !== undefined && y1 !== undefined ? `linear-gradient(180deg, transparent ${y0}px, black ${y1}px)` : null;
  const layer = (size: number, vx: number, vy: number, a: number) => {
    const masks = [`url(${fx('fog.png')})`, ...(band ? [band] : [])].join(', ');
    const pos = `${off + t * vx}px ${off * 0.7 + t * vy}px${band ? ', 0 0' : ''}`;
    return (
      <AbsoluteFill
        style={{
          background: `rgb(${color})`,
          opacity: a,
          maskImage: masks,
          WebkitMaskImage: masks,
          maskSize: band ? `${size}px ${size}px, 100% 100%` : `${size}px ${size}px`,
          WebkitMaskSize: band ? `${size}px ${size}px, 100% 100%` : `${size}px ${size}px`,
          maskRepeat: band ? 'repeat, no-repeat' : 'repeat',
          WebkitMaskRepeat: band ? 'repeat, no-repeat' : 'repeat',
          maskPosition: pos,
          WebkitMaskPosition: pos,
          maskComposite: band ? 'intersect' : undefined,
          WebkitMaskComposite: band ? 'source-in' : undefined,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
    );
  };
  return (
    <>
      {layer(1400 * scale, speed, speed * 0.15, opacity)}
      {layer(800 * scale, -speed * 1.6, speed * 0.1, opacity * 0.6)}
    </>
  );
};

// the colour grade: tint everything (soft-light for mood, color for a strong look); one per scene
export const Grade: React.FC<{color: string; opacity?: number; blend?: React.CSSProperties['mixBlendMode']}> = ({color, opacity = 0.18, blend = 'soft-light'}) =>
  opacity <= 0 ? null : <AbsoluteFill style={{background: color, opacity, mixBlendMode: blend, pointerEvents: 'none'}} />;

// fine film grain that changes every frame (four soft grain tiles, shifted): keeps gradients from banding.
// Left out of a TikTok export (mode.ts): TikTok's re-encode turns it into blur.
export const Grain: React.FC<{t: number; opacity?: number}> = ({t, opacity = 0.05}) => {
  if (PLATFORM === 'tiktok') return null;
  const k = Math.floor(t * 30);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${fx(`grain_${k % 4}.png`)})`,
        backgroundRepeat: 'repeat',
        backgroundPosition: `${Math.floor(hash(`gx${k}`) * 512)}px ${Math.floor(hash(`gy${k}`) * 512)}px`,
        mixBlendMode: 'overlay',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};

// a soft shadow on the ground under someone or something standing there
export const ContactShadow: React.FC<{x: number; y: number; w: number; opacity?: number}> = ({x, y, w, opacity = 0.45}) => (
  <LightTex src="glow.png" x={x} y={y} w={w} h={w * 0.2} color={`rgba(0,0,8,${opacity})`} blend="normal" />
);

// air between the camera and far things: a band of colour from y0 (clear) to y1 (thick)
export const Haze: React.FC<{y0: number; y1: number; color?: string; opacity?: number}> = ({y0, y1, color = '120,150,220', opacity = 0.35}) => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(${color},0) ${y0}px, rgba(${color},${opacity * 0.5}) ${(y0 + y1) / 2}px, rgba(${color},${opacity}) ${y1}px)`, pointerEvents: 'none'}} />
);

// CSS filters for pictures: a rim of light on the side it comes from, or a glow all round
export const rim = (color = 'rgba(255,222,170,0.9)', dx = -3, dy = -2, blur = 2) => `drop-shadow(${dx}px ${dy}px ${blur}px ${color})`;
export const halo = (color = 'rgba(160,200,255,0.65)', r = 16) => `drop-shadow(0 0 ${r}px ${color})`;

// The sun (or any strong light) just off the frame's edge: its glare spilling in, a lens flare across the
// frame and a warm grade - the one visible light of an outdoor shot. Screen space: draw it after the
// Camera. It breathes a little so the glare is never frozen.
export const SunGlare: React.FC<{t: number; x?: number; y?: number; intensity?: number; color?: string; grade?: string}> = ({
  t,
  x = -150,
  y = 520,
  intensity = 1,
  color = '255,236,205',
  grade = '#FF9F45',
}) => {
  const k = intensity * (1 + 0.04 * Math.sin(t * 1.7));
  return (
    <>
      <Grade color={grade} opacity={0.13} />
      <Bloom x={x} y={y} r={640} color={color} intensity={1.05 * k} />
      <LensFlare x={x} y={y} intensity={0.65 * k} color={color} />
    </>
  );
};

// a four-point glint of light on something shiny (a visor, a helmet, a ball, a blade) for `dur` seconds
// from `at`: it grows, turns and shrinks away
export const Glint: React.FC<{x: number; y: number; t: number; at: number; size?: number; dur?: number; color?: string}> = ({x, y, t, at, size = 30, dur = 0.5, color = '#FFFBEA'}) => {
  const {width, height} = useVideoConfig();
  const p = (t - at) / dur;
  if (p <= 0 || p >= 1) return null;
  const r = size * Math.sin(Math.PI * p);
  return (
    <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
      <g transform={`rotate(${20 + 60 * p} ${x} ${y})`}>
        <path d={`M ${x} ${y - r * 2} L ${x + r * 0.3} ${y - r * 0.3} L ${x + r * 2} ${y} L ${x + r * 0.3} ${y + r * 0.3} L ${x} ${y + r * 2} L ${x - r * 0.3} ${y + r * 0.3} L ${x - r * 2} ${y} L ${x - r * 0.3} ${y - r * 0.3} Z`} fill={color} />
      </g>
      <circle cx={x} cy={y} r={r * 0.5} fill="#FFFFFF" />
    </svg>
  );
};
