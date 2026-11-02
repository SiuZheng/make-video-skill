import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { SPEED, easeIn, easeInOut, easeOut, hash, lerp, prog } from "../lib";
import { EASE } from "./ease";
import { LightLeak } from "./light";
import { DRAFT } from "./mode";
import { Warp } from "./space";

// How one shot hands over to the next. Pick by meaning, not at random:
//   cut          a hard cut on an action or a beat (the default inside a section)
//   fade, dip    time passing; dip goes through black (an ending, a new chapter)
//   zoom         pulling back to reveal something bigger / diving into a detail
//   zoomThrough  flying forward through this picture into the next (journeys, "inside" something)
//   push         the next idea slides in beside this one (lists, comparisons)
//   slideUp      the same, vertically (Shorts, a feed of ideas)
//   whip         a fast push (energy, "meanwhile")
//   flash, leak  a burst of light (a revelation, the Sun, a memory); leak is warm and filmic
//   iris         closing on / opening from a point (focus on one thing)
//   wipe         a soft diagonal wipe (a new place)
//   ink          the next picture bleeds in like ink through paper (organic, gentle, art and nature)
//   flip         the picture turns over like a card to show the next (a twist, the other side)
//   glitch       a digital tear and colour split (technology, AI, something going wrong)
//   spin, warp   spinning away / light-speed (big scale jumps)
//   blur         a defocus dissolve (dreamy, a thought)
// Moving ones get real motion blur in Scenes. Each wants its sound: TRANSITION_SFX in scripts/build.py.
export type Move =
  | "cut"
  | "fade"
  | "dip"
  | "zoom"
  | "zoomThrough"
  | "push"
  | "slideUp"
  | "whip"
  | "flash"
  | "leak"
  | "iris"
  | "wipe"
  | "ink"
  | "flip"
  | "glitch"
  | "spin"
  | "blur"
  | "warp";
export const MOVE_DUR: Record<Move, number> = {
  cut: 0,
  fade: 1.0,
  dip: 1.2,
  zoom: 1.4,
  zoomThrough: 1.1,
  push: 0.9,
  slideUp: 0.9,
  whip: 0.6,
  flash: 1.2,
  leak: 1.4,
  iris: 1.4,
  wipe: 1.0,
  ink: 1.4,
  flip: 1.0,
  glitch: 0.5,
  spin: 1.4,
  blur: 1.0,
  warp: 1.6,
};
const MOVING: Move[] = [
  "zoom",
  "zoomThrough",
  "push",
  "slideUp",
  "whip",
  "flip",
  "spin",
  "warp",
];

// ------------------------------------------------------------ filters ----

