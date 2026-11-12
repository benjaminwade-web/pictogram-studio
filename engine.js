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
  const LOOK0 = { pattern: 'dots', glow: 1, figure: 'solid', cap: 'color', caps: true, ground: 'dashed', vignette: 0.9, capScale: 1, capLs: 0.045 };
  const STYLES = {
    neon: { name: 'Neon terminal', colors: { bg: '#050606', fg: '#f4f4f2', accent: '#4dff88' }, font: 'Inter', transition: 'whip', look: {} },
    whiteboard: { name: 'Whiteboard', colors: { bg: '#f1f3f5', fg: '#16191d', accent: '#ff4b3e' }, font: 'Fredoka', transition: 'whip', look: { pattern: 'grid', glow: 0, figure: 'outline', cap: 'underline', caps: false, ground: 'solid', vignette: 0, capScale: 1.08, capLs: 0.01 } },
    blueprint: { name: 'Blueprint', colors: { bg: '#0c2f66', fg: '#e8f1ff', accent: '#ffd84d' }, font: 'JetBrains Mono', transition: 'fade', look: { pattern: 'grid', glow: 0.3, figure: 'outline', cap: 'color', caps: true, ground: 'solid', vignette: 0.5, capScale: 0.84, capLs: 0 } },
    newsroom: { name: 'Newsroom', colors: { bg: '#101216', fg: '#ffffff', accent: '#ff3b3b' }, font: 'Bebas Neue', transition: 'cut', look: { pattern: 'none', glow: 0.15, figure: 'solid', cap: 'box', caps: true, ground: 'solid', vignette: 0.6, capScale: 1.45, capLs: 0.03 } },
    arcade: { name: 'Arcade CRT', colors: { bg: '#130a26', fg: '#f3e8ff', accent: '#3df5ff' }, font: 'Space Grotesk', transition: 'whip', look: { pattern: 'scanlines', glow: 1.3, figure: 'solid', cap: 'color', caps: true, ground: 'dashed', vignette: 0.9 } },
    magazine: { name: 'Magazine', colors: { bg: '#18140f', fg: '#f3eadc', accent: '#ff8a3d' }, font: 'DM Serif Display', transition: 'fade', look: { pattern: 'paper', glow: 0.12, figure: 'solid', cap: 'underline', caps: false, ground: 'solid', vignette: 0.7, capScale: 1.18, capLs: 0 } },
    pop: { name: 'Sticker pop', colors: { bg: '#ffd84d', fg: '#15151a', accent: '#2f55ff' }, font: 'Archivo', transition: 'cut', look: { pattern: 'dots', glow: 0, figure: 'solid', cap: 'box', caps: true, ground: 'solid', vignette: 0, capScale: 1.02, capLs: 0.02 } },
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
    person(x, h, o = {}) {
      const a = o.a ?? 1; if (a <= 0) return; const c = this.ctx, by = o.y ?? this.GY, col = o.col || this.fg, dir = o.dir || 1;
      const r = h * 0.2, hy = by - h + r, bw = h * 0.62, tw = bw * 0.42, bt = by - h * 0.56, rad = tw * 0.9, lean = (o.lean || 0) * h;
      const ou = this.outline; c.save(); c.globalAlpha *= a; c.fillStyle = ou ? this.bg : col; c.strokeStyle = col; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(x - bw / 2, by); c.lineTo(x - tw + lean, bt + rad); c.quadraticCurveTo(x - tw + lean, bt, x - tw + rad + lean, bt);
      c.lineTo(x + tw - rad + lean, bt); c.quadraticCurveTo(x + tw + lean, bt, x + tw + lean, bt + rad); c.lineTo(x + bw / 2, by); c.closePath();
      if (o.ol) { c.save(); c.strokeStyle = this.bg; c.lineWidth = h * 0.05; c.stroke(); c.beginPath(); c.arc(x + lean * 1.4, hy, r + h * 0.025, 0, TAU); c.fillStyle = this.bg; c.fill(); c.restore(); c.beginPath(); c.moveTo(x - bw / 2, by); c.lineTo(x - tw + lean, bt + rad); c.quadraticCurveTo(x - tw + lean, bt, x - tw + rad + lean, bt); c.lineTo(x + tw - rad + lean, bt); c.quadraticCurveTo(x + tw + lean, bt, x + tw + lean, bt + rad); c.lineTo(x + bw / 2, by); c.closePath(); }
      c.fill(); if (ou) { c.lineWidth = Math.max(3, h * 0.035); c.stroke(); }
      const pt = o.pt || 0;
      if (pt > 0) {
        c.lineWidth = h * 0.115; c.lineCap = 'round'; c.beginPath(); const sx = x + dir * tw * 0.55 + lean, sy = bt + h * 0.16;
        c.moveTo(sx, sy); c.lineTo(sx + dir * h * 0.36 * pt, sy - h * 0.085 * pt); c.stroke();
      }
      c.beginPath(); c.arc(x + lean * 1.4, hy, r, 0, TAU); c.fill(); if (ou) { c.lineWidth = Math.max(3, h * 0.035); c.stroke(); }
      if (o.gl) {
        c.strokeStyle = ou ? col : this.bg; c.lineWidth = Math.max(2, r * 0.13); const gx = x + lean * 1.4 + dir * r * 0.12, gr = r * 0.34;
        c.beginPath(); c.arc(gx - gr * 1.08, hy, gr, 0, TAU); c.stroke(); c.beginPath(); c.arc(gx + gr * 1.08, hy, gr, 0, TAU); c.stroke();
      }
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
      if (o.fill) { c.fillStyle = this.ac; c.fill(); } else { c.strokeStyle = o.col || this.fg; c.lineWidth = 3.5; c.stroke(); }
      c.fillStyle = o.fill ? this.bg : o.col || this.fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(s).toUpperCase(), size * 0.08, 1);
      if (o.strike > 0) { c.strokeStyle = this.ac; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); const L = w / 2 + 26; c.moveTo(-L, 9); c.lineTo(-L + 2 * L * o.strike, 9 - 16 * o.strike); c.stroke(); }
      c.restore(); return w;
    }
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
      g.halo(hx, g.GY - 140, 300, 0.14 * g.in(0, 0.6)); g.person(hx, hh, { col: g.ac, gl: 1, pt: g.in(T2 - 0.05, 0.4), a: g.in(0, 0.3) });
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
      g.halo(hx, g.GY - 140, 300, 0.15 + (done ? 0.1 : 0)); g.person(hx + j, g.V(290, 270), { col: g.ac, gl: !done, a: g.in(0, 0.3), lean: j * 0.0012 });
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
      g.halo(960, cy, 560, 0.3 * clamp(s)); c.save(); c.translate(960, cy); c.scale(s, s); g.font(800, size, -0.01); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = g.ac; c.fillText(txt, 0, 0); c.restore();
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
      if (!g.vert) { g.halo(350, g.GY - 130, 280, 0.14); g.person(350, 260, { col: g.ac, gl: 1, pt: 0.9, a: g.in(0, 0.3) }); }
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
      const hx = Math.min(x0 + tot * prog, 960 + g.V(760, 395)); g.halo(hx, g.GY - 90, 200, 0.14); g.person(hx, g.V(190, 165), { col: g.ac, gl: 1, pt: 0.5, a: g.in(0, 0.3) });
    },
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
    lines.forEach((ln, li) => {
      const w = ln.reduce((s, wd, i) => s + wd.width + (i ? space : 0), 0); let x = cx - w / 2 + ls / 2;
      ln.forEach((wd, i) => { if (i) x += space; wd.forEach(p => {
        const yy = y + li * size * 1.34; c.shadowColor = gl > 0 ? rgba(p.acc ? col.accent : col.fg, 0.4) : 'transparent';
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
    const { i, lt, sc } = cur, last = i === proj.scenes.length - 1, tr = proj.transition || 'whip';
    let off = 0, alpha = 1, smear = 0;
    if (tr !== 'cut') {
      if (i > 0 && lt < TI) { const p = lt / TI; alpha = eo(p); if (tr === 'whip') { off = (1 - eo(p)) * LW * 0.22; smear = (1 - p) * 60; } }
      if (!last && lt > sc.dur - TO) { const p = (lt - (sc.dur - TO)) / TO; alpha = 1 - p; if (tr === 'whip') { off = -ei(p) * LW * 0.22; smear = p * 60; } }
    }
    const L = layer.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, W, H);
    let z = 1 + 0.035 * (lt / sc.dur); (sc.lines || []).forEach(l => { const dt = lt - (+l.at || 0); if (l.text && dt >= 0 && (+l.at > 0.05 || i > 0)) z += 0.02 * Math.exp(-dt * 9); }); /* small punch when a line lands */
    L.setTransform(px * sv * z, 0, 0, px * sv * z, px * (tx + 960 * sv * (1 - z)), px * (ty + 1031 * sv * (1 - z)));
    const g = new G(L, proj, sc, lt, vert), vis = V[sc.visual]; if (vis) { try { vis.draw(g); } catch (e) { if (root.console) console.error(sc.visual, e); } }
    const blit = (a, dx) => { ctx.globalAlpha = Math.min(1, a); ctx.drawImage(layer, dx * px, 0); };
    // glow first (underneath), then the sharp layer on top so solid shapes keep their exact color
    ctx.globalCompositeOperation = 'lighter';
    if (glow <= 0.01) { /* flat styles: no bloom */ }
    else if ('filter' in ctx) { ctx.filter = `blur(${(8 * px).toFixed(1)}px)`; blit(alpha * 0.6 * glow, off); ctx.filter = `blur(${(28 * px).toFixed(1)}px)`; blit(alpha * 0.5 * glow, off); ctx.filter = 'none'; }
    else { ctx.imageSmoothingEnabled = true; const sm = render._s || (render._s = doc.createElement('canvas')); sm.width = Math.ceil(W / 14); sm.height = Math.ceil(H / 14); const q = sm.getContext('2d'); q.clearRect(0, 0, sm.width, sm.height); q.drawImage(layer, 0, 0, sm.width, sm.height); ctx.globalAlpha = Math.min(1, alpha * 0.6 * glow); ctx.drawImage(sm, off * px, 0, W, H); }
    ctx.globalCompositeOperation = 'source-over';
    if (smear > 1) { const n = 6; for (let k = 0; k < n; k++) blit((alpha / n) * 1.5, off + (k / (n - 1) - 0.5) * smear * 2.4 * Math.sign(off || 1)); } else blit(alpha, off);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // captions
    ctx.setTransform(px, 0, 0, px, 0, 0); const cx = LW / 2, lines = (sc.lines || []).filter(l => l && l.text), endA = last ? 1 : 1 - ramp(lt, sc.dur - 0.2, 0.2);
    const hasK = !!sc.kicker, kt = +sc.kickerAt || 0.12, kA = ramp(lt, kt, 0.3) * endA;
    const cs = look.capScale || 1, up = look.caps !== false;
    if (hasK) drawCap(ctx, proj, sc.kicker, cx, vert ? 338 : 115, { plain: 1, size: (vert ? 22 : 19) * Math.sqrt(cs) * (up ? 1 : 1.25), wt: 600, ls: up ? 0.24 : 0.04, col: rgba(col.fg, 0.78), a: kA, maxW: LW * 0.88, blur: (1 - ramp(lt, kt, 0.3)) * 6 });
    lines.forEach((ln, k) => {
      const at = +ln.at || 0, nx = lines[k + 1] ? +lines[k + 1].at : 1e9, first = i === 0 && at <= 0.01, pin = first ? 1 : ramp(lt, at, 0.28), a = pin * (1 - ramp(lt, nx - 0.14, 0.14)) * endA;
      drawCap(ctx, proj, ln.text, cx, vert ? (hasK ? 412 : 385) : hasK ? 177 : 146, { size: (vert ? 50 : 42) * cs, wt: 700, ls: look.capLs ?? 0.045, col: col.fg, a, maxW: LW * (vert ? 0.86 : 0.92), blur: (1 - pin) * 9 });
    });
    if (proj.progress) { // thin progress bar: a known retention aid
      const tot = duration(proj), f = clamp(t / Math.max(0.01, tot)), bx = vert ? LW * 0.07 : 0, bw = vert ? LW * 0.86 : LW, by = vert ? 262 : 0, bh = vert ? 7 : 9;
      ctx.globalAlpha = 1; ctx.fillStyle = rgba(col.fg, 0.16); ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = col.accent; ctx.fillRect(bx, by, bw * f, bh);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function defaults(visual) { const p = {}; (V[visual].fields || []).forEach(f => (p[f.key] = f.def)); return p; }

  /* ---- shared helpers: used by the editor page and by make.js so both follow the same rules ---- */
  const wordCount = s => String(s || '').replace(/\*/g, '').trim().split(/\s+/).filter(Boolean).length;
  // What the voice should say, one entry per scene: the small line and the main lines read as one sentence.
  function script(proj) { return proj.scenes.map(s => [s.kicker].concat(s.lines.map(l => l.text)).map(x => String(x || '').replace(/\*/g, '').replace(/…$/, '').trim()).filter(Boolean).join(' ')); }
  // The retention rules a computer can check. voiceDur is optional (seconds of voiceover).
  function check(proj, voiceDur) {
    const S = proj.scenes, D = duration(proj), out = [], add = (ok, msg, fix) => out.push({ ok: !!ok, msg, fix });
    const which = fn => S.map((s, i) => (fn(s, i) ? i + 1 : 0)).filter(Boolean).join(', '), f = S[0];
    add(f.visual === 'hook' || (f.lines[0].text && +f.lines[0].at <= 0.5), 'Words on screen in the first half second', 'Scene 1: set the main line to appear at 0, or start with a Big statement scene.');
    add(f.dur <= 4.5, 'First scene is 4.5 seconds or shorter', 'Scene 1 runs ' + (+f.dur).toFixed(1) + ' seconds. Shorten or split it.');
    add(D >= 15 && D <= 45, 'Total length between 15 and 45 seconds', 'This one runs ' + D.toFixed(0) + ' seconds.');
    let w = which(s => s.dur > 6); add(!w, 'No scene longer than 6 seconds', 'Too long: scene ' + w + '.');
    w = which(s => s.lines.some(l => wordCount(l.text) > 12)); add(!w, 'Every line is 12 words or fewer', 'Too wordy: scene ' + w + '.');
    w = which(s => s.lines.some(l => l.text && !/\*[^*]+\*/.test(l.text))); add(!w, 'Every main line has a highlighted word', 'Add *stars* around a word in scene ' + w + '.');
    w = which((s, i) => i && s.visual === S[i - 1].visual); add(!w, 'No scene type twice in a row', 'Change the type of scene ' + w + '.');
    const n = {}; S.forEach(s => (n[s.visual] = (n[s.visual] || 0) + 1)); const over = Object.keys(n).filter(k => n[k] > 2).map(k => V[k].name).join(', '); add(!over, 'No scene type used more than twice', 'Used three times or more: ' + over + '.');
    add(D / S.length <= 4.3, 'A new picture at least every 4 seconds on average', 'Scenes average ' + (D / S.length).toFixed(1) + ' seconds.');
    add(S.some(s => ['counter', 'bars', 'ring', 'compare', 'hook', 'grid', 'tracker'].indexOf(s.visual) >= 0), 'At least one scene built on a number', 'Add a Big statement, Bar chart, Percent ring or A versus B scene.');
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
  const SLOW = { counter: 3.4, bars: 3.6, steps: 3.6, timeline: 3.6, grid: 3.6, tracker: 3.8, compare: 3.2, ring: 3.2, curve: 3.2, cta: 2.8, hook: 2.2 };
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
      out[f.key] = f.type === 'num' ? (v !== '' && isFinite(+v) ? +v : f.def) : f.type === 'bool' ? (v === true || v === 'true') : f.type === 'icon' ? (v === 'none' || ICONS.indexOf(v) >= 0 ? v : f.def) : f.type === 'select' ? (f.options.indexOf(v) >= 0 ? v : f.def) : String(v); });
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
  root.PSP = { render, duration, startOf, sceneAt, VISUALS: V, ICONS, FONTS, STYLES, applyStyle, defaults, normalize, check, script, retime, autotime, analyseAudio, fitVoice };
})(typeof window !== 'undefined' ? window : globalThis);
