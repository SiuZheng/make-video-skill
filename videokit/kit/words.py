"""When each word of the narration is spoken, and whether the voice said what the script says.

faster-whisper (large-v3-turbo, on the CPU: this machine's CUDA has no cuBLAS for CTranslate2) times every
word of every clip; the words are lined up with the script's own spelling ("384,400", "twenty-nine").
Writes narration_words.json: [{i, words: [{w, a, b}], heard, match, key}], times in seconds into each clip.
A clip is only transcribed again when it changes. `match` < 0.9 usually means a misread line: listen to it.
"""
import difflib
import json
import re
from pathlib import Path

from . import config


def norm(w):
    return re.sub(r'[^0-9a-z]', '', w.lower())


def align(tokens, heard):
    """Give each script token (a, b) times from the recognised words; fill gaps by interpolation."""
    times = [None] * len(tokens)
    sm = difflib.SequenceMatcher(a=[norm(t) for t in tokens], b=[norm(h['w']) for h in heard], autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k]['a'], heard[j1 + k]['b'])
        elif op == 'replace':  # e.g. "twenty-nine" heard as "twenty", "-nine": share the heard span by length
            a, b = heard[j1]['a'], heard[j2 - 1]['b']
            lens = [max(1, len(norm(t))) for t in tokens[i1:i2]]
            total, pos = sum(lens), 0
            for k, n in enumerate(lens):
                times[i1 + k] = (a + (b - a) * pos / total, a + (b - a) * (pos + n) / total)
                pos += n
    for k, tm in enumerate(times):  # tokens nobody heard: squeeze them in between their neighbours
        if tm is None:
            prev = next((times[j][1] for j in range(k - 1, -1, -1) if times[j]), 0.0)
            nxt = next((times[j][0] for j in range(k + 1, len(times)) if times[j]), prev + 0.3)
            times[k] = (prev, max(prev + 0.05, nxt))
    words = [{'w': t, 'a': round(a, 3), 'b': round(b, 3)} for t, (a, b) in zip(tokens, times)]
    return words, round(sm.ratio(), 3)


def run(proj):
    proj = Path(proj)
    items = json.loads((proj / 'narration.json').read_text(encoding='utf-8'))
    out_file = proj / 'narration_words.json'
    old = {w['key']: w for w in json.loads(out_file.read_text(encoding='utf-8'))} if out_file.exists() else {}
    model = None
    out = []
    for i, it in enumerate(items):
        clip = proj / 'public' / it['file']
        key = f"{it['text']}|{clip.stat().st_size}|{clip.stat().st_mtime_ns}"
        if key in old:
            out.append({**old[key], 'i': i})
            continue
        if model is None:
            from faster_whisper import WhisperModel
            model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
        segments, _ = model.transcribe(str(clip), language=config.settings(proj).get('language', 'en'), word_timestamps=True, initial_prompt=it['text'],
                                       condition_on_previous_text=False, beam_size=5, vad_filter=False)
        heard = [{'w': w.word.strip(), 'a': w.start, 'b': w.end} for s in segments for w in s.words if norm(w.word)]
        words, _ = align(it['text'].split(), heard)
        # did it say the script? compare the letters, not the word splits ("1.3" is heard as "1", ".3")
        match = round(difflib.SequenceMatcher(None, norm(it['text']), norm(''.join(h['w'] for h in heard)), autojunk=False).ratio(), 3)
        out.append({'i': i, 'words': words, 'heard': ' '.join(h['w'] for h in heard), 'match': match, 'key': key})
        print(f'{i:2d} {match:.2f} {out[-1]["heard"][:90]}')
    out_file.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    bad = [w for w in out if w['match'] < 0.9]
    for w in bad:
        print(f'CHECK line {w["i"]}: heard "{w["heard"]}" for "{items[w["i"]]["text"]}"')
    print(f'{len(out)} lines timed; {len(bad)} to listen to')
    return out
