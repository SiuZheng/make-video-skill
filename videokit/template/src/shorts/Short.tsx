import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import '../theme';
import {Grain, MotionBlurDefs, Vignette} from '../fx';
import {FPS} from '../lib';
import {BG} from '../theme';
import {Captions, Header, SHORTS, SceneProps} from './kit';

// Each Short's scene (one file per Short in this folder), and whether to darken the top and bottom behind
// the header and captions (yes over space; no over a bright sky).
const SCENES: Record<string, {scene: React.FC<SceneProps>; shade: boolean}> = {
  // planets: {scene: PlanetsScene, shade: true},
};

// One Short: its scene, the hook header, word-by-word captions, the light over it all, and its sound.
// Times are seconds of the Short itself.
export const ShortVideo: React.FC<{id: string}> = ({id}) => {
  const t = useCurrentFrame() / FPS;
  const d = SHORTS[id];
  const entry = SCENES[id];
  return (
    <AbsoluteFill style={{background: BG}}>
      <MotionBlurDefs />
      <Audio src={staticFile(`shorts/${id}.wav`)} />
      {entry && <entry.scene t={t} c={d.cues} />}
      {entry?.shade !== false && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 560, background: 'linear-gradient(180deg, rgba(3,5,15,0.92) 0%, rgba(3,5,15,0.7) 62%, rgba(3,5,15,0) 100%)'}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 520, background: 'linear-gradient(0deg, rgba(3,5,15,0.85) 0%, rgba(3,5,15,0.5) 45%, rgba(3,5,15,0) 100%)'}} />
        </>
      )}
      <Vignette strength={0.4} />
      <Grain t={t} opacity={0.05} />
      <Header text={d.header} t={t} />
      <Captions t={t} lines={d.lines} />
    </AbsoluteFill>
  );
};
