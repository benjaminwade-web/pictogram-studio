// node photo.js projects/<slug>.json <key> "File:Some photo.jpg" [--w 900]
// Adds a freely licensed photo from Wikimedia Commons to a project: downloads it, shrinks it, stores it inside the
// project as `assets.<key>` (so the page and the renderer need no internet), and adds the photo credit to `sources`.
// Use it in a custom scene with {"is": "photo", "src": "<key>", "w": 60, "frame": "sticker"}.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : args[i + 1]; };
const [file, key, title] = args; if (!file || !key || !title) { console.log('usage: node photo.js projects/<slug>.json <key> "File:Name.jpg" [--w 900]'); process.exit(1); }
const W = +(opt('w') || 900), UA = 'PictogramStudio/1.0 (educational explainer video tool)';
const get = (url, out) => execFileSync('curl', ['-sSL', '--fail', '--retry', '4', '--retry-delay', '10', '-m', '60', '-A', UA, ...(out ? ['-o', out] : []), url], { maxBuffer: 64 << 20 }); // curl follows the proxy settings
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const cacheDir = path.join(__dirname, 'photo-cache'), cname = title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w.-]+/g, '_') + (W !== 900 ? '_' + W : '');
const save = (p, b, meta) => { const pr = JSON.parse(fs.readFileSync(file, 'utf8')); pr.assets = pr.assets || {}; pr.assets[key] = 'data:image/jpeg;base64,' + fs.readFileSync(b).toString('base64');
  pr.sources = (pr.sources || []).filter(s => !(s && s.photo === key));
  pr.sources.push({ photo: key, claim: 'Photo: ' + meta.title.replace(/^File:/, ''), source: `${meta.who}, ${meta.lic}, via Wikimedia Commons`, url: meta.url });
  fs.writeFileSync(file, JSON.stringify(pr, null, 1)); console.log('added', key, Math.round(fs.statSync(b).size / 1024) + ' KB', '|', meta.lic, '|', meta.who); };
(async () => {
  // Commons rate-limits repeat calls, so every photo is kept in photo-cache/ and reused next time.
  const cj = path.join(cacheDir, cname + '.json'), cb = path.join(cacheDir, cname + '.jpg');
  if (fs.existsSync(cj) && fs.existsSync(cb)) return save(null, cb, JSON.parse(fs.readFileSync(cj, 'utf8')));
  const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=' + W + '&titles=' + encodeURIComponent(title.startsWith('File:') ? title : 'File:' + title);
  const info = JSON.parse(get(api).toString()), page = Object.values(info.query.pages)[0];
  if (!page.imageinfo) throw new Error('Not found on Commons: ' + title);
  const ii = page.imageinfo[0], m = ii.extmetadata || {}, lic = strip(m.LicenseShortName && m.LicenseShortName.value), who = strip(m.Artist && m.Artist.value) || 'unknown author';
  if (!/^(CC0|CC BY|Public domain|PD|GFDL)/i.test(lic)) console.log('WARNING: check this licence before publishing:', lic);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-')), a = path.join(tmp, 'in'), b = path.join(tmp, 'out.jpg'); get(ii.thumburl || ii.url, a);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', a, '-vf', `scale='min(${W},iw)':-2`, '-q:v', '4', b]);
  const meta = { title: strip(page.title), who, lic, url: ii.descriptionurl };
  fs.mkdirSync(cacheDir, { recursive: true }); fs.copyFileSync(b, cb); fs.writeFileSync(cj, JSON.stringify(meta));
  save(null, cb, meta);
})().catch(e => { console.error(e.message); process.exit(1); });
