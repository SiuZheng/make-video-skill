// Render single frames as PNGs for checking the look (vk.py stills / vk.py qa call this).
// Usage: node scripts/stills.mjs [--comp=Main] [--gl=angle] 30 120 455 ...   -> out/stills/<comp>_<frame>.png
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';

const args = process.argv.slice(2);
const id = args.find((a) => a.startsWith('--comp='))?.slice(7) ?? 'Main';
const gl = args.find((a) => a.startsWith('--gl='))?.slice(5) ?? null; // 'angle' = draw on the GPU
const frames = args.filter((a) => !a.startsWith('--')).map(Number);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {chromiumOptions: {gl}});
const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
for (const frame of frames) {
  const f = Math.min(frame, composition.durationInFrames - 1);
  const output = path.resolve(`out/stills/${id}_${String(frame).padStart(5, '0')}.png`);
  await renderStill({composition, serveUrl, frame: f, output, puppeteerInstance: browser, imageFormat: 'png', timeoutInMilliseconds: 300000});
  console.log('rendered', frame);
}
await browser.close({silent: true});
