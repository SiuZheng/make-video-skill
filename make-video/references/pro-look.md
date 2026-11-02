# The professional standard

What separates "a slideshow with moving stickers" from something that feels produced: every move is
motivated and eased (and motion-blurred when it's fast), every shot has depth and real light, every event
has a sound, nothing is left frozen, and the encode keeps gradients smooth. All the components below are in
the project's `src/fx` (import from `'../fx'` in scenes/). Sizes follow the composition, so the same pieces
work at 1920×1080 and 1080×1920.

## Make it rich

A shot looks rich when there's something at every depth and everything is a little alive. A shot looks
cheap when it's one object on a flat background, frozen, in silence. Plan richness in the draft, build it in,
and on every QA sheet add effects wherever a frame looks plain - don't wait for the user to ask.

**People judge this in motion, and it's the first thing they notice.** A Short once passed the reviewer at
20/20 and was then called too plain once it was watched: the pages stayed static and only a few things
moved. In v1 only the character and the labels moved while the sky and ground sat still, and contact
sheets can't show that. Lighting, effects and camera fixed it: v2 added the layers below, and the
automatic check "the background sits still" (toolkit.md) now catches it. **The test:** pause on any shot, then play one second. If only the character or a label
changed, the shot is too plain.

**Every shot, as a minimum** (all of these, unless the shot is deliberately bare for effect):

| Layer | What | From the library |
|---|---|---|
| Background with depth | never a flat colour: stars in 3 parallax layers + nebula, or a sky gradient + fog | `Space`, `Nebula`, `Fog`, `Haze`, `Layer` |
| A light | a source that glows, lighting the subject from one side | `Bloom`, `GodRays`, `LensFlare`, `rim()`, `LitSphere`, `Sun` |
| The subject in the world | a contact shadow or glow, the scene's rim light, a reaction | `ContactShadow`, `halo()`, `TrackGuide` |
| Foreground | something drifting past in front, out of focus | `Dust`, `Particles` (dust, bokeh, sparkle) |
| Ambient motion | camera drift or a slow push, twinkle, breathing glows - no frozen frame | `drift`, `Camera`, `Particles` |
| A camera that never locks | every shot drifts, pans or pushes, and the world is split into `CamLayer`s so the move slides them past each other (sky 0.08, far range 0.3, near 0.55, ground 1, boulders 1.5) | `CamLayer`, `Ridge`, `Boulders`, `drift` |
| Life in the background | something besides the character is doing something: a second figure, props that react, screen chrome (an old broadcast's snow, hum bar and supers), counters, flags popping up | `OldTv`, `TvSuper`, scene props |
| A visible light | the light source is in or just off the frame and you can see it: glare and a lens flare, lamp shafts through dust, glints on shiny things, flashes on impacts | `SunGlare`, `GodRays` + `Particles` dust, `Glint`, `Bloom`, `Burst` |
| The character alive | it breathes and sways a little even when it holds a pose | `TrackGuide` (`breathe`, on by default) |
| Finish | grade, vignette, grain over everything | `Grade`, `Vignette`, `Grain` |
| Sound | an ambience bed, and a sound for every event | `ambience()`, the SFX list below |

**Moves that make a scene richer, by kind of scene:**

- **Space:** a nebula colour per section, a distant lit planet or moon, a comet with a `Trail`, sparkles
  that twinkle, a `LensFlare` whenever a star is in frame, `Warp` streaks for jumps in scale.
- **Earth, nature, places:** fog bands at different depths, god rays through haze, fireflies at night,
  drifting dust or pollen in the light, a warm horizon glow, a `Tilt` low angle on the ground.
- **Explaining an idea:** diagrams that draw themselves on (`DrawPath`), `Callout`s pointing at parts,
  `Counter`s for numbers, `Measure` lines, a grid floor with `Tilt`, the highlighter on key words,
  `KineticTitle` for the big statement.
- **A big reveal:** `riser` into `Burst` + shockwave + `shake` + a `chroma` jolt + a bloom flash + a
  timpani accent, then a slow push so it can land.
- **An emotional moment:** fewer things on screen, a slow push-in, a warm grade, a `LightLeak`, soft bokeh,
  the music swelling - richness here comes from light and pace, not more objects.
- **Technology, AI, the internet:** `glitch` transitions, neon `GlowText`, a scanline or grid background,
  `Typewriter` text, cyan sparkle particles, `chroma` on hits.
- **Comparing sizes or numbers:** a log-scale zoom reveal, side-by-side `push` transitions, `Measure`
  bars, a `Counter` that rolls, stacked objects (the planets between the Earth and the Moon).

**Camera moves on the beats** (all liked by the reviewer when they were tried):
- a crash zoom onto a face during a freeze-frame gag;
- a punch-in with a `chroma` jolt when a key number lands;
- a dutch angle on an action that levels out as the camera pulls back;
- the camera tipping with a fall and snapping back on the impact;
- a `shake` kick on every hit.

**Comic sound words** (`SoundWord`: PING!, KNOCK, POP!, CREAK) on the big sounds suit the cartoon looks.

**Keep effects off the text.** In one final review, every defect was an effect landing on text at the
moment the text mattered:
- two sound words stacked over a punchline label;
- a burst ring crossing a caption;
- a flash whiting out the key number.

So put bursts behind the digits, keep rings and words clear of the caption band, and fade sound words out
before the next label pops in.

**Restraint keeps it rich instead of messy:** one main light per scene; at most two particle systems;
every effect has a reason (it shows depth, light, motion or meaning); the focal point (the character's face,
the key number, the text being read) stays clear and highest in contrast; the heaviest effects go on the
moments that matter (they also cost render time).

## Light: never draw it with plain CSS gradients

CSS gradients are linear between stops and 8-bit: big soft lights show rings (banding), and rays made with
`repeating-conic-gradient` look like a striped fan. Neither looks smooth. All light comes from
pre-rendered textures (`public/fx`, made by `<videokit>/assets/make_fx.py`: float maths, natural falloffs,
dithered) drawn as coloured layers with `LightTex` (a white texture used as the mask of a colour, screen-blended):

- `Bloom` - a source's glow (gaussian core, halo, spill). `Glow` (basics) uses the same gaussian.
- `GodRays` - two layers of soft volumetric shafts turning against each other (`rays_a/b.png`).
- `LensFlare` - glare, diffraction spikes, anamorphic streak, chromatic ghosts along the axis through the
  frame centre (they slide as the light moves - sells the camera). Only for a bright source in frame.
- `LightLeak` - film leaks (`leak_1-3.png`) washing across: transitions, memories, sunlight.
- `Fog` - drifting fog in two layers (sizes/speeds), optionally only in a band (`y0..y1`, ground fog).
- `Grade` per scene (warm `#FF9F45` soft-light for sunlight, cool `#2A4FB8` for night; 0.15-0.25).
- Over everything: `Vignette` (0.4-0.6, smooth falloff) and `Grain` (0.04-0.06, four fine grain tiles).
- `rim(color, dx, dy)` on pictures facing the light (dx/dy point towards the light), `halo()` for a glow,
  `ContactShadow` under things standing, `Haze` for distance.
- `Sun` (basics) for a star up close (limb darkening, boiling granulation texture, spots, prominences).
- `LitSphere` for planets and moons: lit from an angle (radians: 0 = from the right, PI = left, -PI/2 =
  above), soft terminator into night, limb darkening, an atmosphere glowing on the lit edge, a glint,
  `cityLights` on the night side. Point `light` at the scene's actual light source.

One key light per scene; know where it is (even off-screen) and keep everything lit from there.

## Transitions (`Shot`, `Scenes`, `Between` in fx/transitions.tsx)

Choose by meaning; a video uses 3-5 kinds, consistently:

| Move | Means | Length | Sound (TRANSITION_SFX) |
|---|---|---|---|
| cut | the default inside a section, on an action or a beat | 0 | - |
| fade / dip | time passing; dip through black for an ending or chapter | 1.0-1.2 | - |
| zoom | pull back to reveal something bigger / push into a detail | 1.4 | whoosh |
| zoomThrough | fly through this picture into the next ("into" something) | 0.9-1.1 | whoosh |
| push / slideUp | the next idea slides in beside / below (lists, Shorts) | 0.9 | whoosh |
| whip | a fast push: energy, "meanwhile" | 0.6 | swish |
| flash / leak | a burst of light: a revelation, the Sun, a memory | 1.2-1.4 | shimmer |
| iris | close on / open from a point: focus | 1.4 | whoosh |
| wipe | a soft diagonal wipe: a new place | 1.0 | whoosh |
| ink | the next picture bleeds in like ink: organic, art, nature, gentle | 1.4 | swell |
| flip | turns over like a card: a twist, the other side | 1.0 | flip |
| glitch | a digital tear with colour split: tech, AI, something going wrong | 0.5 | glitch |
| spin / warp | spinning away / light speed: huge jumps in scale | 1.4-1.6 | swirl / warp |
| blur | defocus dissolve: dreamy, a thought | 1.0 | whoosh |

- A continuous camera move (a pull-back revealing the Sun) is often better than any transition.
- Both sides of a cut agree automatically (`Scenes`: a scene leaves the way the next arrives).
- **Real motion blur:** `Scenes` renders moving transitions (zoom, zoomThrough, push, slideUp, whip, flip,
  spin, warp) with `TimeBlur` - 6 samples across a 180° shutter, averaged - plus a directional smear on the
  fastest. Mark fast camera moves inside a scene with `blur: [[from, to]]` in its SceneDef so they get it
  too (it costs ~6× render time while on, so only where things move fast).
- `chroma(px)` splits colours for an impact jolt; `motionBlur(px)` smears one thing.

## Animation (fx/ease.ts, camera.tsx, depth.tsx, character.tsx, tilt.tsx)

- Nothing moves linearly. Arrivals `EASE.out`, exits `EASE.in`, camera moves `EASE.inOut`, drifts
  `EASE.soft`, pops `EASE.back` or `springAt(t, at)` (real spring physics).
- Stagger groups: `stagger(t, at, i, 0.07)` - things arrive 60-100 ms apart.
- The camera is never perfectly still: `drift(t, 10-16)` (4-6 reads as frozen on a phone); `shake(t, [hits])`
  on impacts; slow push-ins and pans. Inside a `Camera`, wrap each depth band in a `CamLayer` so the drift
  makes parallax.
- Depth: 3+ layers in every moving shot - far (0.05-0.3), subject (1), near (1.5-2): `<Layer depth dof>`.
  `Fog` layers and foreground bokeh (`Particles kind="bokeh"`, real lens bokeh discs) add depth cheaply.
- `Tilt` gives a flat layout a 3D camera angle (a grid floor tilted back under an orbit, a map seen low).
- Scale reveals zoom on a log scale (`Math.exp(lerp(log(a), log(b), p))`).
- The character: `makeTrack` keys with `follow` functions tied to the scene, `TrackGuide` (squash/stretch,
  lean, bob, `light={rim(...)}`, `shadow`) - always doing something in the scene.
- Holds: ~1.5 s on a new fact; no frame frozen for more than ~3 s.

## Drawing and impacts (fx/draw.tsx, burst.tsx)

- `DrawPath` - a line drawing itself on with a glowing pen tip: orbits (`ellipsePoints`), arrows
  (`curvePoints` + `arrow`), outlines, routes; `dash` once drawn. Pair with `sound.scribble()`.
- `Trail` - a tapering ribbon behind anything moving along a path (comets, light, a thrown thing).
- `Burst` - flash, sparks, shockwave ring for an impact or a big reveal; with `sound.impact()`, `shake()`,
  and a `chroma()` jolt for a hit.

## Emoji assets (fx/emoji.tsx)

When the brief chose emoji: `<Emoji char="🚀" x y size light={rim(...)} shadow={0.5} scale={pop(...)} />` -
crisp at any size (the colour emoji font), lit with the scene's rim light, a contact shadow when standing,
popped in with an overshoot. Size them like objects in the scene, keep one emoji style per video, and give
them the same motion rules (eased, staggered, a sound when they appear).

## Particles (fx/particles.tsx)

dust in light beams · sparkle on reveals · ember off fire and stars · snow · bokeh in the foreground ·
firefly at night. 30-90 is plenty; `area` keeps them where they belong.

## Type (fx/text.tsx; Shorts: src/shorts/kit.tsx)

- `KineticTitle` (words rise from a mask, *gold* accents) for statements; `Counter` for numbers; `Callout`
  to point at something; `Typewriter` (with `sound.typing()`), a highlighter swipe behind key words,
  `ShineText` (a light sweep across a title, with `sound.glint()`), `GlowText` (neon,
  optional flicker), `Label`, `Measure`.
- `Sticker shine={p}` sweeps light across a picture, cut to its own outline.
- Inter, heavy weights; titles ~100-150 px, labels 36-46 px; dark outline on all text over pictures.
- Keep text inside 90% of the frame. Shorts: `Header` only over the opening (the hook), faded out with
  `hideAt` once it has done its job - a title on every scene is clutter. It hangs from y = 290 (the top
  ~15% is under the phone's status bar and YouTube's search/camera icons - a header placed higher was
  covered there), `Captions` at
  y≈1340, the picture's key things between ~420 and 1300, nothing important in the bottom fifth or the
  right-hand strip (YouTube's buttons).

## Sound (kit/sound.py)

- Every visible event has a sound: appear → `plip`; land → `thump`; reveal → `riser` ENDING on it +
  `impact` (+ `boom` if huge); light → `shimmer`; shine → `glint`; magic → `sparkle`; drawing → `scribble`;
  typing → `typing`; counters → `tick`s; movement → `whoosh`/`swish`; card flip → `flip`; glitch →
  `glitch`; ink/organic reveal → `swell`; a radio message → `beep`; a gentle "look" → `chime` (in key).
- Pan sounds toward where they happen (-1..1).
- Music: `score(mood, keys, accents)` - intensity keys shape the arc; timpani rolls land on accents.
- Ambience beds (`space`, `wind`, `sea`, `night`) low under scenes.
- The mix: voice on top, music ducked under it, -14 LUFS integrated, true peak ≤ -1 dBTP.

## Render quality (kit/render.py)

- Finals: JPEG frames at quality 100 (visually lossless - Remotion's default JPEG-80 smears gradients
  into bands), CRF 16 quality, BT.709 colour tags. Encoded on the GPU with NVENC (cq 23, same quality as
  x264-slow CRF 16) when `vk.py gpu` finds it; the browsers only pack chunks lightly (x264 ultrafast CRF 10),
  which cut a render's CPU work by about a third; without NVENC, x264 `slow` as before. `vk.py final --hq` supersamples (renders 2×, scales down with lanczos) for
  the smoothest edges and light - 3-4× the time; offer it for the final of an important video.
- `vk.py render --frames a-b --rough` for quick looks (JPEG-80 frames, faster encode); `vk.py animatic`
  for the whole video at half size, fast, to judge the pacing before the polish.
- TikTok smears fine noise when it re-encodes: `vk.py final --platform tiktok` makes a cut without grain,
  with half the dust, at a higher bitrate and lightly sharpened. Keep the YouTube look as it is; the
  grain belongs there.

## Quality checks (every `vk.py qa` run)

- First the automatic checks (`out/qa/<comp>_checks.md`, toolkit.md): text in the safe zones, big enough,
  not overlapping, inside the frame; no still stretch; no gaps in the voice; no uncovered edges; a clean
  loop seam; loudness. Fix every problem it lists before looking further.
- Transitions at their midpoint: no ugly double exposure, motion blur where it moves fast.
- Light: one direction per scene, rims on the lit side, no banding, no striped rays, glows on sources.
- Text: legible at phone size, inside the safe area, never overlapping other text or a face.
- The character is doing something in every shot, at a sensible size, lit like the scene.
- Nothing frozen; every shot has depth. The automatic check "the background sits still" (under 25% of
  the frame moving over 2 s) means the shot needs camera drift, parallax layers or ambient motion.
- After the final render: `vk.py report` ✓ for size, fps, codecs, -14 LUFS, true peak; pull frames from
  the finished file (ffmpeg -ss) to check the encode, especially dark gradients.

## Render time

Renders run on the GPU in three browsers at once (kit.render): budget about 3-3.5 s of render per second
of video for demo-level rich scenes (every shot lit, motion-blurred transitions), 0.5-2 s for a typical mix -
so a 6-minute video takes roughly 5-20 minutes the first time. After that only the 4 s chunks that changed
are rendered again: a fix to one scene costs that scene's chunks plus ~1 min to check the rest. A moving transition renders both scenes 5 times (motion blur), so the
heaviest frames are transitions between two richly lit scenes. Keep `GodRays` radius ≤ ~1800 (the ray
texture is 2048 px; bigger only costs time), prefer textures over CSS blur on big areas, test a heavy
stretch with `--frames` to estimate, and put the expected render time in the draft. kit.render already
gives each frame up to 5 minutes (Remotion's default 30 s fails on such frames).
