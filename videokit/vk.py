"""videokit: the toolkit behind every video. Run from a project folder (or pass --project).

  python vk.py new <folder> --title "..." --format long|short|both   a new project from the template
  python vk.py characters                      the character sprites there are, and their poses
  python vk.py voice samples [--voices A,B]    the first lines in a few voices, to choose from
  python vk.py voice record                    every line of script.md -> public/voice (cached)
  python vk.py words                           word timings + a check that each line was read right
  python vk.py build                           scripts/build.py: timeline, music, effects, mix, captions
  python vk.py stills 1.5 12 30 [--comp C]     single frames at those film seconds
  python vk.py qa [--comp C] [--every 2] [--auto] [--video F]   contact sheets of every cue and transition
                                               (out/qa), then the automatic checks -> out/qa/<comp>_checks.md:
                                               text in the safe zones / big enough / not overlapping, and on the
                                               newest render (or F) still stretches, voice gaps, uncovered edges,
                                               the loop seam, loudness. --auto: only the checks
  python vk.py animatic [--comp C]             the whole video at half size with its sound, fast (no motion
                                               blur) -> out/<comp>_animatic.mp4, then the pacing checks
  python vk.py render [--comp C] [--frames a-b] [--rough] [--fresh]   -> out/<comp>.mp4 (a few frames first:
                                               speed and look). Renders only the 4 s chunks that changed since
                                               the last render; --fresh renders everything
  python vk.py final [--comp C] [--hq] [--fresh] [--platform tiktok]   render (JPEG-100 frames, CRF 16 quality;
                                               --hq: supersampled 2x), back up the old one, copy in under its
                                               title, check it. --platform tiktok: the TikTok cut (no grain,
                                               higher bitrate, a light sharpen) as "<title> (TikTok).mp4"
  python vk.py report <file.mp4>               check a video: size, fps, codecs, loudness, true peak
  python vk.py gpu [--force]                   which graphics device renders (the GPU when Chrome can use it)

Use `python -X utf8` so non-English text prints on this Windows console.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit import art, config, gpu, qa, render, voice, words  # noqa: E402


def new(folder, title, fmt):
    dest = Path(folder)
    if not dest.is_absolute():
        dest = config.SIDE / dest
    if dest.exists():
        sys.exit(f'{dest} already exists')
    shutil.copytree(config.TEMPLATE, dest, ignore=shutil.ignore_patterns('node_modules', 'out', '__pycache__'))
    s = config.settings(dest)
    s.update({'title': title or dest.name, 'format': fmt})
    config.save_settings(dest, s)
    # the placeholder timeline, so the first stills already have the title and the right shape
    tl_file = dest / 'src' / 'timeline.json'
    tl = json.loads(tl_file.read_text(encoding='utf-8'))
    w, h = config.SIZES['short' if fmt == 'short' else 'long']
    tl.update({'title': s['title'], 'format': fmt, 'width': w, 'height': h})
    tl_file.write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding='utf-8')
    pkg = json.loads((dest / 'package.json').read_text(encoding='utf-8'))
    pkg['name'] = ''.join(ch if ch.isalnum() else '-' for ch in dest.name.lower()).strip('-') or 'video'
    pkg['description'] = s['title']
    (dest / 'package.json').write_text(json.dumps(pkg, indent=2), encoding='utf-8')
    print('installing Remotion (from the npm cache)...')
    subprocess.run('npm install --prefer-offline --no-audit --no-fund --loglevel=error', cwd=dest, shell=True, check=True)
    # the headless Chrome Remotion renders with: copy it from a project that has it instead of downloading it
    for have in config.SIDE.glob('*/node_modules/.remotion/chrome-headless-shell'):
        if have.parent.parent.parent != dest:
            shutil.copytree(have, dest / 'node_modules' / '.remotion' / 'chrome-headless-shell', dirs_exist_ok=True)
            break
    print(f'made {dest}\nnext: the brief, then plan.md (the draft) for the user to approve')


def main():
    ap = argparse.ArgumentParser(description='videokit')
    ap.add_argument('cmd')
    ap.add_argument('args', nargs='*')
    ap.add_argument('--project')
    ap.add_argument('--title')
    ap.add_argument('--format', default='long', choices=['long', 'short', 'both'])
    ap.add_argument('--voices')
    ap.add_argument('--comp', default='Main')
    ap.add_argument('--every', type=float)
    ap.add_argument('--frames')
    ap.add_argument('--hq', action='store_true')
    ap.add_argument('--rough', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--fresh', action='store_true')
    ap.add_argument('--auto', action='store_true')
    ap.add_argument('--video')
    ap.add_argument('--platform', choices=['tiktok'])
    a = ap.parse_intermixed_args()
    if a.cmd == 'new':
        return new(a.args[0], a.title, a.format)
    if a.cmd == 'characters':
        for name, poses in art.characters_available().items():
            print(f'{name}: ' + ', '.join(f'{k} ({v[:40]})' for k, v in poses.items()))
        return
    if a.cmd == 'report':
        return qa.report(a.args[0])
    proj = config.project(a.project)
    if a.cmd == 'gpu':
        return gpu.detect(proj, force=a.force or not gpu.CACHE.exists())
    if a.cmd == 'voice':
        what = a.args[0] if a.args else 'record'
        return voice.samples(proj, a.voices.split(',') if a.voices else None) if what == 'samples' else voice.record(proj)
    if a.cmd == 'words':
        return words.run(proj)
    if a.cmd == 'build':
        return subprocess.run([sys.executable, '-X', 'utf8', 'scripts/build.py', *a.args], cwd=proj, check=True)
    if a.cmd == 'stills':  # frames at these film seconds, plus a contact sheet of them all
        fps = config.settings(proj).get('fps', 30)
        frames = [round(float(t) * fps) for t in a.args]
        paths = qa.stills(proj, frames, a.comp)
        if len(paths) > 1:
            print('sheet:', qa.sheet(paths, proj / 'out' / 'qa' / f'{a.comp}_stills.png', labels=[f'{int(p.stem.split("_")[-1]) / fps:.1f}s' for p in paths]))
        else:
            print(paths[0])
        return
    if a.cmd == 'qa':
        return qa.check(proj, a.comp, a.every, sheets=not a.auto, video=a.video)
    if a.cmd == 'animatic':
        out = render.animatic(proj, a.comp)
        qa.auto(proj, a.comp, video=out, text=False)
        print(f'animatic: {out}')
        return
    if a.cmd == 'render':
        return render.render(proj, a.comp, frames=a.frames, quality=not a.rough, fresh=a.fresh)
    if a.cmd == 'final':
        return render.final(proj, a.comp, hq=a.hq, fresh=a.fresh, platform=a.platform)
    sys.exit(f'unknown command {a.cmd}')


if __name__ == '__main__':
    main()
