import {spring} from 'remotion';
import {clamp, prog} from '../lib';

// Motion that feels designed: nothing moves linearly. Most things ease OUT (fast start, long settle);
// things leaving ease IN; camera moves ease IN-OUT; arrivals can overshoot a little (back / springy).

// CSS-style cubic-bezier(x1, y1, x2, y2) as a function of 0..1
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (s: number) => ((ax * s + bx) * s + cx) * s;
  const y = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let s = p;
    for (let i = 0; i < 8; i++) {
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= (x(s) - p) / d;
    }
    return y(clamp(s));
  };
};

export const EASE = {
  out: bezier(0.16, 1, 0.3, 1), // "expo out": arrivals, reveals, text
  in: bezier(0.7, 0, 0.84, 0), // exits
  inOut: bezier(0.65, 0, 0.35, 1), // camera moves, morphs
  soft: bezier(0.45, 0, 0.55, 1), // gentle drifts
  back: bezier(0.34, 1.56, 0.64, 1), // arrive with a small overshoot
};

// a spring from 0 to 1 starting at `at` (story seconds): lively arrivals with real physics
export const springAt = (t: number, at: number, damping = 12, stiffness = 140, mass = 0.8) =>
  t <= at ? 0 : spring({frame: (t - at) * 30, fps: 30, config: {damping, stiffness, mass}});

// the i-th of several things arriving one after another: gap seconds apart, each taking dur
export const stagger = (t: number, at: number, i: number, gap = 0.07, dur = 0.6, ease = EASE.out) => ease(prog(t, at + i * gap, at + i * gap + dur));
