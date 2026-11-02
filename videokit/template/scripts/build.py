"""Build this video: the timeline, art, music, sound effects, the mix, captions and the upload sheet.

Run after the narration is recorded and timed (`vk.py voice record`, `vk.py words`), or with BEATS set for
a video with no narration. Everything particular to this video lives here, filled in from plan.md: the
pauses, the cues the animation hangs on, how the camera moves between sections, which sound goes where,
and the music's mood and shape.

Usage: python -X utf8 scripts/build.py      (or: python vk.py build)
"""
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT.parent / 'videokit'))
from kit import art, captions, config, publish, sound, timeline  # noqa: E402

S = config.settings(ROOT)
SPEED = S.get('speed', 1.0)  # the film plays the story clock this much faster (1.2 = brisk)

# ---------------------------------------------------------------- timing ----
# (story-clock seconds)

FIRST = 1.2          # before the first line: a moment for the opening shot
LINE_GAP = 0.5       # between lines of one section
SECTION_GAP = 1.8    # where a new section starts: room for a transition
TAIL = 4.0           # after the last line: the ending, the fade
AFTER = {}           # {line index: extra pause after it} for a beat to land
BEATS = None         # no narration: [('Section title', seconds), ...] instead

# How each section arrives: src/Video.tsx draws these, the sounds below match them.
MOVES = {}           # {section number: 'zoomThrough' | 'push' | 'whip' | 'flash' | 'leak' | ...}
TRANSITION_SFX = {   # (sound, gain, seconds before the cut)
    'zoom': ('whoosh', 0.35, 0.7), 'zoomThrough': ('whoosh', 0.4, 0.55), 'push': ('whoosh', 0.3, 0.45), 'whip': ('swish', 0.55, 0.3),
    'flash': ('shimmer', 1.0, 0.7), 'leak': ('shimmer', 0.8, 0.7), 'iris': ('whoosh', 0.3, 0.7), 'wipe': ('whoosh', 0.3, 0.5),
    'spin': ('swirl', 0.5, 0.8), 'blur': ('whoosh', 0.25, 0.5), 'warp': ('warp', 0.55, 1.1), 'slideUp': ('whoosh', 0.3, 0.45),
    'ink': ('swell', 0.5, 0.8), 'flip': ('flip', 0.55, 0.25), 'glitch': ('glitch', 0.5, 0.2), 'dip': ('', 0, 0), 'fade': ('', 0, 0), 'cut': ('', 0, 0),
}

# ------------------------------------------------------------------- art ----

CHARACTERS = {}      # {'mascot': ['pose_02', 'pose_07']} - the poses the animation uses (vk.py characters)
PROP_DIRS = []       # folders of prop PNGs (generated pictures only with the user's yes)


def cues(c, lines, sections):
    """Named moments the animation hangs on: c.at(line, 'phrase'), c.at(line) (its start), c.end(line)."""
    return {}


def effects(cue, sections, put):
    """Sounds for what happens on screen: put(story_t, sound.whoosh(), gain=1, pan=0), cue = the named
    moments. Give every visible event its sound: appearing (plip), landing (thump), a reveal (riser
    ending on it + impact), light (shimmer), counters (tick), movement (whoosh)."""


def music(cue, duration):
    """The score: a mood (wonder | tension | playful | epic), its intensity over time (story seconds,
    0..1: quiet = fewer instruments) and the moments a timpani roll lands on. None for no music.
    Or a composed score: {'parts': [{'notes': [(start, end, key, vel)], 'preset': GM program, 'gain', 'pan'}],
    'dynamics': [(t, dB)], 'room': reverb} with times in film seconds (the make-video skill's toolkit.md, "A composed score")."""
    return {'mood': S.get('music', 'wonder'), 'keys': [(0, 0.35)], 'accents': []}


def ambience(cue, duration):
    """Beds under scenes: [(kind, from, to, gain)], kind 'space' | 'wind' | 'sea' | 'night'."""
    return []

