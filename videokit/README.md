# videokit

The toolkit behind every video: Python for the voice, timing, music, sound and checks; a Remotion template
with an effects library for the pictures. The process that uses it is the **make-video** skill
(`~/.claude/skills/make-video`): brief → draft (reviewed by a reviewer agent, then approved by the user before
anything is built) → voice → look → build → animatic (reviewed) → check → final 1080p render (reviewed until
it scores 9/10) + a TikTok cut + the upload sheet.

```
vk.py        the command line: python -X utf8 vk.py <command>   (new, characters, voice, words, build,
             stills, qa (contact sheets + automatic checks), animatic, render, final [--platform tiktok],
             report - see the top of the file)
kit/         config      paths, the API key (never printed), the specs a video must meet
             voice       Gemini TTS per line, cached and reused across projects; voice samples
             words       word timings (faster-whisper) and a check that each line was read right
             timeline    the story clock, line layout, word-accurate cues -> src/timeline.json
             sound       sound effects, original scores (4 moods), ambience, mastering to -14 LUFS
             captions    captions.srt        publish  youtube.md       art  sprites and props
             shorts      vertical Shorts cut from the narration        qa   stills, contact sheets, automatic
                         checks (text in the safe zones / size / overlaps; still stretches, voice gaps, uncovered
                         edges, loop seam, loudness on the render), spec checks
             render      renders, backups, the final file
template/    a new project: video.json, script.md, plan.md (the draft), scripts/build.py, and the Remotion app:
             src/fx (transitions with motion blur, camera, depth layers, lighting, particles, kinetic type,
             the character system, space), src/scenes, src/shorts, Thumbnail
assets/      GeneralUser GS soundfont (for the scores); make_fx.py - computes the light textures in
             template/public/fx (gaussian glow, volumetric rays, lens-flare parts, film leaks, fog, grain,
             the ink reveal), so light is smooth instead of banded CSS gradients
```

Renders run on the GPU when Chrome can use it (`vk.py gpu`: e.g. an NVIDIA card via Direct3D 11; ~5× faster
than Chrome's default software rendering, same output), falling back to the CPU if needed. `scripts/render.mjs` renders 4 s
chunks in three browsers at once and joins them without re-encoding, and only renders the chunks whose
frames changed since the last render (each frame is fingerprinted: `src/fx/fingerprint.ts`) - a 26 s demo
renders in 83 s instead of 150 s, a one-scene fix in 37 s, an unchanged video in 9 s. Finals capture
JPEG-100 frames (visually lossless, 30% faster than PNG), x264 slow, CRF 16, BT.709; `vk.py final --hq`
supersamples. Fast transitions and marked
camera moves get real motion blur.

Setup and the two files you download yourself (the Inter font, the GeneralUser GS SoundFont) are in the
repo's README. Character sprites go in `sprites/` (see sprites/README.md).
