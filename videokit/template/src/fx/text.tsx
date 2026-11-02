import React from 'react';
import {useVideoConfig} from 'remotion';
import {clamp, easeInOut, fmt, lerp, prog} from '../lib';
import {FONT, GOLD, INK, SUB} from '../theme';
import {EASE, stagger} from './ease';

// Type that moves well: big words arrive one at a time out of a mask; numbers roll; labels point at
// things with a line. Text over pictures gets a dark outline so it reads on anything.
export const OUTLINE: React.CSSProperties = {WebkitTextStroke: '10px rgba(3,5,15,0.85)', paintOrder: 'stroke fill', textShadow: '0 6px 24px rgba(0,0,10,0.7)'};

// words rising into place one after another (*gold* marks accent words). out: when it leaves (rises away)
export const KineticTitle: React.FC<{
  t: number;
  at: number;
  text: string;
  y: number;
  x?: number;
  size?: number;
  color?: string;
  accent?: string;
  gap?: number;
  dur?: number;
  out?: number;
  align?: 'center' | 'left';
  maxWidth?: number;
  weight?: number;
}> = ({t, at, text, y, x, size = 96, color = INK, accent = GOLD, gap = 0.07, dur = 0.6, out, align = 'center', maxWidth, weight = 900}) => {
  const {width} = useVideoConfig();
  const leave = out !== undefined ? EASE.in(prog(t, out, out + 0.45)) : 0;
  if (t < at - 0.05 || leave >= 1) return null;
  let gold = false;
  const words = text.split(' ').map((w) => {
    const starts = w.startsWith('*');
    const ends = w.endsWith('*');
    if (starts) gold = true;
    const item = {w: w.replace(/\*/g, ''), gold};
    if (ends) gold = false;
    return item;
  });
  const mw = maxWidth ?? width * 0.86;
  return (
    <div
      style={{
        position: 'absolute',
        left: align === 'center' ? (x ?? width / 2) - mw / 2 : x ?? 80,
        top: y,
        width: mw,
        transform: `translateY(-50%) translateY(${-40 * leave}px)`,
        opacity: 1 - leave,
        textAlign: align,
        fontWeight: weight,
        fontSize: size,
        fontFamily: FONT,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        textWrap: 'balance',
      }}
    >
      {words.map((wd, i) => {
        const p = stagger(t, at, i, gap, dur);
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.08em 0.14em 0.16em', margin: '0 -0.04em'}}>
            <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 105}%)`, filter: p < 1 ? `blur(${((1 - p) * 6).toFixed(1)}px)` : undefined, color: wd.gold ? accent : color, ...OUTLINE}}>{wd.w}</span>
          </span>
        );
      })}
    </div>
  );
};

// a number rolling from `from` to `to` (eased), with an optional small line under it
export const Counter: React.FC<{t: number; at: number; dur: number; to: number; from?: number; x: number; y: number; size?: number; color?: string; format?: (v: number) => string; sub?: string; opacity?: number}> = ({
  t,
  at,
  dur,
  to,
  from = 0,
  x,
  y,
  size = 110,
  color = INK,
  format = fmt,
  sub,
  opacity = 1,
}) => {
  if (t < at || opacity <= 0) return null;
  const p = EASE.out(prog(t, at, at + dur));
  const pin = EASE.out(prog(t, at, at + 0.35));
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${lerp(0.85, 1, pin)})`, opacity: opacity * pin, textAlign: 'center', whiteSpace: 'nowrap'}}>
      <div style={{fontWeight: 900, fontSize: size, fontFamily: FONT, color: p >= 1 ? GOLD : color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', ...OUTLINE}}>{format(lerp(from, to, p))}</div>
      {sub && <div style={{font: `700 ${Math.round(size * 0.32)}px ${FONT}`, color: SUB, marginTop: 6, ...OUTLINE, WebkitTextStroke: '7px rgba(3,5,15,0.85)'}}>{sub}</div>}
    </div>
  );
};

// a label pointing at something: a dot at (x, y), a line drawn out to (tx, ty), the words there
export const Callout: React.FC<{t: number; at: number; x: number; y: number; tx: number; ty: number; text: string; sub?: string; color?: string; out?: number; size?: number}> = ({
  t,
  at,
  x,
  y,
  tx,
  ty,
  text,
  sub,
  color = INK,
  out,
  size = 40,
}) => {
  const {width, height} = useVideoConfig();
  const leave = out !== undefined ? prog(t, out, out + 0.4) : 0;
  if (t < at || leave >= 1) return null;
  const dot = EASE.back(prog(t, at, at + 0.35));
  const line = EASE.out(prog(t, at + 0.15, at + 0.65));
  const label = EASE.out(prog(t, at + 0.45, at + 0.9));
  const ex = lerp(x, tx, line);
  const ey = lerp(y, ty, line);
  const right = tx >= x;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - leave}}>
      <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <line x1={x} y1={y} x2={ex} y2={ey} stroke="rgba(3,5,15,0.6)" strokeWidth={6} strokeLinecap="round" />
        <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth={3} strokeLinecap="round" />
        <circle cx={x} cy={y} r={9 * dot} fill={color} stroke="rgba(3,5,15,0.6)" strokeWidth={3} />
      </svg>
      {label > 0 && (
        <div style={{position: 'absolute', left: tx + (right ? 16 : -16), top: ty, transform: `translate(${right ? '0%' : '-100%'}, -50%) translateX(${(right ? -1 : 1) * 14 * (1 - label)}px)`, opacity: label, whiteSpace: 'nowrap', textAlign: right ? 'left' : 'right'}}>
          <div style={{font: `800 ${size}px ${FONT}`, color, ...OUTLINE, WebkitTextStroke: '8px rgba(3,5,15,0.85)'}}>{text}</div>
          {sub && <div style={{font: `700 ${Math.round(size * 0.6)}px ${FONT}`, color: SUB, ...OUTLINE, WebkitTextStroke: '6px rgba(3,5,15,0.85)'}}>{sub}</div>}
        </div>
      )}
    </div>
  );
};

