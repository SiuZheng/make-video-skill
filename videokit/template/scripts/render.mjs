// Render a composition in chunks: several Chrome instances at once, and only the chunks whose frames
// changed since the last render (the others are reused from out/chunks/<comp>/). kit/render.py calls this.
//
//  1. bundle the project and open `--workers` browsers. Each has its own GPU process; tabs in one browser
//     share one, which is why more tabs stopped helping (demo, 790 frames: 1 browser x 2 tabs 122 s,
//     2 x 1 96 s, 3 x 1 83 s, 4 x 1 80 s);
//  2. one quick pass through the frames with the page hidden: it records the sound, and each frame's
//     fingerprint - what it shows (src/fx/fingerprint.ts) plus the contents of the public/ files it uses;
//  3. render the chunks whose fingerprints changed (or that have none), slowest first, the workers taking
//     them off one queue. Frames are captured as JPEG at quality 100: 30% faster than PNG and the same
//     picture (48-50 dB from lossless, less than the H.264 encode itself changes). Every chunk starts on a
//     keyframe, so they join without re-encoding;
//  4. join the chunks and add the sound -> --out.
//
// Usage: node scripts/render.mjs --comp=Main --out=out/Main.mp4 [--frames=a-b] [--gl=angle]
//   [--workers=3] [--tabs=1] [--format=jpeg|png] [--quality=100] [--crf=16] [--preset=slow] [--scale=1]
//   [--chunk=120] [--hash-tabs=4] [--timeout=300000] [--fresh (ignore saved chunks)] [--no-cache]
//   [--platform=tiktok (src/fx/mode.ts: no grain; its chunks are kept apart)] [--draft (no motion blur)]
//   [--debug-fp (say which frames' fingerprints differed between the pass and the render, and save both)]
//   [--dump-fp=file.json (save every frame's fingerprint from the quick pass)]
// Prints one line "VK_RESULT {json}" at the end (timings, chunks reused and rendered).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {combineChunks, openBrowser, renderMedia, selectComposition} from '@remotion/renderer';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const flag = (k) => process.argv.includes(`--${k}`);

const comp = arg('comp', 'Main');
const out = path.resolve(arg('out', `out/${comp}.mp4`));
const gl = arg('gl', null);
const workers = Math.max(1, Number(arg('workers', 3)));
const tabs = Number(arg('tabs', 1));
const format = arg('format', 'jpeg');
const quality = Number(arg('quality', 100));
const crf = Number(arg('crf', 16));
const preset = arg('preset', 'slow');
const scale = Number(arg('scale', 1));
const chunk = Number(arg('chunk', 120));
const hashTabs = Number(arg('hash-tabs', 4));
const timeout = Number(arg('timeout', 300000));
const useCache = !flag('no-cache');
const fresh = flag('fresh');
const debug = flag('debug-fp');
const platform = arg('platform', null); // a TikTok export (vk.py final --platform tiktok)
const draft = flag('draft'); // vk.py animatic
const modeProps = {...(platform ? {vkPlatform: platform} : {}), ...(draft ? {vkDraft: true} : {})};
const FP_VERSION = 3; // bump when the fingerprint or the chunk format changes

const t0 = Date.now();
const secs = (t) => Math.round((Date.now() - t) / 100) / 10;
const timing = {};
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');
const log = (...a) => console.log(...a);

// 1. bundle, browsers, composition
let t = Date.now();
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
timing.bundle = secs(t);
t = Date.now();
const inputProps = {...modeProps, ...(useCache ? {vkFingerprint: true, ...(debug ? {vkDebug: true} : {})} : {})};
const browsers = await Promise.all(Array.from({length: workers}, () =>
  openBrowser('chrome', {chromiumOptions: gl ? {gl} : {}, logLevel: 'error'})));
const composition = await selectComposition({serveUrl, id: comp, inputProps, puppeteerInstance: browsers[0], logLevel: 'error'});
timing.open = secs(t);
const total = composition.durationInFrames;
const [a, b] = arg('frames') ? arg('frames').split('-').map(Number) : [0, total - 1];
const last = Math.min(b, total - 1);
const whole = a === 0 && last === total - 1;
const common = {composition, serveUrl, inputProps, timeoutInMilliseconds: timeout, logLevel: 'error'};

// What every chunk depends on besides its own frames: the settings, Remotion, fonts and stylesheets.
const filesUnder = (dir, test) => (fs.existsSync(dir) ? fs.readdirSync(dir, {recursive: true}) : [])
  .map((f) => path.join(dir, String(f))).filter((f) => fs.statSync(f).isFile() && test(f)).sort();
