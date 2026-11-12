# Cut-paper style: rules for any topic

Studied from two history explainer videos the user uploaded (2026-11-12). What we take is the
*technique*: how a flat paper world is staged, lit, moved and timed. What we never take: their
characters, their drawings, their logos, their title cards, their colours one to one. Every
character, place and prop in our engine is our own art, drawn in code.

## What the technique is

1. **Paper puppets, not drawings.** People are flat cut-outs: a big round head (about a quarter
   of the body), short body, simple shapes, no outlines. Dot eyes, small brows, a tiny mouth.
   Costume carries the period and the job (toga, armour, uniform, suit, robe), with a few
   pattern details (a trim band, buttons, a belt, a sash). Limbs rotate from a pin at the
   shoulder and the hip, like a puppet, so moves look a bit stiff on purpose.
2. **One deep world.** The horizon sits high, so a big flat ground plane fills the lower part of
   the frame and can hold many people at different depths. Far people are smaller, paler and
   hazier. Everyone stands *on* the ground and casts a soft shadow.
3. **Planes and parallax.** Every place is built from 4 to 6 flat planes: sky, far ridge or
   skyline (pale, soft), middle (buildings, tents, trees), the ground the actors stand on, and a
   dark, blurred foreground silhouette (grass, a crate, a column) at the frame edge. The camera
   trucks sideways slowly so near planes move faster than far ones.
4. **Depth of field.** Far planes are slightly soft; the foreground silhouette is very soft and
   dark. The actors are always the sharpest thing in the frame.
5. **Atmosphere.** Far layers are desaturated and pushed toward the sky colour. A warm light
   from one side, a haze band at the horizon, light rays or dust when it fits. Night is a
   purple-blue grade with stars.
6. **Limited palette per scene.** Pale, warm background colours; saturated colour only on the
   costumes and the one thing the line is about.
7. **Pictures follow the words.** Each line gets its own staged moment: the place the line names,
   the people it names doing what it says. Gags are allowed (a sign that says "MINE", a crown
   that is too big). One idea per shot.
8. **Rhythm.** Hold a staged shot for 2 to 4 seconds with small idle motion, then cut or wipe.
   Between chapters, a bold diagonal stripe wipe in two colours.
9. **Text moments.** Full-screen colour cards for a quote, a definition or a key number, with the
   highlighted word in the accent colour and a small round icon that pops in. A small ribbon
   label in a top corner names the chapter.

## How the engine does it (style `cutpaper`)

| Technique | Engine switch |
| --- | --- |
| Paper puppets | `look.people = 'doll'` (any person part, cast, crowd, walkers) |
| Period costumes | person `outfit`: tunic, toga, robe, armor, uniform (plus shirt, tee, suit, dress, coat) |
| Period hats | person `hat`: tricorn, plume, laurel, tophat, wrap (plus helmet, cap, crown, grad) |
| Deep world, high horizon | `look.horizon` (how far the painted horizon is lifted, default 140, cutpaper 230) |
| Depth staging | a person or part with a smaller `y` stands further back: smaller and hazier automatically |
| Depth of field and foreground silhouettes | `look.dof = true` |
| Stripe wipe | `transition: 'stripes'` |
| Chapter ribbon | scene `section: "The deal"` (shown when `look.ribbon` is on) |
| Period places | `look.era = 'past'`: modern places swap to old-world ones (city, street, market to `town`; home to `tavern`; office, bank, classroom to `study`; courtroom, stage to `hall`; factory to `village`), plus `port` (sailing ships) and `camp` (army tents) |
| Plain puppet faces | dot eyes only; brows and a mouth appear only when the mood or talking needs them |
| Bigger people, lower floor | `look.peopleScale` (1.3) and, in tall videos, `look.lower` (120) |
| Light captions | `look.capCard = false`, `look.capHalo = true` (words with a soft paper edge, no card) |

## Recipe for a new topic

1. Split the script into chapters of 2 to 4 lines; give each chapter a short `section` name.
2. For each line, name the place and who is in it. Pick the outfit and hat from the period
   (Rome: toga, laurel, plume; 1700s: uniform, tricorn; business: suit, tophat; workers: tunic).
3. Stage it: the main actor in front (y near 100), two to five others behind at y 70 to 90.
4. Give everyone an act that matches the verb in the line (point, cheer, walk, shrug, hold).
5. Use a colour card (quote, number or definition) once every 4 to 6 shots, not more.
6. Use the stripe wipe only between chapters; plain cuts inside a chapter.
