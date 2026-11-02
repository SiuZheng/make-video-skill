"""Pre-rendered light: smooth textures the effects library draws with instead of CSS gradients.

CSS gradients are linear between their stops and 8-bit, so big soft lights show rings (banding) and rays
drawn with conic gradients look like a striped fan. These are computed in float with natural falloffs
(gaussian glows, rays of varied width that fade with distance, real lens-flare parts) and dithered as
they are saved, so they stay smooth after video compression. White textures are used as alpha masks
over a coloured layer (any colour); the coloured ones (ghosts, leaks) are drawn as they are.

Usage: python -X utf8 assets/make_fx.py   -> template/public/fx/*.png
"""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'template' / 'public' / 'fx'
rng = np.random.default_rng(2026)


def save(arr, name, mode='RGBA'):
    """float 0..1 -> 8-bit with triangular dither (no banding), as PNG."""
    a = np.clip(arr, 0, 1) * 255.0
    a = a + rng.uniform(-0.5, 0.5, a.shape) + rng.uniform(-0.5, 0.5, a.shape)
    img = Image.fromarray(np.clip(np.round(a), 0, 255).astype(np.uint8), mode)
    img.save(OUT / name, optimize=True)
    print('wrote', name, img.size)


def white(alpha):
    """An alpha mask: white everywhere, opacity = alpha."""
    h, w = alpha.shape
    return np.dstack([np.ones((h, w)), np.ones((h, w)), np.ones((h, w)), alpha])


def grid(n, m=None):
    m = m or n
    y, x = np.mgrid[0:m, 0:n]
    return (x + 0.5) / n * 2 - 1, (y + 0.5) / m * 2 - 1  # -1..1


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def periodic_noise(n, f0, bw, seed):
    """Band-limited noise that tiles (made in Fourier space, so it wraps)."""
    r = np.random.default_rng(seed)
    fx = np.fft.fftfreq(n)[:, None]
    fy = np.fft.fftfreq(n)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2)
    out = np.real(np.fft.ifft2(np.fft.fft2(r.standard_normal((n, n))) * np.exp(-((f - f0) / bw) ** 2)))
    return (out - out.min()) / (out.max() - out.min())


def blur1d(a, sigma, axis):
    k = np.arange(-int(3 * sigma) - 1, int(3 * sigma) + 2)
    g = np.exp(-(k / sigma) ** 2 / 2)
    g /= g.sum()
    return np.apply_along_axis(lambda v: np.convolve(np.concatenate([v[-len(k):], v, v[:len(k)]]), g, 'same')[len(k):-len(k)], axis, a)


def glow():
    """A gaussian disc: how light really falls off (no ring where a CSS gradient would stop)."""
    x, y = grid(512)
    r = np.sqrt(x * x + y * y)
    a = (0.78 * np.exp(-5.2 * r * r) + 0.22 * np.exp(-1.8 * r * r)) * (1 - smoothstep(0.82, 1.0, r))
    save(white(a / a.max()), 'glow.png')


def rays(seed, name, count):
    """Shafts of light from the middle: many rays of different widths, strengths and lengths, soft-edged,
    fading outwards, with a little shimmer along their length."""
    n = 2048
    x, y = grid(n)
    r = np.sqrt(x * x + y * y)
    th = np.arctan2(y, x)
    rr = np.random.default_rng(seed)
    a = np.zeros((n, n))
    for _ in range(count):
        c = rr.uniform(-np.pi, np.pi)
        w = rr.uniform(0.006, 0.05) * rr.choice([1, 1, 1, 2.2])
        d = np.angle(np.exp(1j * (th - c)))
        length = rr.uniform(0.45, 1.05)
        a += rr.uniform(0.25, 1.0) * np.exp(-(d / w) ** 2) * np.exp(-((r / length) ** 1.6) * 2.2)
    shimmer = 0.75 + 0.25 * np.sin(r * rr.uniform(18, 30) + th * 3)
    a = a * shimmer
    a = a / np.percentile(a, 99.7)
    a *= smoothstep(0.0, 0.06, r) * (1 - smoothstep(0.7, 1.0, r))  # no hard point in the middle, nothing at the edge
    a = blur1d(a, 3.0, 0)
    a = blur1d(a, 3.0, 1)
    save(white(np.clip(a, 0, 1) ** 1.15), name)


def streak():
    """An anamorphic flare streak: thin, hot in the middle, long soft tails."""
    w, h = 1024, 64
    x, y = grid(w, h)
    a = np.exp(-(y / 0.32) ** 2) * (np.exp(-np.abs(x) / 0.12) * 0.7 + np.exp(-np.abs(x) / 0.45) * 0.3) * (1 - smoothstep(0.85, 1.0, np.abs(x)))
    save(white(a / a.max()), 'streak.png')


def starburst():
    """Diffraction spikes round a bright point (six long, six short) and its core."""
    n = 1024
    x, y = grid(n)
    r = np.sqrt(x * x + y * y)
    th = np.arctan2(y, x)
    a = np.zeros((n, n))
    for k in range(12):
        ang = k * np.pi / 6 + 0.12
        long = k % 2 == 0
        d = np.abs(np.sin(th - ang)) * r  # distance from the spike's line
        along = np.cos(th - ang) > 0
        a += along * np.exp(-(d / (0.006 if long else 0.004)) ** 2) * np.exp(-r / (0.55 if long else 0.22)) * (1.0 if long else 0.6)
    a += 0.9 * np.exp(-(r / 0.06) ** 2) + 0.25 * np.exp(-(r / 0.2) ** 2)
    a *= 1 - smoothstep(0.8, 1.0, r)
    save(white(np.clip(a / np.percentile(a, 99.9), 0, 1)), 'starburst.png')