const remotionVersion = JSON.parse(fs.readFileSync('node_modules/remotion/package.json', 'utf8')).version;
const global = sha(JSON.stringify({
  v: FP_VERSION, comp, w: composition.width, h: composition.height, fps: composition.fps, format,
  quality: format === 'jpeg' ? quality : null, crf, preset, scale, codec: 'h264-ts', colorSpace: 'bt709', pixelFormat: 'yuv420p', remotionVersion, ...modeProps,
  static: [...filesUnder('public/fonts', () => true), ...filesUnder('src', (f) => f.endsWith('.css'))].map((f) => f + ':' + sha(fs.readFileSync(f))),
}));

// 2. the sound, and a fingerprint per frame (the page hidden: no layout or painting needed for this)
t = Date.now();
const audio = path.join(path.dirname(out), `${path.basename(out, path.extname(out))}.sound.wav`);
const prints = new Map();
await renderMedia({...common, inputProps: {...inputProps, vkPass: true}, codec: 'wav', outputLocation: audio, overwrite: true,
  frameRange: [a, last], concurrency: hashTabs, puppeteerInstance: browsers[0],
  onArtifact: (art) => art.filename.startsWith('vkfp/') && prints.set(art.frame, art.content)});
timing.pass = secs(t);
const fileHashes = new Map();
const hashFile = (p) => {
  if (!fileHashes.has(p)) {
    let h = 'missing';
    try {
      h = sha(fs.readFileSync(path.join('public', decodeURIComponent(p)))).slice(0, 16);
    } catch {}
    fileHashes.set(p, h);
  }
  return fileHashes.get(p);
};
const parse = (c) => (c ? JSON.parse(c) : null);
const keyOf = (c) => {
  const p = parse(c);
  return p && p.f ? sha(p.h + '|' + p.f.map((f) => f + ':' + hashFile(f)).join(',')).slice(0, 20) : null;
};
if (arg('dump-fp')) fs.writeFileSync(arg('dump-fp'), JSON.stringify(Object.fromEntries([...prints].map(([f, c]) => [f, parse(c)]))));
const keys = new Map([...prints].map(([f, c]) => [f, keyOf(c)]));
const size = new Map([...prints].map(([f, c]) => [f, parse(c).n ?? 1])); // page size: a rough guess of the work

// 3. which chunks to render
const ranges = [];
for (let s = Math.floor(a / chunk) * chunk; s <= last; s += chunk) ranges.push([Math.max(s, a), Math.min(s + chunk - 1, last)]);
const name = ([s, e]) => `${s}-${e}`;
// (a TikTok export or a draft keeps its chunks apart, so it doesn't push out the YouTube render's)
const tag = (scale === 1 ? '' : `@${scale}x`) + (platform ? `@${platform}` : '') + (draft ? '@draft' : '');
const dir = path.resolve('out', 'chunks', useCache ? comp + tag : `_tmp-${comp}${tag}`);
fs.mkdirSync(dir, {recursive: true});
const indexPath = path.join(dir, 'index.json');
let index = {global, chunks: {}};
try {
  const old = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  if (useCache && old.global === global) index = old; // (--fresh re-renders this render's chunks, keeps the others)
} catch {}
if (whole) index.chunks = Object.fromEntries(ranges.filter((r) => index.chunks[name(r)]).map((r) => [name(r), index.chunks[name(r)]]));
const saveIndex = () => {
  if (!useCache) return;
  fs.writeFileSync(indexPath + '.tmp', JSON.stringify(index));
  fs.renameSync(indexPath + '.tmp', indexPath);
};
const keysOf = ([s, e]) => Array.from({length: e - s + 1}, (_, i) => keys.get(s + i) ?? null);
// a chunk's file is named after its frames' fingerprints, so the previous version of a chunk (kept until the
// next render) is found again if an edit is undone
const fileFor = (r, k) => `${name(r)}.${sha(global + k.join()).slice(0, 12)}.ts`;
const oldFiles = new Set(Object.values(index.chunks).map((c) => c.file));
const reusable = (r) => {
  const k = keysOf(r);
  if (!useCache || fresh || k.includes(null)) return false;
  const c = index.chunks[name(r)];
  if (c && c.keys.join() === k.join() && fs.existsSync(path.join(dir, c.file))) return true;
  if (!fs.existsSync(path.join(dir, fileFor(r, k)))) return false;
  index.chunks[name(r)] = {file: fileFor(r, k), keys: k};
  return true;
};
const cost = ([s, e]) => Array.from({length: e - s + 1}, (_, i) => size.get(s + i) ?? 1).reduce((x, y) => x + y, 0);
const todo = ranges.filter((r) => !reusable(r)).sort((x, y) => cost(y) - cost(x)); // slowest first: no long tail
const reused = ranges.length - todo.length;
log(`${ranges.length} chunks of up to ${chunk} frames: ${reused} unchanged, ${todo.length} to render` +
  ` (${workers} browser${workers > 1 ? 's' : ''} x ${tabs} tab${tabs > 1 ? 's' : ''}, ${format}${format === 'jpeg' ? ' ' + quality : ''})`);

