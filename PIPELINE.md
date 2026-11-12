# Video idea in, finished package out

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
- **Scene 1 is `hook`:** one line, 8 words or fewer, on screen at 0. It makes a claim or asks a question that the last scenes pay off. Write three more hooks and put them in `hooks`.
- **Then 6 to 8 scenes**, one idea each: a small setup line (`kicker`) and a punch line (`lines[0]`) that read aloud as one sentence. Put `*stars*` around the one phrase to highlight in every main line.
- **Order:** hook, the common belief or the setup, the turn, the proof with one real number, the consequence, the payoff that answers the hook, then `cta`.
- **Variety:** never the same scene type twice in a row, no type more than twice, at least one number scene (counter, bars, ring, compare, grid).
- **Loop:** the last content scene should land back on the hook's words so a rewatch feels natural.
- Plain spoken English. No hashtags, emoji or filler like "did you know".
- Labels inside `p` are 1 to 4 words in capitals. Change every default label and icon so nothing from another video is left over.

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

`projects/why-2100-skips-leap-day.json` is a complete worked example.

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
