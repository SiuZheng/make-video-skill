"""Sound: effects drawn with numpy, original music through a SoundFont, and the final mix.

Everything here works in seconds of the finished film (convert story-clock cues with timeline.real).

  fx = np.zeros((n, 2)); place(fx, t, whoosh(), gain, pan)    an effect at time t, panned -1..1
  music = score(n, duration, 'wonder', keys=[(0, .3), (40, .8)], accents=[61.2])
  voice, talk = voice_track(proj, lines, speed, n)
  master(proj / 'public' / 'mix.wav', voice, music, fx, talk)   ducked, -14 LUFS, true peak <= -1 dBTP

Every effect is a short mono array; give each on-screen event its sound (see the skill's pro-look notes).
"""
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d, minimum_filter1d
from scipy.signal import butter, sosfilt, sosfilt_zi

from . import config

SR = config.SR
rng = np.random.default_rng(2026)


# ------------------------------------------------------------- building blocks ----

def sos(kind, f, order=2):
    return butter(order, f, kind, fs=SR, output='sos')


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def tone(f0, f1, length, decay, attack=0.002):
    n = int(length * SR)
    f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, attack, decay)


def noise(length, band, decay, attack=0.002):
    n = int(length * SR)
    return sosfilt(sos('bandpass', band), rng.standard_normal(n)) * env(n, attack, decay)


def layered(*parts):
    """Sum sounds of different lengths."""
    out = np.zeros(max(len(p) for p in parts))
    for p in parts:
        out[:len(p)] += p
    return out


def place(buf, t, sig, gain=1.0, pan=0.0):
    """Add `sig` (mono, or stereo (n, 2)) into the stereo buffer at t seconds, panned -1 (left) .. 1 (right)."""
    i = int(round(t * SR))
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= len(buf) or len(sig) == 0:
        return
    sig = sig[: len(buf) - i]
    left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    if sig.ndim == 1:
        buf[i:i + len(sig), 0] += sig * gain * left
        buf[i:i + len(sig), 1] += sig * gain * right
    else:
        buf[i:i + len(sig)] += sig * gain


# -------------------------------------------------------------------- effects ----
# (lengths in seconds; most peak in the middle, so place them a little before the moment they mark)

def whoosh(length=1.4):
    """Air moving past: a camera move, something flying by."""
    n = int(length * SR)
    p = np.arange(n) / n
    sweep = sosfilt(sos('bandpass', [250, 2500]), rng.standard_normal(n))
    return sweep * np.sin(np.pi * p) ** 2 * 0.6


def swish(length=0.55):
    """A whip pan: low to high, fast."""
    n = int(length * SR)
    p = np.arange(n) / n
    lo = sosfilt(sos('bandpass', [500, 2500]), rng.standard_normal(n))
    hi = sosfilt(sos('bandpass', [2500, 9000]), rng.standard_normal(n))
    return (lo * (1 - p) + hi * p) * np.sin(np.pi * p) ** 3 * 0.9


def riser(length=2.0):
    """Tension building into a reveal: noise and a tone climbing, cut off at the top. Place it so it ENDS
    on the reveal (t - length), and put an impact() there."""
    n = int(length * SR)
    p = np.arange(n) / n
    air = sosfilt(sos('bandpass', [400, 6000]), rng.standard_normal(n)) * p ** 2.2
    f = 180 * 2 ** (2.5 * p)
    sweep = np.sin(2 * np.pi * np.cumsum(f) / SR) * p ** 3 * 0.35
    out = air * 0.5 + sweep
    out[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return out


def impact(power=1.0):
    """A hit for a reveal or a landing: a deep thump, a crack of noise, a short tail."""
    thump = tone(75, 32, 1.2, 0.35, 0.002)
    crack = noise(0.25, [900, 7000], 0.05) * 0.5
    tail = noise(1.4, [120, 900], 0.45, 0.01) * 0.25
    return layered(thump, crack, tail) * power


def thump():
    """A soft low bump: a sticker landing, a character hopping down."""
    return tone(110, 55, 0.3, 0.08, 0.002) * 0.6


def boom(length=3.0):
    """A deep, slow swell for something enormous."""
    n = int(length * SR)
    t = np.arange(n) / SR
    rise = length * 0.4
    return np.sin(2 * np.pi * 42 * t) * np.minimum(1, t / rise) * np.exp(-np.maximum(0, t - rise) / (length * 0.27)) * 0.8


def shimmer(length=1.6):
    """A flash of light: a cluster of high tones, glittering."""
    n = int(length * SR)
    t = np.arange(n) / SR
    out = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(5, 9) * t)) for f in (2093, 2637, 3136, 3951, 4699))
    return out * np.sin(np.pi * t / length) ** 2 * 0.12


