"""Checking the work: frames at every cue and mid-transition as contact sheets, automatic checks of the text
and of the rendered file, and a spec check of a finished file (size, frame rate, codec, loudness, true peak).

The sheets are for looking at: open each one and go through the pro-look checklist (transitions mid-way,
lighting, text legibility and safe zones, the character in the scene, nothing overlapping).

The automatic checks (auto()) catch what code can, so reviews are spent on taste:
- text, measured on the page itself every 2nd frame (src/fx/probe.ts via scripts/probe.mjs): under YouTube's
  or TikTok's buttons and titles, too small to read on a phone, overlapping other text, running off the frame;
- the rendered file: stretches where the picture barely changes, gaps in the voice, flat strips along the
  frame's edge (a camera move leaving the edge uncovered), a Short's loop seam, loudness and true peak.
"""
import json
import re
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import config, sound

# Where the platforms' own UI covers a 1080x1920 Short (YouTube's and TikTok's are close enough to share).
SHORTS_ZONES = [
    ('the top bar (search, camera)', 0, 0, 1080, 140),
    ("the buttons' column (like, comment, share)", 940, 960, 1080, 1920),
    ('the title and channel name at the bottom', 0, 1540, 1080, 1920),
]
LONG_MARGIN = 0.05  # a long video keeps its text inside the middle 90% of the frame
MIN_PX = {'short': 40, 'long': 28}  # labels are made 44+ / 30+ px; a little room for a scale-in
SEEN = 0.6  # opacity from which text counts as on screen
HOLD = {'zone': 0.25, 'off': 0.25, 'overlap': 0.25, 'small': 0.5}  # seconds a text problem must last to count
STILL = 2.5  # seconds of a picture that barely changes before it's worth a look
STILL_DIFF = 3.0  # mean change of the picture over 1 s (0-255, in blocks 1/54 of the width) below which it
#                   counts as barely changing. Calibrated on a Short whose ending a reviewer called "barely
#                   moves": it dipped to 1.8-2.0, and the fixed cut never stayed under 3 for a second
CALM_BLOCK = 1.5  # a block (1/54 of the width) counts as moving when it changed by more than this over 1 s
CALM_SHARE = 0.25  # under this share of the frame moving, averaged over CALM_WIN s, the shot sits still
CALM_WIN = 2.0  # behind its character. Calibrated on a Short whose first cut was called too plain ("only a few
#                 things move"): it sat at 8-25% through four shots; the reworked cut (parallax, camera drift,
#                 ambient motion everywhere) never went under 30%
VOICE_GAP = 0.7  # film seconds without a word
EDGE = 18  # brightness step (0-255) from the outermost pixels to a little way in, along a flat strip
SEAM = 3.0  # mean difference (0-255) between a looping Short's last frame and its first


def stills(proj, frames, comp='Main'):
    """Render single frames (film frame numbers) -> out/stills/<comp>_<frame>.png."""
    from . import gpu

    proj = Path(proj)
    frames = sorted({int(f) for f in frames})
    gl = gpu.mode(proj)
    subprocess.run(f'node scripts/stills.mjs --comp={comp} ' + (f'--gl={gl} ' if gl else '') + ' '.join(map(str, frames)), cwd=proj, shell=True, check=True)
    return [proj / 'out' / 'stills' / f'{comp}_{f:05d}.png' for f in frames]


