import React from 'react';
import {Img, staticFile} from 'remotion';
import {PROPS} from './basics';
import {LightTex} from './light';

// A planet or moon lit by one light: the picture (a prop) or a colour, a soft terminator into night on the
// far side, limb darkening, an atmosphere glowing on the lit edge, a glint where the light hits, and city
// lights on the night side if you want them.
// light: where the light comes from, in radians (0 = from the right, PI = from the left, -PI/2 = above).
export const LitSphere: React.FC<{
  x: number;
  y: number;
  r: number;
  light: number;
  name?: string; // a prop picture (public/art/props/<name>.png), else a plain sphere in `color`
  color?: string;
  atmosphere?: string; // 'r,g,b' of the air's glow, or undefined for none (the Moon)
  night?: number; // how dark the night side is, 0..1
  glint?: number; // the sun's reflection, 0..1
  cityLights?: boolean;
  t?: number;
  spin?: number; // degrees per story second the picture turns
  opacity?: number;
}> = ({x, y, r, light, name, color = '#8AA0C8', atmosphere, night = 0.85, glint = 0.35, cityLights = false, t = 0, spin = 0, opacity = 1}) => {
  const lx = Math.cos(light);
  const ly = Math.sin(light);
  // the gradient runs from the lit side to the dark side (CSS angles: 0deg = up, clockwise)
  const deg = (Math.atan2(-lx, ly) * 180) / Math.PI;
  const [pw, ph] = name ? PROPS[name] ?? [1, 1] : [1, 1];
  const k = 1.07; // the planet pictures have a white sticker outline: scale them up so it falls outside the disc
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {atmosphere && <LightTex src="glow.png" x={x + lx * r * 0.18} y={y + ly * r * 0.18} w={r * 3.1} color={atmosphere} opacity={0.42} />}
      <div style={{position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', overflow: 'hidden', background: name ? undefined : color}}>
        {name && (
          <Img
            src={staticFile(`art/props/${name}.png`)}
            style={{position: 'absolute', left: r - r * k, top: r - (r * k * ph) / pw, width: 2 * r * k, height: (2 * r * k * ph) / pw, transform: spin ? `rotate(${t * spin}deg)` : undefined}}
          />
        )}
        {cityLights && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 30% 40%, rgba(255,200,110,0.9) 0 1px, transparent 2px), radial-gradient(circle at 62% 58%, rgba(255,210,130,0.8) 0 1px, transparent 2px)',
              backgroundSize: `${Math.max(6, r * 0.09)}px ${Math.max(6, r * 0.09)}px, ${Math.max(9, r * 0.13)}px ${Math.max(9, r * 0.13)}px`,
              maskImage: `linear-gradient(${deg}deg, transparent 52%, black 70%)`,
              WebkitMaskImage: `linear-gradient(${deg}deg, transparent 52%, black 70%)`,
            }}
          />
        )}
        {/* night: a soft terminator, then dark */}
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${deg}deg, rgba(2,4,14,0) 40%, rgba(2,4,14,${night * 0.5}) 52%, rgba(2,4,14,${night * 0.88}) 64%, rgba(2,4,14,${night}) 80%)`}} />
        {/* limb darkening and a little colour from the air at the edge */}
        <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, transparent 58%, rgba(0,0,12,0.28) 90%, rgba(0,0,12,0.5) 100%)`}} />
      </div>
      {/* the lit limb: a thin bright edge of air */}
      {atmosphere && (
        <div
          style={{
            position: 'absolute',
            left: x - r * 1.01,
            top: y - r * 1.01,
            width: 2.02 * r,
            height: 2.02 * r,
            borderRadius: '50%',
            boxShadow: `inset 0 0 ${r * 0.06}px ${r * 0.015}px rgba(${atmosphere},0.9), 0 0 ${r * 0.05}px rgba(${atmosphere},0.75)`,
            maskImage: `linear-gradient(${deg}deg, black 0%, black 30%, transparent 58%)`,
            WebkitMaskImage: `linear-gradient(${deg}deg, black 0%, black 30%, transparent 58%)`,
          }}
        />
      )}
      {glint > 0 && <LightTex src="glow.png" x={x + lx * r * 0.55} y={y + ly * r * 0.55} w={r * 0.6} color="255,252,240" opacity={glint} />}
    </div>
  );
};
