# Video idea in, finished package out

> **Since 2026-11-13 every video is an original film.** The user said the studio should not be "a template thing" and
> should "generate an original one every time". Do steps 1 to 3 below (brief, research, script), then follow
> `ORIGINAL.md`: voice the script, pick a new art direction, hand-write `videos/<slug>/film.js` and render it with
> `original.js`. The ready-made scenes, styles and places in steps 3b to 7 are the old template route; use them only
> if the user asks for a quick template version.

Use this when the user gives a video idea (for example "Video idea: why 2100 has no leap day") and wants a short animated infographic video for TikTok, Reels or Shorts. The user is not technical and does not want to be asked questions. Decide everything below yourself, make the package, and report what you chose.

The tool is Pictogram Studio in `/mnt/project-files/infographic-generator/` (also on GitHub as `pictogram-studio` once that repository exists). Read its `README.md` first if you have not used it in this conversation.

## 1. Fill in the brief yourself

From the one-line idea, decide and write down:

- **Promise:** the one thing the viewer will know at the end, in one sentence.
- **Audience:** general, curious, 16 to 35, unless the idea says otherwise.
- **Format:** list, myth vs fact, how it works, story, this vs that, or news. Pick the one the material fits.
- **Length:** 25 to 35 seconds, tall 9:16.
- **Style:** neon for money, tech and secret-strategy stories; whiteboard for how-to and study; blueprint for science and how things work; newsroom for news and urgent numbers; arcade for gaming and internet culture; magazine for history, psychology and calmer stories; pop for self-improvement and lifestyle. Do not use the same style as the user's previous video unless it is a series.

Ask the user a question only if the idea could mean two clearly different videos, or if it needs a fact you cannot verify and the video does not work without it.

## 2. Research before writing

- Search the web for the 2 to 4 facts the video stands on. Open the page and confirm the exact number, date or quote. Prefer primary or official sources.
- Every number, date, name and quote in the video must be in `sources`. If you converted a figure (days to minutes, for example), say so in `notes`.
- If a fact cannot be confirmed, leave it out and say so. Never invent a statistic. Never state a contested claim as settled.

## 3. Write the script as scenes

The spoken script and the captions are the same words, so the voice and the pictures always match.

- **Word budget:** 70 to 90 spoken words in total. No scene over 14 words. This is what makes the timing checks pass.
- **Scene 1 is the hook:** a `hook` scene or a custom picture, one line, 8 words or fewer, on screen at 0. It makes a claim or asks a question that the last scenes pay off. Write three more hooks and put them in `hooks`.
- **Then 6 to 8 scenes**, one idea each: a small setup line (`kicker`) and a punch line (`lines[0]`) that read aloud as one sentence. Put `*stars*` around the one phrase to highlight in every main line.
- **Order:** hook, the common belief or the setup, the turn, the proof with one real number, the consequence, the payoff that answers the hook, then `cta`.
- **Variety:** never the same ready-made scene type twice in a row, no ready-made type more than twice, at least one number scene (counter, bars, ring, compare, grid, or a custom scene with a number, bar, ring or dots part). Custom scenes and the `tunnel` thread are exempt from the repeat rules.
- **Loop:** the last content scene should land back on the hook's words so a rewatch feels natural.
- Plain spoken English. No hashtags, emoji or filler like "did you know".
- Labels inside `p` are 1 to 4 words in capitals. Change every default label and icon so nothing from another video is left over.

## 3b. Draw the animation for this idea

The user wants original animation tailored to each idea, not the same templates with new labels. So:

