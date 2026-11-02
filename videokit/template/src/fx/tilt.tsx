import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

// A 3D camera angle on a flat layout: tilt it back (rx), turn it (ry), roll it (rz), with perspective.
// Ease the angles to swing the camera round a scene (e.g. rx 60 -> 0 to rise from a low angle).
export const Tilt: React.FC<{rx?: number; ry?: number; rz?: number; perspective?: number; origin?: [number, number]; children: React.ReactNode}> = ({
  rx = 0,
  ry = 0,
  rz = 0,
  perspective = 1600,
  origin,
  children,
}) => {
  const {width, height} = useVideoConfig();
  const [ox, oy] = origin ?? [width / 2, height * 0.55];
  return (
    <AbsoluteFill style={{perspective: `${perspective}px`, perspectiveOrigin: `${ox}px ${oy}px`}}>
      <AbsoluteFill style={{transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`, transformOrigin: `${ox}px ${oy}px`, transformStyle: 'preserve-3d'}}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
