"""Rendering: a composition to out/<comp>.mp4, and the finished video copied to the project folder under
its title (the previous one kept as out/<name>-vN.mp4). 1080p, H.264; no preview copies.

How (scripts/render.mjs): the video is cut into 4-second chunks, which three browsers render at the same
time on the GPU (kit.gpu) - each browser has its own GPU process, which beats more tabs in one - and the
chunks are joined without re-encoding. First, a quick pass through the frames (with the page hidden) records
the sound and a fingerprint of what each frame shows; chunks whose frames haven't changed since the last
render are reused from out/chunks/<comp>/, so after a fix only the changed part is rendered again, and
undoing an edit brings back the chunks it replaced. fresh=True renders everything - needed only after a
change a fingerprint can't see (pixels drawn into a <canvas>; see src/fx/fingerprint.ts).

Speed (the demo, 790 rich frames): 150 s with Remotion's own renderer at 2 tabs and PNG frames -> 83 s
(3 browsers, JPEG-100 frames); a render with nothing changed takes ~10 s.

Quality: frames are captured as JPEG at quality 100 - visually lossless (48-50 dB from PNG, less than the
H.264 encode itself changes; Remotion's default quality 80 smears smooth gradients into bands) - then
encoded with x264's slow preset at CRF 16, colours tagged BT.709. hq=True also supersamples: renders at 2x
(3840x2160) and scales down to 1920x1080 (smoothest edges and gradients; about 3-4x the render time).

On the graphics card (kit.gpu.encoder(): NVIDIA's NVENC): x264-slow in three browsers at once was the
heaviest CPU load of a render, so instead the chunks are only lightly packed (x264 ultrafast at a
near-lossless CRF 10: cheap) and the joined video is encoded once with NVENC (preset p7, high quality,
decoded on the card too). The CPU then only runs the pages and grabs the frames.

Two other cuts of the same video:
- the animatic (vk.py animatic): half size, no motion blur (src/fx/mode.ts), JPEG-80, nothing cached -
  the whole video with its real sound in a few minutes, for checking the pacing before the polish;
- the TikTok export (vk.py final --platform tiktok, TIKTOK below): TikTok re-encodes every upload hard,
  and fine noise is what it smears first, so this cut leaves out the grain and thins the dust
  (src/fx/mode.ts), is encoded at a higher quality than the YouTube file (TikTok's encoder is the one that
  throws detail away; it should start from as much as possible) and is sharpened a little, on brightness
  only, which comes through the re-encode as crisper edges. Its chunks are kept apart from the YouTube
  render's (out/chunks/<comp>@tiktok).
"""
import os
import re
import shutil
import subprocess
from pathlib import Path

from . import config, gpu, qa

WORKERS, TABS = 3, 1  # browsers at once, tabs in each (demo: 1x2 122 s, 2x1 96 s, 3x1 83 s, 4x1 80 s)
CHUNK = 120  # frames per chunk (4 s at 30 fps): each chunk costs ~1.2 s to start, and is what a fix re-renders
FINAL = '--format=jpeg --quality=100 --preset=slow'
ROUGH = '--format=jpeg --quality=80 --preset=medium --no-cache'  # a quick look at a stretch; leaves saved chunks alone
TIMEOUT = 300000  # ms per frame: heavy frames (rich light x motion-blur samples) take far longer than Remotion's 30 s
MEZZ_CRF = 10  # the chunks' light packing when NVENC does the real encode (x264 ultrafast; near-lossless, ~6 MB/s of video)
CQ_OFFSET = 7  # NVENC's -cq for a given x264 CRF: cq 23 for CRF 16 (calibrated on a 12 s test render, see nvenc())
# The TikTok export: CRF 12 (NVENC cq 19: near-lossless; a 33 s Short came out at 12.4 Mbit/s against the
# YouTube file's 6.6), capped at 20 Mbit/s; unsharp 0.4 on brightness only (5x5) - a touch, not the halos a
# strong sharpen gives.
TIKTOK = {'crf': 12, 'vf': 'unsharp=5:5:0.4:5:5:0.0', 'maxrate': '20M'}


