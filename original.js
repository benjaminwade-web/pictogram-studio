// Original films: every video is its own hand-written animation (videos/<slug>/film.js). See ORIGINAL.md.
//   node original.js voice  videos/<slug> [george|brian|bill|daniel|adam|<voice id>] [--speed 1.05]   voiceover.txt -> voice.mp3 + voice-words.json
//   node original.js sheet  videos/<slug> [--at 1.2,5,9]   check-sheet.jpg (one still per spoken sentence unless --at is given)
//   node original.js render videos/<slug> [--w 1920] [--from s --to s]   <slug>_9x16.mp4, with voice.mp3 when it exists
const { chromium } = require('playwright'); const { spawn, execFileSync } = require('child_process'); const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : args[i + 1]; };
const cmd = args[0], dir = path.resolve(args[1] || '.'), slug = path.basename(dir);
const VOICES = { brian: 'nPczCjzI2devNBz1zQrb', george: 'JBFqnCBsd6RMkjVDRZzb', bill: 'pqHfZKP75CvOlQylNhV4', daniel: 'onwK4e9ZLuTAKqWW03F9', adam: 'pNInz6obpgDQGcFmaJgB' };

if (cmd === 'voice') {
  const nm = (args[2] && !/^--/.test(args[2]) ? args[2] : 'george'), id = VOICES[nm.toLowerCase()] || nm;
  const text = fs.readFileSync(path.join(dir, 'voiceover.txt'), 'utf8').trim();
  const body = JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.25, speed: +(opt('speed') || 1.05) } });
  const key = process.env.ELEVENLABS_API_KEY ? ['-H', 'xi-api-key: ' + process.env.ELEVENLABS_API_KEY] : []; // otherwise the network adds the key
  const r = JSON.parse(String(execFileSync('curl', ['-sS', '-X', 'POST', `https://api.elevenlabs.io/v1/text-to-speech/${id}/with-timestamps?output_format=mp3_44100_128`, '-H', 'Content-Type: application/json', ...key, '--data-binary', '@-'], { input: body, maxBuffer: 1 << 28 })) || '{}');
  if (!r.audio_base64) { console.error('VOICE FAILED: ' + JSON.stringify(r.detail || r).slice(0, 300)); process.exit(1); }
  fs.writeFileSync(path.join(dir, 'voice.mp3'), Buffer.from(r.audio_base64, 'base64'));
  const al = r.alignment || r.normalized_alignment, W = []; let cur = null;
  al.characters.forEach((ch, i) => { if (/\s/.test(ch)) { if (cur) W.push(cur); cur = null; return; } if (!cur) cur = { w: '', s: al.character_start_times_seconds[i] }; cur.w += ch; cur.e = al.character_end_times_seconds[i]; }); if (cur) W.push(cur);
  fs.writeFileSync(path.join(dir, 'voice-words.json'), JSON.stringify({ voice: nm, words: W }));
  console.log('voiced with ' + nm + ': ' + W.length + ' words, ' + W[W.length - 1].e.toFixed(1) + 's'); process.exit(0);
}

(async () => {
  const filmFile = path.join(dir, 'film.js'); if (!fs.existsSync(filmFile)) { console.error('no film.js in ' + dir); process.exit(1); }
  const wf = path.join(dir, 'voice-words.json'), words = fs.existsSync(wf) ? JSON.parse(fs.readFileSync(wf, 'utf8')).words : [];
  if (!words.length) console.log('note: no voice-words.json yet, so word times are missing; run "node original.js voice" first');
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const page = await browser.newPage();
  const errs = []; page.on('console', m => console.log('[film]', m.text())); page.on('pageerror', e => { errs.push(e.message); console.log('[film error]', e.message); });
  await page.goto('file://' + path.join(__dirname, 'original', 'film.html')); await page.addScriptTag({ path: filmFile });
  const info = await page.evaluate(([w, h]) => setup(w, h), [words, +(opt('w') || 1920)]); console.log(info.w + 'x' + info.h + ', ' + info.dur.toFixed(1) + 's, ' + info.sentences.length + ' sentences');
  const done = async code => { const miss = await page.evaluate(() => missing()).catch(() => []); if (miss.length) console.log('WORDS NOT FOUND IN THE VOICE (those moments fall back to 0 s): ' + miss.join(', '));
    await browser.close().catch(() => {}); process.exit(errs.length ? 1 : code); };
  if (cmd === 'sheet') {
    const ts = opt('at') ? opt('at').split(',').map(Number) : info.sentences.map(([s, e]) => +(Math.min(e, s + Math.max(0.9, (e - s) * 0.75))).toFixed(2)).concat([info.dur - 0.2]);
    const tmp = fs.mkdtempSync('/tmp/film-'); for (let i = 0; i < ts.length; i++) fs.writeFileSync(path.join(tmp, String(i).padStart(3, '0') + '.jpg'), Buffer.from(await page.evaluate(t => frame(t, 0.9), ts[i]), 'base64'));
    const cols = 4; execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(tmp, '%03d.jpg'), '-vf', `scale=360:-1,tile=${cols}x${Math.ceil(ts.length / cols)}:padding=6:color=white`, '-frames:v', '1', path.join(dir, 'check-sheet.jpg')]);
    console.log('wrote check-sheet.jpg at ' + ts.join(', ')); return done(0);
  }
  if (cmd === 'render') {
    const FPS = 30, voice = path.join(dir, 'voice.mp3'), out = path.join(dir, slug + '_9x16.mp4');
    const ff = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
    if (fs.existsSync(voice)) ff.push('-i', voice, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k');
    ff.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-maxrate', '6M', '-bufsize', '12M', '-preset', 'medium', '-movflags', '+faststart', out);
    const p = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] }); const F0 = Math.round(+(opt('from') || 0) * FPS), N = Math.round(Math.min(info.dur, +(opt('to') || 1e9)) * FPS), t0 = Date.now();
    for (let f = F0; f < N; f++) { const buf = Buffer.from(await page.evaluate(t => frame(t), f / FPS), 'base64'); if (!p.stdin.write(buf)) await new Promise(r => p.stdin.once('drain', r)); if (f % 150 === 0) console.log(f + '/' + N, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
    p.stdin.end(); await new Promise(r => p.on('close', r)); console.log('wrote ' + out); return done(0);
  }
  console.error('use: voice | sheet | render'); done(1);
})();
