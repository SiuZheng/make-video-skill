---
name: make-video
description: >-
  Make a YouTube video end to end with the videokit toolkit (Remotion, code-drawn animation, Gemini voice). Asks the brief first (long 16:9 or Short 9:16, narration voice, look, how the characters and every other asset are made - drawn in code, emoji or Gemini-generated - and music), writes a full draft of the story and every scene's transitions, animation, lighting, sound effects and quality for approval BEFORE building anything, then records the voice, builds the timeline, music and mix, animates with the pro-look effects library, checks it automatically and with a reviewer agent that scores the draft, an animatic and the final cut against a fixed checklist, and renders 1080p (plus a TikTok cut) with the upload sheet. Use this whenever the user wants a new video, explainer, Short, animation, MV or lyric video made, or wants to turn an idea or a script into a video, even if they only say make a video about X, can you animate this, or do a short on Y. Not for advice questions about YouTube or ideas only - those get an answer in words.
---

# Make a video

The user makes YouTube videos with you: long explainers (16:9) and Shorts (9:16), animated in code with
Remotion, narrated by a Gemini voice, often starring a character sprite. This skill is the whole
process. The tools live in `<videokit>`, the videokit folder of this skill's repo (read
`references/toolkit.md` before running anything). If `<videokit>` hasn't been replaced with a real path,
ask the user where they cloned the repo (the folder holding `vk.py`), and use that path.

The user cares most about three things, and they're why the process is shaped the way it is:

1. **Nothing gets built before they approve a draft.** They want to see the story and exactly how every
   scene will look and sound - its transitions, animation, lighting, sound effects and quality - first.
   Changing a plan costs minutes; changing a render costs hours.
2. **It has to look professional.** Motivated transitions with motion blur, eased motion, depth, real
   lighting, a sound for everything that happens, clean 1080p. `references/pro-look.md` says what that
   means in practice and which components do it.
3. **They want the finished video, not a stream of questions.** A reviewer agent answers
   the questions along the way and scores the work against a fixed 10-item checklist; the user gets the video
   once it scores 9/10. `references/review.md` is how: who decides what, the checklist, the prompts, and when
   to stop. Reviews come early (the draft, the animatic), when changes are cheap, not only at the end.

## The stages

Each ✋ is a stop: wait for the answer before carrying on. **✋ user**: the user decides. **✋ reviewer**: the
reviewer agent does (one agent for the whole video, continued with SendMessage - review.md).

### 0. The brief ✋ user

Ask what you can't tell from the request, with AskUserQuestion (up to 4 questions per call; a second call
for anything left). Don't assume any of these, even when the topic makes one likely:

- **Format:** long video (16:9, 1920×1080) · Short (9:16, 1080×1920, under 3 min) · both (a long video
  plus 3-5 Shorts cut from it).