- **At least half the scenes are `custom`:** pictures built for this exact topic out of parts (people, shapes, drawn lines, counters, groups that move). `CUSTOM-ANIMATION.md` is the full guide and `projects/why-plane-windows-are-round.json` is a worked example made only of custom scenes.
- Each custom scene shows the thing the line is about and makes it do something when the main line lands: move, grow, tip, crack, count or get crossed out.
- **Characters tell the story.** The user asked for characters with a personable feel. Cast one main character for the whole video (accent colour, a project-level `hero` look such as `{"outfit":"suit","hair":"side","skin":2}`, the same hat every time; people are drawn as realistic flat-vector adults, which the user asked for on 2026-11-12), put it in nearly every scene, have it look at the thing the line is about, and make it react on the main line with a mood change and sometimes a short speech bubble (1 to 4 words, a feeling, never the caption again). The "Characters" section of `CUSTOM-ANIMATION.md` has the fields and the casting rules. The checks fail if fewer than 60% of the scenes show a character. Match the mood to the subject: worried or sad when the story involves harm.
- Use a ready-made scene type only where its picture is exactly what the line says (a bar chart for numbers over time, `compare` for two numbers, `cta` at the end).
- A story can have a thread: one picture that returns two or three times and pays off at the end, like `tunnel` in `projects/buffett-dug-for-fifty-years.json` (digging, then the breakthrough).
- **Give scenes a place that matches the action** (23 places: office, bank, lab, factory, classroom, mine, market, home, courtroom, stage, sea, desert, ancient, castle, farm, forest, city, night, street, hills, sky, runway, space). Scenes with people get one automatically from their words; set it yourself when the automatic pick is wrong. For history, origin stories and stories about people and places, use the **Storybook** style (full-colour painted places, paper texture). Set it with a `{"is": "scenery", "kind": "city"}` part first in a custom scene, or `"scenery": "city"` in a ready-made scene's `p`.
- **Use one or two real photos** when the story has a real thing to show (the plane, the company's first shop, the person). Find a freely licensed file on Wikimedia Commons and run `node photo.js projects/<slug>.json <key> "File:Name.jpg"`; it stores the photo in the project and adds the credit to `sources`. Show it with a `photo` part (polaroid or sticker frame). See "Real photos" in `CUSTOM-ANIMATION.md`.
- If an idea needs a kind of part that does not exist yet, add it to `drawItems` in `engine.js`, document it in `CUSTOM-ANIMATION.md`, and rebuild the page with `node build.js`.

## 4. Build the project file

Save `projects/<slug>.json`:

```json
{ "title": "...", "idea": "the user's words", "audience": "...", "aspect": "9:16", "style": "blueprint", "progress": true,
  "scenes": [ { "visual": "hook", "kicker": "", "lines": [ { "text": "The year 2100 will *skip* leap day." } ], "p": { "big": "2100", "sub": "NO FEBRUARY 29" } } ],
  "hooks": ["..."], "caption": "under 150 characters, no hashtags", "hashtags": ["three", "to", "five"],
  "sources": [ { "claim": "...", "source": "...", "url": "..." } ], "notes": "..." }
```

Leave out `dur` and `at`. The pipeline sets them from the word count. Scene types and their fields are listed by:

```
cd /mnt/project-files/infographic-generator/ && node -e "global.window=global;require('./engine.js');for(const k in PSP.VISUALS){const v=PSP.VISUALS[k];console.log(k+': '+v.hint+' | '+v.fields.map(f=>f.key+'='+JSON.stringify(f.def)).join(', '))}"
```

`projects/why-plane-windows-are-round.json` (custom animation throughout) and `projects/why-2100-skips-leap-day.json` (ready-made scenes) are complete worked examples.

## 5. Run the pipeline and look at the result

```
cd /mnt/project-files/infographic-generator/ && node make.js projects/<slug>.json --no-video
```

- Fix every failed retention check by rewriting the script, not by changing the rule.
- Open `videos/<slug>/check-sheet.jpg` and look at every scene. Fix anything clipped, blank, overlapping or mislabelled. If a scene type cannot show the idea, pick another type.
- Then run it again without `--no-video` to render the MP4 (about a minute).

If the pipeline stops with DRAWING ERROR, a scene failed to draw. Fix the scene or the engine before going on.

## 6. Deliver

Reply with the result first and attach `videos/<slug>/<slug>_9x16.mp4`, `package.md` and `voiceover.txt`. Say in two or three sentences which format and style you chose and why, the hook, and anything you could not verify. Copy the `videos/<slug>/` folder to the user's PC (the `infographic-generator\videos\<slug>\` folder recorded in project memory) if the PC is reachable.

The video is silent. The one step left for the user is the voice: paste `voiceover.txt` into ElevenLabs (they use the voice Brian), download the MP3 and send it back.

## 7. When the voice file comes back

```
cd /mnt/project-files/infographic-generator/ && node make.js projects/<slug>.json --voice <voice.mp3>
```

This moves every scene change to a pause in the speech and renders the video with the voice. Check that the report says most scene changes sit on a pause, watch the check sheet again, and deliver `<slug>_9x16_voiced.mp4`.

## Batches

For several ideas at once, do steps 1 to 5 for each, then send one table (idea, hook, style, length, anything unverified) with all the videos attached. Give each video in a batch a different style unless they are a series.