t = Date.now();
let next = 0;
let done = 0;
let failed = null;
const perChunk = [];
const work = async (browser, w) => {
  while (next < todo.length && !failed) {
    const [s, e] = todo[next++];
    const part = path.join(dir, `${s}-${e}.part${w}.ts`);
    const got = new Map();
    const tc = Date.now();
    try {
      await renderMedia({...common, codec: 'h264-ts', outputLocation: part, overwrite: true, frameRange: [s, e], muted: true,
        concurrency: tabs, puppeteerInstance: browser, imageFormat: format, ...(format === 'jpeg' ? {jpegQuality: quality} : {}),
        crf, x264Preset: preset, colorSpace: 'bt709', pixelFormat: 'yuv420p', scale,
        onArtifact: (art) => art.filename.startsWith('vkfp/') && got.set(art.frame, art.content)});
    } catch (err) {
      failed = err;
      return;
    }
    // keep the fingerprints of the frames as they were actually drawn; if they differ from the quick pass
    // (something not deterministic, or measuring a hidden page), don't save them: it's rendered again next time
    const k = keysOf([s, e]);
    const drawn = Array.from({length: e - s + 1}, (_, i) => keyOf(got.get(s + i)));
    const same = !k.includes(null) && drawn.join() === k.join();
    if (debug && !same) {
      const bad = k.map((x, i) => (x !== drawn[i] ? s + i : null)).filter((x) => x !== null);
      fs.writeFileSync(path.join(dir, `debug_${s}.json`), JSON.stringify({bad, pass: bad.slice(0, 3).map((f) => prints.get(f)), drawn: bad.slice(0, 3).map((f) => got.get(f))}));
      log(`  fingerprints differed at frames ${bad.slice(0, 20).join(' ')}${bad.length > 20 ? ' ...' : ''} (${path.join(dir, `debug_${s}.json`)})`);
    }
    const file = same ? fileFor([s, e], k) : `${name([s, e])}.x${crypto.randomBytes(4).toString('hex')}.ts`;
    fs.renameSync(part, path.join(dir, file));
    index.chunks[name([s, e])] = {file, keys: same ? k : []};
    saveIndex(); // after every chunk: if the render stops, the finished chunks are kept
    done++;
    perChunk.push({range: name([s, e]), worker: w, secs: secs(tc), same});
    const left = Math.round(((Date.now() - t) / done) * (todo.length - done) / 1000 / 60 * 10) / 10;
    log(`  frames ${s}-${e}: ${secs(tc)} s (browser ${w + 1}) - ${done}/${todo.length}` + (done < todo.length ? `, about ${left} min left` : '') +
      (same || !useCache ? '' : ' - its fingerprints changed while drawing, so it will be rendered again next time'));
  }
};
await Promise.all(browsers.map((br, w) => work(br, w)));
timing.render = secs(t);
await Promise.all(browsers.map((br) => br.close({silent: true})));
if (failed) {
  console.error(failed);
  process.exit(1);
}

// 4. join (no re-encoding) and add the sound
t = Date.now();
const files = ranges.map((r) => path.join(dir, index.chunks[name(r)].file));
// framesPerChunk <= 4 makes Remotion encode our one sound file normally instead of stitching AAC pieces
await combineChunks({outputLocation: out, videoFiles: files, audioFiles: [audio], codec: 'h264', fps: composition.fps, framesPerChunk: 1,
  compositionDurationInFrames: total, frameRange: [a, last], preferLossless: false, logLevel: 'error'});
fs.rmSync(audio, {force: true});
timing.join = secs(t);

// keep this render's chunks and the ones they replaced (for undoing an edit); drop older ones
// (a --no-cache render drops them all)
if (useCache) {
  const now = new Set(Object.values(index.chunks).map((c) => c.file));
  const before = [...oldFiles].filter((f) => !now.has(f) && !f.includes('.x'));
  const keep = new Set([...now, ...(before.length ? before : index.previous ?? [])]);
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.ts') && !keep.has(f)) fs.rmSync(path.join(dir, f), {force: true});
  index.previous = [...keep].filter((f) => !now.has(f));
  index.global = global;
  saveIndex();
} else fs.rmSync(dir, {recursive: true, force: true});
timing.total = secs(t0);
log(`done in ${timing.total} s (bundle ${timing.bundle}, pass ${timing.pass}, render ${timing.render}, join ${timing.join}) -> ${out}`);
console.log('VK_RESULT ' + JSON.stringify({out, frames: last - a + 1, chunks: ranges.length, reused, rendered: todo.length, timing, perChunk}));
