import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bloom, Camera, Dust, EASE, KineticTitle, Particles, Space, drift} from '../fx';
import {TL, W, H, prog} from '../lib';

// A placeholder first scene (replace it): a slow push-in on space, a glow, the title arriving word by word.
export const Opening: React.FC<{t: number}> = ({t}) => {
  const push = EASE.soft(prog(t, 0, 8));
  const d = drift(t, 5);
  return (
    <AbsoluteFill>
      <Space t={t} camX={d.x} camY={d.y} nebula={['rgba(60,90,190,0.22)', 'rgba(110,70,170,0.14)']} />
      <Camera zoom={1 + 0.06 * push} x={W / 2 + d.x} y={H / 2 + d.y} rot={d.r}>
        <Bloom x={W / 2} y={H / 2} r={Math.min(W, H) * 0.35} color="140,170,255" intensity={0.5} />
        <Particles t={t} kind="sparkle" n={30} seed="open" />
      </Camera>
      <KineticTitle t={t} at={0.4} text={TL.title || 'Title'} y={H / 2} size={Math.round(Math.min(W, H) * 0.09)} />
      <Dust t={t} camX={d.x} camY={d.y} opacity={0.8} />
    </AbsoluteFill>
  );
};
