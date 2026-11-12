# Custom animation

A scene with `"visual": "custom"` is a picture made for one line of one video. Its `p.items` is a list of parts. Each part says what it is, where it stands, when it arrives and how it moves. Parts are drawn in order, so later parts sit on top.

`projects/why-plane-windows-are-round.json` is a full video made only of custom scenes. Read it before writing your own.

## The stage

- `x` and `y` run from 0 to 100, left to right and top to bottom. `y: 100` is the ground line. `y: 0` is just under the captions.
- Sizes (`h`, `w`, `r`, `size`, `len`, `width`) are in units. 100 units is the stage height. A person is about 30 tall.
- In the tall 9:16 shape the stage is about 116 units wide, so one step of `x` is about 1.16 units. In the wide shape the same layout is used in the middle of the frame.
- Inside a `group`, the children's `x` and `y` are in units, measured from the group's own position.
- Keep everything between x 4 and 96, y 8 and 98.

## What every part can have

| Field | Meaning |
|---|---|
| `is` | The kind of part (the list is below). The only required field. |
| `x`, `y` | Where it stands. |
| `at` | When it appears. Default 0. |
| `in` | How it appears: `pop`, `fade`, `draw`, `grow`, `left`, `right`, `up`, `down`, `drop`, `none`. `inDur` sets how long that takes. |
| `out` | When it fades away. |
| `loop` | Idle motion: `bob`, `float`, `pulse`, `spin`, `swing`, `shake`, `blink`. `speed` makes it faster or slower. |
| `move` | A list of steps: `{ "at": "line1", "x": 60, "y": 40, "scale": 1.2, "rot": 15, "alpha": 1, "dur": 0.6, "ease": "out" }`. Each step starts at `at` and takes `dur` seconds to reach the values it names. |
| `fx` | Extras when it appears: `sparks`, `shake`, `ring`, `glow` (several with commas). |
| `color` | `accent`, `fg`, `mute`, `bg`, or a hex color. Use `accent` only for the thing the viewer should look at. |
| `scale`, `rot`, `alpha` | Starting size, angle in degrees and opacity. |
| `repeat` | `{ "n": 5, "dx": 6, "dy": 0, "stagger": 0.08 }` makes a row of copies. |

## Times

Scene lengths are set from the word count after you write the scene, so anchor times to the words:

- `"line1"`, `"line2"`: the moment that caption line starts. `"line1+0.4"` and `"line2-0.2"` work too.
- `"30%"`: a share of the scene. `"end-0.8"`: counted back from the end.
- A plain number is seconds from the start of the scene. Use these only for the first second.

## Kinds of part

| Kind | Extra fields |
|---|---|
| `person` | A character with a face. See "Characters" below. Feet at x,y. Accent = the main character, `fg` = other people. |
| `crowd` | `n`, `h` |
| `icon` | `name` (chest, coin, diamond, bar, friends, bulb, star, dice, pin, house, bank, bag, doc, chart, heart, phone, rocket, book, globe, trophy, flame, bolt, target, magnifier), `size` |
| `coin` | `size`, `symbol`, `spin` |
| `text` | `text`, `size` (3 to 6), `w` (widest it may be), `align`, `caps: false` |
| `tag` | `text`, `size`, `style` (`outline`, `solid`, `accent`), `strike` (time it is crossed out) |
| `number` | `from`, `to`, `prefix`, `suffix`, `decimals`, `size` (12 to 22), `over` (seconds it counts), `start`, `label` |
| `box` | `w`, `h`, `r`, `fill`, `stroke`, `dash` |
| `circle` | `r`, `fill`, `stroke`, `dash` |
| `ring` | `r`, `percent`, `show: false` hides the number |
| `bar` | `w`, `h`, `value` (text above), `label` (text below), `fill`. Grows up from x,y. |
| `dots` | `cols`, `rows`, `gap`, `r`, `on` (how many light up), `over`, `start` |
| `line`, `arrow` | `to: [x, y]`, or `len` and `angle` (0 = right, -90 = up). `bend` (-0.3 to 0.3), `dash`, `flow` (moving dashes), `center: true` to turn around its middle |
| `path` | `pts: [[x, y], ...]` as stage positions, `smooth`, `close`, `fill`, `dash`, `flow`. Here `x` and `y` are an offset. |
| `blob` | `r`, `seed`, `squash`, `points`: a rock or cloud outline |
| `bubble` | `w`, `h`, `text`, `tail` (`left`, `right`, `none`) |
| `stamp` | `text`, `size`. Slams down and kicks the camera. |
| `star`, `glow` | `size` / `r`, `strength` |
| `sparks` | `n`, `r`, `len`, `gravity`: a one-off burst at `at` |
| `burst` | `symbol`: a coin with rays |
| `chest` | `size`, `open` (time) |
| `shake` | `amount`: a camera kick at `at` |
| `group` | `items`: parts that move, turn, pulse or slide in together |

