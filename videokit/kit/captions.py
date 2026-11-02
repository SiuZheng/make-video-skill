"""Subtitles (captions.srt) from the narration's word timings, on film time.

Each caption is at most two lines of ~42 characters (what YouTube shows comfortably). Sentences stay
together when they fit; longer ones split into even parts, at a comma when there is one, so no caption is
a lonely last word. Upload it under Subtitles -> Upload file -> With timing.
"""
import math
from pathlib import Path


def _ts(t):
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return f'{h:02d}:{m:02d}:{s:06.3f}'.replace('.', ',')


def _text(ws):
    return ' '.join(w['w'] for w in ws)


def _split(ws, limit):
    """One sentence -> even parts of at most `limit` characters, cutting at commas where possible."""
    if len(_text(ws)) <= limit or len(ws) < 2:
        return [ws]
    k = math.ceil(len(_text(ws)) / limit)
    target = len(_text(ws)) / k
    best, best_cost = None, None
    for j in range(1, len(ws)):  # the cut nearest the first part's ideal length, commas preferred
        cost = abs(len(_text(ws[:j])) - target) - (12 if ws[j - 1]['w'][-1] in ',;:' else 0)
        if best_cost is None or cost < best_cost:
            best, best_cost = j, cost
    return _split(ws[:best], limit) + _split(ws[best:], limit)


def chunks(words, limit=84):
    sentences, cur = [], []
    for w in words:
        cur.append(w)
        if w['w'][-1] in '.?!…':
            sentences.append(cur)
            cur = []
    if cur:
        sentences.append(cur)
    out = []
    for s in sentences:
        out += _split(s, limit)
    return out


def two_lines(text, width=42):
    if len(text) <= width:
        return text
    words = text.split()
    best = min(range(1, len(words)), key=lambda k: abs(len(' '.join(words[:k])) - len(' '.join(words[k:]))))
    return ' '.join(words[:best]) + '\n' + ' '.join(words[best:])


def write(path, lines, speed=1.0):
    """lines: the timeline's lines (story clock, with 'words' = [{w, a, b}] when timed)."""
    caps = []
    for ln in lines:
        words = ln.get('words') or []
        if not words:  # untimed: spread the text evenly over the line
            toks = ln['text'].split()
            dur = (ln['end'] - ln['start']) / max(1, len(toks))
            words = [{'w': w, 'a': ln['start'] + j * dur, 'b': ln['start'] + (j + 1) * dur} for j, w in enumerate(toks)]
        caps += [(c[0]['a'] / speed, c[-1]['b'] / speed + 0.25, _text(c)) for c in chunks(words)]
    out = []
    for k, (a, b, text) in enumerate(caps):
        if k + 1 < len(caps):
            b = min(b, caps[k + 1][0] - 0.05)  # never overlapping the next one
        out.append(f'{k + 1}\n{_ts(a)} --> {_ts(b)}\n{two_lines(text)}\n')
    Path(path).write_text('\n'.join(out), encoding='utf-8')
    return len(caps)
