// "The tulip crash that never ruined anyone" — an original film, drawn only for this story.
// Look: a 1630s Dutch print. Ink engraving on laid paper (hatching, a hand-drawn line that boils
// at 12 drawings a second) bookended by two dark oil-painting panels like a Golden Age still life.
// Cast: Pieter, a bulb trader (tall hat, millstone ruff, red sash), and a modern historian who walks in.
(function () {
  let S, PAPER_C, VARN_C, GRAIN, boil = 0;
  const INK = '#22170f', PAPER = '#eee1c1', RED = '#c2321d', GOLD = '#cf9f3f', SKIN = '#efc39d', CREAM = '#f8efd9', LEAF = '#5f7d3b', COAT = '#2c2420';
  const FELL = '"IM Fell English", Georgia, serif', SC = '"IM Fell English SC", Georgia, serif', BL = '"UnifrakturMaguntia", serif';
  const J = k => S.hash(boil * 7.13 + k * 13.37) - 0.5;
  const wob = (c, k, a = 1.6) => { c.translate(J(k) * a, J(k + 1) * a); c.rotate(J(k + 2) * 0.004 * a); };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const st = (c, w = 4, col = INK) => { c.lineWidth = w; c.strokeStyle = col; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); };
  const fl = (c, col) => { c.fillStyle = col; c.fill(); };
  const P = (t, a, d = 0.4) => S.p(t, a, a + d);
  const pop = (t, a, d = 0.35) => S.ease.back(P(t, a, d));
  function hatch(c, path, ang, gap, col, lw, box) {
    c.save(); path(); c.clip(); c.beginPath(); const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + gap, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let d = -R; d <= R; d += gap) { c.moveTo(cx - ca * R - sa * d, cy - sa * R + ca * d); c.lineTo(cx + ca * R - sa * d, cy + sa * R + ca * d); }
    c.lineWidth = lw; c.strokeStyle = col; c.stroke(); c.restore();
  }
  function txt(c, s, x, y, size, col, font = FELL, align = 'center') { c.font = `${size}px ${font}`; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); }

  // ---------- backgrounds, made once ----------
  function makePaper() {
    const c = mk(1080, 1920), x = c.getContext('2d'), r = S.rng(7); x.fillStyle = PAPER; x.fillRect(0, 0, 1080, 1920);
    for (let i = 0; i < 50; i++) { const X = r() * 1080, Y = r() * 1920, R = 80 + r() * 260, g = x.createRadialGradient(X, Y, 0, X, Y, R); g.addColorStop(0, r() < 0.5 ? 'rgba(255,250,230,0.12)' : 'rgba(170,130,70,0.045)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920); }
    x.strokeStyle = '#6b5530'; x.lineWidth = 1; x.globalAlpha = 0.04; for (let y = 0; y < 1920; y += 7) { x.beginPath(); x.moveTo(0, y + r() * 1.5); x.lineTo(1080, y + r() * 1.5); x.stroke(); }
    x.globalAlpha = 0.07; x.lineWidth = 2; for (let X = 50; X < 1080; X += 104) { x.beginPath(); x.moveTo(X, 0); x.lineTo(X + 4, 1920); x.stroke(); }
    x.fillStyle = '#8a5a2b'; for (let i = 0; i < 70; i++) { x.globalAlpha = 0.03 + r() * 0.07; x.beginPath(); x.arc(r() * 1080, r() * 1920, 2 + r() * 12, 0, 7); x.fill(); }
    x.globalAlpha = 1; const v = x.createRadialGradient(540, 900, 500, 540, 900, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(95,62,24,0.42)'); x.fillStyle = v; x.fillRect(0, 0, 1080, 1920); return c;
  }
  function makeVarnish() {
    const c = mk(1080, 1920), x = c.getContext('2d'), r = S.rng(3), g = x.createRadialGradient(330, 560, 40, 420, 760, 1350);
    g.addColorStop(0, '#7a552c'); g.addColorStop(0.35, '#3e2814'); g.addColorStop(1, '#0b0704'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
    x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 1; for (let i = 0; i < 260; i++) { let X = r() * 1080, Y = r() * 1920; x.beginPath(); x.moveTo(X, Y); for (let k = 0; k < 4; k++) { X += (r() - 0.5) * 60; Y += (r() - 0.5) * 60; x.lineTo(X, Y); } x.stroke(); }
    x.strokeStyle = 'rgba(255,220,160,0.05)'; for (let i = 0; i < 90; i++) { const X = r() * 1080, Y = r() * 1920; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + (r() - 0.5) * 50, Y + (r() - 0.5) * 50); x.stroke(); } return c;
  }
  function makeGrain() { const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256), r = S.rng(11); for (let i = 0; i < d.data.length; i += 4) { const v = 100 + r() * 155; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; }

  // ---------- props ----------
  function bulb(c, x, y, s, k = 0) {
    c.save(); c.translate(x, y); c.scale(s, s); wob(c, 11 + k);
    c.beginPath(); for (let i = -3; i <= 3; i++) { c.moveTo(i * 7, 38); c.quadraticCurveTo(i * 10, 52, i * 13, 66); } st(c, 2.5, '#6b4a2a');
    const on = () => { c.beginPath(); c.moveTo(0, -64); c.bezierCurveTo(14, -40, 54, -20, 52, 10); c.bezierCurveTo(50, 36, 22, 42, 0, 42); c.bezierCurveTo(-22, 42, -50, 36, -52, 10); c.bezierCurveTo(-54, -20, -14, -40, 0, -64); c.closePath(); };
    on(); fl(c, '#c99059'); hatch(c, on, -0.9, 7, 'rgba(60,30,10,0.45)', 1.6, [0, -64, 60, 44]); on(); st(c, 4);
    c.beginPath(); c.moveTo(0, -60); c.bezierCurveTo(-10, -30, -26, 0, -18, 40); c.moveTo(0, -60); c.bezierCurveTo(10, -30, 24, 0, 16, 40); st(c, 2, '#6b4423'); c.restore();
  }
  function petal(c, rot, w, h, seed) {
    c.save(); c.rotate(rot); const pth = () => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-w, -h * 0.25, -w * 0.95, -h * 0.85, 0, -h); c.bezierCurveTo(w * 0.95, -h * 0.85, w, -h * 0.25, 0, 0); c.closePath(); };
    pth(); fl(c, CREAM); c.save(); pth(); c.clip(); c.lineCap = 'round';
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * w * 0.22, 4); c.bezierCurveTo(i * w * 0.32 + 8, -h * 0.4, i * w * 0.18 - 8, -h * 0.7, i * w * 0.08, -h * (0.82 + 0.1 * Math.sin(i + seed))); c.lineWidth = 6 + (i % 2 ? 4 : 0); c.strokeStyle = RED; c.stroke(); }
    c.restore(); pth(); st(c, 3.5); c.restore();
  }
  // the flamed tulip. grow: stem 0..1, open: head 0..1, wilt: 0..1 droop
  function tulip(c, x, y, s, grow, open, wilt = 0) {
    if (grow <= 0) return; c.save(); c.translate(x, y); c.scale(s, s); wob(c, 21);
    const L = 270 * grow, tx = 70 * wilt * grow, ty = -L + 80 * wilt * grow;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-14, -L * 0.55, tx, ty); st(c, 15); st(c, 9, LEAF);
    if (grow > 0.25) { const g = S.clamp((grow - 0.25) / 0.5); c.save(); c.translate(0, -40); c.rotate(-0.5 + wilt * 0.4); c.scale(g, g); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-60, -40, -70, -120, -30, -170); c.bezierCurveTo(-24, -110, -10, -50, 0, 0); fl(c, LEAF); st(c, 3.5); c.beginPath(); c.moveTo(-6, -10); c.quadraticCurveTo(-34, -80, -30, -160); st(c, 1.5, 'rgba(0,0,0,0.4)'); c.restore(); }
    if (open > 0) { c.save(); c.translate(tx, ty); c.rotate(wilt * 1.8); const o = S.ease.back(open); c.scale(o, o); petal(c, -0.36, 34, 96, 1); petal(c, 0.36, 34, 96, 2); petal(c, 0, 36, 108, 3); c.restore(); }
    c.restore();
  }
  function cushion(c, x, y) {
    c.save(); c.translate(x, y); wob(c, 31, 1);
    const pth = () => { c.beginPath(); c.moveTo(-170, 0); c.bezierCurveTo(-190, -60, -120, -70, 0, -66); c.bezierCurveTo(120, -70, 190, -60, 170, 0); c.bezierCurveTo(190, 50, 120, 46, 0, 44); c.bezierCurveTo(-120, 46, -190, 50, -170, 0); c.closePath(); };
    pth(); fl(c, '#7d1f17'); hatch(c, pth, 0.5, 8, 'rgba(0,0,0,0.35)', 2, [-190, -70, 190, 50]); pth(); st(c, 3, '#120a06');
    [[-170, 0], [170, 0]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 12, 0, 7); fl(c, GOLD); st(c, 2, '#120a06'); }); c.restore();
  }
  function coin(c, x, y, r = 34) { c.save(); c.translate(x, y); c.beginPath(); c.ellipse(0, 0, r, r * 0.42, 0, 0, 7); fl(c, GOLD); st(c, 3); c.beginPath(); c.ellipse(0, -2, r * 0.7, r * 0.27, 0, 0, 7); st(c, 1.5, 'rgba(60,30,0,0.5)'); c.restore(); }
  function scroll(c, x, y, rot, s = 1, k = 0) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); wob(c, 40 + k, 1);
    c.beginPath(); c.rect(-70, -50, 140, 100); fl(c, CREAM); st(c, 3);
    c.beginPath(); for (let i = 0; i < 5; i++) { c.moveTo(-52, -30 + i * 14); c.lineTo(30 - (i % 2) * 22, -30 + i * 14); } st(c, 2, 'rgba(34,23,15,0.6)');
    c.beginPath(); c.arc(42, 30, 15, 0, 7); fl(c, RED); st(c, 2); c.beginPath(); c.ellipse(-70, 0, 9, 50, 0, 0, 7); fl(c, '#e6d6b2'); st(c, 3); c.beginPath(); c.ellipse(70, 0, 9, 50, 0, 0, 7); fl(c, '#e6d6b2'); st(c, 3); c.restore();
  }

  // ---------- faces and people ----------
  function face(c, r, mood, k) {
    const ey = -r * 0.08, ex = r * 0.36;
    if (mood === 'relief' || mood === 'happy') { c.beginPath(); c.arc(-ex, ey + 4, r * 0.12, Math.PI * 1.1, Math.PI * 1.9); c.moveTo(ex - r * 0.12, ey + 4); c.arc(ex, ey + 4, r * 0.12, Math.PI * 1.1, Math.PI * 1.9); st(c, 3.5); }
    else if (mood === 'shock') { [-ex, ex].forEach(e => { c.beginPath(); c.arc(e, ey, r * 0.15, 0, 7); fl(c, '#fff'); st(c, 2.5); c.beginPath(); c.arc(e, ey, r * 0.06, 0, 7); fl(c, INK); }); }
    else { const blink = S.hash(Math.floor(S._t * 3) + k) > 0.93 ? 0.25 : 1; [-ex, ex].forEach(e => { c.beginPath(); c.ellipse(e, ey, r * 0.075, r * 0.1 * blink, 0, 0, 7); fl(c, INK); }); }
    c.beginPath();
    if (mood === 'worried' || mood === 'sad') { c.moveTo(-ex - 12, ey - 14); c.lineTo(-ex + 10, ey - 22); c.moveTo(ex + 12, ey - 14); c.lineTo(ex - 10, ey - 22); }
    else if (mood === 'smug') { c.moveTo(-ex - 12, ey - 18); c.lineTo(-ex + 10, ey - 16); c.moveTo(ex - 12, ey - 24); c.quadraticCurveTo(ex, ey - 30, ex + 12, ey - 22); }
    else if (mood === 'shock') { c.moveTo(-ex - 12, ey - 26); c.quadraticCurveTo(-ex, ey - 34, -ex + 12, ey - 26); c.moveTo(ex - 12, ey - 26); c.quadraticCurveTo(ex, ey - 34, ex + 12, ey - 26); }
    else { c.moveTo(-ex - 11, ey - 18); c.lineTo(-ex + 11, ey - 19); c.moveTo(ex - 11, ey - 19); c.lineTo(ex + 11, ey - 18); }
    st(c, 3.5);
    const my = r * 0.45; c.beginPath();
    if (mood === 'shock') { c.ellipse(0, my, r * 0.11, r * 0.15, 0, 0, 7); fl(c, '#5a1a12'); st(c, 2.5); }
    else if (mood === 'sad') { c.arc(0, my + 14, r * 0.2, Math.PI * 1.15, Math.PI * 1.85); st(c, 3.5); }
    else if (mood === 'worried') { c.moveTo(-r * 0.2, my + 4); c.quadraticCurveTo(-r * 0.1, my - 4, 0, my + 4); c.quadraticCurveTo(r * 0.1, my + 10, r * 0.2, my + 2); st(c, 3.5); }
    else if (mood === 'smug') { c.moveTo(-r * 0.16, my + 2); c.quadraticCurveTo(r * 0.05, my + 10, r * 0.24, my - 6); st(c, 3.5); }
    else { c.arc(0, my - 6, r * 0.22, Math.PI * 0.15, Math.PI * 0.85); st(c, 3.5); }
    if (mood === 'worried') { c.beginPath(); c.moveTo(r * 0.85, -r * 0.5); c.quadraticCurveTo(r * 1.0, -r * 0.2, r * 0.85, -r * 0.12); c.quadraticCurveTo(r * 0.7, -r * 0.2, r * 0.85, -r * 0.5); fl(c, '#bfe3f0'); st(c, 2); }
  }
  function arm(c, sx, sy, ang, side, len, col, cuff) {
    const dx = side * Math.sin(ang), dy = Math.cos(ang), hx = sx + dx * len, hy = sy + dy * len;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(hx, hy); st(c, 30); st(c, 23, col);
    if (cuff) { c.beginPath(); c.arc(hx - dx * 6, hy - dy * 6, 14, 0, 7); fl(c, CREAM); st(c, 2.5); }
    c.beginPath(); c.arc(hx, hy, 13, 0, 7); fl(c, SKIN); st(c, 3); return [hx, hy];
  }
  function legs(c, walk, col) {
    const sw = Math.sin(walk) * 0.35;
    [-1, 1].forEach(sd => { c.save(); c.translate(sd * 20, -95); c.rotate(sd * sw); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 86); st(c, 24); st(c, 17, col); c.beginPath(); c.ellipse(8, 90, 24, 11, 0, 0, 7); fl(c, '#1a120c'); st(c, 2.5); c.restore(); });
  }
  // Pieter, the bulb trader. o: {mood, armL, armR, walk, dir, hat (0..1 on), hold:'tulip'|'contract'|null}
  function pieter(c, x, y, s, o = {}) {
    c.save(); c.translate(x, y); c.scale(s * (o.dir || 1), s); wob(c, 51);
    const bob = o.walk ? Math.abs(Math.sin(o.walk)) * -6 : Math.sin(S._t * 2.2) * 2; c.translate(0, bob);
    legs(c, o.walk || 0, '#e9dcc0');
    const br = () => { c.beginPath(); c.moveTo(-50, -95); c.bezierCurveTo(-70, -130, -60, -168, -40, -172); c.lineTo(40, -172); c.bezierCurveTo(60, -168, 70, -130, 50, -95); c.closePath(); };
    br(); fl(c, '#3b2b22'); hatch(c, br, 1.2, 7, 'rgba(0,0,0,0.5)', 1.6, [-70, -175, 70, -90]); br(); st(c, 4);
    const bd = () => { c.beginPath(); c.moveTo(-58, -168); c.lineTo(-46, -292); c.lineTo(46, -292); c.lineTo(58, -168); c.closePath(); };
    bd(); fl(c, COAT); hatch(c, bd, 0.9, 8, 'rgba(255,255,255,0.08)', 1.5, [-60, -295, 60, -165]); bd(); st(c, 4);
    c.beginPath(); c.moveTo(-50, -280); c.lineTo(52, -190); st(c, 15, RED);
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(0, -276 + i * 22, 4, 0, 7); fl(c, GOLD); }
    const [lx, ly] = arm(c, -48, -282, o.armL != null ? o.armL : 0.15, -1, 112, COAT, true);
    const [rx, ry] = arm(c, 48, -282, o.armR != null ? o.armR : 0.15, 1, 112, COAT, true);
    if (o.hold === 'tulip') { c.save(); c.translate(rx, ry); c.scale(1 / (o.dir || 1), 1); tulip(c, 0, 10, 0.55, 1, 1, 0); c.restore(); }
    if (o.hold === 'contract') scroll(c, lx, ly - 10, -0.3, 0.6, 3);
    c.beginPath(); c.ellipse(0, -296, 70, 22, 0, 0, 7); fl(c, '#fbf6ea'); st(c, 3.5);
    c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; c.moveTo(Math.cos(a) * 30, -296 + Math.sin(a) * 9); c.lineTo(Math.cos(a) * 68, -296 + Math.sin(a) * 21); } st(c, 1.8, 'rgba(34,23,15,0.55)');
    c.save(); c.translate(0, -352); c.rotate(o.tilt || 0);
    c.beginPath(); c.ellipse(0, 0, 40, 48, 0, 0, 7); fl(c, SKIN); st(c, 4);
    c.beginPath(); c.moveTo(4, -6); c.quadraticCurveTo(30, 14, 12, 22); st(c, 3.5); c.beginPath(); c.arc(14, 18, 6, 0, 7); fl(c, '#d9776a');
    face(c, 40, o.mood || 'smug', 3);
    c.beginPath(); c.moveTo(0, 26); c.bezierCurveTo(-16, 20, -30, 26, -38, 14); c.moveTo(0, 26); c.bezierCurveTo(16, 20, 30, 26, 38, 14); st(c, 5);
    c.beginPath(); c.moveTo(-10, 40); c.lineTo(0, 66); c.lineTo(10, 40); c.closePath(); fl(c, '#5a3b22'); st(c, 2.5);
    if ((o.hat == null ? 1 : o.hat) > 0.5) {
      const hp = () => { c.beginPath(); c.moveTo(-38, -36); c.lineTo(-30, -122); c.quadraticCurveTo(0, -132, 30, -122); c.lineTo(38, -36); c.closePath(); };
      hp(); fl(c, '#1d1714'); hatch(c, hp, 1.4, 8, 'rgba(255,255,255,0.1)', 1.5, [-40, -135, 40, -30]); hp(); st(c, 4);
      c.beginPath(); c.rect(-37, -54, 74, 14); fl(c, '#3a2c22'); st(c, 2.5);
      c.beginPath(); c.ellipse(0, -36, 74, 14, 0, 0, 7); fl(c, '#1d1714'); st(c, 4);
    }
    c.restore(); c.restore(); return { hand: [x + rx * s * (o.dir || 1), y + ry * s], head: [x, y - 400 * s] };
  }
  // ordinary folk of 1637. o: {coat, hat:'cap'|'wide'|'fool'|'none', mood, armL, armR, apron, skin, walk}
  function folk(c, x, y, s, o = {}) {
    c.save(); c.translate(x, y); c.scale(s * (o.dir || 1), s); wob(c, 61 + (o.k || 0));
    c.translate(0, Math.sin(S._t * 2 + (o.k || 0)) * 2); legs(c, o.walk || 0, o.hose || '#5a4a3a');
    const bd = () => { c.beginPath(); c.moveTo(-62, -92); c.lineTo(-50, -232); c.quadraticCurveTo(0, -244, 50, -232); c.lineTo(62, -92); c.closePath(); };
    bd(); fl(c, o.coat || '#6b5a3c'); hatch(c, bd, 0.9, 8, 'rgba(0,0,0,0.25)', 1.5, [0, -245, 64, -90]); bd(); st(c, 4);
    if (o.apron) { c.beginPath(); c.rect(-40, -180, 80, 96); fl(c, '#e8dcc0'); st(c, 3); }
    arm(c, -48, -222, o.armL != null ? o.armL : 0.12, -1, 100, o.coat || '#6b5a3c', false); arm(c, 48, -222, o.armR != null ? o.armR : 0.12, 1, 100, o.coat || '#6b5a3c', false);
    c.beginPath(); c.ellipse(0, -236, 44, 12, 0, 0, 7); fl(c, '#f4ecda'); st(c, 3);
    c.save(); c.translate(0, -282); c.rotate(o.tilt || 0); c.beginPath(); c.arc(0, 0, 42, 0, 7); fl(c, o.skin || SKIN); st(c, 4);
    c.beginPath(); c.arc(4, 10, 7, 0.2, 3.5); st(c, 3); face(c, 42, o.mood || 'calm', o.k || 0);
    const h = o.hat || 'cap';
    if (h === 'cap') { c.beginPath(); c.ellipse(-6, -34, 52, 20, -0.15, 0, 7); fl(c, o.hatCol || '#4a3b2b'); st(c, 3.5); }
    if (h === 'wide') { c.beginPath(); c.ellipse(0, -30, 78, 15, 0, 0, 7); fl(c, '#2a221d'); st(c, 3.5); c.beginPath(); c.moveTo(-34, -32); c.lineTo(-28, -74); c.lineTo(28, -74); c.lineTo(34, -32); fl(c, '#2a221d'); st(c, 3.5); }
    if (h === 'fool') { [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(-36 * sd, -24); c.quadraticCurveTo(-60 * sd, -90, -84 * sd, -70); c.quadraticCurveTo(-40 * sd, -60, -4 * sd, -36); c.closePath(); fl(c, sd > 0 ? RED : '#e9c24a'); st(c, 3.5); c.beginPath(); c.arc(-86 * sd, -68, 9, 0, 7); fl(c, GOLD); st(c, 2.5); }); }
    if (o.hair) { c.beginPath(); c.arc(0, -8, 44, Math.PI * 1.05, Math.PI * 1.95); st(c, 10, o.hair); }
    c.restore(); c.restore();
  }
  // the historian, from our century
  function historian(c, x, y, s, o = {}) {
    c.save(); c.translate(x, y); c.scale(s, s); wob(c, 71); legs(c, o.walk || 0, '#2f3542');
    const bd = () => { c.beginPath(); c.moveTo(-56, -96); c.lineTo(-48, -236); c.quadraticCurveTo(0, -246, 48, -236); c.lineTo(56, -96); c.closePath(); };
    bd(); fl(c, '#b23a2e'); hatch(c, bd, 0.9, 9, 'rgba(0,0,0,0.25)', 1.5, [0, -245, 60, -90]); bd(); st(c, 4);
    c.beginPath(); c.moveTo(-14, -236); c.lineTo(0, -150); c.lineTo(14, -236); fl(c, '#f3eee4'); st(c, 2.5);
    arm(c, -46, -224, 0.25, -1, 96, '#b23a2e', false); const [hx, hy] = arm(c, 46, -224, 2.2, 1, 80, '#b23a2e', false);
    c.save(); c.translate(hx + 8, hy + 10); c.rotate(0.15); c.beginPath(); c.rect(-30, -40, 60, 80); fl(c, '#2d4a6b'); st(c, 3); c.beginPath(); c.moveTo(-20, -24); c.lineTo(20, -24); st(c, 2, GOLD); c.restore();
    c.save(); c.translate(0, -284); c.rotate(o.shake ? Math.sin(S._t * 22) * 0.18 * o.shake : 0);
    c.beginPath(); c.arc(0, -40, 26, 0, 7); fl(c, '#3d2a1e'); st(c, 3);
    c.beginPath(); c.arc(0, 0, 42, 0, 7); fl(c, '#d9a27c'); st(c, 4);
    c.beginPath(); c.arc(0, -4, 44, Math.PI * 1.0, Math.PI * 2.0); st(c, 14, '#3d2a1e');
    face(c, 42, o.mood || 'calm', 9);
    [-15, 15].forEach(e => { c.beginPath(); c.arc(e, -3, 13, 0, 7); st(c, 3); }); c.beginPath(); c.moveTo(-2, -3); c.lineTo(2, -3); st(c, 3);
    c.restore(); c.restore();
  }
  function say(c, x, y, text, k, size = 52) {
    if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); wob(c, 81, 1); c.font = `${size}px ${FELL}`; const w = c.measureText(text).width + 60, h = size + 40;
    c.beginPath(); c.moveTo(-w / 2 + 26, -h); c.lineTo(w / 2 - 26, -h); c.quadraticCurveTo(w / 2, -h, w / 2, -h + 26); c.lineTo(w / 2, -26); c.quadraticCurveTo(w / 2, 0, w / 2 - 26, 0);
    c.lineTo(-w / 2 + 70, 0); c.lineTo(-w / 2 + 34, 34); c.lineTo(-w / 2 + 46, 0); c.lineTo(-w / 2 + 26, 0); c.quadraticCurveTo(-w / 2, 0, -w / 2, -26); c.lineTo(-w / 2, -h + 26); c.quadraticCurveTo(-w / 2, -h, -w / 2 + 26, -h); c.closePath();
    fl(c, '#fffaf0'); st(c, 4); txt(c, text, 0, -h / 2, size, INK); c.restore();
  }
  function stamp(c, text, x, y, size, rot, k, col = RED) {
    if (k <= 0) return; const sc = 1 + (1 - S.ease.out(k)) * 1.4; c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc); c.globalAlpha = S.clamp(k * 2);
    c.font = `${size}px ${SC}`; const w = c.measureText(text).width + size * 0.8, h = size * 1.35;
    c.beginPath(); c.rect(-w / 2, -h / 2, w, h); st(c, size * 0.08, col); c.beginPath(); c.rect(-w / 2 + size * 0.14, -h / 2 + size * 0.14, w - size * 0.28, h - size * 0.28); st(c, size * 0.03, col);
    txt(c, text, 0, size * 0.04, size, col, SC); c.restore();
  }

  // ---------- the scenes, one per spoken sentence ----------
  const CUTS = ['in 1637', 'a skilled', 'traders bid', 'they called', 'february', 'within days', 'haarlem let', 'but a whole', 'only a handful', 'the ruin', 'the real bubble'];
  const VARN = { 0: 1, 10: 1 };
  let T = [];
  const scenes = [
    // 1. a 10,000 guilder bulb
    (c, t) => {
      c.drawImage(VARN_C, 0, 0);
      const lg = c.createRadialGradient(540, 820, 20, 540, 820, 520); lg.addColorStop(0, 'rgba(255,214,150,0.30)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = lg; c.fillRect(0, 0, 1080, 1920);
      c.save(); c.beginPath(); c.rect(0, 1130, 1080, 300); fl(c, '#3a2312'); hatch(c, () => { c.beginPath(); c.rect(0, 1130, 1080, 300); }, 0.1, 9, 'rgba(0,0,0,0.35)', 2, [0, 1130, 1080, 1430]); c.restore(); c.beginPath(); c.moveTo(0, 1130); c.lineTo(1080, 1130); st(c, 4, '#120a06');
      cushion(c, 540, 1110);
      tulip(c, 540, 1070, 1.25, S.ease.out(P(t, S.at('tulip') - 0.25, 0.9)), P(t, S.at('tulip') + 0.4, 0.6), 0);
      bulb(c, 540, 1060, 1.15);
      c.globalAlpha = S.ease.out(P(t, 0.05, 0.5)); txt(c, '1637', 540, 330 - 20 * (1 - S.ease.out(P(t, 0.05, 0.6))), 150, '#f2dcae', FELL); txt(c, 'THE DUTCH REPUBLIC', 540, 435, 40, 'rgba(242,220,174,0.75)', SC); c.globalAlpha = 1;
      const ta = S.at('10,000'), k = S.ease.bounce(P(t, ta - 0.25, 0.55)), sw = Math.sin((t - ta) * 5) * 0.12 * Math.exp(-(Math.max(0, t - ta)) * 1.6);
      if (t > ta - 0.25) { c.save(); c.translate(810, -40 + 620 * k); c.rotate(sw); c.beginPath(); c.moveTo(0, -700); c.lineTo(0, -60); st(c, 3, '#d8c49a'); wob(c, 91, 1);
        c.beginPath(); c.moveTo(-120, -60); c.lineTo(70, -60); c.lineTo(130, 20); c.lineTo(70, 100); c.lineTo(-120, 100); c.closePath(); fl(c, CREAM); st(c, 5);
        c.beginPath(); c.arc(80, 20, 12, 0, 7); fl(c, '#3a2312'); st(c, 3);
        const n = Math.round(10000 * S.ease.out(P(t, ta, 0.6))); txt(c, 'ƒ' + n.toLocaleString('en-US'), -24, 22, 66, RED, FELL); c.restore(); }
    },
    // 2. a skilled worker's year
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0);
      const px = 430, py = 640, a = -0.22 + Math.sin(t * 2) * 0.01 - 0.06 * Math.exp(-Math.max(0, t - S.at('300') - 0.6) * 4) * (t > S.at('300') + 0.6 ? 1 : 0) * -1;
      c.save(); wob(c, 101, 1); c.beginPath(); c.moveTo(px, py); c.lineTo(px, 1160); st(c, 16); st(c, 10, '#8a6a42'); c.beginPath(); c.moveTo(px - 140, 1180); c.lineTo(px + 140, 1180); c.lineTo(px + 100, 1150); c.lineTo(px - 100, 1150); c.closePath(); fl(c, '#8a6a42'); st(c, 4); c.restore();
      const L = 250, ca = Math.cos(a), sa = Math.sin(a), le = [px - L * ca, py - L * sa], re = [px + L * ca, py + L * sa];
      c.beginPath(); c.moveTo(le[0], le[1]); c.lineTo(re[0], re[1]); st(c, 18); st(c, 11, '#a9824f'); c.beginPath(); c.arc(px, py, 18, 0, 7); fl(c, GOLD); st(c, 3);
      const pan = (e, k) => { const bx = e[0], by = e[1] + 230; c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(bx - 95, by); c.moveTo(e[0], e[1]); c.lineTo(bx + 95, by); st(c, 2.5); c.beginPath(); c.moveTo(bx - 110, by); c.quadraticCurveTo(bx, by + 70, bx + 110, by); c.closePath(); fl(c, '#b8925c'); st(c, 4); return [bx, by]; };
      const [lbx, lby] = pan(le), [rbx, rby] = pan(re);
      bulb(c, lbx, lby - 36, 0.9); txt(c, 'ƒ10,000', lbx, lby + 100, 52, RED);
      const t3 = S.at('300'); for (let i = 0; i < 6; i++) { const ti = t3 - 0.1 + i * 0.08, k = S.ease.bounce(P(t, ti, 0.35)); if (t > ti) coin(c, rbx + (i % 2 ? 8 : -6), rby - 6 - i * 13 - (1 - k) * 300, 40); }
      c.globalAlpha = P(t, t3 + 0.2, 0.3); txt(c, 'ƒ300 · one year', rbx - 20, rby - 150, 46, INK); c.globalAlpha = 1;
      folk(c, 900, 1180, 1.3, { coat: '#7a6440', apron: true, hat: 'cap', mood: t > t3 + 0.5 ? 'shock' : 'calm', armL: t > t3 + 0.5 ? 1.1 : 0.2, k: 2 });
      c.globalAlpha = P(t, t3 + 0.9, 0.4); txt(c, 'one bulb = 33 years of pay', 540, 300, 58, INK, FELL); c.globalAlpha = 1;
    },
    // 3. bidding in taverns for bulbs under the ground
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0);
      const z = 1 + 0.1 * S.ease.inOut(P(t, S.at('underground') - 0.3, 0.8)); c.save(); c.translate(540, 1150); c.scale(z, z); c.translate(-540, -1150);
      c.beginPath(); c.rect(0, 160, 1080, 120); fl(c, '#5b3e25'); hatch(c, () => { c.beginPath(); c.rect(0, 160, 1080, 120); }, 0, 8, 'rgba(0,0,0,0.4)', 2, [0, 160, 1080, 280]); c.beginPath(); c.rect(0, 160, 1080, 120); st(c, 4);
      for (let x = 60; x < 1080; x += 240) { c.beginPath(); c.rect(x, 280, 40, 720); fl(c, '#6e4c2e'); st(c, 4); }
      c.save(); wob(c, 111, 1); c.beginPath(); c.ellipse(170, 760, 110, 40, 0, 0, 7); c.rect(60, 760, 220, 200); fl(c, '#8a5b33'); st(c, 4); c.beginPath(); c.moveTo(60, 820); c.lineTo(280, 820); c.moveTo(60, 900); c.lineTo(280, 900); st(c, 6, '#3a2715'); c.restore();
      const bids = [['ƒ800!', S.at('bid')], ['ƒ900!', S.at('taverns')], ['ƒ1,000!', S.at('bulbs') - 0.1]];
      folk(c, 380, 1000, 0.85, { coat: '#58603e', hat: 'wide', mood: 'happy', armR: t > bids[0][1] ? 2.6 : 0.3, k: 4 });
      pieter(c, 620, 1000, 0.85, { mood: 'smug', armR: t > bids[2][1] ? 2.7 : 0.3, armL: 0.2 });
      folk(c, 860, 1000, 0.85, { coat: '#6d4a5e', hat: 'cap', hatCol: '#7d1f17', mood: 'happy', armL: t > bids[1][1] ? 2.6 : 0.3, k: 5, hair: '#7a5230' });
      c.beginPath(); c.rect(200, 880, 860, 40); fl(c, '#7a5230'); st(c, 4); c.beginPath(); c.rect(220, 920, 820, 80); fl(c, '#5e3e22'); hatch(c, () => { c.beginPath(); c.rect(220, 920, 820, 80); }, 1.2, 9, 'rgba(0,0,0,0.35)', 2, [220, 920, 1040, 1000]); c.beginPath(); c.rect(220, 920, 820, 80); st(c, 4);
      [[300, 860], [760, 860]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 22, y - 50); c.lineTo(x + 22, y - 50); c.lineTo(x + 18, y + 20); c.lineTo(x - 18, y + 20); c.closePath(); fl(c, '#9a8a6e'); st(c, 3); });
      const pos = [[380, 560], [860, 560], [620, 520]]; bids.forEach(([s, ti], i) => say(c, pos[i][0], pos[i][1], s, pop(t, ti, 0.3), 46));
      c.beginPath(); c.rect(0, 1000, 1080, 920); fl(c, '#7b5634'); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 1060 + i * 70); for (let x = 0; x <= 1080; x += 60) c.lineTo(x, 1060 + i * 70 + Math.sin(x * 0.02 + i) * 10); st(c, 2.5, 'rgba(40,20,5,0.4)'); }
      c.beginPath(); c.moveTo(0, 1000); for (let x = 0; x <= 1080; x += 30) c.lineTo(x, 1000 + J(x) * 4); st(c, 5);
      const tb = S.at('bulbs'); [[300, 1165], [540, 1185], [780, 1160]].forEach(([x, y], i) => { bulb(c, x, y, 0.75, i);
        if (t > tb) { const k = S.ease.out(P(t, tb + i * 0.1, 0.5)), fx = pos[i][0], fy = pos[i][1] + 40; c.save(); c.setLineDash([10, 12]); c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + (x - fx) * k, fy + (y - 70 - fy) * k); st(c, 4, RED); c.restore(); } });
      c.restore();
      c.globalAlpha = P(t, S.at('underground'), 0.4); stamp(c, 'still in the ground', 540, 1300, 46, -0.03, P(t, S.at('underground'), 0.3)); c.globalAlpha = 1;
    },
    // 4. the wind trade: no flowers, only paper
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0); const tw = S.at('wind');
      c.save(); c.beginPath(); c.rect(0, 0, 1080 * S.ease.out(P(t, tw - 0.1, 0.6)), 600); c.clip(); txt(c, 'Windhandel', 540, 360, 150, INK, BL); c.restore();
      c.globalAlpha = P(t, S.at('trade'), 0.4); txt(c, '“THE WIND TRADE”', 540, 490, 44, RED, SC); c.globalAlpha = 1;
      for (let i = 0; i < 7; i++) { const y = 620 + i * 80, off = ((t * 520 + i * 260) % 1500) - 300; c.beginPath(); c.moveTo(off, y); c.bezierCurveTo(off + 120, y - 30, off + 220, y + 30, off + 330, y); if (i % 2) { c.arc(off + 330, y - 26, 26, Math.PI / 2, Math.PI * 2.2, true); } st(c, 3, 'rgba(34,23,15,0.35)'); }
      const tn = S.at('no flowers'), th = S.at('changed hands'), k = S.ease.out(P(t, tn - 0.4, 0.6)), shake = t > th ? Math.sin((t - th) * 18) * 14 * Math.exp(-(t - th) * 2) : 0;
      c.save(); c.translate(0, shake);
      c.beginPath(); c.moveTo(-80, 920); c.lineTo(-80 + 520 * k, 900); st(c, 64); st(c, 54, COAT); c.beginPath(); c.moveTo(1160, 920); c.lineTo(1160 - 520 * k, 900); st(c, 64); st(c, 54, '#6b5a3c');
      c.beginPath(); c.ellipse(-80 + 590 * k, 902, 52, 38, 0, 0, 7); fl(c, SKIN); st(c, 4); c.beginPath(); c.ellipse(1160 - 590 * k, 898, 52, 38, 0, 0, 7); fl(c, SKIN); st(c, 4); c.restore();
      const tf = S.at('flowers'); if (t > tf - 0.1) { c.save(); c.globalAlpha = 0.55; c.setLineDash([12, 12]); c.translate(540, 820); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -120); c.moveTo(0, -120); c.bezierCurveTo(-60, -140, -50, -230, 0, -240); c.bezierCurveTo(50, -230, 60, -140, 0, -120); st(c, 4); c.restore();
        const x = S.ease.out(P(t, tf + 0.15, 0.3)); c.beginPath(); c.moveTo(450, 560); c.lineTo(450 + 180 * x, 560 + 260 * x); c.moveTo(630, 560); c.lineTo(630 - 180 * x, 560 + 260 * x); st(c, 12, RED); }
      const tp = S.at('paper'); for (let i = 0; i < 9; i++) { const ti = tp - 0.2 + i * 0.09; if (t < ti) continue; const u = (t - ti) * 520, y = 1020 + (i % 3) * 70 - (i % 2) * 380 + Math.sin(u * 0.01 + i) * 40; scroll(c, -150 + u + (i * 47) % 120, y, Math.sin(u * 0.012 + i) * 0.6, 0.85, i); }
    },
    // 5. February 1637: an auction in Haarlem, no buyers
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0); c.fillStyle = 'rgba(70,45,20,0.18)'; c.fillRect(0, 0, 1080, 1920);
      [[180, 260], [420, 260], [660, 260], [900, 260]].forEach(([x, y]) => { c.save(); c.beginPath(); c.rect(x - 80, y, 160, 330); fl(c, '#f6ecd0'); c.beginPath(); for (let i = -2; i < 6; i++) { c.moveTo(x - 80, y + i * 60); c.lineTo(x + 80, y + i * 60 + 160); c.moveTo(x + 80, y + i * 60); c.lineTo(x - 80, y + i * 60 + 160); } c.save(); c.beginPath(); c.rect(x - 80, y, 160, 330); c.clip(); c.beginPath(); for (let i = -2; i < 7; i++) { c.moveTo(x - 80, y + i * 60); c.lineTo(x + 80, y + i * 60 + 160); c.moveTo(x + 80, y + i * 60); c.lineTo(x - 80, y + i * 60 + 160); } st(c, 2, 'rgba(34,23,15,0.4)'); c.restore(); c.beginPath(); c.rect(x - 80, y, 160, 330); st(c, 5); c.restore(); });
      const g = c.createLinearGradient(0, 600, 0, 1300); g.addColorStop(0, 'rgba(255,240,200,0.25)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(100, 590); c.lineTo(980, 590); c.lineTo(1080, 1300); c.lineTo(0, 1300); c.fill();
      c.beginPath(); c.moveTo(0, 820); c.lineTo(1080, 820); st(c, 4);
      pieter(c, 300, 1010, 1.05, { mood: t > S.at('no buyers') ? 'worried' : 'smug', armR: t > S.at('auction') ? 2.5 : 0.4, hold: 'tulip', armL: 0.2 });
      c.save(); wob(c, 121, 1); c.beginPath(); c.moveTo(170, 860); c.lineTo(430, 860); c.lineTo(400, 1080); c.lineTo(200, 1080); c.closePath(); fl(c, '#6e4c2e'); hatch(c, () => { c.beginPath(); c.moveTo(170, 860); c.lineTo(430, 860); c.lineTo(400, 1080); c.lineTo(200, 1080); c.closePath(); }, 0.4, 9, 'rgba(0,0,0,0.35)', 2, [170, 860, 430, 1080]); c.beginPath(); c.moveTo(170, 860); c.lineTo(430, 860); c.lineTo(400, 1080); c.lineTo(200, 1080); c.closePath(); st(c, 4); c.restore();
      for (let r = 0; r < 3; r++) { const y = 1000 + r * 100, x0 = 520 - r * 40, x1 = 1040; c.beginPath(); c.rect(x0, y, x1 - x0, 26); fl(c, '#8a5b33'); st(c, 4); c.beginPath(); c.moveTo(x0 + 20, y + 26); c.lineTo(x0 + 20, y + 80); c.moveTo(x1 - 30, y + 26); c.lineTo(x1 - 30, y + 80); st(c, 6); }
      stamp(c, 'Feb 1637 · Haarlem', 760, 700, 50, -0.06, P(t, S.at('february') - 0.1, 0.35));
      const tn = S.at('no buyers'); if (t > tn) { const u = (t - tn) / 1.6, bx = 1150 - u * 900, by = 960 + Math.sin(u * 12) * 30; c.save(); c.translate(bx, by); c.beginPath(); c.ellipse(0, 0, 22, 14, 0, 0, 7); fl(c, '#7a5a3a'); st(c, 3); const f = Math.sin(t * 30) * 16; c.beginPath(); c.moveTo(0, -4); c.lineTo(14, -20 - f); c.lineTo(28, -4); fl(c, '#5a3f28'); st(c, 2.5); c.beginPath(); c.arc(-18, -6, 9, 0, 7); fl(c, '#7a5a3a'); st(c, 2.5); c.restore(); }
      say(c, 470, 470, 'Anyone?', pop(t, S.at('buyers') + 0.15, 0.3), 52);
    },
    // 6. prices collapse
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0); c.beginPath(); for (let y = 280; y < 1340; y += 54) { c.moveTo(60, y); c.lineTo(1020, y); } st(c, 1.5, 'rgba(70,110,150,0.25)'); c.beginPath(); c.moveTo(150, 240); c.lineTo(150, 1340); st(c, 2.5, 'rgba(194,50,29,0.5)');
      txt(c, 'PRICE OF ONE BULB', 170, 230, 40, INK, SC, 'left');
      const tc = S.at('collapsed'), pts = [[170, 1150], [260, 1110], [330, 1060], [400, 960], [470, 900], [540, 720], [610, 600], [680, 430]], k = S.ease.out(P(t, S.sentenceAt(t).s - 0.1, 0.9));
      c.beginPath(); const n = Math.max(1, Math.floor(k * (pts.length - 1))); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= n; i++) c.lineTo(pts[i][0] + J(i) * 3, pts[i][1] + J(i + 9) * 3); st(c, 10, RED);
      const d = S.ease.in(P(t, tc - 0.05, 0.35)); if (d > 0) { c.beginPath(); c.moveTo(680, 430); c.lineTo(700, 430 + 1100 * d); st(c, 10, RED); }
      const top = pts[n]; const fall = S.ease.in(P(t, tc + 0.05, 0.8));
      tulip(c, top[0], top[1] - 6 + fall * 1100, 0.55, 1, 1, S.ease.out(P(t, tc - 0.2, 0.4)));
      for (let i = 0; i < 4; i++) { if (t < tc) break; const u = t - tc, x = 690 + Math.sin(u * 3 + i * 2) * (60 + i * 20) + i * 30, y = 330 + u * (300 + i * 80); c.save(); c.translate(x, y); c.rotate(u * 3 + i); c.scale(0.5, 0.5); petal(c, 0, 34, 96, i); c.restore(); }
      stamp(c, 'Crash', 820, 1000, 110, 0.12, P(t, tc + 0.1, 0.3));
    },
    // 7. walk away for 3.5% of the price
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0);
      c.beginPath(); c.rect(0, 1000, 1080, 400); fl(c, '#8a5b33'); hatch(c, () => { c.beginPath(); c.rect(0, 1000, 1080, 400); }, 0.04, 10, 'rgba(0,0,0,0.3)', 2, [0, 1000, 1080, 1400]); c.beginPath(); c.moveTo(0, 1000); c.lineTo(1080, 1000); st(c, 5);
      const cx = 420, cy = 800, rx = 330, ry = 120, hgt = 120, w0 = 0.32, w1 = w0 + 0.035 * Math.PI * 2, t35 = S.at('3.5'), cut = S.ease.out(P(t, t35 - 0.1, 0.5));
      c.save(); wob(c, 131, 1); c.beginPath(); c.ellipse(cx, cy + hgt, rx, ry, 0, 0, Math.PI); c.lineTo(cx - rx, cy); c.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true); c.closePath(); fl(c, '#d9a33c'); st(c, 5);
      c.beginPath(); if (cut > 0) { c.moveTo(cx, cy); c.ellipse(cx, cy, rx, ry, 0, w1, w0 + Math.PI * 2); c.closePath(); } else c.ellipse(cx, cy, rx, ry, 0, 0, 7); fl(c, '#f2d27a'); st(c, 5);
      if (cut > 0) { const mx = Math.cos((w0 + w1) / 2), my = Math.sin((w0 + w1) / 2), ox = mx * 170 * cut, oy = my * 170 * cut; c.save(); c.translate(ox, oy); c.beginPath(); c.moveTo(cx, cy); c.ellipse(cx, cy, rx, ry, 0, w0, w1); c.closePath(); fl(c, '#f2d27a'); st(c, 4); c.beginPath(); c.moveTo(cx + Math.cos(w0) * rx, cy + Math.sin(w0) * ry); c.lineTo(cx + Math.cos(w0) * rx, cy + Math.sin(w0) * ry + hgt); c.lineTo(cx + Math.cos(w1) * rx, cy + Math.sin(w1) * ry + hgt); c.lineTo(cx + Math.cos(w1) * rx, cy + Math.sin(w1) * ry); c.closePath(); fl(c, '#d9a33c'); st(c, 4); c.restore();
        txt(c, '3.5%', 820, 600, 120, RED, FELL); c.beginPath(); c.moveTo(800, 660); c.quadraticCurveTo(780, 760, cx + mx * 170 * cut + 250, cy + my * ry + 40); st(c, 5, RED); }
      txt(c, 'THE FULL PRICE', cx - 40, cy - 10, 46, 'rgba(34,23,15,0.75)', SC); c.restore();
      const tw = S.at('walk away'), wk = Math.max(0, t - tw), px = 860 + wk * 230;
      pieter(c, px, 1080, 1.0, { mood: t > tw ? 'relief' : 'worried', walk: t > tw ? wk * 9 : 0, armL: t > tw ? 2.4 : 0.6, hold: t > tw + 0.25 ? null : 'contract' });
      if (t > tw + 0.25) { const u = t - tw - 0.25; scroll(c, 820 + u * 120, 640 - u * 380 + u * u * 300, u * 4, 0.6, 9); }
    },
    // 8. a whole country ruined? historians say no
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0);
      c.save(); c.beginPath(); c.rect(60, 250, 960, 950); c.clip(); for (let y = 270; y < 1200; y += 22) { c.beginPath(); c.moveTo(60, y); for (let x = 60; x < 520; x += 40) c.lineTo(x, y + Math.sin(x * 0.05 + y) * 3); st(c, 1.5, 'rgba(50,80,110,0.35)'); } c.restore();
      txt(c, 'MARE GERMANICUM', 250, 520, 30, 'rgba(50,80,110,0.7)', SC);
      const land = [[520, 260], [600, 300], [640, 380], [700, 360], [800, 330], [940, 300], [1000, 420], [990, 620], [1010, 780], [960, 960], [900, 1100], [760, 1160], [620, 1120], [520, 1160], [440, 1100], [420, 1000], [480, 900], [500, 780], [470, 680], [510, 560], [480, 420]];
      c.save(); wob(c, 141, 1); c.beginPath(); land.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); fl(c, '#e2d0a2'); st(c, 5);
      c.beginPath(); c.moveTo(640, 380); c.quadraticCurveTo(700, 520, 640, 640); c.quadraticCurveTo(620, 720, 700, 760); st(c, 3, 'rgba(50,80,110,0.6)'); c.restore();
      c.beginPath(); c.arc(560, 700, 10, 0, 7); fl(c, RED); txt(c, 'Haarlem', 580, 700, 36, INK, FELL, 'left'); c.beginPath(); c.arc(610, 760, 8, 0, 7); fl(c, INK); txt(c, 'Amsterdam', 630, 770, 32, INK, FELL, 'left');
      txt(c, 'THE DUTCH REPUBLIC', 600, 1215, 40, INK, SC);
      const tr = S.at('ruined'), tno = S.at('say no'), off = S.ease.in(P(t, tno + 0.25, 0.5));
      c.save(); c.translate(off * 160, off * 900); c.rotate(off * 0.8); stamp(c, 'Ruined?', 600, 620, 120, -0.12, P(t, tr - 0.05, 0.3)); c.restore();
      const th = S.at('historians'), hx = 1300 - 400 * S.ease.out(P(t, th - 0.3, 0.6));
      historian(c, hx, 1290, 1.15, { walk: t < th + 0.3 ? t * 9 : 0, shake: t > tno - 0.1 && t < tno + 0.8 ? 1 : 0, mood: 'calm' });
      say(c, hx - 30, 830, 'No.', pop(t, S.at('no', 1, tno - 0.01) + 0.05, 0.3), 60);
    },
    // 9. only a handful hit real trouble
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0); const th = S.at('handful'), red = [7, 22, 31, 44, 52];
      for (let i = 0; i < 60; i++) { const col = i % 8, row = Math.floor(i / 8), x = 130 + col * 117 + (row % 2) * 30, y = 420 + row * 118, hit = red.includes(i) && t > th + red.indexOf(i) * 0.06;
        c.save(); c.globalAlpha = t > th + 0.4 && !hit ? 0.45 : 1; folk(c, x, y + 70, 0.3, { coat: hit ? RED : '#6b5a3c', hat: ['cap', 'wide', 'cap', 'none'][i % 4], mood: hit ? 'sad' : 'calm', k: i, hair: i % 4 === 3 ? '#5a3b22' : null }); c.restore();
        if (hit) { const k = pop(t, th + red.indexOf(i) * 0.06, 0.3); c.save(); c.translate(x, y - 70); c.scale(k, k); c.beginPath(); c.arc(-14, 0, 16, 0, 7); c.arc(8, -6, 20, 0, 7); c.arc(26, 2, 14, 0, 7); fl(c, '#6e7480'); c.beginPath(); for (let d = 0; d < 3; d++) { const yy = ((t * 120 + d * 13) % 30); c.moveTo(-10 + d * 14, 16 + yy); c.lineTo(-14 + d * 14, 24 + yy); } st(c, 2.5, '#4c7ca8'); c.restore(); }
      }
      c.globalAlpha = P(t, th + 0.2, 0.4); txt(c, 'A HANDFUL', 540, 290, 84, RED, SC); c.globalAlpha = 1;
    },
    // 10. the legend came from satire, retold in 1841
    (c, t) => {
      c.drawImage(PAPER_C, 0, 0); const b0 = 230, b1 = 1180;
      c.beginPath(); c.rect(70, b0, 940, b1 - b0); fl(c, '#f1e5c6'); c.save(); c.beginPath(); c.rect(70, b0, 940, 520); c.clip(); for (let y = b0; y < b0 + 520; y += 10) { c.beginPath(); c.moveTo(70, y); c.lineTo(1010, y); st(c, 1.2, 'rgba(34,23,15,0.25)'); } c.restore();
      c.beginPath(); c.rect(70, b0, 940, b1 - b0); st(c, 6); c.beginPath(); c.rect(88, b0 + 18, 904, b1 - b0 - 36); st(c, 2);
      c.beginPath(); c.moveTo(88, 980); c.quadraticCurveTo(540, 940, 992, 990); c.lineTo(992, b1 - 18); c.lineTo(88, b1 - 18); c.closePath(); fl(c, '#d4c08e'); st(c, 3);
      const x = 160 + ((t - T[9]) * 90) % 900, wy = 900;
      c.save(); c.translate(x, wy); wob(c, 151, 1); c.beginPath(); c.rect(-150, -40, 300, 70); fl(c, '#8a5b33'); st(c, 4);
      [-100, 100].forEach(w => { c.beginPath(); c.arc(w, 40, 40, 0, 7); fl(c, '#6e4c2e'); st(c, 4); c.save(); c.translate(w, 40); c.rotate(t * 4); c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(0, 0); c.lineTo(Math.cos(i * 0.785 * 2) * 38, Math.sin(i * 0.785 * 2) * 38); } st(c, 3); c.restore(); });
      c.beginPath(); c.moveTo(0, -40); c.lineTo(0, -420); st(c, 8); c.save(); c.translate(0, -230); c.scale(1.4, 1.4); petal(c, -0.35, 60, 150, 1); petal(c, 0.35, 60, 150, 2); petal(c, 0, 64, 170, 3); c.restore();
      folk(c, -95, -40, 0.42, { coat: '#e9c24a', hat: 'fool', mood: 'happy', armR: 2.6, k: 1 }); folk(c, 95, -40, 0.42, { coat: RED, hat: 'fool', mood: 'happy', armL: 2.6, k: 7 }); c.restore();
      const tsat = S.at('satire'); c.save(); c.translate(540, 330); c.scale(pop(t, tsat - 0.1, 0.35), pop(t, tsat - 0.1, 0.35)); c.beginPath(); c.moveTo(-300, -44); c.lineTo(300, -44); c.lineTo(340, 0); c.lineTo(300, 44); c.lineTo(-300, 44); c.lineTo(-340, 0); c.closePath(); fl(c, CREAM); st(c, 4); txt(c, 'A SATIRE, 1637', 0, 4, 54, RED, SC); c.restore();
      const tb = S.at('1841'), d = S.ease.in(P(t, tb - 0.35, 0.35));
      if (d > 0) { const by = -900 + 1600 * d; c.save(); c.translate(540, by); c.rotate(-0.05); c.beginPath(); c.rect(-330, -420, 660, 840); fl(c, '#6d1c16'); st(c, 6); c.beginPath(); c.rect(-300, -390, 600, 780); st(c, 3, GOLD); c.beginPath(); c.rect(-330, 400, 660, 40); fl(c, '#efe1bf'); st(c, 4);
        txt(c, 'Popular', 0, -150, 92, GOLD, FELL); txt(c, 'Delusions', 0, -50, 92, GOLD, FELL); txt(c, '1841', 0, 160, 140, GOLD, FELL); c.restore();
        if (t > tb) { for (let i = 0; i < 10; i++) { const u = S.p(t, tb, tb + 0.8), a = i / 10 * Math.PI - Math.PI, r = 380 + u * 220; c.beginPath(); c.arc(540 + Math.cos(a) * r * 1.0 + (i % 2) * 40 - 20, 1160 + Math.sin(a) * 60 * u, 30 * (1 - u) + 6, 0, 7); c.fillStyle = `rgba(200,180,140,${0.7 * (1 - u)})`; c.fill(); } } }
    },
    // 11. the real bubble was the story
    (c, t) => {
      c.drawImage(VARN_C, 0, 0);
      const lg = c.createRadialGradient(470, 760, 20, 470, 760, 600); lg.addColorStop(0, 'rgba(255,214,150,0.28)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = lg; c.fillRect(0, 0, 1080, 1920);
      c.beginPath(); c.rect(0, 1130, 1080, 300); fl(c, '#3a2312'); c.beginPath(); c.moveTo(0, 1130); c.lineTo(1080, 1130); st(c, 4, '#120a06');
      cushion(c, 430, 1110); bulb(c, 430, 1060, 1.1);
      const ts = S.at('story', 2), popK = S.p(t, ts, ts + 0.35), bx = 430 + Math.sin(t * 1.3) * 18, by = 640 + Math.sin(t * 1.7) * 14 - 40 * S.ease.out(P(t, T[10], 1));
      if (t < ts) { tulip(c, bx, by + 170, 0.95, 1, 1, 0); c.save(); c.beginPath(); c.arc(bx, by, 250, 0, 7); const g = c.createRadialGradient(bx - 80, by - 90, 10, bx, by, 250); g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(0.7, 'rgba(160,200,255,0.05)'); g.addColorStop(1, 'rgba(255,190,230,0.30)'); c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(255,240,220,0.7)'; c.stroke(); c.beginPath(); c.arc(bx - 100, by - 110, 40, Math.PI, Math.PI * 1.5); c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.stroke(); c.restore(); }
      else { for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 250 + popK * 160; c.beginPath(); c.arc(bx + Math.cos(a) * r, by + Math.sin(a) * r, 10 * (1 - popK) + 2, 0, 7); c.fillStyle = `rgba(255,235,210,${1 - popK})`; c.fill(); }
        for (let i = 0; i < 4; i++) { const u = t - ts; c.save(); c.translate(bx + (i - 1.5) * 90 + Math.sin(u * 3 + i) * 30, by + 120 + u * 260); c.rotate(u * 2 + i); c.scale(0.6, 0.6); petal(c, 0, 34, 96, i); c.restore(); } }
      pieter(c, 830, 1270, 1.1, { mood: t > ts ? 'relief' : 'smug', armL: t > ts - 0.5 ? 2.2 : 0.3, armR: 0.2 });
      c.globalAlpha = P(t, ts + 0.5, 0.6); txt(c, 'Tulip mania', 540, 300, 110, '#f2dcae', FELL); txt(c, 'THE CRASH THAT RUINED (ALMOST) NO ONE', 540, 400, 34, 'rgba(242,220,174,0.75)', SC); c.globalAlpha = 1;
    },
  ];

  // ---------- captions: Fell type on a torn paper strip ----------
  const HI = /^(1637|10,000|300|underground|wind|paper|no|collapsed|3\.5|ruined|handful|satire|1841|story)$/i;
  function captions(c, t) {
    const sn = S.sentenceAt(t); if (!sn || t > sn.e + 0.9 || t < sn.s - 0.1) return;
    c.font = `60px ${FELL}`; const words = sn.words, lines = [[]]; let w = 0;
    words.forEach(x => { const ww = c.measureText(x.w + ' ').width; if (w + ww > 880 && lines[lines.length - 1].length) { lines.push([]); w = 0; } lines[lines.length - 1].push(x); w += ww; });
    const y0 = 1470 - (lines.length - 1) * 38, h = lines.length * 76 + 40, fade = 1 - S.p(t, sn.e + 0.5, sn.e + 0.9);
    c.save(); c.globalAlpha = fade; c.translate(0, 0); c.beginPath(); c.moveTo(70, y0 - 58); for (let x = 70; x <= 1010; x += 30) c.lineTo(x, y0 - 58 + S.hash(x + sn.i * 7) * 9); for (let x = 1010; x >= 70; x -= 30) c.lineTo(x, y0 - 58 + h + S.hash(x * 3 + sn.i) * 9); c.closePath();
    c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 16; c.shadowOffsetY = 6; fl(c, '#f9f1dc'); c.shadowColor = 'transparent';
    lines.forEach((ln, li) => { let tw = 0; ln.forEach(x => tw += c.measureText(x.w + ' ').width); let x = 540 - tw / 2;
      ln.forEach(wd => { const k = S.p(t, wd.s - 0.05, wd.s + 0.12), ww = c.measureText(wd.w + ' ').width; c.globalAlpha = fade * (0.18 + 0.82 * k); const hi = HI.test(wd.w.replace(/[^\w.,]/g, '').replace(/[.,]$/, ''));
        c.fillStyle = hi ? RED : INK; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(wd.w, x, y0 + li * 76 - 6 * (1 - k)); x += ww; }); });
    c.restore();
  }

  FILM({
    title: 'The tulip crash that never ruined anyone', fonts: ['IM Fell English:ital@0;1', 'IM Fell English SC', 'UnifrakturMaguntia'], size: [1080, 1920], tail: 1.6,
    init(s) { S = s; PAPER_C = makePaper(); VARN_C = makeVarnish(); GRAIN = makeGrain(); T = CUTS.map((q, i) => i === 0 ? 0 : S.at(q) - 0.14); },
    draw(c, t) {
      S._t = t; boil = Math.floor(t * 12); let i = 0; while (i < T.length - 1 && t >= T[i + 1]) i++;
      const sceneDraw = (k) => { c.save(); const lt = t - T[k], dur = (T[k + 1] || S.length) - T[k], z = 1 + 0.035 * S.clamp(lt / dur); c.translate(540, 820); c.scale(z, z); c.translate(-540, -820); scenes[k](c, t); c.restore(); };
      let sh = 0; [S.at('10,000') + 0.25, S.at('collapsed'), S.at('ruined'), S.at('1841')].forEach(a => { if (t > a && t < a + 0.4) sh = Math.max(sh, 14 * (1 - (t - a) / 0.4)); });
      c.save(); c.translate(J(901) * sh, J(902) * sh);
      sceneDraw(i);
      if (i > 0) {
        const f = S.ease.inOut(S.p(t, T[i] - 0.001, T[i] + 0.34));
        if (f < 1) {
          if ((VARN[i] || 0) !== (VARN[i - 1] || 0)) { // ink blot between the paper print and the oil painting
            const r = 1250 * Math.sin(Math.PI * Math.min(1, f + 0.5)) ; c.save(); c.beginPath(); for (let a = 0; a <= 64; a++) { const an = a / 64 * Math.PI * 2, rr = r * (0.88 + 0.22 * S.noise(a * 0.7 + i * 9)); c.lineTo(540 + Math.cos(an) * rr, 900 + Math.sin(an) * rr); } c.fillStyle = INK; c.fill(); c.restore();
          } else { // the old page slides away upward, uncovering the new one
            c.save(); c.translate(0, -1920 * f); c.beginPath(); c.rect(0, 0, 1080, 1920); c.clip(); scenes[i - 1](c, T[i] - 0.01); c.restore();
            c.save(); const gy = 1920 * (1 - f); const g = c.createLinearGradient(0, gy, 0, gy + 60); g.addColorStop(0, 'rgba(40,25,10,0.35)'); g.addColorStop(1, 'rgba(40,25,10,0)'); c.fillStyle = g; c.fillRect(0, gy, 1080, 60); c.restore();
          }
        }
      }
      c.restore();
      captions(c, t);
      c.save(); c.globalAlpha = 0.07; c.globalCompositeOperation = 'overlay'; const pat = c.createPattern(GRAIN, 'repeat'); c.translate((boil * 37) % 256, (boil * 91) % 256); c.fillStyle = pat; c.fillRect(-256, -256, 1080 + 512, 1920 + 512); c.restore();
      const v = c.createRadialGradient(540, 960, 700, 540, 960, 1300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,10,0,0.35)'); c.fillStyle = v; c.fillRect(0, 0, 1080, 1920);
    },
  });
})();
