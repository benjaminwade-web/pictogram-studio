# Pictogram Studio: how to use it

Pictogram Studio turns one line ("why plane windows are round") into a short animated explainer for TikTok, Reels or Shorts. The pictures are drawn for that idea: characters, shapes, lines that draw themselves, counters, things that move, break and get stamped.

## The quickest way: give Claude the idea

In this project's chat, write `Video idea:` and one line. Claude researches it, writes the script, draws the animation for it, picks the look, times it, checks it and sends back a folder with:

- the video (silent MP4),
- `voiceover.txt`, the exact words to paste into ElevenLabs,
- `post.txt`, the caption, hashtags and three other first lines to test,
- `sources.md`, where every fact came from,
- `check-sheet.jpg`, one picture per scene,
- the project file, in case you want to change the words on the page.

The one step left for you is the voice. Paste `voiceover.txt` into ElevenLabs, download the MP3 and send it back. Claude fits every scene change to the pauses in the speech and returns the finished video with the voice on it.

Two finished examples: `videos/why-plane-windows-are-round/` (every picture drawn for the idea) and `videos/buffett-dug-for-fifty-years/` (a digging story that runs through the video).

## The page: five steps, top to bottom

Open `Pictogram Studio.html` (double-click it), or the Pictogram Studio page inside Claude.

1. **Your idea.** Type one line and press **Make my video**. Claude writes the first line, the scenes, the animation and the caption. Inside the page it cannot look anything up, so for ideas that need research use the chat route above. "More options" holds the format, the length, ready-made examples and "Suggest better first lines".
2. **Fix the words.** Click a scene under the preview and change its lines. Put `*stars*` around the words you want highlighted. "Picture, timing and order of this scene" holds everything else: which picture it uses, how long it lasts, and the buttons to add, move or delete scenes.
3. **Pick a look.** Click one of the seven styles and choose tall or wide. "Fine-tune the look" holds colors, fonts, the camera move between scenes, film grain and the rest.
4. **Add your voice.** Press **Copy the script**, paste it into ElevenLabs, then press **Add my voice file** and choose the MP3. The scenes move to match your voice by themselves. If one changes at the wrong moment, open "Fix the timing by hand".
5. **Download.** Press **Record the video**. It plays once and saves the file, with your voice on it. The caption for the post is here too. "Retention check" lists anything likely to make people swipe away.

The **Make my video** button only works on the page inside Claude. In the double-click copy on your PC, open "More options", press **Copy as a request for Claude**, paste that into any Claude chat, and paste the answer into "Load a project" under step 5.

Your work is remembered in the browser. The voice file is not, so add it again if you reload the page. Music and sound effects still go on in CapCut.

## What the animation can do

- **Custom animation.** A picture built for one line out of parts: realistic flat-vector people (adult proportions, clothes, skin tones, hairstyles) who show a mood, react when something happens, talk in short speech bubbles and point, wave, cheer, walk or dig, icons, coins, labels, counting numbers, boxes, circles, bars, dotted grids, arrows, paths and outlines that draw themselves, speech bubbles and stamps. Parts can arrive, move, turn, grow, pulse, shake and leave at set moments. Claude writes these. To change one, tell Claude what you want to see.
- **Ready-made scenes (29).** Big statement, Numbered steps, A versus B, Percent ring, Timeline, Bar chart, Growth curve, Big counting number, Follow button, Digging toward the goal, Late at night, Report card, Proof cards, What most people think, Forced or wanted, Teacher and student, and the story scenes with figures (crowds, pedestals, spotlight, tracking table and so on).
- **Camera and texture.** Between scenes the camera drops, whips sideways or punches through. Hits shake the frame. Captions arrive word by word. Stones or dust drift behind the scene and a light film grain sits on top.

## The seven styles

Neon terminal, Whiteboard, Blueprint, Newsroom, Arcade CRT, Magazine, Sticker pop. `STYLE-NOTES.md` says what each one suits.

## The retention check

It checks eleven things, such as: words on screen at once, a short first scene, no scene that sits still too long, a highlighted word in every line, a new picture every four seconds, at least one number, a follow card at the end. It cannot judge whether your first line is interesting. That part is still yours.

## The files

| File | What it is |
|---|---|
| `Pictogram Studio.html` | The page. Double-click it and it opens in Chrome. |
| `videos/` | One folder per finished video. |
| `projects/` | One project file per video. |
| `PROMPT.md` | What to write to Claude to get more videos. |
| `STYLE-NOTES.md` | What each style is for. |
| `PIPELINE.md`, `CUSTOM-ANIMATION.md`, `make.js` | The rules and the command Claude follows to turn an idea into a video. |
| `engine.js`, `presets.js`, `render.js` | The parts that draw and render. You do not need to open these. |

## Where the facts in the ready-made examples come from

- Lightning: the US National Weather Service says the Empire State Building is hit an average of 23 times a year (weather.gov/safety/lightning-myths).
- Caffeine: Mayo Clinic lists 96 mg for 8 oz of brewed coffee, 48 mg for brewed black tea and 79 mg for an energy drink.
- Buffett: Morgan Housel, The Psychology of Money, chapter 4. The full list is in `videos/buffett-dug-for-fifty-years/sources.md`.
- Study methods and noise cancelling: general descriptions, no numbers claimed.
- "News in 30 seconds" is fill-in-the-blanks on purpose.