## Characters

Every video is told by characters. People are drawn as realistic adults in the flat vector style used by most explainer channels: about seven heads tall, real clothes, skin tones and hairstyles, small eyes and brows that carry the mood, two-joint arms and legs, and calm motion. A `person` part blinks, shows a mood, gestures, walks, talks and reacts. (The older round "pawn" figures are still there: pick People: Simple under Look, or set `"look": {"people": "simple"}`.)

Why this style: explainer studios find that characters with adult proportions (7 to 8 heads), smaller eyes and restrained motion read as credible rather than childish, while flat vector stays clean at phone size. Fully photoreal figures are mostly used for medical work and cost far more to animate.

| Field | What it does |
|---|---|
| `mood` | `happy`, `sad`, `shock`, `angry`, `think`, `worried`, `smug`, `sleep`. Changes the eyes, brows and mouth. |
| `act` | `point`, `wave`, `cheer`, `jump`, `walk`, `run`, `talk`, `think`, `shrug`, `hips`, `cross` (arms folded), `facepalm`, `hold`, `nod`, `no`, `slump`, `dig`. |
| `says` | A speech bubble of 1 to 4 words. It types itself on and the mouth moves. `saysSide` (`left` / `right`) picks the side, `saysAt` the moment, `saysSize` the text size. The bubble leaves by itself after a few seconds. |
| `emote` | `!`, `?`, `# Custom animation

A scene with `"visual": "custom"` is a picture made for one line of one video. Its `p.items` is a list of parts. Each part says what it is, where it stands, when it arrives and how it moves. Parts are drawn in order, so later parts sit on top.

`projects/why-plane-windows-are-round.json` is a full video made only of custom scenes. Read it before writing your own.

## The stage

- `x` and `y` run from 0 to 100, left to right and top to bottom. `y: 100` is the ground line. `y: 0` is just under the captions.
- Sizes (`h`, `w`, `r`, `size`, `len`, `width`) are in units. 100 units is the stage height. A person is about 30 tall.
- In the tall 9:16 shape the stage is about 116 units wide, so one step of `x` is about 1.16 units. In the wide shape the same layout is used in the middle of the frame.
- Inside a `group`, the children's `x` and `y` are in units, measured from the group's own position.
- Keep everything between x 4 and 96, y 8 and 98.

## What every part can have

| Field | Meaning |
|---|---|
| `is` | The kind of part (the list is below). The only required field. |
| `x`, `y` | Where it stands. |
| `at` | When it appears. Default 0. |
| `in` | How it appears: `pop`, `fade`, `draw`, `grow`, `left`, `right`, `up`, `down`, `drop`, `none`. `inDur` sets how long that takes. |
| `out` | When it fades away. |
| `loop` | Idle motion: `bob`, `float`, `pulse`, `spin`, `swing`, `shake`, `blink`. `speed` makes it faster or slower. |
| `move` | A list of steps: `{ "at": "line1", "x": 60, "y": 40, "scale": 1.2, "rot": 15, "alpha": 1, "dur": 0.6, "ease": "out" }`. Each step starts at `at` and takes `dur` seconds to reach the values it names. |
| `fx` | Extras when it appears: `sparks`, `shake`, `ring`, `glow` (several with commas). |
| `color` | `accent`, `fg`, `mute`, `bg`, or a hex color. Use `accent` only for the thing the viewer should look at. |
| `scale`, `rot`, `alpha` | Starting size, angle in degrees and opacity. |
| `repeat` | `{ "n": 5, "dx": 6, "dy": 0, "stagger": 0.08 }` makes a row of copies. |

## Times

Scene lengths are set from the word count after you write the scene, so anchor times to the words:

- `"line1"`, `"line2"`: the moment that caption line starts. `"line1+0.4"` and `"line2-0.2"` work too.
- `"30%"`: a share of the scene. `"end-0.8"`: counted back from the end.
- A plain number is seconds from the start of the scene. Use these only for the first second.

## Kinds of part

| Kind | Extra fields |
|---|---|
| `person` | A character with a face. See "Characters" below. Feet at x,y. Accent = the main character, `fg` = other people. |
| `crowd` | `n`, `h` |
| `icon` | `name` (chest, coin, diamond, bar, friends, bulb, star, dice, pin, house, bank, bag, doc, chart, heart, phone, rocket, book, globe, trophy, flame, bolt, target, magnifier), `size` |
| `coin` | `size`, `symbol`, `spin` |
| `text` | `text`, `size` (3 to 6), `w` (widest it may be), `align`, `caps: false` |
| `tag` | `text`, `size`, `style` (`outline`, `solid`, `accent`), `strike` (time it is crossed out) |
| `number` | `from`, `to`, `prefix`, `suffix`, `decimals`, `size` (12 to 22), `over` (seconds it counts), `start`, `label` |
| `box` | `w`, `h`, `r`, `fill`, `stroke`, `dash` |
| `circle` | `r`, `fill`, `stroke`, `dash` |
| `ring` | `r`, `percent`, `show: false` hides the number |
| `bar` | `w`, `h`, `value` (text above), `label` (text below), `fill`. Grows up from x,y. |
| `dots` | `cols`, `rows`, `gap`, `r`, `on` (how many light up), `over`, `start` |
| `line`, `arrow` | `to: [x, y]`, or `len` and `angle` (0 = right, -90 = up). `bend` (-0.3 to 0.3), `dash`, `flow` (moving dashes), `center: true` to turn around its middle |
| `path` | `pts: [[x, y], ...]` as stage positions, `smooth`, `close`, `fill`, `dash`, `flow`. Here `x` and `y` are an offset. |
| `blob` | `r`, `seed`, `squash`, `points`: a rock or cloud outline |
| `bubble` | `w`, `h`, `text`, `tail` (`left`, `right`, `none`) |
| `stamp` | `text`, `size`. Slams down and kicks the camera. |
| `star`, `glow` | `size` / `r`, `strength` |
| `sparks` | `n`, `r`, `len`, `gravity`: a one-off burst at `at` |
| `burst` | `symbol`: a coin with rays |
| `chest` | `size`, `open` (time) |
| `shake` | `amount`: a camera kick at `at` |
| `group` | `items`: parts that move, turn, pulse or slide in together |

 or `zzz` above the head. |
| `look` | `[x, y]` on the stage to look at, or `left`, `right`, `up`, `down`, `camera`. |
| `hat`, `hair`, `glasses`, `beard` | `helmet`, `cap`, `crown`, `grad`; `short`, `side`, `long`, `bun`, `curly`, `spiky`, `bald`; `true`; `true`. |
| `outfit`, `skin`, `hairCol` | `shirt`, `tee`, `suit`, `coat`, `dress`; 1 (light) to 6 (dark) or a colour; a colour such as `#7a4e2d`. |
| project `hero` | `"hero": {"outfit": "suit", "hair": "side", "skin": 2, "beard": true}` at the top level of the project fixes how the main character (colour accent) looks in every scene, ready-made scenes included. Without it the main character still looks the same all video, picked from the title. |
| `extra` | `true` on an accent-coloured person who is not the main character, so it gets its own look. |
| `name` | A small label under the feet. |
| `then` | A list of changes: `[{"at": "line1", "mood": "shock", "act": "", "says": "WAIT, WHAT?", "emote": "!"}]`. This is how a character reacts to what happens. |
| `move` | A person with a `move` walks there by itself (feet step, arms swing, it faces the way it goes). `"walk": false` makes it slide instead. |

