# Writing the draft (plan.md)

The draft is the contract: the user approves it, then you build exactly that. It has to be concrete enough
that they can picture every shot and hear every sound - and that you can build it without guessing. The
template is in every new project (`plan.md`, from `<videokit>/template/plan.md`).

## Before writing

- Know the facts. Check numbers against good sources (NASA, ESA, papers, encyclopedias); write down where
  each comes from. Flag anything that depends on the date (e.g. "the probe reaches one light-day on
  <date>" changes tense once that day passes).
- Write `script.md` first: the narration is the spine. ~150 words a minute at speed 1.2. One "> " line per
  recorded clip (a sentence or two that belong together); "## " sections are chapters and the places the
  camera moves on.
- A hook in the first 3 seconds of a long video: a question, a surprising number, an image that doesn't make
  sense yet. Shorts follow the stricter rules below. Write 2-3 hook options (a first line and a first frame
  each); the reviewer picks one in the draft review.
- **The first 3 seconds (Shorts).** Real Shorts numbers show this is where views are won or lost: people
  who get past it watch most of the video (the user's own numbers go in `references/channel-numbers.md`).
  The plan's first rows must show each of these:
  - **The surprise lands by 1 s.** If there's a twist ("WAIT.", "…or"), it comes by about 1 s, or the first
    line is the twist itself. Shorts that held theirs to 2-3 s lost viewers.
  - **Frame 0 is an action with a sound** (a foot stomping into dust), not a still picture.
  - **The first line is under about 10 words,** and it's the payoff or a challenge to the viewer ("Can you
    find it?"). No "Fun fact:", no number, no setup line, no instruction ("Imagine you…").
  - **The first frame is bright and readable on a phone.** No dark, grainy or nearly empty frame. If the
    subject is tiny (a dot), zoom in on it or have the character point at it.
  - **In seconds 1-3, something changes about every 0.5 s,** with no near-empty frame.
  - **The header text states the hook,** and the ending loops back into the start. **Loop on an action**,
    not a calm scene, so frame 0 isn't quiet.
  - **Topic angle:** prefer "wait, what?" or "can you spot it?". A fact most of the audience already knows
    needs its twist inside the first second.
  - **A tryout, not yet a rule:** the character's face, big and reacting, in the first second. It isn't
    proven yet, so note the result in channel-numbers.md.
- Give it a voice: a "you", a surprise, an opinion or a joke - the reviewer scores "personality", and a
  textbook script reads as AI.

## Each section of plan.md

1. **The brief** - the answers from stage 0, in a table.
2. **The story** - a one-sentence logline, the hook, and the shape (set-up → build → turn → payoff →
   ending), one line per section on what happens and why it matters.
3. **Scene by scene** - the table. One row per shot (a section usually has 2-4 shots). Columns:
   - *Time* (film time, roughly) and *Narration* (or the words on screen).
   - *What we see* - the picture and what the character is doing in it (riding, pointing at, standing on,
     reacting to something on screen).
   - *Camera & animation* - the move (push in, pull back, track, whip, orbit, hold with drift; never a
     locked camera), how things arrive (stagger, pop with overshoot, rise from a mask), the parallax layers
     (which `CamLayer`s: far range, near range, ground, foreground), and what moves besides the character (a
     second figure, props, screen chrome). On the gag and reveal beats, name the camera's beat: a crash zoom,
     a punch-in, a dutch angle, a kick.
   - *In → out* - the transition at each end, chosen by meaning (see pro-look.md).
   - *Lighting & colour* - where the key light comes from and how you see it (the sun's glare and flare, a
     lamp's shafts, glints, flashes on impacts), what glows, rays / flare / leak, the grade.
   - The richness layers belong in these columns too: what's in the background, the foreground and the
     ambient motion of each shot (pro-look.md "Make it rich"). A draft whose rows each name only one
     object will look plain on screen - enrich it before showing it.
   - *Sound effects* - one for every visible event (a whoosh with the move, a riser into an impact on a
     reveal, plips as things appear, ticks with a counter...).
   - *Music* - mood and how full it is here (quiet pad → full), any accent.
4. **Look** - palette (hex), type sizes, what's drawn in code vs pictures, how the character is used.
5. **Motion** - the easing, stagger, squash/stretch, parallax and hold rules for this video.
6. **Lighting** - the light's direction and colour per section, what blooms, the grades.
7. **Transitions** - the vocabulary used and where, with the reason.
8. **Sound** - the music's arc, the sound-effect palette and where each goes, ambience beds, the mix target.
9. **Quality** - resolution, fps (30; 60 only for lots of fast motion, and it doubles render time), codec,
   loudness, text sizes and safe areas, the checks you'll run, what gets delivered.
10. **Shorts** (if "both") - 3-5, each: hook header, which lines, the visual idea, length.
11. **Facts & sources.**
12. **Assets & cost** - a table of every asset (characters, props, icons, backgrounds): how it's made
    (drawn in code / emoji / Gemini / existing sprite), where it appears, and its cost. Follow the brief's
    answer; where it was "a mix", propose the source per asset here. Then the costs: Gemini voice lines
    (cents), Gemini pictures (only if approved), and the render time (on the GPU: ~3-3.5 s of render per
    second of video when every shot is richly lit, 0.5-2 s for a typical mix; later fixes re-render only
    the chunks they change).
13. **Questions** - anything you need them to decide.

## Presenting it

First the draft review (review.md): the reviewer reads plan.md and script.md, checks the facts and scores
the checklist as planned. Fix its defects and what the draft can fix, and take its hook pick, before the
user sees it.

In chat: the logline, the story in 4-6 lines, the scenes as a compact numbered list (one line each:
what we see + the transition + the standout light/sound idea), the reviewer's projected score in one line,
the questions, and a link to plan.md for the full table. Ask "approve, or what would you change?". Revise
plan.md (bump "v2", "v3") until they say go. Keep the drafts short enough to read on a phone - the table
carries the detail.
