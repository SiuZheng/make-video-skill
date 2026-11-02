// Frame fingerprints, so scripts/render.mjs can re-render only the parts of a video that changed.
//
// When a render passes inputProps {vkFingerprint: true}, every frame reports what it shows - a hash of its
// DOM and styles, plus the public/ files it uses (render.mjs adds those files' contents) - as an artifact
// named "vkfp/<frame>-<n>". Remotion gathers a frame's artifacts by calling window.remotion_collectAssets()
// once the frame is ready; this wraps that (and remotion_setFrame, to know which frame it is). These are
// Remotion internals: the projects pin remotion to 4.0.534, and if a later version changes them, no
// fingerprints come back and render.mjs simply renders everything.
//
// What a fingerprint can't see: pixels drawn into a <canvas> or WebGL, and a font file swapped under the
// same name (render.mjs hashes public/fonts separately). Use `vk.py render --fresh` after such changes.
//
// The same hook carries vk.py qa's measurements: with inputProps {vkProbe: N} every Nth frame reports its
// text (src/fx/probe.ts) as an artifact named "vkqa/<frame>-<n>" (scripts/probe.mjs collects them).
import {getInputProps} from 'remotion';
import {measure} from './probe';

type Fn = (...args: never[]) => unknown;

// 53-bit string hash (cyrb53): fast enough for a few hundred KB of DOM per frame
const cyrb53 = (s: string, seed: number) => {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let debug = false;

// The page as text, in a canonical form: attributes and inline styles sorted. (innerHTML won't do: an
// element's style lists its properties in the order they were set, so it depends on which frames the tab
// drew before.)
const serialize = (node: Node, out: string[]) => {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push('"' + node.nodeValue);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  // scripts draw nothing (and Remotion's list the public files with their dates)
  if (el.tagName === 'SCRIPT' || el.tagName === 'NOSCRIPT' || el.tagName === 'TEMPLATE') return;
  const attrs: string[] = [];
  for (const at of el.attributes) if (at.name !== 'style') attrs.push(at.name + '=' + at.value);
  const st = el.style;
  const decl: string[] = [];
  if (st) for (let i = 0; i < st.length; i++) decl.push(st[i] + ':' + st.getPropertyValue(st[i]) + st.getPropertyPriority(st[i]));
  out.push('<' + el.tagName + ' ' + attrs.sort().join(' ') + ' {' + decl.sort().join(';') + '}');
  for (let c = el.firstChild; c; c = c.nextSibling) serialize(c, out);
  out.push('>');
};

const snapshot = () => {
  const t0 = performance.now();
  const out: string[] = [];
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => serialize(el, out));
  // (not <body> itself: Remotion styles it per image format, which render.mjs keys the chunks on anyway)
  for (let c = document.body.firstChild; c; c = c.nextSibling) serialize(c, out);
  let s = out.join('\n');
  // the static-file prefix and the server's address change from render to render: leave them out
  const base = (window as unknown as {remotion_staticBase?: string}).remotion_staticBase ?? '';
  const files = new Set<string>();
  if (base) {
    for (const m of s.matchAll(new RegExp(String.raw`${escape(base)}/([^"'()\s&<>?#{};,]+)`, 'g'))) files.add(m[1]);
    s = s.split(base).join('');
  }
  s = s.split(location.origin).join('');
  // f: null (no static base to find the files by) means "can't tell": render.mjs then never reuses the frame
  return JSON.stringify({h: cyrb53(s, 1) + '.' + cyrb53(s, 2), f: base ? [...files].sort() : null, ms: Math.round(performance.now() - t0), n: s.length, ...(debug ? {s} : {})});
};

// Wrap a function Remotion assigns to window later (the setter catches the assignment).
const wrap = (name: string, make: (inner: Fn) => Fn) => {
  let wrapped: Fn | undefined;
  Object.defineProperty(window, name, {
    configurable: true,
    get: () => wrapped,
    set: (fn: Fn | undefined) => {
      wrapped = fn ? make(fn) : fn;
    },
  });
};

if (typeof window !== 'undefined') {
  const props = getInputProps() as {vkFingerprint?: boolean; vkPass?: boolean; vkDebug?: boolean; vkProbe?: number};
  const on = Boolean(props.vkFingerprint);
  const probeEvery = Number(props.vkProbe ?? 0);
  debug = Boolean(props.vkDebug);
  // the quick pass only needs the page (and the sound), not pictures of it: hidden, the browser skips
  // layout and painting (also when nothing is cached: a rough render's or an animatic's pass)
  if (props.vkPass) document.documentElement.style.display = 'none';
  const enabled = () => on;
  let frame = 0;
  let n = 0;
  wrap('remotion_setFrame', (inner) => ((f: number, ...rest: never[]) => {
    frame = f;
    return (inner as (...a: unknown[]) => unknown)(f, ...rest);
  }) as Fn);
  wrap('remotion_collectAssets', (inner) => (() => {
    const assets = (inner as () => unknown[])();
    if (enabled()) {
      assets.push({type: 'artifact', id: `vkfp-${frame}-${n}`, filename: `vkfp/${frame}-${n++}`, content: snapshot(), frame, contentType: 'text', downloadBehavior: null});
    }
    if (probeEvery > 0 && frame % probeEvery === 0) {
      assets.push({type: 'artifact', id: `vkqa-${frame}-${n}`, filename: `vkqa/${frame}-${n++}`, content: measure(), frame, contentType: 'text', downloadBehavior: null});
    }
    return assets;
  }) as Fn);
}
