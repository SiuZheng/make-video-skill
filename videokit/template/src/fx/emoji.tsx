import React from 'react';
import {ContactShadow} from './light';

// Emoji as assets (when the brief chose emoji for props, icons or even characters): drawn with the colour
// emoji font, so they're crisp at any size, and lit like everything else - give them the scene's rim light
// (`light={rim(...)}`) and a contact shadow when they stand on something. Keep one emoji style per video
// next to the sticker art, and size them like real objects in the scene, not like text.
export const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export const Emoji: React.FC<{
  char: string;
  x: number;
  y: number;
  size: number; // px tall
  rot?: number;
  flip?: boolean;
  scale?: number; // e.g. pop(prog(t, at, at + 0.4)) for a pop-in
  opacity?: number;
  light?: string; // CSS filter: rim(), halo() from light.tsx
  shadow?: number; // contact shadow strength under it (0 = none)
}> = ({char, x, y, size, rot = 0, flip = false, scale = 1, opacity = 1, light, shadow = 0}) =>
  opacity <= 0 || scale <= 0 ? null : (
    <>
      {shadow > 0 && <ContactShadow x={x} y={y + size * 0.47} w={size * 0.85 * scale} opacity={shadow * opacity} />}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${(flip ? -1 : 1) * scale}, ${scale})`,
          fontSize: size,
          fontFamily: EMOJI_FONT,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          opacity,
          filter: light,
        }}
      >
        {char}
      </div>
    </>
  );
