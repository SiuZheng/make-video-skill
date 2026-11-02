# Character sprites

One folder per character, e.g. `sprites/mascot/`. Each folder holds:

- **The pose pictures:** `<pose>.png`, all on the same transparent canvas, aligned so the feet sit at the
  same point.
- **A `manifest.json`:**

```json
{
 "width": 571,
 "height": 698,
 "baseline": 686,
 "centerX": 264.7,
 "poses": {
  "pose_01": "standing, waving at the viewer",
  "pose_02": "pointing up, surprised"
 }
}
```

- `baseline` and `centerX` are where the feet are on the canvas, in pixels. Scenes place a character by its
  feet.
- The pose descriptions are what Claude reads to pick poses: `python -X utf8 vk.py characters` lists them.

A project uses poses through `CHARACTERS` in its `scripts/build.py`, e.g.
`CHARACTERS = {'mascot': ['pose_01', 'pose_02']}`.

You can draw the sprites, export them from any tool, or generate a sheet of poses with an image model. That
costs money, so the skill only does it with your yes. Without sprites, the skill can draw characters in code
or use emoji.
