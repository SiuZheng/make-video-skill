import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {clamp, hash, lerp, prog} from '../lib';
import {EASE} from './ease';

// Archive footage: a picture shown as an old live broadcast (the 1971 Moon-golf scene). A warm faded
// grade with a flicker, signal snow, a hum bar rolling down the tube, scanlines, a red/blue fringe, the
// CRT's dark rounded corners and an optional blinking LIVE light. The snow and the hum keep even a held
// shot alive. Freeze it into a photo with live={false} (no snow or hum) and a fixed t.
export const OldTv: React.FC<{t: number; children: React.ReactNode; live?: boolean; liveLight?: [number, number] | null; grade?: string}> = ({
  t,
  children,
  live = true,
  liveLight = [946, 483],
  grade = 'saturate(0.62) sepia(0.28) contrast(1.06)',
}) => {
  const {width, height} = useVideoConfig();
  const flick = 0.03 * Math.sin(t * 90) + 0.02 * Math.sin(t * 37);
  const hum = (((t * 0.34) % 1) * 1.4 - 0.2) * height;
  const fr = Math.floor(t * 30);
  const svg: React.CSSProperties = {position: 'absolute', left: 0, top: 0, overflow: 'visible'};
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `${grade} brightness(${1.02 + flick})`}}>{children}</AbsoluteFill>
      {live && (
        <svg width={width} height={height} style={svg}>
          <defs>
            <linearGradient id="oldtv-hum" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF4DC" stopOpacity={0} />
              <stop offset="0.5" stopColor="#FFF4DC" stopOpacity={0.09} />
              <stop offset="1" stopColor="#FFF4DC" stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect x={0} y={hum - 170} width={width} height={340} fill="url(#oldtv-hum)" />
          {Array.from({length: 140}, (_, i) => (
            <rect key={i} x={hash(`nx${fr}_${i}`) * width} y={hash(`ny${fr}_${i}`) * height} width={2 + 5 * hash(`nw${fr}_${i}`)} height={2} fill={i % 2 ? '#FFFFFF' : '#0A0808'} opacity={0.35} />
          ))}
        </svg>
      )}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 2px, transparent 2px, transparent 5px)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(255,60,60,0.05), transparent 6%, transparent 94%, rgba(60,140,255,0.05))'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(10,6,4,0.55) 88%, rgba(0,0,0,0.85) 100%)'}} />
      <AbsoluteFill style={{boxShadow: 'inset 0 0 0 26px #0B0907, inset 0 0 60px 40px rgba(0,0,0,0.6)', borderRadius: 70}} />
      {liveLight && (
        <svg width={width} height={height} style={svg}>
          <rect x={liveLight[0] - 46} y={liveLight[1] - 28} width={92} height={56} rx={14} fill="rgba(10,8,8,0.75)" stroke="#E9DFC8" strokeWidth={3} />
          <circle cx={liveLight[0]} cy={liveLight[1]} r={16} fill="#FF3B3B" opacity={0.6 + 0.4 * Math.round((Math.sin(t * 6) + 1) / 2)} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

// a broadcast super (a caption burned into the old picture, "LIVE FROM THE MOON"): white monospace type
// on a dark strip, sliding in from the left at `at` and out by `out`. Put it inside OldTv, so it gets the
// grade and scanlines. Keep it 44+ px in a Short and out of the safe-zone bands.
export const TvSuper: React.FC<{t: number; at: number; out: number; text: string; x?: number; y?: number; size?: number}> = ({t, at, out, text, x = 64, y = 392, size = 46}) => {
  const p = EASE.out(prog(t, at, at + 0.4)) * (1 - EASE.in(prog(t, out - 0.3, out)));
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: lerp(-760, x, clamp(p)),
        top: y,
        height: size * 1.43,
        padding: '0 22px',
        background: 'rgba(12,10,20,0.8)',
        border: '3px solid #E9DFC8',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        fontFamily: '"Courier New", monospace',
        fontWeight: 900,
        fontSize: size,
        color: '#F3E9D2',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};