def sparkle(count=7, length=1.2):
    """Magic dust: quick high twinkles scattered over `length`."""
    out = np.zeros(int((length + 0.6) * SR))
    for k in range(count):
        f = rng.uniform(2400, 4200)
        tw = tone(f, f * 1.02, 0.5, 0.09, 0.003) * rng.uniform(0.12, 0.25)
        i = int(rng.uniform(0, length) * SR)
        out[i:i + len(tw)] += tw[: len(out) - i]
    return out


def plip():
    """A soft pop: something appearing."""
    return layered(tone(520, 1040, 0.12, 0.04) * 0.7, noise(0.04, [1500, 5000], 0.01) * 0.2)


def chime(root=1318.5):
    """A bell: a gentle 'look at this'. root in Hz (stay in the music's key: D major 1174.7 / 1318.5 / 1760)."""
    return sum(tone(f, f, 1.6, 0.6, 0.01) * a for f, a in ((root, 0.5), (root * 1.5, 0.3), (root * 2, 0.2)))


def tick():
    """A counter or a clock."""
    return noise(0.02, [2500, 7000], 0.004)


def beep():
    """A radio message."""
    return tone(1760, 1760, 0.18, 0.08, 0.005) * 0.5


def twinkle():
    """One star."""
    f = rng.uniform(2000, 3200)
    return tone(f, f * 1.01, 0.6, 0.18, 0.005) * 0.25


def swirl(length=1.6):
    """Spinning away."""
    n = int(length * SR)
    p = np.arange(n) / n
    base = sosfilt(sos('bandpass', [300, 3000]), rng.standard_normal(n))
    return base * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * p * length)) * np.sin(np.pi * p) ** 2 * 0.7


def warp(length=2.2):
    """Light speed: a rising rush that bursts at the peak."""
    n = int(length * SR)
    p = np.arange(n) / n
    bands = [sosfilt(sos('bandpass', b), rng.standard_normal(n)) for b in ([150, 600], [600, 2400], [2400, 9000])]
    w = [np.clip(1 - 2 * p, 0, 1), 1 - np.abs(2 * p - 1), np.clip(2 * p - 1, 0, 1)]
    rush = sum(b * k for b, k in zip(bands, w)) * np.sin(np.pi * p) ** 1.5
    th = tone(70, 40, 0.8, 0.25)
    out = rush * 0.8
    i = int(0.55 * n)
    out[i:i + len(th)] += th[: n - i] * 0.6
    return out


def glint():
    """A shine sweeping across something polished: a bright, quick 'ting'."""
    return layered(tone(3520, 3600, 0.5, 0.12, 0.003) * 0.3, tone(5274, 5300, 0.35, 0.07, 0.003) * 0.15, noise(0.08, [6000, 12000], 0.02) * 0.08)


def scribble(length=1.0, rate=11):
    """A pen drawing a line: scratchy noise in quick strokes."""
    n = int(length * SR)
    t = np.arange(n) / SR
    strokes = 0.35 + 0.65 * np.abs(np.sin(np.pi * rate * t + 0.6 * np.sin(2 * np.pi * 1.7 * t))) ** 0.6
    edge = np.minimum(1, t / 0.03) * np.minimum(1, (length - t) / 0.06)
    return sosfilt(sos('bandpass', [1800, 6500]), rng.standard_normal(n)) * strokes * edge * 0.35


def typing(count=12, cps=14):
    """Keys typing: soft clicks, a little irregular."""
    out = np.zeros(int((count / cps + 0.2) * SR))
    for k in range(count):
        click = layered(noise(0.025, [2000, 7000], 0.006) * 0.5, tone(1800, 1200, 0.02, 0.006) * 0.15) * rng.uniform(0.6, 1.0)
        i = int((k / cps + rng.uniform(-0.015, 0.015)) * SR)
        i = max(0, i)
        out[i:i + len(click)] += click[: len(out) - i]
    return out


