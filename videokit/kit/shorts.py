"""Vertical Shorts (1080x1920) cut from a project's recorded narration.

Each Short is a spec: a header (the hook, *gold* words), the lines it uses as (line, first word or None,
pause after), the pause before the first word and after the last, named cues (line, phrase), the music
mood (+ the cue a timpani roll lands on), and its sounds:
    sfx = [(cue or seconds, offset, sound, gain, pan), ...]   sound: a kit.sound name or a function
build() writes public/shorts/<id>.wav and src/shorts/shorts.json; the Remotion side (src/shorts/) draws them.
Times are seconds of each Short; the voice plays at the project's pace (video.json speed).
"""
import json
from pathlib import Path

import numpy as np

from . import config, sound
from .words import norm


def find(words, phrase):
    want = [norm(p) for p in phrase.split()]
    have = [norm(w['w']) for w in words]
    for k in range(len(have) - len(want) + 1):
        if have[k:k + len(want)] == want:
            return k
    raise KeyError(phrase)


def layout(proj, spec, items, words, speed):
    t = spec.get('lead', 0.8)
    lines, clips = [], []
    for li, first, pause in spec['parts']:
        ws = words[li]['words']
        k, cut = 0, 0.0
        if first:
            k = find(ws, first)
            cut = max(ws[k - 1]['b'] + 0.02 if k else 0.0, ws[k]['a'] - 0.1)
        audio = sound.load(Path(proj) / 'public' / items[li]['file'], tempo=speed, start=cut)
        if cut:  # no click where it was cut
            j = int(0.015 * sound.SR)
            audio[:j] *= np.linspace(0, 1, j)[:, None]
        dur = len(audio) / sound.SR
        at = lambda s: round(t + (s - cut) / speed, 3)
        lines.append({'line': li, 'start': round(t, 3), 'end': round(t + dur, 3), 'words': [{'w': w['w'], 'a': at(w['a']), 'b': at(w['b'])} for w in ws[k:]]})
        clips.append((t, audio))
        t += dur + pause
    return lines, clips, round(t + spec.get('tail', 2.0), 3)


def build(proj, specs):
    proj = Path(proj)
    speed = config.settings(proj).get('speed', 1.0)
    items = json.loads((proj / 'narration.json').read_text(encoding='utf-8'))
    words = json.loads((proj / 'narration_words.json').read_text(encoding='utf-8'))
    (proj / 'public' / 'shorts').mkdir(parents=True, exist_ok=True)
    data = {}
    for sid, spec in specs.items():
        lines, clips, dur = layout(proj, spec, items, words, speed)
        by_line = {ln['line']: ln for ln in lines}
        c = {name: round(by_line[li]['words'][find(by_line[li]['words'], phrase)]['a'], 3) for name, (li, phrase) in spec.get('cues', {}).items()}
        n = int(dur * sound.SR)
        voice = np.zeros((n, 2))
        talk = np.zeros(n)
        for (t, audio), ln in zip(clips, lines):
            sound.place(voice, t, audio)
            talk[int(max(0, ln['start'] - 0.25) * sound.SR): int((ln['end'] + 0.35) * sound.SR)] = 1
        accents = [c[spec['accent']]] if spec.get('accent') else []
        music = sound.score(n, dur, spec.get('mood', 'wonder'), keys=[(0, 0.55), (dur, 0.75)], accents=accents, fade_in=0.8, fade_out=1.8)
        fx = np.zeros((n, 2))
        for when, offset, snd, gain, *pan in spec.get('sfx', []):
            t = (c[when] if isinstance(when, str) else when) + offset
            sig = snd() if callable(snd) else getattr(sound, snd)()
            sound.place(fx, t, sig, gain, pan[0] if pan else 0.0)
        if spec.get('custom'):  # anything more involved: spec['custom'](cues, put)
            spec['custom'](c, lambda t, sig, gain=1.0, pan=0.0: sound.place(fx, t, sig, gain, pan))
        sound.master(proj / 'public' / 'shorts' / f'{sid}.wav', voice, music, fx, talk, duck=0.45, fade_out=0.5)
        data[sid] = {'header': spec['header'], 'duration': dur, 'lines': lines, 'cues': c}
        print(f'{sid:12s} {dur:5.1f} s, {sum(len(ln["words"]) for ln in lines)} words')
    (proj / 'src' / 'shorts').mkdir(parents=True, exist_ok=True)
    (proj / 'src' / 'shorts' / 'shorts.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    return data
