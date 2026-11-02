import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

// Depth: split a scene into layers. When the camera pans by (camX, camY), a layer at `depth` d moves
// d times as far - far things (sky 0.05, mountains 0.3) barely move, the subject (1) moves with the
// camera, foreground things (1.5+) sweep past. Layers away from the focus depth blur a little (depth of
// field), which points the eye at the subject. Use 3+ layers in every shot that moves.
export const Layer: React.FC<{depth: number; camX?: number; camY?: number; focus?: number; dof?: number; opacity?: number; children: React.ReactNode}> = ({
  depth,
  camX = 0,
  camY = 0,
  focus = 1,
  dof = 0,
  opacity = 1,
  children,
}) => {
  const blur = dof * Math.abs(depth - focus);
  return (
    <AbsoluteFill style={{transform: `translate(${-camX * depth}px, ${-camY * depth}px)`, filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined, opacity}}>
      {children}
    </AbsoluteFill>
  );
};

// The same idea inside a Camera (camera.tsx) that looks at (cx, cy): wrap each band of the world in a
// CamLayer at its depth - the sky ~0.08, a far planet ~0.12, far mountains ~0.3, near hills ~0.55, the
// ground and the subject 1, rocks right in front of the lens ~1.5 - and every camera move (even drift)
// slides them past each other. Pass the camera's place before any shake or push-in onto a detail.
export const CamLayer: React.FC<{cx: number; cy: number; d: number; children: React.ReactNode}> = ({cx, cy, d, children}) => {
  const {width, height} = useVideoConfig();
  return <AbsoluteFill style={{transform: `translate(${((cx - width / 2) * (1 - d)).toFixed(2)}px, ${((cy - height / 2) * (1 - d)).toFixed(2)}px)`}}>{children}</AbsoluteFill>;
};