def sheet(paths, out, cols=None, labels=None, width=None):
    """Tile images into one contact sheet (labels written top-left)."""
    ims = [Image.open(p).convert('RGB') for p in paths]
    w0, h0 = ims[0].size
    portrait = h0 > w0
    cols = cols or (7 if portrait else 4)
    tw = width or (270 if portrait else 480)
    th = round(tw * h0 / w0)
    rows = (len(ims) + cols - 1) // cols
    canvas = Image.new('RGB', (tw * cols, th * rows), (18, 18, 22))
    for k, im in enumerate(ims):
        im = im.resize((tw, th))
        if labels:
            ImageDraw.Draw(im).text((6, 4), labels[k], fill=(255, 226, 120))
        canvas.paste(im, ((k % cols) * tw, (k // cols) * th))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)
    return out


def moments(proj, comp='Main'):
    """[(film seconds, label)] worth looking at: every cue (a beat after it lands) and every transition."""
    proj = Path(proj)
    if comp.startswith('Short-'):
        d = json.loads((proj / 'src' / 'shorts' / 'shorts.json').read_text(encoding='utf-8'))[comp[6:]]
        out = [(0.0, 'first frame')] + [(t + 0.35, name) for name, t in d['cues'].items()] + [(d['duration'] - 0.1, 'last frame')]
        return sorted(out)
    tl = json.loads((proj / 'src' / 'timeline.json').read_text(encoding='utf-8'))
    sp = tl['speed']
    out = [(0.0, 'first frame')]
    out += [(t / sp + 0.35, name) for name, t in tl['cues'].items()]
    out += [(s['start'] / sp, f"into {s['n']}: {tl['moves'].get(str(s['n']), 'cut')}") for s in tl['sections'] if s['n'] > 1]
    out.append((tl['duration'] / sp - 0.1, 'last frame'))
    return sorted(out)


def check(proj, comp='Main', every=None, sheets=True, video=None):
    """Render the moments (or a frame every `every` seconds) as contact sheets in out/qa/, then run the
    automatic checks (auto)."""
    proj = Path(proj)
    if sheets:
        fps = config.settings(proj).get('fps', 30)
        ms = moments(proj, comp) if not every else [(k * every, f'{k * every:.0f}s') for k in range(int(_length(proj, comp) / every) + 1)]
        frames = [round(t * fps) for t, _ in ms]
        paths = stills(proj, frames, comp)
        by_frame = {round(t * fps): f'{t:.1f}s {label}' for t, label in ms}
        per = 14 if comp.startswith('Short-') or config.settings(proj).get('format') == 'short' else 16
        for k in range(0, len(paths), per):
            chunk = paths[k:k + per]
            labels = [by_frame.get(int(p.stem.split('_')[-1]), p.stem) for p in chunk]
            print('sheet:', sheet(chunk, proj / 'out' / 'qa' / f'{comp}_{k // per + 1}.png', labels=labels))
    return auto(proj, comp, video)


def _length(proj, comp):
    if comp.startswith('Short-'):
        return json.loads((Path(proj) / 'src' / 'shorts' / 'shorts.json').read_text(encoding='utf-8'))[comp[6:]]['duration']
    tl = json.loads((Path(proj) / 'src' / 'timeline.json').read_text(encoding='utf-8'))
    return tl['duration'] / tl['speed']


# ------------------------------------------------------------------ automatic checks ----

def auto(proj, comp='Main', video=None, text=True):
    """The automatic checks -> out/qa/<comp>_checks.md (also printed); returns (problems, notes).
    video: the rendered file to check (default: the newest of out/<comp>.mp4, the animatic and the final).
    Problems are defects to fix; notes are worth a look (pacing is a judgment)."""
    proj = Path(proj)
    problems, notes, passed, about = [], [], [], []
    if text:
        data = probe(proj, comp)
        if data:
            got = text_problems(data)
            problems += got
            about.append(f"Text: measured on 1 frame in {data['every']} of {comp}, as it is in src/ now.")
            if not got:
                passed.append('all text is inside the safe zones, big enough, not overlapping and inside the frame')
    video = Path(video) if video else _latest_render(proj, comp)
    if video and video.exists():
        stale = _newest_source(proj) > video.stat().st_mtime
        about.append(f'Picture and sound: {_rel(video, proj)} (rendered {time.strftime("%Y-%m-%d %H:%M", time.localtime(video.stat().st_mtime))})'
                     + (' - older than the latest change in src/ or the mix: render again for current results.' if stale else '.'))
        p, n, ok = video_problems(video, proj, comp)
        problems += p
        notes += n
        passed += ok
    else:
        about.append('Picture and sound: no render yet (vk.py render or vk.py animatic, then run this again).')
    lines = [f'# Automatic checks: {comp}', '', f'Run {time.strftime("%Y-%m-%d %H:%M")}. ' + ' '.join(about), '']
    lines += ['## Problems (fix these)', ''] + ([f'- {_span(a, b)}: {what}' for _, _, a, b, what in sorted(problems, key=lambda p: p[2])] or ['- none']) + ['']
    lines += ['## Worth a look (pacing)', ''] + ([f'- {_span(a, b)}: {what}' for _, _, a, b, what in sorted(notes, key=lambda p: p[2])] or ['- none']) + ['']
    lines += ['## Passed', ''] + [f'- {p}' for p in passed] + ['']
    out = proj / 'out' / 'qa' / f'{comp}_checks.md'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('\n'.join(lines), encoding='utf-8')
    shown = [ln for ln in lines if ln.startswith('- ') or ln.startswith('## ')]
    print('\n'.join(shown[:60]) + (f'\n... ({len(shown) - 60} more lines)' if len(shown) > 60 else ''))
    print(f'-> {out}')
    return problems, notes


def probe(proj, comp='Main', every=2):
    """Measure the text on every `every`th frame (scripts/probe.mjs) -> the measurements, or None for a
    project made before the probe existed."""
    from . import gpu

    proj = Path(proj)
    if not (proj / 'scripts' / 'probe.mjs').exists() or not (proj / 'src' / 'fx' / 'probe.ts').exists():
        print('text checks skipped: this project predates them (copy scripts/probe.mjs, src/fx/probe.ts and '
              'src/fx/fingerprint.ts from videokit/template)')
        return None
    out = proj / 'out' / 'qa' / f'{comp}_probe.json'
    gl = gpu.mode(proj)
    subprocess.run(f'node scripts/probe.mjs --comp={comp} --every={every} --out="{out}"' + (f' --gl={gl}' if gl else ''),
                   cwd=proj, shell=True, check=True)
    return json.loads(out.read_text(encoding='utf-8'))


def text_problems(data):
    """[(kind, key, from_s, to_s, what)] from the probe's measurements, each lasting at least HOLD[kind]."""
    W, H, fps, every = data['width'], data['height'], data['fps'], data['every']
    kind = 'short' if H > W else 'long'
    hits = {}

    def hit(k, key, f, v):
        hits.setdefault((k, key), []).append((f, v))

    for f, fr in sorted((int(k), v) for k, v in data['frames'].items()):
        items = [x for x in fr['x'] if x[6] >= SEEN and x[5] >= 4]
        inks = [_ink(*x[:5]) for x in items]
        for (text, *_, px, _op), (l, t, r, b) in zip(items, inks):
            if kind == 'short':
                for zone, zl, zt, zr, zb in SHORTS_ZONES:
                    if min(r, zr) - max(l, zl) > 8 and min(b, zb) - max(t, zt) > 8:
                        hit('zone', (text, zone), f, (l, t, r, b))
            else:
                mx, my = W * LONG_MARGIN, H * LONG_MARGIN
                if l < mx - 4 or t < my - 4 or r > W - mx + 4 or b > H - my + 4:
                    hit('zone', (text, 'outside the middle 90% of the frame'), f, (l, t, r, b))
            if l < -8 or t < -8 or r > W + 8 or b > H + 8:
                hit('off', (text,), f, (l, t, r, b))
            if px < MIN_PX[kind]:
                hit('small', (text,), f, px)
        # overlaps: two different texts whose letters cover each other (copies of the same text - motion-blur
        # samples, colour splits - don't count)
        core = [(x[0], *ink) for x, ink in zip(items, inks)]
        for i in range(len(core)):
            for j in range(i + 1, len(core)):
                a, c = core[i], core[j]
                if a[0] == c[0]:
                    continue
                ix, iy = min(a[3], c[3]) - max(a[1], c[1]), min(a[4], c[4]) - max(a[2], c[2])
                least = min((a[3] - a[1]) * (a[4] - a[2]), (c[3] - c[1]) * (c[4] - c[2]))
                if ix > 0 and iy > 0 and least > 0 and ix * iy / least >= 0.25:
                    hit('overlap', tuple(sorted((a[0], c[0]))), f, ix * iy / least)
    out = []
    for (k, key), fs in hits.items():
        fs.sort()
        run = [fs[0]]
        for item in fs[1:] + [None]:
            if item is not None and item[0] - run[-1][0] <= 2 * every + 1:
                run.append(item)
                continue
            a, b = run[0][0] / fps, (run[-1][0] + every) / fps
            if b - a >= HOLD[k]:
                out.append((k, key, a, b, _say(k, key, [v for _, v in run], kind, W, H)))
            if item is not None:
                run = [item]
    return out


def _ink(text, l, t, w, h):
    """Where the letters are inside a piece of text's line box, which also holds the room above and below
    them (Inter: ascender 0.97 em, descender 0.24, letters from ~0.76 em above the baseline): from the top of
    the tallest letters to the baseline, or to the descenders' feet when the text has any."""
    return l + 0.01 * w, t + 0.17 * h, l + 0.99 * w, t + (0.97 if re.search(r'[gjpqy,;()\[\]{}]', text) else 0.81) * h


def _say(k, key, vals, kind, W, H):
    q = lambda s: '"' + (s if len(s) <= 40 else s[:38] + '…') + '"'  # noqa: E731
    if k == 'small':
        return f'{q(key[0])} is {min(vals):.0f} px on screen (make it {44 if kind == "short" else 30}+)'
    if k == 'overlap':
        return f'{q(key[0])} overlaps {q(key[1])}'
    l, t, r, b = (min(v[0] for v in vals), min(v[1] for v in vals), max(v[2] for v in vals), max(v[3] for v in vals))
    where = f'x {l:.0f}-{r:.0f}, y {t:.0f}-{b:.0f}'
    if k == 'off':
        return f'{q(key[0])} runs off the frame ({where})'
    return f'{q(key[0])} is under {key[1]} ({where})' if kind == 'short' else f'{q(key[0])} is {key[1]} ({where})'


def video_problems(video, proj=None, comp='Main'):
    """(problems, notes, passed) for a rendered file: still stretches, gaps in the voice (Main, from the
    timeline), flat strips along the edges, a Short's loop seam (picture and sound), loudness."""
    info = json.loads(subprocess.run([config.FFPROBE, '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration',
                                      '-of', 'json', str(video)], capture_output=True, text=True, check=True).stdout)
    W, H = info['streams'][0]['width'], info['streams'][0]['height']
    dur = float(info['format']['duration'])
    short = H > W
    problems, notes, passed = [], [], []
    # the picture, 10 times a second, in grey
    rate = 10
    bs = max(1, W // 54)  # blocks for "how much changed": 54 across, whatever the size
    small, edges = [], []
    p = subprocess.Popen([config.FFMPEG, '-v', 'error', '-i', str(video), '-vf', f'fps={rate},format=gray', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
    size = W * H
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        fr = np.frombuffer(buf, np.uint8).reshape(H, W).astype(np.float32)
        small.append(fr[:H // bs * bs, :W // bs * bs].reshape(H // bs, bs, W // bs, bs).mean((1, 3)))
        edges.append(_flat_edges(fr, max(1, round(W / 540))))
    p.wait()
    times = np.arange(len(small)) / rate
    # still stretches: little change from one second to the next
    change = np.array([np.abs(small[i] - small[max(0, i - rate)]).mean() for i in range(len(small))])
    still = change < STILL_DIFF
    still[:rate] = False  # (the first second has nothing to compare with)
    words = _words(proj, comp) if proj else []
    for a, b in _runs(still, times, 1 / rate):
        a = max(0.0, a - 1)  # (each sample compares with the picture a second earlier)
        if b - a >= STILL:
            talking = any(wa < b and wb > a for wa, wb in words)
            notes.append(('still', None, a, b, 'the picture barely changes' + ('' if not words else ' (the voice is talking over it)' if talking else ' and nobody is talking')))
    if not any(n[0] == 'still' for n in notes):
        passed.append(f'no still stretch of {STILL:g} s or more')
    # calm shots: only a small part of the frame moves (the character, a label) while the rest sits still
    share = np.array([(np.abs(small[i] - small[max(0, i - rate)]) > CALM_BLOCK).mean() for i in range(len(small))])
    win = int(CALM_WIN * rate)
    roll = np.array([share[max(rate, i - win + 1):i + 1].mean() if i >= rate else 1.0 for i in range(len(share))])
    calm = roll < CALM_SHARE
    spans = []
    for a, b in _runs(calm, times, 1 / rate):
        a = max(0.0, a - CALM_WIN)  # (each sample sums up the seconds before it)
        if b - a >= CALM_WIN + 0.3:
            if spans and a <= spans[-1][1]:
                spans[-1][1] = b
            else:
                spans.append([a, b])
    for a, b in spans:
        low = roll[(times >= a) & (times <= b)].min()
        notes.append(('calm', None, a, b, f'only {low * 100:.0f}% of the frame moves: the background sits still (add camera drift, parallax layers or ambient motion)'))
    if not any(n[0] == 'calm' for n in notes):
        passed.append(f'the frame stays alive: at least {CALM_SHARE * 100:.0f}% of it moving over any {CALM_WIN:g} s')
    # gaps in the voice
    if words:
        gaps = [(b0, a1) for (_, b0), (a1, _) in zip(words, words[1:]) if a1 - b0 >= VOICE_GAP]
        for a, b in gaps:
            notes.append(('gap', None, a, b, f'no voice for {b - a:.1f} s'))
        if words[0][0] > 0.6:
            notes.append(('gap', None, 0, words[0][0], f'the voice starts {words[0][0]:.1f} s in (the hook should be heard at once)'))
        if not gaps:
            passed.append(f'no gap in the voice of {VOICE_GAP:g} s or more')
    # flat strips along the edges, in two or more samples in a row
    for side in ('top', 'bottom', 'left', 'right'):
        flags = np.array([side in e for e in edges])
        for a, b in _runs(flags, times, 1 / rate):
            if b - a >= 0.2 - 1e-6:
                problems.append(('edge', side, a, b, f'a flat strip along the {side} edge (a camera zoom under ~1.04 or a move leaving the edge uncovered?)'))
    if not any(pr[0] == 'edge' for pr in problems):
        passed.append('no uncovered strip along the frame edges')
    # a Short loops: the last frame should lead into the first, the sound too
    if short:
        seam = float(np.abs(_frame(video, W, H, 'first') - _frame(video, W, H, 'last')).mean())
        if seam > SEAM:
            problems.append(('seam', None, dur - 0.1, dur, f'the loop jumps: the last frame differs from the first by {seam:.1f}/255'))
        else:
            passed.append(f'loop seam: picture {seam:.1f}/255')
        lvl = _seam_levels(video)
        if lvl is not None:
            jump = abs(lvl[0] - lvl[1])
            if jump > 6 and max(lvl) > -45:
                problems.append(('seam', None, dur - 0.1, dur, f'the sound jumps {jump:.0f} dB at the loop ({lvl[0]:.0f} -> {lvl[1]:.0f} dBFS)'))
            else:
                passed.append(f'loop seam: sound {jump:.1f} dB')
    # loudness
    loud, tp = sound.measure(video)
    if abs(loud - config.LOUDNESS) > 1.0 or tp > config.TRUE_PEAK + 0.2:
        problems.append(('loud', None, 0, dur, f'{loud:.1f} LUFS, true peak {tp:.1f} dBTP (want {config.LOUDNESS:g} ±1 LUFS, peak ≤ {config.TRUE_PEAK:g})'))
    else:
        passed.append(f'loudness {loud:.1f} LUFS, true peak {tp:.1f} dBTP')
    return problems, notes, passed


def _flat_edges(fr, k):
    """Which sides of a frame have a flat strip: the outermost k*2 pixels all one level, and a clear step
    from them to a little way in (k*6 to k*12 px), over at least two neighbouring eighths of the side."""
    out = set()
    for side, outer, inner in (('top', fr[:2 * k], fr[6 * k:12 * k]), ('bottom', fr[-2 * k:], fr[-12 * k:-6 * k]),
                               ('left', fr[:, :2 * k].T, fr[:, 6 * k:12 * k].T), ('right', fr[:, -2 * k:].T, fr[:, -12 * k:-6 * k].T)):
        o, i = outer.mean(0), inner.mean(0)
        seg = len(o) // 8
        bad = [abs(o[s * seg:(s + 1) * seg].mean() - i[s * seg:(s + 1) * seg].mean()) > EDGE and o[s * seg:(s + 1) * seg].std() < 3 for s in range(8)]
        if any(bad[s] and bad[s + 1] for s in range(7)):
            out.add(side)
    return out


def _runs(mask, times, step):
    """[(from, to)] of the stretches where mask is True."""
    out, start = [], None
    for k, on in enumerate(list(mask) + [False]):
        if on and start is None:
            start = k
        elif not on and start is not None:
            out.append((times[start], times[k - 1] + step))
            start = None
    return out


def _words(proj, comp):
    """[(from, to)] film seconds of every spoken word (the main video only: Shorts have their own timing)."""
    f = Path(proj) / 'src' / 'timeline.json'
    if comp != 'Main' or not f.exists():
        return []
    tl = json.loads(f.read_text(encoding='utf-8'))
    return sorted((w['a'] / tl['speed'], w['b'] / tl['speed']) for ln in tl['lines'] for w in ln['words'])


def _frame(video, W, H, which):
    """The first or last frame, in grey."""
    pick = ['-sseof', '-0.5', '-i', str(video)] if which == 'last' else ['-i', str(video), '-frames:v', '1']
    raw = subprocess.run([config.FFMPEG, '-v', 'error', *pick, '-vf', 'format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    n = len(raw) // (W * H)  # (the last of the frames in the final half second)
    return np.frombuffer(raw[(n - 1) * W * H:n * W * H], np.uint8).reshape(H, W).astype(np.float32)


def _seam_levels(video, ms=25):
    """The sound's level (dBFS) in the last and the first `ms` milliseconds, or None without sound."""
    raw = subprocess.run([config.FFMPEG, '-v', 'error', '-i', str(video), '-vn', '-ac', '1', '-ar', str(config.SR), '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32)
    n = config.SR * ms // 1000
    if len(x) < 2 * n:
        return None
    db = lambda s: 20 * np.log10(np.sqrt(np.mean(s.astype(np.float64) ** 2)) + 1e-9)  # noqa: E731
    return db(x[-n:]), db(x[:n])


def _latest_render(proj, comp):
    cands = [proj / 'out' / f'{comp}.mp4', proj / 'out' / f'{comp}_animatic.mp4']
    if comp == 'Main':
        cands.append(proj / (re.sub(r'[\\/:*?"<>|]', '', config.settings(proj).get('title', 'video')).strip() + '.mp4'))
    have = [c for c in cands if c.exists()]
    return max(have, key=lambda c: c.stat().st_mtime) if have else None


def _newest_source(proj):
    files = [f for f in (proj / 'src').rglob('*') if f.is_file()] + [proj / 'public' / 'mix.wav']
    return max((f.stat().st_mtime for f in files if f.exists()), default=0)


def _rel(p, proj):
    try:
        return str(Path(p).relative_to(proj)).replace('\\', '/')
    except ValueError:
        return str(p)


def _span(a, b):
    return f'{a:.1f}-{b:.1f} s'


def report(path, kind=None):
    """Check a finished video against the specs and print a ✓/✗ list. kind: 'long' | 'short' (from the shape if None)."""
    out = subprocess.run([config.FFPROBE, '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate',
                          '-of', 'json', str(path)], capture_output=True, text=True, check=True).stdout
    info = json.loads(out)
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    a = next((s for s in info['streams'] if s['codec_type'] == 'audio'), None)
    w, h = v['width'], v['height']
    kind = kind or ('short' if h > w else 'long')
    num, den = map(int, v['r_frame_rate'].split('/'))
    fps = num / den
    dur = float(info['format']['duration'])
    loud, tp = sound.measure(path) if a else (float('nan'), float('nan'))
    checks = [
        (f'{w}x{h}', (w, h) == config.SIZES[kind]),
        (f'{fps:g} fps', fps in (24, 25, 30, 50, 60)),
        (f"video {v['codec_name']}", v['codec_name'] == 'h264'),
        (f"audio {a['codec_name'] if a else 'none'}", a is not None and a['codec_name'] == 'aac'),
        (f'{loud:.1f} LUFS', abs(loud - config.LOUDNESS) <= 1.0),
        (f'true peak {tp:.1f} dBTP', tp <= config.TRUE_PEAK + 0.2),
        (f'{dur:.1f} s' + (' (Shorts: up to 3 min)' if kind == 'short' else ''), dur <= 180 if kind == 'short' else dur > 0),
        (f"{int(info['format']['size']) / 1e6:.0f} MB", True),
    ]
    print(Path(path).name)
    for text, ok in checks:
        print(f"  {'✓' if ok else '✗'} {text}")
    return all(ok for _, ok in checks)
