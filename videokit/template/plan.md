# [Title] - the draft (v1)

*Everything this video will be, for you to approve or change before anything is built. Nothing below is
made yet.*

## 1. The brief

| | |
|---|---|
| Format | Long video, 16:9, 1920×1080 · or Short, 9:16, 1080×1920 · or both (long + Shorts cut from it) |
| Length & pace | about N min · narration at ~150 words a minute (speed 1.2) |
| Who it's for | ... and what they get from watching |
| Narration | AI voice: [name] (Gemini 2.5 Pro TTS, about N lines) · or none (music + words on screen) · or your recording |
| Look | [the style in a few words] |
| Character | [existing sprites: name, poses] · or new ones made with Gemini (only if you said yes) · or emoji · or drawn in code · or none |
| Other assets | props, icons, backgrounds: drawn in code · or emoji · or made with Gemini (only if you said yes) · or a mix (see section 12) |
| Music | original [mood] score · or your song (you send the audio + lyrics) · or none |

## 2. The story

**Logline:** one sentence.

**Hook (first 3 seconds):** what we see and hear that stops the scroll.

**Shape:** set-up → build → turn → payoff → ending (for a Short: the ending loops back into the start).

1. **[Section]** - what happens and why it matters.
2. ...

## 3. Scene by scene

Every row names its camera move (never locked), its depth layers, what moves besides the character, and a
light you can see. The user called a Short whose world sat still behind the character "too plain".

| # | Time | Narration / words on screen | What we see (and what the character does; what else moves) | Camera & animation | In → out | Lighting & colour | Sound effects | Music |
|---|---|---|---|---|---|---|---|---|
| 1 | 0:00-0:08 | "First line..." | ... ; behind her, a comet crosses and the planet's clouds drift | slow push-in with drift; CamLayers: stars 0.08 / far range 0.3 / ground 1 / boulders 1.5; crash zoom on the reveal | cut → zoomThrough | cool blue key from top left (sun glare + flare off frame), rim light, glints, vignette | sparkle as it appears, whoosh into the cut | wonder, quiet (pad only) |
| 2 | ... | | | | | | | |

## 4. Look

- **Palette:** 3-5 colours (hex) and where each is used; one accent colour for numbers and key words.
- **Type:** Inter; sizes (titles ~110 px, labels 36-44 px, captions 70 px on Shorts); dark outline on everything over pictures.
- **Art:** what is drawn in code, what is a sprite or prop picture, what (if anything) Gemini makes.
- **The character:** how she's part of each scene (standing on things, riding them, pointing, reacting) - never just floating on top.

## 5. Motion

- Easing: arrivals ease out (fast, then settle), exits ease in, camera moves ease in-out; nothing linear.
- Staggers: lists and words arrive 60-100 ms apart.
- Squash and stretch on the character's pose changes; overshoot on things popping in.
- Every shot that moves has 3+ depth layers (far / subject / near) for parallax, plus a slow drift so no frame is frozen.
- Holds: let each new fact sit ~1.5 s before the next move; no still frame longer than ~3 s.

## 6. Lighting

Per scene: where the key light comes from, what glows (bloom), any god rays / lens flare / light leak,
the colour grade, vignette strength. One light direction per scene; characters and props get a rim light
from it; contact shadows where things stand.

## 7. Transitions

The vocabulary for this video and where each one is used, and why (a pull back to reveal something bigger
= zoom; going "into" something = zoomThrough; a revelation = flash or leak; side by side = push...).

## 8. Sound

- **Music:** mood, how loud / full it is through the video (the arc), where it swells, where it drops out, accents.
- **Sound effects:** the palette (whoosh, swish, riser → impact, shimmer, sparkle, plip, tick, chime, thump...) and the moments that get one. Every visible event has a sound.
- **Ambience:** beds under scenes (space hum, wind, sea, night).
- **Mix:** voice on top; music ducks under it; -14 LUFS; true peak under -1 dBTP.

## 9. Quality

| | |
|---|---|
| Video | 1920×1080 (Short: 1080×1920), 30 fps (60 if there's a lot of fast motion), H.264 at CRF-16 quality |
| Audio | AAC, -14 LUFS integrated, true peak ≤ -1 dBTP |
| Text | ≥ 44 px in a Short (≥ 30 px in a long video), inside the safe area (Shorts: clear of the top bar and of YouTube's/TikTok's buttons at the bottom and right) |
| Motion | motion blur on fast moves; transitions checked frame by frame at their midpoints |
| Checks | `vk.py qa`: contact sheets at every cue and transition + the automatic checks (text, still stretches, voice gaps, edges, loop seam, loudness); the reviewer agent's checklist on the draft, the animatic and the final (pass: 18/20) |
| Delivery | the 1080p file, captions.srt, thumbnail, youtube.md (title, description, chapters, tags); a Short also gets its TikTok cut |

## 10. Shorts (if both)

| # | Hook header | Lines it uses | Visual idea | Length |
|---|---|---|---|---|

## 11. Facts & sources

Each claim and where it's from; anything that depends on the date.

## 12. Assets & cost

| Asset | Made how | Where it appears | Cost |
|---|---|---|---|
| [the character] | existing sprite · Gemini · emoji · code | scenes 1-6 | free / ~$ |
| [a prop, e.g. the rocket] | drawn in code · emoji 🚀 · Gemini | scene 3 | free / ~$ |

Gemini voice: about N lines (a few cents). Gemini pictures: only the ones above marked Gemini, and only
if you said yes. Render time: about N minutes on the GPU (~3-3.5 s of rendering per second of video when
every shot is richly lit, 0.5-2 s for a typical mix); after that, fixes re-render only the chunks they change.

## 13. Questions for you

- ...
