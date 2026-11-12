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
| `person` | `h`, `act` (`point`, `wave`, `jump`, `cheer`, `walk`, `nod`, `slump`, `dig`), `dir: "left"`, `glasses`. Feet at x,y. Accent = the main character, `fg` = other people. |
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

## How to design a custom scene

1. Name the one thing the line is about, and draw that thing out of simple shapes. A plane is a rounded box, two closed paths and a row of small boxes.
2. Make it do something on `line1`: move, grow, tip over, crack, count up or get crossed out. A picture that only appears is a slide.
3. Use 6 to 16 parts. Labels inside the picture are 1 to 4 words.
4. Give the first scene `"in": "none"` on its main shapes, so the first frame is not empty.
5. Carry a shape from one scene to the next when the story continues (the same window, first cracked, then round).
6. Render the check sheet and look at every scene before the full video.

Authoring tip: for pictures that need computed positions (lines that bend around a shape, parts on a circle), write a short script that builds the JSON, as long as the saved project file is plain data.
