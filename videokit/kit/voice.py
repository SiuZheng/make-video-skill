"""Narration: one clip per line of script.md, with Gemini text-to-speech (or the user's own recordings).

script.md: '## Title' starts a section, '> text' is a line of narration; anything else is notes.
video.json "voice": {"engine": "gemini" | "recorded" | "none", "model", "name", "style"}

  samples  the first lines in a few voices -> voice_samples/<voice>.mp3, for the user to choose
  record   every line -> public/voice/lineNN.mp3, narration.json (text, section, duration) and
           narration_preview.mp3 (everything with plain pauses, to hear the pacing)

Clips are cached by model + voice + style + text: editing one line re-records only that line, and a line
already recorded the same way in any other project is copied instead of paid for again.
"""
import hashlib
import json
import shutil
import subprocess
import tempfile
import time
import wave
from pathlib import Path

from . import config

# Gemini 2.5 Pro TTS takes a "Say ...:" lead-in as direction without reading it out. (3.8 Flash TTS reads
# any style text aloud and has no separate place for it: don't use it for directed narration.)
MODEL = 'gemini-2.5-pro-preview-tts'
STYLE = 'Say slowly and calmly, like a warm science documentary narrator full of quiet wonder'
# prebuilt voices that suit narration: softer ones first, then documentary ones
SAMPLE_VOICES = ['Sulafat', 'Achernar', 'Vindemiatrix', 'Charon', 'Sadaltager']
GAP_LINE, GAP_SECTION = 0.6, 1.6  # pauses in the preview only (build.py sets the real timing)


def voice_settings(proj):
    v = config.settings(proj).get('voice', {})
    return {'engine': v.get('engine', 'gemini'), 'model': v.get('model', MODEL), 'name': v.get('name', 'Sulafat'), 'style': v.get('style', STYLE)}


def script_lines(proj):
    """(section number, section title, text) for every '> ' line of script.md."""
    out, sec, title = [], 0, ''
    for raw in (Path(proj) / 'script.md').read_text(encoding='utf-8').splitlines():
        if raw.startswith('## '):
            sec += 1
            title = raw[3:].split('(')[0].strip()
        elif raw.startswith('> ') and sec:
            out.append((sec, title, raw[2:].strip()))
    return out


def speak(text, voice, path, style=STYLE, model=MODEL, tidy=False):
    """One line -> an mp3 at `path`. tidy: trim the silence at both ends and even out the loudness."""
    from google import genai
    from google.genai import errors, types

    client = genai.Client(api_key=config.api_key())
    for attempt in range(5):
        try:
            resp = client.models.generate_content(
                model=model,
                contents=f'{style}: {text}' if style else text,
                config=types.GenerateContentConfig(
                    response_modalities=['AUDIO'],
                    speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice))),
                ),
            )
            break
        except errors.ClientError as ex:
            if ex.code == 402:
                raise SystemExit('Gemini says the prepaid credits are used up (402): ask the user to top up, then run again.')
            if ex.code != 429 or attempt == 4:
                raise
            time.sleep(15 * (attempt + 1))  # rate limited: wait and try again
    part = resp.candidates[0].content.parts[0].inline_data
    rate = 24000
    for bit in (part.mime_type or '').split(';'):
        if bit.strip().startswith('rate='):
            rate = int(bit.strip()[5:])
    wav = Path(path).with_suffix('.raw.wav')
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(part.data)
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04'
    af = ['-af', f'{trim},areverse,{trim},areverse,loudnorm=I=-18:TP=-2:LRA=9'] if tidy else []
    subprocess.run([config.FFMPEG, '-v', 'error', '-y', '-i', str(wav), *af, '-ar', '44100', '-b:a', '192k', str(path)], check=True)
    wav.unlink()
    return path