def render(proj, comp='Main', out=None, crf=16, frames=None, quality=True, scale=1, use_gpu=True, fresh=False,
           platform=None, draft=False, vf=None, maxrate=None):
    """frames: 'a-b' to render only those frames (a quick test of how a stretch looks and how long it takes).
    quality=False: rough (JPEG 80, a faster encode, no chunk cache). Renders on the GPU when there is one
    (kit.gpu) and on the CPU if that fails; reuses unchanged chunks unless fresh.
    platform='tiktok' / draft=True: those cuts (src/fx/mode.ts); vf, maxrate: a filter and a bitrate cap
    for the encode."""
    proj = Path(proj)
    out = Path(out or proj / 'out' / (f'{comp}.mp4' if not frames else f'{comp}_{frames}.mp4'))
    out.parent.mkdir(parents=True, exist_ok=True)
    driver = proj / 'scripts' / 'render.mjs'
    if not driver.exists():  # a project made before it existed
        driver.parent.mkdir(exist_ok=True)
        shutil.copy2(config.TEMPLATE / 'scripts' / 'render.mjs', driver)
        print("copied scripts/render.mjs from the template (to reuse unchanged chunks, also copy src/fx/fingerprint.ts "
              "and import it in src/index.ts)")
    if (platform or draft) and not (proj / 'src' / 'fx' / 'mode.ts').exists():
        print('note: this project has no src/fx/mode.ts (copy it, light.tsx, space.tsx and transitions.tsx from the '
              'template) - the cut will look like the normal render')
    gl = gpu.mode(proj) if use_gpu else None
    enc = gpu.encoder() if use_gpu else None
    opts = FINAL if quality else ROUGH
    chunks_to, chunk_crf = out, crf
    post = enc or vf or maxrate
    if post:  # light packing in the browsers, the real encode afterwards (on the card when there is one)
        opts = re.sub(r'--preset=\w+', '--preset=ultrafast', opts)
        chunks_to, chunk_crf = out.with_name(out.stem + '.mezz.mp4'), MEZZ_CRF if quality else crf
    cmd = (f'node scripts/render.mjs --comp={comp} --out="{chunks_to}" --crf={chunk_crf} --chunk={CHUNK} --timeout={TIMEOUT} '
           + opts + (f' --scale={scale}' if scale != 1 else '') + (f' --frames={frames}' if frames else '')
           + (f' --platform={platform}' if platform else '') + (' --draft' if draft else '') + (' --fresh' if fresh else ''))
    if gl:
        try:
            _run(f'{cmd} --gl={gl} --workers={WORKERS} --tabs={TABS}', proj)
            cmd = None
        except subprocess.CalledProcessError:
            # the chunks finished on the GPU are saved, so this only renders the rest
            print('the GPU render failed - rendering the rest on the CPU')
            cmd = cmd.replace(' --fresh', '')
    if cmd:
        _run(f'{cmd} --workers=1 --tabs={max(2, (os.cpu_count() or 8) - 3)}', proj)
    if post:
        encode(chunks_to, out, crf, fast=not quality, vf=vf, maxrate=maxrate, on_card=bool(enc))
        chunks_to.unlink(missing_ok=True)
    return out