// Render <MotionBlurDefs /> once at the top of every composition: the SVG filters the transitions use
// (motion blur, colour split), and the light textures from public/fx, loaded before the first frame.
// (The lighting uses them as CSS masks and backgrounds, which Remotion doesn't wait for on its own - a tab's
// first frames could otherwise miss a big texture like the god rays. <Img> makes it wait.)
const STEPS = [4, 8, 16, 32, 48];
const CHROMA = [3, 8, 16];
const TEXTURES = [
  "glow",
  "rays_a",
  "rays_b",
  "streak",
  "starburst",
  "ghost",
  "ghost_hex",
  "bokeh",
  "leak_1",
  "leak_2",
  "leak_3",
  "fog",
  "grain_0",
  "grain_1",
  "grain_2",
  "grain_3",
  "granulation",
  "ink",
];
export const MotionBlurDefs: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
      }}
    >
      {TEXTURES.map((n) => (
        <Img
          key={n}
          src={staticFile(`fx/${n}.png`)}
          style={{ width: 1, height: 1 }}
        />
      ))}
    </div>
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <defs>
        {STEPS.map((b) => (
          <React.Fragment key={b}>
            <filter
              id={`vk-mbx-${b}`}
              x="-25%"
              y="-5%"
              width="150%"
              height="110%"
            >
              <feGaussianBlur stdDeviation={`${b} 0`} />
            </filter>
            <filter
              id={`vk-mby-${b}`}
              x="-5%"
              y="-25%"
              width="110%"
              height="150%"
            >
              <feGaussianBlur stdDeviation={`0 ${b}`} />
            </filter>
          </React.Fragment>
        ))}
        {CHROMA.map((d) => (
          // colour split: red one way, blue the other (an impact, a glitch, a lens edge)
          <filter
            key={d}
            id={`vk-chroma-${d}`}
            x="-5%"
            y="-5%"
            width="110%"
            height="110%"
          >
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="r"
            />
            <feOffset in="r" dx={-d} result="r2" />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="g"
            />
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="b"
            />
            <feOffset in="b" dx={d} result="b2" />
            <feBlend in="r2" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b2" mode="screen" />
          </filter>
        ))}
      </defs>
    </svg>
  </>
);
// a CSS filter smearing along the direction of motion; strength in px (0 = none)
export const motionBlur = (strength: number, vertical = false) => {
  if (strength < 2) return "";
  const b = STEPS.reduce(
    (best, s) =>
      Math.abs(s - strength) < Math.abs(best - strength) ? s : best,
    STEPS[0],
  );
  return `url(#vk-mb${vertical ? "y" : "x"}-${b})`;
};
// a CSS filter splitting the colours by about `px`
export const chroma = (px: number) => {
  if (px < 1.5) return "";
  const d = CHROMA.reduce(
    (best, s) => (Math.abs(s - px) < Math.abs(best - px) ? s : best),
    CHROMA[0],
  );
  return `url(#vk-chroma-${d})`;
};

// ---------------------------------------------------------------- shot ----