// a plain label centred on (x, y) (align left/right to hang it off a point)
export const Label: React.FC<{x: number; y: number; text: string; sub?: string; opacity?: number; size?: number; color?: string; align?: 'center' | 'left' | 'right'}> = ({
  x,
  y,
  text,
  sub,
  opacity = 1,
  size = 40,
  color = INK,
  align = 'center',
}) => {
  if (opacity <= 0) return null;
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0%';
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${tx}, -50%) translateY(${(1 - opacity) * 10}px)`, opacity, textAlign: align, whiteSpace: 'nowrap'}}>
      <div style={{font: `800 ${size}px ${FONT}`, color, letterSpacing: '-0.01em', ...OUTLINE, WebkitTextStroke: '8px rgba(3,5,15,0.85)'}}>{text}</div>
      {sub && <div style={{font: `600 ${Math.round(size * 0.62)}px ${FONT}`, color: SUB, marginTop: 4, ...OUTLINE, WebkitTextStroke: '6px rgba(3,5,15,0.85)'}}>{sub}</div>}
    </div>
  );
};

// a dimension line from (x1, y) to (x2, y), drawn as p goes 0 -> 1, with its label above (or below)
export const Measure: React.FC<{x1: number; x2: number; y: number; p: number; text: string; sub?: string; above?: boolean; color?: string}> = ({
  x1,
  x2,
  y,
  p,
  text,
  sub,
  above = true,
  color = 'rgba(234,242,255,0.9)',
}) => {
  const {width, height} = useVideoConfig();
  if (p <= 0) return null;
  const xe = lerp(x1, x2, easeInOut(clamp(p * 1.4)));
  return (
    <>
      <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <line x1={x1} y1={y} x2={xe} y2={y} stroke={color} strokeWidth={3} strokeDasharray="10 8" />
        <line x1={x1} y1={y - 14} x2={x1} y2={y + 14} stroke={color} strokeWidth={3} />
        {p > 0.7 && <line x1={x2} y1={y - 14} x2={x2} y2={y + 14} stroke={color} strokeWidth={3} opacity={prog(p, 0.7, 0.8)} />}
      </svg>
      <Label x={(x1 + x2) / 2} y={above ? y - 46 : y + 52} text={text} sub={sub} opacity={prog(p, 0.55, 1)} size={38} />
    </>
  );
};

// letters typing on, with a blinking cursor (cps: characters a story second)
export const Typewriter: React.FC<{t: number; at: number; text: string; x: number; y: number; size?: number; cps?: number; color?: string; align?: 'center' | 'left'; cursor?: boolean; mono?: boolean}> = ({
  t,
  at,
  text,
  x,
  y,
  size = 56,
  cps = 22,
  color = INK,
  align = 'left',
  cursor = true,
  mono = false,
}) => {
  if (t < at) return null;
  const n = Math.min(text.length, Math.floor((t - at) * cps));
  const blink = Math.floor(t * 2.2) % 2 === 0 || n < text.length;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${align === 'center' ? '-50%' : '0%'}, -50%)`, whiteSpace: 'pre', font: `800 ${size}px ${mono ? '"Consolas", monospace' : FONT}`, color, ...OUTLINE, WebkitTextStroke: '8px rgba(3,5,15,0.85)'}}>
      {text.slice(0, n)}
      {cursor && <span style={{opacity: blink ? 1 : 0, color: GOLD}}>▍</span>}
    </div>
  );
};

