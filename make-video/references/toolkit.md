# videokit

`<videokit>` (the videokit folder of this skill's repo) - shared code for every video. Run `vk.py` with
`python -X utf8` (on Windows the console is often cp1252; non-English text crashes without it).

## Commands (`python -X utf8 <videokit>/vk.py <cmd>`, from the project folder or with --project)

| Command | Does |
|---|---|
| `new <folder> --title "..." --format long\|short\|both` | a new project in <folder> next to the videokit folder, from `template/` (npm install ~40 s, copies the render browser) |
| `characters` | the character sprites there are (in `<videokit>/sprites`) and their poses |
| `voice samples [--voices A,B]` | the first lines in a few voices → voice_samples/ |
| `voice record` | every "> " line of script.md → public/voice/lineNN.mp3 (cached; reused across projects), narration.json, narration_preview.mp3 |
| `words` | word timings (faster-whisper, CPU) → narration_words.json; flags lines that don't match the script |
| `build` | runs scripts/build.py: timeline.json, art, music, effects, mix.wav (mastered), captions.srt, youtube.md |
| `stills 1.5 12 30 [--comp C]` | frames at those film seconds + a contact sheet (out/qa/<comp>_stills.png) |
| `qa [--comp C] [--every 2] [--auto] [--video F]` | frames at every cue and transition → out/qa/<comp>_N.png, then the automatic checks (below) → out/qa/<comp>_checks.md; `--auto` = only the checks (~1 min); `--video` = which render to check (default: the newest of out/<comp>.mp4, the animatic, the final) |
| `animatic [--comp C]` | the whole video at half size with its real sound, no motion blur, nothing cached → out/<comp>_animatic.mp4 (a 32 s Short: about 1.5 min), then the pacing checks on it |
| `render [--comp C] [--frames a-b] [--rough] [--fresh]` | → out/<comp>.mp4: only the 4 s chunks that changed since the last render are rendered (a frame range for quick tests; --rough = JPEG-80, no chunk cache; --fresh = everything) |
| `final [--comp C] [--hq] [--fresh] [--platform tiktok]` | render (JPEG-100 frames, CRF-16 quality, BT.709; encoded on the GPU with NVENC when there is one, else x264 slow; --hq supersamples 2×), keep the old file as out/<name>-vN.mp4, copy in as "<Title>.mp4", run report. `--platform tiktok`: the TikTok cut, "<Title> (TikTok).mp4" (below) |
| `report <file>` | ✓/✗: size, fps, codecs, loudness, true peak, length |
| `gpu [--force]` | which graphics device draws (Chrome --gl mode) and which encoder (h264_nvenc, else x264); checks once, remembers both in videokit/gpu.json |

## A project

```
video.json        title, format, fps, speed (1.2 = brisk narration), voice {engine, model, name, style}, character, music
script.md         narration: "## " sections, "> " lines
plan.md           the draft (approved before building)
scripts/build.py  everything particular to this video (pauses, cues, MOVES, effects(), music(), ambience(), YouTube text)
src/Video.tsx     the scene list (SceneDef: from, to, in, at, dir, C) + vignette, grain, audio
src/scenes/*.tsx  one file per scene: ({t}) => JSX, t in story seconds
src/fx/           the effects library (see pro-look.md);
                  also fingerprint.ts + probe.ts (per-frame reports for the renderer and the checks) and mode.ts
                  (PLATFORM / DRAFT: what a TikTok cut or an animatic leaves out)
scripts/          build.py, render.mjs (the chunked renderer), stills.mjs, probe.mjs (the text measurements)
out/review/       the reviewer's replies, scores.md, decisions.md, reviewer.txt (review.md)
src/shorts/       Shorts: kit.tsx (Header, Captions, Big, VMeasure, safe areas), Short.tsx (scene registry)
src/timeline.json written by build.py; src/art/*.json written by art.sync
public/           mix.wav, voice/, art/, fonts/, fx/ (light textures: glow, rays, flare parts, leaks, fog, grain, ink - from videokit/assets/make_fx.py)
```

## The automatic checks (`vk.py qa`, kit/qa.py)

They catch what code can, so the reviewer's attention goes to taste. Problems are defects (fix them);
"worth a look" is pacing (judge it).

- **Text**, measured on the page itself on every 2nd frame (`scripts/probe.mjs`: one pass like the
  renderer's, no pictures taken; `src/fx/probe.ts` reads each piece of text's box, its size as seen - the font
  size times every scale above it - and its opacity, cut by overflow:hidden parents). Problems: text under
  the platforms' UI in a Short (the top 140 px; x > 940 from mid-height down; the bottom 380 px), outside the
  middle 90% in a long video; smaller than 40 px seen in a Short (28 in a long video) for 0.5 s+; two different
  texts whose letters overlap; text running off the frame. Boxes are the letters (Inter's metrics), not the
  line box. Only text at 60%+ opacity, lasting 0.25 s+, counts.
- **The rendered file** (10 frames a second): stretches of 2.5 s+ where the picture barely changes (mean
  change over a second < 3/255 - calibrated on a Short whose ending a reviewer called "barely moves": it
  dipped to 1.8-2.0); **the background sits still**: stretches where under 25% of the frame moves over 2 s
  (blocks changing by more than 1.5/255 in a second), calibrated on a Short that was called too plain: its
  v1 sat at 8-25% through four shots, and the fixed v2 never went under 30%. Gaps of 0.7 s+ in the
  voice (from the timeline), a flat strip along an edge (a camera
  zoom under ~1.04 or a move leaving the edge uncovered - it has found real ones), a
  Short's loop seam (last frame vs first > 3/255; a level jump > 6 dB in the sound), loudness and true peak.
- A project made from an older template, before the checks: copy `scripts/probe.mjs`, `scripts/render.mjs` and
  `src/fx/{probe,mode,fingerprint}.ts`, `src/fx/{light,space,transitions}.tsx`, `src/fx/index.ts` from the
  template (if the project hasn't changed those fx files itself; diff first). Normal renders' chunks stay
  valid.

## Effects added later

In the template's `src/fx`; a project made from an older template can copy `fx/landscape.tsx`, `fx/oldtv.tsx`, and the
new parts of `depth.tsx` (`CamLayer`), `light.tsx` (`SunGlare`, `Glint`), `text.tsx` (`SoundWord`),
`character.tsx` (`breathe`) and `index.ts`.
- `CamLayer` (depth.tsx): parallax inside a `Camera`.
- `Ridge` and `Boulders` (landscape.tsx): horizon ranges and blurred foreground rocks, with colours as props.
- `SunGlare` (light.tsx): the off-frame sun, with glare, a lens flare and a warm grade.
- `Glint` (light.tsx): a four-point glint.
- `SoundWord` (text.tsx): comic sound words.
- `OldTv` and `TvSuper` (oldtv.tsx): an archive broadcast look, with snow, a hum bar, scanlines and a LIVE
  light, plus a burned-in caption.
- `TrackGuide` (character.tsx): now breathes and sways by default (`breathe={0}` turns it off).

## The story clock

Narration is recorded at a calm pace and laid out on the "story clock"; the film plays it `speed` times
faster (video.json). Everything in timeline.json, the cues and the scenes is story seconds (`useT()` gives
story time); kit.sound lays out audio on film time (`timeline.real(t, speed)` converts). Film frame for a
story time t: `round(t / speed * fps)`. Shorts are timed in their own (film) seconds.

## build.py hooks

- `cues(c, lines, sections)` → `{name: story_t}` with `c.at(line, 'phrase', after)`, `c.at(line)`, `c.end(line)`
  (word-accurate from narration_words.json).
- `effects(cue, sections, put)` → `put(story_t, sound.whoosh(), gain, pan)`.
- `music(cue, duration)` → `{'mood', 'keys': [(story_t, 0..1)], 'accents': [story_t]}` or None - or a score
  composed note by note (below).
- `ambience(cue, duration)` → `[(kind, from, to, gain)]`.
- `BEATS = [('Title', seconds), ...]` instead of narration for wordless videos.
- `CHARACTERS = {'<sprite name>': [poses]}`, `PROP_DIRS = [folders of PNGs]` → public/art + src/art/*.json.

## A composed score

When the user wants music written for this video (not the mood score), `music()` returns
`{'parts': [{'notes': [(start, end, midi_key, velocity)], 'preset': GM program, 'bank': 0 (128 = drum kit),
'gain', 'pan'}], 'dynamics': [(t, dB)], 'room': 0.3, 'level': -27}`, all in **film** seconds →
`sound.arrange` (GeneralUser GS through tinysoundfont, each part levelled, panned, in a hall reverb).
A layout that works: put the score in `scripts/score.py` of the project you write - a theme stated, varied
and brought back, chords per section hung on build.py's `moments()`, `compose(cue, moments, duration,
SPEED)`. What composing scores taught:

- Velocity only moves a SoundFont a few dB (TSF scales amplitude linearly), so the loud and soft come from
  `dynamics`: hushed sections 5-7 dB down, long crescendos, a quiet coda.
- Bowed strings, choir, pad and brass take 125-200 ms to speak: fast figures (a ticking pulse, runs,
  ostinatos) go on piano (5 ms), harp, pizzicato (45 ms) or timpani; sustained ones on the slow instruments.
- `vk.py build` prints `score clash at ...` for two notes sounding together a semitone or minor 9th apart
  (`sound.clashes`): usually an arpeggio note ringing into the next chord (give `arp` an `until`), chords
  overlapping by more than a few hundredths (the release tails make legato anyway), or a maj7 voiced under
  its own root. Fix every one - they're the wrong notes you'd hear.
- Check it against the voice in 250 ms windows (ducked as the master does): 6-18 dB under while someone
  talks, the peaks on the ends of lines; the music takes over after the last word.

## Shorts from a long video

In build.py: `from kit import shorts` and `shorts.build(ROOT, SPECS)` where each spec is
`{'header': 'Hook with *gold* words', 'parts': [(line, first_word_or_None, pause_after)], 'lead', 'tail',
'cues': {name: (line, 'phrase')}, 'mood', 'accent': cue, 'sfx': [(cue_or_t, offset, 'whoosh', gain, pan)],
'custom': fn(cues, put)}` → public/shorts/<id>.wav + src/shorts/shorts.json; register each scene in
src/shorts/Short.tsx; render with `vk.py final --comp Short-<id>`. Header shows from frame 0 and shrinks
at 3.2 s, its top edge staying at y = 290 (below the phone's top bar) - or, better, `hideAt` fades it
out after the hook so it isn't over every scene; captions are burned in.

## Music videos (the user's own song)

videokit's mix assumes narration + an original score. For an MV, the song is the soundtrack: the user sends
the audio file and the lyrics (never download from YouTube). Tools that have worked for it, set up in the
project (they aren't part of videokit): beat analysis (librosa), lyric timing (faster-whisper + the Qwen3
forced aligner, in its own venv) and vocal separation (Demucs). Never put another artist's lyrics on screen; for a
Short of someone else's song, upload the SFX-only cut and add the song with YouTube's "Add sound".

## Windows gotchas

- On Windows, long Python heredocs in bash break ("unexpected EOF"); multi-line `python -c` fails. Write the
  script to the scratchpad and run it.
- ffmpeg/ffprobe: put them on PATH (kit.config finds them there).
- Whisper runs on the CPU (CTranslate2 often has no cuBLAS on Windows); ~2-3 min for 6 minutes of narration.
- Gemini TTS: `gemini-2.5-pro-preview-tts` takes a "Say ...:" style lead-in without reading it; 3.8 Flash TTS
  reads style text aloud - don't use it for directed narration. 429 = wait and retry (built in); 402 = out
  of credits, tell the user.
- The API key comes from GEMINI_API_KEY (on Windows, also the registry) via `kit.config.api_key()`; never
  print it.
- Stills: `out/stills/<comp>_<frame>.png`. Remotion 4.0.534; React 19; TypeScript 7; Inter font.
- A full render can take a while - run it in the background; it prints each chunk as it finishes, with the time left.

## Light textures

`<videokit>/assets/make_fx.py` computes the textures the lighting is drawn with (gaussian glow, volumetric
rays, starburst, anamorphic streak, chromatic lens ghosts, bokeh, film leaks, tiling fog, grain, the ink
reveal sheet) into `template/public/fx`. New projects get them automatically; to change one, edit the
script, run it (~2.5 min), and copy the PNGs into existing projects' `public/fx`.

## Rendering (scripts/render.mjs, called by kit.render)

- **On the GPU.** Left alone, Remotion's Chrome draws with SwiftShader (software, on the CPU). `kit.gpu`
  renders the project's GpuProbe frame with `--gl=angle` / `--gl=vulkan`, reads which device drew it, and
  remembers the first that reaches real hardware (on Windows with an NVIDIA GPU, typically Direct3D 11 via
  `--gl=angle`). Renders and stills use it automatically; a render that fails on the GPU finishes on the CPU
  (the chunks already done are kept).
- **Three browsers, one tab each.** Tabs in one browser share its one GPU process, so more tabs stopped
  helping; separate browsers each get their own. The video is cut into 4 s chunks (120 frames) taken off one
  queue, slowest first, and joined without re-encoding (every chunk starts on a keyframe).
- **JPEG-100 frames.** 30% faster to capture than PNG and visually lossless (48-50 dB from PNG, colours
  within 0.2 of a level; the H.264 encode changes more). Remotion's default JPEG-80 is what banded gradients.
- **Only what changed.** A quick pass through the frames with the page hidden (~5 s per 800 frames)
  records the sound and fingerprints each frame: its DOM in canonical form (src/fx/fingerprint.ts) plus the
  contents of the public/ files it uses. Chunks whose frames all match the saved fingerprints are reused from
  `out/chunks/<comp>/`; the chunks a render replaced are kept until the next one, so undoing an edit costs
  nothing. Settings, Remotion's version, fonts and CSS are part of every chunk's key.
  A fingerprint can't see pixels drawn into a `<canvas>`/WebGL or a video file swapped under the same name:
  after such a change use `--fresh` (with `--frames a-b`, only that stretch is redone; the other saved chunks stay). If drawing a chunk gives other fingerprints than the pass (something
  not deterministic), it isn't saved and is simply rendered every time.
- Rough numbers (a test video of 790 rich frames, on one laptop with an NVIDIA GPU): Remotion's own renderer, 2 tabs, PNG: 150 s. 1 browser x 2 tabs JPEG
  122 s; 2 x 1 96 s; 3 x 1 83 s; 4 x 1 80 s. Re-render with nothing changed: 9 s. One scene changed
  (3 of 7 chunks): 37 s. One picture changed: only the chunks showing it. Output matches Remotion's own
  render as closely as two of its renders match each other (~51 dB), no glitch at the joins, audio
  sample-identical.
- `node scripts/render.mjs --debug-fp` says which frames' fingerprints differed between the pass and the
  render and saves both; `--dump-fp=file.json` saves every frame's fingerprint.
- **Other cuts** (input props read by `src/fx/mode.ts`): `--draft` (the animatic: `Scenes` skips motion
  blur) and `--platform=tiktok` (`Grain` off, `Dust` at half). A TikTok cut keeps its chunks apart
  (`out/chunks/<comp>@tiktok`), so it doesn't push out the YouTube render's.
- **The TikTok cut** (`vk.py final --platform tiktok`, `render.TIKTOK`): TikTok re-encodes every upload
  hard and smears fine noise first, so: no grain, half the dust, encoded at CRF-12 quality (NVENC cq 19,
  capped at 20 Mbit/s: about twice the YouTube file's bitrate, e.g. 12.4 vs 6.6 Mbit/s for a 32 s Short,
  rendered in under 2 min) and a light luma-only sharpen (unsharp 5×5, 0.4). It keeps the same picture otherwise; one
  set of safe zones covers both apps. Upload it as it is (on the phone app,
  turn on high-quality uploads if it offers it) and mark the AI-generated content when the voice is AI.

## Gemini pictures (only when the brief said so)

Use an image-generation tool such as Gemini (Nano Banana), and only with the user's yes. A method that
works: ask for 3×3 sheets of poses / props / backgrounds per character, key out the background and cut
each sheet into aligned transparent PNGs. Cache the sheets and pin the model each one was made with, so
they aren't regenerated and re-billed when the tool's default model changes. If a model won't take an
`image_size` setting, ask again at its default size. Then `CHARACTERS` / `PROP_DIRS` in build.py bring the
pictures into the project.
