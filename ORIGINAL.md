# Original films: a new animation for every video

On 2026-11-13 the user said: "this shouldn't be a template thing, it should generate an original one every time."

So a video is no longer a project file filled into the engine's ready-made scenes, styles, people and places. Every
video is its own hand-written animation program, `videos/<slug>/film.js`, drawn from nothing for that one idea:
its own look, its own characters, its own props, its own motion and its own captions. Two videos should never look
like they came from the same template.

The old engine (`engine.js`, `make.js`, the studio page) still works, but use it only if the user asks for a quick
template version.

## What is shared and what is new each time

Shared (plumbing only, in `original/stage.js`): the canvas size, the time of every spoken word, easing curves,
seeded randomness and noise, colour mixing, and text fitting and wrapping. It holds no drawings, palettes, people,
places, layouts or caption designs, and it must stay that way.

New every time (written in that video's `film.js`):

- the art direction: medium, period or influence, palette, texture, line quality, type
- every character, drawn from scratch, with a face that changes with the story
- every prop and place
- the way things move (snappy, floaty, stop-motion boil, mechanical, liquid...)
- the transitions between moments
- the caption design
- the visual gag or turn in each line

Never copy drawing code from an earlier `film.js`, and never call `engine.js` from a film. Reading an earlier film to
remember how the plumbing is used is fine.

## Steps for one idea

1. **Brief, research and script** as in `PIPELINE.md` steps 1 to 3 (promise, sources for every fact, hook first, 70
   to 95 words, plain spoken English). Write the spoken words to `videos/<slug>/voiceover.txt`, one sentence per
   line, with proper punctuation (the punctuation decides the sentences the film is timed to).
2. **Voice it first**, so the pictures can be timed to the words:
   `cd /mnt/project-files/infographic-generator/ && node original.js voice videos/<slug> george`
   (George for history and stories, Daniel for news, Brian for money and tech; any ElevenLabs voice id works).
   This writes `voice.mp3` and `voice-words.json`. If the voice fails, write the film anyway and time it later.
3. **Pick an art direction that is new.** Read `original/DIRECTIONS.md` and choose a look that differs from the last
   five films in medium, palette and character design. Let the subject suggest it: the period, the place, the
   industry, the mood. Add one row to `DIRECTIONS.md`. Starting points (not templates, and never the same one twice
   in a row): ink engraving, linocut, risograph zine, mid-century modern cartoon, constructivist poster, woodblock
   print, stained glass, illuminated manuscript, chalkboard, blueprint, pixel arcade, pop-art halftone, embroidery,
   claymation-style soft shapes, paper collage, neon sign, newspaper comic strip, museum diorama, technical manual.
   Study real techniques, never copy a real show, artist's characters or a brand.
4. **Write `film.js`.** One staged moment per sentence, built for what that sentence says. Anchor every big moment to
   the word that causes it with `S.at('word')`, so the motion lands as the voice says it. Give the video a main
   character with a personality who reacts (mood, a short speech bubble, a gesture). Keep the bottom 400 px and the
   right 120 px free of anything important (app buttons), and keep text inside 80 to 1000 px across.
5. **Look at it:** `node original.js sheet videos/<slug>` makes `check-sheet.jpg` with one still per sentence (add
   `--at 1.2,5.5` for exact times). Open it and fix anything small, empty, clipped, overlapping or unclear. Repeat
   until every frame reads at phone size.
6. **Render:** `node original.js render videos/<slug>` writes `<slug>_9x16.mp4` with the voice.
7. **Package:** write `package.md` (title, hook, caption under 150 characters, 3 to 5 hashtags, sources with links,
   what could not be verified) and deliver the mp4 with it.

## The film file

```js
FILM({
  title: 'Short title',
  fonts: ['IM Fell English:ital@0;1', 'UnifrakturMaguntia'],   // any Google Fonts, written like the css2 URL
  size: [1080, 1920],                                           // tall 9:16
  tail: 1.5,                                                    // seconds after the last word
  init(S) { /* make backgrounds and textures once */ },
  draw(ctx, t, S) { /* draw the whole frame at time t, from nothing */ },
});
```

`S` gives: `S.W`, `S.H`; `S.words` (each `{w, s, e}` in seconds; words match exactly, end one with * to match its start, like `trad*`); `S.sentences` (`{text, s, e, words}`);
`S.at('phrase', nth, after)` and `S.end(...)` (when a word or phrase starts or ends being spoken; unknown words are
reported after a render); `S.sentenceAt(t)`; `S.p(t, a, b)` (0 to 1 progress); `S.ease.out / in / inOut / back /
elastic / bounce`; `S.lerp`; `S.clamp`; `S.rng(seed)`; `S.noise(x)`; `S.hash(n)`; `S.mix(colourA, colourB, f)`;
`S.fit(ctx, text, fontTemplate, size, maxWidth)`; `S.wrap(ctx, text, maxWidth)`; `S.length` (total seconds).
`draw` must not depend on the previous frame, because frames are drawn out of order for the check sheet.

The first film made this way is `videos/tulip-mania-original/` (1630s Dutch ink engraving with oil-painting
bookends). Read it to see the plumbing in use, then make the next one look nothing like it.

## 3D films with sound (since 2026-11-13, the default for new videos)

The user called the flat canvas films "rudimentary... lifeless", with things "overlaying wrong over the background",
a robotic voice and no sound effects. So new films are 3D scenes rendered with three.js, voiced with ElevenLabs v3
and mixed with music and sound effects. Everything visible is still made new for each film.

1. Script in `videos/<slug>/voiceover.txt`, conversational (contractions, short sentences, one idea each).
2. Voice with the v3 model: `python3 voice3.py videos/<slug> [voice id] [stability 0.5]` (George is
   `JBFqnCBsd6RMkjVDRZzb`). v3 leaves long dramatic pauses, so run
   `python3 tighten.py videos/<slug> 0.36 1.06` (shortens silences over 0.36 s, speeds up 6%). That writes
   `voice-tight.wav` and `voice-words-tight.json`, which the renderer and the mixer use automatically.
3. Write `film3d.js` (an ES module, see `videos/tulip-mania-3d/film3d.js`): `build(k)` makes the scene with
   `k.THREE`, calls `k.setup(scene, camera, {bloom, dof, grain, vignette})`; `update(t, k)` sets every transform from
   `t` only; `overlay(ctx, t, k)` draws captions in 2D on top; `sound(k)` returns the music plan and sound cues.
   `original3d/kit.js` is plumbing only (renderer, post effects, canvas textures).
   Tall frames are narrow: use a vertical field of view around 50 and keep the cast within about half the camera
   distance in width, or the edges get cut. Characters must stand on the set floor and be lit by the set's light.
4. Check: `node original3d.js sheet videos/<slug>` (add `--at` times for transitions). About 0.5 s a frame.
5. Sound: `node original3d.js cues videos/<slug>` then `python3 soundtrack.py videos/<slug>`. Music comes from
   the film's chords through FluidSynth with the General MIDI soundfont; every sound effect is synthesised in
   `soundtrack.py` (the ElevenLabs key has no sound-effect or music permission). The music ducks under the voice
   and the mix is normalised to about -14 LUFS.
6. Render: `node original3d.js render videos/<slug> --from 0 --to 11` in 3 or 4 parallel parts (about 1 s a frame
   at 1080x1920), then `python3 encode3d.py videos/<slug>` to join frames and soundtrack into `<slug>_9x16.mp4`.
