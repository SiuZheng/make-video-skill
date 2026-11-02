# make-video

A [Claude Code](https://claude.com/claude-code) skill and the toolkit behind it for making YouTube videos
and Shorts end to end: a narrated, code-animated video in 1080p (16:9 or 9:16), with a TikTok cut and an
upload sheet. You give Claude a topic, and the skill takes it through the whole process.

1. **The brief.** Format, voice, look, characters, assets and music.
2. **The draft** (`plan.md`). Every scene's picture, camera, transitions, lighting, sound and music. A
   reviewer agent scores it first, and nothing is built until you approve it.
3. **The voice.** Gemini TTS, cached per line, then word timings with faster-whisper.
4. **The build:**
   - a timeline on a "story clock";
   - sound effects for every event;
   - an original or note-by-note composed score;
   - a mix mastered to -14 LUFS.
5. **The animation.** [Remotion](https://www.remotion.dev) scenes with an effects library:
   - transitions with motion blur;
   - a camera and parallax depth layers;
   - textured light (glows, god rays, lens flares, film leaks);
   - particles, kinetic type and a character system;
   - an old-TV archive look and comic sound words.
6. **The animatic.** A fast, half-size render the reviewer checks for the hook, the pacing and the clarity.
7. **The checks.** Contact sheets plus automatic checks:
   - text in the platform safe zones, big enough and not overlapping;
   - still or "sits still" stretches;
   - gaps in the voice;
   - uncovered edges;
   - a clean loop seam;
   - loudness.
8. **The final.** A chunked GPU render that only re-renders the 4 s chunks that changed. The reviewer scores
   it on a 10-item checklist, and it's delivered at 18/20. Then come the TikTok cut, captions and
   `youtube.md`.

## What's here

```
make-video/   the skill: SKILL.md and references/ (review checklist, draft guide, the "pro look" standard,
              the toolkit manual, house rules, a channel-numbers template)
videokit/     the toolkit: vk.py (the command line), kit/ (Python: voice, words, timeline, sound, captions,
              qa, render...), template/ (the Remotion project every new video starts from), assets/
```

## Setup (Windows)

The toolkit was built and tested on Windows 10 with an NVIDIA GPU. It falls back to the CPU without one.

1. **Install the programs:**
   - Claude Code;
   - Node.js 18+;
   - Python 3.11;
   - [ffmpeg](https://ffmpeg.org/download.html), on your PATH.
2. **Clone this repo** wherever your videos should live. New projects are created next to the `videokit`
   folder, so inside this repo's folder; `.gitignore` keeps them out of git.
3. **Install the Python packages:**
   `pip install -r videokit/requirements.txt`
4. **Add the two free third-party files.** They aren't in the repo because of their own licences:
   - **The font:** [Inter](https://github.com/rsms/inter/releases) (the variable TTF), saved as
     `videokit/template/public/fonts/Inter.ttf`.
   - **The SoundFont** for the scores: [GeneralUser GS](https://schristiancollins.com/generaluser.php),
     saved as `videokit/assets/GeneralUser-GS.sf2`.
5. **Set your Gemini key:** a `GEMINI_API_KEY` environment variable, from
   [Google AI Studio](https://aistudio.google.com/apikey). Voice lines cost a few cents each; generated
   pictures cost more and are only made when you say yes.
6. **Install the skill:** copy `make-video/` into `%USERPROFILE%\.claude\skills\`. The docs write the
   toolkit's location as `<videokit>`. You can replace it with the full path of your `videokit` folder;
   if you don't, Claude asks you once.
7. **Optional, character sprites:** put them in `videokit/sprites/<name>/` (see `videokit/sprites/README.md`).
   Without them, characters can be drawn in code or made from emoji.

## Use

In Claude Code, ask for a video, for example *"make a Short about why the sky is blue"*. The skill asks the
brief questions, writes the draft for your approval, and then works through the stages. You can also run
the toolkit yourself; `python -X utf8 videokit/vk.py` lists the commands (`new`, `voice`, `words`, `build`,
`stills`, `qa`, `animatic`, `render`, `final`, `report`, `gpu`).

## Licences

- **This repo:** MIT (see `LICENSE`).
- **Remotion**, which renders the videos and is installed by npm in each project, has its own licence. It's
  free for individuals and for companies of up to 3 people; larger companies need a company licence. See
  [remotion.dev/license](https://www.remotion.dev/license).
- **Inter** (SIL Open Font License) and **GeneralUser GS** (its own free licence) are downloaded separately,
  under their own terms.
- **Gemini:** voices and pictures made with it are subject to Google's terms. Disclose AI voices and
  pictures where the platforms ask, which the upload sheet reminds you of.
