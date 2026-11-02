// What vk.py qa checks automatically (kit/qa.py): every piece of text on the frame - its box on screen, its
// size in pixels as seen (the font size times every scale above it) and how visible it is (its colour's
// alpha times every opacity above it, cut down by overflow:hidden parents). fingerprint.ts reports it per
// frame when a render passes inputProps {vkProbe: N} (scripts/probe.mjs):
// {w, h, x: [[text, left, top, width, height, px, opacity], ...]}.
type Box = {l: number; t: number; r: number; b: number};
type Info = {op: number; sc: number; clip: Box | null; hidden: boolean};

const TOP: Info = {op: 1, sc: 1, clip: null, hidden: false};
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE']);

// how much a transform scales things (rotation-free: the square root of the area it multiplies by)
const scaleOf = (transform: string) => {
  if (!transform || transform === 'none') return 1;
  try {
    const m = new DOMMatrixReadOnly(transform);
    return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
  } catch {
    return 1;
  }
};
const scaleProp = (scale: string) => {
  if (!scale || scale === 'none') return 1;
  const v = scale.split(/\s+/).map(Number).filter((n) => !Number.isNaN(n));
  return v.length ? Math.sqrt(Math.abs(v[0] * (v[1] ?? v[0]))) : 1;
};
const alphaOf = (color: string) => {
  if (!color || color === 'transparent' || color === 'none') return 0;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length > 3 ? Number(parts[3]) : 1;
};
const cut = (a: Box | null, b: Box): Box => (a ? {l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b)} : b);

export const measure = () => {
  const cache = new Map<Element, Info>();
  const info = (el: Element | null): Info => {
    if (!el || el === document.documentElement) return TOP;
    const got = cache.get(el);
    if (got) return got;
    const up = info(el.parentElement);
    const cs = getComputedStyle(el);
    let clip = up.clip;
    if (cs.overflow !== 'visible' && !(el instanceof SVGElement && el.tagName !== 'svg')) {
      const r = el.getBoundingClientRect();
      clip = cut(clip, {l: r.left, t: r.top, r: r.right, b: r.bottom});
    }
    const me = {
      op: up.op * Number(cs.opacity || 1),
      sc: up.sc * scaleOf(cs.transform) * scaleProp(cs.scale),
      clip,
      hidden: up.hidden || cs.display === 'none' || cs.visibility === 'hidden',
    };
    cache.set(el, me);
    return me;
  };
  const out: (string | number)[][] = [];
  const range = document.createRange();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    const text = (node.nodeValue ?? '').replace(/\s+/g, ' ').trim();
    const el = node.parentElement;
    if (!text || !el || SKIP.has(el.tagName)) continue;
    const inf = info(el);
    if (inf.hidden || inf.op < 0.03) continue;
    const cs = getComputedStyle(el);
    const svg = el instanceof SVGElement;
    const alpha = svg ? alphaOf(cs.fill) * Number(cs.fillOpacity || 1) : alphaOf(cs.color);
    let r: DOMRect;
    if (svg) r = el.getBoundingClientRect();
    else {
      range.selectNodeContents(node);
      r = range.getBoundingClientRect();
    }
    const box = cut(inf.clip, {l: r.left, t: r.top, r: r.right, b: r.bottom});
    if (box.r - box.l < 1 || box.b - box.t < 1) continue;
    let px = parseFloat(cs.fontSize) * inf.sc;
    if (svg) {
      const bb = (el as unknown as SVGGraphicsElement).getBBox?.();
      if (bb && bb.height > 0) px = parseFloat(cs.fontSize) * (r.height / bb.height);
    }
    const round = (v: number) => Math.round(v * 10) / 10;
    out.push([text.slice(0, 60), round(box.l), round(box.t), round(box.r - box.l), round(box.b - box.t), round(px), Math.round(inf.op * alpha * 100) / 100]);
  }
  return JSON.stringify({w: window.innerWidth, h: window.innerHeight, x: out});
};
