// node build-original.js -> studio.artifact.html (publish) and "Pictogram Studio.html" (double-click on a PC). The old template page is build.js.
const fs = require('fs'), path = require('path'), d = __dirname, r = f => fs.readFileSync(path.join(d, f), 'utf8');
const ex = path.join(d, 'videos/tulip-mania-original');
const EXAMPLE = { id: 0, code: r('videos/tulip-mania-original/film.js'), words: JSON.parse(r('videos/tulip-mania-original/voice-words.json')).words,
  audio: fs.existsSync(path.join(ex, 'voice.mp3')) ? 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(ex, 'voice.mp3')).toString('base64') : null,
  plan: { title: 'The tulip crash that never ruined anyone', idea: 'tulip mania was not what we were told',
    sentences: r('videos/tulip-mania-original/voiceover.txt').trim().split(/\n+/),
    direction: { medium: '1630s Dutch ink engraving on laid paper, with oil-painting bookends', influences: 'Golden Age still lifes and satirical prints of 1637', palette: ['#eee1c1', '#22170f', '#c2321d', '#cf9f3f', '#3e2814'],
      characters: [{ name: 'Pieter', look: 'bulb trader, tall hat, millstone ruff, red sash', personality: 'smug, then sorry' }, { name: 'The historian', look: 'red cardigan, round glasses' }], motion: 'hand-drawn line boil, page slides, an ink blot into the paintings' },
    caption: 'The most famous market crash in history probably never ruined anyone.', hashtags: ['history', 'tulipmania', 'economics', 'bubble'],
    facts: [{ claim: '10,000 guilders for one bulb; a skilled worker earned about 300 a year', source: 'Wikipedia, Tulip mania', confidence: 'well known' }, { claim: 'Haarlem buyers could cancel for 3.5% of the price', source: 'Wikipedia, Tulip mania', confidence: 'well known' }, { claim: 'Only a handful of traders were ruined', source: 'Anne Goldgar, Tulipmania (2007)', confidence: 'well known' }] } };
const html = r('studio-original.src.html').replace('//@@STAGE', () => r('original/stage.js')).replace('//@@EXAMPLE', () => JSON.stringify(EXAMPLE).replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync(path.join(d, 'studio.artifact.html'), html);
fs.writeFileSync(path.join(d, 'Pictogram Studio.html'), '<!doctype html><html lang="en"><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html + '</body></html>');
console.log('built', (html.length / 1e6).toFixed(2) + ' MB');