Casting rules:

1. Pick one main character for the whole video: accent colour, and a `hero` look in the project that fits the topic (a suit for a money story, a shirt, beard and helmet for an engineer). Give the topic a face (an engineer for a plane story, an investor for a money story, a shopper for a price story).
2. Put the main character in nearly every custom scene, next to the thing the line talks about, looking at it.
3. The character reacts when the main line lands: one `then` step on `line1` that changes the mood (think to shock, worried to happy).
4. At most one speech bubble at a time, 1 to 4 words. It adds a feeling ("MY DESIGN!", "HMM...", "FIXED IT!") and never repeats the caption.
5. Other people (passengers, a crowd, a rival) are colour `fg`.
6. Stand characters on the ground (y 98 to 100) between x 12 and 88, and leave about 12 units free above the head for the bubble.
7. Match the mood to the subject. When the story involves harm, the character is worried or sad, not joking.
8. A ready-made scene can take characters as well: add person parts in `"p": {"cast": [...]}` and stand them in a free corner. The follow card takes `hat`, `hair` and `glasses` in `p`, so the same character can wave goodbye.

`projects/why-plane-windows-are-round.json` is the worked example: one engineer with a helmet and glasses walks in, shows off the plane, worries, spots the corners and fixes them.

## How to design a custom scene

1. Name the one thing the line is about, and draw that thing out of simple shapes. A plane is a rounded box, two closed paths and a row of small boxes.
2. Put the main character next to it (see "Characters"), and make the thing do something on `line1`: move, grow, tip over, crack, count up or get crossed out. A picture that only appears is a slide.
3. Use 6 to 16 parts. Labels inside the picture are 1 to 4 words.
4. Give the first scene `"in": "none"` on its main shapes, so the first frame is not empty.
5. Carry a shape from one scene to the next when the story continues (the same window, first cracked, then round).
6. Render the check sheet and look at every scene before the full video.

Authoring tip: for pictures that need computed positions (lines that bend around a shape, parts on a circle), write a short script that builds the JSON, as long as the saved project file is plain data.
