"""Art for the animation: characters' poses and prop pictures, copied into public/art with their sizes
written to src/art/ for the code.

Characters live in sprite folders with a manifest.json (canvas width/height, the feet `baseline` and
`centerX`, and what each pose is) in videokit/sprites/<name>/ - see sprites/README.md. Make new ones with
an image model of your choice (e.g. Gemini Nano Banana), which costs money: only with the user's yes.
"""
import json
import shutil
from pathlib import Path

from PIL import Image

from . import config


def characters_available():
    """{name: {pose: description}} for every character sprite folder there is."""
    out = {}
    for m in config.SPRITES.glob('*/manifest.json'):
        data = json.loads(m.read_text(encoding='utf-8'))
        if data.get('poses') and 'width' in data:
            out[m.parent.name] = data['poses']
    return out


def sync(proj, characters=None, prop_dirs=()):
    """characters: {name: [poses]} (or a sprite folder path instead of a name) -> public/art/<name>/,
    src/art/characters.json. prop_dirs: folders of prop PNGs -> public/art/props/, src/art/props.json."""
    proj = Path(proj)
    art = proj / 'public' / 'art'
    meta = proj / 'src' / 'art'
    meta.mkdir(parents=True, exist_ok=True)
    chars = {}
    for name, poses in (characters or {}).items():
        src = Path(name) if Path(name).is_dir() else config.SPRITES / name
        key = src.name
        m = json.loads((src / 'manifest.json').read_text(encoding='utf-8'))
        (art / key).mkdir(parents=True, exist_ok=True)
        for p in poses:
            shutil.copy2(src / f'{p}.png', art / key / f'{p}.png')
        chars[key] = {'width': m['width'], 'height': m['height'], 'baseline': m['baseline'], 'centerX': m['centerX'], 'poses': list(poses)}
    (meta / 'characters.json').write_text(json.dumps(chars, indent=1), encoding='utf-8')
    props = {}
    for d in prop_dirs:
        d = Path(d)
        (art / 'props').mkdir(parents=True, exist_ok=True)
        for png in d.glob('*.png'):
            if png.name.startswith(('sheet_', 'preview')):
                continue
            shutil.copy2(png, art / 'props' / png.name)
            props[png.stem] = list(Image.open(png).size)
    (meta / 'props.json').write_text(json.dumps(props, indent=1), encoding='utf-8')
    return chars, props