// One shot, visible from a to b (story seconds), arriving with inMode and leaving with outMode. Both
// sides of a cut overlap for the transition's length, centred on the cut. at: the point an iris or a
// zoom centres on; dir: which way a push or whip travels (1 = the new shot comes in from the right).
export const Shot: React.FC<{
  t: number;
  a: number;
  b: number;
  inMode?: Move;
  outMode?: Move;
  inDur?: number;
  outDur?: number;
  at?: [number, number];
  dir?: 1 | -1;
  children: React.ReactNode;
}> = ({
  t,
  a,
  b,
  inMode = "cut",
  outMode = "cut",
  inDur,
  outDur,
  at,
  dir = 1,
  children,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const di = inDur ?? MOVE_DUR[inMode];
  const dout = outDur ?? MOVE_DUR[outMode];
  if (t < a - di / 2 || t > b + dout / 2) return null;
  const pin = inMode === "cut" ? 1 : prog(t, a - di / 2, a + di / 2);
  const pout = outMode === "cut" ? 0 : prog(t, b - dout / 2, b + dout / 2);
  const [ax, ay] = at ?? [W / 2, H / 2];
  const far =
    1.02 *
    Math.max(
      ...[
        [0, 0],
        [W, 0],
        [0, H],
        [W, H],
      ].map(([cx, cy]) => Math.hypot(cx - ax, cy - ay)),
    );
  const frame = Math.floor((t / SPEED) * 30);
  let scale = 1;
  let x = 0;
  let y = 0;
  let rot = 0;
  let rotY = 0;
  let blur = 0;
  let bright = 1;
  let split = 0;
  let smear = 0; // directional blur on top of the time samples, so the fastest moves stay continuous
  let opacity = 1;
  let clip: string | undefined;
  let mask: string | undefined;
  let maskSize: string | undefined;
  let maskPos: string | undefined;
  // arriving
  if (inMode === "fade") opacity *= EASE.soft(pin);
  if (inMode === "dip") opacity *= prog(pin, 0.5, 1);
  if (inMode === "zoom") {
    scale *= lerp(2.6, 1, EASE.out(pin));
    opacity *= easeInOut(pin);
  }
  if (inMode === "zoomThrough") {
    scale *= lerp(0.5, 1, EASE.out(pin));
    blur += 10 * (1 - EASE.out(pin));
    opacity *= prog(pin, 0.2, 0.6);
  }
  if (inMode === "push" || inMode === "whip") {
    x += dir * W * (1 - EASE.inOut(pin));
    smear += Math.sin(Math.PI * pin) * (inMode === "whip" ? 36 : 10);
  }
  if (inMode === "slideUp") {
    y += H * (1 - EASE.inOut(pin));
    smear += Math.sin(Math.PI * pin) * 10;
  }
  if (inMode === "flash") {
    bright *= lerp(4, 1, EASE.out(pin));
    opacity *= easeInOut(pin);
  }
  if (inMode === "leak") {
    bright *= lerp(1.7, 1, EASE.out(pin));
    opacity *= prog(pin, 0.38, 0.62); // the swap hides in the brightest part of the leak
  }
  if (inMode === "iris" && pin < 1)
    clip = `circle(${far * easeIn(pin)}px at ${ax}px ${ay}px)`;
  if (inMode === "wipe" && pin < 1)
    mask = `linear-gradient(105deg, black ${lerp(-20, 100, pin)}%, transparent ${lerp(0, 120, pin)}%)`;
  if (inMode === "ink" && pin < 1) {
    // one cell of the 6 x 4 sprite sheet of ink masks (public/fx/ink.png), creeping across
    const k = Math.min(23, Math.floor(EASE.inOut(pin) * 24));
    mask = `url(${staticFile("fx/ink.png")})`;
    maskSize = "600% 400%";
    maskPos = `${((k % 6) / 5) * 100}% ${(Math.floor(k / 6) / 3) * 100}%`;
  }
  if (inMode === "flip") {
    opacity *= pin >= 0.5 ? 1 : 0;
    rotY = -90 * (1 - EASE.out(prog(pin, 0.5, 1)));
  }
  if (inMode === "glitch" && pin < 1) {
    opacity *= pin > 0.55 || hash(`gi${frame}`) > 0.5 ? 1 : 0; // flickering in
    x += (hash(`gx${frame}`) - 0.5) * 80 * (1 - pin);
    split = 16 * (1 - pin);
  }
  if (inMode === "spin") {
    rot += -70 * (1 - easeOut(pin));
    scale *= lerp(0.35, 1, easeOut(pin));
    opacity *= easeInOut(pin);
  }
  if (inMode === "blur") {
    blur += 24 * (1 - easeOut(pin));
    opacity *= easeInOut(pin);
  }
  if (inMode === "warp") {
    scale *= lerp(0.45, 1, easeOut(pin));
    opacity *= easeInOut(pin);
  }
  // leaving
  if (outMode === "fade") opacity *= 1 - EASE.soft(pout);
  if (outMode === "dip") opacity *= 1 - prog(pout, 0, 0.5);
  if (outMode === "zoom") {
    scale *= lerp(1, 0.3, easeIn(pout));
    opacity *= 1 - easeInOut(pout);
  }
  if (outMode === "zoomThrough") {
    scale *= lerp(1, 5, easeIn(pout));
    blur += 14 * easeIn(pout);
    opacity *= 1 - prog(pout, 0.45, 0.8);
  }
  if (outMode === "push" || outMode === "whip") {
    x -= dir * W * EASE.inOut(pout);
    smear += Math.sin(Math.PI * pout) * (outMode === "whip" ? 36 : 10);
  }
  if (outMode === "slideUp") {
    y -= H * EASE.inOut(pout);
    smear += Math.sin(Math.PI * pout) * 10;
  }
  if (outMode === "flash") {
    bright *= lerp(1, 4, easeIn(pout));
    opacity *= 1 - prog(pout, 0.4, 0.75); // gone while the flash is at its whitest
  }
  if (outMode === "leak") {
    bright *= lerp(1, 1.7, easeIn(pout));
    opacity *= 1 - prog(pout, 0.38, 0.62);
  }
  if (outMode === "iris" && pout > 0)
    clip = `circle(${far * (1 - easeOut(pout))}px at ${ax}px ${ay}px)`;
  if (outMode === "wipe" && pout > 0)
    mask = `linear-gradient(105deg, transparent ${lerp(-20, 100, pout)}%, black ${lerp(0, 120, pout)}%)`;
  if (outMode === "flip") {
    opacity *= pout < 0.5 ? 1 : 0;
    rotY = 90 * EASE.in(prog(pout, 0, 0.5));
  }
  if (outMode === "glitch" && pout > 0) {
    opacity *=
      pout < 0.45 || hash(`go${frame}`) > 0.5 ? (pout < 0.9 ? 1 : 0) : 0;
    x += (hash(`gox${frame}`) - 0.5) * 80 * pout;
    split = Math.max(split, 16 * pout);
  }
  if (outMode === "spin") {
    rot += 80 * easeIn(pout);
    scale *= lerp(1, 0.25, easeIn(pout));
    opacity *= 1 - easeInOut(pout);
  }
  if (outMode === "blur") {
    blur += 24 * easeIn(pout);
    opacity *= 1 - easeInOut(pout);
  }
  if (outMode === "warp") {
    scale *= lerp(1, 3.2, easeIn(pout));
    opacity *= 1 - easeInOut(pout);
  }
  if (opacity <= 0.001) return null;
  const vertical = inMode === "slideUp" || outMode === "slideUp";
  const filter = [
    motionBlur(smear, vertical),
    chroma(split),
    blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : "",
    bright !== 1 ? `brightness(${bright.toFixed(2)})` : "",
  ]
    .join(" ")
    .trim();
  return (
    <AbsoluteFill
      style={{
        transform: `${rotY ? "perspective(1800px) " : ""}translate(${x}px, ${y}px) rotate(${rot}deg)${rotY ? ` rotateY(${rotY}deg)` : ""} scale(${scale})`,
        transformOrigin: `${ax}px ${ay}px`,
        opacity,
        filter: filter || undefined,
        clipPath: clip,
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize,
        WebkitMaskSize: maskSize,
        maskPosition: maskPos,
        WebkitMaskPosition: maskPos,
        maskRepeat: mask ? "no-repeat" : undefined,
        WebkitMaskRepeat: mask ? "no-repeat" : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------- motion blur ----

// Real motion blur: draw something at several moments across the shutter (half a frame, like a film
// camera's 180°) and average them - fast moves smear smoothly instead of strobing. Costs `samples` times
// the rendering while it's on, so Scenes only turns it on during moving transitions and `blur` windows.
export const TimeBlur: React.FC<{
  t: number;
  samples?: number;
  shutter?: number;
  draw: (t: number) => React.ReactNode;
}> = ({ t, samples = 5, shutter = 0.5, draw }) => {
  const { fps } = useVideoConfig();
  const span = (shutter * SPEED) / fps; // story seconds the shutter is open
  return (
    <>
      {Array.from({ length: samples }, (_, k) => (
        <AbsoluteFill key={k} style={{ opacity: 1 / (k + 1) }}>
          {draw(t - (span * k) / Math.max(1, samples - 1))}
        </AbsoluteFill>
      ))}
    </>
  );
};

// ------------------------------------------------------------- between ----

// What flies across the frame at a cut: a white flash, a warm light leak, whip streaks, light-speed
// lines, glitch bars.
export type Cut = { at: number; mode: Move; dur?: number };
export const Between: React.FC<{ t: number; cuts: Cut[] }> = ({ t, cuts }) => {
  const { width: W, height: H } = useVideoConfig();
  let warp = 0;
  let flash = 0;
  let whip = 0;
  let glitch = 0;
  let leak = -1;
  for (const c of cuts) {
    const d = c.dur ?? MOVE_DUR[c.mode];
    const p = prog(t, c.at - d / 2, c.at + d / 2);
    if (p <= 0 || p >= 1) continue;
    if (c.mode === "warp") warp = Math.max(warp, Math.sin(Math.PI * p));
    if (c.mode === "flash") flash = Math.max(flash, Math.sin(Math.PI * p));
    if (c.mode === "whip") whip = Math.max(whip, Math.sin(Math.PI * p));
    if (c.mode === "glitch") glitch = Math.max(glitch, Math.sin(Math.PI * p));
    if (c.mode === "leak") leak = p;
  }
  const frame = Math.floor((t / SPEED) * 30);
  return (
    <>
      <Warp w={warp} t={t} />
      {flash > 0 && (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(circle at 50% 50%, #FFFCF0 0%, #FFE9B8 45%, #FFC27A 100%)",
            opacity: 0.92 * flash,
            mixBlendMode: "screen",
          }}
        />
      )}
      {leak >= 0 && <LightLeak p={leak} />}
      {whip > 0 && (
        <svg
          width={W}
          height={H}
          style={{ position: "absolute", left: 0, top: 0, opacity: whip }}
        >
          {Array.from({ length: 26 }, (_, i) => {
            const y = ((i * 97) % H) + 8;
            const x =
              ((((i * 389 - t * 5200) % (W + 480)) + W + 480) % (W + 480)) -
              240;
            return (
              <line
                key={i}
                x1={x}
                y1={y}
                x2={x + 240 + (i % 5) * 60}
                y2={y}
                stroke="rgba(230,238,255,0.5)"
                strokeWidth={2 + (i % 3)}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      )}
      {glitch > 0 && (
        <AbsoluteFill style={{ mixBlendMode: "screen", opacity: glitch }}>
          {Array.from({ length: 9 }, (_, i) => {
            const on = hash(`gb${frame}_${i}`) > 0.45;
            const y = hash(`gy${frame}_${i}`) * H;
            const h = 4 + hash(`gh${frame}_${i}`) * 40;
            const col = [
              "rgba(255,60,90,0.55)",
              "rgba(60,220,255,0.55)",
              "rgba(255,255,255,0.35)",
            ][i % 3];
            return on ? (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: (hash(`gl${frame}_${i}`) - 0.3) * W,
                  top: y,
                  width: W * (0.3 + hash(`gw${frame}_${i}`) * 0.8),
                  height: h,
                  background: col,
                }}
              />
            ) : null;
          })}
        </AbsoluteFill>
      )}
    </>
  );
};

// ------------------------------------------------------------- scenes ----

// The film as a list of scenes: each one's component, its time span and how it arrives. A scene leaves
// the way the next one arrives, so both sides of every cut agree. blur: [from, to] windows (story s) of
// fast camera moves inside the scene that should get real motion blur (moving transitions get it anyway;
// a draft render - vk.py animatic - skips it).
export type SceneDef = {
  from: number;
  to: number;
  in?: Move;
  out?: Move;
  inDur?: number;
  at?: [number, number];
  dir?: 1 | -1;
  blur?: [number, number][];
  C: React.FC<{ t: number }>;
};
export const Scenes: React.FC<{
  t: number;
  scenes: SceneDef[];
  samples?: number;
}> = ({ t, scenes, samples = DRAFT ? 1 : 5 }) => (
  <>
    {scenes.map((s, i) => {
      const next = scenes[i + 1];
      const inMode = s.in ?? (i === 0 ? "cut" : "fade");
      const outMode = s.out ?? next?.in ?? "cut";
      const di = s.inDur ?? MOVE_DUR[inMode];
      const dout = next?.inDur ?? MOVE_DUR[outMode];
      const draw = (tt: number) => (
        <Shot
          t={tt}
          a={s.from}
          b={s.to}
          inMode={inMode}
          outMode={outMode}
          inDur={s.inDur}
          outDur={next?.inDur}
          at={s.at}
          dir={s.dir ?? next?.dir}
        >
          <s.C t={tt} />
        </Shot>
      );
      if (t < s.from - di / 2 || t > s.to + dout / 2) return null;
      const moving =
        (MOVING.includes(inMode) && Math.abs(t - s.from) < di / 2) ||
        (MOVING.includes(outMode) && Math.abs(t - s.to) < dout / 2) ||
        (s.blur ?? []).some(([a, b]) => t >= a && t <= b);
      return (
        <React.Fragment key={i}>
          {moving && samples > 1 ? (
            <TimeBlur t={t} samples={samples} draw={draw} />
          ) : (
            draw(t)
          )}
        </React.Fragment>
      );
    })}
    <Between
      t={t}
      cuts={scenes
        .slice(1)
        .map((s) => ({ at: s.from, mode: s.in ?? "fade", dur: s.inDur }))}
    />
  </>
);
