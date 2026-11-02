"""The upload sheet: youtube.md with the title, description (with chapters), tags and the notes that go
with an upload. Chapters come from the sections, in film time; YouTube shows them when the first is 0:00,
there are at least three, and each is at least 10 seconds long. A Short (short=True) gets no chapters,
thumbnail or subtitle file (its captions are burned in). notes_on_facts are for viewers (in the
description); extra_notes are for whoever uploads it.
"""
import re
from pathlib import Path


def stamp(t):
    t = int(t)
    return f'{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}' if t >= 3600 else f'{t // 60}:{t % 60:02d}'


def chapters(sections, speed=1.0, names=None, lead=0.8):
    """[(film seconds, name)] from the sections (start a little before each so the cut is in view)."""
    names = names or {}
    out = []
    for s in sections:
        t = 0 if not out else max(0.0, s['start'] / speed - lead)
        if out and t - out[-1][0] < 10:  # too close to the last one for YouTube
            continue
        out.append((t, names.get(s['n'], s['title'])))
    return out


def youtube_md(path, *, title, description, chapter_list=(), notes_on_facts=(), sources=(), tags=(), ai_voice=True, ai_art=False, length=None, extra_notes=(), short=False):
    """ai_art: some of the pictures were made with Gemini (credited in the description)."""
    name = re.sub(r'[\\/:*?"<>|]', '', title).strip()  # the file's name, as kit.render.final saves it
    files = [f'- Video: `{name}.mp4`' + (f' ({length})' if length else '')]
    if short:
        files += ['- The captions are burned into the picture, so there is no subtitle file to upload.']
    else:
        files += ['- Thumbnail: `thumbnail.jpg` (1280×720)', '- Subtitles: `captions.srt` (Subtitles → English → Upload file → With timing)']
    parts = [f'# YouTube upload: {title}', '', 'Files:', *files, '', '## Title', '', title, '', '## Description', '', description.strip(), '']
    if chapter_list and not short:
        parts += [f'{stamp(t)} {name}' for t, name in chapter_list] + ['']
    if notes_on_facts:
        parts += ['A few notes on the numbers:'] + [f'• {n}' for n in notes_on_facts] + ['']
    if sources:
        parts += ['Sources: ' + ', '.join(sources) + '.', '']
    credit = ('Narration: AI voice (Google Gemini text-to-speech). ' if ai_voice else '') + ('Some of the artwork: AI-generated (Google Gemini). ' if ai_art else '')
    parts += [f'{credit}Animation, music and sound effects: original.', '', '## Tags', '', ', '.join(tags), '', '## Notes', '']
    parts += ['- Altered or synthetic content: tick **Yes** (the narrator is an AI voice).' if ai_voice else '- Altered or synthetic content: No.']
    parts += ['- Upload it like any video: vertical and under 3 minutes, it becomes a Short by itself.' if short else '- Chapters only show if the first is 0:00 and there are at least three.']
    parts += [f'- {n}' for n in extra_notes]
    Path(path).write_text('\n'.join(parts) + '\n', encoding='utf-8')