def ghost(name, hexagon=False):
    """A lens ghost: a faint disc (or the aperture's hexagon) with a brighter rim and colour fringes."""
    n = 256
    x, y = grid(n)
    if hexagon:
        angles = [0, np.pi / 3, 2 * np.pi / 3]
        d = np.max([np.abs(x * np.cos(t) + y * np.sin(t)) for t in angles], axis=0) / np.cos(np.pi / 6)
    else:
        d = np.sqrt(x * x + y * y)
    chans = []
    for s in (1.0, 0.97, 0.94):  # red spreads a little wider than blue: the fringe
        edge = 0.82 * s
        fill = 0.28 * (1 - smoothstep(edge - 0.06, edge + 0.02, d))
        ring = 0.75 * np.exp(-((d - edge + 0.02) / 0.035) ** 2)
        chans.append(fill + ring)
    rgb = np.stack(chans, axis=2)
    alpha = np.clip(rgb.max(axis=2), 0, 1)
    color = rgb / np.maximum(alpha[..., None], 1e-6)
    save(np.dstack([np.clip(color, 0, 1), alpha]), name)


def bokeh():
    """An out-of-focus highlight: an even disc, a soft edge, a faint bright rim."""
    n = 256
    x, y = grid(n)
    r = np.sqrt(x * x + y * y)
    a = 0.55 * (1 - smoothstep(0.84, 0.97, r)) + 0.35 * np.exp(-((r - 0.88) / 0.05) ** 2) * (1 - smoothstep(0.93, 1.0, r))
    save(white(a), 'bokeh.png')


def leaks():
    """Light leaks: big soft blooms of warm film colour, coloured textures to screen over the frame."""
    w, h = 960, 540
    palettes = [
        [(1.0, 0.55, 0.15), (1.0, 0.25, 0.2), (1.0, 0.78, 0.35)],
        [(1.0, 0.35, 0.55), (1.0, 0.6, 0.2), (0.95, 0.85, 0.5)],
        [(1.0, 0.7, 0.3), (0.9, 0.3, 0.15), (1.0, 0.92, 0.75)],
    ]
    for k, pal in enumerate(palettes):
        rr = np.random.default_rng(100 + k)
        x, y = grid(w, h)
        x = x * w / h
        rgb = np.zeros((h, w, 3))
        for j in range(7):
            cx, cy = rr.uniform(-1.4, 1.4), rr.uniform(-0.9, 0.9)
            sx, sy = rr.uniform(0.35, 1.1), rr.uniform(0.25, 0.8)
            g = np.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2)) * rr.uniform(0.4, 1.0)
            rgb += g[..., None] * np.array(pal[j % len(pal)])
        rgb = rgb / rgb.max()
        alpha = np.clip(rgb.max(axis=2) * 1.1, 0, 1) ** 1.2
        save(np.dstack([np.clip(rgb / np.maximum(rgb.max(axis=2, keepdims=True), 1e-6), 0, 1), alpha]), f'leak_{k + 1}.png')


def fog():
    """Tiling fog: soft clouds of different sizes (white alpha), to drift in layers for atmosphere."""
    n = 1024
    a = 0.55 * periodic_noise(n, 0.004, 0.004, 7) + 0.3 * periodic_noise(n, 0.012, 0.008, 8) + 0.15 * periodic_noise(n, 0.03, 0.015, 9)
    a = smoothstep(0.35, 0.85, a)
    save(white(a), 'fog.png')


def grain():
    """Fine, soft film grain, four variants to cycle through frame by frame."""
    for k in range(4):
        rr = np.random.default_rng(300 + k)
        g = rr.standard_normal((512, 512))
        g = blur1d(blur1d(g, 0.6, 0), 0.6, 1)
        g = 0.5 + g / (g.std() * 7.5)
        save(np.clip(g, 0, 1), f'grain_{k}.png', mode='L')


def ink():
    """An organic reveal: 24 frames of ink bleeding across (a threshold creeping over smooth noise,
    biased left to right), as one sprite sheet of masks (6 x 4 cells of 320 x 180)."""
    cols, rows, cw, ch = 6, 4, 320, 180
    nz = periodic_noise(512, 0.01, 0.008, 21)[:ch * 2:2, :cw]  # 180 x 320 of smooth noise
    nz = (nz - nz.min()) / (nz.max() - nz.min())
    x, _ = grid(cw, ch)
    field = 0.55 * nz + 0.45 * (x * 0.5 + 0.5)  # creeping from the left, with ragged edges
    sheet = np.zeros((rows * ch, cols * cw))
    for i in range(cols * rows):
        level = -0.08 + 1.16 * i / (cols * rows - 1)
        cell = 1 - smoothstep(level - 0.03, level + 0.03, field)
        r, c = divmod(i, cols)
        sheet[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] = cell
    save(white(sheet), 'ink.png')


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    glow()
    rays(1, 'rays_a.png', 46)
    rays(2, 'rays_b.png', 30)
    streak()
    starburst()
    ghost('ghost.png')
    ghost('ghost_hex.png', hexagon=True)
    bokeh()
    leaks()
    fog()
    grain()
    ink()