def glitch(length=0.5):
    """A digital tear: chopped noise and buzzing square-wave stabs."""
    n = int(length * SR)
    t = np.arange(n) / SR
    gate = (np.sin(2 * np.pi * 23 * t) > 0.1).astype(float) * (rng.uniform(0, 1, n // 400 + 1).repeat(400)[:n] > 0.35)
    buzz = np.sign(np.sin(2 * np.pi * rng.choice([110, 220, 440]) * t)) * 0.25
    return (sosfilt(sos('bandpass', [400, 9000]), rng.standard_normal(n)) * 0.5 + buzz) * gate * np.minimum(1, (length - t) / 0.03) * 0.6


def flip():
    """A card turning over: a quick airy swipe and a soft snap."""
    return layered(swish(0.32) * 0.7, np.concatenate([np.zeros(int(0.26 * SR)), noise(0.05, [1200, 5000], 0.012) * 0.6]))


def swell(length=1.6):
    """A soft rising breath of sound under an organic reveal (ink, a slow dissolve)."""
    n = int(length * SR)
    p = np.arange(n) / n
    air = sosfilt(sos('bandpass', [150, 1600]), rng.standard_normal(n))
    return air * np.sin(np.pi * p) ** 2 * (0.5 + 0.5 * p) * 0.5


def step():
    """A soft footstep indoors: a light heel thud and a scuff (a little different each time)."""
    k = rng.uniform(0.85, 1.15)
    return layered(tone(95 * k, 60 * k, 0.12, 0.03) * 0.45, noise(0.07, [400, 2600], 0.018) * 0.22 * k)


def clap():
    """A clapperboard snapping shut: a sharp wooden clack."""
    return layered(noise(0.05, [1500, 9000], 0.007) * 0.9, tone(950, 700, 0.05, 0.01) * 0.3, noise(0.14, [250, 1000], 0.035) * 0.3)


def scratch(length=0.45):
    """A record scratch: everything stops (a comic freeze)."""
    n = int(length * SR)
    p = np.arange(n) / n
    f = np.interp(p, [0, 0.3, 0.5, 1], [450, 1700, 900, 220])
    whirl = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    grit = sosfilt(sos('bandpass', [700, 5000]), rng.standard_normal(n)) * 0.45
    shape = np.minimum(1, p / 0.04) * np.minimum(1, (1 - p) / 0.15) * (0.6 + 0.4 * np.sin(np.pi * p))
    return (whirl + grit * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 3 * p)))) * shape * 0.7


def gulp():
    """A happy swallow: two little glugs."""
    second = np.concatenate([np.zeros(int(0.2 * SR)), tone(240, 150, 0.15, 0.05) * 0.4])
    return layered(tone(310, 170, 0.17, 0.05) * 0.6, second, noise(0.05, [300, 1500], 0.02) * 0.12)