- **Narration:** AI voice (Gemini TTS; you'll send samples) · no narration (music + words on screen) · the
  user's own recording.
- **Look:** offer 3-4 concrete styles that suit the topic (e.g. cinematic code-drawn space with real light;
  clean flat motion graphics; hand-drawn doodle; storybook paper cut-out), each described in a line.
- **Characters:** their existing character sprites (in `<videokit>/sprites`; `python vk.py characters` lists
  them) · new characters generated with an image-generation tool such as Gemini (Nano Banana, costs money) ·
  emoji · drawn in code · none.
- **All the other assets** (props, objects, icons, backgrounds) - ask this separately, every time: drawn in
  code (free; the effects library's look) · emoji (free; the `Emoji` component, lit like everything else) ·
  generated with an image-generation tool such as Gemini (costs money) · a mix, decided asset by asset in the
  draft. Ask it on every video. Generated pictures are only ever made when the user picked that here.
- **Music:** an original score (mood: wonder / tension / playful / epic) · a score composed note by note for
  this video (a theme, chords and hits synced to the scenes - toolkit.md "A composed score") · their own
  song (they send the audio and lyrics - never download it) · none.

Also settle the topic, the length and the language if they aren't clear. Then make the project:
`python -X utf8 vk.py new <folder> --title "..." --format long|short|both` (from the videokit folder; the
project is made next to it).

### 1. The draft ✋ reviewer, then ✋ user

Research the topic (check every fact; note anything that depends on today's date), write `script.md`
(the narration, one recorded line per "> " line), then write `plan.md` from the template already in the
project. `references/draft.md` explains each section. The heart of it is the scene-by-scene table: for
every shot, the narration, what we see (and what the character does in it), the camera and animation, the
transition in and out, the lighting and colour, the sound effects and the music. Plus the look, motion,
lighting, transition and sound plans, the quality specs, the Shorts (if "both"), facts with sources, and
the cost. Write 2-3 hook options too (each a first line and a first frame). For a Short they follow
draft.md's "The first 3 seconds": the surprise by 1 s, an action with a sound at frame 0, a bright first
frame. Real Shorts numbers show views are won or lost there; the user's own go in
`references/channel-numbers.md`.

**The draft review:** spawn the reviewer with plan.md and script.md (review.md, "Spawning it"). Fix every
defect it finds and whatever the draft can fix for the items it scored under 2; take its hook pick into the
draft; log what you took and didn't in `out/review/decisions.md`.

Then show the user: a short summary in chat (the story in a few lines, the scenes as a compact list,
anything you need them to decide, and the reviewer's projected score in one line) with a link to `plan.md`.
Ask for approval or changes, revise, and repeat until they say go. Do not record, generate or animate
anything before that - this is the user's rule.

### 2. Voice (if narrated)

- The default voice (video.json: Gemini "Kore" at `speed` 1.2) needs no question. A new voice or
  style: `vk.py voice samples` → send the samples (SendUserFile) → ✋ user: they pick by ear (agents can't
  hear, so this one never goes to the reviewer). Set it in `video.json`, with `speed`.
- `vk.py voice record` (cached; identical lines are reused from other projects for free), then
  `vk.py words` (word timings + a check that each line says what the script says; listen to any it flags).
- Gemini 402 = the prepaid credits ran out: stop and tell the user.

### 3. Look ✋ reviewer

- Make every asset the way the approved draft's asset list says (code, emoji, Gemini or existing):
  - existing sprites go in `CHARACTERS` / `PROP_DIRS` in `scripts/build.py`;
  - generated (only if approved): an image-generation tool such as Gemini (Nano Banana), cut into
    transparent PNGs and brought in the same way (toolkit.md, "Gemini pictures");
  - emoji: `<Emoji char="🚀" .../>` (fx/emoji.tsx) with the scene's rim light and a contact shadow;
  - code: drawn in the scene with the fx library (LitSphere, Sun, shapes, DrawPath...).
- Build 3-4 **style frames** - the key moments of the draft, fully lit - as a contact sheet
  (`vk.py stills ...`) and send it to the reviewer ("A choice along the way"): approve the look or say what to
  change. Log the answer.

### 4. Build

1. `scripts/build.py`: fill in from the draft - pauses, cues (`c.at(line, 'phrase')`), `MOVES` (how each
   section arrives), `effects()` (a sound for every event), `music()` (mood, intensity arc, accents - or the composed score),
   `ambience()`, the YouTube text. Run `vk.py build`.
2. Scenes: one file per scene in `src/scenes/`, written in story seconds against the cues, using `src/fx`
   (camera, depth layers, lighting, particles, kinetic text, the character's track). List them in
   `src/Video.tsx` with their transitions. Keep the character inside the action (standing on, riding,
   pointing at, reacting to what's on screen) - a character just floating around reads as filler.
   Block every shot out first - placed, timed to its cues and moving - before the lighting and the
   richness pass. Moving means more than the character: from the blocking on, each shot has a camera that
   drifts or travels, `CamLayer` depth bands and something else in motion. A Short that scored 20/20 with a
   still world behind the character was still called too plain once it was watched in motion.
3. **The animatic ✋ reviewer:** `vk.py animatic` renders the whole video at half size with its real
   sound and no motion blur (about 1.5 min for a 30 s Short) and runs the pacing checks on it. Send it to the
   reviewer (the animatic prompt). Fix the hook, the timing and the clarity now, before the polish.
4. Shorts (if "both"): specs in build.py via `kit.shorts.build`, a scene per Short in `src/shorts/`.
5. Richness pass: go shot by shot against "Make it rich" in `references/pro-look.md` and add effects wherever
   a shot is plain. Each shot needs:
   - a background with depth;
   - a light you can see;
   - the subject sitting in the world;
   - something in front;
   - a camera that never locks;
   - background life;
   - the finish;
   - the sound.

   Every video should feel rich, so this is part of the job, not an extra. Keep the restraint
   rules so it stays clean, and keep effects off the text.

### 5. Check (loop until clean)

`vk.py qa` renders every cue and every transition midpoint into contact sheets (`out/qa/`) and then runs the
**automatic checks** → `out/qa/<comp>_checks.md`: text under YouTube's/TikTok's buttons and titles, smaller
than 44 px, overlapping or running off the frame (measured on the page itself); and on the newest render,
stretches where the picture barely changes, shots where the background sits still (under 25% of the frame
moving), gaps in the voice, uncovered strips along the frame's edge, the loop seam and the loudness. Fix every problem it lists, and look at each "worth a look". Then go through
the sheets against the checklist in `references/pro-look.md` - transitions mid-way, lighting direction, the
character in the scene, no plain frames (anything that looks flat or empty gets enriched) - fix, and run it
again (`vk.py qa --auto` reruns only the checks, about a minute). Do a short test render
(`vk.py render --frames 0-150`) to see real motion and the render speed before the full render. Renders
reuse every 4 s chunk whose frames didn't change, so after a fix just run the render again (`--fresh` only
after changing a canvas drawing or swapping a video file).

### 6. Final ✋ reviewer

- `vk.py final` (and `vk.py final --comp Short-<id>` for each Short): 1080p H.264, backed up as v1/v2...,
  checked for size, fps, codecs, -14 LUFS and true peak. No phone-preview or 720p copies - deliver only the
  1080p file. Then `vk.py qa --auto` on it.
- **The final review** (review.md, "Rounds and when to stop"): the reviewer scores it on the checklist and
  picks the title. Fix the defects and the top-ranked fixes, log the decisions, render again, and send the
  new version with the previous one to compare. It passes at 18/20 with no item at 0 and no open defects;
  stop after 3 rounds, or sooner when a round finds nothing new and the score holds.
- **TikTok** (Shorts, when the user posts them there too): `vk.py final --platform tiktok` → "<Title>
  (TikTok).mp4": no grain, half the dust, a higher bitrate and a light sharpen, because TikTok re-encodes
  every upload hard.
- Thumbnail (`src/Thumbnail.tsx` → 1280×720 jpg), `captions.srt`, `youtube.md` (title, description with
  chapters, tags, the AI-voice disclosure); `shorts.md` for Shorts.

### 7. Deliver

Send the finished video with SendUserFile when it's under ~30 MB (Shorts usually are); otherwise give the
clickable path (the TikTok cut is usually bigger: give its path). Summarise what's in it scene by scene and
how it checked out: the reviewer's final score (and the earlier rounds), anything still under 2, the
reviewer's channel notes (things about the channel as a whole - their call), and that the reviewer judged
the sound by meters only: their own watch with sound is the last check. Add the upload notes. Then save or
update a project memory note (what was made, where, decisions the user made). When the user later asks how
a posted Short did, add its row to `references/channel-numbers.md`.

## Rules that always apply

`references/house-rules.md` has the standing rules - read it once per video. The short version:
never print the API key; no Gemini images without a yes; never download songs or put other artists' lyrics
on screen; "just asking" questions get answers, not builds; draft before building; 1080p only; the reviewer
answers the stage questions, while the brief, the draft, a new voice, money and anything public stay with
the user.

## References

- `references/review.md` - the reviewer agent: who decides what, the 10-item checklist, the prompts for
  each stage, the decision log, and when to stop.
- `references/draft.md` - how to write the draft (plan.md) and present it, including the first-3-seconds
  rules for Shorts.
- `references/channel-numbers.md` - a template for the user's own YouTube stats (stay rate per Short, what
  each opening did) and how to read Studio.
- `references/pro-look.md` - the professional standard: transitions, animation, lighting, particles, type,
  sound, quality checks, render performance, and the components for each.
- `references/toolkit.md` - videokit commands (the automatic checks, the animatic, the TikTok cut), the
  project layout, the story clock, build.py hooks, Shorts, music videos, Windows gotchas.
- `references/house-rules.md` - the standing rules and why.
