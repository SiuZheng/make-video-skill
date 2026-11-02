"""Rendering on the graphics card.

Left alone, Remotion's Chrome draws every frame with SwiftShader - a software renderer on the CPU. With
--gl=angle it draws with the GPU instead (Direct3D 11 on Windows, e.g. an NVIDIA card), which
is much faster for the effects library's lighting, blending and blur. detect() renders the project's
GpuProbe frame in each mode, reads which device drew it (WebGL's renderer string), and remembers the first
mode that reaches real hardware in videokit/gpu.json. kit.render and kit.qa use it automatically; a render
that fails on the GPU is redone on the CPU.

The video encode can run on the card too: encoder() finds NVIDIA's NVENC (a tiny test encode, so the driver
has to work, not just ffmpeg list it) and kit.render then encodes the finished video with it instead of x264
on the CPU, which was the heaviest CPU load of a render.

  python vk.py gpu           which device renders and which encoder, and the mode used (--force: check again)
"""
import json
import re
import subprocess
from datetime import date
from pathlib import Path

from . import config

CACHE = config.KIT / 'gpu.json'
MODES = ['angle', 'vulkan']  # in order of preference (angle = Direct3D 11, the native path on Windows)


def probe(proj, gl):
    """The device Chrome draws with in this --gl mode (None = Remotion's default), or '' if it can't tell."""
    out_png = Path(proj) / 'out' / 'gpu_probe.png'
    out_png.parent.mkdir(parents=True, exist_ok=True)
    cmd = f'npx remotion still src/index.ts GpuProbe "{out_png}" --log=verbose' + (f' --gl={gl}' if gl else '')
    res = subprocess.run(cmd, cwd=proj, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.search(r'GPU_PROBE: ([^"\n]*)', res.stdout + res.stderr)
    return m.group(1).strip() if m else ''


def is_hardware(renderer):
    return bool(renderer) and not re.search(r'swiftshader|llvmpipe|software|microsoft basic|no webgl|error', renderer, re.I)


def detect(proj, force=False):
    """The --gl mode to render with ('angle', 'vulkan'), or None for the CPU."""
    if CACHE.exists() and not force:
        return json.loads(CACHE.read_text(encoding='utf-8')).get('gl')
    found = {'gl': None, 'renderer': probe(proj, None), 'checked': str(date.today())}
    for gl in MODES:
        r = probe(proj, gl)
        print(f'  --gl={gl}: {r or "(no answer)"}')
        if is_hardware(r):
            found = {'gl': gl, 'renderer': r, 'checked': str(date.today())}
            break
    CACHE.write_text(json.dumps(found, indent=1), encoding='utf-8')
    print(f"rendering with: {found['renderer'] or 'the CPU'}" + (f" (--gl={found['gl']})" if found['gl'] else ' (no GPU found)'))
    enc = encoder(force=True)
    print(f"encoding with: {enc + ' (on the GPU)' if enc else 'x264 (on the CPU: no working NVENC)'}")
    return found['gl']


def encoder(force=False):
    """The H.264 encoder on the graphics card ('h264_nvenc'), or None: then x264 encodes on the CPU."""
    data = json.loads(CACHE.read_text(encoding='utf-8')) if CACHE.exists() else {}
    if 'encoder' in data and not force:
        return data['encoder']
    test = [config.FFMPEG, '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x256:d=0.2', '-c:v', 'h264_nvenc', '-f', 'null', '-']
    try:
        ok = subprocess.run(test, capture_output=True, timeout=60).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        ok = False
    data['encoder'] = 'h264_nvenc' if ok else None
    CACHE.write_text(json.dumps(data, indent=1), encoding='utf-8')
    return data['encoder']


def mode(proj):
    """For renders and stills: the remembered mode (found the first time it's asked for)."""
    try:
        return detect(proj)
    except Exception as ex:  # a broken probe should never stop a render: use the CPU
        print('GPU check failed, rendering on the CPU:', ex)
        return None
