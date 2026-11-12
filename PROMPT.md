# Prompts for making infographic videos at scale

## The short way: just give the idea

```
Video idea: [one line]
```

That is the whole prompt. Claude works out the rest by itself and sends back the finished video, the voiceover script, the caption and the sources. These are the things it decides for you, and you can override any of them by adding a line:

| What Claude decides | Default | Add this line to change it |
|---|---|---|
| The promise (what the viewer learns) | Taken from the idea | `Point: ...` |
| Audience | General, curious, 16 to 35 | `Audience: ...` |
| Format | Whichever fits: list, myth vs fact, how it works, story, this vs that, news | `Format: ...` |
| Length and shape | 25 to 35 seconds, tall 9:16 | `Length: ...` |
| Style | Picked to suit the topic | `Style: Newsroom` |
| Facts | Looked up and sourced, nothing invented | `Use these facts: ...` |
| Hook | Best of four, the other three listed to test | `Hook: ...` |

For several at once, send a list:

```
Video ideas:
1. ...
2. ...
3. ...
```

The longer prompts below still work when you want more control.

## Why the first prompt was hard to act on

The original ask was: "make infographics at scale, recreate the example, build an editable artifact, send me a better prompt." Four things were missing, and each one cost a round trip or a guess:

1. The example itself did not attach, so nothing could start until it was re-sent.
2. "Infographic" could mean a still image, a carousel or an animated video. The example turned out to be a 61 second animated explainer.
3. No topic, length, shape (wide or tall) or number of videos, so the first build had to copy the example's subject.
4. "At scale" was not defined. Ten a week from a topic list is a different job from one a day from the news.

## Prompt A: one video (copy, fill the brackets, send)

```
Make a Pictogram Studio video.

Account and audience: [which account, who watches it]
Topic: [the idea, event, habit, product or story]
The one thing the viewer should remember: [single sentence]
Length and shape: [25 to 40] seconds, [tall 9:16]
Style: [Neon terminal / Whiteboard / Blueprint / Newsroom / Arcade CRT / Magazine / Sticker pop, or "you pick and say why"]

Retention rules:
- Scene 1 is a Big statement hook, under 3 seconds, that opens a question the video answers at the end.
- Something new on screen at least every 3 seconds. No scene longer than 5 seconds.
- One idea per scene. A small setup line, then a punch line of 12 words or fewer with one highlighted word.
- Story order: hook, the common belief, the turn ("but"), the proof (one real number), payoff, follow card.
- The last line should link back to the first so it loops.
- Every number needs a source link. Tell me plainly if you could not verify something.
- Run the retention check and tell me anything that fails.

Voiceover: I use ElevenLabs (voice Brian). Give me the script as plain text and time each scene to the words.

Deliver: the MP4, the project text so I can tweak it in Pictogram Studio, the voiceover script and the source list.
Save everything to my Videos folder under infographics\[topic].

Show me the scene list first and wait for my OK before rendering.
```

## Prompt B: a batch (this is the "at scale" one)

```
Make [5] Pictogram Studio videos this week.

Account and audience: [which account, who watches it]
Topics: [list them, one per line] OR [pick 5 stories from the last 7 days that have one surprising number each]
Length and shape: 25 to 40 seconds each, tall 9:16.
Style: [one style for the whole series] OR [a different style per video so the feed does not look repeated]
Use the same retention rules as before (hook under 3 seconds, a change every 3 seconds, setup line plus punch line, one sourced number, loop back, follow card).

Step 1: send me a table with one row per video: hook line (give me 3 options each), the key number and its source, the style, and the scene types you plan to use. Wait for my OK.
Step 2: after I approve, render all of them and save each to my Videos folder under infographics\[topic] with the MP4, project text, voiceover script and sources.
Step 3: tell me which one you think is strongest and why, in two sentences.
```

## Prompt C: when you want a new kind of scene

```
Add a new scene type to Pictogram Studio: [describe what should be on screen, for example "a stock line that crashes and recovers" or "two companies side by side with a VS"].
What I should be able to edit: [labels, numbers, which side is highlighted].
Show me a 5 second test of it before adding it to the page.
```

## Prompt D: when you want a new style

```
Add a new style to Pictogram Studio called [name].
It should feel like: [describe it, or attach a screenshot of a video you like].
Colors: [background, text, accent] Font feel: [bold and loud / clean / handwritten / serious]
Show me the general sample in the new style before adding it to the page.
```

## Prompt E: after a video is posted

```
Here are the numbers for [video]: average watch time [x] seconds of [y], [z]% watched to the end, and the retention graph screenshot is attached.
Tell me which scene people left on, what to change, and make a second version with only that change.
```

## Tips that make any of these work better

- Attach the reference in the same message and say what it is ("this 60 second animated TikTok").
- Say what you will do with the result (post as is, add your own voice, cut into a longer edit).
- Give one decision rule for when you are away, for example "if a number can't be sourced, drop that scene."
- Ask for a storyboard first on anything longer than 30 seconds. It is much cheaper to change words than to re-render.
