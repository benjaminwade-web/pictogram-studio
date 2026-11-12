// node render.js <preset-name | project.json> <out.mp4> [--w 1920] [--style id] [--from s --to s] [--stills 1.5,7.8 --sheet out.jpg] [--audio file]
const { chromium } = require('playwright'); const { spawn, execFileSync } = require('child_process'); const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : args[i + 1]; };
(async () => {
  const src = args[0], out = args[1], w = +(opt('w') || 1920), FPS = 30;
  const p = fs.existsSync(src) ? JSON.parse(fs.readFileSync(src, 'utf8')) : src;
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const page = await browser.newPage();
  page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.join(__dirname, 'render.html')); if (fs.existsSync(path.join(__dirname, 'presets.example.js'))) await page.addScriptTag({ path: path.join(__dirname, 'presets.example.js') }); const info = await page.evaluate(([p, w, st]) => setup(p, w, st), [p, w, opt('style')]);
  console.log(info);
  if (opt('stills')) {
    const dir = fs.mkdtempSync('/tmp/stills-'); const ts = opt('stills').split(',').map(Number);
    for (let i = 0; i < ts.length; i++) fs.writeFileSync(path.join(dir, String(i).padStart(3, '0') + '.jpg'), Buffer.from(await page.evaluate(t => frame(t, 0.9), ts[i]), 'base64'));
    const cols = +(opt('cols') || 4), tw = +(opt('tw') || 640);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(dir, '%03d.jpg'), '-vf', `scale=${tw}:-1,tile=${cols}x${Math.ceil(ts.length / cols)}`, '-frames:v', '1', opt('sheet') || out]);
    await browser.close(); return;
  }
  const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
  if (opt('audio')) ffArgs.push('-i', opt('audio'), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-shortest');
  ffArgs.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] }); const F0 = Math.round(+(opt('from') || 0) * FPS), N = Math.round(Math.min(info.dur, +(opt('to') || 1e9)) * FPS), t0 = Date.now();
  for (let f = F0; f < N; f++) {
    const buf = Buffer.from(await page.evaluate(t => frame(t), f / FPS), 'base64'); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(f + '/' + N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close(); console.log('wrote', out);
})();