def ambience(kind, length):
    """A quiet bed under a scene: 'space' (a low hum), 'wind', 'sea' (slow waves), 'night' (crickets and air),
    'room' (indoors: room tone, birds outside).
    Returns stereo; mix it low (gain ~0.15-0.3)."""
    n = int(length * SR)
    t = np.arange(n) / SR
    two = lambda f: np.stack([f(), f()], axis=1)
    if kind == 'space':
        hum = np.sin(2 * np.pi * 55 * t) * 0.25 + np.sin(2 * np.pi * 82.4 * t) * 0.12
        air = lambda: sosfilt(sos('lowpass', 300), rng.standard_normal(n)) * 0.6
        return two(air) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * t))[:, None] + hum[:, None] * 0.5
    if kind == 'wind':
        gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t + 1) * np.sin(2 * np.pi * 0.047 * t)
        return two(lambda: sosfilt(sos('bandpass', [200, 1400]), rng.standard_normal(n))) * gust[:, None] * 0.5
    if kind == 'sea':
        swell = 0.35 + 0.65 * np.sin(np.pi * ((t / 6.5) % 1)) ** 4
        return two(lambda: sosfilt(sos('lowpass', 1100), rng.standard_normal(n))) * swell[:, None] * 0.6
    if kind == 'night':
        out = ambience('wind', length) * 0.4
        c = tone(4200, 4300, 0.03, 0.02)
        gap = np.zeros(int(0.03 * SR))
        chirp = np.concatenate([c, gap, c, gap, c]) * 0.06
        for _ in range(int(length * 2.5)):
            place(out, rng.uniform(0, length - 0.3), chirp, 1.0, rng.uniform(-0.8, 0.8))
        return out
    if kind == 'room':  # indoors on a sunny afternoon: a soft room tone, birds outside the window
        out = two(lambda: sosfilt(sos('lowpass', 260), rng.standard_normal(n))) * 0.35
        for _ in range(int(length / 1.4)):
            f = rng.uniform(2800, 4200)
            call = np.concatenate([tone(f, f * 1.25, 0.07, 0.03), np.zeros(int(0.04 * SR)), tone(f * 1.1, f * 0.9, 0.09, 0.035)]) * 0.05
            place(out, rng.uniform(0, max(0.1, length - 0.4)), call, 1.0, rng.uniform(-0.9, 0.9))
        return out
    raise ValueError(kind)


# ---------------------------------------------------------------------- music ----

def render(notes, preset, n, bank=0):
    """(start, end, key, velocity) notes, in seconds, on one SoundFont preset -> stereo float."""
    import tinysoundfont

    synth = tinysoundfont.Synth(samplerate=SR)
    sfid = synth.sfload(str(config.SOUNDFONT))
    synth.program_select(0, sfid, bank, preset)
    events = [(s, 1, k, int(np.clip(v, 1, 127))) for s, e, k, v in notes] + [(e, 0, k, 0) for s, e, k, v in notes]
    events.sort(key=lambda ev: (ev[0], ev[1]))
    out = np.zeros((n, 2), dtype=np.float32)
    pos = 0
    for t, on, key, vel in events:
        i = min(n, max(0, int(t * SR)))
        if i > pos:
            out[pos:i] = np.frombuffer(synth.generate(i - pos), dtype=np.float32).reshape(-1, 2)
            pos = i
        if on:
            synth.noteon(0, key, vel)
        else:
            synth.noteoff(0, key)
    if pos < n:
        out[pos:] = np.frombuffer(synth.generate(n - pos), dtype=np.float32).reshape(-1, 2)
    return out.astype(np.float64)


def envelope(n, keys):
    """Piecewise-linear gain over time from [(t, gain), ...]."""
    t = np.arange(n) / SR
    return np.interp(t, [k[0] for k in keys], [k[1] for k in keys])[:, None]


