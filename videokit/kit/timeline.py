"""The timeline: when every line, section and named moment ("cue") happens.

Times are on the slow "story clock" the narration was recorded at. The film plays it `speed` times
faster: Remotion multiplies its clock by speed, and kit.sound lays the audio out on film time, so a scene
is always written in story seconds and its cues never drift from the words.

  lines, sections, duration = layout(items, ...)   narration lines laid out with pauses
  lines, sections, duration = beats([...])         or, with no narration, sections of set lengths
  cue = Cues(lines, words); cue.at(4, 'looked up')  the moment a phrase is spoken (word-accurate)
  write(proj, ...)                                  -> src/timeline.json for the animation
"""
import json
from pathlib import Path

from . import config


def real(t, speed):
    """Story-clock seconds -> seconds in the finished film."""
    return t / speed


def layout(items, first=1.4, line_gap=0.55, section_gap=2.2, tail=6.0, after=None):
    """Narration lines one after another: line_gap between lines of a section, section_gap where a new
    section starts (room for the camera to move on), plus `after` = {line index: extra seconds}."""
    after = after or {}
    t = first
    lines = []
    for i, it in enumerate(items):
        start, end = round(t, 3), round(t + it['duration'], 3)
        lines.append({'i': i, 'section': it['section'], 'start': start, 'end': end, 'text': it['text'], 'file': it['file']})
        nxt = items[i + 1]['section'] if i + 1 < len(items) else None
        t = end + (section_gap if nxt is not None and nxt != it['section'] else line_gap) + after.get(i, 0.0)
    duration = round(lines[-1]['end'] + tail, 3)
    titles = {it['section']: it.get('title', '') for it in items}
    return lines, _sections(lines, titles, duration), duration


def beats(spec, first=0.0):
    """No narration: [(title, seconds), ...] -> sections of those lengths (and no lines)."""
    t, sections = first, []
    for n, (title, secs) in enumerate(spec, 1):
        sections.append({'n': n, 'title': title, 'first': round(t, 3), 'last': round(t + secs, 3), 'start': round(t, 3), 'end': round(t + secs, 3)})
        t += secs
    return [], sections, round(t, 3)


def _sections(lines, titles, duration):
    out = []
    for n in sorted({ln['section'] for ln in lines}):
        own = [ln for ln in lines if ln['section'] == n]
        out.append({'n': n, 'title': titles.get(n, ''), 'first': own[0]['start'], 'last': own[-1]['end']})
    # a section runs from halfway through the pause before its first line to halfway into the next pause
    for k, s in enumerate(out):
        s['start'] = 0.0 if k == 0 else round((out[k - 1]['last'] + s['first']) / 2, 3)
    for k, s in enumerate(out):
        s['end'] = duration if k == len(out) - 1 else out[k + 1]['start']
    return out


class Cues:
    """Named moments. at(i, phrase): when line i says `phrase` (from the word timings when there are any,
    else by its position in the text); at(i): when line i starts; end(i): when it ends."""

    def __init__(self, lines, words=None):
        self.lines = lines
        self.words = {w['i']: w['words'] for w in (words or [])}

    def at(self, i, phrase=None, after=0.0):
        ln = self.lines[i]
        if phrase is None:
            return round(ln['start'] + after, 3)
        ws = self.words.get(i)
        if ws:
            from .words import norm
            want = [norm(p) for p in phrase.split()]
            have = [norm(w['w']) for w in ws]
            for k in range(len(have) - len(want) + 1):
                if have[k:k + len(want)] == want:
                    return round(ln['start'] + ws[k]['a'] + after, 3)
        k = ln['text'].find(phrase)
        assert k >= 0, f'line {i} has no "{phrase}"'
        return round(ln['start'] + (ln['end'] - ln['start']) * k / len(ln['text']) + after, 3)

    def end(self, i, after=0.0):
        return round(self.lines[i]['end'] + after, 3)


def write(proj, *, lines, sections, cues, duration, moves=None, words=None, extra=None):
    """src/timeline.json: everything the animation needs, on the story clock."""
    proj = Path(proj)
    s = config.settings(proj)
    fmt = s.get('format', 'long')
    width, height = config.SIZES['short' if fmt == 'short' else 'long']
    by_line = {w['i']: w['words'] for w in (words or [])}
    tl = {
        'title': s.get('title', ''),
        'format': fmt,
        'fps': s.get('fps', 30),
        'width': width,
        'height': height,
        'speed': s.get('speed', 1.0),
        'duration': duration,
        'lines': [{**ln, 'words': [{'w': w['w'], 'a': round(ln['start'] + w['a'], 3), 'b': round(ln['start'] + w['b'], 3)} for w in by_line.get(ln['i'], [])]} for ln in lines],
        'sections': sections,
        'cues': dict(cues),
        'moves': {str(k): v for k, v in (moves or {}).items()},
        **(extra or {}),
    }
    (proj / 'src' / 'timeline.json').write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding='utf-8')
    return tl
