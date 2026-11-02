import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import './theme';
import {Grain, MotionBlurDefs, SceneDef, Scenes, Vignette} from './fx';
import {SEC, TL, useT} from './lib';
import {BG} from './theme';
import {Opening} from './scenes/Opening';

// The film: every scene in its shot (arriving the way plan.md says), then the light and texture that sit
// over everything, and the sound (public/mix.wav, made by scripts/build.py).
// Scenes are written in story seconds (see lib.ts); give each one its own file in scenes/.
const SCENES: SceneDef[] = [
  {from: 0, to: SEC[2]?.start ?? TL.duration + 1, in: 'cut', C: Opening},
  // {from: SEC[2].start, to: SEC[3].start, in: 'zoomThrough', C: Second},
];

export const Main: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{background: BG}}>
      <MotionBlurDefs />
      <Audio src={staticFile('mix.wav')} />
      <Scenes t={t} scenes={SCENES} />
      <Vignette strength={0.5} />
      <Grain t={t} opacity={0.06} />
    </AbsoluteFill>
  );
};