def duration(path):
    out = subprocess.run([config.FFPROBE, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True, check=True).stdout
    return round(float(out), 3)


def samples(proj, voices=None, text=None):
    proj = Path(proj)
    v = voice_settings(proj)
    text = text or ' '.join(t for _, _, t in script_lines(proj)[:4])
    out = proj / 'voice_samples'
    out.mkdir(exist_ok=True)
    for name in voices or SAMPLE_VOICES:
        speak(text, name, out / f'{name}.mp3', style=v['style'], model=v['model'])
        print('wrote', out / f'{name}.mp3')


def _library():
    """Every clip already recorded in any project: cache key -> mp3."""
    found = {}
    for cache in config.SIDE.glob('*/public/voice/cache.json'):
        try:
            for name, key in json.loads(cache.read_text(encoding='utf-8')).items():
                clip = cache.parent / name
                if clip.exists():
                    found.setdefault(key, clip)
        except (OSError, ValueError):
            pass
    return found


def record(proj):
    proj = Path(proj)
    v = voice_settings(proj)
    out = proj / 'public' / 'voice'
    out.mkdir(parents=True, exist_ok=True)
    cache_file = out / 'cache.json'
    cache = json.loads(cache_file.read_text(encoding='utf-8')) if cache_file.exists() else {}
    library = None
    # this project's own clips, set aside first: when lines are added, a line can move (line 4 becomes line 6)
    # and its old file gets overwritten by another line during this run - reuse it from the copy, not the file
    keep = Path(tempfile.mkdtemp(prefix='vk_voice_'))
    own = {}
    for name, key in cache.items():
        if (out / name).exists() and key not in own:
            own[key] = keep / name
            shutil.copy2(out / name, own[key])
    items = []
    for k, (sec, title, text) in enumerate(script_lines(proj)):
        name = f'line{k:02d}.mp3'
        path = out / name
        if v['engine'] == 'gemini':
            key = hashlib.sha1(f"{v['model']}|{v['name']}|{v['style']}|{text}".encode()).hexdigest()
            if cache.get(name) != key or not path.exists():
                library = library if library is not None else {k2: p for k2, p in _library().items() if out.resolve() not in p.resolve().parents}
                src = own.get(key) or library.get(key)
                if src is not None and src.resolve() != path.resolve():
                    shutil.copy2(src, path)
                    print(f"reused {name} from {'this project' if key in own else src.parent.parent.parent.name}: {text[:60]}")
                else:
                    speak(text, v['name'], path, style=v['style'], model=v['model'], tidy=True)
                    print(f'recorded {name}: {text[:60]}')
                cache[name] = key
                cache_file.write_text(json.dumps(cache, indent=1), encoding='utf-8')
        elif not path.exists():  # the user's own recordings, one file per line
            raise SystemExit(f'missing {path} for: {text}')
        items.append({'line': k, 'section': sec, 'title': title, 'text': text, 'file': f'voice/{name}', 'duration': duration(path)})
    shutil.rmtree(keep, ignore_errors=True)
    (proj / 'narration.json').write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding='utf-8')
    preview(proj, items)
    total = sum(it['duration'] for it in items)
    print(f'{len(items)} lines, {total:.1f} s of speech')
    return items


def preview(proj, items):
    """Everything in one file with plain pauses, to hear the pacing."""
    parts, filters = [], []
    for i, it in enumerate(items):
        nxt = items[i + 1]['section'] if i + 1 < len(items) else None
        parts += ['-i', str(Path(proj) / 'public' / it['file'])]
        filters.append(f"[{i}:a]apad=pad_dur={GAP_SECTION if nxt != it['section'] else GAP_LINE}[a{i}]")
    concat = ''.join(f'[a{i}]' for i in range(len(items)))
    subprocess.run([config.FFMPEG, '-v', 'error', '-y', *parts, '-filter_complex', ';'.join(filters) + f';{concat}concat=n={len(items)}:v=0:a=1[out]',
                    '-map', '[out]', '-b:a', '160k', str(Path(proj) / 'narration_preview.mp3')], check=True)
