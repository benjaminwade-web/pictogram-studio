// 3D original films (videos/<slug>/film3d.js, an ES module). See ORIGINAL.md.
//   node original3d.js sheet  videos/<slug> [--at 1,2,3] [--h 960]
//   node original3d.js render videos/<slug> [--h 1920] [--from s --to s] [--words voice-words-tight.json] [--jobs 3]
//   node original3d.js cues   videos/<slug>   writes sound.json (music plan and sound-effect cues) for soundtrack.py
const { chromium } = require('playwright'); const { spawn, execFileSync } = require('child_process'); const fs = require('fs'), path = require('path'), http = require('http');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : args[i + 1]; };
const cmd = args[0], dir = path.resolve(args[1] || '.'), slug = path.basename(dir), ROOT = __dirname;
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); const f = u.startsWith('/film/') ? path.join(dir, u.slice(6)) : path.join(ROOT, u);
  if (!f.startsWith(ROOT) && !f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }); s.listen(0, () => r(s)); }); }
async function open(srv, h) {
  const wf = path.join(dir, opt('words') || (fs.existsSync(path.join(dir, 'voice-words-tight.json')) ? 'voice-words-tight.json' : 'voice-words.json')); const words = fs.existsSync(wf) ? JSON.parse(fs.readFileSync(wf, 'utf8')).words : [];
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] }); const page = await browser.newPage();
  const errs = []; page.on('console', m => console.log('[film]', m.text())); page.on('pageerror', e => { errs.push(e.message); console.log('[film error]', e.message); });
  await page.goto(`http://localhost:${srv.address().port}/original3d/stage3d.html`); await page.waitForFunction(() => window.setup);
  const info = await page.evaluate(([w, h]) => setup('/film/film3d.js?' + Date.now(), w, h), [words, h]); return { browser, page, info, errs, wfile: wf };
}
(async () => {
  const srv = await serve(); const h = +(opt('h') || (cmd === 'sheet' ? 960 : 1920));
  const { browser, page, info, errs, wfile } = await open(srv, h); console.log(info.w + 'x' + info.h + ', ' + info.dur.toFixed(1) + 's, words from ' + path.basename(wfile));
  const end = async c => { const m = await page.evaluate(() => missing()).catch(() => []); if (m.length) console.log('WORDS NOT FOUND IN THE VOICE: ' + m.join(', ')); await browser.close(); srv.close(); process.exit(errs.length ? 1 : c); };
  if (cmd === 'cues') { const s = await page.evaluate(() => sound()); fs.writeFileSync(path.join(dir, 'sound.json'), JSON.stringify(s, null, 1)); console.log('wrote sound.json with ' + ((s && s.cues) || []).length + ' cues'); return end(0); }
  if (cmd === 'sheet') {
    const ts = opt('at') ? opt('at').split(',').map(Number) : info.sentences.map(([s, e]) => +(Math.min(e, s + Math.max(0.9, (e - s) * 0.75))).toFixed(2)).concat([info.dur - 0.2]);
    const tmp = fs.mkdtempSync('/tmp/f3-'); const t0 = Date.now(); for (let i = 0; i < ts.length; i++) fs.writeFileSync(path.join(tmp, String(i).padStart(3, '0') + '.jpg'), Buffer.from(await page.evaluate(t => frame(t, 0.9), ts[i]), 'base64'));
    console.log(((Date.now() - t0) / ts.length / 1000).toFixed(2) + ' s per frame');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(tmp, '%03d.jpg'), '-vf', `scale=360:-1,tile=4x${Math.ceil(ts.length / 4)}:padding=6:color=white`, '-frames:v', '1', path.join(dir, 'check-sheet.jpg')]);
    console.log('wrote check-sheet.jpg at ' + ts.join(', ')); return end(0);
  }
  if (cmd === 'render') { // frames to numbered jpgs (can be split across jobs with --from/--to), then encode
    const FPS = 30, fdir = path.join(dir, 'frames'); fs.mkdirSync(fdir, { recursive: true });
    const F0 = Math.round(+(opt('from') || 0) * FPS), N = Math.round(Math.min(info.dur, +(opt('to') || 1e9)) * FPS), t0 = Date.now();
    for (let f = F0; f < N; f++) { const fn = path.join(fdir, String(f).padStart(5, '0') + '.jpg'); if (fs.existsSync(fn) && !args.includes('--force')) continue; fs.writeFileSync(fn, Buffer.from(await page.evaluate(t => frame(t, 0.94), f / FPS), 'base64')); if (f % 60 === 0) console.log(f + '/' + N, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
    console.log('frames done ' + F0 + '-' + N); return end(0);
  }
  console.error('use: sheet | render | cues'); end(1);
})();
