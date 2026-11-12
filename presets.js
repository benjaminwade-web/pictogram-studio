/* Starter projects for the editor. */
(function (root) {
  const L = (text, at) => ({ text, at });
  const finance = {
    title: 'The patient investor (finance sample)', aspect: '9:16', style: 'neon', progress: true,
    scenes: [
      { visual: 'crowd', dur: 4.2, kicker: '', lines: [L('Some of the *calmest* investors', 0), L('are quietly doing something *boring.*', 2.0)], p: { label: 'INVESTORS', rows: 3, cols: 9, highlight: 1, split: true, reward: 'coin', symbol: '$' } },
      { visual: 'hero', dur: 4.6, kicker: "Not because they're lucky…", lines: [L('But because they *understand*', 1.3), L("what most people *don't.*", 2.6)], p: { tag: 'LUCKY?', strike: true, icon: 'bulb', symbols: true, doubters: true } },
      { visual: 'curve', dur: 3.8, kicker: "Money left alone doesn't grow in a straight line.", lines: [L('It *compounds.*', 2.7)], p: { pileLabel: 'YEAR 1', yLabel: 'VALUE', xLabel: 'TIME →', endTag: 'YEAR 30' } },
      { visual: 'row', dur: 3.6, kicker: 'Most people check their account,', lines: [L("see it's *down,* and sell.", 1.5)], p: { count: 3, who: 'everyone', object: 'chart', label: 'DOWN', leave: true, sparks: false } },
      { visual: 'tags', dur: 5.6, kicker: 'While everyone else argues about the next crash,', lines: [L('they *keep buying* every month.', 2.8)], p: { tags: 'CRASH SOON, BUBBLE, TOO LATE, WAIT FOR THE DIP, RIGGED', crowd: 3, barLabel: 'INVESTED', progress: 80, chests: 5, object: 'bag', symbol: '$' } },
      { visual: 'bars', dur: 4.6, kicker: '$500 a month, assuming 8% a year,', lines: [L('grows to about *$745,000* in 30 years.', 1.6)], p: { bars: '10 YRS:91, 20 YRS:295, 30 YRS:745', prefix: '$', suffix: 'K', highlight: 0, label: 'ILLUSTRATIVE, NOT A PROMISE' } },
      { visual: 'counter', dur: 3.4, kicker: "That's why", lines: [L('patient investors *never stop* buying.', 0.3)], p: { label: 'MONTHS INVESTED', value: 360, prefix: '', pill: 'NEVER STOP', heroes: 3, object: 'bag', symbol: '$' } },
      { visual: 'cta', dur: 3.2, kicker: '', lines: [L('*Follow* for more *money* breakdowns.', 0.1)], p: { button: '+ FOLLOW', buttonDone: 'FOLLOWING', foot: 'MONEY IN PLAIN WORDS' } },
    ],
  };
  const general = {
    title: 'One percent better (general sample)', aspect: '9:16', style: 'pop', progress: true,
    scenes: [
      { visual: 'hook', dur: 2.6, kicker: '', lines: [L('Getting *1% better* a day sounds like nothing.', 0)], p: { big: '1%', sub: 'BETTER EACH DAY', icon: 'none' } },
      { visual: 'curve', dur: 4.2, kicker: 'But small gains stack on top of each other.', lines: [L("After a year, that's about *37 times* better.", 2.2)], p: { pileLabel: 'DAY 1', yLabel: 'SKILL', xLabel: 'DAYS →', endTag: '37X' } },
      { visual: 'row', dur: 3.6, kicker: 'Most people start strong,', lines: [L('see *no change* in week two, and stop.', 1.4)], p: { count: 3, who: 'everyone', object: 'target', label: 'NO CHANGE', leave: true, sparks: false } },
      { visual: 'steps', dur: 4.6, kicker: 'The ones who make it do three things.', lines: [L('They make it *too small to skip.*', 3.0)], p: { items: 'PICK ONE SKILL, DO 10 MINUTES A DAY, NEVER MISS TWICE', highlight: 2 } },
      { visual: 'timeline', dur: 4.6, kicker: 'Nothing seems to happen for a long time.', lines: [L('Then it shows up *all at once.*', 3.0)], p: { points: 'WEEK 1:NOTHING, MONTH 1:STILL NOTHING, MONTH 6:A LITTLE, YEAR 1:OBVIOUS', highlight: 0 } },
      { visual: 'compare', dur: 4.2, kicker: 'Same two people, one year later.', lines: [L('The gap is *consistency,* not talent.', 1.9)], p: { left: 'STOPPED', right: 'KEPT GOING', label: 'SKILL LEVEL', leftValue: 1, rightValue: 37, prefix: '', suffix: 'x', winner: 'right' } },
      { visual: 'cta', dur: 3.0, kicker: '', lines: [L('*Follow* for one idea a day.', 0.1)], p: { button: '+ FOLLOW', buttonDone: 'FOLLOWING', foot: 'SEE YOU TOMORROW' } },
    ],
  };
  /* ---- format starters: one ready-made structure per kind of video. Facts used are listed in HOW-TO.md. ---- */
  const CTA = (line, foot) => ({ visual: 'cta', dur: 3.0, kicker: '', lines: [L(line, 0.1)], p: { button: '+ FOLLOW', buttonDone: 'FOLLOWING', foot } });
  const list = {
    title: 'Top 3 list (format starter)', aspect: '9:16', style: 'whiteboard', progress: true,
    scenes: [
      { visual: 'hook', dur: 2.6, kicker: '', lines: [L('Rereading your notes *barely works.*', 0)], p: { big: '3', sub: 'FIXES THAT DO', icon: 'none' } },
      { visual: 'steps', dur: 4.4, kicker: 'Three things work much better.', lines: [L('And none of them take *more time.*', 3.0)], p: { items: 'SPACE IT OUT, TEST YOURSELF, SLEEP ON IT', highlight: 0 } },
      { visual: 'timeline', dur: 4.4, kicker: 'One. Space it out.', lines: [L('Short reviews *days apart* beat one long night.', 2.8)], p: { points: 'DAY 1:LEARN, DAY 3:REVIEW, DAY 7:REVIEW, DAY 21:REVIEW', highlight: 0 } },
      { visual: 'hero', dur: 4.2, kicker: 'Two. Close the book and test yourself.', lines: [L('Pulling it *from memory* makes it stick.', 2.0)], p: { tag: 'REREAD', strike: true, icon: 'book', symbols: false, doubters: false } },
      { visual: 'counter', dur: 4.0, kicker: 'Three. Sleep on it.', lines: [L('Your brain *files it away* overnight.', 1.6)], p: { label: 'HOURS OF SLEEP', value: 8, prefix: '', pill: 'NOT OPTIONAL', heroes: 1, object: 'book', symbol: '' } },
      { visual: 'pedestals', dur: 3.6, kicker: 'Space it, test it, sleep on it.', lines: [L('Same hours. *Far more* remembered.', 1.6)], p: { items: 'book:SPACE, target:TEST, star:SLEEP' } },
      CTA('*Follow* for more ways to learn faster.', 'SAVE THIS FOR EXAM WEEK'),
    ],
  };
  const myth = {
    title: 'Myth vs fact (format starter)', aspect: '9:16', style: 'newsroom', progress: true,
    scenes: [
      { visual: 'hook', dur: 2.6, kicker: '', lines: [L('You have heard this your *whole life.*', 0)], p: { big: 'MYTH', sub: 'LIGHTNING NEVER STRIKES TWICE', icon: 'bolt' } },
      { visual: 'versus', dur: 3.6, kicker: 'Everyone repeats it.', lines: [L('It is *completely wrong.*', 1.6)], p: { crowd: 3, tag: 'NEVER TWICE' } },
      { visual: 'counter', dur: 4.2, kicker: 'The Empire State Building gets hit', lines: [L('about *23 times* every year.', 1.4)], p: { label: 'STRIKES PER YEAR', value: 23, prefix: '', pill: 'ONE BUILDING', heroes: 1, object: 'bolt', symbol: '' } },
      { visual: 'steps', dur: 4.4, kicker: 'Lightning looks for three things.', lines: [L('The same spot wins *again and again.*', 3.0)], p: { items: 'TALL, POINTED, STANDING ALONE', highlight: 0 } },
      { visual: 'hero', dur: 4.0, kicker: 'So a spot that was just hit', lines: [L('is *not* the safe place to stand.', 1.5)], p: { tag: 'SAFE HERE', strike: true, icon: 'bolt', symbols: false, doubters: false } },
      CTA('*Follow* for more myths that are wrong.', 'MYTH VS FACT'),
    ],
  };
  const how = {
    title: 'How it works (format starter)', aspect: '9:16', style: 'blueprint', progress: true,
    scenes: [
      { visual: 'hook', dur: 2.8, kicker: '', lines: [L('Your headphones *make noise* to create silence.', 0)], p: { big: 'SHHH', sub: 'HOW NOISE CANCELLING WORKS', icon: 'none' } },
      { visual: 'steps', dur: 5.0, kicker: 'It happens in three steps.', lines: [L('Faster than you can *notice.*', 3.4)], p: { items: 'A MIC HEARS THE NOISE, A CHIP FLIPS THE WAVE, THE TWO CANCEL OUT', highlight: 2 } },
      { visual: 'compare', dur: 4.2, kicker: 'The second wave is a mirror image.', lines: [L('Add them together and you get *zero.*', 1.9)], p: { left: 'NOISE', right: 'ANTI-NOISE', label: 'WAVE HEIGHT', leftValue: 1, rightValue: -1, prefix: '', suffix: '', winner: 'none' } },
      { visual: 'pedestals', dur: 4.4, kicker: 'It works best on steady, low sounds.', lines: [L('Engines, air con and traffic *disappear.*', 2.0)], p: { items: 'rocket:ENGINES, house:AIR CON, globe:TRAFFIC' } },
      { visual: 'hero', dur: 3.8, kicker: 'Sudden sounds are too fast to predict.', lines: [L('So you still hear *your name.*', 1.5)], p: { tag: 'TOTAL SILENCE', strike: true, icon: 'bulb', symbols: false, doubters: false } },
      CTA('*Follow* to see how more things work.', 'HOW IT WORKS'),
    ],
  };
  const versusFmt = {
    title: 'This vs that (format starter)', aspect: '9:16', style: 'magazine', progress: true,
    scenes: [
      { visual: 'hook', dur: 2.6, kicker: '', lines: [L('Which one really *wakes you up* more?', 0)], p: { big: 'VS', sub: 'COFFEE OR TEA', icon: 'none' } },
      { visual: 'compare', dur: 4.4, kicker: 'Cup for cup, it is not close.', lines: [L('Coffee has about *twice* the caffeine.', 1.9)], p: { left: 'TEA', right: 'COFFEE', label: 'MG OF CAFFEINE', leftValue: 48, rightValue: 96, prefix: '', suffix: '', winner: 'right' } },
      { visual: 'bars', dur: 4.4, kicker: 'It even beats an energy drink', lines: [L('when the cup is the *same size.*', 1.6)], p: { bars: 'BLACK TEA:48, ENERGY DRINK:79, COFFEE:96', prefix: '', suffix: ' MG', highlight: 3, label: 'PER 8 OZ CUP' } },
      { visual: 'counter', dur: 4.0, kicker: 'Most healthy adults can have up to', lines: [L('about *400 milligrams* a day.', 1.4)], p: { label: 'MG A DAY', value: 400, prefix: '', pill: 'ABOUT 4 COFFEES', heroes: 1, object: 'heart', symbol: '' } },
      { visual: 'steps', dur: 4.0, kicker: 'So the choice is simple.', lines: [L('Pick the *dose,* not the drink.', 2.4)], p: { items: 'NEED A JOLT = COFFEE, WANT IT GENTLE = TEA', highlight: 0 } },
      CTA('*Follow* for more quick comparisons.', 'THIS VS THAT'),
    ],
  };
  const news = {
    title: 'News in 30 seconds (fill in the blanks)', aspect: '9:16', style: 'newsroom', progress: true,
    scenes: [
      { visual: 'hook', dur: 2.6, kicker: '', lines: [L('[What happened, with one *surprising* word.]', 0)], p: { big: '[#]', sub: '[WHAT THE NUMBER MEASURES]', icon: 'none' } },
      { visual: 'timeline', dur: 4.6, kicker: '[How we got here, in one line.]', lines: [L('[The moment it *changed.*]', 3.0)], p: { points: '[DATE]:[EVENT], [DATE]:[EVENT], [DATE]:[EVENT]', highlight: 3 } },
      { visual: 'compare', dur: 4.2, kicker: '[What is being compared.]', lines: [L('[The gap, in *plain words.*]', 1.9)], p: { left: 'BEFORE', right: 'NOW', label: '[UNIT]', leftValue: 1, rightValue: 2, prefix: '', suffix: '', winner: 'right' } },
      { visual: 'versus', dur: 3.8, kicker: '[Who is unhappy about it.]', lines: [L('[Their argument in *five words.*]', 1.6)], p: { crowd: 3, tag: '[THEIR CLAIM]' } },
      { visual: 'counter', dur: 4.0, kicker: '[The number that matters most]', lines: [L('[and why it is *a big deal.*]', 1.4)], p: { label: '[UNIT]', value: 100, prefix: '', pill: '[SOURCE]', heroes: 1, object: 'doc', symbol: '' } },
      { visual: 'hero', dur: 4.0, kicker: '[What happens next.]', lines: [L('[What it means *for you.*]', 1.5)], p: { tag: '[OLD ASSUMPTION]', strike: true, icon: 'bulb', symbols: false, doubters: false } },
      CTA('*Follow* for the news in 30 seconds.', '[YOUR ACCOUNT]'),
    ],
  };
  root.PSP_PRESETS = Object.assign(root.PSP_PRESETS || {}, { finance, general, list, myth, how, versus: versusFmt, news });
})(typeof window !== 'undefined' ? window : globalThis);