def encode(src, dest, crf, fast=False, vf=None, maxrate=None, on_card=True):
    """The real encode of a lightly packed render: NVENC when there is one (at the same quality as x264's
    CRF, cq = crf + CQ_OFFSET), else x264 slow (medium when fast). vf: a filter to apply first (a downscale,
    a sharpen); maxrate: a bitrate cap like '20M'."""
    if on_card and gpu.encoder():
        return nvenc(src, dest, crf + CQ_OFFSET, fast=fast, vf=vf, maxrate=maxrate)
    subprocess.run([config.FFMPEG, '-v', 'error', '-y', '-i', str(src)] + (['-vf', vf] if vf else []) + [
        '-c:v', 'libx264', '-preset', 'medium' if fast else 'slow', '-crf', str(crf)] + _cap(maxrate) + [
        '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'copy', '-movflags', '+faststart', str(dest)], check=True)
    return dest


def nvenc(src, dest, cq, fast=False, vf=None, maxrate=None):
    """Encode `src` on the graphics card (NVENC H.264, decoded there too), sound copied as it is. cq plays
    the part of x264's CRF (lower = better); fast=True for quick looks (preset p4 instead of p7). Calibrated
    on 12 s of a Short against a near-lossless render: x264-slow CRF 16 49.8 dB / 8.0 MB, NVENC cq 23
    50.0 dB / 9.6 MB (cq 21 50.5 dB / 13.6 MB, cq 25 49.4 dB / 6.9 MB). x264-slow cost 104 CPU-seconds for
    those 360 frames; ultrafast 11; this pass 4. vf: a filter to apply first (e.g. a downscale)."""
    cmd = [config.FFMPEG, '-v', 'error', '-y'] + ([] if vf else ['-hwaccel', 'cuda']) + ['-i', str(src)]
    cmd += (['-vf', vf] if vf else []) + [
        '-c:v', 'h264_nvenc', '-preset', 'p4' if fast else 'p7', '-tune', 'hq', '-rc', 'vbr', '-cq', str(cq), '-b:v', '0'] + _cap(maxrate) + [
        '-spatial-aq', '1', '-temporal-aq', '1', '-rc-lookahead', '32', '-bf', '3', '-b_ref_mode', 'middle', '-profile:v', 'high',
        '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
        '-c:a', 'copy', '-movflags', '+faststart', str(dest)]
    subprocess.run(cmd, check=True)
    return dest


def _cap(maxrate):
    """ffmpeg's bitrate cap: '20M' -> -maxrate 20M -bufsize 40M."""
    if not maxrate:
        return []
    m = re.fullmatch(r'([\d.]+)(\D*)', maxrate)
    return ['-maxrate', maxrate, '-bufsize', f'{float(m[1]) * 2:g}{m[2]}']


def _run(cmd, proj):
    print(cmd)
    subprocess.run(cmd, cwd=proj, shell=True, check=True)


def downscale(src, dest, width, height, crf=16, vf=None, maxrate=None):
    """A supersampled render down to its delivery size (lanczos, then `vf`), audio copied as it is."""
    return encode(src, dest, crf, vf=f'scale={width}:{height}:flags=lanczos' + (f',{vf}' if vf else ''), maxrate=maxrate)


def animatic(proj, comp='Main'):
    """The whole video at half size with its real sound, fast (no motion blur, JPEG-80, nothing cached) ->
    out/<comp>_animatic.mp4: for checking the pacing, the hook and the timing before the polish."""
    return render(proj, comp, out=Path(proj) / 'out' / f'{comp}_animatic.mp4', quality=False, scale=0.5, draft=True)


def final(proj, comp='Main', name=None, crf=16, hq=False, fresh=False, platform=None):
    """Render, back up the previous final, put the new one in the project folder, check it.
    platform='tiktok': the TikTok export (TIKTOK above), saved as "<name> (TikTok).mp4"."""
    proj = Path(proj)
    s = config.settings(proj)
    name = name or (s.get('title', 'video') if comp == 'Main' else comp)
    name = re.sub(r'[\\/:*?"<>|]', '', name).strip()
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:40] or 'video'
    tiktok = platform == 'tiktok'
    tag = f'@{platform}' if platform else ''
    if tiktok:
        name, slug, crf = f'{name} (TikTok)', f'{slug}-tiktok', TIKTOK['crf']
    vf, maxrate = (TIKTOK['vf'], TIKTOK['maxrate']) if tiktok else (None, None)
    if hq:
        big = render(proj, comp, out=proj / 'out' / f'{comp}{tag}_2x.mp4', crf=12, scale=2, fresh=fresh, platform=platform)
        w, h = config.SIZES['short' if comp.startswith('Short-') or s.get('format') == 'short' else 'long']
        out = downscale(big, proj / 'out' / f'{comp}{tag}.mp4', w, h, crf, vf=vf, maxrate=maxrate)
        big.unlink(missing_ok=True)
    else:
        out = render(proj, comp, out=proj / 'out' / f'{comp}{tag}.mp4', crf=crf, fresh=fresh, platform=platform, vf=vf, maxrate=maxrate)
    dest = proj / f'{name}.mp4'
    if dest.exists():
        k = 1
        while (proj / 'out' / f'{slug}-v{k}.mp4').exists():
            k += 1
        shutil.move(dest, proj / 'out' / f'{slug}-v{k}.mp4')
        print(f'kept the previous one as out/{slug}-v{k}.mp4')
    shutil.copy2(out, dest)
    qa.report(dest)
    if tiktok:
        print('TikTok: upload this file as it is (the computer upload takes it whole; in the phone app turn on '
              'high-quality uploads if it offers it), and mark the AI-generated content when the voice is AI.')
    return dest