// a marker sweeping in behind a word or a line (draw it before the text): x, y = its left middle
export const Highlight: React.FC<{t: number; at: number; x: number; y: number; w: number; h: number; color?: string; dur?: number}> = ({t, at, x, y, w, h, color = 'rgba(255,214,107,0.85)', dur = 0.45}) => {
  const p = EASE.out(prog(t, at, at + dur));
  if (p <= 0) return null;
  return <div style={{position: 'absolute', left: x, top: y - h / 2, width: w, height: h, background: color, borderRadius: h * 0.18, transform: `scaleX(${p}) skewX(-8deg)`, transformOrigin: 'left center'}} />;
};

// neon: bright core, coloured glow (flicker: an unsteady sign)
export const GlowText: React.FC<{t: number; text: string; x: number; y: number; size?: number; color?: string; flicker?: boolean; opacity?: number}> = ({
  t,
  text,
  x,
  y,
  size = 90,
  color = '255,120,200',
  flicker = false,
  opacity = 1,
}) => {
  const f = flicker ? (Math.sin(t * 37) > 0.93 ? 0.45 : 1) * (0.92 + 0.08 * Math.sin(t * 11)) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        whiteSpace: 'nowrap',
        font: `800 ${size}px ${FONT}`,
        color: `rgb(255,248,252)`,
        opacity: opacity * f,
        textShadow: `0 0 ${size * 0.06}px rgba(${color},1), 0 0 ${size * 0.18}px rgba(${color},0.9), 0 0 ${size * 0.45}px rgba(${color},0.6), 0 0 ${size}px rgba(${color},0.35)`,
      }}
    >
      {text}
    </div>
  );
};

// a title with a band of light sweeping across it (p 0..1 over the sweep)
export const ShineText: React.FC<{text: string; x: number; y: number; p: number; size?: number; color?: string; opacity?: number}> = ({text, x, y, p, size = 110, color = INK, opacity = 1}) => {
  const base: React.CSSProperties = {position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', font: `900 ${size}px ${FONT}`, letterSpacing: '-0.02em', opacity};
  return (
    <>
      <div style={{...base, color, ...OUTLINE}}>{text}</div>
      {p > 0 && p < 1 && (
        <div
          style={{
            ...base,
            color: 'transparent',
            backgroundImage: 'linear-gradient(105deg, rgba(255,255,255,0) 42%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 58%)',
            backgroundSize: '300% 100%',
            backgroundPosition: `${100 - p * 100}% 0`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            mixBlendMode: 'screen',
          }}
        >
          {text}
        </div>
      )}
    </>
  );
};

// a comic sound word on a big sound (PING!, KNOCK, POP!, CREAK): it pops in with overshoot and a jolt,
// drifts up and fades out after `hold` seconds. Put it beside the thing that made the sound, never on a face,
// a label or a caption, and gone before the next label lands. 44+ px in a Short (it's measured mid-pop).
export const SoundWord: React.FC<{t: number; at: number; x: number; y: number; text: string; size?: number; color?: string; line?: string; rot?: number; hold?: number}> = ({
  t,
  at,
  x,
  y,
  text,
  size = 72,
  color = '#FFFFFF',
  line = '#1A1030',
  rot = 0,
  hold = 0.45,
}) => {
  const d = t - at;
  const p = prog(t, at, at + 0.3);
  if (p <= 0) return null;
  const o = 1 - prog(t, at + hold, at + hold + 0.25);
  if (o <= 0) return null;
  const k = p >= 1 ? 1 : EASE.out(p) * (1 + 0.3 * Math.sin(Math.PI * p));
  const jx = 6 * Math.sin(d * 40) * Math.exp(-d * 8);
  return (
    <div
      style={{
        position: 'absolute',
        left: x + jx,
        top: y - 40 * prog(t, at, at + hold + 0.25),
        transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${k})`,
        whiteSpace: 'nowrap',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        color,
        opacity: o,
        WebkitTextStroke: `${Math.round(size * 0.2)}px ${line}`,
        paintOrder: 'stroke fill',
        textShadow: `0 ${Math.round(size * 0.08)}px 0 ${line}`,
      }}
    >
      {text}
    </div>
  );
};
