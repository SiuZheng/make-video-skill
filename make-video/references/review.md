# Reviews: the reviewer agent and the checklist score

The user doesn't want to be the approval gate at every stage. They want a finished video they can be proud
of. The rule: the questions you'd ask them along the way go to another agent, which also reviews the
video, and they get the video only when it scores 9-10/10.

This file says how to run that so the score means something. An early Short showed what goes wrong
otherwise. A fresh, "strict" reviewer every round, judging against "the best Shorts on YouTube", went 7,
7, 7.5, 7.5, 7.5, 7.5 over six rounds:
- it took points off for things no round was allowed to change (the AI voice, the mascot's style);
- it gave no credit for fixes, because it had never seen the earlier version;
- each new reviewer undid the last one's taste. Round 5 removed a close-up, and round 6 asked for it back.

Two later Shorts showed the opposite problem. Both scored 20/20, yet many real viewers swiped away in the
first seconds: the hook item passed a twist that landed at 2-3 s. Item 1 is stricter since then;
`references/channel-numbers.md` holds the user's own channel numbers.

Another Short scored 20/20 and was then called too plain once it was watched in motion: the world stayed
static and only a few things moved. Contact sheets hide stillness: every frame looked rich, but between
frames only the character and the labels moved. Item 7 judges motion from consecutive frames since then
(see "How to watch").

## Who decides what

| Decision | Who |
|---|---|
| The brief (format, voice, look, characters, assets, music) | the user |
| The draft (plan.md) | the reviewer first, then the user approves it (with the reviewer's score) |
| A new narration voice | the user, by ear. Agents can't hear, so the reviewer never picks a voice. The default voice (Kore at 1.2) needs no question |
| Style frames, design choices along the way, the title | the reviewer |
| The animatic and the final cut | the reviewer, by the checklist |
| Anything that costs money beyond the approved draft (new Gemini pictures), posting, anything public | the user |
| Whether the final is good | the user, watching it with sound. Say so when you deliver: the reviewer judged the sound by meters only |

## One reviewer for the whole video

- **Spawn it once,** at the draft review (Agent tool, general-purpose). Save its id in
  `out/review/reviewer.txt`.
- **Continue that same agent** with SendMessage for every later question and review. It then remembers what
  it asked for and can compare versions. (SendMessage may be a deferred tool: load it with ToolSearch.)
- **Keep a record:**
  - each reply goes in `out/review/<stage>-r<N>.md`;
  - each score gets one line in `out/review/scores.md` (stage, round, total, file).
- **If the agent is gone** (a new session, a context reset), spawn a new one. Give it `scores.md`,
  `decisions.md` and the latest reply, so it carries on instead of starting cold.
- **Give it the files, not your conclusions:**
  - plan.md, script.md and youtube.md;
  - the video, and the previous version;
  - `out/qa/<comp>_checks.md` (the automatic checks) and `decisions.md`.

  Never give it your own review notes, plan_v*.md "as built" notes or chat summaries. They anchor it.

## The checklist (10 items, 0-2 each: 20 = 10/10)

Score what this video can change.
- **2:** strong. A viewer wouldn't want anything changed, judged against what this channel's tools make:
  code-drawn animation in Remotion, a Gemini AI voice, the character sprites. Don't judge against a studio with
  animators and voice actors.
- **1:** it works, with one specific weakness. Name it and the fix.
- **0:** broken or missing.

Things only a different toolset or channel style would fix (another voice, a new mascot style, the caption
template) go under **Channel notes** and don't lower the score.

| # | Item | 2 means |
|---|---|---|
| 1 | Hook | Shorts: the surprise itself (the twist, the payoff or the viewer's challenge) is seen and heard by 1.0 s. Frame 0 is an action with a sound. The first frame is bright and readable at phone size. No setup line, number, instruction or "Fun fact:" opener (draft.md, "The first 3 seconds"). If the big moment lands after 1.5 s, the score is 1 at most. A long video gets 3 s. A scroller would stop. |
| 2 | One clear idea | After one watch, a viewer could say the takeaway. Every beat serves it, and no fact is told twice. |
| 3 | Accuracy | Every number, direction, scale and on-screen word is right and matches the narration. Nothing is misleading. |
| 4 | Pacing | No pause in the voice over ~0.7 s unless it's a deliberate beat. Something new on screen every 2-3 s, and about every 0.5 s in a Short's first 3 s, with no near-empty frame there. No stretch that sits still, and nothing too quick to read. |
| 5 | Visuals explain | Each line has a picture that shows it, not just decorates it. The key idea is visible, not only said. |
| 6 | Readable | Text is 44+ px in a Short (30+ in a long video), high contrast, inside the safe zones, never overlapping, and on screen long enough to read. |
| 7 | Polish | Motion is eased and motivated. Light comes from one consistent direction, from a source you can see (glare, lamp, glints). Transitions are clean. No glitches, pops, uncovered edges or frozen frames. The character acts in the scene. **Every shot is alive:** the camera moves (at least a drift), there's parallax depth, and something besides the character moves. One shot where only the character or a label moves makes this item 1 at most, and an automatic "background sits still" note that stands is a 1. |
| 8 | Sound | The voice is clear, about 12 dB over the music. Every event has a sound. -14 LUFS, true peak at or under -1 dBTP, no clicks. Judged from measurements. |
| 9 | Ending | It lands a payoff and gives a reason to comment. A Short's loop seam can't be seen or heard. |
| 10 | Personality | The script sounds like someone (a "you", a surprise, a joke or an opinion), not a textbook. The character's acting adds to it. |

**What gets scored at each stage:**
- **The draft:** all 10 from plan.md and script.md. Items 4, 6, 7 and 8 are scored as planned: does the
  plan cover them? For 7, every scene row must name its camera move, its depth layers, its visible light and
  what else moves besides the character. The result is a projected score.
- **The animatic:** everything except 7, since the polish comes later. Still list any shot that sits still
  (only the character moves) under "anything in the plan to change now". Camera moves and depth layers are
  structure, not polish.
- **The final:** all 10.

**Pass (deliver):** 18/20 or more (9/10), no item at 0, and no open defects.

## What the reviewer sends back

- **Defects:** things that are objectively wrong, worst first, with timestamps. Wrong facts or directions,
  text under the buttons or overlapping, uncovered edges, sync slips, a loop seam. Always fix these,
  whatever the score.
- **The scorecard:** each item's score, one line why, and the total. Every item under 2 gets a concrete fix:
  what, where and how, ranked by how much it would help.
- **Channel notes:** points about the channel as a whole. Not scored. You pass them to the user when you
  deliver.
- **From the second round:** each item marked better, same or worse than the previous version.
- **What it couldn't judge.**

## The decision log (`out/review/decisions.md`)

Every suggestion you take or turn down gets one line: what, the round, and why. For example:

- `final r1 #4: hold the key number 1.2 s - done`
- `final r2 #7: drop the close-up in shot 5 - kept: it's the only shot that shows the key detail`

The reviewer reads the log each round and reopens a decision only when it causes a defect. This is what
stops the round-to-round drift.

## Rounds and when to stop

- **The draft:** one review. Fix what the draft can fix, then show the user the draft with the reviewer's
  projected score and its hook pick.
- **The animatic:** one review, plus a second only if the first found structural problems (the hook, the
  order, dead stretches). Fix the timing before the polish.
- **The final:** up to 3 rounds. After each round:
  1. fix every defect, then the top-ranked fixes;
  2. log the decisions;
  3. render (`vk.py final` keeps the previous version as out/<slug>-vN.mp4);
  4. run `vk.py qa --auto`;
  5. send the reviewer the new version and the previous one to compare.
- **Stop** when it passes. Also stop after round 3, or earlier when a round finds no new defects and the
  score didn't rise. Then deliver the best version with:
  - the scorecard,
  - what's still under 2 and why,
  - the channel notes.

## How to watch (the reviewer reads this)

- **Tools:**
  - ffmpeg is on PATH.
  - Python 3.11 has PIL, numpy and scipy.
  - Use the Read tool to view images.
  - Use Bash. Write longer scripts to files: on Windows, multi-line `python -c` breaks in the shell.
- **Where to work:** scratch output goes in `<project>/out/review/` (create it). Change no other file, and
  install or download nothing.
- **Start from the automatic checks** (`out/qa/<comp>_checks.md`). Confirm or dismiss each flag: they're
  measurements, not verdicts.
- **Watch it properly:**
  - contact sheets every 0.25-0.5 s with timestamps;
  - full-resolution frames at the busiest moments;
  - 10-12 consecutive frames around every transition and fast move, to judge motion;
  - **for each shot, two frames 1 s apart side by side** (or the checks' "background sits still" notes). A
    sheet makes a still shot look rich. If the sky, the ground and the background are the same in both
    frames, the shot sits still.
- **As on a phone.** In a Short, YouTube's and TikTok's UI covers:
  - the top ~140 px (search, camera);
  - the right ~140 px from mid-height down (the buttons);
  - the bottom ~380 px (the title and channel name).

  Check text size, contrast, clutter, how long text stays up and how fast things change.
- **The science:** check what's on screen against the narration, including directions and motions
  (rotation and orbit directions, where the Sun rises, whether counters match the picture).
- **The sound, which you can't hear:**
  - judge it from measurements: ffmpeg ebur128 and astats, loudness over time, and the voice against the
    music in 250 ms windows (word timings are in src/timeline.json, on the story clock: divide by `speed`);
  - check the loop seam in the sound;
  - say plainly what you couldn't judge by ear.
- **The opening strip (Shorts):** read `references/channel-numbers.md` first; it has the channel's real
  stay rates and what the weak openings had in common (once the user has filled it in). Then put the frames at 0, 0.25, 0.5, 1, 1.5, 2 and
  3 s side by side and judge them at phone size: when does the surprise land, does frame 0 move and make a
  sound, is the first frame bright, does anything sit still? At 30 fps:
  `ffmpeg -i <video> -vf "select='eq(n\,0)+eq(n\,8)+eq(n\,15)+eq(n\,30)+eq(n\,45)+eq(n\,60)+eq(n\,90)',scale=300:-1,tile=7x1:padding=6:color=white" -frames:v 1 -fps_mode vfr out/review/opening.jpg`
- **Judge** the hook (by the strip: the first second), the pacing (dead time, stretches with nothing new)
  and whether the loop works.

## Prompts

Fill in the `<...>`s (`<skill>` is this skill's folder, e.g. `~/.claude/skills/make-video`, as a full
path) and keep each to what the stage needs.

**Spawning it, with the draft review:**

```
You're the reviewer for one YouTube <Short | long video> on <channel> (<what the channel is, its views>),
from the draft to the final cut. Over the next hours you'll be asked to review this draft, choose between
options (style frames, design choices, the title), review an animatic, and score the final cut round by
round until it passes. Keep your judgments consistent from one step to the next. The decision log
(<project>/out/review/decisions.md, once it exists) lists what's settled.

First read <skill>/references/review.md, sections "The checklist" and "What the reviewer sends back",
then <skill>/references/channel-numbers.md (the channel's real stay rates) and
<skill>/references/draft.md, "The first 3 seconds". Score by that checklist. 2 means strong for what this channel's tools make,
not compared with studios. Anything only a different toolset or channel style would fix goes under Channel
notes and doesn't lower the score.

Now the draft: <project>/plan.md and <project>/script.md. Read no other notes. Check every fact against
good sources. Send back:
1. Defects, worst first.
2. The scorecard: all 10 items (4, 6, 7 and 8 as planned), one line each, and the projected total. For
   each item under 2, the change to the draft that would make it a 2.
3. The hook: pick one of these, or write a better one: <2-3 options, each a first line plus a first frame>.
4. Channel notes.
Keep it under about 600 words.
```

**A choice along the way:**

```
A choice for you (<stage>): <the question>. Options: <paths, one line each>. Pick one, say why in a line
or two, and say anything you'd change. The decision log has what's settled.
```

**The animatic:**

```
The animatic is ready: <project>/out/<comp>_animatic.mp4. It's half size with no motion blur yet; the
polish comes later. Judge the hook, the timing, the clarity and the sound. The automatic checks are in
out/qa/<comp>_checks.md. Watch it as review.md's "How to watch" says. Send back:
- defects;
- the scorecard for every item except 7, with fixes ranked;
- anything in the plan to change now, before the polish.
```

**The final, round 1:**

```
The final cut: <project>/<Title>.mp4 (<size>, <length> s<, made to loop>). The automatic checks are in
out/qa/<comp>_checks.md; the description and tags are in youtube.md. Send back:
1. Defects, worst first, with timestamps.
2. The full scorecard and the total out of 20.
3. A ranked fix for each item under 2.
4. The title. Keep "<working title>" or pick a better one: at most 60 characters, true to the video, and
   it makes people tap. Add 2 alternatives with a line each.
5. Channel notes.
6. What you couldn't judge.
Keep it under about 700 words.
```

**The final, round N:**

```
Round <N>: <project>/<Title>.mp4. The previous version is out/<slug>-v<K>.mp4. What changed: <list>; the
decision log has why. For each item, say better, same or worse than the previous version, and give the new
score. Then: defects, the fixes for anything still under 2, and anything new. Don't reopen a logged
decision unless it causes a defect.
```

## Delivering

Tell the user, in a few lines:
- the final score (and the earlier ones);
- what's still under 2, if anything;
- the reviewer's channel notes, as things they might change about the channel (their call);
- that the reviewer couldn't hear the video. Their own watch with sound is the last check.
