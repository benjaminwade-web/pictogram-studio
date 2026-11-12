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
  const LOOK0 = { pattern: 'dots', glow: 1, figure: 'solid', cap: 'color', caps: true, ground: 'dashed', vignette: 0.9, capScale: 1, capLs: 0.045, ambient: 'none', grain: 0, capAnim: 'words' };
  const STYLES = {
    neon: { name: 'Neon terminal', colors: { bg: '#050606', fg: '#f4f4f2', accent: '#4dff88' }, font: 'Inter', transition: 'auto', look: { ambient: 'pebbles', grain: 0.3 } },
    whiteboard: { name: 'Whiteboard', colors: { bg: '#f1f3f5', fg: '#16191d', accent: '#ff4b3e' }, font: 'Fredoka', transition: 'auto', look: { pattern: 'grid', glow: 0, figure: 'outline', cap: 'underline', caps: false, ground: 'solid', vignette: 0, capScale: 1.08, capLs: 0.01 } },
    blueprint: { name: 'Blueprint', colors: { bg: '#0c2f66', fg: '#e8f1ff', accent: '#ffd84d' }, font: 'JetBrains Mono', transition: 'drop', look: { ambient: 'dust', pattern: 'grid', glow: 0.3, figure: 'outline', cap: 'color', caps: true, ground: 'solid', vignette: 0.5, capScale: 0.84, capLs: 0 } },
    newsroom: { name: 'Newsroom', colors: { bg: '#101216', fg: '#ffffff', accent: '#ff3b3b' }, font: 'Bebas Neue', transition: 'cut', look: { pattern: 'none', glow: 0.15, figure: 'solid', cap: 'box', caps: true, ground: 'solid', vignette: 0.6, capScale: 1.45, capLs: 0.03 } },
    arcade: { name: 'Arcade CRT', colors: { bg: '#130a26', fg: '#f3e8ff', accent: '#3df5ff' }, font: 'Space Grotesk', transition: 'auto', look: { ambient: 'dust', grain: 0.3, pattern: 'scanlines', glow: 1.3, figure: 'solid', cap: 'color', caps: true, ground: 'dashed', vignette: 0.9 } },
    magazine: { name: 'Magazine', colors: { bg: '#18140f', fg: '#f3eadc', accent: '#ff8a3d' }, font: 'DM Serif Display', transition: 'fade', look: { grain: 0.45, pattern: 'paper', glow: 0.12, figure: 'solid', cap: 'underline', caps: false, ground: 'solid', vignette: 0.7, capScale: 1.18, capLs: 0 } },
    pop: { name: 'Sticker pop', colors: { bg: '#ffd84d', fg: '#15151a', accent: '#2f55ff' }, font: 'Archivo', transition: 'zoom', look: { pattern: 'dots', glow: 0, figure: 'solid', cap: 'box', caps: true, ground: 'solid', vignette: 0, capScale: 1.02, capLs: 0.02 } },
  };
  const ICONS = ['chest', 'coin', 'diamond', 'bar', 'friends', 'bulb', 'star', 'dice', 'pin', 'house', 'bank', 'bag', 'doc', 'chart', 'heart', 'phone', 'rocket', 'book', 'globe', 'trophy', 'flame', 'bolt', 'target'];

  /* ---------- drawing kit (one instance per frame) ---------- */
  class G {
    constructor(ctx, proj, sc, t, vert) {
      this.ctx = ctx; this.t = t; this.d = sc.dur; this.P = sc.p || {}; this.vert = vert;
      const L = sc.lines || [];
      this.T1 = L[0] ? +L[0].at || 0 : 0; this.hasL2 = !!(L[1] && L[1].text);
      this.T2 = this.hasL2 ? +L[1].at : Math.min(sc.dur * 0.6, this.T1 + 1.4);
      this.fg = proj.colors.fg; this.ac = proj.colors.accent; this.bg = proj.colors.bg;
      this.ff = FONTS[proj.font] || FONTS.Inter; this.fw = FONTW[proj.font] || 0; this.GY = 1031; this.kx = vert ? 0.56 : 1;
      const lk = proj.look || LOOK0; this.caps = lk.caps !== false; this.outline = lk.figure === 'outline'; this.glow = Math.min(1, lk.glow ?? 1);
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
    person(x, h, o = {}) { // a character: pawn body, a face that blinks and shows a mood, arms that gesture, feet that walk
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
      const lean = q > 0.5 && q < 0.85 ? 0.03 : 0; this.person(x, h, { col, a, y: by, lean, dir, mood: o.mood ?? 'angry', look: [dir * 0.6, 0.15], hat: 'helmet', hatCol: this.fg, arms: false, st: o.st });
      const th = q < 0.5 ? lerp(0.15, -1.9, eio(q / 0.5)) : q < 0.7 ? lerp(-1.9, 0.2, ei((q - 0.5) / 0.2)) : 0.2 - 0.3 * Math.sin(((q - 0.7) / 0.3) * Math.PI) * (1 - (q - 0.7) / 0.3) - 0.05 * ((q - 0.7) / 0.3);
      const sx = x + dir * h * 0.1, sy = by - h * 0.48, La = h * 0.36, hx = sx + dir * Math.cos(th) * La, hy2 = sy + Math.sin(th) * La, ph = th - 0.95, Lh = h * 0.42, bx = hx + dir * Math.cos(ph) * Lh, byy = hy2 + Math.sin(ph) * Lh, Lp = h * 0.2;
      const ux = dir * Math.cos(ph), uy = Math.sin(ph), nx = -dir * Math.sin(ph), ny = Math.cos(ph);
      c.save(); c.globalAlpha *= a; c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = this.fg; c.lineWidth = Math.max(3, h * 0.028); c.beginPath(); c.moveTo(hx - ux * h * 0.06, hy2 - uy * h * 0.06); c.lineTo(bx, byy); c.stroke();
      c.lineWidth = Math.max(4, h * 0.042); c.beginPath(); c.moveTo(bx + nx * Lp - ux * Lp * 0.25, byy + ny * Lp - uy * Lp * 0.25); c.quadraticCurveTo(bx + ux * Lp * 0.3, byy + uy * Lp * 0.3, bx - nx * Lp - ux * Lp * 0.25, byy - ny * Lp - uy * Lp * 0.25); c.stroke();
      c.strokeStyle = col; c.lineWidth = h * 0.11; c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy2); c.stroke();
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
        c.save(); c.globalAlpha *= a * dim; c.strokeStyle = col; c.lineWidth = isW ? 4 + 3 * win : 4; g.rr(x - pw / 2, cy - ph / 2 + (1 - a) * 40, pw, ph, 18); c.stroke(); c.restore();
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
  const when = (g, v, def) => {
    if (v == null || v === '') return def; if (typeof v === 'number') return isFinite(v) ? v : def;
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
      const strokey = /^(line|arrow|path|box|circle|ring|blob|dots)$/.test(kind), ent = String(e.in || (strokey ? 'draw' : /^(icon|coin|tag|star|chest|bubble|burst)$/.test(kind) ? 'pop' : kind === 'bar' ? 'grow' : kind === 'stamp' || kind === 'sparks' || kind === 'group' ? 'none' : 'fade'));
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
          const h = num(e.h, 30) * U, walkNow = going && !inGroup && e.walk !== false, dir = walkNow ? going : cur.dir === 'left' || cur.dir === -1 ? -1 : 1, act = walkNow ? 'walk' : String(cur.act || ''), mood = String(cur.mood || ''), pc = col || g.ac, st = walkNow ? g.t : g.t - st0, says = cur.says ? String(cur.says).toUpperCase() : '', sayT = g.t - (cur === e ? when(g, e.saysAt, at + 0.3) : st0 + 0.1), talking = act === 'talk' || (!!says && sayT > 0 && sayT < 0.4 + says.length * 0.075);
          let look = null; if (Array.isArray(cur.look)) { const q = PX(cur.look[0], cur.look[1]), dx = q[0] - px, dy = q[1] - (py - h * 0.8), dd = Math.hypot(dx, dy) || 1; look = [dx / dd, dy / dd]; } else if (cur.look) look = { left: [-0.8, 0], right: [0.8, 0], up: [0, -0.9], down: [0, 0.9], camera: [0, 0] }[cur.look] || null;
          if (e.glow !== false) g.halo(0, -h * 0.5, h * 0.95, 0.14, pc);
          if (act === 'dig') g.worker(0, h, { y: 0, col: pc, dir, swing: mod(st, 0.62) / 0.62, beam: e.beam === false ? 0 : 0.8, mood: mood || 'angry' });
          else g.person(0, h, { y: 0, col: pc, gl: e.glasses == null ? false : !!e.glasses, dir, act: talking && !act ? 'talk' : act, mood, st, talk: talking, arms: e.arms !== false, lean: num(cur.lean, 0), hat: e.hat, hair: e.hair, look, feet: e.feet !== false });
          if (act === 'cheer') for (let k = 0; k < 4; k++) g.sparkle(Math.cos(k * 1.7 + g.t) * h * 0.6, -h * 0.95 + Math.sin(k * 2.1 + g.t * 2) * h * 0.25, h * 0.05, 0.8);
          if (e.name) g.text(String(e.name), 0, 2.6 * U, { size: 1.7 * U, a: 0.8 });
          const sayEnd = 2.6 + says.length * 0.1; if (says && sayT > 0 && sayT < sayEnd + 0.25) { c.save(); c.globalAlpha *= 1 - clamp((sayT - sayEnd) / 0.25); const sz = num(e.saysSize, 3.4) * U, side = cur.saysSide === 'left' ? -1 : cur.saysSide === 'right' ? 1 : dir; g.font(700, sz, 0.08); const tw = c.measureText(says).width, bw2 = tw + sz * 2, bh2 = sz * 2.5, bs = back(clamp(sayT / 0.3)), bx0 = side * (h * 0.3 + bw2 * 0.42), bx = inGroup ? bx0 : clamp(px + bx0 * s, stg.xl + bw2 / 2 + 12, stg.xr - bw2 / 2 - 12) / 1 - px, hb = e.hat ? 1.2 : e.hair ? 1.14 : 1.08, byy = -h * hb - bh2 / 2, shown = says.slice(0, Math.ceil(sayT / 0.03));
            c.save(); c.translate(side * h * 0.2, -h * (hb - 0.1)); c.scale(bs, bs); c.translate(bx - side * h * 0.2, byy + h * (hb - 0.1)); c.fillStyle = g.bg; c.strokeStyle = g.fg; c.lineWidth = Math.max(2.5, 0.4 * U); c.lineJoin = 'round'; g.rr(-bw2 / 2, -bh2 / 2, bw2, bh2, bh2 * 0.42); c.fill(); c.stroke();
            const tx0 = clamp(side * h * 0.2 - bx, -bw2 * 0.36, bw2 * 0.36); c.beginPath(); c.moveTo(tx0 - sz * 0.5, bh2 / 2 - 2); c.lineTo(tx0 - side * sz * 0.5, bh2 / 2 + sz * 0.9); c.lineTo(tx0 + sz * 0.5, bh2 / 2 - 2); c.fill(); c.stroke(); g.font(700, sz, 0.08); c.fillStyle = g.fg; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(shown, -tw / 2, 1); c.restore(); c.restore(); }
          const em = cur.emote ? String(cur.emote).slice(0, 3) : ''; if (em && st >= 0) { const zz = /^z+$/i.test(em), ex0 = -dir * h * 0.3, ey0 = -h * 1.12; if (zz) for (let k = 0; k < 3; k++) { const ph = mod(g.t * 0.5 + k / 3, 1); g.text('Z', ex0 - dir * ph * h * 0.25, ey0 - ph * h * 0.4, { size: h * (0.09 + 0.07 * ph), a: Math.sin(ph * Math.PI), col: g.fg, wt: 800, ls: 0 }); } else { const ps = back(clamp(st / 0.3)); c.save(); c.translate(ex0, ey0 + Math.sin(g.t * 5) * h * 0.02); c.scale(ps, ps); c.rotate(-dir * 0.14); g.text(em.toUpperCase(), 0, 0, { size: h * 0.3, col: pc === g.ac ? g.fg : g.ac, wt: 900, ls: 0 }); c.restore(); } }
          break; }
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
        case 'number': { const dec = clamp(num(e.decimals, 0) | 0, 0, 3), p = eo(clamp((g.t - when(g, e.start, at)) / Math.max(0.1, num(e.over, 1.2)))), v = lerp(num(e.from, 0), num(e.to, 100), p), sz = size(13); g.font(800, sz, 0); c.fillStyle = col || g.ac; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(e.prefix || '') + (dec ? v.toFixed(dec) : fmt(v)) + String(e.suffix || ''), 0, 0); if (e.label) g.text(e.label, 0, sz * 0.8, { size: Math.max(13, sz * 0.18), a: 0.85 }); break; }
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
      ln.forEach((wd, i) => { if (i) x += space; const wa = o.rev == null ? 1 : clamp((o.rev - wi * o.step) / 0.13); wi++; c.globalAlpha = a * wa; wd.forEach(p => {
        const yy = y + li * size * 1.34 + (1 - eo(wa)) * size * 0.24; c.shadowColor = gl > 0 ? rgba(p.acc ? col.accent : col.fg, 0.4) : 'transparent';
        if (p.acc && mode === 'box') { c.save(); c.shadowColor = 'transparent'; c.fillStyle = col.accent; c.fillRect(x - size * 0.16, yy - size * 0.62, p.w - ls + size * 0.32, size * 1.2); c.restore(); c.fillStyle = col.bg; c.shadowColor = 'transparent'; }
        else if (p.acc && mode === 'underline') { c.save(); c.shadowColor = 'transparent'; c.fillStyle = col.accent; c.fillRect(x - size * 0.04, yy + size * 0.5, p.w - ls + size * 0.08, size * 0.14); c.restore(); c.fillStyle = o.col; }
        else c.fillStyle = p.acc ? col.accent : o.col;
        c.fillText(p.s, x, yy); x += p.w; }); });
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
    const look = proj.look || LOOK0, glow = Math.max(0, look.glow ?? 1);
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
    const kindAt = b => (tr === 'auto' ? ['drop', 'whip', 'zoom'][b % 3] : tr);
    let off = 0, offY = 0, zs = 1, alpha = 1, smear = 0, smearY = 0, ghost = 0;
    const move = (k, p, arriving) => {
      if (k === 'whip') { off = arriving ? (1 - eo(p)) * LW * 0.22 : -ei(p) * LW * 0.22; smear = (arriving ? 1 - p : p) * 60; }
      else if (k === 'drop') { offY = arriving ? (1 - eo(p)) * LH * 0.17 : -ei(p) * LH * 0.17; smearY = (arriving ? 1 - p : p) * 54; }
      else if (k === 'zoom') { zs = arriving ? lerp(0.7, 1, eo(p)) : lerp(1, 1.45, ei(p)); ghost = arriving ? 1 - p : p; }
    };
    if (i > 0 && lt < TI) { const k = kindAt(i - 1); if (k !== 'cut') { const p = lt / TI; alpha = eo(p); move(k, p, true); } }
    if (!last && lt > sc.dur - TO) { const k = kindAt(i); if (k !== 'cut') { const p = (lt - (sc.dur - TO)) / TO; alpha = 1 - p; move(k, p, false); } }
    const L = layer.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, W, H);
    let z = 1 + 0.035 * (lt / sc.dur); (sc.lines || []).forEach(l => { const dt = lt - (+l.at || 0); if (l.text && dt >= 0 && (+l.at > 0.05 || i > 0)) z += 0.02 * Math.exp(-dt * 9); }); /* small punch when a line lands */
    L.setTransform(px * sv * z, 0, 0, px * sv * z, px * (tx + 960 * sv * (1 - z)), px * (ty + 1031 * sv * (1 - z)));
    const g = new G(L, proj, sc, lt, vert), vis = V[sc.visual]; if (vis) { try { vis.draw(g); if (sc.visual !== 'custom' && Array.isArray(sc.p && sc.p.cast)) drawItems(g, sc.p.cast, stageOf(g), false, 0); } catch (e) { if (root.console) console.error(sc.visual, e); } }
    if (g.shk > 0.2) { off += Math.sin(t * 97) * g.shk; offY += Math.cos(t * 83) * g.shk * 0.8; } // camera kick from a hit
    off += (i % 2 ? -1 : 1) * 16 * (lt / sc.dur - 0.5); // slow sideways drift so no frame sits still
    const blit = (a, dx, dy, s) => { ctx.globalAlpha = Math.min(1, a); if (!s || s === 1) ctx.drawImage(layer, dx * px, (dy || 0) * px); else ctx.drawImage(layer, (W - W * s) / 2 + dx * px, (H - H * s) / 2 + (dy || 0) * px, W * s, H * s); };
    // glow first (underneath), then the sharp layer on top so solid shapes keep their exact color
    ctx.globalCompositeOperation = 'lighter';
    if (glow <= 0.01) { /* flat styles: no bloom */ }
    else if ('filter' in ctx) { ctx.filter = `blur(${(8 * px).toFixed(1)}px)`; blit(alpha * 0.6 * glow, off, offY, zs); ctx.filter = `blur(${(28 * px).toFixed(1)}px)`; blit(alpha * 0.5 * glow, off, offY, zs); ctx.filter = 'none'; }
    else { ctx.imageSmoothingEnabled = true; const sm = render._s || (render._s = doc.createElement('canvas')); sm.width = Math.ceil(W / 14); sm.height = Math.ceil(H / 14); const q = sm.getContext('2d'); q.clearRect(0, 0, sm.width, sm.height); q.drawImage(layer, 0, 0, sm.width, sm.height); ctx.globalAlpha = Math.min(1, alpha * 0.6 * glow); ctx.drawImage(sm, off * px, offY * px, W, H); }
    ctx.globalCompositeOperation = 'source-over';
    if (smear > 1 || smearY > 1) { const n = 6; for (let k = 0; k < n; k++) { const f = k / (n - 1) - 0.5; blit((alpha / n) * 1.5, off + f * smear * 2.4 * Math.sign(off || 1), offY + f * smearY * 2.4 * Math.sign(offY || 1), zs); } }
    else { if (ghost > 0.02) for (let k = 3; k >= 1; k--) blit(alpha * 0.2 * ghost, off, offY, zs * (1 + k * 0.08 * ghost)); blit(alpha, off, offY, zs); }
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
    if (hasK) drawCap(ctx, proj, sc.kicker, cx, vert ? 338 : 115, { plain: 1, size: (vert ? 22 : 19) * Math.sqrt(cs) * (up ? 1 : 1.25), wt: 600, ls: up ? 0.24 : 0.04, col: rgba(col.fg, 0.78), a: kA, maxW: LW * 0.88, blur: (1 - ramp(lt, kt, 0.3)) * 6 });
    lines.forEach((ln, k) => {
      const at = +ln.at || 0, nx = lines[k + 1] ? +lines[k + 1].at : 1e9, first = i === 0 && at <= 0.01, byWord = look.capAnim !== 'line' && !first, pin = first ? 1 : byWord ? +(lt >= at) : ramp(lt, at, 0.28), a = pin * (1 - ramp(lt, nx - 0.14, 0.14)) * endA;
      drawCap(ctx, proj, ln.text, cx, vert ? (hasK ? 412 : 385) : hasK ? 177 : 146, { size: (vert ? 50 : 42) * cs, wt: 700, ls: look.capLs ?? 0.045, col: col.fg, a, maxW: LW * (vert ? 0.86 : 0.92), blur: (1 - pin) * 9, rev: byWord ? lt - at : null, step: Math.min(0.3, ((Math.min(nx, sc.dur) - at) * 0.7) / Math.max(1, wordCount(ln.text))) });
    });
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
    proj.scenes = (proj.scenes || []).filter(s => s && V[s.visual]).map(s => ({ visual: s.visual, dur: clamp(+s.dur || 3, 0.8, 30), kicker: s.kicker || '', kickerAt: +s.kickerAt || 0,
      lines: (s.lines && s.lines.length ? s.lines : [{ text: '', at: 0 }]).slice(0, 2).map(l => ({ text: l.text || '', at: +l.at || 0 })), p: coerce(s.visual, s.p) }));
    return proj;
  }
  /* The custom animation language in a form that can be pasted into a prompt. CUSTOM-ANIMATION.md is the longer guide. */
  const CUSTOM_SPEC = "Custom animation (\"visual\":\"custom\"): p.items is a list of parts, drawn in order (later parts on top). Use it to draw a picture made for this exact line.\nStage: x and y run from 0 to 100, left to right and top to bottom. y 100 is the ground and y 0 is just under the captions. The stage is a little wider than it is tall. Sizes are in units where 100 units = the stage height (a person is about 30 tall).\nEvery part: {\"is\": kind, \"x\": 50, \"y\": 50, \"at\": when it appears, \"in\": entrance, \"out\": when it leaves, \"loop\": idle motion, \"move\": [{\"at\": when, \"x\": 60, \"y\": 40, \"scale\": 1.2, \"rot\": 15, \"alpha\": 1, \"dur\": 0.6}], \"fx\": \"sparks,shake,ring,glow\", \"color\": \"accent\" or \"fg\" or \"mute\" or \"bg\"}. Only \"is\" is required.\nTimes (\"at\", \"out\", \"strike\", \"start\", \"open\"): \"line1\" or \"line2\" (the moment that caption line starts), optionally \"line1+0.4\"; or a share of the scene such as \"30%\"; or plain seconds. Prefer line anchors and percentages, because scene lengths are set afterwards.\nEntrances (\"in\"): pop, fade, draw (the line draws itself), grow, left, right, up, down, drop, none. Idle motion (\"loop\"): bob, float, pulse, spin, swing, shake, blink.\nKinds and their extra fields:\n- person: a character with a face. h, dir (\"left\"), color (accent = the main character, fg = other people), mood (happy, sad, shock, angry, think, worried, smug, sleep), act (point, wave, cheer, jump, walk, run, talk, think, shrug, hips, facepalm, hold, nod, no, slump, dig), says (a speech bubble of 1 to 4 words; the mouth moves while it types), saysSide (\"left\" or \"right\"), emote (\"!\", \"?\", \"$\", \"zzz\" above the head), look ([x, y] on the stage to look at, or \"left\", \"right\", \"up\", \"down\"), hat (helmet, cap, crown, grad), hair (tuft, bun, long), glasses (true), name (a small label under the feet). \"then\": [{\"at\": \"line1\", \"mood\": \"shock\", \"act\": \"\", \"says\": \"WAIT, WHAT?\", \"emote\": \"!\"}] changes the character at that moment, so it reacts to what happens. A person that has a \"move\" walks there by itself. Stands with the feet at x,y; keep x between 12 and 88.\n- crowd: n, h\n- icon: name (an icon name from the list), size\n- coin: size, symbol, spin (true)\n- text: text, size (about 3 to 6), w (widest it may be), color\n- tag: text, size, style (outline, solid, accent), strike (the time it gets crossed out)\n- number: from, to, prefix, suffix, decimals, size (about 12 to 22), over (seconds it counts for), start\n- box: w, h, r (corner), fill, dash. circle: r, fill, dash. ring: r, percent\n- bar: w, h, value (text above), label (text below). It grows up from x,y\n- dots: cols, rows, gap, r, on (how many light up)\n- line and arrow: to [x, y], or len with angle (degrees, 0 = right, -90 = up); bend (-0.3 to 0.3), dash, flow (moving dashes), center (true makes it turn around its middle)\n- path: pts [[x,y],...] as stage positions, smooth, close, fill, dash, flow. blob: r, seed, squash (a rock or cloud outline)\n- bubble: w, h, text, tail (\"left\", \"right\" or \"none\")\n- stamp: text, size. star: size. glow: r. sparks: n, r. burst: symbol. chest: size, open (time). shake: amount (a camera kick at \"at\")\n- group: items (parts placed in units relative to the group's x,y), so the whole group moves, turns, pulses or slides in as one object\n- any part can take \"repeat\": {\"n\": 5, \"dx\": 6, \"dy\": 0, \"stagger\": 0.08} to make a row of copies\nCharacters tell the story: pick one main character for the whole video (same color accent, same hat or hair in every scene) and put it in nearly every custom scene, next to the thing the line talks about. It looks at that thing, and it reacts on \"line1\" with a \"then\" step (think to shock, worried to happy, and so on). Other people are color fg. At most one speech bubble at a time, 1 to 4 words, and it adds a feeling or a reaction instead of repeating the caption. Leave about 12 units of free space above a head for the bubble. A ready-made scene can take characters too: put person parts in \"p\":{\"cast\":[...]}, standing in a free corner.\nRules for custom scenes: 6 to 16 parts. Build one clear picture of the thing the line talks about out of simple shapes, and make it DO something on \"line1\": move, grow, break, count up or get crossed out. Words inside the picture are labels of 1 to 4 words. Keep everything between x 4 and 96 and between y 8 and 98. Use \"accent\" only for the thing the viewer should look at.\nExample (a seesaw tipping to the heavy side): {\"visual\":\"custom\",\"kicker\":\"\",\"lines\":[{\"text\":\"Debt always *outweighs* savings.\"}],\"p\":{\"items\":[{\"is\":\"path\",\"pts\":[[44,98],[50,80],[56,98]],\"close\":true},{\"is\":\"group\",\"x\":50,\"y\":79,\"move\":[{\"at\":\"line1\",\"rot\":14,\"dur\":0.7}],\"items\":[{\"is\":\"line\",\"x\":-40,\"y\":0,\"to\":[40,0],\"width\":0.7},{\"is\":\"coin\",\"x\":-32,\"y\":-6,\"size\":10},{\"is\":\"box\",\"x\":32,\"y\":-8,\"w\":14,\"h\":14,\"fill\":\"accent\"},{\"is\":\"text\",\"x\":32,\"y\":-8,\"text\":\"DEBT\",\"size\":3,\"color\":\"bg\"}]},{\"is\":\"person\",\"x\":14,\"y\":98,\"h\":24,\"mood\":\"happy\",\"look\":[50,70],\"then\":[{\"at\":\"line1+0.3\",\"mood\":\"shock\",\"says\":\"MY SAVINGS!\"}]},{\"is\":\"tag\",\"text\":\"SAVINGS\",\"x\":22,\"y\":52,\"at\":0.4},{\"is\":\"number\",\"x\":76,\"y\":40,\"from\":0,\"to\":24,\"suffix\":\"%\",\"size\":14,\"at\":\"line1\",\"label\":\"INTEREST\"}]}}";
  root.PSP = { CUSTOM_SPEC, render, duration, startOf, sceneAt, VISUALS: V, ICONS, FONTS, STYLES, applyStyle, defaults, normalize, check, script, retime, autotime, analyseAudio, fitVoice };
})(typeof window !== 'undefined' ? window : globalThis);
