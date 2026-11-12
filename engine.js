/* Pictogram explainer engine. One function of time: PSP.render(ctx, project, t).
   Used by the editor page (live preview + recording) and by render.js (MP4 export). */
(function (root) {
  'use strict';
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v), lerp = (a, b, p) => a + (b - a) * p;
  const eo = p => 1 - Math.pow(1 - p, 3), ei = p => p * p * p;
  const eio = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const back = p => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const ramp = (t, a, d) => clamp((t - a) / d);
  const TAU = Math.PI * 2;
  const rgba = (hex, a) => {
    let h = String(hex || '#ffffff').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16) || 0; return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const list = s => String(s == null ? '' : s).split(',').map(x => x.trim()).filter(Boolean);
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // steady pseudo-random number from an index
  const mod = (a, b) => ((a % b) + b) % b;
  const toRGB = s => { s = String(s || ''); if (s[0] === '#') { let h = s.slice(1); if (h.length === 3) h = h.split('').map(q => q + q).join(''); const n = parseInt(h.slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; } const m = s.match(/[\d.]+/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [128, 128, 128]; };
  const mixc = (a, b, f) => { const A = toRGB(a), B = toRGB(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(',') + ')'; }; // blend two colours
  const FONTS = {
    Inter: '"Inter", "Helvetica Neue", Arial, sans-serif',
    'Space Grotesk': '"Space Grotesk", "Inter", Arial, sans-serif',
    Archivo: '"Archivo", "Inter", Arial, sans-serif',
    'Bebas Neue': '"Bebas Neue", "Archivo", Impact, sans-serif',
    'DM Serif Display': '"DM Serif Display", Georgia, serif',
    'JetBrains Mono': '"JetBrains Mono", ui-monospace, Menlo, monospace',
    Fredoka: '"Fredoka", "Inter", Arial, sans-serif',
  };
  const FONTW = { 'Bebas Neue': 400, 'DM Serif Display': 400 }; // single-weight faces
  /* A style is a complete look: colors, font, transition and the "look" switches below. Scenes never mention a style. */
  const LOOK0 = { pattern: 'dots', glow: 1, figure: 'solid', people: 'real', cap: 'color', caps: true, ground: 'dashed', vignette: 0.9, capScale: 1, capLs: 0.045, ambient: 'none', grain: 0, capAnim: 'words', scenery: 'auto', paper: 0 };
  const STYLES = {
    neon: { name: 'Neon terminal', colors: { bg: '#050606', fg: '#f4f4f2', accent: '#4dff88' }, font: 'Inter', transition: 'auto', look: { ambient: 'pebbles', grain: 0.3 } },
    whiteboard: { name: 'Whiteboard', colors: { bg: '#f1f3f5', fg: '#16191d', accent: '#ff4b3e' }, font: 'Fredoka', transition: 'auto', look: { pattern: 'grid', glow: 0, figure: 'outline', cap: 'underline', caps: false, ground: 'solid', vignette: 0, capScale: 1.08, capLs: 0.01 } },
    blueprint: { name: 'Blueprint', colors: { bg: '#0c2f66', fg: '#e8f1ff', accent: '#ffd84d' }, font: 'JetBrains Mono', transition: 'drop', look: { ambient: 'dust', pattern: 'grid', glow: 0.3, figure: 'outline', cap: 'color', caps: true, ground: 'solid', vignette: 0.5, capScale: 0.84, capLs: 0 } },
    newsroom: { name: 'Newsroom', colors: { bg: '#101216', fg: '#ffffff', accent: '#ff3b3b' }, font: 'Bebas Neue', transition: 'cut', look: { pattern: 'none', glow: 0.15, figure: 'solid', cap: 'box', caps: true, ground: 'solid', vignette: 0.6, capScale: 1.45, capLs: 0.03 } },
    arcade: { name: 'Arcade CRT', colors: { bg: '#130a26', fg: '#f3e8ff', accent: '#3df5ff' }, font: 'Space Grotesk', transition: 'auto', look: { ambient: 'dust', grain: 0.3, pattern: 'scanlines', glow: 1.3, figure: 'solid', cap: 'color', caps: true, ground: 'dashed', vignette: 0.9 } },
    magazine: { name: 'Magazine', colors: { bg: '#18140f', fg: '#f3eadc', accent: '#ff8a3d' }, font: 'DM Serif Display', transition: 'fade', look: { grain: 0.45, pattern: 'paper', glow: 0.12, figure: 'solid', cap: 'underline', caps: false, ground: 'solid', vignette: 0.7, capScale: 1.18, capLs: 0 } },
    storybook: { name: 'Storybook', colors: { bg: '#efe4cc', fg: '#2a211b', accent: '#c4472d' }, font: 'DM Serif Display', transition: 'whip', look: { scenery: 'painted', paper: 0.55, grain: 0.2, pattern: 'paper', glow: 0, figure: 'solid', cap: 'box', caps: false, ground: 'none', vignette: 0.45, capScale: 1.12, capLs: 0 } },
    cutpaper: { name: 'Cut paper', colors: { bg: '#f1e6cf', fg: '#2b201a', accent: '#cf4a2c' }, font: 'Archivo', transition: 'stripes', look: { scenery: 'painted', people: 'doll', dof: true, horizon: 230, ribbon: true, era: 'past', peopleScale: 1.3, lower: 120, capCard: false, capHalo: true, stripe: '#e8b23a', paper: 0.5, grain: 0.18, pattern: 'paper', glow: 0, figure: 'solid', cap: 'box', caps: false, ground: 'none', vignette: 0.4, capScale: 1.06, capLs: 0 } },
    pop: { name: 'Sticker pop', colors: { bg: '#ffd84d', fg: '#15151a', accent: '#2f55ff' }, font: 'Archivo', transition: 'zoom', look: { pattern: 'dots', glow: 0, figure: 'solid', cap: 'box', caps: true, ground: 'solid', vignette: 0, capScale: 1.02, capLs: 0.02 } },
  };
  const ICONS = ['chest', 'coin', 'diamond', 'bar', 'friends', 'bulb', 'star', 'dice', 'pin', 'house', 'bank', 'bag', 'doc', 'chart', 'heart', 'phone', 'rocket', 'book', 'globe', 'trophy', 'flame', 'bolt', 'target', 'flower'];

  /* ---------- drawing kit (one instance per frame) ---------- */
  class G {
    constructor(ctx, proj, sc, t, vert) {
      this.ctx = ctx; this.t = t; this.d = sc.dur; this.P = sc.p || {}; this.vert = vert; this.words = Array.isArray(sc.words) ? sc.words : []; // the time of each spoken word, when the voice came with timings
      const L = sc.lines || [];
      this.T1 = L[0] ? +L[0].at || 0 : 0; this.hasL2 = !!(L[1] && L[1].text);
      this.T2 = this.hasL2 ? +L[1].at : Math.min(sc.dur * 0.6, this.T1 + 1.4);
      this.fg = proj.colors.fg; this.ac = proj.colors.accent; this.bg = proj.colors.bg;
      this.ff = FONTS[proj.font] || FONTS.Inter; this.fw = FONTW[proj.font] || 0; this.GY = 1031; this.kx = vert ? 0.56 : 1;
      const lk = proj.look || LOOK0; this.caps = lk.caps !== false; this.outline = lk.figure === 'outline'; this.glow = Math.min(1, lk.glow ?? 1);
      this.people = lk.people || 'real'; this.paint = lk.scenery === 'painted'; this.dof = !!lk.dof; this.era = lk.era || ''; this.pscale = +lk.peopleScale || 1; this.horizon = lk.horizon != null && lk.horizon !== '' ? +lk.horizon : 140; const bn = parseInt(String(this.bg).replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0; this.dark = (0.299 * ((bn >> 16) & 255) + 0.587 * ((bn >> 8) & 255) + 0.114 * (bn & 255)) / 255 < 0.45;
      this.heroLook = proj.hero && typeof proj.hero === 'object' ? proj.hero : {}; this.assets = proj.assets && typeof proj.assets === 'object' ? proj.assets : {}; this.heroSeed = hash(String(proj.title || '').split('').reduce((q, ch) => q + ch.charCodeAt(0), 0) * 0.13 + 2);
    }
    in(a, d = 0.35) { return eo(ramp(this.t, a, d)); }
    pop(a, d = 0.45) { const p = ramp(this.t, a, d); return p <= 0 ? 0 : back(p); }
    X(x) { return 960 + (x - 960) * this.kx; }
    V(w, v) { return this.vert ? v : w; }
    font(wt, size, ls = 0) {
      const c = this.ctx; c.font = `${this.fw || wt} ${size}px ${this.ff}`;
      if ('letterSpacing' in c) c.letterSpacing = (ls * size).toFixed(2) + 'px';
    }
    text(s, x, y, o = {}) {
      const c = this.ctx; if ((o.a ?? 1) <= 0) return;
      c.save(); c.globalAlpha *= o.a ?? 1; this.font(o.wt || 600, o.size || 16, o.ls ?? 0.2);
      c.fillStyle = o.col || this.fg; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
      c.fillText(String(s).toUpperCase(), x, y); c.restore();
    }
    halo(x, y, r, a, col) {
      if (a <= 0 || r <= 0) return; const c = this.ctx, g = c.createRadialGradient(x, y, 0, x, y, r);
      col = col || this.ac; a *= 0.3 + 0.7 * this.glow; g.addColorStop(0, rgba(col, a)); g.addColorStop(0.45, rgba(col, a * 0.45)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    rr(x, y, w, h, r) {
      const c = this.ctx; r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    person(x, h, o = {}) { // a person with adult proportions (about 7.5 heads tall): skin, hair, clothes, a face that shows a mood, two-joint arms and legs
      if (this.people === 'simple' || o.simple) return this.pawn(x, h, o);
      h *= o.scale ?? 1.25; const a = o.a ?? 1; if (a <= 0) return; const c = this.ctx, t = this.t, col = o.col || this.fg, dir = o.dir || 1, ou = this.outline, dark = this.dark;
      const hero = col === this.ac && o.extra !== true, hl = hero ? this.heroLook || {} : {}, opt = k => (o[k] != null && o[k] !== '' ? o[k] : hl[k]);
      const sd = o.seed != null ? hash(+o.seed + 3) : hero ? this.heroSeed : hash(Math.round(x) * 0.37 + Math.round(h) * 1.3), pick = (arr, k) => arr[Math.floor(hash(sd * 97 + k) * arr.length) % arr.length];
      const SKIN = ['#f3cfae', '#e5b48f', '#cc946c', '#a9724f', '#7e513a', '#5b3a29'], sk = opt('skin');
      const skin = typeof sk === 'string' && sk[0] === '#' ? sk : SKIN[(+sk || 0) - 1] || pick(SKIN, 1);
      const HAIRC = dark ? ['#7a5238', '#9b6a43', '#d2ad74', '#55463d', '#b0583a', '#c4beb4'] : ['#2b1d16', '#4a3022', '#7a4e2d', '#c99a5b', '#211c1a', '#8f8f8f'];
      const hcRaw = opt('hairCol'), hairCol = typeof hcRaw === 'string' && hcRaw[0] === '#' ? hcRaw : pick(HAIRC, 2);
      const legacy = { tuft: 'spiky' }, hair = legacy[opt('hair')] || opt('hair') || pick(['short', 'side', 'long', 'short', 'bun', 'curly', 'side', 'bald'], 3);
      const outfit0 = opt('outfit') || pick(this.era === 'past' && this.people === 'doll' ? ['coat', 'dress', 'tunic', 'coat', 'robe', 'dress', 'tunic'] : hero ? ['shirt', 'tee', 'suit', 'shirt'] : ['shirt', 'tee', 'suit', 'shirt', 'dress', 'coat', 'tee'], 4), outfit = this.people === 'doll' ? outfit0 : ({ tunic: 'tee', toga: 'dress', robe: 'coat', armor: 'tee', uniform: 'coat' }[outfit0] || outfit0), beard = !!opt('beard');
      const trou = dark ? '#4a5878' : '#2f3a4f', shoe = dark ? '#2c2f38' : '#1d2028', white = '#f4f1ea', ink = skin === SKIN[5] || skin === SKIN[4] ? '#1b1210' : '#2b1f1a';
      const mood = o.mood || '', act = o.act || '', st = o.st ?? t, talk = !!o.talk || act === 'talk', moving = act === 'walk' || act === 'run', k = act === 'run' ? 1.6 : 1;
      if (this.people === 'doll') return this.doll(x, h, o, { skin, hairCol, hair, outfit, beard, sd, col, dir, mood, act, st, talk, moving, k });
      let lean = o.lean || 0, hop = 0, crouch = 0, headDy = 0, tilt = 0, shUp = 0, shake = 0;
      const br = Math.sin(t * 2.1 + sd * 6) * 0.0035;
      if (act === 'jump' || act === 'cheer') { const ph = mod(st * 1.6, 1); if (ph < 0.55) hop = Math.sin((ph / 0.55) * Math.PI) * h * 0.07; else crouch = Math.sin(((ph - 0.55) / 0.45) * Math.PI) * h * 0.035; }
      else if (moving) { hop = Math.abs(Math.cos(st * 7 * k)) * h * 0.012 * k; lean += 0.035 * dir * k; }
      if (act === 'nod') headDy = Math.max(0, Math.sin(st * 7)) * h * 0.012;
      if (act === 'no') shake = Math.sin(st * 11) * 0.3;
      if (act === 'slump' || mood === 'sleep') { lean += 0.045 * dir; headDy += h * 0.012; tilt = 0.2 * dir; }
      if (mood === 'sad') { headDy += h * 0.006; tilt += 0.06 * dir; }
      if (mood === 'think') tilt -= 0.07 * dir;
      if (!moving && act !== 'jump' && act !== 'cheer' && o.idle !== false) { lean += Math.sin(t * 0.9 + sd * 5) * 0.007; tilt += Math.sin(t * 0.7 + sd * 3) * 0.03 + (talk ? Math.sin(t * 3.1) * 0.04 : 0); } // weight shifts and small head moves while standing
      if (mood === 'shock' && st < 0.35) hop += Math.sin((st / 0.35) * Math.PI) * h * 0.025;
      if (act === 'shrug') { shUp = 0.02 + 0.004 * Math.sin(t * 3); tilt += 0.08 * dir; }
      if (mood === 'worried') lean += 0.004 * Math.sin(t * 31);
      // P(x, y): a body point given as fractions of the height (y measured up from the ground), with lean and crouch applied
      const P = (xf, yf) => [xf * h + lean * Math.max(0, yf - 0.45) * h * 1.6, -yf * h + (yf >= 0.47 ? crouch : crouch * Math.max(0, yf) / 0.47)];
      const ik = (S, T, l1, l2, pref) => { let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy) || 1e-3; const dd = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3), b = Math.atan2(dy, dx), q = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
        const E = [1, -1].map(sg => [S[0] + Math.cos(b + sg * q) * l1, S[1] + Math.sin(b + sg * q) * l1]); const W = [S[0] + (dx / d) * dd, S[1] + (dy / d) * dd]; return [pref(E[0]) >= pref(E[1]) ? E[0] : E[1], W]; };
      const lwO = Math.max(2, h * 0.009), line = dark ? '#141824' : '#1b1e24';
      const limb = (pts, w, fill) => { const go = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); };
        if (ou) { c.strokeStyle = line; c.lineWidth = w + lwO * 2; go(); } c.strokeStyle = fill; c.lineWidth = w; go(); };
      const shape = (fn, fill) => { c.beginPath(); fn(); c.fillStyle = fill; c.fill(); if (ou) { c.strokeStyle = line; c.lineWidth = lwO; c.stroke(); } };
      const dot = (p, r, fill) => shape(() => c.arc(p[0], p[1], r, 0, TAU), fill);
      if (o.shadow !== false && this.paint) { c.save(); c.globalAlpha *= a * 0.2 * clamp(1 - hop / (h * 0.15), 0.35, 1); c.fillStyle = '#3a2410'; c.beginPath(); c.moveTo(x - h * 0.07, o.y ?? this.GY); c.lineTo(x + h * 0.07, o.y ?? this.GY); c.lineTo(x + h * 0.42, (o.y ?? this.GY) + h * 0.07); c.lineTo(x + h * 0.26, (o.y ?? this.GY) + h * 0.09); c.closePath(); c.fill(); c.restore(); } // a cast shadow on the floor, away from the light
      if (o.shadow !== false) { c.save(); c.globalAlpha *= a * (dark ? 0.55 : this.paint ? 0.34 : 0.22) * clamp(1 - hop / (h * 0.15), 0.35, 1); c.fillStyle = '#000'; c.beginPath(); c.ellipse(x + lean * h * 0.2, o.y ?? this.GY, h * 0.15 * clamp(1 - hop / (h * 0.3), 0.6, 1), h * 0.02, 0, 0, TAU); c.fill(); c.restore(); }
      c.save(); c.globalAlpha *= a; c.translate(x, (o.y ?? this.GY) - hop); c.lineCap = 'round'; c.lineJoin = 'round';
      const shade = (fn, k) => { c.save(); c.beginPath(); fn(); c.clip(); c.fillStyle = 'rgba(0,0,0,' + (k || 0.14) + ')'; c.beginPath(); c.rect(h * 0.02 + lean * h * 0.6, -h * 1.2, h, h * 1.3); c.fill(); c.restore(); };
      if (o.ol) { c.save(); c.globalAlpha *= 0.85; c.fillStyle = this.bg; c.beginPath(); c.ellipse(lean * h * 0.4, -h * 0.5, h * 0.2, h * 0.52, 0, 0, TAU); c.fill(); c.restore(); }
      // head position (needed first for long hair, which hangs behind the body)
      const hc0 = P(0, 0.922), hx = hc0[0] + shake * h * 0.012, hy = hc0[1] + headDy, rx = h * 0.061, ry = h * 0.078, lk = Array.isArray(o.look) ? o.look : [dir * 0.45, 0];
      const lx = clamp((+lk[0] || 0) + shake, -1, 1), ly = clamp(mood === 'think' ? -0.7 : +lk[1] || 0, -1, 1), sh = 0.8 + br + shUp;
      if (hair === 'long') shape(() => { c.save(); c.translate(hx, hy); c.rotate(tilt * 0.5); c.moveTo(-rx * 1.12, -ry * 0.3); c.lineTo(-rx * 1.25, ry * 1.55); c.quadraticCurveTo(0, ry * 1.8, rx * 1.25, ry * 1.55); c.lineTo(rx * 1.12, -ry * 0.3); c.closePath(); c.restore(); }, hairCol, true);
      // legs and shoes
      const dress = outfit === 'dress', legW = h * (dress ? 0.05 : 0.07);
      [-1, 1].forEach(s => { let fx = s * 0.055, fy = 0; if (moving) { const ph = st * 7 * k + (s > 0 ? Math.PI : 0); fx += Math.sin(ph) * 0.1 * k * dir; fy = Math.max(0, Math.cos(ph)) * 0.045 * k; }
        const hip = P(s * 0.05, 0.49), ank = [fx * h, -(fy + 0.03) * h], r = ik(hip, ank, h * 0.233, h * 0.229, e => e[0] * dir);
        limb([hip, r[0], r[1]], legW, dress ? skin : trou);
        shape(() => c.ellipse(r[1][0] + dir * h * 0.022, r[1][1] + h * 0.016, h * 0.048, h * 0.022, 0, 0, TAU), shoe); });
      if (!dress) shape(() => { const q = [P(-0.094, 0.535), P(0.094, 0.535), P(0.088, 0.44), P(0, 0.415), P(-0.088, 0.44)]; c.moveTo(...q[0]); q.slice(1).forEach(p => c.lineTo(...p)); c.closePath(); }, trou);
      // neck and body
      limb([P(0, 0.87), P(0, sh - 0.01)], h * 0.047, skin);
      const hem = outfit === 'coat' ? 0.3 : dress ? 0.3 : 0.465, flare = outfit === 'coat' ? 0.115 : dress ? 0.16 : 0.094;
      const torso = () => { const q = (xf, yf) => P(xf, yf); c.moveTo(...q(-0.036, sh + 0.03)); c.quadraticCurveTo(...q(-0.1, sh + 0.028), ...q(-0.118, sh - 0.03)); c.lineTo(...q(-0.078, 0.6)); c.lineTo(...q(-flare, hem)); c.lineTo(...q(flare, hem)); c.lineTo(...q(0.078, 0.6)); c.lineTo(...q(0.118, sh - 0.03)); c.quadraticCurveTo(...q(0.1, sh + 0.028), ...q(0.036, sh + 0.03)); c.closePath(); };
      shape(torso, col); shade(torso, 0.13);
      const detail = (fn, colr, w) => { c.strokeStyle = colr; c.lineWidth = w || Math.max(1.5, h * 0.007); c.beginPath(); fn(); c.stroke(); };
      if (outfit === 'suit') { shape(() => { c.moveTo(...P(-0.036, sh + 0.03)); c.lineTo(...P(0, sh - 0.13)); c.lineTo(...P(0.036, sh + 0.03)); c.closePath(); }, white);
        shape(() => { c.moveTo(...P(-0.011, sh + 0.02)); c.lineTo(...P(0.011, sh + 0.02)); c.lineTo(...P(0.016, sh - 0.12)); c.lineTo(...P(0, sh - 0.15)); c.lineTo(...P(-0.016, sh - 0.12)); c.closePath(); }, dark ? '#c4473a' : '#9e2f2a');
        detail(() => { c.moveTo(...P(-0.036, sh + 0.03)); c.lineTo(...P(-0.05, sh - 0.06)); c.lineTo(...P(0, sh - 0.16)); c.moveTo(...P(0.036, sh + 0.03)); c.lineTo(...P(0.05, sh - 0.06)); c.lineTo(...P(0, sh - 0.16)); c.lineTo(...P(0, hem)); }, rgba(ink, 0.45)); }
      else if (outfit === 'coat') { detail(() => { c.moveTo(...P(0, sh - 0.04)); c.lineTo(...P(0, hem)); c.moveTo(...P(-0.036, sh + 0.03)); c.lineTo(...P(-0.02, sh - 0.05)); c.lineTo(...P(0, sh - 0.04)); c.lineTo(...P(0.02, sh - 0.05)); c.lineTo(...P(0.036, sh + 0.03)); }, rgba(ink, 0.4)); }
      else if (outfit === 'shirt') { shape(() => { c.moveTo(...P(-0.03, sh + 0.03)); c.lineTo(...P(0, sh - 0.035)); c.lineTo(...P(0.03, sh + 0.03)); c.closePath(); }, skin); detail(() => { c.moveTo(...P(-0.034, sh + 0.03)); c.lineTo(...P(-0.006, sh - 0.025)); c.lineTo(...P(-0.03, sh - 0.03)); c.moveTo(...P(0.034, sh + 0.03)); c.lineTo(...P(0.006, sh - 0.025)); c.lineTo(...P(0.03, sh - 0.03)); c.moveTo(...P(0, sh - 0.035)); c.lineTo(...P(0, hem + 0.01)); }, rgba(ink, 0.4)); }
      else shape(() => { c.moveTo(...P(-0.03, sh + 0.03)); c.quadraticCurveTo(...P(0, sh - 0.02), ...P(0.03, sh + 0.03)); c.closePath(); }, skin);
      if (dress) detail(() => { c.moveTo(...P(-0.078, 0.6)); c.lineTo(...P(0.078, 0.6)); }, rgba(ink, 0.4), Math.max(2, h * 0.012));
      // head, ears, hair, face, hat
      c.save(); c.translate(hx, hy); c.rotate(tilt * 0.5);
      [-1, 1].forEach(s => shape(() => c.ellipse(s * rx * 0.97, ry * 0.08, rx * 0.17, ry * 0.2, 0, 0, TAU), skin));
      const headPath = () => { c.moveTo(0, -ry); c.bezierCurveTo(rx * 1.02, -ry, rx * 1.05, ry * 0.25, rx * 0.72, ry * 0.72); c.quadraticCurveTo(rx * 0.35, ry * 1.04, 0, ry * 1.02); c.quadraticCurveTo(-rx * 0.35, ry * 1.04, -rx * 0.72, ry * 0.72); c.bezierCurveTo(-rx * 1.05, ry * 0.25, -rx * 1.02, -ry, 0, -ry); };
      shape(() => { c.moveTo(0, -ry); c.bezierCurveTo(rx * 1.02, -ry, rx * 1.05, ry * 0.25, rx * 0.72, ry * 0.72); c.quadraticCurveTo(rx * 0.35, ry * 1.04, 0, ry * 1.02); c.quadraticCurveTo(-rx * 0.35, ry * 1.04, -rx * 0.72, ry * 0.72); c.bezierCurveTo(-rx * 1.05, ry * 0.25, -rx * 1.02, -ry, 0, -ry); }, skin);
      if (ry >= 8) { c.save(); c.beginPath(); headPath(); c.clip(); c.fillStyle = 'rgba(0,0,0,0.1)'; c.beginPath(); c.ellipse(rx * 0.95, ry * 0.1, rx * 0.55, ry * 1.3, 0, 0, TAU); c.fill(); c.restore(); }
      if (beard) shape(() => { c.moveTo(-rx * 0.95, ry * 0.05); c.quadraticCurveTo(-rx * 0.9, ry * 1.15, 0, ry * 1.15); c.quadraticCurveTo(rx * 0.9, ry * 1.15, rx * 0.95, ry * 0.05); c.quadraticCurveTo(rx * 0.75, ry * 0.75, rx * 0.3, ry * 0.42); c.quadraticCurveTo(0, ry * 0.36, -rx * 0.3, ry * 0.42); c.quadraticCurveTo(-rx * 0.75, ry * 0.75, -rx * 0.95, ry * 0.05); }, hairCol, true);
      const part = hash(sd * 13) > 0.5 ? 1 : -1;
      const cap = (fr, side) => shape(() => { c.moveTo(-rx * 1.05, ry * 0.12); c.bezierCurveTo(-rx * 1.18, -ry * 1.05, rx * 1.18, -ry * 1.05, rx * 1.05, ry * 0.12); c.lineTo(rx * 0.95, -ry * 0.1);
        c.quadraticCurveTo(rx * (0.7 - side * 0.4), -ry * fr, rx * side * 0.1, -ry * (fr + side * 0.12)); c.quadraticCurveTo(-rx * (0.6 + side * 0.3), -ry * (fr - 0.05), -rx * 0.95, -ry * 0.1); c.closePath(); }, hairCol, true);
      if (hair === 'short' || hair === 'long' || hair === 'bun') cap(0.42, 0); else if (hair === 'side') cap(0.36, part);
      else if (hair === 'curly') { shape(() => { for (let q = 0; q < 9; q++) { const an = Math.PI + (q / 8) * Math.PI; c.moveTo(Math.cos(an) * rx * 0.95 + rx * 0.3, Math.sin(an) * ry * 0.85 - ry * 0.12); c.arc(Math.cos(an) * rx * 0.95, Math.sin(an) * ry * 0.85 - ry * 0.12, rx * 0.3, 0, TAU); } }, hairCol, true); }
      else if (hair === 'spiky') shape(() => { c.moveTo(-rx * 1.04, ry * 0.05); [-0.8, -0.4, 0, 0.4, 0.8].forEach(q => { c.lineTo(rx * (q - 0.2), -ry * 0.75); c.lineTo(rx * (q + dir * 0.1), -ry * 1.3); }); c.lineTo(rx * 1.0, -ry * 0.75); c.lineTo(rx * 1.04, ry * 0.05); c.lineTo(rx * 0.9, -ry * 0.3); c.quadraticCurveTo(0, -ry * 0.55, -rx * 0.9, -ry * 0.3); c.closePath(); }, hairCol, true);
      else if (hair === 'bald') [-1, 1].forEach(s => shape(() => c.ellipse(s * rx * 0.9, -ry * 0.05, rx * 0.16, ry * 0.32, 0, 0, TAU), hairCol, true));
      if (hair === 'bun') shape(() => c.arc(-dir * rx * 0.2, -ry * 1.05, rx * 0.42, 0, TAU), hairCol, true);
      if (o.face !== false && ry >= 7) {
        const fx = lx * rx * 0.22, eyY = -ry * 0.02 + ly * ry * 0.08, ex = rx * 0.38, er = Math.max(1.2, rx * 0.105), blink = mod(t + sd * 7, 3.6) < 0.12 && mood !== 'shock' && mood !== 'sleep', lw = Math.max(1.3, rx * 0.085);
        c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = lw;
        [-1, 1].forEach(s => { const cx = fx + s * ex, cy = eyY; c.beginPath();
          if (mood === 'sleep') { c.arc(cx, cy - er * 0.3, er * 1.3, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
          else if (blink) { c.moveTo(cx - er * 1.2, cy); c.lineTo(cx + er * 1.2, cy); c.stroke(); }
          else if (mood === 'happy' || act === 'cheer') { c.arc(cx, cy + er * 0.9, er * 1.4, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
          else if (mood === 'shock') { c.save(); c.fillStyle = white; c.beginPath(); c.arc(cx, cy, er * 1.9, 0, TAU); c.fill(); c.lineWidth = lw * 0.7; c.stroke(); c.restore(); c.beginPath(); c.arc(cx, cy, er * 0.95, 0, TAU); c.fill(); }
          else { c.arc(cx, cy, er, 0, TAU); c.fill(); if (mood === 'smug' || mood === 'angry') { c.save(); c.fillStyle = skin; c.fillRect(cx - er * 1.6, cy - er * 1.7, er * 3.2, er * (mood === 'smug' ? 1.65 : 1.2)); c.restore(); } }
          // eyebrows in the hair colour: they carry most of the mood
          const bY = cy - ry * (mood === 'shock' ? 0.36 : 0.25), raise = mood === 'think' && s === dir ? -ry * 0.08 : mood === 'smug' && s === dir ? -ry * 0.06 : 0, inner = mood === 'angry' ? ry * 0.09 : mood === 'sad' || mood === 'worried' ? -ry * 0.08 : 0;
          c.save(); c.strokeStyle = hairCol === white ? ink : hairCol; c.lineWidth = Math.max(1.6, rx * 0.11); c.beginPath(); c.moveTo(cx - s * rx * 0.2, bY + raise + inner); c.lineTo(cx + s * rx * 0.2, bY + raise - inner * 0.3); c.stroke(); c.restore(); });
        if (o.gl) { c.save(); c.strokeStyle = ink; c.lineWidth = Math.max(1.5, rx * 0.08); [-1, 1].forEach(s => { c.beginPath(); this.rr(fx + s * ex - rx * 0.27, eyY - ry * 0.16, rx * 0.54, ry * 0.32, ry * 0.1); c.stroke(); }); c.beginPath(); c.moveTo(fx - ex + rx * 0.27, eyY - ry * 0.04); c.quadraticCurveTo(fx, eyY - ry * 0.12, fx + ex - rx * 0.27, eyY - ry * 0.04); c.stroke(); c.restore(); }
        const nx = lx * rx * 0.36; c.save(); c.strokeStyle = rgba(ink, 0.5); c.lineWidth = lw * 0.9; c.beginPath(); c.moveTo(nx, eyY + ry * 0.08); c.quadraticCurveTo(nx + dir * rx * 0.13, eyY + ry * 0.3, nx - dir * rx * 0.02, eyY + ry * 0.34); c.stroke(); c.restore();
        const mx = lx * rx * 0.25, my = ry * 0.56 + ly * ry * 0.05; c.beginPath();
        if (talk) { const op = Math.abs(Math.sin(t * 13 + sd * 5)); c.ellipse(mx, my, rx * 0.17, ry * (0.04 + 0.12 * op), 0, 0, TAU); c.fill(); }
        else if (mood === 'shock') { c.ellipse(mx, my + ry * 0.04, rx * 0.12, ry * 0.15, 0, 0, TAU); c.fill(); }
        else if (mood === 'happy' || act === 'cheer') { c.moveTo(mx - rx * 0.26, my - ry * 0.06); c.quadraticCurveTo(mx, my + ry * 0.3, mx + rx * 0.26, my - ry * 0.06); c.closePath(); c.fill(); }
        else if (mood === 'sad') { c.arc(mx, my + ry * 0.22, rx * 0.22, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
        else if (mood === 'angry') { c.moveTo(mx - rx * 0.18, my + ry * 0.04); c.quadraticCurveTo(mx, my - ry * 0.03, mx + rx * 0.18, my + ry * 0.04); c.stroke(); }
        else if (mood === 'worried') { c.moveTo(mx - rx * 0.2, my + ry * 0.03); c.lineTo(mx - rx * 0.07, my - ry * 0.02); c.lineTo(mx + rx * 0.07, my + ry * 0.03); c.lineTo(mx + rx * 0.2, my - ry * 0.02); c.stroke(); }
        else if (mood === 'think') { c.moveTo(mx - rx * 0.06, my + ry * 0.02); c.lineTo(mx + dir * rx * 0.18, my - ry * 0.02); c.stroke(); }
        else if (mood === 'smug') { c.moveTo(mx - dir * rx * 0.16, my + ry * 0.02); c.quadraticCurveTo(mx, my + ry * 0.08, mx + dir * rx * 0.22, my - ry * 0.07); c.stroke(); }
        else if (mood === 'sleep') { c.arc(mx, my, rx * 0.06, 0, TAU); c.fill(); }
        else { c.arc(mx, my - ry * 0.12, rx * 0.2, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke(); }
        if (mood === 'worried' && ry >= 12) { const ph = mod(t * 0.9 + sd, 1); c.save(); c.globalAlpha *= 1 - ph; c.fillStyle = dark ? '#9fd3ff' : '#4aa3e8'; c.beginPath(); c.arc(-dir * rx * 1.05, -ry * 0.35 + ph * ry * 0.8, rx * 0.11, 0, TAU); c.fill(); c.restore(); }
        if (mood === 'shock' && st < 0.7) { c.save(); c.globalAlpha *= 1 - st / 0.7; c.strokeStyle = ou ? col : this.fg; c.lineWidth = Math.max(2, rx * 0.12); [-0.6, 0, 0.6].forEach(q => { c.beginPath(); c.moveTo(Math.sin(q) * ry * 1.35, -Math.cos(q) * ry * 1.35); c.lineTo(Math.sin(q) * ry * (1.75 + st), -Math.cos(q) * ry * (1.75 + st)); c.stroke(); }); c.restore(); }
        if (mood === 'happy' && ry >= 14) { c.save(); c.fillStyle = 'rgba(232,110,110,0.28)'; [-1, 1].forEach(s => { c.beginPath(); c.ellipse(fx + s * rx * 0.55, ry * 0.32, rx * 0.17, ry * 0.08, 0, 0, TAU); c.fill(); }); c.restore(); }
      }
      const hatC = o.hatCol || (col === this.ac ? this.fg : this.ac);
      if (o.hat === 'helmet') { shape(() => { c.moveTo(-rx * 1.12, -ry * 0.32); c.bezierCurveTo(-rx * 1.12, -ry * 1.38, rx * 1.12, -ry * 1.38, rx * 1.12, -ry * 0.32); c.closePath(); }, hatC); shape(() => this.rr(-rx * 1.42, -ry * 0.4, rx * 2.84, ry * 0.16, ry * 0.06), hatC); detail(() => { c.moveTo(0, -ry * 1.12); c.lineTo(0, -ry * 0.42); }, rgba(this.bg, 0.35), Math.max(2, rx * 0.12)); }
      else if (o.hat === 'cap') { shape(() => { c.moveTo(-rx * 1.06, -ry * 0.3); c.bezierCurveTo(-rx * 1.06, -ry * 1.3, rx * 1.06, -ry * 1.3, rx * 1.06, -ry * 0.3); c.closePath(); }, hatC); shape(() => c.ellipse(dir * rx * 1.05, -ry * 0.32, rx * 0.65, ry * 0.1, 0, 0, TAU), hatC); }
      else if (o.hat === 'crown') shape(() => { c.moveTo(-rx * 0.8, -ry * 0.7); c.lineTo(-rx * 0.9, -ry * 1.45); c.lineTo(-rx * 0.42, -ry * 1.05); c.lineTo(0, -ry * 1.6); c.lineTo(rx * 0.42, -ry * 1.05); c.lineTo(rx * 0.9, -ry * 1.45); c.lineTo(rx * 0.8, -ry * 0.7); c.closePath(); }, hatC);
      else if (o.hat === 'grad') { shape(() => { c.moveTo(-rx * 1.45, -ry * 0.92); c.lineTo(0, -ry * 1.3); c.lineTo(rx * 1.45, -ry * 0.92); c.lineTo(0, -ry * 0.55); c.closePath(); }, hatC); detail(() => { c.moveTo(rx * 1.15, -ry * 0.9); c.lineTo(rx * 1.15, -ry * 0.25 + Math.sin(t * 4) * ry * 0.05); }, hatC, Math.max(2, rx * 0.1)); }
      c.restore();
      // arms: shoulder, elbow, wrist; the hand target comes from the act
      if (o.arms !== false) {
        const pt = o.pt || (act === 'point' ? eo(clamp(st / 0.35)) : 0), sw = Math.sin(t * 2 + sd * 9) * 0.008, chin = (s) => [hx + s * rx * 0.1, hy + ry * 0.95];
        const target = s => { const front = s === dir, rest = P(s * (0.125 + sw), 0.47 + Math.abs(sw));
          if (pt > 0 && front) { const q = P(dir * 0.4, 0.82); return [lerp(rest[0], q[0], pt), lerp(rest[1], q[1], pt)]; }
          if (act === 'cheer' || act === 'jump') return P(s * 0.2, 1.06 + Math.sin(t * 11 + s) * 0.01);
          if (act === 'wave' && front) return P(s * (0.22 + 0.035 * Math.sin(t * 9)), 1.0);
          if (act === 'think') return front ? [hx + s * rx * 0.25, hy + ry * 1.1] : P(-s * 0.005, 0.6);
          if (act === 'hips') return P(s * 0.1, 0.55);
          if (act === 'cross') return P(-s * 0.055, 0.64 + (s === dir ? 0.01 : 0));
          if (act === 'shrug') return P(s * 0.24, 0.68 + shUp);
          if (act === 'facepalm' && front) return [hx + s * rx * 0.1, hy - ry * 0.05];
          if (act === 'hold') return P(dir * 0.14 + s * 0.035, 0.62);
          if (talk && front) return P(s * 0.22, 0.66 + 0.03 * Math.sin(t * 5.5 + sd * 9));
          if (moving) { const q = Math.sin(st * 7 * k + (s > 0 ? Math.PI : 0)); return P(s * 0.12 + q * 0.09 * dir * k, 0.5 + Math.abs(q) * 0.02); }
          if (act === 'slump') return P(s * 0.1 + dir * 0.06, 0.47);
          return rest; };
        const tee = outfit === 'tee' || dress, aw = h * 0.05;
        const arm = s => { const S = P(s * 0.1, sh - 0.02), T = target(s), r = ik(S, T, h * 0.165, h * 0.15, e => e[0] * s + e[1] * 0.6), E = r[0], W = r[1];
          if (tee) { const m = [lerp(S[0], E[0], 0.6), lerp(S[1], E[1], 0.6)]; limb([m, E, W], aw * 0.85, skin); limb([S, m], aw * 1.08, col); } else limb([S, E, W], aw, col);
          const ux = W[0] - E[0], uy = W[1] - E[1], ul = Math.hypot(ux, uy) || 1; dot([W[0] + (ux / ul) * h * 0.016, W[1] + (uy / ul) * h * 0.016], h * 0.024, skin);
          if (!tee) { c.save(); c.strokeStyle = rgba(this.bg, 0.25); c.lineWidth = Math.max(1.5, h * 0.006); c.beginPath(); c.moveTo(W[0] - (uy / ul) * aw * 0.5, W[1] + (ux / ul) * aw * 0.5); c.lineTo(W[0] + (uy / ul) * aw * 0.5, W[1] - (ux / ul) * aw * 0.5); c.stroke(); c.restore(); } };
        arm(-dir); arm(dir);
      }
      this._fig = { skin, col, sh, lean, h, dir, tee: outfit === 'tee' || dress };
      c.restore();
    }
    doll(x, h, o, d) { // the cut-paper look: a flat paper puppet about 3.5 heads tall (big round head, dot eyes, costume shapes with trim), limbs pinned at the shoulder and hip
      const c = this.ctx, t = this.t, a = o.a ?? 1, { skin, hairCol, hair, outfit, beard, sd, col, dir, mood, act, st, talk, moving, k } = d, D = dir;
      const haze = this.paint ? clamp(+o.depth || 0, 0, 0.85) : 0, HZ = this.hazeCol || (this.hazeCol = mixc(this.bg, '#ffffff', 0.3)), F = q => (haze > 0.01 ? mixc(q, HZ, haze * 0.75) : q);
      const per = /^(tunic|toga|robe|armor|uniform)$/.test(outfit), white = F('#f6f0e2'), ink = F('#2a1d17'), sk = F(skin), hc = F(hairCol), cl = F(col), trim = F(mixc(col, '#1a120c', 0.38)), gold = F('#dcae45'), bronze = F('#c49a52');
      const trou = F(outfit === 'suit' ? mixc(col, '#14100c', 0.45) : this.dark ? '#4a5470' : '#3b3f52'), shoe = F('#2a2224'), cream = F('#efe6d2');
      let lean = o.lean || 0, hop = 0, headDy = 0, tilt = 0, shake = 0;
      if (act === 'jump' || act === 'cheer') { const ph = mod(st * 1.7, 1); hop = ph < 0.55 ? Math.sin((ph / 0.55) * Math.PI) * h * 0.09 : 0; }
      else if (moving) { hop = Math.abs(Math.sin(st * 6.5 * k)) * h * 0.025 * k; lean += 0.05 * D * k; }
      if (act === 'nod') headDy = Math.max(0, Math.sin(st * 7)) * h * 0.016;
      if (act === 'no') shake = Math.sin(st * 11) * 0.35;
      if (act === 'slump' || mood === 'sleep') { lean += 0.05 * D; headDy += h * 0.02; tilt = 0.25 * D; }
      if (mood === 'sad') { headDy += h * 0.01; tilt += 0.08 * D; }
      if (mood === 'think') tilt -= 0.1 * D;
      if (act === 'shrug') tilt += 0.1 * D;
      if (!moving && act !== 'jump' && act !== 'cheer' && o.idle !== false) { tilt += Math.sin(t * 0.8 + sd * 3) * 0.045 + (talk ? Math.sin(t * 3.4) * 0.07 : 0); hop += Math.abs(Math.sin(t * 1.3 + sd * 4)) * h * 0.004; }
      if (mood === 'shock' && st < 0.35) hop += Math.sin((st / 0.35) * Math.PI) * h * 0.04;
      if (mood === 'worried') lean += 0.005 * Math.sin(t * 31);
      const P = (xf, yf) => [xf * h + lean * Math.max(0, yf - 0.3) * h * 1.3, -yf * h];
      const fill = (fn, f) => { c.beginPath(); fn(); c.fillStyle = f; c.fill(); };
      const poly = (pts, f) => fill(() => { c.moveTo(pts[0][0], pts[0][1]); for (let q = 1; q < pts.length; q++) c.lineTo(pts[q][0], pts[q][1]); c.closePath(); }, f);
      const seg = (pts, w, f) => { c.strokeStyle = f; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let q = 1; q < pts.length; q++) c.lineTo(pts[q][0], pts[q][1]); c.stroke(); };
      const gy = o.y ?? this.GY;
      if (o.shadow !== false) { c.save(); c.globalAlpha *= a * (this.paint ? 0.3 : 0.2) * (1 - haze * 0.6) * clamp(1 - hop / (h * 0.2), 0.4, 1); c.fillStyle = '#2a1808'; c.beginPath(); c.ellipse(x, gy, h * 0.17, h * 0.026, 0, 0, TAU); c.fill();
        if (this.paint) { c.globalAlpha *= 0.6; c.beginPath(); c.moveTo(x - h * 0.08, gy); c.lineTo(x + h * 0.08, gy); c.lineTo(x + h * 0.4, gy + h * 0.06); c.lineTo(x + h * 0.24, gy + h * 0.08); c.closePath(); c.fill(); } c.restore(); }
      c.save(); c.globalAlpha *= a; c.translate(x, gy - hop);
      // head position first: hands can reach for the chin or the face
      const hc0 = P(0, 0.835), hx = hc0[0] + shake * h * 0.015, hy = hc0[1] + headDy, rx = h * 0.13, ry = h * 0.14;
      const lk = Array.isArray(o.look) ? o.look : [D * 0.4, 0], lx = clamp((+lk[0] || 0) + shake, -1, 1), ly = clamp(mood === 'think' ? -0.7 : +lk[1] || 0, -1, 1);
      // arms: two segments from a pin at the shoulder; the hand target comes from the act
      const ik = (S, T, l1, l2, pref) => { const dx = T[0] - S[0], dy = T[1] - S[1], dd0 = Math.hypot(dx, dy) || 1e-3, dd = clamp(dd0, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3), b = Math.atan2(dy, dx), q = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
        const E = [1, -1].map(sg => [S[0] + Math.cos(b + sg * q) * l1, S[1] + Math.sin(b + sg * q) * l1]); return [pref(E[0]) >= pref(E[1]) ? E[0] : E[1], [S[0] + (dx / dd0) * dd, S[1] + (dy / dd0) * dd]]; };
      const pt = o.pt || (act === 'point' ? eo(clamp(st / 0.3)) : 0), sw = Math.sin(t * 2 + sd * 9) * 0.008;
      const target = s => { const front = s === D, rest = P(s * (0.135 + sw), 0.36 + Math.abs(sw));
        if (pt > 0 && front) { const q = P(D * 0.4, 0.7); return [lerp(rest[0], q[0], pt), lerp(rest[1], q[1], pt)]; }
        if (act === 'cheer' || act === 'jump') return P(s * 0.23, 0.95 + Math.sin(t * 11 + s) * 0.012);
        if (act === 'wave' && front) return P(s * (0.24 + 0.04 * Math.sin(t * 9)), 0.9);
        if (act === 'think') return front ? [hx + D * rx * 0.35, hy + ry * 0.9] : P(-s * 0.01, 0.46);
        if (act === 'hips') return P(s * 0.105, 0.42);
        if (act === 'cross') return P(-s * 0.05, 0.52 + (front ? 0.012 : 0));
        if (act === 'shrug') return P(s * 0.26, 0.6);
        if (act === 'facepalm' && front) return [hx + D * rx * 0.25, hy - ry * 0.05];
        if (act === 'hold') return P(D * 0.16 + s * 0.035, 0.5);
        if (talk && front) return P(s * 0.23, 0.53 + 0.035 * Math.sin(t * 5.5 + sd * 9));
        if (moving) { const q = Math.sin(st * 6.5 * k + (s > 0 ? Math.PI : 0)); return P(s * 0.1 + q * 0.12 * D * k, 0.38 + Math.abs(q) * 0.03); }
        if (act === 'slump') return P(s * 0.1 + D * 0.05, 0.34);
        return rest; };
      const bare = outfit === 'tee' || outfit === 'tunic' || outfit === 'armor' || (outfit === 'toga' && false), sleeve = outfit === 'toga' ? cream : outfit === 'armor' ? cl : cl, aw = h * 0.054;
      const arm = s => { if (o.arms === false) return; const S = P(s * 0.092, 0.615), T = target(s), r = ik(S, T, h * 0.14, h * 0.13, e => e[0] * s + e[1] * 0.5), E = r[0], W = r[1];
        if (bare) { const m = [lerp(S[0], E[0], 0.55), lerp(S[1], E[1], 0.55)]; seg([m, E, W], aw * 0.86, sk); seg([S, m], aw * 1.12, sleeve); }
        else { seg([S, E, W], aw, sleeve); if (per || outfit === 'suit' || outfit === 'coat') { const ux = W[0] - E[0], uy = W[1] - E[1], ul = Math.hypot(ux, uy) || 1; seg([[W[0] - (ux / ul) * aw * 0.55, W[1] - (uy / ul) * aw * 0.55], [W[0] - (ux / ul) * aw * 0.15, W[1] - (uy / ul) * aw * 0.15]], aw * 1.05, outfit === 'suit' ? white : outfit === 'robe' || outfit === 'uniform' ? gold : trim); } }
        fill(() => c.arc(W[0], W[1], h * 0.03, 0, TAU), sk); };
      arm(-D);
      // legs: straight paper strips pinned at the hip, swinging like a puppet
      const longSkirt = outfit === 'dress' || outfit === 'robe' || outfit === 'toga', legC = outfit === 'uniform' ? white : outfit === 'tunic' || outfit === 'armor' || longSkirt ? sk : trou;
      [-1, 1].forEach(s => { const hip = P(s * 0.048, 0.34), ang = moving ? Math.sin(st * 6.5 * k + (s > 0 ? Math.PI : 0)) * 0.5 * k : act === 'jump' || act === 'cheer' ? s * 0.12 : s * 0.035, L = h * 0.29, foot = [hip[0] + Math.sin(ang) * L, hip[1] + Math.cos(ang) * L];
        seg([hip, foot], h * 0.072, legC);
        if (outfit === 'uniform') seg([[lerp(hip[0], foot[0], 0.55), lerp(hip[1], foot[1], 0.55)], foot], h * 0.08, shoe);
        if (outfit === 'armor') seg([[lerp(hip[0], foot[0], 0.64), lerp(hip[1], foot[1], 0.64)], [lerp(hip[0], foot[0], 0.9), lerp(hip[1], foot[1], 0.9)]], h * 0.074, bronze);
        if (outfit === 'tunic') seg([[lerp(hip[0], foot[0], 0.8), lerp(hip[1], foot[1], 0.8)], [lerp(hip[0], foot[0], 0.84), lerp(hip[1], foot[1], 0.84)]], h * 0.075, F('#7a5232'));
        fill(() => c.ellipse(foot[0] + D * h * 0.025, foot[1] - h * 0.002, h * 0.052, h * 0.026, 0, Math.PI, TAU), outfit === 'tunic' || outfit === 'armor' || outfit === 'toga' ? F('#7a5232') : shoe);
      });
      // body and costume
      const body = (hw0, hw1, top, bot, f) => fill(() => { const A = P(-hw0 + 0.035, top), B = P(-hw0, top - 0.04), C2 = P(-hw1, bot), D2 = P(hw1, bot), E2 = P(hw0, top - 0.04), F2 = P(hw0 - 0.035, top); c.moveTo(A[0], A[1]); c.quadraticCurveTo(P(-hw0, top)[0], P(-hw0, top)[1], B[0], B[1]); c.lineTo(C2[0], C2[1]); c.lineTo(D2[0], D2[1]); c.lineTo(E2[0], E2[1]); c.quadraticCurveTo(P(hw0, top)[0], P(hw0, top)[1], F2[0], F2[1]); c.closePath(); }, f);
      const band = (y0, y1, hw0, hw1, f) => poly([P(-hw0, y0), P(hw0, y0), P(hw1, y1), P(-hw1, y1)], f);
      const dots = (pts, r, f) => pts.forEach(p => fill(() => c.arc(p[0], p[1], r, 0, TAU), f));
      const top = 0.655, cx0 = D * 0.012;
      seg([P(0, 0.62), P(0, 0.71)], h * 0.06, sk); // neck
      if (!longSkirt && outfit !== 'uniform' && outfit !== 'tunic' && outfit !== 'armor' && outfit !== 'coat') band(0.37, 0.3, 0.1, 0.1, trou); // hips
      if (outfit === 'dress') { body(0.095, 0.088, top, 0.42, cl); band(0.44, 0.07, 0.088, 0.175, cl); band(0.12, 0.07, 0.165, 0.175, trim); band(0.445, 0.415, 0.09, 0.09, white); }
      else if (outfit === 'robe') { body(0.1, 0.15, top, 0.04, cl); band(0.1, 0.04, 0.143, 0.15, gold); poly([P(cx0 - 0.016, top), P(cx0 + 0.016, top), P(cx0 + 0.02, 0.04), P(cx0 - 0.02, 0.04)], gold); band(0.45, 0.415, 0.098, 0.1, trim); }
      else if (outfit === 'toga') { body(0.1, 0.15, top, 0.05, cream); poly([P(-D * 0.1, 0.64), P(-D * 0.02, 0.665), P(D * 0.125, 0.4), P(D * 0.115, 0.3), P(D * 0.06, 0.33)], cl); c.save(); c.strokeStyle = 'rgba(80,60,40,0.14)'; c.lineWidth = Math.max(1, h * 0.006); [0.25, 0.55, 0.8].forEach(f2 => { const A = P(-0.1 + f2 * 0.06, 0.5), B = P(-0.13 + f2 * 0.1, 0.08); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke(); }); c.restore(); }
      else if (outfit === 'tunic') { body(0.1, 0.125, top, 0.22, cl); for (let q = 0; q < 6; q++) { const f2 = -0.105 + q * 0.042; poly([P(f2, 0.26), P(f2 + 0.022, 0.26), P(f2 + 0.022, 0.24), P(f2, 0.24)], gold); } band(0.45, 0.41, 0.094, 0.096, F('#6b4a2b')); poly([P(cx0 - 0.018, 0.45), P(cx0 + 0.018, 0.45), P(cx0 + 0.018, 0.41), P(cx0 - 0.018, 0.41)], gold); }
      else if (outfit === 'armor') { for (let q = 0; q < 5; q++) { const f2 = -0.105 + q * 0.044; poly([P(f2, 0.37), P(f2 + 0.036, 0.37), P(f2 + 0.034, 0.2), P(f2 + 0.002, 0.2)], q % 2 ? trim : cl); } body(0.102, 0.098, top, 0.35, bronze); c.save(); c.strokeStyle = F('#8a6a32'); c.lineWidth = Math.max(1.5, h * 0.008); c.beginPath(); const m1 = P(cx0, 0.62), m2 = P(cx0, 0.38), p1 = P(cx0 - 0.07, 0.52), p2 = P(cx0 + 0.07, 0.52); c.moveTo(m1[0], m1[1]); c.lineTo(m2[0], m2[1]); c.moveTo(p1[0], p1[1]); c.quadraticCurveTo(P(cx0 - 0.03, 0.47)[0], P(cx0 - 0.03, 0.47)[1], m1[0], P(0, 0.5)[1]); c.quadraticCurveTo(P(cx0 + 0.03, 0.47)[0], P(cx0 + 0.03, 0.47)[1], p2[0], p2[1]); c.stroke(); c.restore(); poly([P(-D * 0.1, 0.66), P(-D * 0.04, 0.66), P(-D * 0.16, 0.12), P(-D * 0.2, 0.16)], F(mixc(col, '#000', 0.2))); }
      else if (outfit === 'uniform') { band(0.37, 0.3, 0.1, 0.1, white); body(0.1, 0.12, top, 0.2, cl); poly([P(-0.012, 0.4), P(0.012, 0.4), P(0.03, 0.2), P(-0.03, 0.2)], white); c.save(); c.strokeStyle = white; c.lineWidth = h * 0.02; c.beginPath(); const s1 = P(-0.085, 0.64), s2 = P(0.085, 0.4), s3 = P(0.085, 0.64), s4 = P(-0.085, 0.4); c.moveTo(s1[0], s1[1]); c.lineTo(s2[0], s2[1]); c.moveTo(s3[0], s3[1]); c.lineTo(s4[0], s4[1]); c.stroke(); c.restore(); dots([P(cx0 + D * 0.05, 0.6), P(cx0 + D * 0.05, 0.53), P(cx0 + D * 0.05, 0.46)], h * 0.009, gold); band(top + 0.005, top - 0.025, 0.07, 0.06, trim); }
      else if (outfit === 'coat') { body(0.1, 0.13, top, 0.16, cl); band(0.44, 0.41, 0.096, 0.1, trim); dots([P(cx0, 0.56), P(cx0, 0.5), P(cx0, 0.36)], h * 0.009, gold); poly([P(cx0 - 0.04, top), P(cx0 + 0.04, top), P(cx0, top - 0.06)], trim); }
      else if (outfit === 'suit') { body(0.1, 0.098, top, 0.31, cl); poly([P(cx0 - 0.04, top), P(cx0 + 0.04, top), P(cx0, top - 0.13)], white); poly([P(cx0 - 0.01, top - 0.005), P(cx0 + 0.01, top - 0.005), P(cx0 + 0.014, top - 0.1), P(cx0, top - 0.125), P(cx0 - 0.014, top - 0.1)], F('#a8322b')); c.save(); c.strokeStyle = trim; c.lineWidth = Math.max(1.5, h * 0.007); c.beginPath(); const l1 = P(cx0 - 0.045, top), l2 = P(cx0, top - 0.15), l3 = P(cx0 + 0.045, top), l4 = P(cx0, 0.31); c.moveTo(l1[0], l1[1]); c.lineTo(l2[0], l2[1]); c.lineTo(l3[0], l3[1]); c.moveTo(l2[0], l2[1]); c.lineTo(l4[0], l4[1]); c.stroke(); c.restore(); }
      else { body(0.1, 0.098, top, 0.33, cl); if (outfit === 'tee') poly([P(cx0 - 0.035, top), P(cx0 + 0.035, top), P(cx0, top - 0.035)], sk); else { poly([P(cx0 - 0.04, top + 0.004), P(cx0 - 0.004, top - 0.035), P(cx0 - 0.036, top - 0.03)], white); poly([P(cx0 + 0.04, top + 0.004), P(cx0 + 0.004, top - 0.035), P(cx0 + 0.036, top - 0.03)], white); dots([P(cx0, 0.57), P(cx0, 0.5), P(cx0, 0.43)], h * 0.007, trim); } }
      // head: one ear, flat round face, hair, face, hat
      c.save(); c.translate(hx, hy); c.rotate(tilt * 0.6);
      const hatC = F(o.hatCol || (col === this.ac ? this.fg : this.ac));
      if (hair === 'long') fill(() => { c.moveTo(-rx * 1.04, -ry * 0.2); c.lineTo(-rx * 1.12 - (D < 0 ? 0 : rx * 0.1), ry * 1.3); c.quadraticCurveTo(0, ry * 1.5, rx * 1.12 + (D > 0 ? 0 : rx * 0.1), ry * 1.3); c.lineTo(rx * 1.04, -ry * 0.2); c.closePath(); }, hc);
      fill(() => c.ellipse(0, 0, rx, ry, 0, 0, TAU), sk);
      c.save(); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.clip(); c.fillStyle = 'rgba(60,30,10,0.07)'; c.beginPath(); c.ellipse(-D * rx * 0.95, ry * 0.15, rx * 0.5, ry * 1.2, 0, 0, TAU); c.fill(); c.restore();
      const capHair = (fr, sweep) => fill(() => { c.moveTo(-D * rx * 1.03, ry * 0.32); c.bezierCurveTo(-D * rx * 1.22, -ry * 1.3, D * rx * 1.2, -ry * 1.28, D * rx * 1.01, -ry * 0.12); c.quadraticCurveTo(D * rx * (0.6 - sweep * 0.3), -ry * (fr + sweep * 0.1), D * rx * 0.05, -ry * (fr - 0.02)); c.quadraticCurveTo(-D * rx * 0.42, -ry * (fr - 0.12), -D * rx * 0.55, ry * 0.05); c.quadraticCurveTo(-D * rx * 0.78, ry * 0.4, -D * rx * 1.03, ry * 0.32); c.closePath(); }, hc);
      const hatTop = /^(helmet|plume|tophat|tricorn|wrap|cap)$/.test(o.hat || '');
      if (hair === 'short' || hair === 'long' || hair === 'bun') capHair(0.5, 0); else if (hair === 'side') capHair(0.42, 1);
      else if (hair === 'curly') fill(() => { for (let q = 0; q < 10; q++) { const an = Math.PI * 0.92 + (q / 9) * Math.PI * 1.16, px2 = Math.cos(an) * rx * 0.98, py2 = Math.sin(an) * ry * 0.9 - ry * 0.1; c.moveTo(px2 + rx * 0.3, py2); c.arc(px2, py2, rx * 0.3, 0, TAU); } }, hc);
      else if (hair === 'spiky') fill(() => { c.moveTo(-rx * 1.0, ry * 0.05); [-0.75, -0.35, 0.05, 0.45, 0.85].forEach(q => { c.lineTo(rx * (q - 0.2), -ry * 0.8); c.lineTo(rx * (q + D * 0.12), -ry * 1.32); }); c.lineTo(rx * 1.0, -ry * 0.7); c.lineTo(rx * 1.0, ry * 0.05); c.quadraticCurveTo(0, -ry * 0.6, -rx * 1.0, ry * 0.05); c.closePath(); }, hc);
      else if (hair === 'bald') fill(() => c.ellipse(-D * rx * 0.8, ry * 0.02, rx * 0.25, ry * 0.32, 0, 0, TAU), hc);
      if (hair === 'bun' && !hatTop) fill(() => c.arc(-D * rx * 0.35, -ry * 1.02, rx * 0.36, 0, TAU), hc);
      fill(() => c.ellipse(-D * rx * 0.86, ry * 0.12, rx * 0.15, ry * 0.19, 0, 0, TAU), sk); // the ear on the far side of the face
      if (beard) fill(() => { c.moveTo(-rx * 0.96, ry * 0.0); c.quadraticCurveTo(-rx * 0.9, ry * 1.2, D * rx * 0.1, ry * 1.18); c.quadraticCurveTo(rx * 0.95, ry * 1.1, rx * 0.96, ry * 0.0); c.quadraticCurveTo(rx * 0.7, ry * 0.62, D * rx * 0.2, ry * 0.42); c.quadraticCurveTo(-rx * 0.2, ry * 0.36, -rx * 0.55, ry * 0.5); c.quadraticCurveTo(-rx * 0.8, ry * 0.4, -rx * 0.96, 0); c.closePath(); }, hc);
      if (o.face !== false && ry >= 6) {
        const fx = D * rx * 0.22 + lx * rx * 0.14, eyY = ry * 0.02 + ly * ry * 0.08, ex = rx * 0.3, er = Math.max(1.4, rx * 0.1), plainFace = !mood && !talk && act !== 'cheer', lw = Math.max(1.3, rx * 0.075), blink = mod(t + sd * 7, 3.8) < 0.12 && mood !== 'shock' && mood !== 'sleep';
        c.fillStyle = ink; c.strokeStyle = ink; c.lineWidth = lw; c.lineCap = 'round';
        if (ry >= 12 && (mood === 'happy' || act === 'cheer')) { c.save(); c.fillStyle = 'rgba(225,95,85,0.3)'; [-1, 1].forEach(s => { c.beginPath(); c.ellipse(fx + s * rx * 0.5, ry * 0.38, rx * 0.15, ry * 0.08, 0, 0, TAU); c.fill(); }); c.restore(); }
        [-1, 1].forEach(s => { const ecx = fx + s * ex, ecy = eyY; c.beginPath();
          if (mood === 'sleep') { c.arc(ecx, ecy - er * 0.4, er * 1.3, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
          else if (blink) { c.moveTo(ecx - er * 1.1, ecy); c.lineTo(ecx + er * 1.1, ecy); c.stroke(); }
          else if (mood === 'happy' || act === 'cheer') { c.arc(ecx, ecy + er * 0.8, er * 1.3, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
          else if (mood === 'shock') { c.save(); c.fillStyle = white; c.beginPath(); c.arc(ecx, ecy, er * 2, 0, TAU); c.fill(); c.restore(); c.beginPath(); c.arc(ecx + lx * er * 0.5, ecy, er * 0.9, 0, TAU); c.fill(); }
          else { c.arc(ecx + lx * er * 0.3, ecy, er, 0, TAU); c.fill(); if (mood === 'smug' || mood === 'angry') { c.save(); c.fillStyle = sk; c.fillRect(ecx - er * 1.6, ecy - er * 1.8, er * 3.2, er * (mood === 'smug' ? 1.75 : 1.25)); c.restore(); } }
          if (plainFace || mood === 'happy' || mood === 'sleep') return;
          const bY = ecy - ry * (mood === 'shock' ? 0.34 : 0.24), raise = mood === 'think' && s === D ? -ry * 0.08 : mood === 'smug' && s === D ? -ry * 0.06 : 0, inner = mood === 'angry' ? ry * 0.1 : mood === 'sad' || mood === 'worried' ? -ry * 0.08 : 0;
          c.save(); c.strokeStyle = hc; c.lineWidth = Math.max(1.6, rx * 0.1); c.beginPath(); c.moveTo(ecx - s * rx * 0.15, bY + raise + inner); c.lineTo(ecx + s * rx * 0.15, bY + raise - inner * 0.3); c.stroke(); c.restore(); });
        if (o.gl) { c.save(); c.strokeStyle = ink; c.lineWidth = Math.max(1.4, rx * 0.065); [-1, 1].forEach(s => { c.beginPath(); c.arc(fx + s * ex, eyY, rx * 0.21, 0, TAU); c.stroke(); }); c.beginPath(); c.moveTo(fx - ex + rx * 0.21, eyY); c.lineTo(fx + ex - rx * 0.21, eyY); c.stroke(); c.restore(); }
        const mx = fx + D * rx * 0.05, my = ry * 0.46; c.fillStyle = ink; c.beginPath();
        if (talk) { const op = Math.abs(Math.sin(t * 13 + sd * 5)); c.ellipse(mx, my, rx * 0.13, ry * (0.03 + 0.09 * op), 0, 0, TAU); c.fill(); }
        else if (mood === 'shock') { c.ellipse(mx, my + ry * 0.03, rx * 0.09, ry * 0.12, 0, 0, TAU); c.fill(); }
        else if (mood === 'happy' || act === 'cheer') { c.moveTo(mx - rx * 0.2, my - ry * 0.05); c.quadraticCurveTo(mx, my + ry * 0.24, mx + rx * 0.2, my - ry * 0.05); c.closePath(); c.fill(); }
        else if (mood === 'sad') { c.arc(mx, my + ry * 0.18, rx * 0.17, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
        else if (mood === 'angry') { c.moveTo(mx - rx * 0.14, my + ry * 0.03); c.lineTo(mx + rx * 0.14, my + ry * 0.03); c.stroke(); }
        else if (mood === 'worried') { c.moveTo(mx - rx * 0.16, my + ry * 0.03); c.lineTo(mx - rx * 0.05, my - ry * 0.02); c.lineTo(mx + rx * 0.05, my + ry * 0.03); c.lineTo(mx + rx * 0.16, my - ry * 0.02); c.stroke(); }
        else if (mood === 'think') { c.moveTo(mx - rx * 0.05, my + ry * 0.02); c.lineTo(mx + D * rx * 0.14, my - ry * 0.02); c.stroke(); }
        else if (mood === 'smug') { c.moveTo(mx - D * rx * 0.12, my + ry * 0.02); c.quadraticCurveTo(mx, my + ry * 0.07, mx + D * rx * 0.18, my - ry * 0.06); c.stroke(); }
        else if (mood === 'sleep') { c.arc(mx, my, rx * 0.05, 0, TAU); c.fill(); }
        if (mood === 'worried' && ry >= 12) { const ph = mod(t * 0.9 + sd, 1); c.save(); c.globalAlpha *= 1 - ph; c.fillStyle = '#4aa3e8'; c.beginPath(); c.arc(-D * rx * 1.05, -ry * 0.35 + ph * ry * 0.8, rx * 0.1, 0, TAU); c.fill(); c.restore(); }
        if (mood === 'shock' && st < 0.7) { c.save(); c.globalAlpha *= 1 - st / 0.7; c.strokeStyle = this.fg; c.lineWidth = Math.max(2, rx * 0.11); [-0.6, 0, 0.6].forEach(q => { c.beginPath(); c.moveTo(Math.sin(q) * ry * 1.4, -Math.cos(q) * ry * 1.4); c.lineTo(Math.sin(q) * ry * (1.8 + st), -Math.cos(q) * ry * (1.8 + st)); c.stroke(); }); c.restore(); }
      }
      const hat = o.hat || '';
      if (hat === 'helmet') { fill(() => { c.moveTo(-rx * 1.1, -ry * 0.3); c.bezierCurveTo(-rx * 1.1, -ry * 1.4, rx * 1.1, -ry * 1.4, rx * 1.1, -ry * 0.3); c.closePath(); }, hatC); fill(() => this.rr(-rx * 1.36, -ry * 0.4, rx * 2.72, ry * 0.17, ry * 0.07), hatC); }
      else if (hat === 'cap') { fill(() => { c.moveTo(-rx * 1.04, -ry * 0.28); c.bezierCurveTo(-rx * 1.04, -ry * 1.32, rx * 1.04, -ry * 1.32, rx * 1.04, -ry * 0.28); c.closePath(); }, hatC); fill(() => c.ellipse(D * rx * 1.05, -ry * 0.3, rx * 0.62, ry * 0.1, 0, 0, TAU), hatC); }
      else if (hat === 'crown') fill(() => { c.moveTo(-rx * 0.78, -ry * 0.72); c.lineTo(-rx * 0.88, -ry * 1.45); c.lineTo(-rx * 0.42, -ry * 1.08); c.lineTo(0, -ry * 1.6); c.lineTo(rx * 0.42, -ry * 1.08); c.lineTo(rx * 0.88, -ry * 1.45); c.lineTo(rx * 0.78, -ry * 0.72); c.closePath(); }, gold);
      else if (hat === 'grad') { fill(() => { c.moveTo(-rx * 1.45, -ry * 0.92); c.lineTo(0, -ry * 1.3); c.lineTo(rx * 1.45, -ry * 0.92); c.lineTo(0, -ry * 0.55); c.closePath(); }, hatC); }
      else if (hat === 'tophat') { fill(() => c.ellipse(0, -ry * 0.72, rx * 1.32, ry * 0.13, 0, 0, TAU), F('#1f1a1c')); fill(() => c.rect(-rx * 0.78, -ry * 2.05, rx * 1.56, ry * 1.36), F('#1f1a1c')); fill(() => c.rect(-rx * 0.78, -ry * 0.98, rx * 1.56, ry * 0.2), F(o.hatCol || '#a8322b')); }
      else if (hat === 'tricorn') { fill(() => { c.moveTo(-rx * 1.45, -ry * 0.52); c.quadraticCurveTo(0, -ry * 0.88, rx * 1.45, -ry * 0.52); c.lineTo(rx * 0.95, -ry * 1.3); c.quadraticCurveTo(0, -ry * 1.08, -rx * 0.95, -ry * 1.3); c.closePath(); }, F('#1f1a1c')); c.save(); c.strokeStyle = gold; c.lineWidth = Math.max(1.5, rx * 0.07); c.beginPath(); c.moveTo(-rx * 1.4, -ry * 0.55); c.quadraticCurveTo(0, -ry * 0.9, rx * 1.4, -ry * 0.55); c.stroke(); c.restore(); }
      else if (hat === 'plume') { fill(() => { c.moveTo(-D * rx * 1.06, ry * 0.6); c.lineTo(-D * rx * 1.12, -ry * 0.1); c.bezierCurveTo(-D * rx * 1.15, -ry * 1.38, D * rx * 1.18, -ry * 1.3, D * rx * 1.1, -ry * 0.22); c.lineTo(D * rx * 0.1, -ry * 0.34); c.lineTo(-D * rx * 0.4, -ry * 0.2); c.lineTo(-D * rx * 0.5, ry * 0.6); c.closePath(); }, bronze);
        c.save(); c.strokeStyle = F(o.hatCol || '#b8352b'); c.lineWidth = rx * 0.34; c.lineCap = 'round'; c.beginPath(); c.moveTo(D * rx * 0.75, -ry * 1.05); c.quadraticCurveTo(0, -ry * 1.75, -D * rx * 1.15, -ry * 0.75); c.stroke(); c.restore(); }
      else if (hat === 'laurel') { for (let q = 0; q < 9; q++) { const f2 = q / 8, lx2 = lerp(-rx * 1.0, rx * 0.85, f2), ly2 = -ry * (0.45 + Math.sin(f2 * Math.PI) * 0.42); c.save(); c.translate(lx2, ly2); c.rotate(-0.6 + f2 * 1.2); fill(() => c.ellipse(0, 0, rx * 0.17, rx * 0.08, 0, 0, TAU), F('#5d8a3c')); c.restore(); } }
      else if (hat === 'wrap') { fill(() => c.ellipse(0, -ry * 0.62, rx * 1.15, ry * 0.72, 0, Math.PI, TAU), hatC); fill(() => c.ellipse(0, -ry * 0.6, rx * 1.15, ry * 0.18, 0, 0, Math.PI), hatC); c.save(); c.strokeStyle = 'rgba(60,40,20,0.22)'; c.lineWidth = Math.max(1, rx * 0.06); [-0.5, 0, 0.5].forEach(q => { c.beginPath(); c.moveTo(rx * (q - 0.5), -ry * 0.6); c.quadraticCurveTo(rx * q, -ry * 1.2, rx * (q + 0.55), -ry * 0.85); c.stroke(); }); c.restore(); }
      c.restore();
      arm(D);
      this._fig = { skin, col, sh: 0.64, lean, h, dir, tee: bare, shY: 0.615, doll: true };
      c.restore();
    }
    pawn(x, h, o = {}) { // the simple look: pawn body, a face that blinks and shows a mood, arms that gesture, feet that walk
      const a = o.a ?? 1; if (a <= 0) return; const c = this.ctx, t = this.t, col = o.col || this.fg, dir = o.dir || 1, ou = this.outline, sd = hash(Math.round(x) * 0.37 + Math.round(h));
      const mood = o.mood || '', act = o.act || '', st = o.st ?? t, talk = !!o.talk || act === 'talk', moving = act === 'walk' || act === 'run', k = act === 'run' ? 1.7 : 1;
      let lean = o.lean || 0, sq = 1 + 0.012 * Math.sin(t * 2.1 + sd * 6), hop = 0; // breathing, then whatever the act asks for
      if (act === 'jump' || act === 'cheer') { const ph = mod(st * 1.9, 1); hop = ph < 0.62 ? Math.sin((ph / 0.62) * Math.PI) * h * 0.2 : 0; sq *= ph > 0.62 ? 1 - 0.1 * Math.sin(((ph - 0.62) / 0.38) * Math.PI) : 1 + 0.05 * Math.sin((ph / 0.62) * Math.PI); }
      else if (moving) { hop = Math.abs(Math.sin(st * 8 * k)) * h * 0.035 * k; lean += 0.035 * dir * k; }
      else if (talk) hop = Math.abs(Math.sin(t * 9)) * h * 0.012; else if (act === 'nod') lean += 0.022 * Math.sin(st * 7); else if (act === 'slump' || mood === 'sleep') lean += 0.09 * dir;
      if (mood === 'shock' && st < 0.4) hop += Math.sin((st / 0.4) * Math.PI) * h * 0.07; if (mood === 'worried') lean += 0.006 * Math.sin(t * 31);
      const r = h * 0.2, hy = -h + r, bw = h * 0.62, tw = bw * 0.42, bt = -h * 0.56, rad = tw * 0.9, L = lean * h, hx = L * 1.4 + (act === 'no' ? Math.sin(st * 10) * r * 0.2 : 0), lwO = Math.max(3, h * 0.035), fc = ou ? col : this.bg;
      c.save(); c.globalAlpha *= a; c.translate(x, (o.y ?? this.GY) - hop); c.scale(2 - sq, sq); c.fillStyle = ou ? this.bg : col; c.strokeStyle = col; c.lineJoin = 'round'; c.lineCap = 'round';
      if (moving || o.feet) [-1, 1].forEach(s => { const ph = st * 8 * k + (s > 0 ? Math.PI : 0), lift = moving ? Math.max(0, Math.sin(ph)) * h * 0.06 : 0; c.save(); c.fillStyle = col; c.beginPath(); c.ellipse(s * bw * 0.24 + dir * h * 0.03 + (moving ? Math.cos(ph) * h * 0.05 * dir : 0), -h * 0.02 - lift + hop, h * 0.085, h * 0.04, 0, 0, TAU); c.fill(); c.restore(); });
      const body = () => { c.beginPath(); c.moveTo(-bw / 2, 0); c.lineTo(-tw + L, bt + rad); c.quadraticCurveTo(-tw + L, bt, -tw + rad + L, bt); c.lineTo(tw - rad + L, bt); c.quadraticCurveTo(tw + L, bt, tw + L, bt + rad); c.lineTo(bw / 2, 0); c.closePath(); };
      // arms: a pose for each side, picked from the act
      const pt = o.pt || (act === 'point' ? eo(clamp(st / 0.35)) : 0), wantArms = o.arms ?? !!(act && act !== 'dig' && act !== 'slump' && act !== 'nod' && act !== 'no'), sw = Math.sin(t * 2 + sd * 9) * 0.012;
      const pose = s => { const front = s === dir;
        if (pt > 0 && front) return { hx: lerp(s * 0.13, dir * 0.36, pt), hy: lerp(0.27, -0.085, pt), ex: lerp(s * 0.12, dir * 0.18, pt), ey: lerp(0.13, 0.0, pt) };
        if (act === 'cheer' || act === 'jump') return { hx: s * 0.22, hy: -0.42 + Math.sin(t * 11 + s) * 0.03, ex: s * 0.24, ey: -0.14 };
        if (act === 'wave' && front) return { hx: s * (0.25 + 0.08 * Math.sin(t * 10)), hy: -0.4, ex: s * 0.25, ey: -0.1 };
        if (act === 'think') return front ? { ax: hx + s * r * 0.55, ay: hy + r * 1.0, ex: s * 0.27, ey: 0.14 } : { hx: s * 0.05, hy: 0.2, ex: s * 0.27, ey: 0.1 };
        if (act === 'hips') return { hx: s * 0.05, hy: 0.2, ex: s * 0.27, ey: 0.1 };
        if (act === 'shrug') return { hx: s * 0.31, hy: -0.07 + Math.sin(t * 3) * 0.012, ex: s * 0.2, ey: 0.1 };
        if (act === 'facepalm' && front) return { ax: hx + s * r * 0.15, ay: hy + r * 0.05, ex: s * 0.32, ey: -0.02 };
        if (act === 'hold') return { hx: dir * 0.3, hy: 0.03, ex: dir * 0.16 + s * 0.05, ey: 0.13 };
        if (talk && front) return { hx: s * 0.27, hy: 0.0 + 0.08 * Math.sin(t * 5.5 + sd * 9), ex: s * 0.2, ey: 0.12 };
        if (moving) { const q = Math.sin(st * 8 * k + (s > 0 ? Math.PI : 0)); return { hx: s * 0.13 + q * 0.12 * dir, hy: 0.24 - Math.abs(q) * 0.03, ex: s * 0.13 + q * 0.05 * dir, ey: 0.13 }; }
        return { hx: s * 0.14 + sw * s, hy: 0.27, ex: s * 0.13, ey: 0.13 };
      };
      const arm = (s, outline) => { const p = pose(s), sx = s * tw * 0.72 + L, sy = bt + h * 0.13, ax = p.ax != null ? p.ax : sx + p.hx * h, ay = p.ay != null ? p.ay : sy + p.hy * h, ex = sx + p.ex * h, ey = sy + p.ey * h;
        const draw = (w, cc) => { c.strokeStyle = cc; c.lineWidth = w; c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(ex, ey, ax, ay); c.stroke(); c.fillStyle = cc; c.beginPath(); c.arc(ax, ay, w * 0.62, 0, TAU); c.fill(); };
        if (outline) draw(h * 0.105 + h * 0.045, this.bg); draw(h * 0.105, col); c.fillStyle = ou ? this.bg : col; c.strokeStyle = col; };
      const arms = wantArms || pt > 0; if (wantArms) arm(-dir, false);
      if (o.ol) { body(); c.save(); c.strokeStyle = this.bg; c.lineWidth = h * 0.05; c.stroke(); c.beginPath(); c.arc(hx, hy, r + h * 0.025, 0, TAU); c.fillStyle = this.bg; c.fill(); c.restore(); }
      body(); c.fill(); if (ou) { c.lineWidth = lwO; c.stroke(); }
      if (o.hair === 'long') { c.save(); c.fillStyle = col; c.beginPath(); c.ellipse(hx - dir * r * 0.15, hy + r * 0.25, r * 1.12, r * 1.25, 0, 0, TAU); c.fill(); c.restore(); }
      c.beginPath(); c.arc(hx, hy, r, 0, TAU); c.fill(); if (ou) { c.lineWidth = lwO; c.stroke(); }
      if (o.hair === 'tuft') { c.save(); c.fillStyle = col; c.beginPath(); [-0.5, 0, 0.5].forEach(q => { c.moveTo(hx + q * r - r * 0.22, hy - r * 0.86); c.lineTo(hx + q * r + dir * r * 0.12, hy - r * 1.42); c.lineTo(hx + q * r + r * 0.22, hy - r * 0.86); }); c.fill(); c.restore(); }
      else if (o.hair === 'bun') { c.save(); c.fillStyle = col; c.beginPath(); c.arc(hx - dir * r * 0.25, hy - r * 1.08, r * 0.42, 0, TAU); c.fill(); if (ou) { c.fillStyle = this.bg; c.fill(); c.lineWidth = lwO; c.stroke(); } c.restore(); }
      // face
      if (o.face !== false && r >= 9) {
        const lk = Array.isArray(o.look) ? o.look : [dir * 0.45, 0], lx = clamp(+lk[0] || 0, -1, 1), ly = clamp(+lk[1] || 0, -1, 1), blink = mod(t + sd * 7, 3.4) < 0.13 && mood !== 'shock', gl = !!o.gl;
        const fx0 = hx + lx * r * 0.22, ey0 = hy - r * 0.06 + ly * r * 0.14 + (o.hat === 'helmet' || o.hat === 'cap' ? r * 0.14 : 0), ex0 = r * 0.37, er = r * (mood === 'shock' ? (gl ? 0.16 : 0.21) : 0.13), lwF = Math.max(1.6, r * 0.1);
        c.save(); c.fillStyle = fc; c.strokeStyle = fc; c.lineWidth = lwF; c.lineCap = 'round';
        if (gl) { c.lineWidth = Math.max(2, r * 0.12); c.beginPath(); c.arc(fx0 - ex0, ey0, r * 0.34, 0, TAU); c.stroke(); c.beginPath(); c.arc(fx0 + ex0, ey0, r * 0.34, 0, TAU); c.stroke(); c.lineWidth = lwF; }
        [-1, 1].forEach(s => { const cx = fx0 + s * ex0 + (gl ? lx * r * 0.08 : 0), cy = ey0; c.beginPath();
          if (mood === 'sleep') { c.arc(cx, cy - er * 0.4, er * 1.2, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
          else if (blink) { c.moveTo(cx - er, cy); c.lineTo(cx + er, cy); c.stroke(); }
          else if ((mood === 'happy' || act === 'cheer') && !gl) { c.arc(cx, cy + er * 0.7, er * 1.25, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
          else if (mood === 'smug') { c.arc(cx, cy - er * 0.2, er * 1.15, 0, Math.PI); c.fill(); }
          else { c.arc(cx, cy, gl ? er * 0.85 : er, 0, TAU); c.fill(); }
          if (r >= 15 && (mood === 'angry' || mood === 'sad' || mood === 'worried' || mood === 'shock' || (mood === 'think' && s === dir))) { const up = mood === 'shock' || mood === 'think' ? r * 0.16 : 0, tilt = mood === 'angry' ? 1 : mood === 'sad' || mood === 'worried' ? -1 : 0, by0 = cy - r * (gl ? 0.54 : 0.38) - (o.hat === 'helmet' || o.hat === 'cap' ? up * 0.3 : up); c.beginPath(); c.moveTo(cx - r * 0.2, by0 + s * tilt * r * 0.1); c.lineTo(cx + r * 0.2, by0 - s * tilt * r * 0.1); c.stroke(); }
        });
        const mx = hx + lx * r * 0.14, my = hy + r * 0.48 + ly * r * 0.08; c.lineWidth = lwF; c.beginPath();
        if (talk) { c.ellipse(mx, my, r * 0.17, r * (0.05 + 0.17 * Math.abs(Math.sin(t * 13 + sd * 5))), 0, 0, TAU); c.fill(); }
        else if (mood === 'shock') { c.ellipse(mx, my + r * 0.04, r * 0.13, r * 0.19, 0, 0, TAU); c.fill(); }
        else if (mood === 'happy' || act === 'cheer') { c.arc(mx, my - r * 0.2, r * 0.36, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke(); }
        else if (mood === 'sad') { c.arc(mx, my + r * 0.3, r * 0.28, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
        else if (mood === 'angry') { c.moveTo(mx - r * 0.2, my + r * 0.04); c.lineTo(mx + r * 0.2, my + r * 0.04); c.stroke(); }
        else if (mood === 'worried') { c.moveTo(mx - r * 0.24, my + r * 0.05); c.lineTo(mx - r * 0.08, my - r * 0.04); c.lineTo(mx + r * 0.08, my + r * 0.05); c.lineTo(mx + r * 0.24, my - r * 0.04); c.stroke(); }
        else if (mood === 'think') { c.moveTo(mx - r * 0.05, my + r * 0.02); c.lineTo(mx + dir * r * 0.24, my - r * 0.04); c.stroke(); }
        else if (mood === 'smug') { c.moveTo(mx - dir * r * 0.18, my + r * 0.04); c.quadraticCurveTo(mx, my + r * 0.12, mx + dir * r * 0.24, my - r * 0.08); c.stroke(); }
        else if (mood !== 'sleep') { c.arc(mx, my - r * 0.1, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
        else { c.arc(mx, my, r * 0.07, 0, TAU); c.fill(); }
        c.restore();
        if (mood === 'worried' && r >= 15) { const ph = mod(t * 0.9 + sd, 1); c.save(); c.globalAlpha *= 1 - ph; c.fillStyle = ou ? col : this.fg === col ? this.ac : this.fg; c.beginPath(); c.arc(hx - dir * r * 1.15, hy - r * 0.3 + ph * r * 0.9, r * 0.11, 0, TAU); c.fill(); c.restore(); }
        if (mood === 'shock' && st < 0.7) { c.save(); c.globalAlpha *= 1 - st / 0.7; c.strokeStyle = ou ? col : this.fg; c.lineWidth = Math.max(2, r * 0.1); [-0.6, 0, 0.6].forEach(q => { c.beginPath(); c.moveTo(hx + Math.sin(q) * r * 1.35, hy - Math.cos(q) * r * 1.35); c.lineTo(hx + Math.sin(q) * r * (1.7 + st), hy - Math.cos(q) * r * (1.7 + st)); c.stroke(); }); c.restore(); }
      }
      // hats
      const hc = o.hatCol || (col === this.ac ? this.fg : this.ac);
      if (o.hat === 'helmet') { c.save(); c.fillStyle = hc; c.beginPath(); c.arc(hx, hy - r * 0.46, r * 1.06, Math.PI, 0); c.closePath(); c.fill(); c.fillRect(hx - r * 1.3, hy - r * 0.58, r * 2.6, r * 0.2); c.restore(); }
      else if (o.hat === 'cap') { c.save(); c.fillStyle = hc; c.beginPath(); c.arc(hx, hy - r * 0.46, r * 0.99, Math.PI, 0); c.closePath(); c.fill(); c.fillRect(hx + (dir > 0 ? 0 : -r * 1.5), hy - r * 0.6, r * 1.5, r * 0.2); c.restore(); }
      else if (o.hat === 'crown') { c.save(); c.fillStyle = hc; c.beginPath(); c.moveTo(hx - r * 0.8, hy - r * 0.62); c.lineTo(hx - r * 0.86, hy - r * 1.5); c.lineTo(hx - r * 0.4, hy - r * 1.05); c.lineTo(hx, hy - r * 1.62); c.lineTo(hx + r * 0.4, hy - r * 1.05); c.lineTo(hx + r * 0.86, hy - r * 1.5); c.lineTo(hx + r * 0.8, hy - r * 0.62); c.closePath(); c.fill(); c.restore(); }
      else if (o.hat === 'grad') { c.save(); c.fillStyle = hc; c.beginPath(); c.moveTo(hx - r * 1.35, hy - r * 0.95); c.lineTo(hx, hy - r * 1.4); c.lineTo(hx + r * 1.35, hy - r * 0.95); c.lineTo(hx, hy - r * 0.55); c.closePath(); c.fill(); c.strokeStyle = hc; c.lineWidth = Math.max(2, r * 0.09); c.beginPath(); c.moveTo(hx + r * 1.1, hy - r * 0.92); c.lineTo(hx + r * 1.1, hy - r * 0.3 + Math.sin(t * 4) * r * 0.06); c.stroke(); c.restore(); }
      if (arms) arm(dir, true);
      c.restore();
    }
    crowd(x, n, h, o = {}) { // overlapping group, back to front
      const sp = o.sp || h * 0.42;
      for (let i = 0; i < n; i++) {
        const px = x + (i - (n - 1) / 2) * sp;
        this.halo(px, this.GY - h * 0.5, h * 0.75, 0.07 * (o.a ?? 1), this.fg);
        this.person(px, h, { col: this.fg, a: o.a, pt: i === n - 1 ? o.pt : 0, dir: o.dir, ol: i > 0 });
      }
    }
    chest(x, w, o = {}) {
      const a = o.a ?? 1; if (a <= 0) return; const c = this.ctx, y = (o.y ?? this.GY) - 3, h = w * 0.5, lh = w * 0.3, open = o.open || 0, col = o.col || this.fg;
      c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = o.lw || Math.max(2.5, w * 0.03); c.lineJoin = 'round';
      this.rr(x - w / 2, y - h, w, h, w * 0.05); c.stroke();
      c.beginPath(); c.moveTo(x - w * 0.27, y - h); c.lineTo(x - w * 0.27, y); c.moveTo(x + w * 0.27, y - h); c.lineTo(x + w * 0.27, y); c.stroke();
      c.save(); c.translate(x - w / 2, y - h); c.rotate(-open * 1.95);
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(0, -lh * 1.15, w, -lh * 1.15, w, 0); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(w * 0.23, -lh * 0.72); c.lineTo(w * 0.23, 0); c.moveTo(w * 0.77, -lh * 0.72); c.lineTo(w * 0.77, 0); c.stroke(); c.restore();
      this.rr(x - w * 0.07, y - h - w * 0.02, w * 0.14, w * 0.15, w * 0.02); c.fill(); c.restore();
    }
    obj(name, x, w, o = {}) { // chest, or any icon standing on the ground
      if (name === 'chest' || !name) return this.chest(x, w, o);
      const s = w * (1 + 0.14 * Math.sin((o.open || 0) * Math.PI)); this.icon(name, x, (o.y ?? this.GY) - s * 0.52, s, o.col || this.fg, null, o.a);
    }
    pedestal(x, w, h, a = 1) {
      const c = this.ctx; c.save(); c.globalAlpha *= a; c.strokeStyle = this.fg; c.lineWidth = 4;
      this.rr(x - w / 2 + 14, this.GY - h, w - 28, h - 3, 3); c.stroke(); this.rr(x - w / 2, this.GY - h - 16, w, 16, 4); c.stroke(); c.restore();
    }
    sparkle(x, y, s, a = 1, col) {
      if (a <= 0) return; const c = this.ctx; c.save(); c.globalAlpha *= a; c.fillStyle = col || this.fg; c.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.18 : s, an = (i * TAU) / 8 - Math.PI / 2; c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); }
      c.closePath(); c.fill(); c.restore();
    }
    coin(x, y, r, sym, spin = 0, a = 1) {
      if (a <= 0 || r <= 0) return; const c = this.ctx, sx = Math.max(0.12, Math.abs(Math.cos(spin)));
      c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(sx, 1); c.fillStyle = this.ac; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.strokeStyle = rgba(this.bg, 0.55); c.lineWidth = r * 0.07; c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.stroke(); c.fillStyle = rgba(this.bg, 0.8);
      if (sym === 'skull') {
        c.beginPath(); c.arc(0, -r * 0.1, r * 0.36, 0, TAU); c.fill(); c.fillRect(-r * 0.2, r * 0.12, r * 0.4, r * 0.26);
        c.fillStyle = this.ac; c.beginPath(); c.arc(-r * 0.14, -r * 0.1, r * 0.09, 0, TAU); c.arc(r * 0.14, -r * 0.1, r * 0.09, 0, TAU); c.fill();
        c.strokeStyle = rgba(this.bg, 0.8); c.lineWidth = r * 0.09; c.lineCap = 'round'; c.beginPath();
        c.moveTo(-r * 0.42, r * 0.42); c.lineTo(r * 0.42, r * 0.62); c.moveTo(r * 0.42, r * 0.42); c.lineTo(-r * 0.42, r * 0.62); c.stroke();
      } else if (sym) { this.font(800, r * 1.05, 0); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(sym).slice(0, 2), 0, r * 0.06); }
      c.restore();
    }
    burst(x, y, p, sym) { // token rising out of something, with rays and sparkles
      if (p <= 0) return; const c = this.ctx, t = this.t;
      this.halo(x, y + 120, 560 * p, 0.34 * p); this.halo(x, y, 210 * p, 0.6 * p);
      c.save(); c.strokeStyle = this.fg; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha *= p;
      for (let i = 0; i < 18; i++) { const an = (i * TAU) / 18 + t * 0.25, r1 = 62, r2 = 62 + (i % 2 ? 34 : 58) * p; c.beginPath(); c.moveTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); c.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2); c.stroke(); }
      c.restore(); this.coin(x, y, 46 * Math.min(1, p * 1.2), sym, 0, 1);
      [[-190, -60, 22], [150, -105, 16], [205, 15, 20], [-120, -150, 14], [40, -175, 18], [-60, 120, 14], [120, 105, 12]].forEach((s, i) => {
        this.sparkle(x + s[0] * p, y + s[1] * p, s[2] * (0.7 + 0.3 * Math.sin(t * 6 + i)), clamp(p * 1.4 - i * 0.08));
      });
    }
    tag(s, x, y, o = {}) {
      const sc = o.s ?? 1, a = o.a ?? 1; if (sc <= 0 || a <= 0 || !s) return 0; const c = this.ctx, size = o.size || 17;
      this.font(700, size, 0.16); const tw = c.measureText(String(s).toUpperCase()).width, w = tw + size * 2.1, h = size * 2.3;
      c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(sc, sc);
      this.rr(-w / 2, -h / 2, w, h, h / 2);
      if (o.fill) { c.fillStyle = this.ac; c.fill(); } else if (o.solid) { c.fillStyle = this.fg; c.fill(); } else { if (o.back) { c.fillStyle = this.bg; c.fill(); } c.strokeStyle = o.col || this.fg; c.lineWidth = 3.5; c.stroke(); }
      c.fillStyle = o.fill || o.solid ? this.bg : o.col || this.fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(s).toUpperCase(), size * 0.08, 1);
      if (o.strike > 0) { c.strokeStyle = this.ac; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); const L = w / 2 + 26; c.moveTo(-L, 9); c.lineTo(-L + 2 * L * o.strike, 9 - 16 * o.strike); c.stroke(); }
      c.restore(); return w;
    }
    tagW(s, size = 17) { this.font(700, size, 0.16); return this.ctx.measureText(String(s || '').toUpperCase()).width + size * 2.1; }
    counter(val, x, y, size, moving, a = 1) {
      const c = this.ctx, s = fmt(val); if (a <= 0) return; c.save(); this.font(800, size, 0.03); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = this.ac;
      if (moving) { c.globalAlpha *= 0.4 * a; c.fillText(s, x, y - size * 0.13); c.fillText(s, x, y + size * 0.13); c.globalAlpha = a; c.fillText(s, x, y); }
      else { c.globalAlpha *= a; c.fillText(s, x, y); } c.restore(); this.halo(x, y, size * 1.6, 0.16 * a);
    }
    xmark(x, y, s, sc = 1, col) {
      if (sc <= 0) return; const c = this.ctx; c.save(); c.strokeStyle = col || this.ac; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); s *= sc;
      c.moveTo(x - s, y - s); c.lineTo(x + s, y + s); c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke(); c.restore();
    }
    sparks(x, y, p) { // short radiating lines, e.g. above an opened chest
      const c = this.ctx; c.save(); c.strokeStyle = this.fg; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha *= clamp(p);
      [-1.25, -0.9, -0.55, -0.2].forEach((an, i) => { const r1 = 16 + 6 * p, r2 = 34 + (i % 2 ? 18 : 6) * p; c.beginPath(); c.moveTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); c.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2); c.stroke(); });
      c.restore();
    }
    /* ---- motion kit: things that move by themselves, used by the richer scenes ---- */
    shake(a) { this.shk = Math.max(this.shk || 0, a); } // camera kick, applied by the compositor
    trace(pts, p, o = {}) { // a line that draws itself, p from 0 to 1
      if (p <= 0 || pts.length < 2) return; const c = this.ctx, seg = []; let tot = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
      let left = tot * clamp(p); c.save(); c.strokeStyle = o.col || this.fg; c.lineWidth = o.lw || 4; c.lineJoin = 'round'; c.lineCap = 'round'; c.globalAlpha *= o.a ?? 1; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length && left > 0; i++) { const d = seg[i - 1] || 1, k = Math.min(1, left / d); c.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); left -= d; }
      c.stroke(); c.restore();
    }
    spray(x, y, n, p, o = {}) { // short streaks flying out from a point over one life, p from 0 to 1
      if (p <= 0 || p >= 1) return; const c = this.ctx, a0 = o.angle ?? 0, spread = o.spread ?? TAU, r = o.r || 90; c.save(); c.strokeStyle = o.col || this.fg; c.lineCap = 'round'; c.lineWidth = o.lw || 3;
      for (let i = 0; i < n; i++) {
        const an = a0 + (hash(i * 7.3 + (o.seed || 0)) - 0.5) * spread, sp = 0.45 + hash(i * 3.1 + 5 + (o.seed || 0)) * 0.85, d = (o.r0 || 0) + r * sp * eo(p), len = (o.len || 14) * (1 - p) * sp, gy = (o.grav || 0) * p * p;
        c.globalAlpha = (1 - p) * (o.a ?? 1); c.beginPath(); c.moveTo(x + Math.cos(an) * d, y + Math.sin(an) * d + gy); c.lineTo(x + Math.cos(an) * (d + len), y + Math.sin(an) * (d + len) + gy); c.stroke();
      }
      c.restore();
    }
    stamp(s, x, y, p, o = {}) { // a rubber stamp slammed down at an angle
      if (p <= 0 || !s) return; const c = this.ctx, k = 1 + 1.7 * (1 - eo(clamp(p))), size = o.size || 26; this.font(800, size, 0.14); const w = c.measureText(String(s).toUpperCase()).width + size * 1.7, h = size * 2.1;
      c.save(); c.translate(x, y); c.rotate(o.rot ?? -0.1); c.scale(k, k); c.globalAlpha *= clamp(p * 2.5); c.strokeStyle = o.col || this.ac; c.fillStyle = o.col || this.ac; c.lineWidth = 4.5;
      this.rr(-w / 2, -h / 2, w, h, 8); c.stroke(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(s).toUpperCase(), size * 0.07, 2); c.restore();
    }
    worker(x, h, o = {}) { // the hero at work: helmet, headlamp beam and a pick. o.swing runs 0 to 1 through one swing, hitting at 0.7
      const a = o.a ?? 1; if (a <= 0) return; const c = this.ctx, by = o.y ?? this.GY, dir = o.dir || 1, col = o.col || this.ac, r = h * 0.2, hy = by - h + r, q = o.swing ?? 0.3;
      if (o.beam > 0) { const gr = c.createLinearGradient(x, 0, x + dir * h * 1.7, 0); gr.addColorStop(0, rgba(this.fg, 0.55 * o.beam * a)); gr.addColorStop(1, rgba(this.fg, 0)); c.save(); c.fillStyle = gr; c.beginPath(); c.moveTo(x + dir * r * 1.05, hy - r * 0.25); c.lineTo(x + dir * h * 1.7, hy - h * 0.42); c.lineTo(x + dir * h * 1.7, hy + h * 0.36); c.closePath(); c.fill(); c.restore(); }
      const lean = q > 0.5 && q < 0.85 ? 0.03 : 0; this.person(x, h, { scale: 1, col, a, y: by, lean, dir, mood: o.mood ?? 'angry', look: [dir * 0.6, 0.15], hat: 'helmet', hatCol: this.fg, arms: false, st: o.st });
      const th = q < 0.5 ? lerp(0.15, -1.9, eio(q / 0.5)) : q < 0.7 ? lerp(-1.9, 0.2, ei((q - 0.5) / 0.2)) : 0.2 - 0.3 * Math.sin(((q - 0.7) / 0.3) * Math.PI) * (1 - (q - 0.7) / 0.3) - 0.05 * ((q - 0.7) / 0.3);
      const real = this.people !== 'simple', sx = x + dir * h * (real ? 0.1 : 0.1), sy = by - h * (real ? (this._fig && this._fig.doll ? 0.615 : 0.78) : 0.48), La = h * (real ? 0.28 : 0.36), hx = sx + dir * Math.cos(th) * La, hy2 = sy + Math.sin(th) * La, ph = th - 0.95, Lh = h * 0.42, bx = hx + dir * Math.cos(ph) * Lh, byy = hy2 + Math.sin(ph) * Lh, Lp = h * 0.2;
      const ux = dir * Math.cos(ph), uy = Math.sin(ph), nx = -dir * Math.sin(ph), ny = Math.cos(ph);
      c.save(); c.globalAlpha *= a; c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = this.fg; c.lineWidth = Math.max(3, h * 0.028); c.beginPath(); c.moveTo(hx - ux * h * 0.06, hy2 - uy * h * 0.06); c.lineTo(bx, byy); c.stroke();
      c.lineWidth = Math.max(4, h * 0.042); c.beginPath(); c.moveTo(bx + nx * Lp - ux * Lp * 0.25, byy + ny * Lp - uy * Lp * 0.25); c.quadraticCurveTo(bx + ux * Lp * 0.3, byy + uy * Lp * 0.3, bx - nx * Lp - ux * Lp * 0.25, byy - ny * Lp - uy * Lp * 0.25); c.stroke();
      if (!real) { c.strokeStyle = col; c.lineWidth = h * 0.11; c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy2); c.stroke(); }
      else { const F = this._fig || { skin: '#e5b48f' }, ou = this.outline; [[-dir, 0.07], [dir, 0]].forEach(([s, along]) => { const S = [x + s * h * 0.1, by - h * (F.doll ? 0.615 : 0.78)], T = [hx - ux * h * along, hy2 - uy * h * along], d = Math.hypot(T[0] - S[0], T[1] - S[1]) || 1, l = h * 0.158, q = Math.acos(clamp(d / (2 * l), -1, 1)), b = Math.atan2(T[1] - S[1], T[0] - S[0]), E1 = [S[0] + Math.cos(b + q) * l, S[1] + Math.sin(b + q) * l], E2 = [S[0] + Math.cos(b - q) * l, S[1] + Math.sin(b - q) * l], E = E1[1] > E2[1] ? E1 : E2, W = d > 2 * l ? [S[0] + ((T[0] - S[0]) / d) * 2 * l, S[1] + ((T[1] - S[1]) / d) * 2 * l] : T;
        const go = () => { c.beginPath(); c.moveTo(S[0], S[1]); c.lineTo(E[0], E[1]); c.lineTo(W[0], W[1]); c.stroke(); }; if (ou) { c.strokeStyle = '#161a24'; c.lineWidth = h * 0.05 + 4; go(); } c.strokeStyle = col; c.lineWidth = h * 0.05; go();
        c.fillStyle = F.skin; c.beginPath(); c.arc(W[0], W[1], h * 0.025, 0, TAU); c.fill(); if (ou) { c.strokeStyle = '#161a24'; c.lineWidth = 2; c.stroke(); } }); }
      c.restore();
    }
    icon(name, x, y, s, col, lw, a = 1) {
      if (s <= 0 || a <= 0 || !name || name === 'none') return; const c = this.ctx; col = col || this.fg;
      if (name === 'coin') return this.coin(x, y, s * 0.46, this.P.symbol || '$', 0, a);
      if (name === 'chest') return this.chest(x, s * 0.9, { y: y + s * 0.36, col, a });
      if (name === 'friends') { this.person(x - s * 0.2, s * 0.9, { y: y + s * 0.5, col, a }); return this.person(x + s * 0.2, s * 0.9, { y: y + s * 0.5, col, a }); }
      c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = (lw || 4.5) / s; c.lineJoin = 'round'; c.lineCap = 'round';
      const M = pts => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); };
      switch (name) {
        case 'flower': M([[0, -0.05], [0, 0.5]]); c.stroke(); c.beginPath(); c.moveTo(0, 0.42); c.quadraticCurveTo(-0.32, 0.3, -0.3, 0.02); c.quadraticCurveTo(-0.1, 0.18, 0, 0.42); c.fill(); c.beginPath(); c.moveTo(-0.24, -0.42); c.lineTo(-0.1, -0.24); c.lineTo(0, -0.46); c.lineTo(0.1, -0.24); c.lineTo(0.24, -0.42); c.quadraticCurveTo(0.3, -0.05, 0, -0.02); c.quadraticCurveTo(-0.3, -0.05, -0.24, -0.42); c.closePath(); c.fill(); break;
        case 'diamond': M([[-0.5, -0.14], [-0.27, -0.42], [0.27, -0.42], [0.5, -0.14], [0, 0.46]]); c.closePath(); c.stroke();
          M([[-0.5, -0.14], [0.5, -0.14]]); c.stroke(); M([[-0.27, -0.42], [-0.16, -0.14], [0, 0.46], [0.16, -0.14], [0.27, -0.42]]); c.stroke(); M([[-0.16, -0.14], [0, -0.42], [0.16, -0.14]]); c.stroke(); break;
        case 'bar': M([[-0.5, 0.3], [-0.33, -0.16], [0.33, -0.16], [0.5, 0.3]]); c.closePath(); c.fill(); break;
        case 'bulb': c.beginPath(); c.arc(0, -0.12, 0.33, Math.PI * 0.72, Math.PI * 0.28, false); c.lineTo(0.15, 0.3); c.lineTo(-0.15, 0.3); c.closePath(); c.stroke();
          M([[-0.13, 0.4], [0.13, 0.4]]); c.stroke(); M([[-0.08, 0.49], [0.08, 0.49]]); c.stroke(); break;
        case 'star': c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.21 : 0.5, an = (i * TAU) / 10 - Math.PI / 2; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } c.closePath(); c.fill(); break;
        case 'dice': c.beginPath(); c.roundRect ? c.roundRect(-0.4, -0.4, 0.8, 0.8, 0.12) : c.rect(-0.4, -0.4, 0.8, 0.8); c.stroke();
          [[-0.2, -0.2], [0, 0], [0.2, 0.2]].forEach(p => { c.beginPath(); c.arc(p[0], p[1], 0.065, 0, TAU); c.fill(); }); break;
        case 'pin': c.beginPath(); c.arc(0, -0.14, 0.27, Math.PI * 0.85, Math.PI * 0.15, false); c.lineTo(0, 0.48); c.closePath(); c.stroke(); c.beginPath(); c.arc(0, -0.15, 0.09, 0, TAU); c.stroke(); break;
        case 'house': M([[-0.5, -0.05], [0, -0.46], [0.5, -0.05]]); c.stroke(); M([[-0.36, -0.14], [-0.36, 0.45], [0.36, 0.45], [0.36, -0.14]]); c.stroke(); M([[-0.1, 0.45], [-0.1, 0.12], [0.1, 0.12], [0.1, 0.45]]); c.stroke(); break;
        case 'bank': M([[-0.5, -0.18], [0, -0.46], [0.5, -0.18]]); c.closePath(); c.stroke(); [-0.3, 0, 0.3].forEach(px => { M([[px, -0.08], [px, 0.3]]); c.stroke(); }); M([[-0.5, 0.42], [0.5, 0.42]]); c.stroke(); break;
        case 'bag': c.beginPath(); c.moveTo(-0.13, -0.24); c.bezierCurveTo(-0.62, 0.12, -0.5, 0.48, 0, 0.48); c.bezierCurveTo(0.5, 0.48, 0.62, 0.12, 0.13, -0.24); c.closePath(); c.stroke();
          M([[-0.17, -0.44], [0.17, -0.44], [0.1, -0.26], [-0.1, -0.26]]); c.closePath(); c.stroke(); c.font = `800 0.42px ${this.ff}`; if ('letterSpacing' in c) c.letterSpacing = '0px'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(this.P.symbol && this.P.symbol !== 'skull' ? String(this.P.symbol).slice(0, 1) : '$', 0, 0.14); break;
        case 'doc': c.beginPath(); c.rect(-0.33, -0.45, 0.66, 0.9); c.stroke(); [-0.22, -0.04, 0.14].forEach(py => { M([[-0.19, py], [0.19, py]]); c.stroke(); }); break;
        case 'chart': M([[-0.45, -0.42], [-0.45, 0.42], [0.45, 0.42]]); c.stroke(); M([[-0.3, 0.22], [-0.08, 0.02], [0.08, 0.12], [0.36, -0.3]]); c.stroke(); break;
        case 'heart': c.beginPath(); c.moveTo(0, 0.42); c.bezierCurveTo(-0.66, -0.02, -0.42, -0.52, 0, -0.2); c.bezierCurveTo(0.42, -0.52, 0.66, -0.02, 0, 0.42); c.closePath(); c.stroke(); break;
        case 'phone': c.beginPath(); c.roundRect ? c.roundRect(-0.26, -0.46, 0.52, 0.92, 0.08) : c.rect(-0.26, -0.46, 0.52, 0.92); c.stroke(); M([[-0.08, 0.33], [0.08, 0.33]]); c.stroke(); break;
        case 'rocket': c.beginPath(); c.moveTo(0, -0.48); c.bezierCurveTo(0.3, -0.2, 0.26, 0.12, 0.16, 0.3); c.lineTo(-0.16, 0.3); c.bezierCurveTo(-0.26, 0.12, -0.3, -0.2, 0, -0.48); c.closePath(); c.stroke();
          c.beginPath(); c.arc(0, -0.1, 0.08, 0, TAU); c.stroke(); M([[-0.19, 0.1], [-0.36, 0.38], [-0.16, 0.3]]); c.stroke(); M([[0.19, 0.1], [0.36, 0.38], [0.16, 0.3]]); c.stroke(); M([[-0.07, 0.37], [0, 0.5], [0.07, 0.37]]); c.stroke(); break;
        case 'book': [-1, 1].forEach(k => { c.beginPath(); c.moveTo(0, -0.28); c.bezierCurveTo(k * 0.2, -0.42, k * 0.4, -0.4, k * 0.48, -0.34); c.lineTo(k * 0.48, 0.32); c.bezierCurveTo(k * 0.4, 0.26, k * 0.2, 0.24, 0, 0.38); c.stroke(); }); M([[0, -0.28], [0, 0.38]]); c.stroke(); break;
        case 'globe': c.beginPath(); c.arc(0, 0, 0.44, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 0, 0.19, 0.44, 0, 0, TAU); c.stroke(); M([[-0.44, 0], [0.44, 0]]); c.stroke(); M([[-0.38, -0.22], [0.38, -0.22]]); c.stroke(); M([[-0.38, 0.22], [0.38, 0.22]]); c.stroke(); break;
        case 'trophy': c.beginPath(); c.moveTo(-0.26, -0.42); c.lineTo(0.26, -0.42); c.bezierCurveTo(0.26, 0.08, 0.1, 0.14, 0, 0.14); c.bezierCurveTo(-0.1, 0.14, -0.26, 0.08, -0.26, -0.42); c.closePath(); c.stroke();
          c.beginPath(); c.arc(-0.28, -0.24, 0.13, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(0.28, -0.24, 0.13, -Math.PI * 0.5, Math.PI * 0.5); c.stroke(); M([[0, 0.14], [0, 0.34]]); c.stroke(); M([[-0.2, 0.42], [0.2, 0.42]]); c.stroke(); break;
        case 'flame': c.beginPath(); c.moveTo(0, -0.48); c.bezierCurveTo(0.1, -0.2, 0.36, -0.05, 0.3, 0.2); c.bezierCurveTo(0.26, 0.4, 0.1, 0.48, 0, 0.48); c.bezierCurveTo(-0.14, 0.48, -0.32, 0.36, -0.3, 0.14); c.bezierCurveTo(-0.28, -0.02, -0.14, -0.08, -0.12, -0.22); c.bezierCurveTo(-0.04, -0.16, -0.02, -0.3, 0, -0.48); c.closePath(); c.stroke(); break;
        case 'bolt': M([[0.1, -0.48], [-0.26, 0.06], [-0.02, 0.06], [-0.12, 0.48], [0.26, -0.1], [0.02, -0.1]]); c.closePath(); c.fill(); break;
        case 'target': [0.44, 0.27].forEach(r => { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }); c.beginPath(); c.arc(0, 0, 0.1, 0, TAU); c.fill(); break;
        case 'magnifier': c.beginPath(); c.arc(-0.1, -0.1, 0.34, 0, TAU); c.stroke(); c.lineWidth *= 1.5; M([[0.15, 0.15], [0.46, 0.46]]); c.stroke(); break;
        case 'cursor': M([[0, 0], [0, 0.82], [0.2, 0.62], [0.36, 0.98], [0.5, 0.92], [0.34, 0.56], [0.6, 0.54]]); c.closePath(); c.fill(); break;
      }
      c.restore();
    }
  }

  /* ---------- scene library ---------- */
  const F = (key, label, type, def, extra) => Object.assign({ key, label, type, def }, extra || {});
  const V = {};

  V.crowd = {
    name: 'Crowd with a few standouts', hint: 'A grid of people, a few highlighted. On the second line they step out toward a reward.',
    fields: [F('label', 'Box label', 'text', 'PLAYERS'), F('rows', 'Rows', 'num', 3), F('cols', 'Columns', 'num', 9), F('highlight', 'Highlighted columns', 'num', 1),
      F('split', 'Standouts walk out on line 2', 'bool', true), F('reward', 'Reward icon', 'icon', 'coin'), F('symbol', 'Coin symbol', 'text', 'skull')],
    draw(g) {
      const P = g.P, t = g.t, rows = clamp(P.rows | 0, 1, 5), cols = clamp(P.cols | 0, 2, 12), k = clamp(P.highlight | 0, 0, cols), h0 = Math.floor((cols - k) / 2);
      const sp = P.split && g.hasL2 ? eio(ramp(t, g.T2 - 0.1, 0.8)) : 0, cw = g.V(92, 86), rh = 150, ph = 112, cx = g.X(900) - sp * g.V(110, 0), cy = g.V(600, 560);
      const gap = 70 * sp, shrink = (k * cw) / 2 * sp, bw = cols * cw + 150 - 2 * shrink + gap, bh = rows * rh + 110, c = g.ctx;
      c.save(); c.globalAlpha *= g.in(0, 0.3); c.strokeStyle = rgba(g.fg, 0.75); c.lineWidth = 3; c.setLineDash([9, 9]); g.rr(cx - bw / 2, cy - bh / 2, bw, bh, 14); c.stroke(); c.restore();
      g.text(P.label, cx, cy - bh / 2 - 16, { size: 15, a: g.in(0.1) * 0.9 });
      g.halo(cx, cy, bw * 0.6, 0.06, g.fg); let hi = 0;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        let x = cx + (q - (cols - 1) / 2) * cw; const y = cy - (rows * rh) / 2 + (r + 1) * rh - 22, isH = q >= h0 && q < h0 + k;
        if (q < h0) x += shrink - gap / 2; else if (q >= h0 + k) x += -shrink + gap / 2;
        if (!isH) { g.person(x, ph, { y, a: g.in(0.02 * (r * cols + q), 0.25) }); continue; }
        const i = hi++, p = P.split && g.hasL2 ? eio(ramp(t, g.T2 + i * 0.1, 0.85)) : 0, n = rows * k;
        const tx = g.V(1620, 880) + (i - (n - 1) / 2) * g.V(92, 84), hh = lerp(ph, g.V(165, 150), p);
        g.person(lerp(x, tx, p), hh, { y: lerp(y, g.GY, p) - Math.sin(p * Math.PI) * 90, col: g.ac, gl: 1 });
      }
      if (sp > 0 && P.reward !== 'none') {
        const rp = g.pop(g.T2 + 0.5), rx = g.V(1740, 1290), ry = g.V(440, 925);
        g.halo(rx, ry, 250, 0.5 * g.in(g.T2 + 0.5, 0.5));
        if (P.reward === 'coin') g.coin(rx, ry + Math.sin(t * 2.4) * 8, 44 * rp, P.symbol, t * 2.2); else g.icon(P.reward, rx, ry, 110 * rp, g.ac);
      }
    },
  };

  V.hero = {
    name: 'One person with an idea', hint: 'The smart character. A crossed-out label, then an idea icon appears on line 2.',
    fields: [F('tag', 'Crossed-out label', 'text', 'ADDICTED?'), F('strike', 'Cross it out', 'bool', true), F('icon', 'Idea icon', 'icon', 'bulb'),
      F('symbols', 'Show = ↑ ★ symbols', 'bool', true), F('doubters', 'Show confused onlookers', 'bool', true)],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, T2 = g.hasL2 ? g.T2 : g.T1 + 1.0, hx = g.X(g.V(640, 560)), hh = g.V(290, 270);
      g.halo(hx, g.GY - 140, 300, 0.14 * g.in(0, 0.6)); g.person(hx, hh, { col: g.ac, gl: 1, pt: g.in(T2 - 0.05, 0.4), a: g.in(0, 0.3), arms: 1, act: t < T2 - 0.05 ? 'think' : '', mood: t < T2 - 0.05 ? 'think' : 'happy', st: t < T2 ? t : t - T2, look: t < T2 ? [0.3, -0.8] : [0.8, -0.5] });
      g.tag(P.tag, g.X(g.V(660, 600)), g.V(380, 420), { s: g.pop(0.6), strike: P.strike ? g.in(1.1, 0.3) : 0 });
      const bx = g.X(g.V(1180, 1330)), by = g.V(430, 520), bp = g.pop(T2);
      if (bp > 0) {
        g.halo(bx, by, 260, 0.5 * g.in(T2, 0.5)); g.icon(P.icon, bx, by, 170 * bp, g.ac, 8);
        if (P.symbols) {
          const a1 = g.in(T2 + 0.3), a2 = g.in(T2 + 0.75), a3 = g.pop(T2 + 1.05); c.save(); c.strokeStyle = g.fg; c.lineWidth = 5; c.lineCap = 'round';
          c.globalAlpha = a1; c.beginPath(); c.moveTo(bx - 172, by + 180); c.lineTo(bx - 142, by + 180); c.moveTo(bx - 172, by + 194); c.lineTo(bx - 142, by + 194); c.stroke();
          c.globalAlpha = a2; c.lineWidth = 3.5; c.beginPath(); c.moveTo(bx, by + 268 - a2 * 20); c.lineTo(bx, by + 228 - a2 * 20); c.moveTo(bx - 11, by + 240 - a2 * 20); c.lineTo(bx, by + 227 - a2 * 20); c.lineTo(bx + 11, by + 240 - a2 * 20); c.stroke(); c.restore();
          g.icon('star', bx + 160, by + 187, 50 * a3, g.fg);
        }
      }
      if (P.doubters) { const a = g.in(T2 + 0.9, 0.5) * 0.5, dx = g.X(g.V(1690, 1560)) + g.V(0, 60); g.person(dx - 38, 150, { a }); g.person(dx + 38, 150, { a }); g.text('?', dx + 44, g.GY - 190, { size: 26, a: a * 1.6, ls: 0 }); }
    },
  };

  V.curve = {
    name: 'Growth curve', hint: 'A pile of common things on the left, a curve that shoots up on the right.',
    fields: [F('pileLabel', 'Pile label', 'text', 'COMMON'), F('yLabel', 'Vertical axis', 'text', 'VALUE'), F('xLabel', 'Horizontal axis', 'text', 'RARE →'), F('endTag', 'Tag at the top of the curve', 'text', 'RARE')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, px = g.X(g.V(560, 330)), tc = Math.min(g.T1 > 0.6 ? g.T1 : 9, g.d - 0.7);
      let i = 0; [9, 8, 6, 4].forEach((n, r) => { for (let q = 0; q < n; q++, i++) { const a = g.in(0.25 + i * 0.03, 0.2); c.save(); c.globalAlpha = a * 0.85; c.fillStyle = g.fg; c.beginPath(); c.arc(px + (q - (n - 1) / 2) * 30, g.GY - 16 - r * 27 - (1 - a) * 30, 12, 0, TAU); c.fill(); c.restore(); } });
      g.text(P.pileLabel, px, g.GY + 30, { size: 14, a: g.in(0.8) * 0.8 });
      const ox = g.X(g.V(1030, 900)) - g.V(0, 110), oy = g.GY - 90, aw = g.V(620, 520), ah = g.V(510, 470), ay = g.in(0.7, 0.5), ax = g.in(0.95, 0.5);
      c.save(); c.strokeStyle = g.fg; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox, oy - ah * ay); c.moveTo(ox, oy); c.lineTo(ox + aw * ax, oy); c.stroke(); c.restore();
      g.text(P.yLabel, ox - 22, oy - ah + 8, { size: 14, align: 'right', a: ay * 0.8 }); g.text(P.xLabel, ox + aw, oy + 30, { size: 14, align: 'right', a: ax * 0.8 });
      const p = eio(ramp(t, Math.max(0.9, tc - 1.3), 1.2)); if (p <= 0) return; let ex = ox, ey = oy;
      c.save(); c.strokeStyle = g.ac; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(ox + 4, oy - 4);
      for (let u = 0; u <= p + 1e-6; u += 0.02) { ex = ox + 4 + u * aw * 0.93; ey = oy - 4 - Math.pow(u, 3.1) * ah * 0.9; c.lineTo(ex, ey); } c.stroke(); c.restore();
      g.halo(ex, ey, 90, 0.5); c.fillStyle = g.ac; c.beginPath(); c.arc(ex, ey, 10, 0, TAU); c.fill();
      if (P.endTag) { const s = g.pop(tc); g.halo(ex, ey - 44, 150 * s, 0.4 * clamp(s)); g.tag(P.endTag, ex, ey - 48, { s, fill: 1, size: 18 }); }
    },
  };

  V.pedestals = {
    name: 'Things on pedestals', hint: 'Up to four valuable things on display. The last one appears on line 2.',
    fields: [F('items', 'Items, as icon:LABEL', 'text', 'bar:RARE, diamond:RARE, friends:')],
    draw(g) {
      const P = g.P, items = list(P.items).slice(0, 4), n = items.length, sp = g.V(426, 300), w = g.V(190, 170), h = 165;
      items.forEach((it, i) => {
        const [ic, tg] = it.split(':').map(s => s.trim()), x = 960 + (i - (n - 1) / 2) * sp, r = i === n - 1 && g.hasL2 && n > 1 ? g.T2 : 0.1 + i * 0.4;
        g.pedestal(x, w, h, g.in(r, 0.3)); const p = g.pop(r + 0.12), iy = g.GY - h - 16 - 70;
        if (p > 0) {
          g.halo(x, iy, 150, 0.1 * clamp(p), g.fg); g.icon(ic, x, iy + (1 - clamp(p)) * 30, 125 * p, g.fg, 4.5);
          if (tg !== undefined) { const a = g.in(r + 0.4, 0.3); g.sparkle(x - 78, iy - 44, 11, a); g.sparkle(x + 82, iy - 66, 9, a); g.sparkle(x + 66, iy + 24, 7, a); }
        }
        if (tg) g.tag(tg, x, g.GY + 36, { s: g.pop(r + 0.45), size: 13 });
      });
    },
  };

  V.spotlight = {
    name: 'Spotlight reveal', hint: 'A spotlight on one object. It opens near the end and the prize bursts out.',
    fields: [F('object', 'Object', 'icon', 'chest'), F('symbol', 'Prize symbol (skull, $, ★ ...)', 'text', 'skull'), F('onlookers', 'Onlookers', 'bool', true), F('openAt', 'Opens at (seconds, 0 = auto)', 'num', 0)],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, cx = 960, a0 = g.in(0, 0.6), ph = 150, to = +P.openAt > 0 ? +P.openAt : g.d - 1.35, op = eo(ramp(t, to, 0.4));
      const gr = c.createLinearGradient(0, 180, 0, g.GY); gr.addColorStop(0, rgba(g.ac, 0)); gr.addColorStop(0.4, rgba(g.ac, 0.2 * a0)); gr.addColorStop(1, rgba(g.ac, (0.36 + 0.2 * op) * a0));
      c.fillStyle = gr; c.beginPath(); c.moveTo(cx - 80, 170); c.lineTo(cx + 80, 170); c.lineTo(cx + 270, g.GY); c.lineTo(cx - 270, g.GY); c.closePath(); c.fill();
      g.halo(cx, g.GY - 250, 1100 * op, 0.12 * op);
      g.pedestal(cx, 330, ph, g.in(0.1)); const cp = g.pop(g.T1 > 0.3 ? g.T1 : 0.5);
      if (P.onlookers) { const a = g.in((g.T1 > 0.3 ? g.T1 : 0.5) + 0.2) * 0.85; g.person(cx - g.V(500, 760), 190, { a }); g.person(cx + g.V(500, 760), 190, { a }); }
      if (cp > 0) g.obj(P.object, cx, 230 * cp, { y: g.GY - ph - 16, open: op, lw: 5 });
      g.burst(cx, g.GY - ph - 250 - 150 * op, op, P.symbol);
    },
  };

  V.row = {
    name: 'Row of people with objects', hint: 'Several people each open something. Good for "most people do X".',
    fields: [F('count', 'How many', 'num', 3), F('who', 'Who', 'select', 'everyone', { options: ['everyone', 'smart'] }), F('object', 'Object', 'icon', 'chest'),
      F('label', 'Label over each object', 'text', 'EMPTY'), F('leave', 'They walk away at the end', 'bool', true), F('sparks', 'Sparks on the objects', 'bool', false)],
    draw(g) {
      const P = g.P, t = g.t, n = clamp(P.count | 0, 1, 5), sp = g.V(Math.min(430, 1500 / n), Math.min(330, 1050 / n)), smart = P.who === 'smart';
      const lp = P.leave ? ei(ramp(t, g.d - 1.05, 0.85)) : 0, h = g.V(200, 180), ow = g.V(128, 105);
      for (let i = 0; i < n; i++) {
        const x = 960 + (i - (n - 1) / 2) * sp - ow * 0.45, a = g.in(0.1 + i * 0.1, 0.3), op = eo(ramp(t, 0.75 + i * 0.12, 0.35)), ox = x + h * 0.33 + ow * 0.5;
        if (smart) g.halo(x, g.GY - h * 0.5, h, 0.12 * a);
        g.obj(P.object, ox, ow, { open: op, a: a * (1 - lp * 0.75) });
        g.person(x - lp * 300, h, { col: smart ? g.ac : g.fg, gl: smart, a: a * (1 - lp * 0.7), pt: op * 0.75 });
        if (P.label) g.text(P.label, ox + 6, g.GY - ow * 0.5 - h * 0.62, { size: 13, a: g.in(1.15 + i * 0.12) * (1 - lp) * 0.8 });
        if (P.sparks) g.sparks(ox + 10, g.GY - ow * 0.62, 0.5 + 0.5 * Math.sin(t * 9 + i * 2.1));
        if (g.T1 > 0.3) g.text('...', x - lp * 300, g.GY - h - 18, { size: 22, ls: 0.1, a: g.in(g.T1 + 0.2) * (1 - lp) });
      }
    },
  };

  V.inspect = {
    name: 'Looking closer', hint: 'The smart character studies an object with a magnifying glass.',
    fields: [F('object', 'Object', 'icon', 'chest')],
    draw(g) {
      const t = g.t, hx = g.X(g.V(790, 640)), p = g.in(0.5, 0.9), ox = hx + g.V(430, 420);
      g.halo(hx, g.GY - 140, 300, 0.14); g.person(hx, g.V(270, 250), { col: g.ac, gl: 1, pt: g.in(0.15, 0.4), a: g.in(0, 0.3) });
      g.obj(g.P.object, ox, 160, { a: g.in(0.2), lw: 4.5 });
      g.icon('magnifier', lerp(hx + 190, ox - 90, p) + Math.sin(t * 2.2) * 14, g.GY - 250 + Math.cos(t * 1.7) * 10 + p * 60, 210 * g.pop(0.3), g.fg, 6);
    },
  };

  V.grid = {
    name: 'Crossing off a grid', hint: 'A board of options crossed off one by one, with a countdown.',
    fields: [F('rows', 'Rows', 'num', 4), F('cols', 'Columns', 'num', 6), F('from', 'Crossed off at start', 'num', 3), F('to', 'Crossed off at end', 'num', 22),
      F('label', 'Counter label', 'text', 'POSSIBLE SPOTS'), F('tag', 'Tag (appears with line 1)', 'text', 'ONE LESS'), F('object', 'Cell icon', 'icon', 'chest')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, rows = clamp(P.rows | 0, 1, 6), cols = clamp(P.cols | 0, 1, 8), N = rows * cols;
      const pw = g.V(900, 900), ph = g.V(620, 520), cx = g.V(815, 960), cy = g.V(605, 515), a0 = g.in(0, 0.3);
      c.save(); c.globalAlpha *= a0; c.strokeStyle = g.fg; c.lineWidth = 5; g.rr(cx - pw / 2, cy - ph / 2, pw, ph, 14); c.stroke();
      c.strokeStyle = rgba(g.fg, 0.3); c.lineWidth = 2; c.beginPath(); for (let u = 0; u <= 1; u += 0.02) { const x = cx - pw / 2 + 50 + u * (pw - 100), y = cy + 30 + Math.sin(u * 5.2 + 1) * 46 * (0.4 + u); u ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.restore();
      const f = lerp(clamp(+P.from, 0, N), clamp(+P.to, 0, N), ramp(t, 0.35, g.d - 1.1)), k = Math.floor(f + 1e-6);
      for (let i = 0; i < N; i++) {
        const r = Math.floor(i / cols), q = i % cols, x = cx - pw / 2 + (pw * (q + 0.5)) / cols, y = cy - ph / 2 + (ph * (r + 0.5)) / rows, done = i < k;
        g.icon(P.object, x, y, 50, g.fg, 3.5, a0 * (done ? 0.3 : 1)); if (done) g.xmark(x, y, 17, i === k - 1 ? clamp(0.6 + (f - k) * 3, 0, 1.15) : 1);
      }
      const lx = g.V(1500, 620), ly = g.V(372, 850), moving = ramp(t, 0.35, g.d - 1.1) > 0 && ramp(t, 0.35, g.d - 1.1) < 1;
      g.text(P.label, lx, ly, { size: 17, a: a0 * 0.9 }); g.counter(N - k, lx, ly + g.V(85, 80), 76, moving, a0);
      if (P.tag) g.tag(P.tag, g.V(1500, 960), g.V(660, 900), { s: g.pop((g.T1 > 0.3 ? g.T1 : 1) + 0.3), size: 16 });
      const hx = g.V(1530, 1330); g.halo(hx, g.GY - 100, 220, 0.14); g.person(hx, g.V(215, 190), { col: g.ac, gl: 1, pt: 0.9, a: a0, dir: g.V(1, -1) });
    },
  };

  V.tracker = {
    name: 'Tracking table', hint: 'A logbook filling in column by column, a map of pins, and a running count.',
    fields: [F('cols', 'Column names (3)', 'text', 'CHEST, LAND, MATCH'), F('rows', 'Rows', 'num', 9), F('label', 'Counter label', 'text', 'MATCHES'), F('value', 'Counter ends at', 'num', 403), F('pins', 'Show map panel', 'bool', true)],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, cols = list(P.cols).slice(0, 3), rows = clamp(P.rows | 0, 2, 12), a0 = g.in(0, 0.3);
      const tw = g.V(520, 430), th = g.V(680, 640), tx = g.V(720, 700), top = g.V(255, 250), T1 = g.T1 > 0.3 ? g.T1 : 1.2, T2 = g.hasL2 ? g.T2 : T1 + 1.1;
      c.save(); c.globalAlpha *= a0; c.strokeStyle = g.fg; c.lineWidth = 5; g.rr(tx - tw / 2, top, tw, th, 12); c.stroke();
      c.lineWidth = 2.5; c.beginPath(); c.moveTo(tx - tw / 2 + 28, top + 84); c.lineTo(tx + tw / 2 - 28, top + 84); c.stroke(); c.restore();
      const starts = [0.3, T1, T2], ends = [Math.max(0.9, T1 - 0.2), T2 - 0.1, g.d - 0.6];
      cols.forEach((name, j) => {
        const x = tx - tw / 2 + (tw * (j + 0.5)) / cols.length, f = ramp(t, starts[j], Math.max(0.3, ends[j] - starts[j])) * rows, len = (tw / cols.length) * 0.5;
        g.text(name, x, top + 52, { size: 14, a: a0 * 0.85, ls: 0.14 });
        c.save(); c.strokeStyle = j === 0 ? g.ac : g.fg; c.lineWidth = 7; c.lineCap = 'round';
        for (let r = 0; r < rows; r++) { const q = clamp(f - r); if (q <= 0) break; const y = top + 128 + (r * (th - 180)) / (rows - 1); c.beginPath(); c.moveTo(x - len / 2, y); c.lineTo(x - len / 2 + len * q, y); c.stroke(); }
        c.restore();
      });
      const sx = g.V(1260, 1215), sy = g.V(520, 420), sw = g.V(450, 400), sh = g.V(390, 330), sp = P.pins ? g.pop(T1 + 0.05) : 0;
      if (sp > 0) {
        c.save(); c.translate(sx, sy); c.scale(sp, sp); c.strokeStyle = g.fg; c.lineWidth = 5; g.rr(-sw / 2, -sh / 2, sw, sh, 12); c.stroke(); c.restore();
        for (let i = 0; i < 6; i++) { const s = g.pop(T1 + 0.35 + i * 0.16, 0.35); g.icon('pin', sx + ((i % 3) - 1) * sw * 0.29, sy + (i < 3 ? -1 : 1) * sh * 0.2, 58 * s, i === 5 ? g.ac : g.fg, 4); }
      }
      const kx = g.V(1640, 1215), ky = g.V(480, 660), ca = g.in(T2 + 0.15), cp = ramp(t, T2 + 0.15, Math.max(0.4, g.d - T2 - 0.9));
      g.text(P.label, kx, ky, { size: 16, a: ca * 0.9 }); g.counter(eo(cp) * (+P.value || 0), kx, ky + 70, 60, cp > 0 && cp < 1, ca);
      const hx = g.V(330, 1215); g.halo(hx, g.GY - 100, 220, 0.14); g.person(hx, g.V(215, 185), { col: g.ac, gl: 1, pt: 0.9, a: a0, dir: g.V(1, -1) });
    },
  };

  V.versus = {
    name: 'The crowd vs the smart one', hint: 'A group on the left labels the smart character on the right.',
    fields: [F('crowd', 'People in the crowd', 'num', 2), F('tag', 'What the crowd calls it', 'text', 'ADDICTION')],
    draw(g) {
      const P = g.P, T1 = g.T1 > 0.3 ? g.T1 : 1.3, hx = g.X(g.V(1310, 1400)), cxx = g.X(g.V(620, 520));
      g.crowd(cxx, clamp(P.crowd | 0, 1, 5), g.V(270, 240), { a: g.in(0, 0.3), pt: g.in(T1 - 0.9, 0.4), sp: g.V(112, 98) });
      g.halo(hx, g.GY - 140, 320, 0.15); g.person(hx, g.V(290, 260), { col: g.ac, gl: 1, a: g.in(0.1, 0.3), pt: g.in(T1 + 0.1, 0.4) });
      g.tag(P.tag, g.X(940), g.V(370, 430), { s: g.pop(0.75), size: 21 });
    },
  };

  V.clock = {
    name: 'Time passing', hint: 'A spinning clock. The crowd watches while the smart one keeps working.',
    fields: [F('tag', 'Crowd label', 'text', 'WASTE OF TIME'), F('crowd', 'People in the crowd', 'num', 3), F('object', 'Object', 'icon', 'chest')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, T1 = g.T1 > 0.3 ? g.T1 : 0.6, kx = g.X(g.V(1250, 960)), ky = g.V(400, 470), r = 80, s = g.pop(0.4), ff = ramp(t, T1 + 1.5, 0.5);
      if (s > 0) {
        c.save(); c.translate(kx, ky); c.scale(s, s); c.strokeStyle = g.fg; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
        const an = t * 1.4 + t * t * 1.3; c.globalAlpha = 1 - ff; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(an) * r * 0.68, -Math.cos(an) * r * 0.68); c.moveTo(0, 0); c.lineTo(Math.sin(an / 12 + 4) * r * 0.45, -Math.cos(an / 12 + 4) * r * 0.45); c.stroke();
        c.globalAlpha = ff; c.lineWidth = 6; c.lineJoin = 'round'; [-16, 12].forEach(dx => { c.beginPath(); c.moveTo(dx - 12, -24); c.lineTo(dx + 14, 0); c.lineTo(dx - 12, 24); c.stroke(); }); c.restore();
      }
      const cxx = g.X(g.V(690, 460)), n = clamp(P.crowd | 0, 1, 5), h = g.V(215, 190);
      for (let i = 0; i < n; i++) g.person(cxx + (i - (n - 1) / 2) * g.V(86, 70), h, { a: g.in(0.1 + i * 0.08, 0.3) });
      g.tag(P.tag, cxx - 20, g.GY - h - 62, { s: g.pop(T1 + 0.7), size: 14, a: 0.75 });
      const hx = g.X(g.V(1290, 1420)); g.halo(hx, g.GY - 100, 230, 0.14); const op = eo(ramp(t, T1 + 0.75, 0.35));
      g.obj(P.object, hx + g.V(135, 118), g.V(112, 100), { open: op, a: g.in(0.3) }); g.person(hx, h, { col: g.ac, gl: 1, pt: 0.8, a: g.in(0.2, 0.3) });
    },
  };

  V.tags = {
    name: 'Noise vs progress', hint: 'The crowd shouts opinions (tags pop up) while the smart one makes steady progress.',
    fields: [F('tags', 'Opinions, separated by commas', 'text', "IT'S FAKE, DOESN'T EXIST, CAP, NOBODY HAS IT, SKILL ISSUE"), F('crowd', 'People in the crowd', 'num', 3),
      F('barLabel', 'Progress bar label', 'text', 'CLOSER'), F('progress', 'Progress bar ends at (%)', 'num', 70), F('chests', 'Objects in the row', 'num', 5), F('object', 'Object', 'icon', 'chest')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, T1 = g.T1 > 0.6 ? g.T1 : g.d * 0.5, tags = list(P.tags), cxx = g.X(g.V(330, 380)) + g.V(0, 60), h = g.V(215, 185);
      g.crowd(cxx, clamp(P.crowd | 0, 1, 5), h, { a: g.in(0, 0.3), pt: g.in(0.35, 0.4), sp: g.V(92, 78) });
      let x = g.V(165, 450), y = g.V(345, 290); const x0 = x, maxX = g.V(820, 1470), size = g.V(15, 15);
      tags.forEach((s, i) => {
        g.font(700, size, 0.16); const w = c.measureText(s.toUpperCase()).width + size * 2.1; if (x + w > maxX && x > x0) { x = x0 - 22 * ((i % 2) ? 1 : -1); y += 62; }
        g.tag(s, x + w / 2, y + ((i * 7) % 5) * 3, { s: g.pop(0.45 + (i * Math.max(0.6, T1 - 1)) / Math.max(1, tags.length), 0.35), size }); x += w + 34;
      });
      const a1 = g.in(T1, 0.35); if (a1 <= 0) return; const n = clamp(P.chests | 0, 1, 7), sp = g.V(152, 118), sx = g.V(1100, 880), ow = g.V(112, 90), step = Math.max(0.3, (g.d - T1 - 0.9) / n);
      const cur = clamp((t - T1 - 0.2) / step, 0, n - 0.001), hi = Math.floor(cur), hx = sx + hi * sp + sp * 0.2 * eo(cur - hi) - ow * 0.2;
      for (let i = 0; i < n; i++) { const op = eo(ramp(t, T1 + 0.2 + i * step, 0.3)); g.obj(P.object, sx + i * sp + ow * 0.5, ow, { open: op, a: a1 }); if (op > 0.5 && i < hi) g.text('×', sx + i * sp + ow * 0.9, g.GY - ow * 1.25, { size: 20, ls: 0, a: 0.6 }); }
      g.halo(hx, g.GY - 100, 210, 0.2 * a1); g.person(hx, h, { col: g.ac, gl: 1, pt: 0.85, a: a1 });
      const bx = g.V(1110, 960 - 250), by = g.V(395, 560), bw = 500, bh = 30, pr = eo(ramp(t, T1 + 0.3, g.d - T1 - 1)) * clamp(+P.progress / 100);
      g.text(P.barLabel, bx + 2, by - 34, { size: 15, align: 'left', a: a1 * 0.9 });
      c.save(); c.globalAlpha *= a1; c.strokeStyle = g.ac; c.lineWidth = 3.5; g.rr(bx, by - bh / 2, bw, bh, bh / 2); c.stroke(); c.fillStyle = g.ac; if (pr > 0.03) { g.rr(bx + 6, by - bh / 2 + 6, (bw - 12) * pr, bh - 12, bh / 2); c.fill(); } c.restore();
      g.halo(bx + bw * pr, by, 120, 0.25 * a1);
    },
  };

  V.quit = {
    name: 'Quitting one short', hint: 'Someone gives up right before the one that would have paid off.',
    fields: [F('chests', 'Objects in the row', 'num', 5), F('quitAt', 'They quit after opening', 'num', 3), F('tag', 'Tag over the quitter', 'text', 'QUIT'), F('label', 'Label over opened ones', 'text', 'EMPTY'),
      F('object', 'Object', 'icon', 'chest'), F('symbol', 'Prize symbol', 'text', 'skull')],
    draw(g) {
      const P = g.P, t = g.t, n = clamp(P.chests | 0, 2, 6), q = clamp(P.quitAt | 0, 1, n - 1), sp = g.V(Math.min(260, 1300 / n), Math.min(205, 1040 / n)), w = g.V(150, 118);
      const T1 = g.T1 > 0.3 ? g.T1 : 1.0, to = g.d - 1.15, op = eo(ramp(t, to, 0.4)), xi = i => 960 + (i - (n - 1) / 2) * sp, lx = xi(n - 1), glow = g.in(T1 + 0.2, 0.6);
      g.halo(lx, g.GY - 80, 300 + 30 * Math.sin(t * 4), 0.4 * glow);
      for (let i = 0; i < n; i++) {
        const last = i === n - 1, a = g.in(0.05 + i * 0.07, 0.3), ww = last ? w * (1 + 0.14 * glow) : w;
        g.obj(P.object, xi(i), ww, { open: i < q ? eo(ramp(t, 0.2 + i * 0.12, 0.3)) : last ? op : 0, a, lw: last ? 5 : undefined });
        if (i < q && P.label) g.text(P.label, xi(i) - 8, g.GY - w * 1.25, { size: 13, a: g.in(0.6 + i * 0.12) * 0.75 });
      }
      const px = (xi(q - 1) + xi(q)) / 2 + sp * 0.08; g.person(px, g.V(215, 180), { a: g.in(0.3, 0.3), dir: -1, pt: 0.5 });
      g.tag(P.tag, px, g.GY - g.V(215, 180) - 46, { s: g.pop(0.9), size: 14 });
      g.burst(lx, g.GY - w * 0.7 - 210 * op, op, P.symbol);
    },
  };

  V.counter = {
    name: 'Big counting number', hint: 'A number that counts up fast, with the smart characters working below.',
    fields: [F('label', 'Label', 'text', 'CHESTS OPENED'), F('value', 'Counts up to', 'num', 9999), F('prefix', 'Before the number ($)', 'text', ''), F('pill', 'Tag under the number', 'text', 'NEVER STOP'),
      F('heroes', 'Characters (0 to hide)', 'num', 3), F('object', 'Object', 'icon', 'chest')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, cp = ramp(t, 0.25, Math.max(0.5, g.d - 1.6)), a0 = g.in(0.1), y = g.V(378, 330), val = Math.pow(cp, 2.2) * (+P.value || 0);
      g.text(P.label, 960, y, { size: 17, a: a0 * 0.9 });
      if (P.prefix) { const s = P.prefix + fmt(val); c.save(); g.font(800, g.V(92, 100), 0.03); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = g.ac; c.globalAlpha = a0; c.fillText(s, 960, y + 88); c.restore(); g.halo(960, y + 88, 160, 0.16 * a0); }
      else g.counter(val, 960, y + 88, g.V(92, 100), cp > 0 && cp < 1, a0);
      if (P.pill) g.tag(P.pill, 960, y + 180, { s: g.pop(0.25 + Math.max(0.5, g.d - 1.6)), fill: 1, size: 15 });
      const n = clamp(P.heroes | 0, 0, 5), sp = g.V(Math.min(440, 1500 / Math.max(1, n)), Math.min(330, 1050 / Math.max(1, n))), h = g.V(215, 180), ow = g.V(118, 96);
      for (let i = 0; i < n; i++) {
        const x = 960 + (i - (n - 1) / 2) * sp - ow * 0.5, cyc = (t * 1.5 + i * 0.37) % 1, op = Math.sin(clamp(cyc * 1.6) * Math.PI);
        g.halo(x, g.GY - 100, 220, 0.14 * a0); g.obj(P.object, x + h * 0.36 + ow * 0.5, ow, { open: op * 0.9, a: a0 });
        g.person(x, h, { col: g.ac, gl: 1, pt: 0.5 + op * 0.4, a: g.in(0.05 + i * 0.08, 0.3) }); g.sparks(x + h * 0.36 + ow * 0.75, g.GY - ow * 0.75, op);
      }
    },
  };

  V.luck = {
    name: 'Not luck, persistence', hint: 'The lucky one gets crossed out. The persistent one opens the prize.',
    fields: [F('tag', 'Label over the first person', 'text', 'LUCKIEST'), F('icons', 'Icons over them', 'text', 'star, dice'), F('object', 'Object', 'icon', 'chest'), F('symbol', 'Prize symbol', 'text', 'skull')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, T1 = g.T1 > 0.3 ? g.T1 : 1.6, wx = g.X(g.V(480, 400)), h = g.V(215, 190), xp = g.pop(T1 + 0.1), dim = 1 - 0.55 * clamp(xp);
      g.person(wx, h, { a: g.in(0, 0.3) * dim }); const ic = list(P.icons).slice(0, 3);
      ic.forEach((nm, i) => g.icon(nm, wx + (i - (ic.length - 1) / 2) * 76, g.GY - h - 70, 58 * g.pop(0.6 + i * 0.3), g.fg, 4, dim));
      g.tag(P.tag, wx, g.GY - h - 150, { s: g.pop(1.35), size: 13, a: dim });
      if (xp > 0) { const hy = g.GY - h * 0.8; c.save(); c.strokeStyle = g.ac; c.lineWidth = 5; c.beginPath(); c.arc(wx, hy, 34 * xp, 0, TAU); c.stroke(); c.restore(); g.xmark(wx, hy, 15, xp); }
      const a1 = g.in(T1 + 0.25, 0.4); if (a1 <= 0) return; const hx = g.X(g.V(1000, 1250)) + (1 - a1) * 160, ox = hx + g.V(200, 175), to = g.d - 1.1, op = eo(ramp(t, to, 0.4));
      g.halo(hx, g.GY - 110, 240, 0.16 * a1); g.obj(P.object, ox, g.V(175, 150), { open: op, a: a1, lw: 5 }); g.person(hx, g.V(240, 210), { col: g.ac, gl: 1, pt: 0.9, a: a1 });
      g.burst(ox, g.GY - 330 - 110 * op, op, P.symbol);
    },
  };

  V.cta = {
    name: 'Follow button', hint: 'End card. A cursor clicks the button and the character celebrates.',
    fields: [F('button', 'Button text', 'text', '+ FOLLOW'), F('buttonDone', 'Text after the click', 'text', 'FOLLOWING'), F('foot', 'Small label under the character', 'text', 'JIGGLE PHYSICS')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, tc = Math.min(1.0, g.d * 0.4), done = t >= tc, hx = g.V(500, 960), bx = g.V(1265, 960), by = g.V(630, 520), bw = 560, bh = 150;
      const press = 1 - 0.07 * Math.sin(ramp(t, tc - 0.08, 0.3) * Math.PI), j = done ? Math.sin(t * 38) * 7 * (0.35 + 0.65 * Math.exp(-(t - tc) * 1.2)) : 0;
      g.halo(hx, g.GY - 140, 300, 0.15 + (done ? 0.1 : 0)); g.person(hx + j, g.V(290, 270), { col: g.ac, gl: P.glasses != null ? !!P.glasses : !done, hat: P.hat, hair: P.hair, a: g.in(0, 0.3), lean: j * 0.0012, arms: 1, mood: done ? 'happy' : '', act: done ? 'cheer' : 'point', st: done ? t - tc : t, dir: g.vert ? 1 : 1, look: done ? [0, 0] : [g.vert ? 0 : 0.8, g.vert ? -0.9 : -0.3] });
      if (done) { c.save(); c.strokeStyle = g.ac; c.lineWidth = 4; c.lineCap = 'round'; [1, 2].forEach(k => [-1, 1].forEach(s => { c.globalAlpha = 0.75 / k * (0.6 + 0.4 * Math.sin(t * 20 + k)); c.beginPath(); c.arc(hx, g.GY - 60, 120 + k * 28, s > 0 ? -0.5 : Math.PI - 0.5, s > 0 ? 0.5 : Math.PI + 0.5); c.stroke(); })); c.restore(); g.text(P.foot, hx, g.GY + 34, { size: 14, col: g.ac, a: g.in(tc + 0.1) }); }
      const s = g.pop(0.15) * press; if (s <= 0) return;
      if (done) g.halo(bx, by, 420, 0.3);
      c.save(); c.translate(bx, by); c.scale(s, s); c.fillStyle = done ? g.ac : g.fg; g.rr(-bw / 2, -bh / 2, bw, bh, bh / 2); c.fill(); c.restore();
      g.text(done ? P.buttonDone : P.button, bx, by + 2, { size: 30, wt: 700, col: g.bg, ls: 0.16, a: clamp(s) });
      const cp = eo(ramp(t, tc - 0.75, 0.6)); g.icon('cursor', lerp(bx + 420, bx + 120, cp), lerp(by + 330, by + 28, cp), 62, g.fg, null, g.in(tc - 0.8, 0.2));
    },
  };

  V.bars = {
    name: 'Bar chart', hint: 'Bars that grow in. One bar is highlighted. Good for money over time.',
    fields: [F('bars', 'Bars, as LABEL:NUMBER', 'text', '10 YRS:91, 20 YRS:295, 30 YRS:745'), F('prefix', 'Before each number', 'text', '$'), F('suffix', 'After each number', 'text', 'K'),
      F('highlight', 'Highlighted bar (0 = last)', 'num', 0), F('label', 'Chart label', 'text', 'ILLUSTRATIVE')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, bars = list(P.bars).map(s => { const i = s.lastIndexOf(':'); return { l: i < 0 ? s : s.slice(0, i).trim(), v: parseFloat(i < 0 ? 0 : s.slice(i + 1)) || 0 }; }).slice(0, 8);
      const n = bars.length; if (!n) return; const max = Math.max(...bars.map(b => b.v), 1e-9), tot = g.V(1100, 900), sp = tot / n, bw = Math.min(170, sp * 0.56), base = g.GY - 78, mh = g.V(520, 480), hi = (P.highlight | 0) > 0 ? (P.highlight | 0) - 1 : n - 1;
      g.text(P.label, 960 - tot / 2 + 10, base - mh - 90, { size: 14, align: 'left', a: g.in(0.1) * 0.7 });
      bars.forEach((b, i) => {
        const x = 960 + (i - (n - 1) / 2) * sp, p = eo(ramp(t, 0.3 + i * 0.22, 0.8)), h = Math.max(6, (b.v / max) * mh * p), isH = i === hi;
        if (isH) g.halo(x, base - h / 2, h * 0.8 + 140, 0.22 * p);
        c.save(); c.globalAlpha *= g.in(0.2 + i * 0.22, 0.25); g.rr(x - bw / 2, base - h, bw, h, 8); if (isH) { c.fillStyle = g.ac; c.fill(); } else { c.strokeStyle = g.fg; c.lineWidth = 4.5; c.stroke(); } c.restore();
        g.text(b.l, x, base + 34, { size: 15, a: g.in(0.2 + i * 0.22) * 0.85 });
        c.save(); g.font(800, g.V(40, 36), 0.02); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = isH ? g.ac : g.fg; c.globalAlpha = p; c.fillText((P.prefix || '') + fmt(b.v * p) + (P.suffix || ''), x, base - h - 38); c.restore();
      });
    },
  };

  V.hook = {
    name: 'Big statement', hint: 'One huge number or word that fills the screen. Built for the first two seconds.',
    fields: [F('big', 'Big text or number', 'text', '97%'), F('sub', 'Line under it', 'text', 'QUIT BEFORE IT PAYS OFF'), F('icon', 'Icon above', 'icon', 'none')],
    draw(g) {
      const P = g.P, c = g.ctx, t = g.t, cy = g.V(610, 560), s = g.pop(0.03, 0.5); if (s <= 0) return; let txt = String(P.big || '');
      const m = txt.match(/^([^0-9]*)([\d,]*\.?\d+)(.*)$/);
      if (m && !/^[12]\d{3}$/.test(txt.trim())) { const target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, v = target * eo(ramp(t, 0.03, 0.9)); txt = m[1] + (dec ? v.toFixed(dec) : /,/.test(m[2]) ? fmt(v) : String(Math.round(v))) + m[3]; }
      txt = txt.toUpperCase(); g.font(800, 100, -0.01); const w100 = Math.max(1, c.measureText(String(P.big || '').toUpperCase()).width), size = Math.min(g.V(340, 300), (g.V(1400, 920) / w100) * 100);
      g.halo(960, cy, 560, 0.3 * clamp(s)); if (t < 0.6) g.shake(11 * Math.exp(-t * 8)); g.spray(960, cy, 24, ramp(t, 0.02, 0.7), { r0: 240, r: g.V(620, 380), len: 70, lw: 4, col: g.ac, a: 0.8, seed: 3 }); c.save(); c.translate(960, cy); c.scale(s, s); g.font(800, size, -0.01); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = g.ac; c.fillText(txt, 0, 0); c.restore();
      g.text(P.sub, 960, cy + size * 0.6 + 34, { size: 30, wt: 700, ls: 0.14, a: g.in(0.45) }); g.icon(P.icon, 960, cy - size * 0.6 - 76, 130 * g.pop(0.3), g.fg, 5);
    },
  };

  V.steps = {
    name: 'Numbered steps', hint: 'A short list that reveals one row at a time. Keep each step to a few words.',
    fields: [F('items', 'Steps, separated by commas', 'text', 'SPEND LESS THAN YOU EARN, INVEST THE DIFFERENCE, WAIT'), F('highlight', 'Highlighted step (0 = none)', 'num', 0)],
    draw(g) {
      const P = g.P, c = g.ctx, items = list(P.items).slice(0, 5), n = items.length; if (!n) return;
      const x0 = g.V(640, 478), top = g.V(310, 300), rh = Math.min(g.V(140, 165), (g.GY - top - 90) / n), span = Math.max(0.8, g.d - 1.6);
      g.font(700, 100, 0.06); const widest = Math.max.apply(null, items.map(s => c.measureText(g.caps ? String(s).toUpperCase() : s).width * 1.08 + s.length * 6)), size = Math.min(g.V(40, 44), (g.V(1180, 900) / Math.max(1, widest)) * 100);
      items.forEach((s, i) => {
        const a = g.in(0.25 + (i * span) / n, 0.3), y = top + rh * (i + 0.5), hi = (P.highlight | 0) === i + 1, col = hi ? g.ac : g.fg, dx = (1 - a) * -50; if (a <= 0) return;
        if (hi) g.halo(x0 + 260, y, 330, 0.22 * a);
        c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.fillStyle = g.ac; c.lineWidth = 4; c.beginPath(); c.arc(x0 + dx, y, 31, 0, TAU); hi ? c.fill() : c.stroke(); c.restore();
        g.text(i + 1, x0 + dx, y + 2, { size: 27, wt: 800, ls: 0, col: hi ? g.bg : g.fg, a }); g.text(s, x0 + 66 + dx, y + 2, { size, wt: 700, ls: 0.06, align: 'left', col, a });
      });
      if (!g.vert) { g.halo(350, g.GY - 130, 280, 0.14); g.person(350, 260, { col: g.ac, gl: 1, pt: 0.9, a: g.in(0, 0.3), arms: 1, talk: true }); }
    },
  };

  V.compare = {
    name: 'A versus B', hint: 'Two options side by side with a number each. The winner lights up when the main line appears.',
    fields: [F('left', 'Left name', 'text', 'RENT'), F('right', 'Right name', 'text', 'BUY'), F('label', 'Small label', 'text', 'PER MONTH'), F('leftValue', 'Left number', 'num', 1200), F('rightValue', 'Right number', 'num', 1900),
      F('prefix', 'Before the numbers', 'text', '$'), F('suffix', 'After the numbers', 'text', ''), F('winner', 'Winner', 'select', 'right', { options: ['left', 'right', 'none'] })],
    draw(g) {
      const P = g.P, c = g.ctx, t = g.t, T1 = g.T1 > 0.3 ? g.T1 : 1.4, off = g.V(350, 272), pw = g.V(540, 440), ph = g.V(440, 430), cy = g.V(600, 560), win = g.in(T1, 0.4);
      [['left', -1], ['right', 1]].forEach(([k, sg], i) => {
        const x = 960 + sg * off, a = g.in(0.1 + i * 0.25, 0.35), isW = P.winner === k, dim = 1 - 0.6 * win * (P.winner !== 'none' && !isW ? 1 : 0), col = isW && win > 0.5 ? g.ac : g.fg;
        if (isW) g.halo(x, cy, pw * 0.85, 0.3 * win);
        c.save(); c.globalAlpha *= a * dim; c.strokeStyle = col; c.lineWidth = isW ? 4 + 3 * win : 4; g.rr(x - pw / 2, cy - ph / 2 + (1 - a) * 40, pw, ph, 18); if (g.paint) { c.save(); c.globalAlpha = Math.min(1, c.globalAlpha * 1.6); c.fillStyle = 'rgba(248,240,222,0.95)'; c.fill(); c.restore(); } c.stroke(); c.restore();
        g.text(P[k], x, cy - ph / 2 + 74, { size: g.V(34, 28), wt: 700, ls: 0.12, a: a * dim, col });
        const v = (+P[k + 'Value'] || 0) * eo(ramp(t, 0.4 + i * 0.25, 0.9)), dec = Math.min(3, (String(P[k + 'Value']).split('.')[1] || '').length);
        c.save(); g.font(800, g.V(98, 78), 0); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.globalAlpha = a * dim; c.fillText((P.prefix || '') + (dec ? v.toFixed(dec) : fmt(v)) + (P.suffix || ''), x, cy + 22); c.restore();
        g.text(P.label, x, cy + ph / 2 - 62, { size: 15, a: a * dim * 0.8 }); if (isW && win > 0) g.icon('star', x + pw / 2 - 54, cy - ph / 2 + 56, 52 * g.pop(T1), g.ac);
      });
      g.tag('VS', 960, cy, { s: g.pop(0.55), size: 17 });
    },
  };

  V.ring = {
    name: 'Percent ring', hint: 'A ring that fills to a percentage with the number in the middle, and ten people below to match.',
    fields: [F('percent', 'Percent', 'num', 70), F('label', 'Label under the ring', 'text', 'OF PEOPLE NEVER START'), F('people', 'Show ten people below', 'bool', true)],
    draw(g) {
      const P = g.P, c = g.ctx, t = g.t, pc = clamp(+P.percent / 100), p = eo(ramp(t, 0.3, 1.2)) * pc, cx = 960, cy = g.V(505, 500), r = g.V(165, 185), a0 = g.in(0.05);
      g.halo(cx, cy, r * 2.1, 0.2 * a0); c.save(); c.globalAlpha *= a0; c.lineWidth = 42; c.strokeStyle = rgba(g.fg, 0.16); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
      c.strokeStyle = g.ac; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.002, p)); c.stroke();
      g.font(800, r * 0.56, 0); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = g.ac; c.fillText(Math.round(p * 100) + '%', cx, cy + 4); c.restore();
      g.text(P.label, cx, cy + r + 74, { size: 26, wt: 700, ls: 0.12, a: g.in(0.6) });
      if (P.people) for (let i = 0; i < 10; i++) { const on = i < Math.round(pc * 10) && p * 10 > i + 0.5; g.person(960 + (i - 4.5) * g.V(104, 92), g.V(125, 118), { col: on ? g.ac : g.fg, a: g.in(0.1 + i * 0.04, 0.25) * (on ? 1 : 0.55) }); }
    },
  };

  V.timeline = {
    name: 'Timeline', hint: 'Points along a line, revealed left to right while the character walks it.',
    fields: [F('points', 'Points, as WHEN:WHAT', 'text', '2008:CRASH, 2013:RECOVERY, 2020:PANIC, 2024:RECORD HIGH'), F('highlight', 'Highlighted point (0 = last)', 'num', 0)],
    draw(g) {
      const P = g.P, c = g.ctx, t = g.t, pts = list(P.points).map(s => { const i = s.indexOf(':'); return { y: i < 0 ? s : s.slice(0, i).trim(), l: i < 0 ? '' : s.slice(i + 1).trim() }; }).slice(0, 6), n = pts.length; if (!n) return;
      const tot = g.V(1440, 940), x0 = 960 - tot / 2, ly = g.V(590, 560), span = Math.max(0.8, g.d - 1.5), prog = ramp(t, 0.2, span), hi = (P.highlight | 0) > 0 ? (P.highlight | 0) - 1 : n - 1;
      c.save(); c.lineCap = 'round'; c.lineWidth = 5; c.strokeStyle = rgba(g.fg, 0.22); c.beginPath(); c.moveTo(x0, ly); c.lineTo(x0 + tot, ly); c.stroke(); c.strokeStyle = g.fg; c.beginPath(); c.moveTo(x0, ly); c.lineTo(x0 + tot * prog, ly); c.stroke(); c.restore();
      pts.forEach((pt, i) => {
        const x = x0 + (tot * (i + 0.5)) / n, s = g.pop(0.2 + (span * (i + 0.5)) / n, 0.4), isH = i === hi, col = isH ? g.ac : g.fg; if (s <= 0) return;
        if (isH) g.halo(x, ly, 190, 0.4 * clamp(s)); c.fillStyle = col; c.beginPath(); c.arc(x, ly, 17 * s, 0, TAU); c.fill();
        g.text(pt.y, x, ly - 72, { size: g.V(46, 34), wt: 800, ls: 0.01, col, a: clamp(s) }); g.text(pt.l, x, ly + 62, { size: g.V(17, 15), a: clamp(s) * 0.85, ls: g.V(0.2, 0.06) });
      });
      const hx = Math.min(x0 + tot * prog, 960 + g.V(760, 395)); g.halo(hx, g.GY - 90, 200, 0.14); g.person(hx, g.V(190, 165), { col: g.ac, gl: 1, a: g.in(0, 0.3), act: prog < 1 ? 'walk' : 'cheer', mood: prog < 1 ? '' : 'happy', arms: 1 });
    },
  };

  /* ---------- set pieces: characters that act, lines that draw themselves, things that get hit ---------- */
  const pairs = (s, max) => list(s).map(x => { const i = x.indexOf(':'); return { a: i < 0 ? '' : x.slice(0, i).trim(), b: i < 0 ? x : x.slice(i + 1).trim() }; }).slice(0, max);

  V.tunnel = {
    name: 'Digging toward the goal', hint: 'The character digs through rock toward a prize while a counter ticks up with every hit. Use it two or three times as the thread of the video, and switch on the breakthrough the last time.',
    fields: [F('label', 'Counter label', 'text', 'ATTEMPT'), F('from', 'Counter starts at', 'num', 980), F('to', 'Counter ends at', 'num', 999), F('tag', 'Small label', 'text', 'NOBODY WATCHING'), F('tag2', 'Label that pops on the main line', 'text', 'ALMOST THERE'),
      F('symbol', 'Prize symbol', 'text', '$'), F('crowd', 'People up on the surface (0 to 4)', 'num', 0), F('crowdLabel', 'Label beside them', 'text', ''), F('breakthrough', 'Break through the wall', 'bool', false)],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, GY = g.GY, h = g.V(270, 300), hx = g.V(700, 640), top = GY - g.V(360, 400), wall = hx + h * 0.86, R = g.V(200, 185), rx = wall + R + 30, ry = GY - R - 14, sy = g.V(410, 300), xl = g.V(0, 420) - 60, xr = g.V(1920, 1500) + 60;
      const T = 0.62, hitAt = k => k * T + 0.7 * T; let tb = 1e9;
      if (P.breakthrough) tb = hitAt(Math.max(1, Math.round(((g.hasL2 ? g.T2 + 0.3 : Math.max(1.3, g.d * 0.55)) - 0.7 * T) / T)));
      const tt = Math.min(t, tb), hits = tt >= hitAt(0) ? Math.floor((tt - hitAt(0)) / T + 1e-6) + 1 : 0, total = Math.max(1, Math.floor((Math.min(g.d - 0.25, tb) - hitAt(0)) / T + 1e-6) + 1);
      const since = hits ? t - hitAt(hits - 1) : 9, broke = t >= tb, bp = ramp(t, tb, 0.8), kick = hits && !broke ? Math.exp(-since * 13) : 0, a0 = g.in(0, 0.35), jit = kick * 6;
      if (broke) g.shake(18 * Math.exp(-(t - tb) * 5)); else if (kick > 0.04) g.shake(5 * kick);
      // the surface far above, sliding by, with the odd stone in the earth under it
      c.save(); c.globalAlpha *= a0; c.lineCap = 'round'; c.strokeStyle = rgba(g.fg, 0.75); c.lineWidth = 3; c.beginPath(); c.moveTo(xl, sy); c.lineTo(xr, sy); c.stroke(); c.lineWidth = 2.5;
      for (let k = 0; k < 34; k++) { const x = xl + mod(k * 61.7 - t * 24, xr - xl), hh = 7 + hash(k) * 10; c.beginPath(); c.moveTo(x, sy); c.lineTo(x + 4, sy - hh); c.stroke(); }
      c.strokeStyle = rgba(g.fg, 0.26);
      for (let k = 0; k < 9; k++) { const x = xl + mod(hash(k + 70) * 2000 - t * 24, xr - xl), y = sy + 36 + hash(k + 80) * (top - sy - 72), r = 7 + hash(k + 90) * 12; c.beginPath(); c.ellipse(x, y, r * 1.3, r, hash(k) * 3, 0, TAU); c.stroke(); }
      c.restore();
      const n = clamp(P.crowd | 0, 0, 4), cx = g.V(1480, 1250);
      for (let k = 0; k < n; k++) { const x = cx + (k - (n - 1) / 2) * 74; g.person(x, 104, { y: sy, a: g.in(0.15 + k * 0.08, 0.3) * 0.9, lean: 0.02 * Math.sin(t * 1.6 + k * 2) }); if (broke) g.text('!', x, sy - 130, { size: 30, wt: 800, ls: 0, col: g.ac, a: g.pop(tb + 0.15 + k * 0.07, 0.3) }); }
      if (n && P.crowdLabel) g.tag(P.crowdLabel, cx - n * 37 - 30 - g.tagW(P.crowdLabel, 15) / 2, sy - 50, { size: 15, s: g.pop(0.5), back: 1 });
      // the tunnel: ceiling, then the wall being dug
      const cpts = [[xl, top + 8]]; for (let k = 1; k <= 9; k++) cpts.push([lerp(xl, wall, k / 9.6), top + (hash(k + 20) - 0.5) * 18]);
      const wpts = []; for (let k = 0; k <= 7; k++) wpts.push([wall + 14 + (hash(k + 3) - 0.5) * 30 + (k % 2 ? jit : -jit), lerp(top, GY, k / 7)]);
      if (!broke) g.trace(cpts.concat(wpts), eo(ramp(t, 0, 0.55)), { lw: 4 });
      else { g.trace(cpts, 1, { lw: 4 }); c.save(); c.strokeStyle = g.fg; c.lineWidth = 4; c.lineCap = 'round'; c.globalAlpha *= 1 - bp;
        for (let k = 0; k < 7; k++) { const dx = (90 + hash(k + 5) * 260) * eo(bp), dy = (hash(k + 9) - 0.65) * 240 * eo(bp) + 260 * bp * bp, ro = (hash(k) - 0.5) * 5 * bp, mx = (wpts[k][0] + wpts[k + 1][0]) / 2 + dx, my = (wpts[k][1] + wpts[k + 1][1]) / 2 + dy, hl = (GY - top) / 14; c.beginPath(); c.moveTo(mx - Math.sin(ro) * hl, my - Math.cos(ro) * hl); c.lineTo(mx + Math.sin(ro) * hl, my + Math.cos(ro) * hl); c.stroke(); }
        c.restore(); g.spray(wall, GY - h * 0.5, 26, (t - tb) / 0.9, { r: 430, len: 44, lw: 4, seed: 9 }); }
      c.save(); c.strokeStyle = g.fg; c.lineWidth = 2.5; c.lineCap = 'round';
      for (let k = 0; k < 8; k++) { const span = wall - xl - 40, x = wall - 20 - mod(hash(k + 40) * span + t * (150 + hash(k) * 120), span), y = top + 36 + hash(k + 50) * (GY - top - 72), len = 22 + hash(k + 60) * 34; c.globalAlpha = 0.2 * a0 * clamp((wall - 20 - x) / 140); c.beginPath(); c.moveTo(x, y); c.lineTo(x - len, y); c.stroke(); }
      c.restore();
      // the rock with the prize inside
      const rk = []; for (let k = 0; k < 9; k++) { const an = (k / 9) * TAU + 0.35, rr = R * (0.84 + 0.24 * hash(k + 60)); rk.push([rx + Math.cos(an) * rr + jit * 0.5, ry + Math.sin(an) * rr * 0.9]); } rk.push(rk[0]);
      g.halo(rx, ry, R * 2, (0.26 + 0.07 * Math.sin(t * 3) + 0.2 * kick) * a0);
      if (!broke) {
        g.trace(rk, eo(ramp(t, 0.08, 0.6)), { lw: 4.5 }); const cp = Math.min(1, hits / total);
        [[-0.95, -0.25, -0.5, -0.05, -0.22, -0.3], [-0.9, 0.3, -0.52, 0.2, -0.3, 0.44], [-0.62, -0.6, -0.36, -0.42, -0.3, -0.64]].forEach((s, k) => g.trace([[rx + s[0] * R * 0.84, ry + s[1] * R * 0.8], [rx + s[2] * R, ry + s[3] * R], [rx + s[4] * R, ry + s[5] * R]], clamp(cp * 3 - k), { lw: 3, col: g.ac }));
        g.coin(rx + R * 0.14, ry + Math.sin(t * 2.2) * 6, R * 0.3, P.symbol, t * 2.4, a0);
        for (let k = 0; k < 6; k++) { const an = k * 1.05 + 0.5, d = R * (0.52 + 0.1 * hash(k)); g.coin(rx + R * 0.14 + Math.cos(an) * d, ry + Math.sin(an) * d * 0.8 + Math.sin(t * 2 + k) * 4, R * 0.07, '', t * 1.5 + k, 0.7 * a0); }
      } else {
        const e = eo(bp); c.save(); c.globalAlpha *= 1 - bp; c.translate(rx, ry); c.scale(1 + 0.5 * e, 1 + 0.5 * e); c.translate(-rx, -ry); g.trace(rk, 1, { lw: 4.5 }); c.restore(); g.burst(rx, ry - 30 * e, e, P.symbol);
        for (let k = 0; k < 7; k++) { const p2 = ramp(t, tb + 0.08 + k * 0.07, 0.75); if (p2 > 0) g.coin(lerp(rx, wall - 40 - k * 36, eo(p2)), lerp(ry, GY - 16, p2 * p2) - Math.sin(p2 * Math.PI) * (120 + k * 14), 14, '', t * 5 + k, 1); }
      }
      if (hits && since < 0.36 && !broke) { const ix = wall + 4, iy = GY - h * 0.513; g.spray(ix, iy, 10, since / 0.36, { angle: Math.PI + 0.35, spread: 2.2, r: 130, len: 24, grav: 70, seed: hits * 3 }); g.spray(ix, iy, 5, since / 0.3, { angle: Math.PI, spread: 2.8, r: 80, len: 16, seed: hits * 5 + 1, col: g.ac }); g.halo(ix, iy, 90, 0.5 * (1 - since / 0.36), g.fg); }
      g.halo(hx, GY - h * 0.5, h * 1.1, 0.16 * a0); g.worker(hx, h, { swing: broke ? lerp(0.72, 0.3, eo(ramp(t, tb, 0.5))) : mod(t, T) / T, beam: 0.85 * a0, a: a0, mood: broke ? 'happy' : 'angry', st: broke ? t - tb : t });
      const val = broke ? +P.to : lerp(+P.from, +P.to, Math.min(1, hits / total)), px0 = hx + 30, py = top - g.V(88, 110);
      g.tag((P.label ? P.label + ' ' : '') + fmt(val), px0, py, { size: g.V(25, 27), s: g.pop(0.1, 0.4) * (1 + 0.1 * kick + (broke ? 0.14 * Math.exp(-(t - tb) * 5) : 0)), solid: !broke, fill: broke });
      g.tag(P.tag, px0, py - g.V(64, 70), { size: 15, s: g.pop(0.4), back: 1 });
      g.tag(P.tag2, rx + 10, top - g.V(60, 80), { size: 19, s: g.pop(Math.max(0.5, g.T1 + 0.1)), fill: 1 });
    },
  };

  V.house = {
    name: 'Late at night', hint: 'A house at night with one window still lit, a clock and a counter that keeps ticking. For the work nobody sees.',
    fields: [F('time', 'Clock time', 'text', '4:00'), F('ampm', 'After the time', 'text', 'A.M.'), F('label', 'Counter label', 'text', 'HOURS PUT IN'), F('from', 'Counter starts at', 'num', 996), F('to', 'Counter ends at', 'num', 1000), F('pill', 'Label that pops on line 2', 'text', 'NOBODY ASKED THEM TO')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, GY = g.GY, bw = g.V(540, 500), bh = g.V(310, 330), rf = g.V(150, 160), x = g.V(640, 720), L = x - bw / 2, Rr = x + bw / 2, ty = GY - bh, a0 = g.in(0, 0.3), mx = g.V(1560, 1320), my = g.V(330, 260), skyT = g.V(250, 130);
      c.save(); c.globalAlpha *= g.in(0.1, 0.5); c.fillStyle = g.fg; c.beginPath(); c.arc(mx, my, 58, 0, TAU); c.fill(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1; c.beginPath(); c.arc(mx + 24, my - 14, 52, 0, TAU); c.fill(); c.restore(); g.halo(mx - 10, my, 190, 0.16 * a0, g.fg);
      for (let k = 0; k < 18; k++) { const sx = g.V(70, 440) + hash(k + 1) * g.V(1780, 1040), sy = skyT + hash(k + 30) * (GY - 430 - skyT); if (sx > L - 60 && sx < Rr + 60 && sy > ty - rf - 90) continue; g.sparkle(sx, sy, (5 + hash(k + 50) * 8) * (0.65 + 0.35 * Math.sin(t * 3 + k * 1.7)), 0.55 * g.in(0.1 + k * 0.03, 0.3)); }
      const dr = eo(ramp(t, 0, 0.7)); g.trace([[L, GY], [L, ty], [L - 34, ty], [x, ty - rf], [Rr + 34, ty], [Rr, ty], [Rr, GY]], dr, { lw: 4.5 }); g.trace([[L, ty], [Rr, ty]], eo(ramp(t, 0.35, 0.4)), { lw: 3.5 });
      const chx = x + bw * 0.25, roofY = dx => ty - rf * (1 - dx / (bw / 2 + 34)), cht = ty - rf * 0.86; g.trace([[chx, roofY(bw * 0.25)], [chx, cht], [chx + 44, cht], [chx + 44, roofY(bw * 0.25 + 44)]], eo(ramp(t, 0.5, 0.3)), { lw: 3.5 });
      c.save(); c.strokeStyle = g.fg; c.lineWidth = 3; for (let k = 0; k < 4; k++) { const ph = mod(t * 0.3 + k / 4, 1); c.globalAlpha = (1 - ph) * 0.5 * g.in(0.8, 0.4); c.beginPath(); c.arc(chx + 22 + Math.sin(ph * 5 + k) * 10 + ph * 34, cht - 14 - ph * 150, 8 + ph * 20, 0, TAU); c.stroke(); } c.restore();
      const steps = Math.max(1, Math.min(40, Math.abs((+P.to || 0) - (+P.from || 0)))), t0 = 0.9, sp = Math.max(0.4, g.d - 0.7 - t0) / steps, ticks = clamp(Math.floor((t - t0) / sp) + 1, 0, steps), since = ticks ? t - (t0 + (ticks - 1) * sp) : 9, pulse = Math.exp(-since * 7);
      const ww = g.V(86, 82), wh = g.V(78, 82); let wx = 0, wy = 0;
      [[-1, 0], [0, 0], [1, 0], [-1, 1], [1, 1]].forEach((q, k) => {
        const qx = x + q[0] * bw * 0.31, qy = ty + bh * (q[1] ? 0.68 : 0.27), s = g.pop(0.45 + k * 0.07, 0.35), lit = k === 4; if (s <= 0) return; c.save(); c.translate(qx, qy); c.scale(s, s); c.strokeStyle = g.fg; c.lineWidth = 3.5;
        if (lit) { wx = qx; wy = qy; c.fillStyle = g.ac; c.globalAlpha *= 0.86 + 0.14 * Math.sin(t * 11) * Math.sin(t * 3.7); c.fillRect(-ww / 2, -wh / 2, ww, wh); c.globalAlpha = 1; c.fillStyle = g.bg; c.beginPath(); c.arc(-6, 2, 13, 0, TAU); c.fill(); c.fillRect(-24, 16, 36, wh / 2 - 16); }
        c.strokeRect(-ww / 2, -wh / 2, ww, wh); if (!lit) { c.globalAlpha *= 0.6; c.beginPath(); c.moveTo(0, -wh / 2); c.lineTo(0, wh / 2); c.moveTo(-ww / 2, 0); c.lineTo(ww / 2, 0); c.stroke(); } c.restore();
      });
      g.trace([[x - 38, GY], [x - 38, GY - 132], [x + 38, GY - 132], [x + 38, GY]], eo(ramp(t, 0.5, 0.4)), { lw: 3.5 });
      if (wx) { g.halo(wx, wy, 230 + 60 * pulse, (0.34 + 0.25 * pulse) * g.in(0.75, 0.4)); if (ticks && since < 0.4) g.spray(wx, wy, 9, since / 0.4, { r: 120, len: 20, col: g.ac, seed: ticks }); }
      g.tag(((P.time || '') + ' ' + (P.ampm || '')).trim(), x, ty - rf - 46, { size: g.V(22, 24), s: g.pop(0.35), back: 1 });
      const cx2 = g.V(1290, 1265), val = lerp(+P.from || 0, +P.to || 0, ticks / steps), ny = GY - g.V(330, 340), ca = g.in(0.5, 0.4);
      if (wx) { c.save(); c.globalAlpha *= 0.5 * ca; c.strokeStyle = g.ac; c.lineWidth = 3; c.lineCap = 'round'; c.setLineDash([3, 15]); c.lineDashOffset = -t * 46; c.beginPath(); c.moveTo(wx + ww / 2 + 12, wy - 8); c.quadraticCurveTo((wx + cx2) / 2, ny + 120, cx2 - g.V(150, 110), ny + 78); c.stroke(); c.restore(); }
      g.text(P.label, cx2, ny - g.V(92, 84), { size: 17, a: ca * 0.9 }); g.counter(val, cx2, ny, g.V(124, 100) * (1 + 0.07 * pulse), since < 0.1, ca);
      g.tag(P.pill, cx2, ny + g.V(118, 108), { size: g.V(17, 15), s: g.pop(g.hasL2 ? g.T2 + 0.1 : g.T1 + 0.9), solid: 1 });
    },
  };

  V.report = {
    name: 'Report card', hint: 'A sheet whose rows fill in one by one, then a stamp slams down on line 2. Works for grades, scores, reviews or any verdict.',
    fields: [F('title', 'Title', 'text', 'REPORT CARD'), F('rows', 'Rows, as NAME:MARK', 'text', 'MATH:F, SCIENCE:F, ENGLISH:F, HISTORY:F'), F('stamp', 'Stamp text', 'text', "DOESN'T CARE"), F('person', 'Show the character beside it', 'bool', true), F('reaction', 'How the character takes it', 'select', 'sad', { options: ['sad', 'happy'] })],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, GY = g.GY, rows = pairs(P.rows, 5), n = rows.length, w = g.V(520, 600), h = g.V(600, 690), cx = g.V(1080, 990), sl = g.pop(0, 0.5), cy = GY - 46 - h / 2 + (1 - sl) * 280;
      const tS = g.hasL2 ? g.T2 + 0.15 : Math.max(1.6, g.d * 0.55), span = Math.max(0.6, tS - 0.9), sp = ramp(t, tS, 0.2), hit = t >= tS + 0.2 ? Math.exp(-(t - tS - 0.2) * 8) : 0; if (hit > 0.03) g.shake(13 * hit);
      if (P.person) { const px = g.V(600, 566), ph = g.V(270, 205) * (1 - 0.04 * g.in(tS + 0.2, 0.3)); g.halo(px, GY - ph * 0.5, ph, 0.14); const good = P.reaction === 'happy', aft = t >= tS + 0.2; g.person(px, ph, { col: g.ac, gl: 1, a: g.in(0, 0.3), lean: good ? 0 : 0.05 * g.in(tS + 0.2, 0.3), arms: 1, mood: aft ? (good ? 'happy' : 'sad') : 'worried', act: aft && good ? 'cheer' : '', st: aft ? t - tS - 0.2 : t, look: [0.8, -0.2] }); }
      g.halo(cx, cy, w * 0.9, 0.1 * clamp(sl), g.fg); c.save(); c.translate(cx, cy); c.rotate(-0.025); c.globalAlpha *= clamp(sl * 2);
      c.fillStyle = g.bg; c.strokeStyle = g.fg; c.lineWidth = 4.5; g.rr(-w / 2, -h / 2, w, h, 12); c.fill(); c.stroke();
      g.text(P.title, 0, -h / 2 + 60, { size: g.V(30, 34), wt: 800, ls: 0.14 }); c.lineWidth = 3; c.beginPath(); c.moveTo(-w / 2 + 40, -h / 2 + 102); c.lineTo(w / 2 - 40, -h / 2 + 102); c.stroke();
      const rh = Math.min(104, (h - 280) / Math.max(1, n)), rowsEnd = -h / 2 + 128 + rh * n, ms = Math.min(g.V(44, 50), rh * 0.52);
      rows.forEach((r, i) => {
        const ti = 0.45 + (i * span) / n, a = g.in(ti, 0.25), y = -h / 2 + 128 + rh * (i + 0.5), mxx = w / 2 - 84; if (a <= 0) return;
        g.text(r.a || r.b, -w / 2 + 48 - (1 - a) * 30, y, { size: g.V(25, 29), wt: 700, ls: 0.1, align: 'left', a });
        c.save(); c.globalAlpha *= 0.35 * a; c.setLineDash([3, 10]); c.lineWidth = 3; c.beginPath(); c.moveTo(-w / 2 + 48 + g.V(190, 220), y + 12); c.lineTo(mxx - 56, y + 12); c.stroke(); c.restore();
        if (!r.a) return; const mp = g.pop(ti + 0.15, 0.3); if (mp <= 0) return; c.save(); c.translate(mxx, y); c.scale(mp, mp); g.font(800, ms, 0); c.fillStyle = g.ac; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(r.b).toUpperCase().slice(0, 4), 0, 3); c.restore();
        c.save(); c.strokeStyle = g.ac; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.ellipse(mxx, y, ms + String(r.b).length * 6, Math.min(38, rh * 0.44), -0.12, -1, -1 + TAU * eo(ramp(t, ti + 0.3, 0.35))); c.stroke(); c.restore();
      });
      g.font(800, 100, 0.14); const w100 = c.measureText(String(P.stamp || '').toUpperCase()).width / 100, ss = Math.min(g.V(42, 48), (w * 0.92) / (w100 + 1.7));
      const sty = rowsEnd + (h / 2 - rowsEnd) / 2 - 8; g.stamp(P.stamp, 6, sty, sp, { size: ss, rot: -0.1 }); c.restore();
      if (t >= tS + 0.2) g.spray(cx + 6, cy + sty, 16, (t - tS - 0.2) / 0.5, { r0: 190, r: 240, len: 30, col: g.ac, seed: 4 });
    },
  };

  V.habits = {
    name: 'Proof cards', hint: 'Up to three cards that pop in one at a time, each with a small moving picture, a label and a tick. For habits, reasons or evidence.',
    fields: [F('items', 'Cards, as PICTURE:LABEL. Pictures: streak, log, quit, check, bars, clock, or any icon name', 'text', 'streak:NEVER MISSES A DAY, log:TRACKS EVERYTHING, quit:NEVER QUITS'), F('ticks', 'Tick each card', 'bool', true)],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, GY = g.GY, items = pairs(P.items, 3), n = items.length; if (!n) return;
      const vert = g.vert, span = Math.max(0.9, g.d - 1.7), cw = vert ? 820 : Math.min(430, 1500 / n - 40), ch = vert ? Math.min(270, (GY - 190 - (n - 1) * 28) / n) : 420;
      const mini = (kind, x, y, s, p) => {
        c.save(); c.strokeStyle = g.fg; c.fillStyle = g.ac; c.lineWidth = 3.5; c.lineCap = 'round'; c.lineJoin = 'round';
        if (kind === 'streak') { const cell = s / 7.4, on = Math.floor(p * 21 + 0.001); for (let k = 0; k < 21; k++) { const qx = x + ((k % 7) - 3) * cell * 1.06, qy = y + (Math.floor(k / 7) - 1) * cell * 1.06, r = cell * 0.4 * (k === on - 1 ? 1.25 : 1); g.rr(qx - r, qy - r, r * 2, r * 2, r * 0.35); if (k < on) { c.globalAlpha = 1; c.fill(); } else { c.globalAlpha = 0.45; c.stroke(); } } }
        else if (kind === 'log') { c.globalAlpha = 0.6; c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.36); c.lineTo(x - s * 0.5, y + s * 0.36); c.lineTo(x + s * 0.5, y + s * 0.36); c.stroke(); c.globalAlpha = 1; const pts = [[-0.4, 0.22], [-0.2, 0.08], [-0.02, 0.14], [0.18, -0.08], [0.4, -0.3]].map(q => [x + q[0] * s, y + q[1] * s]); g.trace(pts, p, { col: g.ac, lw: 5 }); pts.forEach((q, k) => { if (p > k / 4) { c.beginPath(); c.arc(q[0], q[1], 6.5, 0, TAU); c.fill(); } }); }
        else if (kind === 'quit') g.tag('QUIT', x, y, { size: s * 0.2, strike: eo(clamp(p * 1.6 - 0.3)) });
        else if (kind === 'bars') [0.35, 0.55, 0.8, 1].forEach((v, k) => { const bh = s * 0.7 * v * eo(clamp(p * 1.6 - k * 0.15)), bx = x + (k - 1.5) * s * 0.24; g.rr(bx - s * 0.085, y + s * 0.36 - Math.max(3, bh), s * 0.17, Math.max(3, bh), 4); if (k === 3) c.fill(); else c.stroke(); });
        else if (kind === 'clock') { c.beginPath(); c.arc(x, y, s * 0.4, 0, TAU); c.stroke(); c.strokeStyle = g.ac; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(t * 3 - 1.57) * s * 0.3, y + Math.sin(t * 3 - 1.57) * s * 0.3); c.moveTo(x, y); c.lineTo(x + Math.cos(t * 0.25 - 1.57) * s * 0.2, y + Math.sin(t * 0.25 - 1.57) * s * 0.2); c.stroke(); }
        else if (ICONS.indexOf(kind) >= 0) g.icon(kind, x, y, s * 0.8 * (0.92 + 0.08 * Math.sin(t * 3)), g.fg, 5);
        else { c.globalAlpha = 0.6; c.beginPath(); c.arc(x, y, s * 0.4, -1.57, -1.57 + TAU * eo(clamp(p * 1.5))); c.stroke(); c.globalAlpha = 1; g.trace([[x - s * 0.2, y], [x - s * 0.04, y + s * 0.16], [x + s * 0.24, y - s * 0.16]], clamp(p * 1.8 - 0.5), { col: g.ac, lw: 8 }); }
        c.restore();
      };
      items.forEach((it, i) => {
        const ti = 0.2 + (i * span) / n, s = g.pop(ti, 0.45); if (s <= 0) return; const x = vert ? 960 : 960 + (i - (n - 1) / 2) * (cw + 40), y = vert ? 170 + ch / 2 + i * (ch + 28) : 628, p = ramp(t, ti + 0.2, 1.1), kind = String(it.a || 'check').toLowerCase();
        g.halo(x, y, cw * 0.6, 0.08 * clamp(s), g.fg); c.save(); c.translate(x, y); c.scale(s, s); c.rotate((1 - Math.min(1, s)) * 0.12 * (i % 2 ? 1 : -1));
        c.fillStyle = g.bg; c.strokeStyle = g.fg; c.lineWidth = 4; g.rr(-cw / 2, -ch / 2, cw, ch, 22); c.fill(); c.stroke();
        const maxW = vert ? cw - ch - 130 : cw - 56; g.font(700, 100, 0.1); const size = Math.min(g.V(23, 30), (maxW / Math.max(1, c.measureText(String(it.b).toUpperCase()).width)) * 100);
        if (vert) { mini(kind, -cw / 2 + ch * 0.55, 0, ch * 0.62, p); g.text(it.b, -cw / 2 + ch + 26, 2, { size, wt: 700, ls: 0.1, align: 'left' }); }
        else { mini(kind, 0, -46, 200, p); g.text(it.b, 0, ch / 2 - 62, { size, wt: 700, ls: 0.1 }); }
        if (P.ticks) { const bp = g.pop(ti + 0.8, 0.35), bx = vert ? cw / 2 - 62 : cw / 2 - 46, by = vert ? 0 : -ch / 2 + 46; if (bp > 0) { c.fillStyle = g.ac; c.beginPath(); c.arc(bx, by, 27 * bp, 0, TAU); c.fill(); g.trace([[bx - 12 * bp, by + 1], [bx - 3 * bp, by + 10 * bp], [bx + 13 * bp, by - 9 * bp]], 1, { col: g.bg, lw: 5.5 }); } }
        c.restore();
      });
    },
  };

  V.equation = {
    name: 'What most people think', hint: 'A small crowd, the thing they see, an equals sign and the verdict they jump to. It can be crossed out on line 2.',
    fields: [F('label', 'Label by the crowd', 'text', 'MOST PEOPLE THINK'), F('people', 'People in the crowd', 'num', 3), F('icon', 'What they see', 'icon', 'doc'), F('mark', 'Mark on it', 'text', 'F'), F('verdict', 'Their verdict', 'text', 'NO DISCIPLINE'), F('strike', 'Cross the verdict out on line 2', 'bool', false)],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, GY = g.GY, n = clamp(P.people | 0, 1, 5), T1 = Math.max(0.9, g.T1 + 0.25), kx = g.V(400, 960), ph = g.V(215, 200), ey = g.V(600, 500), ix = g.V(850, 600), qx = g.V(1035, 770), vx = g.V(1400, 1135);
      g.crowd(kx, n, ph, { a: g.in(0, 0.3), sp: ph * 0.5, pt: g.vert ? 0 : g.in(T1, 0.3) }); g.text(P.label, kx, GY - ph - g.V(46, 40), { size: 16, a: g.in(0.15) * 0.9 });
      const d0 = g.V([kx + 150, GY - ph - 60], [kx - 90, GY - ph - 92]), d1 = [ix - g.V(120, 40), ey + g.V(90, 150)];
      for (let k = 0; k < 3; k++) { const s = g.pop(0.2 + k * 0.1, 0.3); if (s > 0) { c.save(); c.strokeStyle = g.fg; c.lineWidth = 3; c.globalAlpha *= 0.8; c.beginPath(); c.arc(lerp(d0[0], d1[0], k / 2.4), lerp(d0[1], d1[1], k / 2.4) + Math.sin(t * 3 + k) * 3, (8 + k * 5) * s, 0, TAU); c.stroke(); c.restore(); } }
      g.halo(ix, ey, 200, 0.12 * g.in(0.4), g.fg); g.icon(P.icon, ix, ey, 210 * g.pop(0.45), g.fg, 6);
      if (P.mark) { const mp = g.pop(0.75, 0.3), mx = ix + 66, my = ey + 62; if (mp > 0) { c.save(); c.translate(mx, my); c.scale(mp, mp); c.fillStyle = g.bg; c.beginPath(); c.arc(0, 0, 46, 0, TAU); c.fill(); g.font(800, 60, 0); c.fillStyle = g.ac; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(P.mark).toUpperCase().slice(0, 3), 0, 4); c.restore(); c.save(); c.strokeStyle = g.ac; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.arc(mx, my, 46, -1, -1 + TAU * eo(ramp(t, 0.85, 0.35))); c.stroke(); c.restore(); } }
      const ea = g.in(Math.max(0.6, T1 - 0.3), 0.25); c.save(); c.globalAlpha *= ea; c.strokeStyle = g.fg; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(qx - 30 * ea, ey - 15); c.lineTo(qx + 30 * ea, ey - 15); c.moveTo(qx - 30 * ea, ey + 15); c.lineTo(qx + 30 * ea, ey + 15); c.stroke(); c.restore();
      const size = Math.min(g.V(36, 30), (g.V(560, 540) / Math.max(1, g.tagW(P.verdict, 100))) * 100), vs = g.pop(T1, 0.4), st = P.strike && g.hasL2 ? g.in(g.T2 + 0.25, 0.3) : 0; if (vs > 0 && t < T1 + 0.5) g.shake(7 * Math.exp(-(t - T1) * 9));
      g.halo(vx, ey, 300, 0.16 * clamp(vs), g.fg); g.tag(P.verdict, vx, ey, { size, s: vs, solid: 1, strike: st }); if (vs > 0) g.spray(vx, ey, 12, (t - T1) / 0.5, { r0: 170, r: 200, len: 26, seed: 2 });
    },
  };

  V.strings = {
    name: 'Forced or wanted', hint: 'The character hangs from puppet strings under a label. The strings snap on the main line, and what they really want appears on line 2.',
    fields: [F('tag', 'Label on the strings', 'text', 'FORCED'), F('want', 'Label for what they want', 'text', 'TRULY WANTED'), F('icon', 'What they want', 'icon', 'coin'), F('symbol', 'Coin symbol', 'text', '$')],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, GY = g.GY, h = g.V(280, 290), hx = g.V(640, 700), barY = GY - h - g.V(240, 300), ts = Math.max(1.3, g.T1 + 0.9), tw = g.hasL2 ? g.T2 + 0.15 : ts + 0.8, cut = t >= ts, cp = ramp(t, ts, 0.6), a0 = g.in(0, 0.3);
      const sway = cut ? 0 : Math.sin(t * 2.3) * 0.035, lift = cut ? lerp(-28, 0, back(clamp(cp * 1.7))) : -28 + Math.sin(t * 4.6) * 5, px = hx + sway * h * 0.6, by = GY + lift;
      if (cut && t < ts + 0.6) g.shake(9 * Math.exp(-(t - ts) * 8));
      const an = [-96, 0, 96].map(d => [hx + d - sway * 300, barY + d * sway * 1.2]), at = [[px - h * 0.2, by - h * 0.53], [px + sway * h * 0.5, by - h], [px + h * 0.2, by - h * 0.53]], up = cut ? -170 * ei(cp) : 0, fa = cut ? 1 - cp : 1;
      c.save(); c.strokeStyle = g.fg; c.lineCap = 'round'; c.lineWidth = 3; c.globalAlpha *= a0;
      an.forEach((p, k) => { const q = at[k], mxx = lerp(p[0], q[0], 0.5), myy = lerp(p[1], q[1], 0.5);
        if (!cut) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); return; }
        c.globalAlpha = fa * a0; c.beginPath(); c.moveTo(p[0], p[1] + up); c.quadraticCurveTo(p[0] + (k - 1) * 40 * cp, lerp(myy, p[1], cp) + up + 20, lerp(mxx, p[0] + (k - 1) * 60, cp), lerp(myy, p[1] + 30, eo(cp)) + up); c.stroke();
        c.beginPath(); c.moveTo(lerp(mxx, q[0], cp), myy + (q[1] - myy) * cp + 200 * cp * cp); c.lineTo(q[0], q[1] + 200 * cp * cp); c.stroke(); });
      c.globalAlpha = fa * a0; c.lineWidth = 7; c.beginPath(); c.moveTo(an[0][0] - 26, an[0][1] + up); c.lineTo(an[2][0] + 26, an[2][1] + up); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(hx - sway * 300, barY - 28 + up); c.lineTo(hx - sway * 300, barY + up); c.stroke(); c.restore();
      g.tag(P.tag, hx - sway * 300, barY - 58 + up, { size: 21, s: g.pop(0.25), a: fa, back: 1, strike: cut ? eo(clamp(cp * 3)) : 0 });
      if (cut) an.forEach((p, k) => g.spray(lerp(p[0], at[k][0], 0.5), lerp(p[1], at[k][1], 0.5), 6, (t - ts) / 0.4, { r: 90, len: 18, col: k === 1 ? g.ac : g.fg, seed: k * 4 }));
      g.halo(px, GY - h * 0.5, h * 1.05, (0.1 + 0.12 * cp) * a0); g.person(px, h, { col: g.ac, y: by, lean: sway, gl: 1, a: a0, pt: g.in(tw, 0.4), arms: 1, mood: !cut ? 'worried' : t >= tw ? 'happy' : 'shock', st: cut ? (t >= tw ? t - tw : t - ts) : t, look: t >= tw ? [0.8, -0.6] : [0, -0.8] });
      const bx = hx + g.V(480, 410), byy = GY - h - g.V(70, 130), r = g.V(128, 120), bs = g.pop(tw, 0.45);
      [[0.3, 11], [0.56, 18]].forEach((q, k) => { const s = g.pop(tw - 0.2 + k * 0.1, 0.3); if (s > 0) { c.save(); c.strokeStyle = g.fg; c.lineWidth = 3.5; c.beginPath(); c.arc(lerp(px + h * 0.2, bx - r * 0.7, q[0]), lerp(GY - h - 10, byy + r * 0.6, q[0]), q[1] * s, 0, TAU); c.stroke(); c.restore(); } });
      if (bs > 0) {
        g.halo(bx, byy, r * 2.4, 0.4 * clamp(bs)); c.save(); c.translate(bx, byy); c.scale(bs, bs); c.fillStyle = g.bg; c.strokeStyle = g.fg; c.lineWidth = 4.5; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.stroke(); c.restore();
        if (P.icon === 'coin') g.coin(bx, byy + Math.sin(t * 2.4) * 6, r * 0.5 * Math.min(1, bs), P.symbol, t * 2.2); else g.icon(P.icon, bx, byy, r * 1.15 * bs, g.ac, 6);
        for (let k = 0; k < 5; k++) { const a = t * 0.9 + (k * TAU) / 5; g.sparkle(bx + Math.cos(a) * (r + 46), byy + Math.sin(a) * (r + 46) * 0.8, 9 + 4 * Math.sin(t * 5 + k), clamp(bs) * 0.9); }
        g.tag(P.want, bx, byy + r + 56, { size: g.V(23, 22), s: g.pop(tw + 0.35), fill: 1 });
      }
    },
  };

  V.class = {
    name: 'Teacher and student', hint: 'A teacher at a board and the character slumped at a desk, with the label the world sticks on them.',
    fields: [F('board', 'Words on the board', 'text', 'LESSON 12'), F('label', 'Label stuck on the character', 'text', 'LAZY'), F('zzz', 'Show sleeping z z z', 'bool', true)],
    draw(g) {
      const P = g.P, t = g.t, c = g.ctx, GY = g.GY, bx = g.V(650, 800), by = g.V(520, 420), bw = g.V(560, 540), bh = g.V(300, 290), tx = g.V(250, 520), th = g.V(255, 225), sx = g.V(1340, 1180), sh = g.V(235, 225), a0 = g.in(0, 0.3), TL = Math.max(0.8, g.T1 + 0.2);
      g.trace([[bx - bw / 2, by - bh / 2], [bx + bw / 2, by - bh / 2], [bx + bw / 2, by + bh / 2], [bx - bw / 2, by + bh / 2], [bx - bw / 2, by - bh / 2]], eo(ramp(t, 0, 0.7)), { lw: 4.5 });
      g.text(P.board, bx - bw / 2 + 36, by - bh / 2 + 48, { size: 22, wt: 700, align: 'left', a: g.in(0.5) });
      [0, 1, 2].forEach(k => { const pts = []; for (let q = 0; q <= 12; q++) pts.push([bx - bw / 2 + 40 + (q / 12) * (bw - 80) * (k === 2 ? 0.6 : 1), by - bh / 2 + 110 + k * 54 + Math.sin(q * 1.9 + k * 2) * 7]); g.trace(pts, ramp(t, 0.6 + k * 0.45, 0.8), { lw: 3, a: 0.7 }); });
      g.person(tx, th, { a: a0, pt: 0.8 + 0.2 * Math.sin(t * 3.4), lean: 0.012 * Math.sin(t * 3.4), talk: true, arms: 1, mood: 'angry', hat: 'grad' });
      [0, 1, 2].forEach(k => { const ph = mod(t * 1.3 + k / 3, 1); c.save(); c.strokeStyle = g.fg; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha = Math.sin(ph * Math.PI) * 0.6 * a0; c.beginPath(); c.arc(tx + th * 0.16, GY - th * 0.82, 30 + ph * 46, -0.75, -0.05); c.stroke(); c.restore(); });
      const lean = 0.1 + 0.012 * Math.sin(t * 1.5); g.halo(sx, GY - sh * 0.5, sh, 0.14 * a0); g.person(sx, sh, { col: g.ac, a: a0, lean, y: GY - 6, mood: 'sleep', dir: 1 });
      c.save(); c.globalAlpha *= a0; c.fillStyle = g.bg; c.strokeStyle = g.fg; c.lineWidth = 4; g.rr(sx - 150, GY - 132, 320, 18, 5); c.fill(); c.stroke(); c.beginPath(); c.moveTo(sx - 128, GY - 114); c.lineTo(sx - 128, GY - 3); c.moveTo(sx + 148, GY - 114); c.lineTo(sx + 148, GY - 3); c.stroke(); c.restore();
      if (P.zzz) for (let k = 0; k < 3; k++) { const ph = mod(t * 0.45 + k / 3, 1); g.text('Z', sx + 96 + ph * 66, GY - sh - 6 - ph * 120, { size: 20 + ph * 24, wt: 800, ls: 0, a: Math.sin(ph * Math.PI) * 0.9 * a0 }); }
      const ly = GY - sh - g.V(190, 200), ls = g.pop(TL, 0.4); if (ls > 0) { if (t < TL + 0.5) g.shake(6 * Math.exp(-(t - TL) * 9));
        c.save(); c.strokeStyle = g.fg; c.lineWidth = 3.5; c.lineCap = 'round'; c.setLineDash([2, 12]); c.globalAlpha *= clamp(ls); c.beginPath(); c.moveTo(sx - 10, ly + 40); c.quadraticCurveTo(sx - 46, ly + 96, sx + lean * sh * 1.4 - 6, GY - sh - 26); c.stroke(); c.restore();
        g.tag(P.label, sx, ly, { size: g.V(30, 30), s: ls, solid: 1 }); g.spray(sx, ly, 10, (t - TL) / 0.45, { r0: 70, r: 150, len: 22, seed: 6 }); }
    },
  };

  /* ---------- custom animation: a small stage language, so every video can have pictures made just for it ----------
     A scene of type "custom" holds a list of parts. Each part says what it is, where it stands, when it arrives, how it moves.
     Places: x and y run 0 to 100 across and down the stage (y 100 is the ground). Sizes are in units, 1 unit = 1% of the stage height.
     Times: seconds, "40%" of the scene, or "line1" / "line2" / "end", optionally with +0.3 or -0.5. See CUSTOM-ANIMATION.md. */
  const EASE = { linear: p => p, in: ei, out: eo, inout: eio, back };
  const num = (v, d) => (v == null || v === '' || typeof v === 'boolean' || !isFinite(+v) ? d : +v);
  const wnorm = s => String(s || '').toLowerCase().replace(/[^a-z0-9%]/g, '');
  const when = (g, v, def) => {
    if (v == null || v === '') return def; if (typeof v === 'number') return isFinite(v) ? v : def;
    const wm = String(v).trim().match(/^w(?:ord)?\s*:\s*([^\s+]+?)\s*([+-]\s*\d*\.?\d+)?$/i); // "word:guilders+0.2": the moment the voice says that word
    if (wm) { const key = wnorm(wm[1]), W = g.words || [], hit = W.find(x => wnorm(x.w) === key) || W.find(x => wnorm(x.w).indexOf(key) === 0); const off = wm[2] ? parseFloat(wm[2].replace(/\s/g, '')) : 0; return hit ? +hit.t + off : g.T1 + 0.4 + off; } // without timings: a moment after the line starts
    const m = String(v).trim().match(/^(line1|line2|end)?\s*([+-]?\s*\d*\.?\d+)?\s*(%)?$/i); if (!m || (!m[1] && m[2] == null)) return def;
    const n = m[2] != null ? parseFloat(m[2].replace(/\s/g, '')) : 0, b = !m[1] ? 0 : /line1/i.test(m[1]) ? g.T1 : /line2/i.test(m[1]) ? g.T2 : g.d;
    return b + (m[3] ? (n / 100) * g.d : n);
  };
  const colr = (g, v, def) => (v === 'accent' ? g.ac : v === 'fg' || v === 'white' ? g.fg : v === 'bg' ? g.bg : v === 'mute' ? rgba(g.fg, 0.45) : /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v || '') ? v : def);
  const smoothPts = (pts, close) => { // round the corners of a polyline
    const n = pts.length; if (n < 3) return pts; const out = [], mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], P = k => pts[mod(k, n)];
    const a0 = close ? 0 : 1, a1 = close ? n : n - 1; if (!close) out.push(pts[0]);
    for (let i = a0; i < a1; i++) { const s = mid(P(i - 1), P(i)), e = mid(P(i), P(i + 1)), q = P(i); for (let k = 0; k <= 6; k++) { const u = k / 6; out.push([(1 - u) * (1 - u) * s[0] + 2 * (1 - u) * u * q[0] + u * u * e[0], (1 - u) * (1 - u) * s[1] + 2 * (1 - u) * u * q[1] + u * u * e[1]]); } }
    if (close) out.push(out[0]); else out.push(pts[n - 1]); return out;
  };
  /* ---------- photos ---------- */
  const IMG = {};
  function imgFor(g, key) { const src = String((g.assets || {})[key] || key || ''); if (!src || typeof Image === 'undefined') return null; let im = IMG[src]; if (!im) { im = IMG[src] = new Image(); im.decoding = 'sync'; im.src = src; } return im.complete && im.naturalWidth ? im : null; }
  function preload(proj) { // resolves once every photo in the project has loaded (or failed), so the first frames are not empty
    if (typeof Image === 'undefined') return Promise.resolve(); const srcs = Object.values((proj && proj.assets) || {}).map(String);
    const walk = L => (Array.isArray(L) ? L : []).forEach(e => { if (e && /^(photo|image)$/.test(e.is || '') && e.src && !(proj.assets || {})[e.src]) srcs.push(String(e.src)); if (e && e.items) walk(e.items); });
    (proj.scenes || []).forEach(sc => { walk(sc.p && sc.p.items); walk(sc.p && sc.p.cast); });
    return Promise.all(srcs.map(src => new Promise(res => { let im = IMG[src]; if (!im) { im = IMG[src] = new Image(); im.src = src; } if (im.complete && im.naturalWidth) return res(); const done = () => res(); im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true }); setTimeout(done, 8000); })));
  }
  let tmpC = null;
  function drawPhoto(g, e, w, col) { // a real photo: sticker, polaroid, round or plain frame; slow zoom; optional mono or duotone tint
    const c = g.ctx, im = imgFor(g, e.src), fr = String(e.frame || 'sticker'), ar = im ? im.naturalHeight / im.naturalWidth : 0.66, hh = e.h != null ? num(e.h, 30) * (w / num(e.w, 40)) : w * ar, round = fr === 'round';
    const bd = fr === 'none' || round ? 0 : w * 0.035, bot = fr === 'polaroid' ? w * 0.16 : bd, W = w + bd * 2, H = hh + bd + bot, zoom = e.zoom === false ? 1 : 1 + 0.07 * clamp(g.t / Math.max(0.5, g.d));
    c.save(); if (fr !== 'none') { c.shadowColor = 'rgba(0,0,0,0.38)'; c.shadowBlur = w * 0.08; c.shadowOffsetY = w * 0.03; }
    if (round) { c.beginPath(); c.arc(0, 0, w / 2, 0, TAU); c.fillStyle = g.bg; c.fill(); } else if (bd) { c.fillStyle = '#f6f3ec'; g.rr(-W / 2, -H / 2, W, H, w * 0.012); c.fill(); }
    c.restore(); c.save(); c.beginPath(); if (round) c.arc(0, 0, w / 2, 0, TAU); else c.rect(-w / 2, -H / 2 + bd, w, hh); c.clip();
    if (im) { const iw = w * zoom, ih = Math.max(hh, w * ar) * zoom, px = -iw / 2 + num(e.panX, 0) * w * (zoom - 1), py = (round ? 0 : -H / 2 + bd + hh / 2) - ih / 2 + num(e.panY, 0) * hh * (zoom - 1), tint = String(e.tint || 'none');
      if (tint === 'none') c.drawImage(im, px, py, iw, ih);
      else { if (!tmpC) tmpC = document.createElement('canvas'); const tw = Math.max(2, Math.ceil(iw)), th = Math.max(2, Math.ceil(ih)); tmpC.width = tw; tmpC.height = th; const q = tmpC.getContext('2d'); q.filter = 'grayscale(1) contrast(1.15)'; q.drawImage(im, 0, 0, tw, th); q.filter = 'none';
        if (tint === 'duo') { q.globalCompositeOperation = 'color'; q.fillStyle = rgba(col || g.ac, 0.7); q.fillRect(0, 0, tw, th); q.globalCompositeOperation = 'source-over'; } c.drawImage(tmpC, px, py, iw, ih); } }
    else { c.fillStyle = rgba(g.fg, 0.12); c.fillRect(-w / 2, -H / 2, w, H); g.text('PHOTO', 0, -H / 2 + bd + hh / 2, { size: w * 0.08, a: 0.5 }); }
    c.restore();
    if (round) { c.save(); c.strokeStyle = col || g.ac; c.lineWidth = Math.max(3, w * 0.025); c.beginPath(); c.arc(0, 0, w / 2, 0, TAU); c.stroke(); c.restore(); }
    if (fr === 'polaroid' && e.caption) { c.save(); g.font(700, w * 0.065, 0.04); c.fillStyle = '#2a2622'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(e.caption).toUpperCase(), 0, H / 2 - bot / 2); c.restore(); }
    if (fr === 'sticker' || fr === 'polaroid') { c.save(); c.fillStyle = rgba('#f3e7b5', 0.85); c.translate(0, -H / 2); c.rotate(-0.05); c.fillRect(-w * 0.13, -w * 0.035, w * 0.26, w * 0.07); c.restore(); } // a strip of tape
  }
  /* ---------- scenery: places drawn in layers with depth ----------
     Two ways to draw the same place: "tone" (soft shapes in the style's own ink, behind any style) and
     "painted" (full colour illustration with sky, light and shade, used by the Storybook style or look.scenery = 'painted'). */
  const SCENERY = ['city', 'night', 'street', 'office', 'bank', 'lab', 'factory', 'classroom', 'mine', 'market', 'home', 'courtroom', 'stage', 'sea', 'desert', 'ancient', 'castle', 'farm', 'forest', 'hills', 'sky', 'runway', 'space', 'town', 'village', 'port', 'camp', 'tavern', 'hall', 'study'];
  const INDOOR = ['office', 'bank', 'lab', 'factory', 'classroom', 'mine', 'home', 'courtroom', 'stage', 'tavern', 'hall', 'study'];
  // places for stories set before about 1850: modern places swap to their old-world version when look.era is 'past'
  const PAST = { city: 'town', street: 'town', market: 'town', night: 'town', office: 'study', bank: 'study', lab: 'study', classroom: 'study', courtroom: 'hall', stage: 'hall', home: 'tavern', factory: 'village', runway: 'hills' };
  const PAST_WORDS = [['tavern', /\b(taverns?|inns?|pubs?|ale|beer|drinks?)\b/], ['port', /\b(ports?|harbou?rs?|docks?|ships?|fleet|sail\w*|merchants? ships?)\b/], ['camp', /\b(army|armies|soldiers?|troops|camp|war|battle|regiment|siege)\b/], ['hall', /\b(council|parliament|assembly|courts?|judges?|ruled|ruling|decree|law|laws|king|queen|throne|towns? let)\b/], ['study', /\b(historians?|books?|wrote|writer|scholars?|library|letters?|records?|pamphlets?|satire)\b/], ['village', /\b(village|farmers?|peasants?|countryside|harvest)\b/], ['town', /\b(town|square|auctions?|guilds?|streets?|city|market|traders?|bulbs?)\b/]];
  const PAL0 = { sky0: '#9cc6d6', sky1: '#f2e3c2', sun: '#ffe2a0', cloud: '#fbf5e6', far: '#a9bfb4', mid: '#86a38a', near: '#62806a', floor: '#c9a877', floor2: '#b38f5f', wall: '#e7d6b3', wall2: '#d9c49d', trim: '#8a5b3c', dark: '#4a3b2f', light: '#ffd98a', glass: '#bfdbe2', metal: '#9aa3a8', red: '#b9533a', cream: '#f5ecd6', board: '#3e5c4a', leaf: '#6f9a5e' };
  const PALS = {
    city: { far: '#a7b8c4', mid: '#8396a8', near: '#62748b', floor: '#a39c90', floor2: '#8f887d' },
    street: { far: '#a7b8c4', mid: '#c99a74', near: '#a8735a', floor: '#9d978c', floor2: '#86807a' },
    night: { sky0: '#141b36', sky1: '#3d4372', sun: '#f4ecd0', cloud: '#2a3158', far: '#2c3456', mid: '#242a47', near: '#1b2038', floor: '#2a2d40', floor2: '#20232f', light: '#ffd47a', glass: '#ffd47a' },
    office: { wall: '#e9dcc4', wall2: '#dccbad', floor: '#b98b5c', floor2: '#a57a4f', trim: '#7b5d47' },
    bank: { wall: '#ebe4d6', wall2: '#ddd3c0', floor: '#cfc5b1', floor2: '#bdb29c', trim: '#b3a588', metal: '#a9a08c' },
    lab: { wall: '#dfe9e7', wall2: '#cddcd9', floor: '#b7c3c3', floor2: '#a3b1b1', trim: '#6f949b', glass: '#a6d9cf' },
    factory: { wall: '#b46e52', wall2: '#9f5e45', floor: '#8a827a', floor2: '#77706a', trim: '#5a5048', dark: '#3a3531', metal: '#8d9499' },
    classroom: { wall: '#ebdab4', wall2: '#dcc79c', floor: '#b98b5c', floor2: '#a57a4f', trim: '#7b5d47' },
    mine: { wall: '#5c4636', wall2: '#4b392c', far: '#4a382b', mid: '#3c2e24', near: '#2e231c', floor: '#6c5341', floor2: '#5a4436', trim: '#8c6541', light: '#ffc768', dark: '#1f1712' },
    market: { floor: '#cfae7c', floor2: '#bb9866' },
    home: { wall: '#e6cba6', wall2: '#d8b98f', floor: '#a97c56', floor2: '#94694a', trim: '#7b5a40' },
    courtroom: { wall: '#8b5c3d', wall2: '#7a4f33', floor: '#6f4b34', floor2: '#5f3f2b', trim: '#5e3b26', dark: '#3c2618' },
    stage: { wall: '#3a2622', wall2: '#2c1c19', floor: '#6f4b34', floor2: '#5a3c29', red: '#9b3030', dark: '#24170f' },
    sea: { far: '#86b4c2', mid: '#5d97ad', near: '#3f7f98', floor: '#9a7651', floor2: '#86643f' },
    desert: { sky0: '#efc98c', sky1: '#f8e7bf', far: '#e4bb7f', mid: '#d8a562', near: '#c88e4f', floor: '#e1b77b', floor2: '#d2a467' },
    ancient: { wall: '#efe6d2', wall2: '#e0d4b8', floor: '#d9c9a6', floor2: '#c9b691', trim: '#c2ad86' },
    castle: { far: '#9db0a0', mid: '#879d8b', near: '#6d8770', wall: '#a39d92', wall2: '#8e887e' },
    farm: { far: '#a8c09a', mid: '#9fbf6e', near: '#7fa257', floor: '#b89a63', floor2: '#a3854f' },
    forest: { far: '#93ae9a', mid: '#6f9478', near: '#4f7458', floor: '#7d8f55', floor2: '#6c7c47' },
    town: { sky0: '#bcd6d9', sky1: '#efe8d6', far: '#b9c3be', mid: '#9fb0a8', near: '#7d8f86', floor: '#cbbd9f', floor2: '#b6a686', wall: '#dcc9a3', wall2: '#c9b48c', trim: '#6e4f38', red: '#ad5b42', dark: '#3f3a37', cream: '#f0e8d4', glass: '#5f7276', light: '#f3d58f' },
    village: { sky0: '#c3dcd6', sky1: '#f0ead6', far: '#b9c9b4', mid: '#98b28c', near: '#77946d', floor: '#c4b68e', floor2: '#ae9f77', wall: '#ece0c4', trim: '#5e4433', light: '#d6b062', leaf: '#86a66a', glass: '#5f7276' },
    port: { sky0: '#b9d8de', sky1: '#f1ead8', far: '#a9c4c8', mid: '#86adb5', near: '#5f8e9b', floor: '#a88a62', floor2: '#94764f', trim: '#5d4330', cream: '#f1e9d4', dark: '#3d2f26', red: '#a84b3a' },
    camp: { sky0: '#c6dad6', sky1: '#efe9d8', far: '#b5c3b0', mid: '#93a98a', near: '#6f8a68', floor: '#c2b690', floor2: '#ac9f78', cream: '#ece2c8', wall2: '#d3c6a6', trim: '#6b5038', red: '#a8463a', dark: '#3f3529', light: '#f2c45a', cloud: '#e9e4da' },
    tavern: { wall: '#dcc8a2', wall2: '#cdb68c', floor: '#8a6646', floor2: '#77573b', trim: '#5a3f2c', dark: '#2f241c', light: '#ffcf7a', red: '#b4533a', metal: '#9a8f80', glass: '#a9bfb4' },
    hall: { wall: '#d3cab7', wall2: '#c1b7a2', floor: '#aba18e', floor2: '#978d79', trim: '#6d6252', dark: '#3e3830', red: '#a33f33', light: '#f4e6c0', glass: '#dfe9e6' },
    study: { wall: '#93725a', wall2: '#836349', floor: '#6f5238', floor2: '#5f4530', trim: '#4e3826', dark: '#2b2018', light: '#ffd27a', cream: '#efe2c4', red: '#9b4a32', board: '#56705a', glass: '#b9cdc8' },
    space: { sky0: '#0e1330', sky1: '#2b2e5e', far: '#3b3f74', mid: '#55597f', near: '#7b7fa3', floor: '#6d6f8a', floor2: '#5b5d76' },
  };
  // tone mode: how strong each part is, in the style's ink (or accent when the second value is 1)
  const TONE = { sky0: [0], sky1: [0], sun: [0.45, 1], cloud: [0.05], far: [0.045], mid: [0.075], near: [0.1], floor: [0.05], floor2: [0.07], wall: [0.03], wall2: [0.055], trim: [0.12], dark: [0.14], light: [0.28, 1], glass: [0.1, 1], metal: [0.1], red: [0.16, 1], cream: [0.07], board: [0.1], leaf: [0.09] };
  const SCENE_WORDS = [
    ['mine', /\b(dig|digs|digging|dug|mine|mines|mining|miners?|gold|tunnel|underground|coal)\b/],
    ['courtroom', /\b(court|courts|judge|lawsuit|sued|sue|trial|jury|lawyers?|illegal|fraud|guilty|scandal|cheat|cheated|cheating|banned|regulators?|fined|investigation)\b/],
    ['bank', /\b(bank|banks|vault|loans?|interest|savings|deposits?|debt|reserve)\b/],
    ['lab', /\b(lab|labs|science|scientists?|research|experiments?|chips?|ai|drugs?|medicine|vaccine|engineers?|invent\w*|patent)\b/],
    ['factory', /\b(factory|factories|plants?|manufactur\w*|produce|production|assembly|steel|workers)\b/],
    ['classroom', /\b(school|class|students?|teachers?|learn|learned|college|university|exam|homework|lesson)\b/],
    ['market', /\b(shops?|stores?|sell|sold|selling|market|customers?|prices?|buy|bought|retail)\b/],
    ['sea', /\b(ships?|ocean|sea|sail\w*|ports?|navy|island|boats?)\b/],
    ['desert', /\b(desert|egypt\w*|pharaohs?|pyramids?|sahara|oil)\b/],
    ['ancient', /\b(ancient|rome|roman|greek|greece|empire|emperor|senate|temple)\b/],
    ['castle', /\b(kings?|queens?|castles?|knights?|medieval|war|battle|army|kingdom)\b/],
    ['farm', /\b(farms?|farmers?|crops?|harvest|grain|wheat|cattle)\b/],
    ['home', /\b(home|house|family|kids|parents|rent|mortgage|sofa|bed|bedroom|garage)\b/],
    ['stage', /\b(stage|concert|famous|fans|audience|spotlight|keynote|launch(ed)?|announced|unveil\w*)\b/],
    ['runway', /\b(planes?|flights?|airport|airlines?|jets?|pilots?|fly|flew|windows)\b/],
    ['space', /\b(space|rockets?|moon|mars|nasa|satellites?|orbit)\b/],
    ['forest', /\b(forest|trees|woods|nature|camp\w*)\b/],
    ['night', /\b(night|midnight|sleep|asleep|dark)\b/],
    ['office', /\b(ceo|company|companies|boss|office|meetings?|jobs?|startup|business|invest\w*|stocks?|shares|boards?|money|million|billion|fortune|rich)\b/],
    ['city', /\b(city|cities|town|streets?|downtown|york|london|tokyo|paris)\b/],
  ];
  const ACT_PLACE = { dig: 'mine', run: 'street', walk: 'street' };
  const autoMemo = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function hasPerson(L) { return (Array.isArray(L) ? L : []).some(e => e && (/^(person|crowd)$/.test(e.is || '') || hasPerson(e.items))); }
  function textOf(sc) { return [sc.kicker].concat((sc.lines || []).map(l => l && l.text)).join(' ').replace(/\*/g, '').toLowerCase(); }
  function placeFor(s) { for (const [k, re] of SCENE_WORDS) if (re.test(s)) return k; return null; }
  function actsIn(L, out) { (Array.isArray(L) ? L : []).forEach(e => { if (!e) return; if (e.act) out.push(e.act); (e.then || []).forEach(s => s && s.act && out.push(s.act)); actsIn(e.items, out); }); return out; }
  function autoScenery(proj, sc, hasPeople) { // a place that fits what the scene says and what its people do
    const lk = proj.look || {}; if (lk.scenery === 'off' || !hasPeople) return null;
    if (autoMemo && autoMemo.has(sc)) return autoMemo.get(sc);
    const acts = actsIn((sc.p && (sc.p.items || sc.p.cast)) || [], []); let k = null; for (const a of acts) if (ACT_PLACE[a] === 'mine') k = 'mine';
    if (!k && lk.era === 'past') { const tx = textOf(sc); for (const [kk, re] of PAST_WORDS) if (re.test(tx)) { k = kk; break; } }
    k = k || placeFor(textOf(sc)); if (!k) for (const a of acts) if (ACT_PLACE[a]) { k = ACT_PLACE[a]; break; }
    if (!k) { const i = (proj.scenes || []).indexOf(sc); for (let j = i - 1; j >= 0 && !k; j--) k = placeFor(textOf(proj.scenes[j])); }
    k = k || placeFor(String(proj.title || '').toLowerCase() + ' ' + String(proj.idea || '').toLowerCase()) || 'city';
    if (lk.era === 'past' && PAST[k]) k = PAST[k];
    if (autoMemo) autoMemo.set(sc, k); return k;
  }

  function drawScenery(g, kind, o) {
    o = o || {}; kind = String(kind || '').toLowerCase(); if (g.era === 'past' && PAST[kind]) kind = PAST[kind]; if (SCENERY.indexOf(kind) < 0) return;
    const paint = o.paint != null ? !!o.paint : !!g.paint, c = g.ctx, GY = g.GY - (paint ? g.horizon : 0), t = g.t, d = Math.max(0.5, g.d), drift = (t / d - 0.5) * (paint ? 1.4 : 1), fg = g.fg, ac = g.ac;
    const x0 = -340, x1 = 2260, top = -720, bot = GY + 1100, indoor = INDOOR.indexOf(kind) >= 0, str = num(o.strength, 1);
    const pal = Object.assign({}, PAL0, PALS[kind] || {});
    const C = (r, a) => { a = a == null ? 1 : a; if (paint) return rgba(pal[r] || pal.trim, a); const tn = TONE[r] || [0.08]; return rgba(tn[1] ? ac : fg, tn[0] * a * str); };
    const layer = (depth, blur, fn) => { c.save(); c.translate(drift * -90 * depth, 0); if (blur && (!paint || g.dof) && 'filter' in c) c.filter = 'blur(' + (paint ? blur * 1.4 * Math.abs(c.getTransform().a || 1) : blur).toFixed(1) + 'px)'; fn(); c.restore(); };
    const R = (r, x, y, w, h, a) => { c.fillStyle = C(r, a); c.fillRect(x, y, w, h); };
    const E = (r, x, y, rx, ry, a) => { c.fillStyle = C(r, a); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
    const Poly = (r, pts, a) => { c.fillStyle = C(r, a); c.beginPath(); pts.forEach((p, k) => (k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill(); };
    const shade = (x, y, w, h, side) => { if (!paint) return; c.fillStyle = 'rgba(20,12,6,0.14)'; c.fillRect(side > 0 ? x + w * 0.68 : x, y, w * 0.32, h); }; // flat light from the upper left
    const rim = (x, y, w) => { if (!paint) return; c.fillStyle = 'rgba(255,248,230,0.35)'; c.fillRect(x, y, w, 5); };
    const glowAt = (x, y, r, a) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, paint ? rgba(pal.light, 0.55 * a) : rgba(ac, 0.16 * a)); gr.addColorStop(1, rgba(paint ? pal.light : ac, 0)); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); };

    // sky or back wall
    if (paint) { if (indoor) { const gw = c.createLinearGradient(0, top, 0, GY); gw.addColorStop(0, pal.wall2); gw.addColorStop(1, pal.wall); c.fillStyle = gw; c.fillRect(x0, top, x1 - x0, GY - top); }
      else { const gs = c.createLinearGradient(0, g.V(0, -300), 0, GY); gs.addColorStop(0, pal.sky0); gs.addColorStop(1, pal.sky1); c.fillStyle = gs; c.fillRect(x0, top, x1 - x0, GY - top); } }
    // floor: a plane below the ground line with lines that recede, so the bottom of a tall frame is never empty
    c.save(); if (paint) { const gf = c.createLinearGradient(0, GY, 0, GY + 700); gf.addColorStop(0, pal.floor); gf.addColorStop(1, pal.floor2); c.fillStyle = gf; c.fillRect(x0, GY, x1 - x0, bot - GY); }
    else { const fl = c.createLinearGradient(0, GY, 0, GY + 600); fl.addColorStop(0, rgba(fg, 0.07 * str)); fl.addColorStop(1, rgba(fg, 0)); c.fillStyle = fl; c.fillRect(x0, GY, x1 - x0, 600); }
    c.strokeStyle = paint ? 'rgba(20,12,6,0.12)' : rgba(fg, 0.06 * str); c.lineWidth = 2; for (let k = 1; k < 7; k++) { const y = GY + Math.pow(k / 7, 1.7) * 640; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
    if (indoor || kind === 'street' || kind === 'market' || kind === 'ancient') for (let k = -8; k <= 8; k++) { c.beginPath(); c.moveTo(960 + k * 120, GY); c.lineTo(960 + k * 420, GY + 700); c.stroke(); }
    if (paint) { c.fillStyle = 'rgba(20,12,6,0.18)'; c.fillRect(x0, GY, x1 - x0, 6); } c.restore();

    const sunOn = !indoor && o.sun !== false && (o.sun || /^(hills|runway|desert|farm|ancient|sea|castle)$/.test(kind));
    const sun = (moon) => { const sx = g.V(1420, 1280) - drift * 30, sy = g.V(250, 120) + (GY - g.V(250, 120)) * 0.2; if (paint) { glowAt(sx, sy, 300, 0.7); E(moon ? 'sun' : 'sun', sx, sy, 66, 66); if (moon) E('sky1', sx + 22, sy - 12, 58, 58, 0.9); } else { g.halo(sx, sy, 260, 0.35, ac); E('sun', sx, sy, 62, 62); } };
    const clouds = (depth, a, n, y0) => layer(depth, depth < 0.4 ? 3 : 0, () => { for (let k = 0; k < n; k++) { const cx = mod(hash(k * 3 + depth * 10) * 2600 + t * 14 * depth, 2600) - 340, cy = y0 + hash(k * 5 + 1) * 160, w = 150 + hash(k + 9) * 160; c.fillStyle = C('cloud', a); c.beginPath(); c.ellipse(cx, cy, w, w * 0.22, 0, 0, TAU); c.ellipse(cx - w * 0.35, cy + 6, w * 0.45, w * 0.17, 0, 0, TAU); c.ellipse(cx + w * 0.2, cy - w * 0.12, w * 0.4, w * 0.2, 0, 0, TAU); c.fill(); if (paint) { c.fillStyle = 'rgba(80,60,40,0.08)'; c.fillRect(cx - w * 0.9, cy + w * 0.08, w * 1.6, 6); } } });
    const ridge = (depth, r, amp, base, ph, a) => layer(depth, depth < 0.4 ? 2.5 : 0, () => { c.fillStyle = C(r, a); c.beginPath(); c.moveTo(x0, GY + 2); for (let x = x0; x <= x1; x += 30) c.lineTo(x, GY - base - amp * (0.5 + 0.5 * Math.sin(x / 260 + ph) * Math.cos(x / 610 + ph * 2))); c.lineTo(x1, GY + 2); c.closePath(); c.fill(); if (paint) { c.strokeStyle = 'rgba(255,248,230,0.25)'; c.lineWidth = 4; c.beginPath(); for (let x = x0; x <= x1; x += 30) c.lineTo(x, GY - base - amp * (0.5 + 0.5 * Math.sin(x / 260 + ph) * Math.cos(x / 610 + ph * 2)) + 3); c.stroke(); } });
    const skyline = (depth, r, hMin, hMax, wMin, seed, lit, a) => layer(depth, depth < 0.4 ? 3 : 0, () => { let x = x0; for (let k = 0; x < x1; k++) { const w = wMin + hash(seed + k) * wMin, hgt = hMin + hash(seed + k * 1.7) * (hMax - hMin); R(r, x, GY - hgt, w - 8, hgt, a); shade(x, GY - hgt, w - 8, hgt, 1); rim(x, GY - hgt, w - 8);
      if (hash(seed + k * 2.3) > 0.7) R(r, x + w * 0.4, GY - hgt - 40, 6, 40, a);
      if (lit) for (let yy = GY - hgt + 26; yy < GY - 30; yy += 40) for (let xx = x + 16; xx < x + w - 30; xx += 30) { const on = hash(seed + xx * 0.13 + yy * 0.07) > (kind === 'night' ? 0.45 : 0.62); if (!on) continue; const tw = Math.sin(t * 0.7 + xx + yy) > -0.9 ? 1 : 0.25; c.fillStyle = paint ? rgba(kind === 'night' ? pal.light : pal.glass, 0.85 * tw) : rgba(ac, 0.22 * tw); c.fillRect(xx, yy, 12, 16); }
      x += w; } });
    const win = (x, y, w, h, view) => { R('trim', x - 10, y - 10, w + 20, h + 20); if (paint) { const gw = c.createLinearGradient(0, y, 0, y + h); gw.addColorStop(0, pal.sky0 || '#9cc6d6'); gw.addColorStop(1, '#eaf2ee'); c.fillStyle = gw; c.fillRect(x, y, w, h); } else R('glass', x, y, w, h);
      if (view) { c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); for (let k = 0; k < 6; k++) { const bw = w / 5, bh = h * (0.3 + hash(k + x) * 0.5); R('far', x + k * bw - 10, y + h - bh, bw - 6, bh, paint ? 1 : 2); } c.restore(); }
      R('trim', x + w / 2 - 4, y, 8, h); R('trim', x, y + h / 2 - 4, w, 8); if (paint) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(x + w * 0.1, y + h); c.lineTo(x + w * 0.45, y); c.lineTo(x + w * 0.6, y); c.lineTo(x + w * 0.25, y + h); c.closePath(); c.fill(); } };
    const shelf = (x, y, w, rows, seed) => { R('trim', x, y, w, rows * 90 + 16); R('dark', x + 10, y + 8, w - 20, rows * 90, paint ? 0.35 : 0.5); for (let r = 0; r < rows; r++) { let bx = x + 16; for (let k = 0; bx < x + w - 30; k++) { const bw = 16 + hash(seed + r * 9 + k) * 18, bh = 50 + hash(seed + k * 3 + r) * 30; R(['red', 'board', 'cream', 'metal', 'light'][Math.floor(hash(seed + k + r * 5) * 5)], bx, y + 8 + r * 90 + 90 - bh, bw - 3, bh, 0.9); bx += bw; } R('trim', x, y + 8 + (r + 1) * 90 - 6, w, 10); } };
    const plant = (x) => { R('red', x - 34, GY - 90, 68, 90); shade(x - 34, GY - 90, 68, 90, 1); for (let k = 0; k < 7; k++) { const an = -Math.PI / 2 + (k - 3) * 0.32 + Math.sin(t * 1.2 + k) * 0.03; c.save(); c.translate(x, GY - 86); c.rotate(an + Math.PI / 2); E('leaf', 0, -80, 18, 80); c.restore(); } };
    const columns = (n, xa, xb, y, h, r) => { for (let k = 0; k < n; k++) { const cx = xa + (k * (xb - xa)) / (n - 1); R(r, cx - 32, y, 64, h); R(r, cx - 46, y - 24, 92, 26); R(r, cx - 46, y + h - 4, 92, 22); if (paint) { c.fillStyle = 'rgba(20,12,6,0.1)'; for (let f = -2; f <= 2; f++) c.fillRect(cx + f * 12 - 2, y + 6, 4, h - 12); } shade(cx - 32, y, 64, h, 1); } };

    if (!indoor && kind !== 'space') { if (kind === 'night') { if (paint) for (let k = 0; k < 60; k++) { c.fillStyle = 'rgba(255,250,230,' + (0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + k))) + ')'; c.fillRect(hash(k + 3) * 2600 - 340, -500 + hash(k + 8) * 1100, 3, 3); } sun(true); } else if (sunOn) sun(false); }

    switch (kind) {
      case 'sky': clouds(0.25, 1, 7, g.V(80, -260)); clouds(0.6, 1, 5, g.V(320, 120)); ridge(0.15, 'far', 60, 10, 2.2); break;
      case 'hills': clouds(0.3, 1, 5, g.V(100, -200)); ridge(0.2, 'far', 160, 140, 1.3); ridge(0.5, 'mid', 90, 40, 4.1); ridge(0.8, 'near', 40, -10, 0.4); break;
      case 'runway': clouds(0.25, 1, 6, g.V(60, -240)); ridge(0.2, 'far', 120, 60, 1.3); layer(0.45, 0, () => { R('metal', 1700, GY - 340, 40, 340); R('glass', 1660, GY - 400, 120, 70); R('trim', 1650, GY - 410, 140, 14); });
        layer(0.9, 0, () => { c.save(); c.strokeStyle = C('cream', paint ? 0.9 : 2.5); c.lineWidth = 6; c.setLineDash([60, 50]); c.lineDashOffset = -t * 120; c.beginPath(); c.moveTo(x0, GY + 40); c.lineTo(x1, GY + 40); c.stroke(); c.restore(); for (let k = 0; k < 14; k++) { c.fillStyle = paint ? rgba(pal.light, 0.5 + 0.5 * Math.sin(t * 4 - k * 0.6)) : rgba(ac, 0.35 + 0.35 * Math.sin(t * 4 - k * 0.6)); c.beginPath(); c.arc(x0 + k * 180, GY + 8, 6, 0, TAU); c.fill(); } }); break;
      case 'city': case 'night': clouds(0.2, 0.8, 4, g.V(60, -220)); skyline(0.2, 'far', 220, 520, 110, 11, kind === 'night'); skyline(0.55, 'mid', 120, 360, 130, 37, true); if (kind === 'night') layer(0.9, 0, () => { for (let k = 0; k < 9; k++) { const lx = x0 + 140 + k * 300; R('dark', lx, GY - 230, 8, 230); E('light', lx + 4, GY - 236, 16, 10); glowAt(lx + 4, GY - 220, 140, 0.8); } }); break;
      case 'street': clouds(0.2, 1, 4, g.V(60, -220)); skyline(0.2, 'far', 260, 520, 120, 11, false);
        layer(0.6, 0, () => { let x = x0; for (let k = 0; x < x1; k++) { const w = 220 + hash(k + 5) * 120, h = 330 + hash(k + 2) * 160, r = k % 2 ? 'mid' : 'near'; R(r, x, GY - h, w - 6, h); shade(x, GY - h, w - 6, h, 1); rim(x, GY - h, w - 6); for (let yy = GY - h + 30; yy < GY - 170; yy += 80) for (let xx = x + 24; xx < x + w - 60; xx += 64) R('glass', xx, yy, 34, 48, paint ? 0.9 : 1);
          R('dark', x + 20, GY - 140, w - 46, 140, paint ? 0.5 : 0.6); for (let s = 0; s < 6; s++) R(s % 2 ? 'cream' : 'red', x + 10 + s * (w - 26) / 6, GY - 168, (w - 26) / 6, 34); x += w; } });
        layer(0.95, 0, () => { for (let k = 0; k < 7; k++) { const lx = x0 + 200 + k * 380; R('dark', lx, GY - 260, 10, 260); R('dark', lx, GY - 260, 50, 8); E('light', lx + 48, GY - 248, 14, 9); } }); break;
      case 'office': layer(0.35, 0, () => { R('wall2', x0, GY - 130, x1 - x0, 130); R('trim', x0, GY - 136, x1 - x0, 10); for (let k = 0; k < 3; k++) win(300 + k * 560, g.V(170, -40), 420, Math.min(440, GY - g.V(170, -40) - 300), true);
          shelf(g.V(40, 430), GY - 420, 200, 4, 3); plant(g.V(1840, 1440)); const cx = g.V(960, 1400), cy = g.V(110, 600); E('cream', cx, cy, 46, 46); c.strokeStyle = C('dark'); c.lineWidth = 5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(t * 0.5 - 1.5) * 30, cy + Math.sin(t * 0.5 - 1.5) * 30); c.moveTo(cx, cy); c.lineTo(cx + 18, cy); c.stroke(); }); break;
      case 'bank': layer(0.35, 0, () => { R('wall2', x0, GY - 120, x1 - x0, 120); const vx = 960, vy = GY - 330; E('metal', vx, vy, 230, 230); E('trim', vx, vy, 190, 190); E('metal', vx, vy, 170, 170); c.save(); c.translate(vx, vy); c.rotate(t * 0.25); c.strokeStyle = C('dark', 0.8); c.lineWidth = 14; for (let k = 0; k < 6; k++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 120); c.stroke(); } c.restore(); E('dark', vx, vy, 34, 34, 0.9); shade(vx - 230, vy - 230, 460, 460, 1);
          columns(4, g.V(120, 470), g.V(1800, 1450), g.V(150, -60), GY - g.V(150, -60) - 30, 'cream'); for (let k = -12; k < 12; k++) for (let j = 0; j < 4; j++) if ((k + j) % 2) Poly('floor2', [[960 + k * 120 + j * k * 25, GY + j * 70], [960 + (k + 1) * 120 + j * (k + 1) * 25, GY + j * 70], [960 + (k + 1) * 120 + (j + 1) * (k + 1) * 25, GY + (j + 1) * 70], [960 + k * 120 + (j + 1) * k * 25, GY + (j + 1) * 70]], paint ? 0.7 : 0.8); }); break;
      case 'lab': layer(0.35, 0, () => { c.strokeStyle = paint ? 'rgba(20,40,40,0.08)' : rgba(fg, 0.04 * str); c.lineWidth = 2; for (let y = GY; y > top; y -= 70) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); } for (let x = x0; x < x1; x += 70) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, GY); c.stroke(); }
          R('trim', x0, GY - 300, x1 - x0, 16); [g.V(140, 450), g.V(1500, 1180)].forEach((sx, s) => { for (let k = 0; k < 6; k++) { const fx = sx + k * 48, fh = 50 + hash(k + s * 7) * 40; R('glass', fx, GY - 300 - fh, 32, fh, 0.9); R(['red', 'light', 'leaf'][k % 3], fx + 3, GY - 300 - fh * 0.5, 26, fh * 0.5 - 3, 0.9); } });
          const mx = 960 - 300, my = g.V(160, -80), mw = 600, mh = 300; R('dark', mx - 14, my - 14, mw + 28, mh + 28); R('board', mx, my, mw, mh, paint ? 0.95 : 1); c.strokeStyle = paint ? rgba(pal.light, 0.9) : rgba(ac, 0.3); c.lineWidth = 6; c.beginPath(); for (let k = 0; k <= 20; k++) { const px = mx + 30 + k * (mw - 60) / 20, py = my + mh - 50 - (mh - 110) * (0.5 + 0.45 * Math.sin(k * 0.7 + t * 1.5) * Math.exp(-k * 0.02)); k ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }); break;
      case 'factory': layer(0.35, 0, () => { c.strokeStyle = paint ? 'rgba(60,20,10,0.22)' : rgba(fg, 0.05 * str); c.lineWidth = 3; for (let y = GY, r = 0; y > top; y -= 44, r++) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); for (let x = x0 + (r % 2) * 60; x < x1; x += 120) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 44); c.stroke(); } }
          for (let k = 0; k < 4; k++) win(240 + k * 430, g.V(120, -60), 300, 260, false); layer(0.1, 0, () => { for (let k = 0; k < 3; k++) { const sx = 520 + k * 430; c.save(); c.beginPath(); c.rect(240 + k * 430, g.V(120, -60), 300, 260); c.clip(); R('dark', sx - 30, g.V(180, 0), 60, 260, 0.7); for (let p = 0; p < 4; p++) { const pt = mod(t * 0.3 + p * 0.25, 1); E('cloud', sx + pt * 60, g.V(180, 0) - pt * 120, 30 + pt * 40, 22 + pt * 30, (1 - pt) * 0.9); } c.restore(); } });
          [[g.V(260, 520), GY - 520, 90], [g.V(1660, 1400), GY - 470, 70]].forEach(([gx, gy, r], k) => { c.save(); c.translate(gx, gy); c.rotate(t * (k ? -0.8 : 0.6)); c.fillStyle = C('metal'); c.beginPath(); for (let q = 0; q < 24; q++) { const rr = q % 2 ? r : r * 1.22, an = (q / 24) * TAU; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath(); c.fill(); E('dark', 0, 0, r * 0.35, r * 0.35, 0.8); c.restore(); });
          R('dark', x0, GY - 150, x1 - x0, 26); R('metal', x0, GY - 124, x1 - x0, 10); for (let k = 0; k < 9; k++) { const bx = mod(k * 300 + t * 90, 2600) - 340; R('cream', bx, GY - 230, 80, 80); shade(bx, GY - 230, 80, 80, 1); R('trim', bx + 30, GY - 230, 20, 80, 0.5); } R('metal', x0, GY - 90, x1 - x0, 12); }); break;
      case 'classroom': layer(0.35, 0, () => { R('wall2', x0, GY - 120, x1 - x0, 120); R('trim', x0, GY - 126, x1 - x0, 10); const bx = 960 - g.V(420, 330), by = g.V(140, -40), bw = g.V(840, 660), bh = 360; R('trim', bx - 18, by - 18, bw + 36, bh + 46); R('board', bx, by, bw, bh); c.strokeStyle = paint ? 'rgba(245,240,225,0.7)' : rgba(fg, 0.14 * str); c.lineWidth = 4; for (let k = 0; k < 4; k++) { c.beginPath(); for (let x = 0; x < bw * (0.4 + hash(k) * 0.4); x += 14) c.lineTo(bx + 40 + x, by + 60 + k * 70 + Math.sin(x * 0.25 + k) * 6); c.stroke(); }
          R('cream', bx + bw - 120, by + bh + 4, 50, 12); shelf(g.V(60, 440), GY - 330, 200, 3, 9); plant(g.V(1820, 1440)); }); break;
      case 'mine': c.save(); const gm = c.createLinearGradient(0, top, 0, GY); if (paint) { gm.addColorStop(0, pal.dark); gm.addColorStop(1, pal.wall); c.fillStyle = gm; c.fillRect(x0, top, x1 - x0, GY - top); } c.restore();
        layer(0.3, 0, () => { for (let k = 0; k < 70; k++) { const rx = hash(k + 1) * 2600 - 340, ry = -500 + hash(k + 4) * (GY + 400), rr = 16 + hash(k + 9) * 40; E(k % 3 ? 'mid' : 'far', rx, ry, rr, rr * 0.7, 0.9); } c.fillStyle = C('dark', paint ? 0.92 : 1); c.beginPath(); c.moveTo(960 - 230, GY); c.lineTo(960 - 230, GY - 300); c.arc(960, GY - 300, 230, Math.PI, 0); c.lineTo(960 + 230, GY); c.closePath(); c.fill(); });
        layer(0.6, 0, () => { for (let k = 0; k < 6; k++) { const fx = x0 + 120 + k * 480; R('trim', fx, GY - 560, 40, 560); R('trim', fx + 300, GY - 560, 40, 560); R('trim', fx - 20, GY - 590, 380, 40); shade(fx, GY - 560, 40, 560, 1); const lx = fx + 170, ly = GY - 530 + Math.sin(t * 2 + k) * 4; R('dark', lx - 2, GY - 550, 4, 20); R('light', lx - 14, ly, 28, 34); glowAt(lx, ly + 17, 220, 0.75 + 0.25 * Math.sin(t * 9 + k * 3)); } });
        c.save(); c.strokeStyle = C('metal', paint ? 0.9 : 1.5); c.lineWidth = 8; [-1, 1].forEach(s => { c.beginPath(); c.moveTo(960 + s * 60, GY); c.lineTo(960 + s * 420, bot); c.stroke(); }); c.lineWidth = 12; c.strokeStyle = C('trim', 0.9); for (let k = 0; k < 8; k++) { const f = Math.pow(k / 8, 1.6), y = GY + 20 + f * 680, w = 80 + f * 420; c.beginPath(); c.moveTo(960 - w, y); c.lineTo(960 + w, y); c.stroke(); } c.restore(); break;
      case 'market': clouds(0.25, 1, 4, g.V(60, -220)); skyline(0.2, 'far', 200, 420, 120, 21, false);
        layer(0.7, 0, () => { for (let k = 0; k < 6; k++) { const sx = x0 + 140 + k * 430, sw = 340; R('trim', sx, GY - 330, 12, 330); R('trim', sx + sw - 12, GY - 330, 12, 330); for (let s = 0; s < 7; s++) Poly(s % 2 ? 'cream' : (k % 2 ? 'red' : 'board'), [[sx - 20 + s * (sw + 40) / 7, GY - 390], [sx - 20 + (s + 1) * (sw + 40) / 7, GY - 390], [sx - 20 + (s + 1) * (sw + 40) / 7, GY - 320], [sx - 20 + s * (sw + 40) / 7, GY - 320]]);
          R('trim', sx, GY - 130, sw, 130); shade(sx, GY - 130, sw, 130, 1); for (let f = 0; f < 9; f++) E(['red', 'light', 'leaf'][(f + k) % 3], sx + 30 + f * 36, GY - 140 - (f % 2) * 14, 20, 18); } }); break;
      case 'home': layer(0.35, 0, () => { c.fillStyle = paint ? 'rgba(255,250,240,0.18)' : rgba(fg, 0.025 * str); for (let x = x0; x < x1; x += 90) c.fillRect(x, top, 40, GY - top); R('wall2', x0, GY - 110, x1 - x0, 110); R('trim', x0, GY - 116, x1 - x0, 10);
          win(960 - 220, g.V(150, -40), 440, 380, true); R('red', 960 - 300, g.V(130, -60), 90, 460, 0.9); R('red', 960 + 210, g.V(130, -60), 90, 460, 0.9); R('trim', 960 - 320, g.V(122, -68), 640, 14);
          [[g.V(330, 560), g.V(300, 120)], [g.V(1520, 1300), g.V(330, 160)]].forEach(([px, py], k) => { R('trim', px - 8, py - 8, 156, 126); R(k ? 'leaf' : 'sky0', px, py, 140, 110); });
          const lx = g.V(1640, 1380); R('dark', lx - 4, GY - 330, 8, 330); Poly('light', [[lx - 60, GY - 330], [lx + 60, GY - 330], [lx + 40, GY - 410], [lx - 40, GY - 410]]); glowAt(lx, GY - 330, 260, 0.8);
          E('red', 960, GY + 120, 620, 90, paint ? 0.55 : 0.6); }); break;
      case 'courtroom': layer(0.35, 0, () => { c.fillStyle = paint ? 'rgba(20,10,4,0.16)' : rgba(fg, 0.04 * str); for (let x = x0; x < x1; x += 160) c.fillRect(x, top, 8, GY - top); R('trim', x0, GY - 300, x1 - x0, 16);
          const bx = 960 - 380; R('trim', bx, GY - 400, 760, 400); shade(bx, GY - 400, 760, 400, 1); R('dark', bx - 20, GY - 420, 800, 24); rim(bx, GY - 400, 760);
          const sx = 960, sy = GY - 240; E('light', sx, sy, 96, 96, paint ? 0.9 : 0.8); c.strokeStyle = C('dark'); c.lineWidth = 7; c.beginPath(); c.moveTo(sx, sy - 70); c.lineTo(sx, sy + 70); c.moveTo(sx - 80, sy - 40 + Math.sin(t) * 6); c.lineTo(sx + 80, sy - 40 - Math.sin(t) * 6); c.stroke(); [-1, 1].forEach(s => { c.beginPath(); c.arc(sx + s * 80, sy + 10 - s * Math.sin(t) * 6, 30, 0, Math.PI); c.stroke(); });
          columns(2, g.V(260, 520), g.V(1660, 1400), g.V(140, -60), GY - g.V(140, -60) - 20, 'trim'); }); break;
      case 'stage': layer(0.35, 0, () => { [0, 1].forEach(s => { const cx = s ? g.V(1560, 1260) : g.V(0, 300), w = g.V(380, 260); for (let f = 0; f < 6; f++) R('red', cx + f * (w / 6), top, w / 6 - 2, GY - top, 0.85 + (f % 2) * 0.15); });
          for (let f = 0; f < 22; f++) Poly('red', [[x0 + f * 120, top], [x0 + (f + 1) * 120, top], [x0 + (f + 0.5) * 120, g.V(110, -80)]]); [-1, 1].forEach(s => { c.save(); const gr = c.createLinearGradient(0, g.V(0, -200), 0, GY); gr.addColorStop(0, paint ? 'rgba(255,240,200,0.4)' : rgba(ac, 0.12)); gr.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = gr; const sx = 960 + s * 260 + Math.sin(t * 0.6 + s) * 60; c.beginPath(); c.moveTo(960 + s * 700, g.V(0, -200)); c.lineTo(sx - 220, GY); c.lineTo(sx + 220, GY); c.closePath(); c.fill(); c.restore(); }); }); break;
      case 'sea': clouds(0.25, 1, 5, g.V(60, -240)); layer(0.15, 0, () => { Poly('dark', [[1420, GY - 280], [1620, GY - 280], [1590, GY - 250], [1450, GY - 250]], paint ? 0.6 : 1); R('dark', 1515, GY - 380, 6, 100, 0.6); Poly('cream', [[1521, GY - 375], [1590, GY - 290], [1521, GY - 290]]); });
        layer(0.3, 0, () => { for (let b = 0; b < 3; b++) { const y0 = GY - 260 + b * 85; c.fillStyle = C(['far', 'mid', 'near'][b]); c.beginPath(); c.moveTo(x0, GY + 2); for (let x = x0; x <= x1; x += 20) c.lineTo(x, y0 + Math.sin(x / 90 + t * (1.2 + b * 0.4) + b) * (6 + b * 4)); c.lineTo(x1, GY + 2); c.closePath(); c.fill(); } for (let k = 0; k < 4; k++) { const bx = mod(k * 640 + t * 40, 2600) - 340, by = g.V(260, 40) + hash(k) * 160, fl = Math.sin(t * 6 + k) * 10; c.strokeStyle = C('dark', 0.7); c.lineWidth = 4; c.beginPath(); c.moveTo(bx - 24, by + fl); c.quadraticCurveTo(bx - 10, by - 8, bx, by); c.quadraticCurveTo(bx + 10, by - 8, bx + 24, by + fl); c.stroke(); } });
        c.save(); c.fillStyle = 'rgba(20,12,6,0.14)'; for (let k = 0; k < 9; k++) { const y = GY + Math.pow(k / 9, 1.4) * 640; c.fillRect(x0, y, x1 - x0, 4); } c.restore(); break;
      case 'desert': ridge(0.15, 'far', 70, 70, 2.2); layer(0.25, 0, () => { [[1180, 300], [1460, 210], [640, 170]].forEach(([px, ph]) => { Poly('mid', [[px - ph, GY - 60], [px, GY - 60 - ph], [px + ph, GY - 60]]); if (paint) Poly('near', [[px, GY - 60 - ph], [px + ph, GY - 60], [px + ph * 0.25, GY - 60]], 0.6); }); }); ridge(0.5, 'mid', 60, 10, 4.4); ridge(0.85, 'near', 30, -20, 1.7); break;
      case 'ancient': clouds(0.25, 1, 4, g.V(60, -240)); ridge(0.2, 'far', 120, 80, 1.1); layer(0.45, 0, () => { const w = g.V(1100, 820), x = 960 - w / 2, y = GY - 560; Poly('cream', [[x - 30, y], [960, y - 170], [x + w + 30, y]]); R('wall2', x - 30, y, w + 60, 30); columns(6, x + 40, x + w - 40, y + 50, 400, 'cream'); for (let s = 0; s < 3; s++) R('wall2', x - 60 - s * 30, GY - 80 + s * 27, w + 120 + s * 60, 28); }); break;
      case 'castle': clouds(0.25, 1, 5, g.V(60, -240)); ridge(0.15, 'far', 140, 120, 1.3); layer(0.3, 0, () => { const cx = g.V(1400, 1200), cy = GY - 300; R('wall', cx - 220, cy, 440, 160); shade(cx - 220, cy, 440, 160, 1); for (let k = 0; k < 11; k++) R('wall', cx - 220 + k * 40, cy - 22, 24, 24); [[-240, 300], [0, 380], [220, 300]].forEach(([dx, h]) => { R('wall2', cx + dx - 40, cy + 160 - h, 80, h); Poly('red', [[cx + dx - 52, cy + 160 - h], [cx + dx, cy + 160 - h - 90], [cx + dx + 52, cy + 160 - h]]); R('dark', cx + dx - 2, cy + 70 - h - 150, 4, 70); Poly('red', [[cx + dx + 2, cy + 70 - h - 150], [cx + dx + 52 + Math.sin(t * 3 + dx) * 6, cy + 70 - h - 136], [cx + dx + 2, cy + 70 - h - 122]]); }); R('dark', cx - 40, cy + 70, 80, 90, 0.8); });
        ridge(0.5, 'mid', 70, 20, 4.1); break;
      case 'farm': clouds(0.25, 1, 5, g.V(60, -240)); ridge(0.15, 'far', 100, 90, 1.7); layer(0.4, 0, () => { for (let b = 0; b < 4; b++) R(b % 2 ? 'mid' : 'light', x0, GY - 150 + b * 36, x1 - x0, 36, paint ? (b % 2 ? 1 : 0.55) : 1); const bx = g.V(1500, 1260); R('red', bx - 140, GY - 300, 280, 200); Poly('red', [[bx - 160, GY - 300], [bx, GY - 420], [bx + 160, GY - 300]]); shade(bx - 140, GY - 300, 280, 200, 1); R('cream', bx - 50, GY - 220, 100, 120, 0.9); });
        layer(0.85, 0, () => { for (let x = x0; x < x1; x += 140) R('trim', x, GY - 110, 14, 110); R('trim', x0, GY - 96, x1 - x0, 12); R('trim', x0, GY - 50, x1 - x0, 12); }); break;
      case 'forest': clouds(0.25, 1, 4, g.V(60, -240)); [[0.15, 'far', 320, 9], [0.45, 'mid', 260, 21], [0.8, 'near', 200, 33]].forEach(([dp, r, h, sd]) => layer(dp, dp < 0.4 ? 2.5 : 0, () => { for (let k = 0; k < 18; k++) { const tx = x0 + k * 150 + hash(sd + k) * 80, th = h * (0.7 + hash(sd + k * 2) * 0.6); R('trim', tx - 8, GY - th * 0.35, 16, th * 0.35, paint ? 0.8 : 1); Poly(r, [[tx - th * 0.28, GY - th * 0.3], [tx, GY - th * 1.1], [tx + th * 0.28, GY - th * 0.3]]); if (paint) Poly(r, [[tx, GY - th * 1.1], [tx + th * 0.28, GY - th * 0.3], [tx + th * 0.08, GY - th * 0.3]], 0.6); } })); break;
      case 'town': { clouds(0.2, 1, 4, g.V(60, -260)); // an old town square: a far spire and roofs, then a row of tall gabled houses
        layer(0.12, 2, () => { for (let k = 0; k < 16; k++) { const hx = x0 + k * 170, hh = 140 + hash(k + 4) * 90; R('far', hx, GY - 170 - hh, 150, hh + 40); Poly('far', [[hx - 6, GY - 170 - hh], [hx + 75, GY - 250 - hh], [hx + 156, GY - 170 - hh]]); }
          const sx = g.V(620, 760); R('far', sx - 40, GY - 640, 80, 400); Poly('far', [[sx - 52, GY - 640], [sx, GY - 860], [sx + 52, GY - 640]]); R('far', sx - 6, GY - 900, 12, 50); });
        const house = (x, w, h, role, kind2, sd) => { R(role, x, GY - h, w, h); shade(x, GY - h, w, h, 1);
          if (kind2 === 0) { const st = 4, sw = w / (st * 2 + 1); for (let s = 0; s < st; s++) R(role, x + sw * (s + 0.5), GY - h - (s + 1) * 48, w - sw * (2 * s + 1), 50); R('trim', x - 6, GY - h, w + 12, 10); } // stepped gable
          else if (kind2 === 1) { Poly(role, [[x, GY - h], [x + w * 0.2, GY - h - 50], [x + w * 0.32, GY - h - 160], [x + w * 0.5, GY - h - 200], [x + w * 0.68, GY - h - 160], [x + w * 0.8, GY - h - 50], [x + w, GY - h]]); E('cream', x + w * 0.5, GY - h - 110, 18, 18, 0.9); } // bell gable
          else Poly('red', [[x - 14, GY - h], [x + w / 2, GY - h - 170], [x + w + 14, GY - h]]); // pointed roof
          const cols = Math.max(2, Math.floor(w / 70)), rows = Math.max(2, Math.floor((h - 140) / 110)), gw = (w - 40) / cols;
          for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const wx = x + 20 + q * gw + gw * 0.18, wy = GY - h + 40 + r * 110; R('cream', wx - 5, wy - 5, gw * 0.64 + 10, 80); R('glass', wx, wy, gw * 0.64, 70); R('cream', wx + gw * 0.32 - 2, wy, 4, 70, 0.8); if (hash(sd + r * 7 + q) > 0.75) R('light', wx, wy, gw * 0.64, 70, 0.55); }
          R('trim', x + w * 0.5 - 34, GY - 120, 68, 120); E('trim', x + w * 0.5, GY - 120, 34, 34); };
        layer(0.4, 0, () => { let x = x0 - 40; const roles = ['wall', 'red', 'wall2', 'cream', 'red', 'wall']; for (let k = 0; x < x1; k++) { const w = 200 + hash(k + 31) * 80, h = 380 + hash(k + 17) * 180; house(x, w, h, roles[k % roles.length], k % 3, k * 11); x += w + 6; } });
        c.save(); c.fillStyle = 'rgba(70,50,30,0.1)'; for (let r = 0; r < 14; r++) { const y = GY + 20 + Math.pow(r / 14, 1.5) * 700, sz = 14 + r * 4; for (let x = x0 + (r % 2) * sz; x < x1; x += sz * 2.4) { c.beginPath(); c.ellipse(x, y, sz, sz * 0.35, 0, 0, TAU); c.fill(); } } c.restore(); break; }
      case 'village': clouds(0.2, 1, 4, g.V(60, -260)); ridge(0.12, 'far', 130, 110, 1.4); ridge(0.25, 'mid', 70, 40, 3.1);
        layer(0.45, 0, () => { [[g.V(240, 520), 300], [g.V(980, 980), 340], [g.V(1660, 1420), 290]].forEach(([cx, w], k) => { const h = 200 + k * 12; R('wall', cx - w / 2, GY - h, w, h); shade(cx - w / 2, GY - h, w, h, 1); c.strokeStyle = C('trim', 0.9); c.lineWidth = 10; c.strokeRect(cx - w / 2, GY - h, w, h); c.beginPath(); c.moveTo(cx - w / 2, GY - h * 0.5); c.lineTo(cx + w / 2, GY - h * 0.5); c.moveTo(cx - w / 4, GY - h); c.lineTo(cx - w / 4, GY); c.moveTo(cx + w / 4, GY - h); c.lineTo(cx + w / 4, GY); c.stroke();
          c.fillStyle = C('light'); c.beginPath(); c.moveTo(cx - w / 2 - 40, GY - h + 10); c.quadraticCurveTo(cx - w * 0.3, GY - h - 190, cx, GY - h - 210); c.quadraticCurveTo(cx + w * 0.3, GY - h - 190, cx + w / 2 + 40, GY - h + 10); c.closePath(); c.fill(); c.fillStyle = 'rgba(90,60,20,0.18)'; for (let q = 0; q < 6; q++) c.fillRect(cx - w / 2 + q * w / 5, GY - h - 120 + q % 2 * 20, 6, 110); R('trim', cx - 30, GY - 110, 60, 110); R('glass', cx + w / 4 + 20, GY - h * 0.85, 50, 50); });
          [g.V(620, 760), g.V(1330, 1200)].forEach((tx, k) => { R('trim', tx - 12, GY - 260, 24, 260); E('leaf', tx, GY - 330, 120, 100); E('leaf', tx - 60, GY - 280, 80, 70); E('leaf', tx + 70, GY - 290, 80, 66); if (paint) E('mid', tx + 40, GY - 300, 70, 60, 0.5); }); });
        layer(0.85, 0, () => { for (let x = x0; x < x1; x += 120) R('trim', x, GY - 90, 12, 90); R('trim', x0, GY - 76, x1 - x0, 10); R('trim', x0, GY - 40, x1 - x0, 10); }); break;
      case 'port': clouds(0.2, 1, 4, g.V(60, -260)); ridge(0.1, 'far', 80, 160, 2.2);
        layer(0.2, 0, () => { c.fillStyle = C('mid'); c.fillRect(x0, GY - 180, x1 - x0, 180); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3; for (let k = 0; k < 40; k++) { const wx = mod(hash(k) * 2600 + t * 12, 2600) - 340, wy = GY - 170 + hash(k + 3) * 150; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + 40, wy); c.stroke(); } });
        const ship = (sx, sc2, ph) => { c.save(); c.translate(sx, GY - 150); c.rotate(Math.sin(t * 0.9 + ph) * 0.02); c.scale(sc2, sc2); Poly('dark', [[-260, -60], [260, -60], [220, 40], [-200, 40]]); Poly('trim', [[-260, -60], [-300, -110], [-170, -110], [-170, -60]]); R('red', -250, -54, 500, 14, 0.9);
          [-120, 40, 170].forEach((mx, q) => { R('trim', mx - 6, -480 + q * 40, 12, 420 - q * 40); for (let s = 0; s < 3; s++) { const sy = -440 + q * 40 + s * 110, sw = 150 - s * 18 - q * 10; c.fillStyle = C('cream'); c.beginPath(); c.moveTo(mx - sw / 2, sy); c.lineTo(mx + sw / 2, sy); c.quadraticCurveTo(mx + sw / 2 + 14, sy + 45, mx + sw / 2, sy + 90); c.lineTo(mx - sw / 2, sy + 90); c.quadraticCurveTo(mx - sw / 2 + 14, sy + 45, mx - sw / 2, sy); c.fill(); } }); Poly('red', [[170, -500], [240, -488 + Math.sin(t * 3) * 5], [170, -476]]); c.restore(); };
        layer(0.35, 0, () => { ship(g.V(420, 600), 0.62, 1); ship(g.V(1520, 1320), 0.82, 2); });
        layer(0.6, 0, () => { R('trim', x0, GY - 40, x1 - x0, 40); for (let x = x0; x < x1; x += 200) R('dark', x, GY - 70, 24, 120); });
        c.save(); c.strokeStyle = 'rgba(40,25,10,0.18)'; c.lineWidth = 4; for (let k = 0; k < 14; k++) { const y = GY + Math.pow(k / 14, 1.5) * 700; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); } c.restore(); break;
      case 'camp': clouds(0.2, 1, 4, g.V(60, -260)); ridge(0.12, 'far', 140, 110, 1.9);
        [[0.18, 'far', 260, 5], [0.3, 'mid', 220, 13]].forEach(([dp, r, h, sd]) => layer(dp, 2.5, () => { for (let k = 0; k < 16; k++) { const tx = x0 + k * 170 + hash(sd + k) * 60, th = h * (0.7 + hash(sd + k * 2) * 0.5); Poly(r, [[tx - th * 0.25, GY - 60], [tx, GY - 60 - th], [tx + th * 0.25, GY - 60]]); } }));
        layer(0.5, 0, () => { [[g.V(300, 560), 1], [g.V(800, 900), 0.8], [g.V(1250, 1180), 0.9], [g.V(1720, 1440), 1.05]].forEach(([tx, s], k) => { const w = 260 * s, h = 220 * s; Poly('cream', [[tx - w / 2, GY - 20], [tx, GY - 20 - h], [tx + w / 2, GY - 20]]); if (paint) Poly('wall2', [[tx, GY - 20 - h], [tx + w / 2, GY - 20], [tx + w * 0.12, GY - 20]], 0.6); Poly('dark', [[tx - w * 0.1, GY - 20], [tx, GY - 20 - h * 0.55], [tx + w * 0.1, GY - 20]]); R('trim', tx - 4, GY - 40 - h - 120, 8, 140); Poly('red', [[tx + 4, GY - 40 - h - 120], [tx + 74 + Math.sin(t * 3 + k) * 8, GY - 40 - h - 104], [tx + 4, GY - 40 - h - 86]]); });
          const fx = g.V(1040, 1000), fy = GY + 60; for (let q = 0; q < 4; q++) R('trim', fx - 60 + q * 30, fy - 10, 26, 16); for (let q = 0; q < 3; q++) { const fl = Math.sin(t * 9 + q * 2) * 8; Poly(q === 1 ? 'light' : 'red', [[fx - 40 + q * 26, fy - 6], [fx - 26 + q * 26 + fl, fy - 90 - q % 2 * 30], [fx - 10 + q * 26, fy - 6]]); } glowAt(fx, fy - 50, 220, 0.6);
          for (let p = 0; p < 4; p++) { const pt = mod(t * 0.25 + p * 0.25, 1); E('cloud', fx + pt * 40, fy - 120 - pt * 320, 26 + pt * 50, 20 + pt * 40, (1 - pt) * 0.55); } }); break;
      case 'tavern': layer(0.35, 0, () => { R('wall2', x0, GY - 140, x1 - x0, 140); for (let x = x0 + 60; x < x1; x += 420) { R('trim', x, top, 34, GY - top); shade(x, top, 34, GY - top, 1); } R('trim', x0, g.V(70, -120), x1 - x0, 40); R('trim', x0, GY - 150, x1 - x0, 16);
          const fx = g.V(1500, 1240); R('wall2', fx - 200, GY - 330, 400, 330); R('dark', fx - 140, GY - 250, 280, 250); R('trim', fx - 230, GY - 350, 460, 30); const fl = Math.sin(t * 8) * 6; Poly('red', [[fx - 80, GY - 10], [fx - 40 + fl, GY - 140], [fx, GY - 10]]); Poly('light', [[fx - 30, GY - 10], [fx + 10 - fl, GY - 170], [fx + 50, GY - 10]]); Poly('red', [[fx + 30, GY - 10], [fx + 60 + fl, GY - 110], [fx + 90, GY - 10]]); glowAt(fx, GY - 100, 380, 0.85);
          const wx = g.V(560, 640); R('trim', wx - 110, g.V(170, 10), 220, 250); R('glass', wx - 96, g.V(184, 24), 192, 222); c.save(); c.beginPath(); c.rect(wx - 96, g.V(184, 24), 192, 222); c.clip(); c.strokeStyle = C('trim', 0.7); c.lineWidth = 3; for (let q = -6; q <= 6; q++) [1, -1].forEach(sg => { c.beginPath(); c.moveTo(wx + q * 44 - 120, g.V(184, 24) + 111 - sg * 120); c.lineTo(wx + q * 44 + 120, g.V(184, 24) + 111 + sg * 120); c.stroke(); }); c.restore(); // leaded diamond panes
          const sx = g.V(160, 470); R('trim', sx - 120, GY - 520, 240, 14); R('trim', sx - 120, GY - 420, 240, 14); for (let q = 0; q < 5; q++) { R('metal', sx - 100 + q * 44, GY - 470, 30, 50); R('metal', sx - 100 + q * 44, GY - 570, 30, 50, 0.85); }
          const bx = g.V(1820, 1440); [[0, 0], [130, 0], [65, -120]].forEach(([dx, dy]) => { E('trim', bx - 60 + dx, GY - 60 + dy, 62, 64); E('dark', bx - 60 + dx, GY - 60 + dy, 50, 52, 0.35); R('dark', bx - 120 + dx, GY - 70 + dy, 120, 8, 0.5); });
          const lx = g.V(960, 980), ly = g.V(240, 60) + Math.sin(t * 1.3) * 5; R('dark', lx - 2, g.V(110, -80), 4, ly - g.V(110, -80)); R('dark', lx - 26, ly, 52, 70); R('light', lx - 18, ly + 8, 36, 54); glowAt(lx, ly + 35, 320, 0.8); }); break;
      case 'hall': layer(0.35, 0, () => { c.strokeStyle = paint ? 'rgba(60,50,40,0.15)' : rgba(fg, 0.04 * str); c.lineWidth = 3; for (let y = GY, r = 0; y > top; y -= 70, r++) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); for (let x = x0 + (r % 2) * 90; x < x1; x += 180) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 70); c.stroke(); } }
          [g.V(420, 620), g.V(960, 960), g.V(1500, 1300)].forEach((ax, k) => { const aw = 170, ay = g.V(120, -60), ah = 440; R('trim', ax - aw / 2 - 16, ay, aw + 32, ah); c.fillStyle = C('glass'); c.beginPath(); c.moveTo(ax - aw / 2, ay + ah); c.lineTo(ax - aw / 2, ay + aw / 2); c.arc(ax, ay + aw / 2, aw / 2, Math.PI, 0); c.lineTo(ax + aw / 2, ay + ah); c.closePath(); c.fill(); R('trim', ax - 3, ay, 6, ah, 0.7); R('trim', ax - aw / 2, ay + ah * 0.55, aw, 6, 0.7);
            if (paint) { c.save(); c.globalAlpha *= 0.2; c.fillStyle = pal.light; c.beginPath(); c.moveTo(ax - aw / 2, ay + ah); c.lineTo(ax + aw / 2, ay + ah); c.lineTo(ax + aw / 2 + 220, GY + 200); c.lineTo(ax - aw / 2 + 220, GY + 200); c.closePath(); c.fill(); c.restore(); } });
          [g.V(690, 790), g.V(1230, 1130)].forEach((bx, k) => { const sw = Math.sin(t * 0.8 + k) * 4; Poly('red', [[bx - 50, g.V(90, -90)], [bx + 50, g.V(90, -90)], [bx + 50 + sw, g.V(460, 260)], [bx + sw, g.V(420, 220)], [bx - 50 + sw, g.V(460, 260)]]); E('light', bx + sw * 0.5, g.V(230, 50), 22, 22, 0.9); });
          R('trim', 960 - 420, GY - 150, 840, 26); R('red', 960 - 400, GY - 124, 800, 70, 0.85); R('trim', 960 - 380, GY - 54, 24, 54); R('trim', 960 + 356, GY - 54, 24, 54); }); break;
      case 'study': layer(0.35, 0, () => { c.fillStyle = paint ? 'rgba(20,10,4,0.14)' : rgba(fg, 0.04 * str); for (let x = x0; x < x1; x += 240) c.fillRect(x, top, 10, GY - top); R('trim', x0, GY - 160, x1 - x0, 14);
          shelf(g.V(80, 440), GY - 560, 340, 5, 4); shelf(g.V(1500, 1200), GY - 560, 300, 5, 12);
          const wx = g.V(960, 960); R('trim', wx - 150, g.V(120, -40), 300, 360); R('glass', wx - 134, g.V(136, -24), 268, 328); c.strokeStyle = C('trim', 0.8); c.lineWidth = 4; for (let q = 1; q < 4; q++) { c.beginPath(); c.moveTo(wx - 134 + q * 67, g.V(136, -24)); c.lineTo(wx - 134 + q * 67, g.V(464, 304)); c.stroke(); c.beginPath(); c.moveTo(wx - 134, g.V(136, -24) + q * 82); c.lineTo(wx + 134, g.V(136, -24) + q * 82); c.stroke(); }
          const gx = g.V(1360, 1300); R('trim', gx - 6, GY - 160, 12, 160); E('board', gx, GY - 230, 70, 70); c.strokeStyle = C('cream', 0.6); c.lineWidth = 3; c.beginPath(); c.ellipse(gx, GY - 230, 28 + Math.abs(Math.sin(t * 0.5)) * 40, 70, 0, 0, TAU); c.stroke();
          const cx2 = g.V(620, 700); R('cream', cx2 - 10, GY - 260, 20, 70); Poly('light', [[cx2 - 8, GY - 262], [cx2 + Math.sin(t * 7) * 4, GY - 300], [cx2 + 8, GY - 262]]); glowAt(cx2, GY - 280, 260, 0.75); R('trim', cx2 - 110, GY - 190, 220, 190); R('dark', cx2 - 110, GY - 196, 220, 10); }); break;
      case 'space': if (paint) { const gs = c.createLinearGradient(0, top, 0, GY); gs.addColorStop(0, pal.sky0); gs.addColorStop(1, pal.sky1); c.fillStyle = gs; c.fillRect(x0, top, x1 - x0, GY - top); }
        for (let k = 0; k < 110; k++) { const x = hash(k + 1) * (x1 - x0) + x0 - drift * 20, y = top + hash(k + 7) * (GY - top), r = 1 + hash(k + 3) * 2.2; c.fillStyle = paint ? 'rgba(255,250,235,' + (0.3 + 0.6 * Math.abs(Math.sin(t * (0.6 + hash(k)) + k))) + ')' : rgba(fg, 0.2 + 0.6 * Math.abs(Math.sin(t * (0.6 + hash(k)) + k))); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
        layer(0.3, 0, () => { const gr = c.createRadialGradient(1500, GY + 900, 200, 1500, GY + 900, 1250); gr.addColorStop(0, paint ? 'rgba(130,140,220,0.5)' : rgba(ac, 0.28)); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(1500, GY + 900, 1050, 0, TAU); c.fill(); E('red', g.V(300, 520), g.V(560, 640), 70, 70, paint ? 0.9 : 1); E('dark', g.V(320, 540), g.V(550, 630), 60, 60, 0.25); }); break;
    }
    if (o.life !== false) { // life behind the action: people passing by in the distance, birds
      const walkers = paint ? ({ city: 4, street: 5, market: 5, night: 3, office: 2, bank: 2, factory: 2, lab: 1, ancient: 3, farm: 1, runway: 1, courtroom: 0, town: 4, port: 3, camp: 2, village: 1, tavern: 1, hall: 1 }[kind] || 0) : 0;
      for (let k = 0; k < walkers; k++) { const dir = hash(k + 3) > 0.5 ? 1 : -1, sp = 45 + hash(k + 5) * 55, wx = mod(hash(k + 1) * 2600 + t * sp * dir, 2600) - 340 - drift * 40; g.person(wx, indoor ? 200 : 165, { scale: 1, y: GY - (indoor ? 36 : 64), col: pal[k % 2 ? 'mid' : 'near'] || pal.trim, a: 0.85, act: 'walk', dir, st: t * (sp / 60) + k, seed: 40 + k * 7, shadow: false, idle: false, depth: 0.55 }); }
      if (/^(sky|hills|farm|castle|ancient|desert|forest|runway|sea)$/.test(kind)) { c.save(); c.strokeStyle = C('dark', paint ? 0.55 : 1.4); c.lineWidth = 4; c.lineCap = 'round'; for (let k = 0; k < 4; k++) { const bx = mod(hash(k + 11) * 2600 + t * (55 + k * 14), 2600) - 340, by = g.V(300, 120) + hash(k + 13) * 220 + Math.sin(t * 1.5 + k) * 12, fl = Math.sin(t * 9 + k * 2) * 11, w = 22 - k * 2; c.beginPath(); c.moveTo(bx - w, by - fl); c.quadraticCurveTo(bx - w * 0.4, by - 6, bx, by); c.quadraticCurveTo(bx + w * 0.4, by - 6, bx + w, by - fl); c.stroke(); } c.restore(); }
    }
    if (paint && !indoor) { c.save(); c.fillStyle = 'rgba(255,240,210,' + (g.dof ? 0.2 : 0.1) + ')'; c.fillRect(x0, GY - 260, x1 - x0, 260); if (g.dof) { c.fillStyle = 'rgba(255,240,210,0.1)'; c.fillRect(x0, GY - 520, x1 - x0, 260); } c.restore(); } // haze near the horizon
    // foreground: things close to the camera in the band under the ground (seen in tall videos), moving faster than everything else
    const FGK = { office: 'desk', classroom: 'desk', lab: 'desk', bank: 'rope', courtroom: 'rail', stage: 'lights', home: 'sofa', city: 'bench', street: 'bench', night: 'bench', market: 'crates', factory: 'crates', mine: 'rocks', desert: 'rocks', ancient: 'ruins', castle: 'rocks', farm: 'bales', forest: 'bush', hills: 'bush', sea: 'posts', runway: 'cones', sky: 'bush', space: 'rocks' }, fk = o.fore === false ? '' : FGK[kind];
    if (fk && g.vert && paint && !g.dof) layer(1.9, 0, () => { const Y = g.GY + 250, L0 = 470, R0 = 1450, rnd = q => hash(q * 7.3 + kind.length);
      const crate = (x, y, w) => { R('trim', x, y - w, w, w); shade(x, y - w, w, w, 1); c.strokeStyle = paint ? 'rgba(20,12,6,0.3)' : C('dark'); c.lineWidth = 6; c.strokeRect(x + 8, y - w + 8, w - 16, w - 16); c.beginPath(); c.moveTo(x + 8, y - w + 8); c.lineTo(x + w - 8, y - 8); c.stroke(); };
      const rock = (x, y, r) => { c.fillStyle = C('near'); c.beginPath(); for (let q = 0; q < 9; q++) { const an = Math.PI + (q / 8) * Math.PI, rr = r * (0.8 + 0.3 * rnd(q + x)); c.lineTo(x + Math.cos(an) * rr * 1.3, y + Math.sin(an) * rr); } c.closePath(); c.fill(); shade(x - r * 1.3, y - r, r * 2.6, r, 1); };
      const bush = (x, y, r) => { [[-0.6, 0.1, 0.7], [0.5, 0.15, 0.65], [0, -0.25, 0.8]].forEach(([dx, dy, k]) => E(kind === 'farm' ? 'leaf' : 'near', x + dx * r, y + dy * r, r * k, r * k * 0.85)); };
      switch (fk) {
        case 'desk': R('trim', 330, Y - 40, 1260, 40); R('trim', 360, Y, 1200, 600, 0.92); shade(360, Y, 1200, 600, 1); R('cream', 620, Y - 60, 180, 24, 0.95); R('cream', 640, Y - 78, 170, 22); R('red', 1180, Y - 120, 70, 84); c.strokeStyle = C('red'); c.lineWidth = 10; c.beginPath(); c.arc(1260, Y - 80, 24, -1.2, 1.2); c.stroke();
          for (let q = 0; q < 3; q++) { c.save(); c.globalAlpha *= 0.35 * (1 - mod(t * 0.4 + q / 3, 1)); E('cream', 1215 + Math.sin(t * 2 + q) * 10, Y - 140 - mod(t * 0.4 + q / 3, 1) * 120, 14, 22); c.restore(); } break;
        case 'rope': [L0 + 20, R0 - 20].forEach(x => { R('metal', x - 10, Y - 200, 20, 260); E('light', x, Y - 206, 24, 24); }); c.strokeStyle = C('red'); c.lineWidth = 16; c.beginPath(); c.moveTo(L0 + 20, Y - 180); c.quadraticCurveTo(960, Y - 60 + Math.sin(t * 1.4) * 8, R0 - 20, Y - 180); c.stroke(); break;
        case 'rail': R('trim', 300, Y - 160, 1320, 30); for (let x = 320; x < 1620; x += 70) R('trim', x, Y - 130, 22, 300); R('dark', 300, Y + 160, 1320, 40, 0.8); break;
        case 'lights': R('dark', 300, Y - 40, 1320, 400); for (let k = 0; k < 9; k++) { const lx = 420 + k * 135; E('light', lx, Y - 40, 34, 16); glowAt(lx, Y - 60, 160, 0.55 + 0.15 * Math.sin(t * 3 + k)); } break;
        case 'sofa': R('red', 380, Y - 80, 1160, 180, 0.95); E('red', 380, Y + 30, 90, 130); E('red', 1540, Y + 30, 90, 130); shade(380, Y - 80, 1160, 180, 1); R('cream', 760, Y - 60, 140, 90, 0.9); break;
        case 'bench': R('trim', L0 - 40, Y - 120, 380, 28); R('trim', L0 - 40, Y - 70, 380, 28); R('dark', L0 - 10, Y - 42, 18, 110); R('dark', L0 + 300, Y - 42, 18, 110); R('red', R0 - 120, Y - 150, 70, 150); E('red', R0 - 85, Y - 150, 35, 22); R('red', R0 - 140, Y - 110, 110, 22); shade(R0 - 120, Y - 150, 70, 150, 1); break;
        case 'crates': crate(L0 - 60, Y + 40, 220); crate(L0 + 150, Y + 40, 150); crate(L0 + 40, Y - 180, 140); crate(R0 - 190, Y + 40, 200); if (kind === 'market') for (let q = 0; q < 7; q++) E(['red', 'light', 'leaf'][q % 3], R0 - 160 + q * 26, Y - 170 - (q % 2) * 16, 22, 20); break;
        case 'rocks': rock(L0 + 40, Y + 40, 120); rock(L0 + 230, Y + 60, 70); rock(R0 - 80, Y + 50, 140); if (kind === 'mine') { R('metal', 960 - 160, Y - 110, 320, 130); R('dark', 960 - 140, Y + 20, 60, 60); R('dark', 960 + 80, Y + 20, 60, 60); for (let q = 0; q < 6; q++) E('light', 960 - 110 + q * 44, Y - 120, 26, 18, 0.9); } break;
        case 'ruins': R('cream', L0 - 20, Y - 260, 110, 300); shade(L0 - 20, Y - 260, 110, 300, 1); R('cream', R0 - 260, Y - 60, 260, 100); shade(R0 - 260, Y - 60, 260, 100, 1); rock(960 + 120, Y + 60, 60); break;
        case 'bales': [[L0 + 60, 120], [L0 + 250, 90], [R0 - 120, 130]].forEach(([x, r]) => { E('light', x, Y + 20, r, r * 0.9); c.strokeStyle = paint ? 'rgba(120,80,20,0.4)' : C('dark'); c.lineWidth = 5; c.beginPath(); c.arc(x, Y + 20, r * 0.6, 0, TAU); c.stroke(); }); break;
        case 'bush': bush(L0 + 60, Y + 30, 150); bush(R0 - 60, Y + 50, 170); break;
        case 'posts': [L0 + 40, R0 - 60].forEach(x => { R('trim', x - 40, Y - 280, 80, 420); shade(x - 40, Y - 280, 80, 420, 1); }); c.strokeStyle = C('cream', 1); c.lineWidth = 12; c.beginPath(); c.moveTo(L0 + 40, Y - 220); c.quadraticCurveTo(960, Y - 80 + Math.sin(t * 1.2) * 10, R0 - 60, Y - 220); c.stroke(); break;
        case 'cones': [L0 + 60, L0 + 230, R0 - 80].forEach((x, q) => { Poly('red', [[x - 50, Y + 40], [x, Y - 120 + q * 20], [x + 50, Y + 40]]); R('cream', x - 30, Y - 50 + q * 10, 60, 18); }); break;
      } });

    if (paint && g.dof && o.fore !== false) layer(2.3, 0, () => { // out-of-focus shapes right in front of the lens at the frame edges, so the actors sit inside a deep space
      if ('filter' in c) c.filter = 'blur(' + (15 * Math.abs(c.getTransform().a || 1)).toFixed(1) + 'px)';
      const yb = g.V(1110, 1560), dk = mixc(pal.near || pal.trim || '#5a4a3a', '#140c06', 0.55), lf = mixc(pal.leaf || pal.near || '#556b3a', '#140c06', 0.5);
      c.fillStyle = indoor ? dk : lf;
      const clump = (cx, r, n, sdd) => { c.beginPath(); for (let q = 0; q < n; q++) { const ax = cx + (hash(sdd + q) - 0.5) * r * 1.6, ay = yb - hash(sdd + q * 3) * r * 0.5, rr = r * (0.45 + hash(sdd + q * 5) * 0.4); c.moveTo(ax + rr, ay); c.ellipse(ax, ay, rr, rr * 0.8, 0, 0, TAU); } c.fill(); };
      const blades = (cx, w, hh, sdd) => { c.beginPath(); for (let q = 0; q < 14; q++) { const bx = cx + (q / 13 - 0.5) * w, bh = hh * (0.5 + hash(sdd + q) * 0.6), sway = Math.sin(t * 1.3 + q) * 10; c.moveTo(bx - 14, yb + 40); c.quadraticCurveTo(bx + sway * 0.5, yb - bh * 0.5, bx + sway + (hash(sdd + q * 2) - 0.5) * 60, yb - bh); c.quadraticCurveTo(bx + sway * 0.5 + 10, yb - bh * 0.45, bx + 14, yb + 40); } c.fill(); };
      if (indoor) { c.fillRect(g.V(-150, 300), yb - 2200, g.V(250, 210), 2400); clump(g.V(1880, 1460), 190, 6, 31); }
      else if (kind === 'space' || kind === 'sky') clump(g.V(40, 450), 170, 5, 41);
      else { clump(g.V(40, 460), 220, 7, 17); blades(g.V(230, 580), 300, 260, 23); clump(g.V(1890, 1470), 200, 6, 29); blades(g.V(1720, 1360), 260, 220, 37); }
    });
  }
  function stageOf(g) { const top = g.V(250, 150), xl = g.V(360, 450), xr = g.V(1560, 1470), H = g.GY - top; return { U: H / 100, W: xr - xl, H, xl, xr, X: x => xl + (x / 100) * (xr - xl), Y: y => top + (y / 100) * H }; }
  function drawItems(g, items, st, inGroup, depth) {
    const c = g.ctx, stg = st, U = st.U, PX = (x, y) => (inGroup ? [num(x, 0) * U, num(y, 0) * U] : [st.X(num(x, 50)), st.Y(num(y, 50))]), list = [];
    (Array.isArray(items) ? items : []).slice(0, 60).forEach(e => { // "repeat" makes a row of copies
      if (!e || typeof e !== 'object') return; const rp = e.repeat, d0 = inGroup || /^path$/i.test(e.is || '') ? 0 : 50;
      if (rp && typeof rp === 'object' && rp.n > 1) for (let k = 0; k < Math.min(30, rp.n | 0); k++) list.push(Object.assign({}, e, { repeat: null, x: num(e.x, d0) + k * num(rp.dx, 0), y: num(e.y, d0) + k * num(rp.dy, 0), at: when(g, e.at, 0) + k * num(rp.stagger, 0) }));
      else list.push(e);
    });
    list.slice(0, 120).forEach((e, idx) => {
      const kind = String(e.is || e.type || '').toLowerCase(), at = clamp(when(g, e.at, 0), 0, Math.max(0, g.d - 0.2)), out = when(g, e.out, 1e9), lt = g.t - at; if (lt < 0 || g.t > out + 0.3) return;
      if (kind === 'shake') { g.shake(num(e.amount, 10) * Math.exp(-lt * 7)); return; }
      const isPath = kind === 'path' || kind === 'blob' && Array.isArray(e.pts); let x = num(e.x, inGroup || isPath ? 0 : 50), y = num(e.y, inGroup || isPath ? 0 : 50), s = num(e.scale, 1), r = num(e.rot, 0), a = num(e.alpha, 1);
      let going = 0; (Array.isArray(e.move) ? e.move : []).slice(0, 12).forEach(k => { if (!k) return; const p = (EASE[k.ease] || eio)(clamp((g.t - when(g, k.at, 0)) / Math.max(0.05, num(k.dur, 0.6)))); if (p <= 0) return; if (p < 1 && Math.abs(num(k.x, x) - x) > 1) going = num(k.x, x) > x ? 1 : -1; x = lerp(x, num(k.x, x), p); y = lerp(y, num(k.y, y), p); s = lerp(s, num(k.scale, s), p); r = lerp(r, num(k.rot, r), p); a = lerp(a, num(k.alpha, a), p); });
      const strokey = /^(line|arrow|path|box|circle|ring|blob|dots)$/.test(kind), ent = String(e.in || (kind === 'scenery' ? 'none' : strokey ? 'draw' : /^(icon|coin|tag|star|chest|bubble|burst|photo|image)$/.test(kind) ? 'pop' : kind === 'bar' ? 'grow' : kind === 'stamp' || kind === 'sparks' || kind === 'group' ? 'none' : 'fade'));
      const ip = clamp(lt / Math.max(0.05, num(e.inDur, ent === 'draw' ? 0.7 : 0.45))); let dp = 1, px, py, pts = null;
      if (isPath) { pts = (Array.isArray(e.pts) ? e.pts : []).filter(q => Array.isArray(q)).slice(0, 80).map(q => PX(q[0], q[1])); if (pts.length < 2) return; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; pts.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; pts = pts.map(q => [q[0] - cx, q[1] - cy]); px = cx + (inGroup ? x * U : (x / 100) * st.W); py = cy + (inGroup ? y * U : (y / 100) * st.H); }
      else { const q = PX(x, y); px = q[0]; py = q[1]; }
      if (ent === 'pop') s *= back(ip); else if (ent === 'fade') a *= eo(ip); else if (ent === 'draw' || ent === 'grow') { dp = eo(ip); if (!strokey && kind !== 'bar') a *= dp; }
      else if (ent === 'left' || ent === 'right' || ent === 'up' || ent === 'down') { const k = (1 - eo(ip)) * 16 * U; a *= clamp(ip * 2.5); if (ent === 'left') px -= k; else if (ent === 'right') px += k; else if (ent === 'up') py += k; else py -= k; }
      else if (ent === 'drop') { py -= Math.abs(Math.cos(ip * Math.PI * 1.5)) * (1 - ip) * 46 * U; a *= clamp(ip * 4); }
      if (g.t > out) a *= 1 - clamp((g.t - out) / 0.3);
      const lp = String(e.loop || ''), spd = num(e.speed, 1), tt = g.t * spd + idx * 1.3;
      if (lp === 'bob') py += Math.sin(tt * 3) * 1.2 * U; else if (lp === 'float') { px += Math.sin(tt * 0.9) * 1.5 * U; py += Math.cos(tt * 1.3) * 1.2 * U; } else if (lp === 'pulse') s *= 1 + 0.07 * Math.sin(tt * 5); else if (lp === 'spin') r += g.t * 90 * spd;
      else if (lp === 'swing') r += Math.sin(tt * 2.6) * 9; else if (lp === 'shake') { px += Math.sin(g.t * 61 + idx) * 0.5 * U; py += Math.cos(g.t * 53 + idx) * 0.5 * U; } else if (lp === 'blink') a *= 0.55 + 0.45 * Math.sin(tt * 6);
      const fx = Array.isArray(e.fx) ? e.fx.join(',') : String(e.fx || ''); if (/shake/.test(fx)) g.shake(9 * Math.exp(-lt * 8));
      if (a <= 0.003 || s === 0) return; const col = colr(g, e.color, null), lw = Math.max(1.5, num(e.width, 0.45) * U), size = v => num(e.size, v) * U;
      c.save(); c.translate(px, py); c.globalAlpha *= clamp(a);
      if (/sparks/.test(fx)) g.spray(0, 0, 12, lt / 0.55, { r0: num(e.fxR, 5) * U, r: 15 * U, len: 2.6 * U, col: colr(g, e.fxColor, g.fg), seed: idx });
      if (/ring/.test(fx) && lt < 0.6) { c.save(); c.globalAlpha *= 1 - lt / 0.6; c.strokeStyle = colr(g, e.fxColor, g.ac); c.lineWidth = lw; c.beginPath(); c.arc(0, 0, (num(e.fxR, 5) + 14 * eo(lt / 0.6)) * U, 0, TAU); c.stroke(); c.restore(); }
      if (/glow/.test(fx)) g.halo(0, 0, 18 * U, 0.2 + 0.4 * Math.exp(-lt * 3), colr(g, e.fxColor, g.ac));
      c.rotate((r * Math.PI) / 180); c.scale(s, s);
      switch (kind) {
        case 'person': { let cur = e, st0 = at; (Array.isArray(e.then) ? e.then : []).slice(0, 8).forEach(k => { if (!k || typeof k !== 'object') return; const ka = when(g, k.at, 1e9); if (g.t >= ka) { cur = Object.assign({}, cur, k); st0 = ka; } });
          const dk = g.dof && !inGroup ? clamp((g.GY - py) / Math.max(1, stg.H), 0, 0.6) : 0, h = num(e.h, 30) * U * (g.people === 'simple' ? 1 : 1.2) * (1 - dk * 0.7) * (g.pscale || 1), walkNow = going && !inGroup && e.walk !== false, dir = walkNow ? going : cur.dir === 'left' || cur.dir === -1 ? -1 : 1, act = walkNow ? 'walk' : String(cur.act || ''), mood = String(cur.mood || ''), pc = col || g.ac, st = walkNow ? g.t : g.t - st0, says = cur.says ? String(cur.says).toUpperCase() : '', sayT = g.t - (cur === e ? when(g, e.saysAt, at + 0.3) : st0 + 0.1), talking = act === 'talk' || (!!says && sayT > 0 && sayT < 0.4 + says.length * 0.075);
          let look = null; if (Array.isArray(cur.look)) { const q = PX(cur.look[0], cur.look[1]), dx = q[0] - px, dy = q[1] - (py - h * 0.8), dd = Math.hypot(dx, dy) || 1; look = [dx / dd, dy / dd]; } else if (cur.look) look = { left: [-0.8, 0], right: [0.8, 0], up: [0, -0.9], down: [0, 0.9], camera: [0, 0] }[cur.look] || null;
          if (e.glow !== false) g.halo(0, -h * 0.5, h * 0.95, 0.14, pc);
          if (act === 'dig') g.worker(0, h, { y: 0, col: pc, dir, swing: mod(st, 0.62) / 0.62, beam: e.beam === false ? 0 : 0.8, mood: mood || 'angry' });
          else g.person(0, h, { y: 0, col: pc, gl: e.glasses == null ? false : !!e.glasses, dir, act: talking && !act ? 'talk' : act, mood, st, talk: talking, arms: e.arms !== false, lean: num(cur.lean, 0), hat: e.hat, hair: e.hair, look, feet: e.feet !== false, scale: 1, skin: e.skin, hairCol: e.hairCol, outfit: e.outfit, beard: e.beard, extra: e.extra, seed: e.seed, depth: dk * 1.6 });
          if (act === 'cheer') for (let k = 0; k < 4; k++) g.sparkle(Math.cos(k * 1.7 + g.t) * h * 0.4, -h * (g.people === 'doll' ? 1.2 : 0.95) + Math.sin(k * 2.1 + g.t * 2) * h * 0.25, h * 0.05, 0.8);
          if (e.name) g.text(String(e.name), 0, 2.6 * U, { size: 1.7 * U, a: 0.8 });
          const sayEnd = 2.6 + says.length * 0.1; if (says && sayT > 0 && sayT < sayEnd + 0.25) { c.save(); c.globalAlpha *= 1 - clamp((sayT - sayEnd) / 0.25); const sz = num(e.saysSize, 3.4) * U, side = cur.saysSide === 'left' ? -1 : cur.saysSide === 'right' ? 1 : dir; g.font(700, sz, 0.08); const tw = c.measureText(says).width, bw2 = tw + sz * 2, bh2 = sz * 2.5, bs = back(clamp(sayT / 0.3)), bx0 = side * (h * 0.3 + bw2 * 0.42), bx = inGroup ? bx0 : clamp(px + bx0 * s, stg.xl + bw2 / 2 + 12, stg.xr - bw2 / 2 - 12) / 1 - px, hb = e.hat ? 1.2 : e.hair ? 1.14 : 1.08, byy = -h * hb - bh2 / 2, shown = says.slice(0, Math.ceil(sayT / 0.03));
            c.save(); c.translate(side * h * 0.2, -h * (hb - 0.1)); c.scale(bs, bs); c.translate(bx - side * h * 0.2, byy + h * (hb - 0.1)); c.fillStyle = g.bg; c.strokeStyle = g.fg; c.lineWidth = Math.max(2.5, 0.4 * U); c.lineJoin = 'round'; g.rr(-bw2 / 2, -bh2 / 2, bw2, bh2, bh2 * 0.42); c.fill(); c.stroke();
            const tx0 = clamp(side * h * 0.2 - bx, -bw2 * 0.36, bw2 * 0.36); c.beginPath(); c.moveTo(tx0 - sz * 0.5, bh2 / 2 - 2); c.lineTo(tx0 - side * sz * 0.5, bh2 / 2 + sz * 0.9); c.lineTo(tx0 + sz * 0.5, bh2 / 2 - 2); c.fill(); c.stroke(); g.font(700, sz, 0.08); c.fillStyle = g.fg; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(shown, -tw / 2, 1); c.restore(); c.restore(); }
          const em = cur.emote ? String(cur.emote).slice(0, 3) : ''; if (em && st >= 0) { const zz = /^z+$/i.test(em), ex0 = -dir * h * 0.2, ey0 = -h * 1.1; if (zz) for (let k = 0; k < 3; k++) { const ph = mod(g.t * 0.5 + k / 3, 1); g.text('Z', ex0 - dir * ph * h * 0.25, ey0 - ph * h * 0.4, { size: h * (0.09 + 0.07 * ph), a: Math.sin(ph * Math.PI), col: g.fg, wt: 800, ls: 0 }); } else { const ps = back(clamp(st / 0.3)); c.save(); c.translate(ex0, ey0 + Math.sin(g.t * 5) * h * 0.02); c.scale(ps, ps); c.rotate(-dir * 0.14); g.text(em.toUpperCase(), 0, 0, { size: h * 0.3, col: pc === g.ac ? g.fg : g.ac, wt: 900, ls: 0 }); c.restore(); } }
          break; }
        case 'photo': case 'image': drawPhoto(g, e, num(e.w, 40) * U, col); break;
        case 'scenery': if (g.skipScenery) break; c.restore(); c.save(); c.globalAlpha *= clamp(a); drawScenery(g, e.kind || e.name, e); break;
        case 'crowd': { const n = clamp(num(e.n, 3) | 0, 1, 9), h = num(e.h, 22) * U; for (let k = 0; k < n; k++) g.person((k - (n - 1) / 2) * h * 0.5, h, { y: 0, col: col || g.fg, ol: k > 0 }); break; }
        case 'icon': g.icon(String(e.name || 'star'), 0, 0, size(18), col || g.fg, Math.max(3, num(e.width, 0.6) * U)); break;
        case 'coin': g.coin(0, 0, size(12) / 2, e.symbol == null ? '$' : String(e.symbol), e.spin ? g.t * 2.4 * (e.spin === true ? 1 : +e.spin || 1) : 0, 1); break;
        case 'chest': { const w = size(22); g.chest(0, w, { y: w * 0.25, col: col || g.fg, open: e.open != null ? eo(clamp((g.t - when(g, e.open, 0)) / 0.5)) : 0 }); break; }
        case 'star': g.sparkle(0, 0, size(4), 1, col || g.fg); break;
        case 'glow': g.halo(0, 0, num(e.r, 20) * U, num(e.strength, 0.5), col || g.ac); break;
        case 'burst': g.burst(0, 0, eo(clamp(lt / 0.7)), e.symbol == null ? '$' : String(e.symbol)); break;
        case 'sparks': g.spray(0, 0, clamp(num(e.n, 14) | 0, 1, 40), lt / Math.max(0.1, num(e.dur, 0.6)), { r0: num(e.r0, 0) * U, r: num(e.r, 22) * U, len: num(e.len, 3) * U, col: col || g.fg, lw, seed: idx, grav: num(e.gravity, 0) * U }); break;
        case 'text': { const raw = String(e.text == null ? '' : e.text), txt = e.caps === false ? raw : raw.toUpperCase(), sz = size(4.2); g.font(num(e.weight, 700), sz, num(e.spacing, 0.08)); const tw = c.measureText(txt).width, mw = num(e.w, 0) * U, k = mw && tw > mw ? mw / tw : 1; c.scale(k, k); c.fillStyle = col || g.fg; c.textAlign = e.align === 'left' || e.align === 'right' ? e.align : 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, 0); break; }
        case 'tag': g.tag(String(e.text || ''), 0, 0, { size: size(2.4), solid: e.style === 'solid', fill: e.style === 'accent', back: 1, col: col || g.fg, strike: e.strike != null ? eo(clamp((g.t - when(g, e.strike, 0)) / 0.3)) : 0 }); break;
        case 'stamp': g.stamp(String(e.text || ''), 0, 0, e.in ? 1 : clamp(lt / 0.22), { size: size(4.4), rot: 0, col: col || g.ac }); if (!e.in && lt > 0.2) g.shake(8 * Math.exp(-(lt - 0.2) * 9)); break;
        case 'number': { const dec = clamp(num(e.decimals, 0) | 0, 0, 3), p = eo(clamp((g.t - when(g, e.start, at)) / Math.max(0.1, num(e.over, 1.2)))), v = lerp(num(e.from, 0), num(e.to, 100), p), sz = size(13); g.font(800, sz, 0);
          if (g.paint && e.card !== false) { const wMax = c.measureText(String(e.prefix || '') + (dec ? num(e.to, 100).toFixed(dec) : e.plain ? String(Math.round(num(e.to, 100))) : fmt(num(e.to, 100))) + String(e.suffix || '')).width, cw = wMax + sz * 0.8, ch = sz * (e.label ? 1.55 : 1.2); c.save(); c.rotate(-0.02); c.shadowColor = 'rgba(40,25,10,0.25)'; c.shadowBlur = 14; c.shadowOffsetY = 5; c.fillStyle = 'rgba(248,240,222,0.95)'; c.fillRect(-cw / 2, -sz * 0.62, cw, ch); c.restore(); } // a paper card, so the number reads over any painted place
          c.fillStyle = col || g.ac; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(e.prefix || '') + (dec ? v.toFixed(dec) : e.plain ? String(Math.round(v)) : fmt(v)) + String(e.suffix || ''), 0, 0); if (e.label) g.text(e.label, 0, sz * 0.8, { size: Math.max(13, sz * 0.18), a: 0.85 }); break; }
        case 'box': { const w = num(e.w, 20) * U, h = num(e.h, 14) * U, rad = num(e.r, 1.2) * U, fill = colr(g, e.fill, null); if (fill) { c.save(); c.globalAlpha *= dp; c.fillStyle = fill; g.rr(-w / 2, -h / 2, w, h, rad); c.fill(); c.restore(); }
          if (e.stroke !== 'none') { const sc2 = colr(g, e.stroke, col || g.fg); if (e.dash) c.setLineDash([lw * 1.6, lw * 2.6]); if (dp >= 1) { c.strokeStyle = sc2; c.lineWidth = lw; g.rr(-w / 2, -h / 2, w, h, rad); c.stroke(); } else g.trace([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]], dp, { col: sc2, lw }); } break; }
        case 'circle': { const rad = num(e.r, 8) * U, fill = colr(g, e.fill, null); if (fill) { c.save(); c.globalAlpha *= dp; c.fillStyle = fill; c.beginPath(); c.arc(0, 0, rad, 0, TAU); c.fill(); c.restore(); }
          if (e.stroke !== 'none' && (!fill || e.stroke)) { if (e.dash) c.setLineDash([lw * 1.6, lw * 2.6]); c.strokeStyle = colr(g, e.stroke, col || g.fg); c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, rad, -Math.PI / 2, -Math.PI / 2 + TAU * dp); c.stroke(); } break; }
        case 'ring': { const rad = num(e.r, 12) * U, pc = clamp(num(e.percent, 50) / 100) * dp; c.lineWidth = num(e.width, 2.6) * U; c.strokeStyle = rgba(g.fg, 0.16); c.beginPath(); c.arc(0, 0, rad, 0, TAU); c.stroke(); c.strokeStyle = col || g.ac; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, rad, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.002, pc)); c.stroke();
          if (e.show !== false) { g.font(800, rad * 0.56, 0); c.fillStyle = col || g.ac; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(Math.round(pc * 100) + '%', 0, rad * 0.03); } break; }
        case 'bar': { const w = num(e.w, 7) * U, h = Math.max(2, num(e.h, 30) * U * dp), fill = e.fill === 'none' ? null : colr(g, e.fill, col || g.ac); g.rr(-w / 2, -h, w, h, Math.min(8, w * 0.2)); if (fill) { c.fillStyle = fill; c.fill(); } else { c.strokeStyle = col || g.fg; c.lineWidth = lw; c.stroke(); }
          if (e.value != null) g.text(String(e.value), 0, -h - 2.6 * U, { size: 3 * U, wt: 800, ls: 0.02, col: fill || g.fg, a: dp }); if (e.label) g.text(e.label, 0, 2.4 * U, { size: 1.8 * U, a: 0.85 }); break; }
        case 'dots': { const cols = clamp(num(e.cols, 10) | 0, 1, 20), rows = clamp(num(e.rows, 1) | 0, 1, 10), gap = num(e.gap, 5) * U, rad = num(e.r, 1.6) * U, on = Math.round(num(e.on, 0) * eo(clamp((g.t - when(g, e.start, at + 0.4)) / Math.max(0.1, num(e.over, 1)))));
          for (let k = 0; k < cols * rows; k++) { if (k / (cols * rows) > dp) break; const qx = ((k % cols) - (cols - 1) / 2) * gap, qy = (Math.floor(k / cols) - (rows - 1) / 2) * gap; c.beginPath(); c.arc(qx, qy, rad, 0, TAU); if (k < on) { c.fillStyle = col || g.ac; c.fill(); } else { c.strokeStyle = rgba(g.fg, 0.7); c.lineWidth = Math.max(1.5, rad * 0.22); c.stroke(); } } break; }
        case 'line': case 'arrow': { let vx, vy; if (Array.isArray(e.to)) { const b = PX(e.x, e.y), q = PX(e.to[0], e.to[1]); vx = q[0] - b[0]; vy = q[1] - b[1]; } else { const an = (num(e.angle, 0) * Math.PI) / 180, L = num(e.len, 20) * U; vx = Math.cos(an) * L; vy = Math.sin(an) * L; }
          if (e.center) c.translate(-vx / 2, -vy / 2); if (e.dash) c.setLineDash([lw * 1.6, lw * 2.6]); if (e.flow) c.lineDashOffset = -g.t * 60 * num(e.flow, 1); const cc = col || g.fg, bend = num(e.bend, 0); let ps = [[0, 0], [vx, vy]];
          if (bend) { ps = []; const bx = vx / 2 - vy * bend, by = vy / 2 + vx * bend; for (let k = 0; k <= 16; k++) { const q = k / 16; ps.push([2 * (1 - q) * q * bx + q * q * vx, 2 * (1 - q) * q * by + q * q * vy]); } }
          g.trace(ps, dp, { col: cc, lw }); if (kind === 'arrow' && dp > 0.92) { const n = ps.length, an = Math.atan2(ps[n - 1][1] - ps[n - 2][1], ps[n - 1][0] - ps[n - 2][0]), hl = Math.max(lw * 3.4, 1.8 * U); c.setLineDash([]); g.trace([[vx - Math.cos(an - 0.5) * hl, vy - Math.sin(an - 0.5) * hl], [vx, vy], [vx - Math.cos(an + 0.5) * hl, vy - Math.sin(an + 0.5) * hl]], 1, { col: cc, lw }); } break; }
        case 'blob': if (!pts) { const rad = num(e.r, 14) * U, n = clamp(num(e.points, 9) | 0, 5, 16), sd = num(e.seed, 1); pts = []; for (let k = 0; k < n; k++) { const an = (k / n) * TAU + sd, rr = rad * (0.82 + 0.3 * hash(k + sd * 13)); pts.push([Math.cos(an) * rr, Math.sin(an) * rr * num(e.squash, 0.9)]); } e = Object.assign({}, e, { close: true }); }
        /* falls through */
        case 'path': { let ps = e.smooth ? smoothPts(pts, !!e.close) : e.close ? pts.concat([pts[0]]) : pts; const fill = colr(g, e.fill, null); if (fill) { c.save(); c.globalAlpha *= dp * num(e.fillAlpha, 1); c.fillStyle = fill; c.beginPath(); ps.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.fill(); c.restore(); }
          if (e.stroke !== 'none') { if (e.dash) c.setLineDash([lw * 1.6, lw * 2.6]); if (e.flow) c.lineDashOffset = -g.t * 60 * num(e.flow, 1); g.trace(ps, dp, { col: colr(g, e.stroke, col || g.fg), lw }); } break; }
        case 'bubble': { const w = num(e.w, 30) * U, h = num(e.h, 12) * U, td = e.tail === 'right' ? 1 : -1; c.fillStyle = g.bg; c.strokeStyle = col || g.fg; c.lineWidth = lw; c.lineJoin = 'round'; g.rr(-w / 2, -h / 2, w, h, Math.min(h / 2, 2.6 * U)); c.fill(); c.stroke();
          if (e.tail !== 'none') { c.beginPath(); c.moveTo(td * w * 0.22, h / 2 - lw * 0.6); c.lineTo(td * w * 0.34, h / 2 + 2.6 * U); c.lineTo(td * w * 0.08, h / 2 - lw * 0.6); c.fill(); c.stroke(); }
          if (e.text) { const txt = String(e.text).toUpperCase(); g.font(700, 100, 0.08); const sz = Math.min(num(e.size, 3) * U, ((w * 0.86) / Math.max(1, c.measureText(txt).width)) * 100); g.text(txt, 0, 1, { size: sz, wt: 700, ls: 0.08, col: colr(g, e.textColor, g.fg) }); } break; }
        case 'group': if (depth < 2) drawItems(g, e.items, st, true, depth + 1); break;
      }
      c.restore();
    });
  }
  V.custom = {
    name: 'Custom animation', hint: 'A picture built for this one video out of parts: characters, shapes, lines that draw themselves, numbers, labels. Claude writes the parts list when it makes the video. Ask Claude in the project chat to change it.',
    fields: [F('items', 'Parts list (written by Claude)', 'json', [
      { is: 'person', x: 30, y: 100, h: 34, act: 'point' }, { is: 'icon', name: 'bulb', x: 68, y: 40, size: 24, color: 'accent', loop: 'bob', at: 'line1', fx: 'sparks,glow' },
      { is: 'arrow', x: 40, y: 62, to: [58, 46], bend: -0.2, at: 'line1-0.3', dash: true }, { is: 'tag', text: 'YOUR IDEA', x: 68, y: 62, at: 'line1+0.4', style: 'accent' }])],
    draw(g) { const st = stageOf(g); try { drawItems(g, g.P.items, st, false, 0); } catch (e) { if (root.console) console.error('custom', e); } },
  };

  /* ---------- captions ---------- */
  function parseCap(s, caps) { // *words* -> accent. Returns words, each a list of {s, acc} parts
    const words = []; let cur = [], acc = false, buf = ''; const flush = () => { if (buf) { cur.push({ s: buf, acc }); buf = ''; } };
    for (const ch of caps === false ? String(s || '') : String(s || '').toUpperCase()) { if (ch === '*') { flush(); acc = !acc; } else if (/\s/.test(ch)) { flush(); if (cur.length) { words.push(cur); cur = []; } } else buf += ch; }
    flush(); if (cur.length) words.push(cur); return words;
  }
  function drawCap(c, proj, text, cx, y, o) {
    const a = o.a; if (a <= 0 || !text) return; const lk = proj.look || LOOK0, size = o.size, ls = o.ls * size, words = parseCap(text, lk.caps), ff = FONTS[proj.font] || FONTS.Inter, gl = Math.min(1, lk.glow ?? 1), col = proj.colors;
    c.save(); c.font = `${FONTW[proj.font] || o.wt} ${size}px ${ff}`; if ('letterSpacing' in c) c.letterSpacing = ls.toFixed(2) + 'px'; c.textBaseline = 'middle'; c.textAlign = 'left';
    const space = c.measureText(' ').width, lines = [[]]; let lw = 0;
    words.forEach(wd => { wd.forEach(p => (p.w = c.measureText(p.s).width)); wd.width = wd.reduce((s, p) => s + p.w, 0); const cur = lines[lines.length - 1], add = (cur.length ? space : 0) + wd.width;
      if (lw + add > o.maxW && cur.length) { lines.push([wd]); lw = wd.width; } else { cur.push(wd); lw += add; } });
    c.globalAlpha = a; if (o.blur > 0.3 && 'filter' in c) c.filter = `blur(${o.blur.toFixed(1)}px)`; c.shadowBlur = size * 0.5 * gl; const mode = o.plain ? 'color' : lk.cap;
    let wi = 0;
    lines.forEach((ln, li) => {
      const w = ln.reduce((s, wd, i) => s + wd.width + (i ? space : 0), 0); let x = cx - w / 2 + ls / 2;
      ln.forEach((wd, i) => { if (i) x += space; const wa = o.rev == null ? 1 : o.wt && o.wt[wi] != null ? clamp((o.rev - o.wt[wi] + 0.05) / 0.13) : clamp((o.rev - wi * o.step) / 0.13); wi++; c.globalAlpha = a * wa; wd.forEach(p => {
        const yy = y + li * size * 1.34 + (1 - eo(wa)) * size * 0.24; c.shadowColor = gl > 0 ? rgba(p.acc ? col.accent : col.fg, 0.4) : 'transparent';
        if (p.acc && mode === 'box') { c.save(); c.shadowColor = 'transparent'; c.fillStyle = col.accent; c.fillRect(x - size * 0.16, yy - size * 0.62, p.w - ls + size * 0.32, size * 1.2); c.restore(); c.fillStyle = col.bg; c.shadowColor = 'transparent'; }
        else if (p.acc && mode === 'underline') { c.save(); c.shadowColor = 'transparent'; c.fillStyle = col.accent; c.fillRect(x - size * 0.04, yy + size * 0.5, p.w - ls + size * 0.08, size * 0.14); c.restore(); c.fillStyle = o.col; }
        else c.fillStyle = p.acc ? col.accent : o.col;
        if (lk.capHalo && !(p.acc && mode === 'box')) { c.save(); c.shadowColor = 'rgba(250,244,228,0.9)'; c.shadowBlur = size * 0.5; c.strokeStyle = 'rgba(250,244,228,0.92)'; c.lineWidth = size * 0.26; c.lineJoin = 'round'; c.strokeText(p.s, x, yy); c.restore(); } // a soft paper-coloured edge so words read over any place
        const pp = p.acc && o.rev != null ? clamp((o.rev - (o.wt && o.wt[wi - 1] != null ? o.wt[wi - 1] : (wi - 1) * o.step)) / 0.28) : 1;
        if (pp < 1) { c.save(); c.translate(x + p.w / 2, yy); const k = 1 + 0.2 * (1 - eo(pp)) * Math.cos(pp * 4); c.scale(k, k); c.fillText(p.s, -p.w / 2, 0); c.restore(); } else c.fillText(p.s, x, yy); x += p.w; }); });
    });
    c.restore();
  }

  /* ---------- timeline + compositor ---------- */
  const TO = 0.17, TI = 0.26; let layer = null, bgc = null, bgKey = '';
  function sceneAt(proj, t) { let acc = 0; const S = proj.scenes; for (let i = 0; i < S.length; i++) { if (t < acc + S[i].dur || i === S.length - 1) return { i, lt: Math.min(t - acc, S[i].dur), sc: S[i] }; acc += S[i].dur; } return null; }
  const duration = proj => proj.scenes.reduce((s, x) => s + (+x.dur || 0), 0);
  const startOf = (proj, i) => proj.scenes.slice(0, i).reduce((s, x) => s + (+x.dur || 0), 0);

  function render(ctx, proj, t) {
    const W = ctx.canvas.width, H = ctx.canvas.height, vert = H > W, LW = vert ? 1080 : 1920, LH = vert ? 1920 : 1080, px = W / LW;
    const sv = 1, tx = vert ? 540 - 960 : 0, ty = vert ? 389 : 0, GY = 1031 * sv + ty, col = proj.colors;
    const doc = ctx.canvas.ownerDocument || document;
    if (!layer) { layer = doc.createElement('canvas'); bgc = doc.createElement('canvas'); }
    if (layer.width !== W || layer.height !== H) { layer.width = W; layer.height = H; bgKey = ''; }
    const look = proj.look || LOOK0, glow = Math.max(0, look.scenery === 'painted' ? Math.min(0.1, look.glow ?? 1) : look.glow ?? 1);
    const key = [W, H, col.bg, col.fg, look.pattern, look.ground, look.vignette].join('|');
    if (key !== bgKey) { // static background: pattern, vignette, ground line
      bgKey = key; bgc.width = W; bgc.height = H; const b = bgc.getContext('2d'); b.setTransform(px, 0, 0, px, 0, 0); b.fillStyle = col.bg; b.fillRect(0, 0, LW, LH);
      if (look.pattern === 'dots') { b.fillStyle = rgba(col.fg, 0.2); for (let y = 22; y < LH; y += 41) for (let x = 22; x < LW; x += 41) { b.beginPath(); b.arc(x, y, 1.5, 0, TAU); b.fill(); } }
      else if (look.pattern === 'grid') { b.strokeStyle = rgba(col.fg, 0.09); b.lineWidth = 1.5; b.beginPath(); for (let x = 30; x < LW; x += 60) { b.moveTo(x, 0); b.lineTo(x, LH); } for (let y = 30; y < LH; y += 60) { b.moveTo(0, y); b.lineTo(LW, y); } b.stroke(); }
      else if (look.pattern === 'scanlines') { b.fillStyle = rgba(col.fg, 0.05); for (let y = 0; y < LH; y += 6) b.fillRect(0, y, LW, 2); }
      else if (look.pattern === 'paper') { let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; for (let k = 0; k < 9000; k++) { b.fillStyle = rgba(col.fg, 0.03 + rnd() * 0.05); b.fillRect(rnd() * LW, rnd() * LH, 1 + rnd() * 2.5, 1 + rnd() * 2.5); } }
      const vs = look.vignette ?? 0.9; if (vs > 0) { const vg = b.createRadialGradient(LW / 2, LH / 2, LH * 0.25, LW / 2, LH / 2, Math.hypot(LW, LH) * 0.56); vg.addColorStop(0, rgba('#000000', 0)); vg.addColorStop(1, rgba('#000000', vs * 0.75)); b.fillStyle = vg; b.fillRect(0, 0, LW, LH); }
      if (look.ground !== 'none') { b.strokeStyle = rgba(col.fg, 0.55); b.lineWidth = look.ground === 'solid' ? 3 : 2.5; if (look.ground !== 'solid') b.setLineDash([20, 13]); b.beginPath(); b.moveTo(0, GY); b.lineTo(LW, GY); b.stroke(); }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; if ('filter' in ctx) ctx.filter = 'none'; ctx.drawImage(bgc, 0, 0);
    const cur = sceneAt(proj, clamp(t, 0, Math.max(0, duration(proj) - 1e-4))); if (!cur) return;
    const { i, lt, sc } = cur, last = i === proj.scenes.length - 1, tr = proj.transition || 'auto';
    const amb = look.ambient || 'none';
    if (amb !== 'none') { // things floating behind the scene; they rush past when the camera moves to the next scene
      const cam = t * 9 + 300 * (i + (i > 0 && lt < TI ? eo(lt / TI) - 1 : 0)), n = amb === 'pebbles' ? 16 : 46, span = LW + 300;
      ctx.setTransform(px, 0, 0, px, 0, 0); ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      for (let k = 0; k < n; k++) {
        const dp = 0.35 + hash(k + 1) * 0.9, x = mod(hash(k + 11) * span - cam * dp, span) - 150, y = hash(k + 21) * LH + Math.sin(t * 0.5 + k) * 10;
        if (amb === 'pebbles') { const r = 12 + hash(k + 31) * 34; ctx.strokeStyle = rgba(col.fg, 0.07 + 0.11 * dp); ctx.beginPath(); for (let q = 0; q < 7; q++) { const an = (q / 7) * TAU + hash(k) * 6 + t * 0.05 * (k % 2 ? 1 : -1), rr = r * (0.75 + 0.4 * hash(k * 7 + q)); ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.8); } ctx.closePath(); ctx.stroke(); }
        else { ctx.fillStyle = rgba(col.fg, 0.1 + 0.25 * hash(k + 41)); ctx.beginPath(); ctx.arc(x, mod(y - t * 14 * dp, LH), 1.5 + hash(k + 51) * 2.5, 0, TAU); ctx.fill(); }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // camera move between scenes: whip sideways, drop down, punch through, or a mix of all three
    const secAt = b => String((proj.scenes[b] && proj.scenes[b].section) || ''), kindAt = b => (tr === 'auto' ? ['drop', 'whip', 'zoom'][b % 3] : tr === 'stripes' && secAt(b) && secAt(b) === secAt(b + 1) ? 'cut' : tr); // stripes mark a new chapter; inside a chapter it is a plain cut
    let off = 0, offY = 0, zs = 1, alpha = 1, smear = 0, smearY = 0, ghost = 0, wipe = 0;
    const move = (k, p, arriving) => {
      if (k === 'whip') { off = arriving ? (1 - eo(p)) * LW * 0.22 : -ei(p) * LW * 0.22; smear = (arriving ? 1 - p : p) * 60; }
      else if (k === 'drop') { offY = arriving ? (1 - eo(p)) * LH * 0.17 : -ei(p) * LH * 0.17; smearY = (arriving ? 1 - p : p) * 54; }
      else if (k === 'zoom') { zs = arriving ? lerp(0.7, 1, eo(p)) : lerp(1, 1.45, ei(p)); ghost = arriving ? 1 - p : p; }
      else if (k === 'stripes') wipe = arriving ? 1 - p : p; // bands of colour sweep across, the cut happens under them
    };
    if (i > 0 && lt < TI) { const k = kindAt(i - 1); if (k !== 'cut') { const p = lt / TI; alpha = eo(p); move(k, p, true); } }
    if (!last && lt > sc.dur - TO) { const k = kindAt(i); if (k !== 'cut') { const p = (lt - (sc.dur - TO)) / TO; alpha = 1 - p; move(k, p, false); } }
    if (wipe > 0) alpha = 1;
    const L = layer.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, W, H);
    let z = 1 + (look.scenery === 'painted' ? 0.07 : 0.035) * (lt / sc.dur); (sc.lines || []).forEach(l => { const dt = lt - (+l.at || 0); if (l.text && dt >= 0 && (+l.at > 0.05 || i > 0)) z += 0.02 * Math.exp(-dt * 9); }); (sc.lines || []).forEach(l => { if (!l.wt || !l.text) return; const ws = parseCap(l.text, false), ai = ws.findIndex(w => w.some(q => q.acc)), ta = ai >= 0 && l.wt[ai] != null ? (+l.at || 0) + l.wt[ai] : -1, dt = lt - ta; if (ta >= 0 && dt >= 0) z += 0.03 * Math.exp(-dt * 8); }); /* and a hit on the highlighted word as the voice says it */ /* small punch when a line lands */
    const lowerBy = vert ? +look.lower || 0 : 0; // tall frames can sit the floor lower, so people fill the frame
    L.setTransform(px * sv * z, 0, 0, px * sv * z, px * (tx + 960 * sv * (1 - z)), px * (ty + lowerBy + 1031 * sv * (1 - z)));
    const cut = look.scenery === 'painted'; let Lc = L; if (cut) { if (!render._c) render._c = doc.createElement('canvas'); const cc = render._c; if (cc.width !== W || cc.height !== H) { cc.width = W; cc.height = H; } Lc = cc.getContext('2d'); Lc.setTransform(1, 0, 0, 1, 0, 0); Lc.clearRect(0, 0, W, H); Lc.setTransform(L.getTransform()); }
    const g = new G(Lc, proj, sc, lt, vert), gs = cut ? new G(L, proj, sc, lt, vert) : g, vis = V[sc.visual]; g.skipScenery = cut; if (vis) { try { if (cut && sc.visual === 'custom' && Array.isArray(sc.p.items)) sc.p.items.filter(e => e && /^scenery$/i.test(e.is || '')).slice(0, 1).forEach(e => drawScenery(gs, e.kind || e.name, e)); const scn = sc.p && sc.p.scenery, painted = look.scenery === 'painted', hasScn = sc.visual === 'custom' && (sc.p.items || []).some(e => e && /^scenery$/i.test(e.is || '')); if (scn) drawScenery(gs, typeof scn === 'object' ? scn.kind : scn, typeof scn === 'object' ? scn : null); else if (!hasScn && scn !== 'none') { const k = autoScenery(proj, sc, painted || PEOPLE.indexOf(sc.visual) >= 0 || hasPerson(sc.p && (sc.visual === 'custom' ? sc.p.items : sc.p.cast))); if (k) drawScenery(gs, k, null); } vis.draw(g); if (sc.visual !== 'custom' && Array.isArray(sc.p && sc.p.cast)) drawItems(g, sc.p.cast, stageOf(g), false, 0); } catch (e) { if (root.console) console.error(sc.visual, e); } }
    if (cut) { L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.shadowColor = 'rgba(45,28,12,0.2)'; L.shadowBlur = 5 * px; L.shadowOffsetX = 0; L.shadowOffsetY = 2 * px; L.drawImage(render._c, 0, 0); L.shadowColor = 'transparent'; const lg = L.createLinearGradient(0, 0, W, H); lg.addColorStop(0, 'rgba(255,226,170,0.38)'); lg.addColorStop(0.55, 'rgba(255,240,215,0)'); lg.addColorStop(1, 'rgba(70,40,15,0.32)'); L.globalCompositeOperation = 'soft-light'; L.fillStyle = lg; L.fillRect(0, 0, W, H); L.restore(); } // one light over people, graphics and place together // graphics and people sit in the place like cut paper, with a soft shadow on what is behind them
    if (g.shk > 0.2) { off += Math.sin(t * 97) * g.shk; offY += Math.cos(t * 83) * g.shk * 0.8; } // camera kick from a hit
    off += (i % 2 ? -1 : 1) * (look.scenery === 'painted' ? 34 : 16) * (lt / sc.dur - 0.5); // slow sideways drift so no frame sits still
    const blit = (a, dx, dy, s) => { ctx.globalAlpha = Math.min(1, a); if (!s || s === 1) ctx.drawImage(layer, dx * px, (dy || 0) * px); else ctx.drawImage(layer, (W - W * s) / 2 + dx * px, (H - H * s) / 2 + (dy || 0) * px, W * s, H * s); };
    // glow first (underneath), then the sharp layer on top so solid shapes keep their exact color
    ctx.globalCompositeOperation = 'lighter';
    if (glow <= 0.01) { /* flat styles: no bloom */ }
    else if ('filter' in ctx) { ctx.filter = `blur(${(8 * px).toFixed(1)}px)`; blit(alpha * 0.6 * glow, off, offY, zs); ctx.filter = `blur(${(28 * px).toFixed(1)}px)`; blit(alpha * 0.5 * glow, off, offY, zs); ctx.filter = 'none'; }
    else { ctx.imageSmoothingEnabled = true; const sm = render._s || (render._s = doc.createElement('canvas')); sm.width = Math.ceil(W / 14); sm.height = Math.ceil(H / 14); const q = sm.getContext('2d'); q.clearRect(0, 0, sm.width, sm.height); q.drawImage(layer, 0, 0, sm.width, sm.height); ctx.globalAlpha = Math.min(1, alpha * 0.6 * glow); ctx.drawImage(sm, off * px, offY * px, W, H); }
    ctx.globalCompositeOperation = 'source-over';
    if (smear > 1 || smearY > 1) { const n = 6; for (let k = 0; k < n; k++) { const f = k / (n - 1) - 0.5; blit((alpha / n) * 1.5, off + f * smear * 2.4 * Math.sign(off || 1), offY + f * smearY * 2.4 * Math.sign(offY || 1), zs); } }
    else { if (ghost > 0.02) for (let k = 3; k >= 1; k--) blit(alpha * 0.2 * ghost, off, offY, zs * (1 + k * 0.08 * ghost)); blit(alpha, off, offY, zs); }
    const pp = +look.paper || 0;
    if (pp > 0) { // printed-paper texture over the whole frame (fibres and soft blotches), still like a real page
      const pk = W + 'x' + H; if (!render._p || render._pk !== pk) { const pc = doc.createElement('canvas'); pc.width = W; pc.height = H; const q = pc.getContext('2d'); q.fillStyle = '#fff'; q.fillRect(0, 0, W, H); let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        for (let k = 0; k < 140; k++) { const x = rnd() * W, y = rnd() * H, r = (40 + rnd() * 220) * W / 1280, gr2 = q.createRadialGradient(x, y, 0, x, y, r); gr2.addColorStop(0, 'rgba(150,110,60,' + (0.015 + rnd() * 0.03) + ')'); gr2.addColorStop(1, 'rgba(150,110,60,0)'); q.fillStyle = gr2; q.fillRect(x - r, y - r, r * 2, r * 2); }
        q.lineWidth = Math.max(1, W / 1280); for (let k = 0; k < 2600; k++) { const x = rnd() * W, y = rnd() * H, an = rnd() * TAU, l = (4 + rnd() * 14) * W / 1280; q.strokeStyle = 'rgba(110,80,45,' + (0.05 + rnd() * 0.12) + ')'; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); q.stroke(); }
        for (let k = 0; k < 9000; k++) { q.fillStyle = 'rgba(90,60,30,' + (rnd() * 0.12) + ')'; q.fillRect(rnd() * W, rnd() * H, 1.5, 1.5); }
        const ed = q.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); ed.addColorStop(0, 'rgba(120,85,40,0)'); ed.addColorStop(1, 'rgba(120,85,40,0.22)'); q.fillStyle = ed; q.fillRect(0, 0, W, H); render._p = pc; render._pk = pk; }
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Math.min(1, pp); ctx.drawImage(render._p, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    const gr = look.grain || 0;
    if (gr > 0) { // film grain: a small noise tile, moved every frame
      if (!render._n) { const nc = doc.createElement('canvas'); nc.width = nc.height = 256; const q = nc.getContext('2d'), im = q.createImageData(256, 256); let sd = 11; for (let k = 0; k < im.data.length; k += 4) { sd = (sd * 16807) % 2147483647; im.data[k] = im.data[k + 1] = im.data[k + 2] = sd % 2 ? 255 : 0; im.data[k + 3] = (sd >> 8) % 44; } q.putImageData(im, 0, 0); render._n = nc; }
      const fr = Math.floor(t * 12), ts = 256 * Math.max(1, px * 2.2), ox = -Math.floor(hash(fr) * ts), oy = -Math.floor(hash(fr + 0.5) * ts); ctx.globalAlpha = Math.min(1, gr * 0.6);
      for (let y = oy; y < H; y += ts) for (let x = ox; x < W; x += ts) ctx.drawImage(render._n, x, y, ts, ts);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // captions
    ctx.setTransform(px, 0, 0, px, 0, 0); const cx = LW / 2, lines = (sc.lines || []).filter(l => l && l.text), endA = last ? 1 : 1 - ramp(lt, sc.dur - 0.2, 0.2);
    const hasK = !!sc.kicker, kt = +sc.kickerAt || 0.12, kA = ramp(lt, kt, 0.3) * endA;
    const cs = look.capScale || 1, up = look.caps !== false;
    if (look.scenery === 'painted' && look.capCard !== false && (lines.length || hasK)) { // a paper caption card, so words stay readable over any painted place
      const nL = Math.min(3, Math.max(1, ...lines.map(l => Math.ceil(String(l.text).length * (vert ? 0.62 : 0.5) * 50 * cs / (LW * (vert ? 0.86 : 0.92)) )))), y0 = vert ? (hasK ? 300 : 322) : (hasK ? 72 : 96), h = (hasK ? (vert ? 66 : 56) : 0) + nL * (vert ? 62 : 52) * cs + (vert ? 70 : 56), w = LW * (vert ? 0.92 : 0.8);
      ctx.save(); ctx.translate(cx, y0 + h / 2); ctx.rotate(-0.008); ctx.shadowColor = 'rgba(40,25,10,0.28)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.fillStyle = 'rgba(248,240,222,0.94)'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(60,40,20,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16); ctx.fillStyle = 'rgba(230,214,170,0.75)'; ctx.save(); ctx.rotate(-0.06); ctx.fillRect(-70, -h / 2 - 14, 140, 30); ctx.restore(); ctx.restore(); }
    if (hasK) drawCap(ctx, proj, sc.kicker, cx, vert ? 338 : 115, { plain: 1, size: (vert ? 22 : 19) * Math.sqrt(cs) * (up ? 1 : 1.25), wt: 600, ls: up ? 0.24 : 0.04, col: rgba(col.fg, 0.78), a: kA, maxW: LW * 0.88, blur: (1 - ramp(lt, kt, 0.3)) * 6 });
    lines.forEach((ln, k) => {
      const at = +ln.at || 0, nx = lines[k + 1] ? +lines[k + 1].at : 1e9, first = i === 0 && at <= 0.01, byWord = look.capAnim !== 'line' && !first, pin = first ? 1 : byWord ? +(lt >= at) : ramp(lt, at, 0.28), a = pin * (1 - ramp(lt, nx - 0.14, 0.14)) * endA;
      drawCap(ctx, proj, ln.text, cx, vert ? (hasK ? 412 : 385) : hasK ? 177 : 146, { wt: ln.wt, size: (vert ? 50 : 42) * cs, wt: 700, ls: look.capLs ?? 0.045, col: col.fg, a, maxW: LW * (vert ? 0.86 : 0.92), blur: (1 - pin) * 9, rev: byWord ? lt - at : null, step: Math.min(0.3, ((Math.min(nx, sc.dur) - at) * 0.7) / Math.max(1, wordCount(ln.text))) });
    });
    const secOf = s => String((s && (s.section || (s.p && s.p.section))) || '').trim();
    if (look.ribbon && secOf(sc)) { // a small ribbon in the corner that names the chapter
      let n = 0, prev = ''; for (let j = 0; j <= i; j++) { const q = secOf(proj.scenes[j]); if (q && q !== prev) n++; if (q) prev = q; }
      const fresh = i === 0 || secOf(proj.scenes[i - 1]) !== secOf(sc), inA = fresh ? eo(ramp(lt, 0.2, 0.45)) : 1, txt = ('Part ' + n + '  ·  ' + secOf(sc)).toUpperCase().slice(0, 40), fs = vert ? 26 : 21;
      ctx.save(); ctx.setTransform(px, 0, 0, px, 0, 0); ctx.font = (FONTW[proj.font] || 700) + ' ' + fs + 'px ' + (FONTS[proj.font] || FONTS.Inter); const tw = ctx.measureText(txt).width + fs * 1.5, xr = vert ? LW - 36 : LW - 34, y0 = vert ? 226 : 28, hh = fs * 1.9;
      ctx.translate((1 - inA) * (tw + 80), 0); ctx.shadowColor = 'rgba(40,25,10,0.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; ctx.fillStyle = col.accent; ctx.beginPath(); ctx.moveTo(xr - tw - hh * 0.45, y0); ctx.lineTo(xr, y0); ctx.lineTo(xr, y0 + hh); ctx.lineTo(xr - tw - hh * 0.45, y0 + hh); ctx.lineTo(xr - tw, y0 + hh / 2); ctx.closePath(); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = col.bg; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(txt, xr - fs * 0.75, y0 + hh / 2 + 1); ctx.restore();
    }
    if (wipe > 0.001) { ctx.save(); ctx.setTransform(px, 0, 0, px, 0, 0); ctx.globalAlpha = 1; const Dg = Math.hypot(LW, LH) + 60, n = 6, hb = Dg / n; ctx.translate(LW / 2, LH / 2); ctx.rotate(-0.42);
      for (let k = 0; k < n; k++) { const f = eio(clamp(wipe * 1.5 - (k / n) * 0.5)); if (f <= 0) continue; const y = -Dg / 2 + k * hb, w = Dg * f; ctx.fillStyle = k % 2 ? look.stripe || col.fg : col.accent; ctx.fillRect(k % 2 ? Dg / 2 - w : -Dg / 2, y - 1, w, hb + 2); }
      ctx.restore(); }
    if (proj.progress) { // thin progress bar: a known retention aid
      const tot = duration(proj), f = clamp(t / Math.max(0.01, tot)), bx = vert ? LW * 0.07 : 0, bw = vert ? LW * 0.86 : LW, by = vert ? 262 : 0, bh = vert ? 7 : 9;
      ctx.globalAlpha = 1; ctx.fillStyle = rgba(col.fg, 0.16); ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = col.accent; ctx.fillRect(bx, by, bw * f, bh);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function defaults(visual) { const p = {}; (V[visual].fields || []).forEach(f => (p[f.key] = f.def && typeof f.def === 'object' ? JSON.parse(JSON.stringify(f.def)) : f.def)); return p; }

  /* ---- shared helpers: used by the editor page and by make.js so both follow the same rules ---- */
  const wordCount = s => String(s || '').replace(/\*/g, '').trim().split(/\s+/).filter(Boolean).length;
  // What the voice should say, one entry per scene: the small line and the main lines read as one sentence.
  function script(proj) { return proj.scenes.map(s => [s.kicker].concat(s.lines.map(l => l.text)).map(x => String(x || '').replace(/\*/g, '').replace(/…$/, '').trim()).filter(Boolean).join(' ')); }
  // The retention rules a computer can check. voiceDur is optional (seconds of voiceover).
  const PEOPLE = ['crowd', 'hero', 'spotlight', 'row', 'inspect', 'grid', 'tracker', 'versus', 'clock', 'tags', 'quit', 'counter', 'luck', 'cta', 'steps', 'ring', 'timeline', 'tunnel', 'report', 'strings', 'class'];
  function check(proj, voiceDur) {
    const S = proj.scenes, D = duration(proj), out = [], add = (ok, msg, fix) => out.push({ ok: !!ok, msg, fix });
    const which = fn => S.map((s, i) => (fn(s, i) ? i + 1 : 0)).filter(Boolean).join(', '), f = S[0];
    add(f.visual === 'hook' || (f.lines[0].text && +f.lines[0].at <= 0.5), 'Words on screen in the first half second', 'Scene 1: set the main line to appear at 0, or start with a Big statement scene.');
    add(f.dur <= 4.5, 'First scene is 4.5 seconds or shorter', 'Scene 1 runs ' + (+f.dur).toFixed(1) + ' seconds. Shorten or split it.');
    add(D >= 15 && D <= 45, 'Total length between 15 and 45 seconds', 'This one runs ' + D.toFixed(0) + ' seconds.');
    let w = which(s => s.dur > 6); add(!w, 'No scene longer than 6 seconds', 'Too long: scene ' + w + '.');
    w = which(s => s.lines.some(l => wordCount(l.text) > 12)); add(!w, 'Every line is 12 words or fewer', 'Too wordy: scene ' + w + '.');
    w = which(s => s.lines.some(l => l.text && !/\*[^*]+\*/.test(l.text))); add(!w, 'Every main line has a highlighted word', 'Add *stars* around a word in scene ' + w + '.');
    w = which((s, i) => i && s.visual === S[i - 1].visual && s.visual !== 'custom'); add(!w, 'No scene type twice in a row', 'Change the type of scene ' + w + '.');
    const n = {}; S.forEach(s => (n[s.visual] = (n[s.visual] || 0) + 1)); const over = Object.keys(n).filter(k => n[k] > 2 && k !== 'tunnel' && k !== 'custom').map(k => V[k].name).join(', '); add(!over, 'No scene type used more than twice', 'Used three times or more: ' + over + '.');
    add(D / S.length <= 4.3, 'A new picture at least every 4 seconds on average', 'Scenes average ' + (D / S.length).toFixed(1) + ' seconds.');
    add(S.some(s => ['counter', 'bars', 'ring', 'compare', 'hook', 'grid', 'tracker', 'tunnel', 'house', 'report'].indexOf(s.visual) >= 0 || (s.visual === 'custom' && (s.p.items || []).some(e => e && /^(number|bar|ring|dots)$/.test(e.is || '')))), 'At least one scene built on a number', 'Add a Big statement, Bar chart, Percent ring, A versus B or Digging scene.');
    const hasChar = L => (Array.isArray(L) ? L : []).some(e => e && (/^(person|crowd)$/.test(e.is || '') || hasChar(e.items))), people = s => (s.visual === 'custom' ? hasChar(s.p.items) : PEOPLE.indexOf(s.visual) >= 0 || hasChar(s.p.cast));
    w = S.filter(people).length; add(w >= Math.ceil(S.length * 0.6), 'A character is on screen in most scenes', 'Only ' + w + ' of ' + S.length + ' scenes show a character. Add a person to the picture, or a "cast" list to a ready-made scene.');
    add(S[S.length - 1].visual === 'cta', 'Ends on a follow card', 'Add a Follow button scene at the end.');
    if (voiceDur) add(Math.abs(D - voiceDur) <= 1.2, 'Video length matches the voiceover', 'The video is ' + D.toFixed(1) + ' seconds and the voice is ' + (+voiceDur).toFixed(1) + '. Fit the scenes to the voice.');
    return out;
  }
  // Give every scene a new length, keeping each caption at the same relative moment.
  function retime(proj, durs) {
    proj.scenes.forEach((s, i) => { const d = clamp(+durs[i] || s.dur, 0.8, 30), k = d / s.dur; s.lines.forEach(l => (l.at = +clamp(l.at * k, 0, Math.max(0, d - 0.6)).toFixed(2))); s.kickerAt = +((s.kickerAt || 0) * k).toFixed(2); s.dur = +d.toFixed(2); });
    return proj;
  }
  // Time every scene to the speed the words will be spoken at (words per second), before any voice exists.
  const SLOW = { counter: 3.4, bars: 3.6, steps: 3.6, timeline: 3.6, grid: 3.6, tracker: 3.8, compare: 3.2, ring: 3.2, curve: 3.2, cta: 2.8, hook: 2.2, tunnel: 3.4, house: 4, report: 3.8, habits: 3.8, equation: 3.2, strings: 3.6, class: 3.2, custom: 3.4 };
  function autotime(proj, wps) {
    wps = wps || 2.9;
    proj.scenes.forEach((s, i) => { let t = 0; s.kickerAt = 0; if (s.kicker) t += wordCount(s.kicker) / wps + 0.1; else if (i && s.visual !== 'hook') t = 0.15;
      s.lines.forEach(l => { if (!l.text) return; l.at = +t.toFixed(2); t += wordCount(l.text) / wps + 0.1; });
      s.dur = +clamp(Math.max(t + 0.45, SLOW[s.visual] || 2.6), 0.8, 30).toFixed(2); });
    return proj;
  }
  // Loudness every 20 ms, then the quiet gaps between phrases. chs = one Float32Array per channel.
  function analyseAudio(chs, sr, length) {
    const win = Math.max(1, Math.round(sr * 0.02)), m = Math.floor(length / win), env = new Float32Array(m);
    for (let i = 0; i < m; i++) { let s = 0, k = 0; const o = i * win; for (let j = 0; j < win; j += 4) { let v = 0; for (let c = 0; c < chs.length; c++) v += chs[c][o + j]; v /= chs.length; s += v * v; k++; } env[i] = Math.sqrt(s / k); }
    const sorted = Array.prototype.slice.call(env).sort((x, y) => x - y), thr = Math.max(0.004, (sorted[Math.floor(m * 0.95)] || 0) * 0.1);
    let first = 0; while (first < m && env[first] < thr) first++; let last = m - 1; while (last > first && env[last] < thr) last--;
    const pauses = []; let run = -1; for (let i = first; i <= last; i++) { if (env[i] < thr) { if (run < 0) run = i; } else if (run >= 0) { const len = (i - run) * 0.02; if (len >= 0.14) pauses.push({ t: ((run + i) / 2) * 0.02, len }); run = -1; } }
    return { pauses, start: first * 0.02, end: Math.max(first * 0.02 + 0.5, (last + 1) * 0.02) };
  }
  // Move each scene change to the best real pause near where the words say it should be. Returns how many landed on a pause.
  function fitVoice(proj, an, voiceDur) {
    const S = proj.scenes, n = S.length, w = S.map(s => Math.max(2, wordCount(s.kicker + ' ' + s.lines.map(l => l.text).join(' ')))), cuts = []; let left = w.reduce((x, y) => x + y, 0), prev = 0, from = an.start, snapped = 0;
    for (let i = 0; i < n - 1; i++) {
      const len = ((an.end - from) * w[i]) / left, exp = from + len, slack = Math.max(0.8, 0.45 * len); left -= w[i]; let best = null, bs = 1e9;
      an.pauses.forEach(p => { if (p.t < prev + 0.9 || p.t > an.end - 0.9 * (n - 1 - i) || Math.abs(p.t - exp) > slack) return; const sc = Math.abs(p.t - exp) - 0.8 * Math.min(p.len, 0.8); if (sc < bs) { bs = sc; best = p; } });
      const c = Math.max(prev + 0.9, best ? best.t : exp); if (best) snapped++; cuts.push(c); prev = c; from = c;
    }
    const ends = cuts.concat([Math.max(prev + 0.9, voiceDur + 0.25)]); retime(proj, ends.map((c, i) => c - (i ? ends[i - 1] : 0))); return snapped;
  }
  function coerce(visual, p) { // keep every field the right type, whatever a pasted or drafted project contains
    const out = defaults(visual); p = p && typeof p === 'object' ? p : {};
    (V[visual].fields || []).forEach(f => { const v = p[f.key]; if (v == null) return;
      out[f.key] = f.type === 'json' ? (Array.isArray(v) ? v : (() => { try { const q = JSON.parse(v); return Array.isArray(q) ? q : out[f.key]; } catch (e) { return out[f.key]; } })()) : f.type === 'num' ? (v !== '' && isFinite(+v) ? +v : f.def) : f.type === 'bool' ? (v === true || v === 'true') : f.type === 'icon' ? (v === 'none' || ICONS.indexOf(v) >= 0 ? v : f.def) : f.type === 'select' ? (f.options.indexOf(v) >= 0 ? v : f.def) : String(v); });
    for (const k in p) if (!(k in out) && p[k] != null) out[k] = p[k];
    return out;
  }
  function applyStyle(proj, id) { const st = STYLES[id] || STYLES.neon; proj.style = STYLES[id] ? id : 'neon'; proj.colors = Object.assign({}, st.colors); proj.font = st.font; proj.transition = st.transition; proj.look = Object.assign({}, LOOK0, st.look); return proj; }
  function normalize(proj) {
    proj = proj || {}; proj.title = proj.title || 'Untitled'; proj.aspect = proj.aspect === '9:16' ? '9:16' : '16:9'; proj.style = STYLES[proj.style] ? proj.style : 'neon'; const st = STYLES[proj.style];
    proj.font = FONTS[proj.font] ? proj.font : st.font; proj.colors = Object.assign({}, st.colors, proj.colors || {}); proj.transition = proj.transition || st.transition;
    proj.look = Object.assign({}, LOOK0, st.look, proj.look || {}); if (proj.dots === false) proj.look.pattern = 'none'; delete proj.dots; proj.progress = !!proj.progress;
    proj.scenes = (proj.scenes || []).filter(s => s && V[s.visual]).map(s => Object.assign({ visual: s.visual, dur: clamp(+s.dur || 3, 0.8, 30), kicker: s.kicker || '', kickerAt: +s.kickerAt || 0, section: String(s.section || '').slice(0, 32),
      lines: (s.lines && s.lines.length ? s.lines : [{ text: '', at: 0 }]).slice(0, 2).map(l => Object.assign({ text: l.text || '', at: +l.at || 0 }, Array.isArray(l.wt) ? { wt: l.wt.slice(0, 40).map(x => +x || 0) } : {})), p: coerce(s.visual, s.p) }, Array.isArray(s.words) ? { words: s.words.slice(0, 120).map(x => ({ w: String((x && x.w) || ''), t: +(x && x.t) || 0 })) } : {}));
    return proj;
  }
  /* The custom animation language in a form that can be pasted into a prompt. CUSTOM-ANIMATION.md is the longer guide. */
  const CUSTOM_SPEC = "Custom animation (\"visual\":\"custom\"): p.items is a list of parts, drawn in order (later parts on top). Use it to draw a picture made for this exact line.\nStage: x and y run from 0 to 100, left to right and top to bottom. y 100 is the ground and y 0 is just under the captions. The stage is a little wider than it is tall. Sizes are in units where 100 units = the stage height (a person is about 30 tall).\nEvery part: {\"is\": kind, \"x\": 50, \"y\": 50, \"at\": when it appears, \"in\": entrance, \"out\": when it leaves, \"loop\": idle motion, \"move\": [{\"at\": when, \"x\": 60, \"y\": 40, \"scale\": 1.2, \"rot\": 15, \"alpha\": 1, \"dur\": 0.6}], \"fx\": \"sparks,shake,ring,glow\", \"color\": \"accent\" or \"fg\" or \"mute\" or \"bg\"}. Only \"is\" is required.\nTimes (\"at\", \"out\", \"strike\", \"start\", \"open\"): \"line1\" or \"line2\" (the moment that caption line starts), optionally \"line1+0.4\"; or a share of the scene such as \"30%\"; or \"word:guilders\" (the moment the voice says that word; best for the thing the line is about); or plain seconds. Prefer line anchors and percentages, because scene lengths are set afterwards.\nEntrances (\"in\"): pop, fade, draw (the line draws itself), grow, left, right, up, down, drop, none. Idle motion (\"loop\"): bob, float, pulse, spin, swing, shake, blink.\nKinds and their extra fields:\n- person: a realistic adult (flat vector, about 7 heads tall, real clothes and skin tones). h, dir (\"left\"), color (accent = the main character, fg = other people), mood (happy, sad, shock, angry, think, worried, smug, sleep), act (point, wave, cheer, jump, walk, run, talk, think, shrug, hips, cross, facepalm, hold, nod, no, slump, dig), says (a speech bubble of 1 to 4 words; the mouth moves while it types), saysSide (\"left\" or \"right\"), emote (\"!\", \"?\", \"$\", \"zzz\" above the head), look ([x, y] on the stage to look at, or \"left\", \"right\", \"up\", \"down\"), hat (helmet, cap, crown, grad; for history also tophat, tricorn, plume (crested soldier helmet), laurel, wrap (turban)), hair (short, side, long, bun, curly, spiky, bald), hairCol (\"#hex\"), skin (1 light to 6 dark), outfit (shirt, tee, suit, coat, dress; for history also tunic, toga, robe, armor, uniform), beard (true), glasses (true), name (a small label under the feet). Set the main character's look once for the whole video in the project's \"hero\": {\"outfit\":\"suit\",\"hair\":\"side\",\"skin\":2}; other people get a varied look automatically. \"then\": [{\"at\": \"line1\", \"mood\": \"shock\", \"act\": \"\", \"says\": \"WAIT, WHAT?\", \"emote\": \"!\"}] changes the character at that moment, so it reacts to what happens. A person that has a \"move\" walks there by itself. Stands with the feet at x,y; keep x between 12 and 88.\n- crowd: n, h\n- icon: name (an icon name from the list), size\n- coin: size, symbol, spin (true)\n- text: text, size (about 3 to 6), w (widest it may be), color\n- tag: text, size, style (outline, solid, accent), strike (the time it gets crossed out)\n- number: from, to, prefix, suffix, decimals, size (about 12 to 22), over (seconds it counts for), start\n- box: w, h, r (corner), fill, dash. circle: r, fill, dash. ring: r, percent\n- bar: w, h, value (text above), label (text below). It grows up from x,y\n- dots: cols, rows, gap, r, on (how many light up)\n- line and arrow: to [x, y], or len with angle (degrees, 0 = right, -90 = up); bend (-0.3 to 0.3), dash, flow (moving dashes), center (true makes it turn around its middle)\n- path: pts [[x,y],...] as stage positions, smooth, close, fill, dash, flow. blob: r, seed, squash (a rock or cloud outline)\n- bubble: w, h, text, tail (\"left\", \"right\" or \"none\")\n- stamp: text, size. star: size. glow: r. sparks: n, r. burst: symbol. chest: size, open (time). shake: amount (a camera kick at \"at\")\n- scenery: kind (city, night, street, office, bank, lab, factory, classroom, mine, market, home, courtroom, stage, sea, desert, ancient, castle, farm, forest, hills, sky, runway, space; for history also town, village, port, camp, tavern, hall, study). Put it first in the list: the place where the scene happens, drawn in layers with depth. Pick the place that matches what the character is doing (digging: mine, a lawsuit: courtroom, selling: market). Scenes with people get a matching place automatically when you leave it out; \"none\" turns it off. A ready-made scene takes \"scenery\":\"city\" in its p instead\n- photo: src (a key in the project's \"assets\"; only use keys that exist), w, frame (polaroid, sticker, round, none), caption, tint (none, mono, duo), rot. Drops in and slowly zooms\n- group: items (parts placed in units relative to the group's x,y), so the whole group moves, turns, pulses or slides in as one object\n- any part can take \"repeat\": {\"n\": 5, \"dx\": 6, \"dy\": 0, \"stagger\": 0.08} to make a row of copies\nCharacters tell the story: pick one main character for the whole video (same color accent, same hat or hair in every scene) and put it in nearly every custom scene, next to the thing the line talks about. It looks at that thing, and it reacts on \"line1\" with a \"then\" step (think to shock, worried to happy, and so on). Other people are color fg. At most one speech bubble at a time, 1 to 4 words, and it adds a feeling or a reaction instead of repeating the caption. Leave about 12 units of free space above a head for the bubble. A ready-made scene can take characters too: put person parts in \"p\":{\"cast\":[...]}, standing in a free corner.\nDepth (cutpaper style): a person with a smaller y stands further back and is drawn smaller and hazier, so stage the main character near y 100 and two to five others at y 70 to 95; give every scene a short \"section\" (the chapter name) next to \"visual\".\nRules for custom scenes: 6 to 16 parts. Build one clear picture of the thing the line talks about out of simple shapes, and make it DO something on \"line1\": move, grow, break, count up or get crossed out. Words inside the picture are labels of 1 to 4 words. Keep everything between x 4 and 96 and between y 8 and 98. Use \"accent\" only for the thing the viewer should look at.\nExample (a seesaw tipping to the heavy side): {\"visual\":\"custom\",\"kicker\":\"\",\"lines\":[{\"text\":\"Debt always *outweighs* savings.\"}],\"p\":{\"items\":[{\"is\":\"path\",\"pts\":[[44,98],[50,80],[56,98]],\"close\":true},{\"is\":\"group\",\"x\":50,\"y\":79,\"move\":[{\"at\":\"line1\",\"rot\":14,\"dur\":0.7}],\"items\":[{\"is\":\"line\",\"x\":-40,\"y\":0,\"to\":[40,0],\"width\":0.7},{\"is\":\"coin\",\"x\":-32,\"y\":-6,\"size\":10},{\"is\":\"box\",\"x\":32,\"y\":-8,\"w\":14,\"h\":14,\"fill\":\"accent\"},{\"is\":\"text\",\"x\":32,\"y\":-8,\"text\":\"DEBT\",\"size\":3,\"color\":\"bg\"}]},{\"is\":\"person\",\"x\":14,\"y\":98,\"h\":24,\"mood\":\"happy\",\"look\":[50,70],\"then\":[{\"at\":\"line1+0.3\",\"mood\":\"shock\",\"says\":\"MY SAVINGS!\"}]},{\"is\":\"tag\",\"text\":\"SAVINGS\",\"x\":22,\"y\":52,\"at\":0.4},{\"is\":\"number\",\"x\":76,\"y\":40,\"from\":0,\"to\":24,\"suffix\":\"%\",\"size\":14,\"at\":\"line1\",\"label\":\"INTEREST\"}]}}";
  root.PSP = { CUSTOM_SPEC, preload, SCENERY, render, duration, startOf, sceneAt, VISUALS: V, ICONS, FONTS, STYLES, applyStyle, defaults, normalize, check, script, retime, autotime, analyseAudio, fitVoice };
})(typeof window !== 'undefined' ? window : globalThis);
