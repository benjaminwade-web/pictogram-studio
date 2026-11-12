// One command from a project file to a finished package.
//   node make.js <project.json> [--voice voice.mp3] [--out videos] [--wps 2.9] [--keep-timing] [--no-video] [--w 1080]
// Writes videos/<slug>/ with: the MP4, a check sheet (one still per scene), voiceover.txt, post.txt, sources.md, the project file and package.md.
// Extra fields this reads from the project (all optional): idea, audience, hooks[], caption, hashtags[], sources[{claim, source, url}], notes.
const fs = require('fs'), path = require('path'), { execFileSync, spawnSync } = require('child_process');
global.window = global; require('./engine.js'); const PSP = global.PSP;
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : args[i + 1]; }, has = k => args.indexOf('--' + k) >= 0;
if (!args[0] || !fs.existsSync(args[0])) { console.error('usage: node make.js <project.json> [--voice file] [--out dir] [--wps 2.9] [--keep-timing] [--no-video]'); process.exit(2); }
const raw = JSON.parse(fs.readFileSync(args[0], 'utf8')), proj = PSP.normalize(JSON.parse(JSON.stringify(raw)));
const slug = (opt('name') || proj.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'video';
const dir = path.join(opt('out') || path.join(__dirname, 'videos'), slug); fs.mkdirSync(dir, { recursive: true });
const voice = opt('voice'); let voiceDur = 0, fitNote = '';
if (voice) { // fit the scenes to the real voice
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', voice, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], { maxBuffer: 1 << 30 });
  const f = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 4)); voiceDur = f.length / 16000;
  const an = PSP.analyseAudio([f], 16000, f.length), snapped = PSP.fitVoice(proj, an, voiceDur);
  fitNote = `Fitted to the voice (${voiceDur.toFixed(1)} s): ${snapped} of ${proj.scenes.length - 1} scene changes sit on a pause.`;
} else if (!has('keep-timing')) PSP.autotime(proj, +(opt('wps') || 2.9));
const D = PSP.duration(proj), checks = PSP.check(proj, voiceDur), failed = checks.filter(c => !c.ok), lines = PSP.script(proj), words = lines.join(' ').split(/\s+/).length;
const tall = proj.aspect === '9:16', shape = tall ? '9x16' : '16x9', mp4 = `${slug}_${shape}${voice ? '_voiced' : ''}.mp4`;
// files
fs.writeFileSync(path.join(dir, slug + '.json'), JSON.stringify(proj, null, 1));
fs.writeFileSync(path.join(dir, 'voiceover.txt'), lines.join('\n\n') + '\n');
const tags = (proj.hashtags || []).map(h => '#' + String(h).replace(/^#/, '').replace(/\s+/g, '')).join(' ');
fs.writeFileSync(path.join(dir, 'post.txt'), [proj.caption || '', tags, '', 'Other hooks to test:', ...(proj.hooks || []).map(h => '- ' + String(h).replace(/\*/g, ''))].join('\n').trim() + '\n');
const src = proj.sources || [];
fs.writeFileSync(path.join(dir, 'sources.md'), '# Sources\n\n' + (src.length ? src.map(s => `- ${s.claim}${s.source ? ' (' + s.source + ')' : ''}${s.url ? ': ' + s.url : ''}`).join('\n') : 'No outside facts were used.') + '\n' + (proj.notes ? '\n## Notes\n\n' + proj.notes + '\n' : ''));
// pictures
const run = a => { const r = spawnSync('node', [path.join(__dirname, 'render.js')].concat(a), { cwd: __dirname, stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 }), o = String(r.stdout || ''); // a scene that fails to draw prints [page] lines: stop, because the video would have a blank scene
  if (r.status || /\[page(error)?\]/.test(o)) { console.error('DRAWING ERROR, nothing usable was made:\n' + o.split('\n').filter(l => /\[page/.test(l)).slice(0, 5).join('\n')); process.exit(1); } };
const stills = proj.scenes.map((s, i) => (PSP.startOf(proj, i) + Math.min(s.dur - 0.2, Math.max(s.dur * 0.75, (s.lines[s.lines.length - 1].at || 0) + 0.8))).toFixed(2));
run([path.join(dir, slug + '.json'), 'x', '--stills', stills.join(','), '--sheet', path.join(dir, 'check-sheet.jpg'), '--tw', '360', '--cols', String(Math.min(5, proj.scenes.length))]);
if (!has('no-video')) run([path.join(dir, slug + '.json'), path.join(dir, mp4), '--w', opt('w') || (tall ? '1080' : '1920')].concat(voice ? ['--audio', voice] : []));
// summary
const md = [`# ${proj.title}`, '', proj.idea ? `Idea: ${proj.idea}` : '', `Style: ${PSP.STYLES[proj.style].name}. Shape: ${proj.aspect}. Length: ${D.toFixed(1)} seconds, ${proj.scenes.length} scenes, ${words} spoken words.`, fitNote, '',
  '## Retention check', '', `${checks.length - failed.length} of ${checks.length} pass.`, ...failed.map(c => `- NOT PASSING: ${c.msg}. ${c.fix}`), '',
  '## Files', '', has('no-video') ? '' : `- \`${mp4}\`: the video${voice ? ', with the voice' : ' (silent)'}.`, '- `check-sheet.jpg`: one picture per scene.', '- `voiceover.txt`: the script to paste into ElevenLabs, one paragraph per scene.', '- `post.txt`: caption, hashtags and other hooks to test.', '- `sources.md`: where each fact came from.', `- \`${slug}.json\`: the project. Paste its text into "Load a project" in Pictogram Studio to edit it.`, '',
  '## Scenes', '', ...proj.scenes.map((s, i) => `${i + 1}. (${PSP.VISUALS[s.visual].name}, ${s.dur.toFixed(1)} s) ${lines[i]}`), '',
  voice ? '' : '## To add the voice\n\n1. Paste `voiceover.txt` into ElevenLabs and download the MP3. If you want it faster, set the speed in ElevenLabs, not in CapCut, so the pictures stay in step.\n2. Send the MP3 back and ask for the video to be fitted to it, or add it yourself in Pictogram Studio (Voiceover box, then "Fit scenes to the voice", then "Record video").', ''].filter(x => x !== '').join('\n');
fs.writeFileSync(path.join(dir, 'package.md'), md.replace(/\n(#+ )/g, '\n\n$1').replace(/\n\n\n+/g, '\n\n') + '\n');
console.log(JSON.stringify({ dir, mp4: has('no-video') ? null : mp4, seconds: +D.toFixed(1), scenes: proj.scenes.length, words, checks: `${checks.length - failed.length}/${checks.length}`, failed: failed.map(c => c.msg + ' | ' + c.fix), fit: fitNote }, null, 1));
