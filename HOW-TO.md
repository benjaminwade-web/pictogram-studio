# Pictogram Studio: how to use it

Pictogram Studio makes short animated explainer videos out of simple shapes, stick figures, charts and bold captions. It started as a copy of the "pirate token" TikTok style and now works for any topic, in seven different looks.

## The files

| File | What it is |
|---|---|
| `Pictogram Studio.html` | The editor. Double-click it and it opens in Chrome. |
| `out/style-reel_9x16.mp4` | One 27 second video shown in all seven styles, one after another. Watch this first to pick a look. |
| `out/general-sample_sticker-pop_9x16.mp4` | A non-finance sample ("One percent better") in the Sticker pop style. |
| `out/finance-sample_9x16.mp4` | A short finance sample in tall TikTok shape. |
| `out/example-recreation_16x9.mp4` | The recreation of the original example, scene for scene. |
| `out/compare_original-vs-recreation.mp4` | Original on top, recreation below, with the original sound. |
| `PROMPT.md` | Prompts to copy when you want more videos. |
| `STYLE-NOTES.md` | What each style is for, and the breakdown of the original example. |
| `engine.js`, `presets.js`, `render.js` | The parts Claude uses to render sharp MP4s. You do not need to open these. |
| `videos/` | One folder per finished video package. |
| `PIPELINE.md`, `make.js` | The rules and the command Claude follows to turn an idea into a package. |
| `README.md`, `package.json` | Notes for the GitHub copy of the project. |

All videos are silent until you add sound.

## The quickest way: give Claude the idea

In this project's chat, write `Video idea:` and one line. Claude researches it, writes the script, picks the format and style, times it, checks it and sends back a folder with:

- the video (silent MP4),
- `voiceover.txt`, the exact words to paste into ElevenLabs,
- `post.txt`, the caption, hashtags and three other hooks to test,
- `sources.md`, where every fact came from,
- `check-sheet.jpg`, one picture per scene,
- the project file, in case you want to edit it in Pictogram Studio.

The one step left for you is the voice. Paste `voiceover.txt` into ElevenLabs, download the MP3 and send it back. Claude fits every scene change to the pauses in the speech and returns the finished video with the voice on it.

`videos/why-2100-skips-leap-day/` is a full example made this way.

## Three ways to start a video in the editor

1. **From an idea.** In the box called "Start from an idea", type one line and press **Draft the scenes**. Claude picks the format and the style, writes the hook, the scenes and the caption, and times it to speaking pace. Inside the page it cannot look anything up, so it only uses well-known facts and whatever you paste in. For ideas that need research, use the chat route above. "Undo the draft" brings back what you had.
2. **From a format.** In "Start from" at the top, pick Top 3 list, Myth vs fact, How it works, This vs that, or News in 30 seconds. Each is a finished example that already passes the retention check. Replace the words with yours.
3. **From Claude in chat.** Ask in this project for a video on a topic (see `PROMPT.md`), and paste the project text you get back into "Load a project" at the bottom of the page.

The **Draft the scenes** and **Suggest better hooks** buttons only work on the Pictogram Studio page inside Claude. In the double-click copy on your PC, press **Copy as a request for Claude** instead, paste that into any Claude chat, and paste the answer into "Load a project".

**Suggest better hooks** reads your scenes and offers five different opening lines. Click one to use it.

## Editing a video

1. Open the editor. Your work is remembered in the browser.
2. In the Style box, click one of the seven style cards. Everything (colors, font, background, caption look, transitions) changes at once. You can still change any single piece afterwards.
3. Click a scene in the strip under the preview. Change its words on the right. Put `*stars*` around the words you want in the accent color.
4. Each scene has a type (big statement, growth curve, numbered steps and so on). Change the type from the first dropdown. The fields under it change to match.
5. "Appears at" is how many seconds into the scene the line shows up. "Length" is how long the scene stays.
6. Look at the Retention check box. It lists what is likely to make people swipe away and tells you which scene to fix.
7. Export:
   - **Record video** plays it once and saves a video file. Keep the tab visible while it records.
   - **Copy project text**, then paste it to Claude and say "render this". You get a sharper MP4 back.
   - **Save this frame (PNG)** gives you a still for a thumbnail.

## The seven styles

Neon terminal, Whiteboard, Blueprint, Newsroom, Arcade CRT, Magazine, Sticker pop. `STYLE-NOTES.md` says what each one suits.

## Scene types (22)

For any topic: Big statement (the hook card), Numbered steps, A versus B, Percent ring, Timeline, Bar chart, Growth curve, Big counting number, Follow button.

Story scenes with figures: Crowd with a few standouts, One person with an idea, Things on pedestals, Spotlight reveal, Row of people with objects, Looking closer, Crossing off a grid, Tracking table, The crowd vs the smart one, Time passing, Noise vs progress, Quitting one short, Not luck but persistence.

## The retention check

It checks eleven things, such as: the first scene is short and opens with a statement, no scene sits still too long, every scene has a highlighted word, captions are short enough to read, the video ends on a follow card, and the total length fits short form. It cannot judge whether your hook is interesting. That part is still yours.

The thin line at the top of the video is a progress bar. It is on by default in the newer starters and can be switched off in the Style box.

## Adding your voiceover

1. Press **Copy the voiceover script**, paste it into ElevenLabs and download the MP3. If you want it faster, change the speed in ElevenLabs, not in CapCut, so the pictures stay in step.
2. In the Voiceover box press **Add a voice file** and choose it. Press Play and you hear it with the preview.
3. Press **Fit scenes to the voice**. Each scene change moves to the nearest pause in the speech, and the video is made the same length as the voice.
4. If a change lands in the wrong place, press **Tap out the timing**, listen, and tap the button (or the space bar) each time the next scene should begin.
5. **Record video** now records the picture and the voice together.

The voice file is not saved with the project, so add it again if you reload the page. Music and sound effects still go on in CapCut.

For the sharper Claude-rendered MP4, send the voice file along with the project text and ask for it to be rendered with the voice.

## Where the facts in the format starters come from

- Lightning: the US National Weather Service says the Empire State Building is hit an average of 23 times a year, and that lightning favours tall, pointy, isolated objects (weather.gov/safety/lightning-myths).
- Caffeine: Mayo Clinic lists 96 mg for 8 oz of brewed coffee, 48 mg for brewed black tea and 79 mg for an energy drink, and says up to 400 mg a day may be safe for most adults.
- Study methods: spacing, self-testing and sleep are standard findings in learning research. No numbers are claimed.
- Noise cancelling: a general description of how active noise cancelling works. No numbers are claimed.
- "News in 30 seconds" is fill-in-the-blanks on purpose.

## A note on the example

The recreation copies another creator's video closely because that was the test. Treat it as a style study, and post your own topics and wording.
