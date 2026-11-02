import React from 'react';
import {AbsoluteFill} from 'remotion';
import './theme';
import {Bloom, Space, Vignette} from './fx';
import {TL} from './lib';
import {FONT, GOLD, INK} from './theme';

// The thumbnail (render with `npx remotion still src/index.ts Thumbnail out/thumbnail.png`, then save as
// a 1280x720 jpg): one striking image, the character's face, 3-5 big words. Make it per video.
export const Thumbnail: React.FC = () => (
  <AbsoluteFill>
    <Space t={3} nebula={['rgba(60,90,190,0.3)', 'rgba(140,70,170,0.2)']} />
    <Bloom x={1320} y={520} r={420} color="255,214,150" intensity={0.8} />
    <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 110}}>
      <div style={{font: `900 150px ${FONT}`, color: INK, lineHeight: 1.0, letterSpacing: '-0.03em', WebkitTextStroke: '14px rgba(3,5,15,0.9)', paintOrder: 'stroke fill', width: 1100}}>
        {(TL.title || 'Title').toUpperCase().split(' ').slice(0, 5).join(' ')}
        <span style={{color: GOLD}}>?</span>
      </div>
    </AbsoluteFill>
    <Vignette strength={0.6} />
  </AbsoluteFill>
);