# Each mood: chords [(bass, voicing)], seconds per chord, a scale for sparkles, and its layers:
# (name, GM preset, how the part is played, level, the intensity it comes in at).
MOODS = {
    'wonder': {  # warm and quiet, D major: space, nature, big ideas
        'chords': [(50, [57, 61, 64, 66]), (47, [54, 57, 62, 64]), (43, [54, 59, 61, 62]), (45, [52, 57, 59, 62])],
        'chord_len': 6.4, 'scale': [69, 71, 74, 76, 78, 81, 83],
        'layers': [('pad', 89, 'hold', 1.0, 0.0), ('bass', 43, 'root', 0.7, 0.15), ('harp', 46, 'arp', 0.55, 0.3), ('strings', 49, 'hold', 0.7, 0.45),
                   ('celesta', 8, 'sparkle', 0.45, 0.2), ('choir', 52, 'high', 0.5, 0.75)],
    },
    'tension': {  # low and uneasy, D minor: danger, mystery, a countdown
        'chords': [(38, [50, 53, 57, 60]), (34, [46, 50, 53, 57]), (36, [48, 51, 55, 58]), (33, [45, 49, 52, 57])],
        'chord_len': 4.8, 'scale': [62, 65, 67, 69, 72],
        'layers': [('pad', 95, 'hold', 0.9, 0.0), ('cello', 42, 'ostinato', 0.8, 0.2), ('bass', 43, 'root', 0.8, 0.1), ('strings', 49, 'hold', 0.6, 0.5),
                   ('timpani', 47, 'pulse', 0.5, 0.7)],
    },
    'playful': {  # light and bouncy, C major: funny, cute, everyday
        'chords': [(48, [60, 64, 67, 72]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (43, [55, 59, 62, 67])],
        'chord_len': 3.2, 'scale': [72, 74, 76, 79, 81, 84],
        'layers': [('pizzicato', 45, 'pluck', 0.9, 0.0), ('bass', 32, 'root', 0.7, 0.1), ('marimba', 12, 'arp', 0.6, 0.3), ('flute', 73, 'melody', 0.5, 0.55),
                   ('glock', 9, 'sparkle', 0.4, 0.4)],
    },
    'epic': {  # big and rising, D minor to F: discovery, scale, a finale
        'chords': [(38, [50, 57, 62, 65]), (34, [46, 53, 58, 62]), (41, [53, 57, 60, 65]), (36, [48, 55, 60, 64])],
        'chord_len': 4.0, 'scale': [62, 65, 67, 69, 72, 74],
        'layers': [('strings', 49, 'hold', 1.0, 0.0), ('bass', 43, 'root', 0.8, 0.1), ('cello', 42, 'ostinato', 0.7, 0.35), ('brass', 61, 'high', 0.6, 0.6),
                   ('choir', 52, 'high', 0.5, 0.7), ('timpani', 47, 'pulse', 0.6, 0.8)],
    },
}


def reverb(x, seconds=2.6, wet=0.3, predelay=0.025, tone=6500):
    """A concert hall: x (n, 2) through a decaying stereo noise tail (-60 dB after `seconds`), mixed `wet`."""
    from scipy.signal import fftconvolve
    m = int(seconds * SR)
    t = np.arange(m) / SR
    r = np.random.default_rng(11)
    ir = r.standard_normal((m, 2)) * np.exp(-6.9 * t / seconds)[:, None]
    ir = sosfilt(sos('lowpass', tone), ir, axis=0)
    ir[: int(predelay * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True)) + 1e-9
    tail = np.stack([fftconvolve(x[:, ch], ir[:, ch])[: len(x)] for ch in range(2)], axis=1)
    return x * (1 - 0.5 * wet) + tail * wet


def active_level(a, win=0.05):
    """How loud a part is while it plays (a sparse part isn't quieter for having long rests)."""
    k = int(win * SR)
    m = np.abs(a).mean(axis=1)
    w = np.sqrt((m[: len(m) // k * k].reshape(-1, k) ** 2).mean(axis=1))
    act = w[w > w.max() * 0.05] if len(w) else w
    return float(np.percentile(act, 75)) if len(act) else 1e-9


def arrange(n, parts, room=0.3, level=-27.0, dynamics=None):
    """A composed score: parts [{'notes': [(start, end, key, velocity)], 'preset', 'bank', 'gain', 'pan' -1..1,
    'keys': [(t, gain)]}], all in film seconds -> stereo, each part at its gain, shaped by `dynamics`
    [(t, dB)] (velocity alone only moves a SoundFont a few dB: this is the piece's loud and soft), in a
    hall (room = reverb wet), the whole at `level` dBFS RMS (the master then ducks it under the voice)."""
    out = np.zeros((n, 2))
    for p in parts:
        if not p['notes']:
            continue
        a = render(p['notes'], p['preset'], n, p.get('bank', 0))
        a = a / (active_level(a) + 1e-9) * 0.1 * p.get('gain', 1.0)
        if p.get('keys'):
            a *= envelope(n, p['keys'])
        pan = p.get('pan', 0.0)
        a[:, 0] *= np.sqrt(1 - pan)
        a[:, 1] *= np.sqrt(1 + pan)
        out += a
    if dynamics:
        out *= envelope(n, [(t, 10 ** (d / 20)) for t, d in dynamics])
    out = reverb(out, wet=room)
    return out * (10 ** (level / 20) / (np.sqrt(np.mean(out ** 2)) + 1e-12))


def clashes(parts, min_overlap=0.15, min_velocity=40):
    """Notes in a composed score that rub: two sounding together (for over `min_overlap` s) a semitone or a
    minor 9th apart - usually an arpeggio note ringing into the next chord, or a maj7 under its own root.
    -> [(time, overlap, key, key)]"""
    ns = sorted((s, e, k, v) for p in parts if p.get('bank', 0) != 128 for s, e, k, v in p['notes'] if v > min_velocity)
    out = []
    for i, (s1, e1, k1, _) in enumerate(ns):
        for s2, e2, k2, _ in ns[i + 1:]:
            if s2 >= e1:
                break
            if min(e1, e2) - s2 > min_overlap and abs(k1 - k2) in (1, 13, 25):
                out.append((round(s2, 2), round(min(e1, e2) - s2, 2), k1, k2))
    return out


def score(n, duration, mood='wonder', keys=((0, 0.5),), accents=(), fade_in=1.0, fade_out=2.5, seed=7):
    """Original music for the whole film. keys: [(t, intensity 0..1)] - layers join as intensity passes
    their level (quiet = pad only, full = everything). accents: times for a timpani roll that lands on them."""
    m = MOODS[mood]
    r = np.random.default_rng(seed)
    cl = m['chord_len']
    parts = {name: [] for name, *_ in m['layers']}
    for k in range(int(duration / cl) + 2):
        t0 = k * cl
        root, voicing = m['chords'][k % len(m['chords'])]
        arp = sorted(set([root + 12] + voicing + [v + 12 for v in voicing]))
        for name, _, play, _, _ in m['layers']:
            p = parts[name]
            if play == 'hold':
                p += [(t0, t0 + cl + 0.5, note, 66) for note in voicing]
            elif play == 'high':
                p += [(t0, t0 + cl + 0.4, note + 12, 58) for note in voicing[1:]]
            elif play == 'root':
                p.append((t0, t0 + cl, root - 12, 72))
            elif play == 'arp':
                step = cl / 16
                p += [(t0 + j * step, t0 + j * step + step * 3, arp[(j if (j // 8) % 2 == 0 else 15 - j) % len(arp)], 60 + (10 if j % 4 == 0 else 0)) for j in range(16)]
            elif play == 'pluck':
                step = cl / 8
                p += [(t0 + j * step, t0 + j * step + step * 0.8, root + 12 if j % 2 == 0 else voicing[(j // 2) % len(voicing)], 76 if j % 4 == 0 else 62) for j in range(8)]
            elif play == 'ostinato':
                step = cl / 8
                p += [(t0 + j * step, t0 + j * step + step * 0.9, root + (0 if j % 2 == 0 else 7), 70 if j % 2 == 0 else 58) for j in range(8)]
            elif play == 'pulse':
                p += [(t0 + j * cl / 4, t0 + j * cl / 4 + 0.4, root, 60 + (20 if j == 0 else 0)) for j in range(4)]
            elif play == 'sparkle':
                for _ in range(3):
                    tt = t0 + r.uniform(0, cl - 0.8)
                    p.append((tt, tt + 1.4, int(r.choice(m['scale'])), int(r.uniform(52, 72))))
            elif play == 'melody':
                for j in range(4):
                    tt = t0 + j * cl / 4
                    p.append((tt, tt + cl / 4 * 0.9, int(r.choice(m['scale'])), int(r.uniform(58, 74))))
    music = np.zeros((n, 2))
    level = envelope(n, list(keys))[:, 0]
    fade = np.minimum(1, np.arange(n) / SR / max(fade_in, 1e-3)) * np.clip((duration - np.arange(n) / SR) / max(fade_out, 1e-3), 0, 1)
    for name, preset, _, gain, enters in m['layers']:
        audio = render(parts[name], preset, n)
        rms = np.sqrt(np.mean(audio ** 2)) + 1e-9
        # a layer fades in over the 0.15 of intensity above where it enters
        on = np.clip((level - enters) / 0.15, 0, 1) if enters > 0 else np.ones(n)
        music += audio / rms * 0.05 * gain * (on * (0.55 + 0.45 * level) * fade)[:, None]
    if accents:
        timp = []
        for a in accents:
            timp += [(a - 1.6 + j * 0.08, a - 1.4 + j * 0.08, 38, int(30 + 70 * j / 20)) for j in range(20)] + [(a, a + 2.5, 38, 110)]
        t_audio = render(timp, 47, n)
        music += t_audio / (np.abs(t_audio).max() + 1e-9) * 0.22
    return music


# ---------------------------------------------------------------------- voice ----

def load(path, tempo=1.0, start=0.0):
    """An audio file as stereo float at SR; tempo speeds it up keeping the pitch (atempo: a time-domain
    stretch, which suits a single voice); start skips into it."""
    af = ['-af', f'atempo={tempo}'] if tempo != 1 else []
    raw = subprocess.run([config.FFMPEG, '-v', 'error', *(['-ss', f'{start:.3f}'] if start else []), '-i', str(path), *af, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def voice_track(proj, lines, speed, n):
    """Every narration line at its place in the film -> (voice, talk): talk is 1 while someone speaks (for ducking)."""
    voice = np.zeros((n, 2))
    talk = np.zeros(n)
    for ln in lines:
        a = ln['start'] / speed
        place(voice, a, load(Path(proj) / 'public' / ln['file'], tempo=speed))
        talk[int(max(0, a - 0.25) * SR): int((ln['end'] / speed + 0.35) * SR)] = 1
    return voice, talk


# ---------------------------------------------------------------------- mix ----

def limiter_gain(x, ceiling, hold=0.012):
    n = int(hold * SR)
    peak = maximum_filter1d(np.abs(x).max(axis=1), size=n)
    gain = minimum_filter1d(np.minimum(1.0, ceiling / np.maximum(peak, 1e-9)), size=n)
    smooth = butter(1, 30, 'lowpass', fs=SR, output='sos')
    return sosfilt(smooth, gain, zi=sosfilt_zi(smooth) * gain[0])[0][:, None]


def measure(path):
    """(integrated loudness LUFS, true peak dBTP) of an audio or video file, by ffmpeg's EBU R128 meter."""
    err = subprocess.run([config.FFMPEG, '-hide_banner', '-nostats', '-i', str(path), '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    summary = err[err.rfind('Summary:'):]
    i = re.search(r'I:\s+(-?[\d.]+) LUFS', summary)
    tp = re.search(r'True peak:\s+Peak:\s+(-?[\d.inf]+) dBFS', summary)
    return (float(i.group(1)) if i else float('nan'), float(tp.group(1)) if tp else float('nan'))


def master(path, voice, music, fx, talk=None, duck=0.5, fx_gain=0.5, fade_out=1.5, target=config.LOUDNESS, ceiling=config.TRUE_PEAK):
    """Mix and master to `path`: music ducked under the voice, then gain and a limiter until the whole
    thing measures `target` LUFS with true peaks at or under `ceiling` dBTP (YouTube's own target)."""
    music = music.copy()
    if talk is not None:
        smooth = sosfilt(butter(1, 1.5, 'lowpass', fs=SR, output='sos'), talk)
        music *= (1 - duck * np.clip(smooth, 0, 1))[:, None]
    out = voice + music + fx * fx_gain
    if fade_out:
        k = int(fade_out * SR)
        out[-k:] *= np.linspace(1, 0, k)[:, None] ** 2
    peak_lin = 10 ** ((ceiling - 0.6) / 20)  # sample-peak ceiling a little under the true-peak one
    tmp = Path(tempfile.gettempdir()) / f'vk_master_{abs(hash(str(path))) % 10**8}.wav'
    gain_db = 0.0
    for _ in range(4):
        y = out * 10 ** (gain_db / 20)
        y = y * limiter_gain(y, peak_lin)
        sf.write(tmp, y.astype(np.float32), SR, subtype='FLOAT')
        loud, tp = measure(tmp)
        if abs(loud - target) < 0.3 and tp <= ceiling:
            break
        gain_db += target - loud
        if tp > ceiling:  # inter-sample peaks over the line: limit a little harder
            peak_lin *= 10 ** ((ceiling - tp - 0.1) / 20)
    sf.write(path, y.astype(np.float32), SR, subtype='PCM_16')
    tmp.unlink(missing_ok=True)
    loud, tp = measure(path)
    rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    print(f'mix: {len(out) / SR:.1f} s, {loud:.1f} LUFS, true peak {tp:.1f} dBTP (voice {rms(voice):.1f}, music {rms(music):.1f} dBFS)')
    return loud, tp
