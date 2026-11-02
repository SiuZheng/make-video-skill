import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {hash} from '../lib';

// A camera over a scene drawn in its own coordinates: it looks at (x, y), zoomed and rolled. Move it with
// eased values (slow push-ins while someone talks, a quick ease-in-out to reframe), never linearly.
// Parallax and depth of field live in depth.tsx; shake and drift are offsets to add to x/y/rot.
export const Camera: React.FC<{x?: number; y?: number; zoom?: number; rot?: number; children: React.ReactNode}> = ({x, y, zoom = 1, rot = 0, children}) => {
  const {width, height} = useVideoConfig();
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  return (
    <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${width / 2}px, ${height / 2}px) rotate(${rot}deg) scale(${zoom}) translate(${-cx}px, ${-cy}px)`}}>
      {children}
    </AbsoluteFill>
  );
};

// a decaying tremor after each hit (story seconds): add .x/.y to the camera, .r to its roll
export const shake = (t: number, hits: number[], strength = 12, decay = 0.35) => {
  let x = 0;
  let y = 0;
  let r = 0;
  for (const h of hits) {
    const d = t - h;
    if (d < 0 || d > decay * 5) continue;
    const a = strength * Math.exp(-d / decay);
    x += a * Math.sin(d * 71 + h);
    y += a * Math.sin(d * 53 + h * 2) * 0.8;
    r += a * 0.05 * Math.sin(d * 37 + h * 3);
  }
  return {x, y, r};
};

// a slow handheld float, so a held shot never looks frozen (amp in px)
export const drift = (t: number, amp = 6, seed = 'cam') => {
  const p = [hash(`${seed}a`), hash(`${seed}b`), hash(`${seed}c`)].map((v) => v * 6.28);
  return {
    x: amp * (Math.sin(t * 0.31 + p[0]) * 0.7 + Math.sin(t * 0.73 + p[1]) * 0.3),
    y: amp * (Math.sin(t * 0.27 + p[1]) * 0.7 + Math.sin(t * 0.61 + p[2]) * 0.3),
    r: amp * 0.02 * Math.sin(t * 0.19 + p[2]),
  };
};
