# The standing rules

They come from lessons learned on earlier videos; keep to them on every video unless the user says
otherwise.

- **Draft first.** No voice recording, image generation or animation until the user has approved plan.md
  (the story and every scene's transitions, animation, lighting, sound and quality), because rework after
  a render is slow.
- **The reviewer agent answers the questions along the way,** and the user gets the video only once it
  scores 9-10/10. One reviewer per video reviews the draft, the style frames, the animatic and the final, picks the
  title, and scores by the fixed checklist in review.md. Deliver at 18/20 (9/10); after 3 final rounds
  without it, deliver the best version and say what's blocking. The brief, the draft, a new voice (by ear),
  anything that costs money and anything public stay with the user.
- **TikTok too:** when the user posts their Shorts on TikTok as well, where uploads look blurry, deliver
  the TikTok cut (`vk.py final --platform tiktok`) beside the YouTube file.
- **Ask, don't assume,** in the brief: short or long, narration and voice, the look, how the characters and
  the other assets are made, the music.
- **Ask how every asset is made** - characters and all other assets (props, icons, backgrounds): drawn in
  code, emoji, or generated with Gemini. Ask it in every brief, and the draft lists each asset with its
  source.
- **Gemini pictures cost money** - only when the user said yes to generating them. Voice lines are expected
  once narration is approved (cents each; reuse cached lines).
- **Never print or paste the Gemini API key**, or write it to a file. It's in GEMINI_API_KEY (on Windows,
  also read from the registry).
- **"Just asking" means answer in words.** Questions about ideas, YouTube, money, or "how would you do X"
  get an answer, not a build. Build when they say go.
- **Songs:** never download songs from YouTube; the user supplies audio and lyrics. Never put another
  artist's lyrics on screen. For a Short with someone else's song, deliver the SFX-only cut; they add the
  song with YouTube's "Add sound".
- **1080p only:** deliver the 1920×1080 (or 1080×1920) file. No 720p "phone preview" copies.
- **Keep the old versions:** `vk.py final` moves the previous file to out/<name>-vN.mp4.
- **Every shot is alive.** A Short that scored 20/20 was still called too plain once it was watched in
  motion: the world sat still and only a few things moved. Lighting, effects and camera fixed it. Every
  shot gets:
  - a moving camera;
  - parallax depth;
  - a light you can see;
  - something besides the character moving.

  Build all of it from the first build, not as a fix after delivery (pro-look.md, "Make it rich").
- **The character is part of the story** - riding, standing on, pointing at, reacting to what's on screen;
  a character just floating around looks like filler.
- **Facts are checked**, sources listed in youtube.md, date-dependent facts flagged.
- **AI voice disclosure:** the description credits the AI voice; tick "altered or synthetic content".
- **Language:** if they ask for Chinese-only (or any language), every on-screen word follows it.
- **Image-generation tools** (such as Gemini's Nano Banana) are used only when the user says so.
- After finishing, update the project's memory note so the next session knows what exists.
