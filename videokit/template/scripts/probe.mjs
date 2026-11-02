// Measure the text on the frames for vk.py qa's automatic checks (kit/qa.py): one pass through the frames
// like render.mjs's quick pass - the page laid out but no pictures taken - with every --every'th frame
// reporting its text (src/fx/probe.ts, via the artifact hook in src/fx/fingerprint.ts).
// Usage: node scripts/probe.mjs --comp=Main --out=out/qa/Main_probe.json [--every=2] [--gl=angle] [--frames=a-b]
import fs from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const comp = arg('comp', 'Main');
const out = path.resolve(arg('out', `out/qa/${comp}_probe.json`));
const every = Math.max(1, Number(arg('every', 2)));
const gl = arg('gl', null);

const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {chromiumOptions: gl ? {gl} : {}, logLevel: 'error'});
const inputProps = {vkProbe: every};
const composition = await selectComposition({serveUrl, id: comp, inputProps, puppeteerInstance: browser, logLevel: 'error'});
const [a, b] = arg('frames') ? arg('frames').split('-').map(Number) : [0, composition.durationInFrames - 1];
const frames = {};
fs.mkdirSync(path.dirname(out), {recursive: true});
const sound = out.replace(/\.json$/, '.wav'); // the pass has to write something; the sound is thrown away
await renderMedia({composition, serveUrl, inputProps, codec: 'wav', outputLocation: sound, overwrite: true,
  frameRange: [a, Math.min(b, composition.durationInFrames - 1)], concurrency: 4, puppeteerInstance: browser,
  timeoutInMilliseconds: 300000, logLevel: 'error',
  onArtifact: (art) => art.filename.startsWith('vkqa/') && (frames[art.frame] = JSON.parse(art.content))});
fs.rmSync(sound, {force: true});
await browser.close({silent: true});
fs.writeFileSync(out, JSON.stringify({comp, fps: composition.fps, width: composition.width, height: composition.height, every, frames}));
console.log(`measured the text on ${Object.keys(frames).length} frames in ${Math.round((Date.now() - t0) / 100) / 10} s -> ${out}`);
