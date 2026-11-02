"""Paths and settings shared by every videokit project.

A project is a folder with a video.json (made by `vk.py new`): its title, format, size, frame rate,
pace and voice. Everything else reads its settings from there.
"""
import json
import os
import shutil
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent  # .../videokit
SIDE = KIT.parent                             # the folder videokit sits in: every project lives here
TEMPLATE = KIT / 'template'
SOUNDFONT = KIT / 'assets' / 'GeneralUser-GS.sf2'  # GeneralUser GS (free), for the original scores
SPRITES = KIT / 'sprites'                          # character poses, one folder per character (sprites/README.md)
SPRITEGEN = SIDE / 'spritegen'                     # an optional sprite-generation tool, if you have one: only with the user's yes

FFMPEG = shutil.which('ffmpeg') or 'C:/ffmpeg/ffmpeg.exe'
FFPROBE = shutil.which('ffprobe') or 'C:/ffmpeg/ffprobe.exe'
SR = 44100

# what a finished video has to meet (kit.qa checks these)
SIZES = {'long': (1920, 1080), 'short': (1080, 1920)}
LOUDNESS = -14.0  # LUFS integrated: what YouTube plays everything at
TRUE_PEAK = -1.0  # dBTP ceiling


def api_key():
    """The Gemini key: GEMINI_API_KEY from the environment, or the user's registry environment on Windows.
    Never print it or put it in a file."""
    key = os.environ.get('GEMINI_API_KEY')
    if not key and sys.platform == 'win32':
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as k:
                key = winreg.QueryValueEx(k, 'GEMINI_API_KEY')[0]
        except OSError:
            pass
    if not key:
        sys.exit('GEMINI_API_KEY is not set')
    return key


def project(path=None):
    """The project folder: `path`, or the current folder (or a parent of it) holding a video.json."""
    p = Path(path or os.getcwd()).resolve()
    for d in [p, *p.parents]:
        if (d / 'video.json').exists():
            return d
    sys.exit(f'no video.json in {p} or above: make a project with  python vk.py new <name>')


def settings(proj):
    return json.loads((Path(proj) / 'video.json').read_text(encoding='utf-8'))


def save_settings(proj, data):
    (Path(proj) / 'video.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