# ------------------------------------------------------------ upload sheet ----

YOUTUBE = {
    'description': '',
    'notes_on_facts': [],  # for viewers: a few notes on the numbers (in the description)
    'notes': [],           # for whoever uploads it (dates to watch, what to tick)
    'sources': [],
    'tags': [],
    'chapter_names': {},   # {section number: 'Chapter name'} (else the section titles)
    'ai_art': False,       # True when any picture was made with Gemini (credited in the description)
}


def main():
    if BEATS:
        items, words = [], []
        lines, sections, duration = timeline.beats(BEATS)
    else:
        items = json.loads((ROOT / 'narration.json').read_text(encoding='utf-8'))
        words_file = ROOT / 'narration_words.json'
        words = json.loads(words_file.read_text(encoding='utf-8')) if words_file.exists() else []
        lines, sections, duration = timeline.layout(items, FIRST, LINE_GAP, SECTION_GAP, TAIL, AFTER)
    c = timeline.Cues(lines, words)
    named = cues(c, lines, sections)
    art.sync(ROOT, CHARACTERS, PROP_DIRS)
    timeline.write(ROOT, lines=lines, sections=sections, cues=named, duration=duration, moves=MOVES, words=words)

    film = timeline.real(duration, SPEED)
    n = int(film * sound.SR)
    voice, talk = sound.voice_track(ROOT, lines, SPEED, n) if lines else (np.zeros((n, 2)), None)
    fx = np.zeros((n, 2))
    put = lambda t, sig, gain=1.0, pan=0.0: sound.place(fx, timeline.real(t, SPEED), sig, gain, pan)
    for s in sections:
        snd, gain, before = TRANSITION_SFX.get(MOVES.get(s['n'], 'cut'), ('', 0, 0))
        if snd:
            put(s['start'] - before * SPEED, getattr(sound, snd)(), gain)
    effects(named, sections, put)
    m = music(named, duration)
    if m and m.get('parts'):  # a composed score: notes per instrument (kit.sound.arrange)
        for t, ov, k1, k2 in sound.clashes(m['parts']):
            print(f'score clash at {t:.2f} s: keys {k1} and {k2} sound together for {ov:.2f} s')
        bed = sound.arrange(n, **m)
    elif m:
        keys = [(timeline.real(t, SPEED), v) for t, v in m['keys']] + [(film, m['keys'][-1][1])]
        bed = sound.score(n, film, m['mood'], keys=keys, accents=[timeline.real(t, SPEED) for t in m['accents']])
    else:
        bed = np.zeros((n, 2))
    for kind, a, b, gain in ambience(named, duration):  # beds go with the music, so they duck under the voice too
        sound.place(bed, timeline.real(a, SPEED), sound.ambience(kind, timeline.real(b - a, SPEED)), gain)
    sound.master(ROOT / 'public' / 'mix.wav', voice, bed, fx, talk)

    if lines:
        captions.write(ROOT / 'captions.srt', json.loads((ROOT / 'src' / 'timeline.json').read_text(encoding='utf-8'))['lines'], SPEED)
    names = YOUTUBE['chapter_names']
    publish.youtube_md(ROOT / 'youtube.md', title=S['title'], description=YOUTUBE['description'] or S['title'],
                       chapter_list=publish.chapters(sections, SPEED, names) if len(sections) >= 3 else (), notes_on_facts=YOUTUBE['notes_on_facts'],
                       sources=YOUTUBE['sources'], tags=YOUTUBE['tags'], ai_voice=S.get('voice', {}).get('engine') == 'gemini' and bool(lines), ai_art=YOUTUBE.get('ai_art', False),
                       length=f'{int(film // 60)} min {int(film % 60)} s', extra_notes=YOUTUBE.get('notes', ()), short=S.get('format') == 'short')
    print(f'timeline: {len(lines)} lines, {len(sections)} sections, {film:.1f} s at {SPEED}x, {len(named)} cues')


if __name__ == '__main__':
    main()
