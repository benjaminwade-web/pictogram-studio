# Pictogram Studio

Short animated explainer videos (TikTok, Reels, Shorts) made from a small JSON project: custom animation drawn for each idea, ready-made pictogram scenes, bold captions, seven switchable styles, and checks for viewer retention.

## What is in here

| Path | What it does |
|---|---|
| `engine.js` | The whole renderer. `PSP.render(ctx, project, t)` draws one frame. Holds the styles (`STYLES`), the scene types (`V.<name>`) and the icons. |
| `presets.js` | The starters: five formats (list, myth, how, versus, news) and three samples. |
| `editor.src.html` | The editor page (preview, scene form, style picker, topic drafting, voiceover, retention check, export). |
| `build.js` | Joins the three files above into `studio.artifact.html` (published page) and `Pictogram Studio.html` (double-click copy). |
| `make.js` | One command from a project file to a full package in `videos/<name>/`: timing, checks, check sheet, MP4, voiceover script, caption, sources. With `--voice` it fits the scenes to a voice file. |
| `PIPELINE.md` | The rules for turning a one-line idea into a project file and a package. |
| `CUSTOM-ANIMATION.md` | The stage language behind `"visual": "custom"`: parts, places, times, movement. |
| `render.js`, `render.html` | Renders an MP4 with headless Chromium and ffmpeg. |
| `projects/` | One JSON file per video. This is where finished and in-progress videos live. |
| `HOW-TO.md`, `PROMPT.md`, `STYLE-NOTES.md` | Plain-language guides. |

## Commands

```
node make.js projects/my-video.json            # the whole package: checks, check sheet, MP4, script, caption, sources
node make.js projects/my-video.json --voice voice.mp3   # same, fitted to a voiceover
node build.js                                  # rebuild the editor page after any change
node render.js general out/general.mp4         # render a starter by name
node render.js projects/my-video.json out/my-video.mp4 --audio voice.mp3
node render.js general out/x.mp4 --style newsroom --from 0 --to 5
node render.js general x.mp4 --stills 1,5,9 --sheet out/check.jpg
```

Rendering needs Node, Playwright (Chromium) and ffmpeg. Run the commands from this folder.

## How to change things

- **New style:** add one entry to `STYLES` in `engine.js` (colors, font, transition and a `look`).
- **New kind of custom part:** add a `case` to `drawItems` in `engine.js`, then a row in `CUSTOM-ANIMATION.md` and a line in `CUSTOM_SPEC` (the short version that goes into the drafting request).
- **New scene type:** add `V.<id> = { name, hint, fields: [...], draw(g) {...} }` in `engine.js`. The editor form and the drafting request are built from `fields`, so nothing else needs to change.
- **New starter:** add an object to `presets.js` and an `<option>` in `editor.src.html`.
- **New video:** save its project text as `projects/<name>.json`.

After a change, run `node build.js` and render a still sheet to check it.

## Project format

```json
{ "title": "…", "aspect": "9:16", "style": "pop", "progress": true,
  "scenes": [ { "visual": "hook", "dur": 2.6, "kicker": "", "lines": [ { "text": "Main line with a *starred* phrase.", "at": 0 } ], "p": { "big": "1%", "sub": "BETTER EACH DAY" } } ] }
```
