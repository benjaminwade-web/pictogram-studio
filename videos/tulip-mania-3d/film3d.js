// "The tulip crash that never ruined anyone", 3D version. Original film, built only for this story.
// Look: a handmade miniature diorama of the Dutch Golden Age. Ten little sets stand on a turntable;
// the camera whip-pans from one to the next. Clay-like characters with bead eyes, warm window light,
// tilt-shift depth of field, soft shadows. Cast: Pieter the bulb trader, a carpenter, traders, a historian.
let T, k, S, scene, cam, sun, hemi, blur, MC = {}, sets = [], CUT = [];
const R = 22, N = 10, SLOT = Math.PI * 2 / N;
const C = { wood: '#7a4e2c', woodD: '#4a2e1a', woodL: '#a77a4d', velvet: '#8a1f27', gold: '#e2aa3c', cream: '#f4e7cb', ink: '#2a1c12', red: '#d43d2c', white: '#fffaf0', leaf: '#4f8a3a', skin: '#f2c3a0', soil: '#5b3a22', plaster: '#e8dcc2', brick: '#a8553c', sea: '#5d8fa8', grass: '#86a85a' };

const M = (c, r = 0.7, m = 0, x = {}) => { const key = [c, r, m, JSON.stringify(x)].join('|'); return MC[key] || (MC[key] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, x))); };
const RB = (w, h, d, r = 0.06) => new k.RoundedBoxGeometry(w, h, d, 3, Math.max(0.005, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002)));
const CY = (rt, rb, h, seg = 32, open = false, ts = 0, tl = Math.PI * 2) => new T.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl);
const SP = (r, ws = 24, hs = 16) => new T.SphereGeometry(r, ws, hs);
const CAP = (r, l) => new T.CapsuleGeometry(r, l, 6, 16);
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, cast = true) { const o = new T.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; if (parent) parent.add(o); return o; }
function grp(parent, x = 0, y = 0, z = 0) { const g = new T.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
const ease = () => S.ease;
const P01 = (t, a, d = 0.4) => S.p(t, a, a + d);
const at = (q, n, after) => S.at(q, n, after);
const damp = (t, a, f = 9, d = 3) => t < a ? 0 : Math.sin((t - a) * f) * Math.exp(-(t - a) * d);
const noise = (x, s = 0) => S.noise(x + s * 17.3) * 2 - 1;

// ---------- textures drawn for this film ----------
function tex(w, h, draw, repeat) { const t = k.canvasTexture(w, h, draw); if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } return t; }
function labelMat(w, h, draw) { return new T.MeshStandardMaterial({ map: tex(w, h, draw), roughness: 0.85, transparent: true, side: T.DoubleSide }); }
function plane(w, h, mat, parent, x = 0, y = 0, z = 0) { const m = mesh(new T.PlaneGeometry(w, h), mat, parent, x, y, z, false); return m; }
function sprite(w, h, draw, parent) { const s = new T.Sprite(new T.SpriteMaterial({ map: tex(512, Math.round(512 * h / w), draw), transparent: true, depthWrite: false })); s.scale.set(w, h, 1); if (parent) parent.add(s); return s; }
function bubbleDraw(text, fill = '#fffaf0', ink = C.ink, size = 120) { return (c, w, h) => { const r = 60, bh = h - 70; c.fillStyle = fill; c.strokeStyle = ink; c.lineWidth = 14; c.beginPath(); c.roundRect(10, 10, w - 20, bh - 10, r); c.fill(); c.stroke(); c.beginPath(); c.moveTo(w * 0.3, bh - 6); c.lineTo(w * 0.24, h - 8); c.lineTo(w * 0.44, bh - 6); c.closePath(); c.fill(); c.stroke(); c.fillStyle = fill; c.fillRect(w * 0.28, bh - 20, w * 0.18, 16);
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${size}px Fraunces`; let z = size; while (c.measureText(text).width > w - 80 && z > 30) { z -= 6; c.font = `900 ${z}px Fraunces`; } c.fillText(text, w / 2, bh / 2 + 6); }; }
function flameTex() { return tex(512, 512, (c, w, h) => { c.fillStyle = '#fff6ea'; c.fillRect(0, 0, w, h); const r = S.rng(5); for (let i = 0; i < 26; i++) { const x = r() * w; c.beginPath(); c.moveTo(x - 8, h); c.bezierCurveTo(x + (r() - 0.5) * 60, h * 0.6, x + (r() - 0.5) * 80, h * 0.3, x + (r() - 0.5) * 30, h * (0.05 + r() * 0.3)); c.lineWidth = 6 + r() * 22; c.strokeStyle = r() < 0.8 ? '#d8262a' : '#8f1420'; c.lineCap = 'round'; c.stroke(); } }); }

// ---------- tulip, bulb, coins ----------
function bulb(parent, s = 1) { const pts = [[0, -0.18], [0.12, -0.165], [0.2, -0.07], [0.2, 0.04], [0.13, 0.16], [0.05, 0.27], [0.012, 0.34], [0, 0.35]].map(([x, y]) => new T.Vector2(x, y));
  const g = grp(parent); const b = mesh(new T.LatheGeometry(pts, 32), M('#c78a52', 0.75), g); b.scale.setScalar(s);
  for (let i = 0; i < 5; i++) { const rt = mesh(CY(0.006, 0.004, 0.12 * s, 6), M('#6b4a2a', 0.9), g, (i - 2) * 0.03 * s, -0.22 * s, 0); rt.rotation.z = (i - 2) * 0.3; } return g; }
let FLAME;
function tulip(parent) {
  const g = grp(parent), stemG = grp(g), stem = mesh(CY(0.022, 0.028, 1, 10), M(C.leaf, 0.6), stemG, 0, 0.5, 0);
  const leaf = mesh(SP(0.16, 16, 12), M('#5a9a40', 0.55), g, -0.1, 0.25, 0); leaf.scale.set(0.35, 1.6, 0.12); leaf.rotation.z = 0.35;
  const leaf2 = mesh(SP(0.14, 16, 12), M('#5a9a40', 0.55), g, 0.09, 0.2, 0.02); leaf2.scale.set(0.3, 1.3, 0.12); leaf2.rotation.z = -0.4;
  const head = grp(g, 0, 1, 0), pm = new T.MeshStandardMaterial({ map: FLAME, roughness: 0.45, side: T.DoubleSide });
  for (let i = 0; i < 6; i++) { const p = mesh(new T.SphereGeometry(0.17, 14, 16, 0, Math.PI / 2.4, Math.PI * 0.12, Math.PI * 0.72), pm, head, 0, 0.16, 0); p.rotation.y = i * Math.PI / 3 + (i % 2) * 0.25; p.scale.set(i % 2 ? 0.93 : 1, 1.3, i % 2 ? 0.93 : 1); }
  return { g, stemG, head, leaves: [leaf, leaf2], set(grow, open, wilt = 0) { const gr = S.clamp(grow); stemG.scale.y = Math.max(0.001, gr); head.position.set(Math.sin(wilt) * 0.3 * gr, gr * (1 - wilt * 0.25), 0); head.rotation.z = -wilt * 1.9; const o = S.ease.back(S.clamp(open)); head.scale.setScalar(Math.max(0.001, o)); leaf.scale.y = Math.max(0.001, 1.6 * S.ease.out(S.clamp(grow * 1.6))); leaf2.scale.y = Math.max(0.001, 1.3 * S.ease.out(S.clamp(grow * 1.4))); stemG.rotation.z = -wilt * 0.35; } };
}
const coinGeo = () => CY(0.12, 0.12, 0.028, 28);
function coinMat() { return M(C.gold, 0.32, 0.55, { emissive: '#3a2000', emissiveIntensity: 0.25 }); }

// ---------- characters: clay figures with bead eyes ----------
function person(o = {}) {
  const g = new T.Group(), P = { g, o }, skin = M(o.skin || C.skin, 0.55), coat = M(o.coat || '#2f2723', 0.82), hairM = M(o.hairCol || '#3a2414', 0.75);
  P.legs = [-1, 1].map(sd => { const pv = grp(g, 0.12 * sd, 0.52, 0); mesh(CAP(0.085, 0.3), M(o.hose || '#e9dcc3', 0.85), pv, 0, -0.24, 0); mesh(RB(0.18, 0.1, 0.3, 0.045), M('#24170f', 0.5), pv, 0, -0.49, 0.05); return pv; });
  P.body = grp(g, 0, 0.52, 0);
  const torso = mesh(CAP(0.3, 0.3), coat, P.body, 0, 0.42, 0); torso.scale.set(1, 1, 0.84);
  if (o.breeches) { const b = mesh(SP(0.3), M(o.breeches, 0.85), P.body, 0, 0.1, 0); b.scale.set(1.08, 0.5, 0.88); }
  if (o.apron) { const a = mesh(RB(0.4, 0.46, 0.04, 0.02), M('#eee2c6', 0.95), P.body, 0, 0.3, 0.255); a.rotation.x = -0.1; }
  if (o.sash) { const sg = grp(P.body, 0, 0.45, 0); sg.rotation.z = 0.6; const s = mesh(new T.TorusGeometry(0.3, 0.04, 8, 36), M(o.sash, 0.55), sg); s.rotation.x = Math.PI / 2; s.scale.set(1, 0.86, 1); }
  if (o.cardigan) { mesh(RB(0.16, 0.5, 0.05, 0.02), M('#f3eee6', 0.9), P.body, 0, 0.45, 0.24); }
  for (let i = 0; i < 4; i++) if (!o.apron && !o.cardigan) mesh(SP(0.026, 10, 8), M(C.gold, 0.3, 0.5), P.body, 0, 0.66 - i * 0.12, 0.262);
  if (o.ruff) { for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; mesh(SP(0.062, 10, 8), M('#fbf6ec', 0.9), P.body, Math.cos(a) * 0.19, 0.84 + (i % 2) * 0.012, Math.sin(a) * 0.17); } }
  else mesh(CY(0.2, 0.22, 0.06, 24), M('#f6efe0', 0.9), P.body, 0, 0.83, 0);
  P.head = grp(P.body, 0, 1.14, 0);
  const hd = mesh(SP(0.3, 32, 24), skin, P.head); hd.scale.set(1, 1.03, 0.95);
  if (o.longNose) { const n = mesh(CAP(0.045, 0.1), skin, P.head, 0, -0.02, 0.31); n.rotation.x = Math.PI / 2 - 0.25; mesh(SP(0.035), M('#e58f7c', 0.5), P.head, 0, -0.05, 0.38); } else mesh(SP(0.055), skin, P.head, 0, -0.03, 0.29);
  [-1, 1].forEach(sd => { const ch = mesh(SP(0.055, 12, 10), M('#f0a08f', 0.7), P.head, 0.17 * sd, -0.08, 0.22, false); ch.scale.set(1, 0.6, 0.4); });
  P.eyes = [-1, 1].map(sd => { const e = grp(P.head, 0.11 * sd, 0.05, 0.25); mesh(SP(0.072, 18, 14), M('#ffffff', 0.25), e, 0, 0, 0, false); const pu = mesh(SP(0.044, 16, 12), M('#140c07', 0.15), e, 0, 0, 0.042, false); mesh(SP(0.014, 8, 6), new T.MeshBasicMaterial({ color: '#ffffff' }), pu, 0.014, 0.018, 0.035, false); e.userData.pu = pu; return e; });
  P.brows = [-1, 1].map(sd => mesh(RB(0.11, 0.028, 0.03, 0.012), hairM, P.head, 0.11 * sd, 0.16, 0.265, false));
  const mm = M('#5b1d18', 0.5); P.mouth = { smile: mesh(new T.TorusGeometry(0.07, 0.017, 8, 18, Math.PI), mm, P.head, 0, -0.12, 0.275, false), frown: mesh(new T.TorusGeometry(0.06, 0.017, 8, 18, Math.PI), mm, P.head, 0, -0.16, 0.27, false), o: mesh(SP(0.045, 14, 10), mm, P.head, 0, -0.13, 0.27, false) };
  P.mouth.smile.rotation.z = Math.PI; P.mouth.o.scale.set(1, 1.2, 0.5);
  if (o.beard) { const b = mesh(new T.ConeGeometry(0.07, 0.16, 12), hairM, P.head, 0, -0.27, 0.2); b.rotation.x = Math.PI - 0.35; [-1, 1].forEach(sd => { const m = mesh(CAP(0.025, 0.11), hairM, P.head, 0.07 * sd, -0.085, 0.29, false); m.rotation.z = sd * 1.2; }); }
  if (o.hair) { const h = mesh(new T.SphereGeometry(0.315, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM, P.head, 0, 0.01, -0.01); h.rotation.x = -0.25; if (o.bun) mesh(SP(0.13), hairM, P.head, 0, 0.26, -0.2); }
  if (o.glasses) { [-1, 1].forEach(sd => { const r = mesh(new T.TorusGeometry(0.08, 0.012, 8, 24), M('#2a2a2a', 0.3, 0.4), P.head, 0.11 * sd, 0.05, 0.31, false); }); mesh(CY(0.01, 0.01, 0.06, 6), M('#2a2a2a', 0.3), P.head, 0, 0.06, 0.31, false).rotation.z = Math.PI / 2; }
  const hatM = M(o.hatCol || '#1e1814', 0.6);
  if (o.hat === 'capotain') { mesh(CY(0.2, 0.25, 0.42, 28), hatM, P.head, 0, 0.42, 0); mesh(CY(0.46, 0.46, 0.03, 32), hatM, P.head, 0, 0.22, 0); mesh(CY(0.252, 0.252, 0.07, 28), M('#5a3a26', 0.5), P.head, 0, 0.27, 0); }
  if (o.hat === 'wide') { mesh(CY(0.5, 0.5, 0.03, 32), hatM, P.head, 0, 0.22, 0); mesh(CY(0.22, 0.26, 0.2, 28), hatM, P.head, 0, 0.32, 0); }
  if (o.hat === 'cap') { const c = mesh(SP(0.33, 24, 14), hatM, P.head, -0.03, 0.2, -0.02); c.scale.set(1.05, 0.45, 1.05); }
  if (o.hat === 'fool') { [-1, 1].forEach(sd => { const cn = mesh(new T.ConeGeometry(0.12, 0.5, 14), M(sd < 0 ? '#e9b93a' : C.red, 0.6), P.head, 0.22 * sd, 0.35, 0); cn.rotation.z = -sd * 1.0; mesh(SP(0.06), M(C.gold, 0.3, 0.5), P.head, 0.45 * sd, 0.52, 0); }); }
  P.arms = [-1, 1].map(sd => { const pv = grp(P.body, 0.33 * sd, 0.66, 0); mesh(CAP(0.078, 0.28), coat, pv, 0, -0.19, 0); if (o.cuffs) mesh(CY(0.088, 0.088, 0.05, 16), M('#fbf6ec', 0.9), pv, 0, -0.37, 0); const hand = grp(pv, 0, -0.44, 0); mesh(SP(0.085, 18, 12), skin, hand); pv.userData.hand = hand; return pv; });
  P.hand = P.arms[1].userData.hand; P.handL = P.arms[0].userData.hand;
  g.traverse(m => { if (m.isMesh && m.castShadow !== false) m.castShadow = true; });
  return P;
}
const MOODS = { calm: [0, 0, 'smile', 0.7], happy: [0.03, 0.08, 'smile', 1.1], smug: [0.01, -0.12, 'smile', 0.8], worried: [0.03, 0.32, 'frown', 0.9], sad: [-0.01, 0.3, 'frown', 1], shock: [0.06, 0, 'o', 1.2], relief: [0.04, 0.12, 'smile', 1.15] };
// q: {walk, armL:[up,fwd], armR:[up,fwd], look, nod, tilt, shake, lean, turn, mood, talk, hop, eyeX, seed}
function pose(P, t, q = {}) {
  const sd = q.seed || 0, br = Math.sin(t * 2.3 + sd) * 0.012; let swing = 0;
  P.body.position.y = 0.52 + br; P.legs.forEach(l => l.rotation.x = 0);
  if (q.walk != null) { const ph = q.walk; P.legs[0].rotation.x = Math.sin(ph) * 0.55; P.legs[1].rotation.x = -Math.sin(ph) * 0.55; P.body.position.y += Math.abs(Math.cos(ph)) * 0.05; swing = Math.sin(ph) * 0.45; }
  const arm = (pv, s, a, sw) => { a = a || [0.12, 0]; pv.rotation.set(-(a[1] || 0) + sw * s, 0, s * (a[0] || 0.12) + (a[2] || 0)); };
  arm(P.arms[0], -1, q.armL, swing); arm(P.arms[1], 1, q.armR, swing);
  P.head.rotation.set((q.nod || 0) + Math.sin(t * 1.1 + sd) * 0.025, (q.look || 0) + noise(t * 0.4, sd) * 0.08 + (q.shake ? Math.sin(t * 19) * 0.35 * q.shake : 0), (q.tilt || 0) + Math.sin(t * 0.9 + sd * 2) * 0.03);
  P.body.rotation.set(q.lean || 0, 0, 0); P.g.rotation.y = q.turn || 0;
  const hop = q.hop || 0; P.g.position.y = (P.g.userData.y0 || 0) + hop * 0.35; P.g.scale.set(P.g.userData.s0 * (1 + hop * -0.04), P.g.userData.s0 * (1 + hop * 0.06), P.g.userData.s0 * (1 + hop * -0.04));
  const blink = S.hash(Math.floor((t + sd) * 2.1)) > 0.82 && ((t + sd) * 2.1) % 1 < 0.13; const mo = MOODS[q.mood || 'calm'];
  P.eyes.forEach(e => { e.scale.y = blink ? 0.12 : (q.mood === 'shock' ? 1.25 : 1); e.userData.pu.position.x = q.eyeX || 0; e.userData.pu.position.y = q.eyeY || 0; });
  P.brows.forEach((b, i) => { const s = i ? 1 : -1; b.position.y = 0.16 + mo[0]; b.rotation.z = -s * mo[1]; });
  const talk = q.talk ? Math.abs(Math.sin(t * 17)) : 0, mk = talk > 0.3 ? 'o' : mo[2];
  Object.entries(P.mouth).forEach(([n, m]) => { m.visible = n === mk; }); P.mouth.smile.scale.setScalar(mo[3]); if (mk === 'o') P.mouth.o.scale.set(1, 0.7 + talk * 0.8, 0.5);
}
function place(P, parent, x, y, z, s = 1) { parent.add(P.g); P.g.position.set(x, y, z); P.g.userData.y0 = y; P.g.userData.s0 = s; P.g.scale.setScalar(s); return P; }
// a small crowd figure (cheaper)
function mini(o, parent, x, z, s) { const g = grp(parent, x, 0, z); g.scale.setScalar(s); const body = mesh(CAP(0.28, 0.4), M(o.coat, 0.8), g, 0, 0.62, 0); body.scale.z = 0.85; const head = grp(g, 0, 1.3, 0); mesh(SP(0.28, 18, 14), M(o.skin || C.skin, 0.55), head);
  [-1, 1].forEach(sd => mesh(SP(0.05, 10, 8), M('#140c07', 0.2), head, 0.1 * sd, 0.04, 0.25, false)); const mo = mesh(new T.TorusGeometry(0.06, 0.016, 6, 12, Math.PI), M('#5b1d18', 0.5), head, 0, -0.1, 0.26, false);
  if (o.hat === 'cap') { const c = mesh(SP(0.3, 16, 10), M(o.hatCol || '#4a3322', 0.6), head, 0, 0.18, 0); c.scale.set(1, 0.45, 1); } else if (o.hat === 'wide') { mesh(CY(0.45, 0.45, 0.03, 20), M('#1e1814', 0.6), head, 0, 0.2, 0); mesh(CY(0.2, 0.24, 0.2, 18), M('#1e1814', 0.6), head, 0, 0.3, 0); } else mesh(new T.SphereGeometry(0.29, 18, 10, 0, Math.PI * 2, 0, 1.2), M(o.hairCol || '#5a3a22', 0.7), head, 0, 0.02, 0);
  const legs = [-1, 1].map(sd => { const pv = grp(g, 0.11 * sd, 0.35, 0); mesh(CAP(0.08, 0.2), M('#3a2c22', 0.8), pv, 0, -0.17, 0); return pv; });
  return { g, head, legs, mouth: mo, body }; }

// ---------- shared scenery pieces ----------
function plinth(g, w = 9, d = 7, col = C.woodD, h = 0.4) { const p = mesh(RB(w, h, d, 0.08), M(col, 0.8), g, 0, -h / 2, 0); return p; }
function wall(g, w, h, col, z = -3, x = 0, ry = 0, map) { const m = mesh(new T.BoxGeometry(w, h, 0.15), map ? new T.MeshStandardMaterial({ map, roughness: 0.95 }) : M(col, 0.95), g, x, h / 2, z); m.rotation.y = ry; return m; }
function gableHouse(g, x, z, w, h, col, s = 1, ry = 0) {
  const sh = new T.Shape(), st = w / 6; sh.moveTo(-w / 2, 0); sh.lineTo(-w / 2, h); for (let i = 0; i < 3; i++) { sh.lineTo(-w / 2 + st * (i + 1), h + st * 1.2 * i); sh.lineTo(-w / 2 + st * (i + 1), h + st * 1.2 * (i + 1)); }
  sh.lineTo(w / 2 - st * 3, h + st * 3.6); for (let i = 2; i >= 0; i--) { sh.lineTo(w / 2 - st * (i + 1), h + st * 1.2 * (i + 1)); sh.lineTo(w / 2 - st * (i + 1), h + st * 1.2 * i); } sh.lineTo(w / 2, h); sh.lineTo(w / 2, 0);
  const hm = mesh(new T.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), M(col, 0.85), g, x, 0, z); hm.scale.setScalar(s); hm.rotation.y = ry;
  const winM = M('#f6e7b8', 0.4, 0, { emissive: '#ffcf7a', emissiveIntensity: 0.25 });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const wn = mesh(RB(w * 0.2, h * 0.22, 0.08, 0.02), winM, hm, (c - 0.5) * w * 0.42, h * (0.3 + r * 0.38), 1.24, false); }
  mesh(RB(w * 0.22, h * 0.3, 0.08, 0.02), M('#4a2e1a', 0.7), hm, 0, h * 0.15, 1.24, false); return hm;
}
function scroll(parent) { const g = grp(parent); const m = new T.MeshStandardMaterial({ map: SCROLLTEX, roughness: 0.9, side: T.DoubleSide }); mesh(new T.PlaneGeometry(0.42, 0.3), m, g, 0, 0, 0, true); [-1, 1].forEach(sd => { const r = mesh(CY(0.025, 0.025, 0.32, 10), M('#e6d3a8', 0.8), g, 0.21 * sd, 0, 0); }); return g; }
let SCROLLTEX;

// ---------- the ten sets ----------
const sentenceStart = i => i === 0 ? 0 : CUT[i];
function buildSets() {
  // 0. the treasure (and the bubble at the end)
  sets.push((() => {
    const g = new T.Group(); plinth(g, 9, 7, '#3b2416');
    const wallTex = tex(512, 512, (c, w, h) => { c.fillStyle = '#2e3a2c'; c.fillRect(0, 0, w, h); const r = S.rng(2); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,240,200' : '0,0,0'},${r() * 0.05})`; c.fillRect(r() * w, r() * h, 3 + r() * 30, 3 + r() * 30); } });
    wall(g, 12, 9, null, -3, 0, 0, wallTex);
    [[-2.4, 3.3], [2.6, 3.8]].forEach(([x, y]) => { mesh(RB(1.7, 2.1, 0.12, 0.05), M(C.gold, 0.35, 0.6), g, x, y, -2.85); mesh(new T.BoxGeometry(1.4, 1.8, 0.05), M(x < 0 ? '#5a4630' : '#3d2f22', 0.9), g, x, y, -2.78); });
    const table = mesh(RB(6, 0.3, 3.6, 0.08), M('#5a3420', 0.55), g, 0, 0.15, 0);
    const cush = mesh(SP(0.75, 32, 20), new T.MeshPhysicalMaterial({ color: C.velvet, roughness: 0.8, sheen: 1, sheenColor: new T.Color('#ff9a9a'), sheenRoughness: 0.4 }), g, 0, 0.48, 0); cush.scale.set(1.15, 0.32, 0.85);
    [[-0.85, 0.45], [0.85, 0.45], [-0.85, -0.45], [0.85, -0.45]].forEach(([x, z]) => mesh(SP(0.07), M(C.gold, 0.3, 0.6), g, x, 0.42, z * 0.9));
    const bl = bulb(g, 1.35); bl.position.set(0, 0.86, 0); const tu = tulip(g); tu.g.position.set(0, 1.2, 0); tu.g.scale.setScalar(1.15);
    const spot = new T.SpotLight('#ffd9a0', 30, 12, 0.5, 0.6, 1.5); spot.position.set(0.5, 6, 2); spot.target.position.set(0, 0.6, 0); g.add(spot, spot.target);
    // price tag on a string
    const tagG = grp(g, 1.05, 4.5, 0.5), str = mesh(CY(0.006, 0.006, 3, 6), M('#d9c08a', 0.8), tagG, 0, 1.5, 0, false);
    const tagCanvas = document.createElement('canvas'); tagCanvas.width = 512; tagCanvas.height = 300; const tagTex = new T.CanvasTexture(tagCanvas); tagTex.colorSpace = T.SRGBColorSpace;
    const tagShape = new T.Shape(); tagShape.moveTo(-0.55, -0.3); tagShape.lineTo(0.35, -0.3); tagShape.lineTo(0.6, 0); tagShape.lineTo(0.35, 0.3); tagShape.lineTo(-0.55, 0.3); tagShape.lineTo(-0.55, -0.3);
    const tagGeo = new T.ShapeGeometry(tagShape); const uv = tagGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.55) / 1.15, (uv.getY(i) + 0.3) / 0.6);
    const tagM = mesh(tagGeo, new T.MeshStandardMaterial({ map: tagTex, roughness: 0.85, side: T.DoubleSide }), tagG, 0, -0.3, 0); tagM.rotation.z = Math.PI / 2; let lastN = -1;
    const drawTag = n => { if (n === lastN) return; lastN = n; const c = tagCanvas.getContext('2d'); c.fillStyle = '#f6ead0'; c.fillRect(0, 0, 512, 300); c.strokeStyle = '#7a5a2a'; c.lineWidth = 10; c.strokeRect(14, 14, 484, 272); c.save(); c.translate(256, 150); c.rotate(-Math.PI / 2); c.restore();
      c.save(); c.translate(256, 150); c.rotate(-Math.PI / 2); c.restore(); c.fillStyle = '#b3241c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 110px Fraunces'; c.save(); c.translate(225, 150); c.fillText('ƒ' + n.toLocaleString('en-US'), 0, 6); c.restore(); tagTex.needsUpdate = true; };
    tagM.rotation.z = 0; drawTag(0);
    const coins = []; const cm = coinMat(); for (let i = 0; i < 26; i++) { const c = mesh(coinGeo(), cm, g); coins.push(c); }
    // the bubble shot
    const bub = mesh(SP(0.95, 48, 32), new T.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.22, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 800], clearcoat: 1, side: T.DoubleSide, depthWrite: false }), g, 0, 2.3, 0, false);
    const glint = mesh(new T.TorusGeometry(0.55, 0.035, 8, 30, 1.2), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), bub, -0.25, 0.3, 0.75, false); glint.rotation.z = 1.9;
    const drops = []; for (let i = 0; i < 26; i++) drops.push(mesh(SP(0.05, 10, 8), new T.MeshPhysicalMaterial({ color: '#dff4ff', roughness: 0.05, transparent: true, opacity: 0.8, iridescence: 1 }), g, 0, 0, 0, false));
    const bubTulip = tulip(g); bubTulip.g.scale.setScalar(0.95);
    const pieter = place(person({ coat: '#26201c', breeches: '#3a2a20', ruff: true, sash: C.red, hat: 'capotain', beard: true, longNose: true, cuffs: true, hairCol: '#4a2a18' }), g, 1.45, 0.3, 0.6, 1.0);
    return { g, sun: { pos: [-3, 8, 5], col: '#ffe0b0', int: 1.6 }, hemi: 0.35,
      update(t) {
        const late = t > CUT[10] - 0.5, ta = at('tulip'), tg = at('10,000');
        tu.g.visible = !late; bubTulip.g.visible = false; pieter.g.visible = late; bub.visible = false; drops.forEach(d => d.visible = false);
        if (!late) { tu.set(S.ease.out(P01(t, ta - 0.3, 1.0)), P01(t, ta + 0.35, 0.7), 0); tu.head.rotation.y = t * 0.4; tu.g.rotation.z = Math.sin(t * 1.3) * 0.03;
          const k2 = S.ease.bounce(P01(t, tg - 0.35, 0.65)); tagG.position.y = 6.6 - 3.7 * k2; tagG.rotation.z = damp(t, tg + 0.3, 5, 1.4) * 0.25 + Math.sin(t * 1.4) * 0.03; drawTag(Math.round(10000 * S.ease.out(P01(t, tg, 0.7)) / 10) * 10);
          coins.forEach((c, i) => { const r = S.rng(i + 3), t0 = tg + 0.1 + r() * 0.6, x = (r() - 0.5) * 4.6, z = (r() - 0.5) * 2.6 + 0.2, fall = S.p(t, t0, t0 + 0.45); if (Math.abs(x) < 1.2 && Math.abs(z) < 0.8) c.position.x = x + Math.sign(x || 1) * 1.2; c.visible = t > t0;
            c.position.set(Math.abs(x) < 1.2 ? x + Math.sign(x || 1) * 1.3 : x, 0.32 + 0.014 + (1 - fall * fall) * 4 + Math.abs(damp(t, t0 + 0.45, 14, 6)) * 0.15, z); c.rotation.set((1 - fall) * 6 + r() * 0.2, r() * 3, (1 - fall) * 4 + (r() - 0.5) * 0.15); });
        } else {
          tagG.position.y = 9; coins.forEach(c => c.visible = false); const tp = at('story', 2), lt = t - CUT[10];
          bubTulip.g.visible = true; const by = 2.3 + Math.sin(t * 1.6) * 0.08; bub.position.set(Math.sin(t * 1.1) * 0.08, by, 0); bubTulip.set(1, 1, 0);
          if (t < tp) { bub.visible = true; bub.scale.setScalar(1 + Math.sin(t * 7) * 0.012 + S.ease.out(P01(t, tp - 0.25, 0.25)) * 0.06); bub.rotation.y = t * 0.6; bubTulip.g.position.set(bub.position.x, by - 0.75, 0); bubTulip.g.rotation.z = Math.sin(t * 1.3) * 0.08; }
          else { const u = t - tp; drops.forEach((d, i) => { const r = S.rng(i + 50), a = r() * Math.PI * 2, b = (r() - 0.5) * Math.PI; d.visible = u < 0.8; const sp = 1.6 + r() * 1.4; d.position.set(Math.cos(a) * Math.cos(b) * (0.95 + u * sp), by + Math.sin(b) * (0.95 + u * sp) - u * u * 3, Math.sin(a) * Math.cos(b) * (0.95 + u * sp)); d.scale.setScalar(Math.max(0.01, 1 - u * 1.2)); });
            const f = S.ease.in(S.p(t, tp, tp + 0.6)); bubTulip.g.position.set(0.25 * f, by - 0.75 - f * (by - 0.75 - 0.5), 0.5 * f); bubTulip.g.rotation.z = -f * 1.45; bubTulip.set(1, 1, S.ease.out(S.p(t, tp + 0.5, tp + 1.2)) * 0.6); }
          pose(pieter, t, { mood: t > tp ? 'shock' : 'smug', armL: t > tp - 0.6 ? [1.25, 0.7] : [0.15, 0], look: -0.5, eyeX: -0.02, turn: -0.35, hop: t > tp ? Math.max(0, Math.sin(S.p(t, tp, tp + 0.4) * Math.PI)) * 0.4 : 0 });
        }
      },
      cam(t) { if (t > CUT[10] - 0.5) { const lt = t - CUT[10]; return { p: [0.5 + lt * 0.05, 2.0, 6.6 - lt * 0.15], t: [0.5, 1.45, 0], f: 6.5 }; }
        const lt = t; return { p: [0.35, 1.75 + lt * 0.03, 4.4 + lt * 0.3], t: [0.35, 1.45, 0], f: 4.4 + lt * 0.3 }; },
    };
  })());

  // 1. the craftsman's workshop
  sets.push((() => {
    const g = new T.Group(); plinth(g, 9, 7, '#6b4a2e');
    const plTex = tex(512, 512, (c, w, h) => { c.fillStyle = C.plaster; c.fillRect(0, 0, w, h); const r = S.rng(9); for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(120,90,50,${r() * 0.06})`; c.beginPath(); c.arc(r() * w, r() * h, 2 + r() * 14, 0, 7); c.fill(); } });
    wall(g, 12, 8, null, -3, 0, 0, plTex); for (let i = -2; i <= 2; i++) mesh(new T.BoxGeometry(0.25, 8, 0.25), M('#4a2e1a', 0.8), g, i * 2.6, 4, -2.85);
    mesh(new T.BoxGeometry(12, 0.3, 0.3), M('#4a2e1a', 0.8), g, 0, 4.4, -2.8);
    const win = mesh(new T.BoxGeometry(1.6, 1.6, 0.05), M('#cfe6f2', 0.2, 0, { emissive: '#bfe3ff', emissiveIntensity: 0.9 }), g, -2.2, 3.0, -2.86, false); [0, 1].forEach(i => mesh(new T.BoxGeometry(i ? 1.6 : 0.07, i ? 0.07 : 1.6, 0.08), M('#3a2414', 0.7), g, -2.2, 3.0, -2.82));
    for (let i = 0; i < 5; i++) { mesh(RB(0.12, 0.6 + (i % 3) * 0.2, 0.12, 0.03), M(['#8a6a42', '#5d4630', '#9a7a52'][i % 3], 0.8), g, 1.2 + i * 0.35, 2.6, -2.75); }
    mesh(RB(2.2, 0.08, 0.5, 0.02), M('#6b4a2e', 0.8), g, 2.0, 2.25, -2.7);
    const bench = mesh(RB(4.4, 0.18, 1.6, 0.05), M('#9a6b3e', 0.75), g, -0.4, 1.0, 0.2); [[-2.4, -0.5], [1.6, -0.5], [-2.4, 0.9], [1.6, 0.9]].forEach(([x, z]) => mesh(RB(0.18, 0.95, 0.18, 0.04), M('#6b4a2e', 0.8), g, x, 0.47, z));
    const plank = mesh(RB(1.4, 0.1, 0.35, 0.02), M('#c9995e', 0.8), g, 1.15, 1.14, 0.45);
    // balance scale
    const sc = grp(g, -0.55, 1.09, 0.1); mesh(CY(0.05, 0.08, 1.6, 16), M('#8a6a3a', 0.4, 0.5), sc, 0, 0.8, 0); mesh(CY(0.35, 0.4, 0.1, 24), M('#6b4a2a', 0.5, 0.4), sc, 0, 0.05, 0);
    const beam = grp(sc, 0, 1.6, 0); mesh(RB(2.2, 0.07, 0.07, 0.03), M('#b38a4a', 0.35, 0.6), beam); mesh(SP(0.08), M(C.gold, 0.3, 0.6), beam);
    const pans = [-1, 1].map(sd => { const pg = grp(sc, 0, 0, 0); mesh(CY(0.006, 0.006, 0.9, 6), M('#5a4630', 0.6), pg, 0, 0.45, 0, false); const pan = mesh(CY(0.38, 0.3, 0.07, 28), M('#c9a050', 0.3, 0.6), pg, 0, 0, 0); return pg; });
    const bl = bulb(g, 0.9); const coins = []; for (let i = 0; i < 10; i++) coins.push(mesh(coinGeo(), coinMat(), g));
    const lab1 = plane(1.1, 0.4, labelMat(440, 160, (c, w, h) => { c.fillStyle = '#b3241c'; c.font = '900 92px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ƒ10,000', w / 2, h / 2); }), g);
    const lab2 = plane(1.3, 0.4, labelMat(520, 160, (c, w, h) => { c.fillStyle = C.ink; c.font = '900 84px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ƒ300 a year', w / 2, h / 2); }), g);
    const carp = place(person({ coat: '#6d5a3c', apron: true, hat: 'cap', hatCol: '#5a3a22', hairCol: '#6b4423', hose: '#5a4a3a' }), g, 1.4, 0.0, 0.8, 1.0);
    const hammer = grp(carp.hand, 0, -0.05, 0.05); mesh(CY(0.025, 0.025, 0.5, 8), M('#8a5a32', 0.7), hammer, 0, 0, 0.22).rotation.x = Math.PI / 2; mesh(RB(0.1, 0.18, 0.1, 0.02), M('#6a6a6a', 0.35, 0.8), hammer, 0, 0, 0.45);
    const say = sprite(1.6, 0.85, bubbleDraw('33 years?!'), g); say.position.set(1.6, 3.55, 0.6);
    return { g, sun: { pos: [-4, 7, 5], col: '#fff1d6', int: 2.2 }, hemi: 0.55,
      update(t) {
        const t3 = at('300'), stop = t3 - 0.2, hitP = S.clamp((t - CUT[1]) / 0.42);
        const hp = (t - CUT[1]) / 0.42, ph = hp - Math.floor(hp), hammering = t < stop;
        pose(carp, t, { turn: -0.75, mood: t > t3 + 0.35 ? 'shock' : 'calm', look: t > t3 ? -0.3 : 0.1, armR: hammering ? [0.35, 0.9 + (ph < 0.5 ? S.ease.out(ph * 2) : 1 - S.ease.in((ph - 0.5) * 2)) * 1.1] : (t > t3 + 0.6 ? [2.6, 0.4, 0] : [0.3, 0.6]), armL: [0.2, 0.45], nod: hammering ? 0.25 : 0, hop: t > t3 + 0.35 ? Math.max(0, Math.sin(S.p(t, t3 + 0.35, t3 + 0.7) * Math.PI)) * 0.35 : 0 });
        const tilt = -0.26 + damp(t, t3 + 0.1, 16, 5) * 0.04 + Math.sin(t * 2) * 0.006; beam.rotation.z = tilt;
        pans.forEach((pg, i) => { const sd = i ? 1 : -1; pg.position.set(sd * 1.08 * Math.cos(tilt), 1.6 + sd * 1.08 * Math.sin(tilt) - 0.9, 0); });
        const lp = pans[0].position, rp = pans[1].position; bl.position.set(sc.position.x + lp.x, sc.position.y + lp.y + 0.25, sc.position.z);
        coins.forEach((c, i) => { const t0 = t3 - 0.1 + i * 0.05, f = S.p(t, t0, t0 + 0.25); c.visible = t > t0; c.position.set(sc.position.x + rp.x + (i % 2 ? 0.02 : -0.02), sc.position.y + rp.y + 0.05 + i * 0.03 + (1 - f) * 1.5, sc.position.z); c.rotation.y = i; });
        lab1.position.set(sc.position.x + lp.x, sc.position.y + lp.y - 0.35, 0.55); lab2.position.set(sc.position.x + rp.x - 0.1, sc.position.y + rp.y - 0.55, 0.75);
        lab2.material.opacity = P01(t, t3 + 0.1, 0.3); lab2.scale.setScalar(Math.max(0.01, S.ease.back(P01(t, t3 + 0.1, 0.35))));
        say.material.opacity = P01(t, t3 + 0.5, 0.2); say.scale.set(1.6 * S.ease.back(P01(t, t3 + 0.5, 0.3)) + 0.001, 0.85 * S.ease.back(P01(t, t3 + 0.5, 0.3)) + 0.001, 1);
      },
      cam(t) { const lt = t - CUT[1]; return { p: [0.2 + lt * 0.05, 2.3, 7.4 - lt * 0.25], t: [0.2, 1.5, 0], f: 7.4 - lt * 0.25 }; },
    };
  })());

  // 2. the tavern, cut away to show bulbs under the floor
  sets.push((() => {
    const g = new T.Group(); const soil = mesh(RB(9, 2.4, 7, 0.06), M(C.soil, 0.95), g, 0, -1.3, 0);
    for (let i = 0; i < 3; i++) mesh(new T.BoxGeometry(9.02, 0.12, 7.02), M(['#4a2e1a', '#6b4a2e', '#3e2614'][i], 0.95), g, 0, -0.55 - i * 0.6, 0, false);
    mesh(RB(9, 0.14, 7, 0.03), M('#8a5a32', 0.7), g, 0, -0.07, 0);
    const plankTex = tex(512, 512, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#4a2e1a', '#553520', '#42291a'][i % 3]; c.fillRect(i * 64, 0, 64, h); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(i * 64, 0, 3, h); } });
    wall(g, 9, 6, null, -3, 0, 0, plankTex); const sw = wall(g, 7, 6, null, 0, -4.4, Math.PI / 2, plankTex);
    for (let i = -1; i <= 1; i++) mesh(new T.BoxGeometry(9, 0.25, 0.3), M('#3a2414', 0.8), g, 0, 4.2, i * 1.8);
    const barrel = mesh(CY(0.55, 0.55, 1.2, 24), M('#7a4a26', 0.8), g, -3.2, 0.6, -2); [-0.4, 0.4].forEach(y => mesh(new T.TorusGeometry(0.58, 0.03, 6, 24), M('#3a3a3a', 0.4, 0.7), g, -3.2, 0.6 + y, -2).rotation.x = Math.PI / 2);
    const lantern = grp(g, 0.4, 3.2, -0.4); mesh(CY(0.012, 0.012, 1, 6), M('#2a1a10', 0.7), lantern, 0, 0.5, 0); const lb = mesh(RB(0.32, 0.42, 0.32, 0.04), M('#ffcf6e', 0.4, 0, { emissive: '#ffb347', emissiveIntensity: 2.4 }), lantern, 0, 0, 0, false);
    const pl = new T.PointLight('#ffb35c', 9, 7, 1.6); pl.position.set(0.4, 3.0, -0.2); g.add(pl);
    const table = mesh(RB(3.6, 0.16, 1.4, 0.05), M('#7a4a26', 0.7), g, 0.2, 1.0, 0.3); mesh(RB(3.2, 0.9, 1.0, 0.04), M('#5a3420', 0.8), g, 0.2, 0.47, 0.3);
    [[-0.9, 0.5], [1.1, 0.5], [0.3, 0.6]].forEach(([x, z]) => { const mg = grp(g, x, 1.23, z); mesh(CY(0.11, 0.1, 0.28, 16), M('#9a8a6a', 0.6), mg); mesh(new T.TorusGeometry(0.07, 0.02, 6, 12), M('#9a8a6a', 0.6), mg, 0.13, 0, 0).rotation.y = 0; });
    const candle = grp(g, -0.3, 1.08, 0.45); mesh(CY(0.05, 0.05, 0.28, 12), M('#f2e6c8', 0.7), candle, 0, 0.14, 0); const fl = mesh(SP(0.045, 10, 8), new T.MeshBasicMaterial({ color: '#ffd27a' }), candle, 0, 0.33, 0, false); fl.scale.y = 1.8;
    const tr1 = place(person({ coat: '#58603e', hat: 'wide', hairCol: '#3a2414', beard: false, hose: '#4a3a2a' }), g, -1.3, 0, -0.55, 1.0);
    const pieter = place(person({ coat: '#26201c', breeches: '#3a2a20', ruff: true, sash: C.red, hat: 'capotain', beard: true, longNose: true, cuffs: true, hairCol: '#4a2a18' }), g, 0.2, 0, -0.65, 1.05);
    const tr3 = place(person({ coat: '#6d3f52', hat: 'cap', hatCol: '#8a1f27', hair: true, hairCol: '#7a5230', hose: '#4a3a2a' }), g, 1.7, 0, -0.55, 1.0);
    const bids = [['ƒ800!', () => at('bidding')], ['ƒ900!', () => at('bidding') + 0.3], ['ƒ1,000!', () => at('bulbs') - 0.05]];
    const bs = bids.map(([s]) => sprite(1.25, 0.66, bubbleDraw(s), g)); const who = [tr1, tr3, pieter];
    const bulbs = [-2.4, -0.8, 0.8, 2.4].map((x, i) => { const b = bulb(g, 1.1); b.position.set(x, -1.0 - (i % 2) * 0.25, 3.5); b.scale.set(1, 1, 0.6); mesh(new T.CircleGeometry(0.32, 24), M('#2e1c10', 1), g, x, -1.0 - (i % 2) * 0.25, 3.505, false); return b; });
    const sign = plane(2.6, 0.5, labelMat(780, 150, (c, w, h) => { c.fillStyle = '#f2e3c2'; c.font = 'italic 900 96px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('still in the ground', w / 2, h / 2); }), g, 0, -2.05, 3.52);
    return { g, sun: { pos: [-3, 7, 6], col: '#ffd6a0', int: 0.9 }, hemi: 0.3,
      update(t) {
        const T0 = bids.map(b => b[1]());
        pose(tr1, t, { mood: t > T0[0] ? 'happy' : 'calm', armR: t > T0[0] ? [2.7, 0.2] : [0.2, 0.3], look: 0.3, turn: 0.2, seed: 1, talk: t > T0[0] && t < T0[0] + 0.5 });
        pose(tr3, t, { mood: t > T0[1] ? 'happy' : 'calm', armL: t > T0[1] ? [2.7, 0.2] : [0.2, 0.3], look: -0.3, turn: -0.2, seed: 2, talk: t > T0[1] && t < T0[1] + 0.5 });
        pose(pieter, t, { mood: 'smug', armR: t > T0[2] ? [2.8, 0.25] : [0.3, 0.4], seed: 3, talk: t > T0[2] && t < T0[2] + 0.5, hop: t > T0[2] ? Math.max(0, Math.sin(S.p(t, T0[2], T0[2] + 0.35) * Math.PI)) * 0.25 : 0 });
        bs.forEach((b, i) => { const k2 = S.ease.back(P01(t, T0[i], 0.3)); b.scale.set(1.25 * k2 + 0.001, 0.66 * k2 + 0.001, 1); b.material.opacity = S.clamp(k2 * 2); const p = who[i].g.position; b.position.set(p.x + (i === 2 ? 0.2 : i ? 0.3 : -0.3), 3.15 + i * 0.2, p.z + 0.4); });
        bulbs.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.5 + i) * 0.05; }); fl.scale.set(1 + Math.sin(t * 13) * 0.1, 1.8 + Math.sin(t * 9) * 0.2, 1);
        sign.material.opacity = P01(t, at('buried') + 0.2, 0.3);
      },
      cam(t) { const d = S.ease.inOut(P01(t, at('buried') - 0.35, 0.8)); return { p: [0.25, S.lerp(2.4, -0.6, d), S.lerp(8.2, 9.0, d)], t: [0.2, S.lerp(1.55, -1.1, d), S.lerp(0, 3.0, d)], f: S.lerp(8.2, 5.6, d) }; },
    };
  })());

  // 3. the wind trade: canal, windmill, handshake over an empty pot, flying paper
  sets.push((() => {
    const g = new T.Group(); plinth(g, 10, 8, '#6b8a46'); mesh(RB(10, 0.1, 8, 0.03), M(C.grass, 0.95), g, 0, 0.02, 0);
    const sky = tex(256, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb0d0'); gr.addColorStop(0.7, '#e8d7b0'); gr.addColorStop(1, '#f0c890'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    mesh(new T.PlaneGeometry(22, 14), new T.MeshBasicMaterial({ map: sky }), g, 0, 5, -4.2, false);
    const canal = mesh(new T.BoxGeometry(10, 0.05, 1.4), M('#4f8aa8', 0.12, 0.1, { emissive: '#1e4a60', emissiveIntensity: 0.2 }), g, 0, 0.0, 0.6, false);
    const bridge = grp(g, 0, 0.05, 0.6); mesh(RB(2.2, 0.16, 1.6, 0.04), M('#9a6b3e', 0.8), bridge, 0, 0.16, 0); [-1, 1].forEach(sd => { mesh(RB(2.2, 0.08, 0.08, 0.02), M('#6b4a2e', 0.8), bridge, 0, 0.7, 0.75 * sd); for (let i = -2; i <= 2; i++) mesh(CY(0.03, 0.03, 0.5, 8), M('#6b4a2e', 0.8), bridge, i * 0.5, 0.45, 0.75 * sd); });
    gableHouse(g, -3.4, -3.4, 1.6, 2.0, C.brick, 1); gableHouse(g, -1.6, -3.6, 1.4, 2.4, '#8a4a34', 1); gableHouse(g, 3.6, -3.5, 1.5, 2.1, '#b0694a', 1);
    const mill = grp(g, 1.6, 0, -2.4); mesh(CY(0.45, 0.8, 3.0, 8), M('#7a5a3e', 0.85), mill, 0, 1.5, 0); mesh(new T.ConeGeometry(0.62, 0.8, 8), M('#4a3a2e', 0.8), mill, 0, 3.4, 0);
    const hub = grp(mill, 0, 3.0, 0.6); mesh(CY(0.1, 0.1, 0.25, 12), M('#3a2a1e', 0.7), hub).rotation.x = Math.PI / 2;
    const sailTex = tex(128, 512, (c, w, h) => { c.fillStyle = '#efe2c6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6b4a2e'; c.lineWidth = 6; for (let y = 0; y < h; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.strokeRect(3, 3, w - 6, h - 6); });
    for (let i = 0; i < 4; i++) { const arm = grp(hub); arm.rotation.z = i * Math.PI / 2; mesh(new T.BoxGeometry(0.05, 2.2, 0.05), M('#4a3020', 0.8), arm, 0, 1.1, 0.08); mesh(new T.PlaneGeometry(0.42, 1.7), new T.MeshStandardMaterial({ map: sailTex, side: T.DoubleSide, roughness: 0.9 }), arm, 0.25, 1.25, 0.1); }
    const clouds = [[-3, 6.5, -4], [2.5, 7.2, -4], [5, 6, -4]].map(([x, y, z]) => { const c = grp(g, x, y, z); [[0, 0, 0.6], [0.6, 0.1, 0.45], [-0.6, -0.05, 0.5], [0.2, 0.35, 0.45]].forEach(([a, b, r]) => mesh(SP(r, 16, 12), M('#ffffff', 0.9, 0, { emissive: '#ffffff', emissiveIntensity: 0.2 }), c, a, b, 0, false)); return c; });
    const pieter = place(person({ coat: '#26201c', breeches: '#3a2a20', ruff: true, sash: C.red, hat: 'capotain', beard: true, longNose: true, cuffs: true, hairCol: '#4a2a18' }), g, -0.55, 0.37, 0.6, 0.9);
    const tr = place(person({ coat: '#58603e', hat: 'wide', hairCol: '#3a2414', hose: '#4a3a2a' }), g, 0.55, 0.37, 0.6, 0.9);
    const pot = grp(g, 0, 0.98, 1.3); mesh(CY(0.16, 0.11, 0.24, 18), M('#b5643c', 0.8), pot); mesh(new T.TorusGeometry(0.16, 0.025, 8, 20), M('#a5542c', 0.8), pot, 0, 0.12, 0).rotation.x = Math.PI / 2; mesh(CY(0.14, 0.14, 0.02, 16), M(C.soil, 0.95), pot, 0, 0.1, 0);
    const q = sprite(0.6, 0.6, (c, w, h) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 12, 0, 7); c.fill(); c.lineWidth = 14; c.strokeStyle = C.ink; c.stroke(); c.fillStyle = '#b3241c'; c.font = '900 300px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, h / 2 + 18); }, g); q.position.set(0, 2.45, 1.3);
    const papers = []; for (let i = 0; i < 16; i++) papers.push(scroll(g));
    return { g, sun: { pos: [-4, 8, 6], col: '#fff2d8', int: 2.6 }, hemi: 0.7,
      update(t) {
        const tw = at('wind'), spd = 0.6 + 3.5 * S.ease.inOut(P01(t, tw - 0.2, 0.8)); hub.rotation.z = -(t * 0.6 + Math.max(0, t - tw) * 3.2);
        clouds.forEach((c, i) => c.position.x = [-3, 2.5, 5][i] + ((t * 0.25) % 3) - 1);
        const th = at('changed'), tn = at('no', 1, CUT[3]), shake = t > th ? Math.sin((t - th) * 16) * 0.18 * Math.exp(-(t - th) * 1.5) : 0, reach = S.ease.out(P01(t, th - 0.5, 0.45));
        pose(pieter, t, { turn: 0.9, armR: [0.15 + 0.1 * reach, 1.3 * reach + shake], mood: t > tn ? 'smug' : 'calm', look: t > tn && t < th ? 0.5 : 0, seed: 1 });
        pose(tr, t, { turn: -0.9, armR: [0.15 + 0.1 * reach, 1.3 * reach + shake], mood: 'happy', seed: 2 });
        const kp = S.ease.back(P01(t, tn, 0.35)); pot.scale.setScalar(Math.max(0.001, kp)); q.scale.setScalar(0.5 * S.ease.back(P01(t, tn + 0.3, 0.3)) + 0.001); q.position.y = 2.45 + Math.sin(t * 3) * 0.04;
        const tp = at('paper'); papers.forEach((p, i) => { const r = S.rng(i + 20), t0 = tp - 0.5 + r() * 0.6, u = t - t0; p.visible = u > 0 && u < 3; const y = 0.8 + r() * 2.4 + Math.sin(u * 3 + i) * 0.3, z = -1.5 + r() * 5.5; p.position.set(-5.5 + u * (3.4 + r() * 2), y + Math.sin(u * 5 + i) * 0.15, z); p.rotation.set(Math.sin(u * 4 + i) * 1.2, u * 3 + i, Math.cos(u * 3.3 + i) * 0.8); });
      },
      cam(t) { const tn = at('no', 1, CUT[3]), d = S.ease.inOut(P01(t, tn - 0.3, 0.8)), d2 = S.ease.inOut(P01(t, at('paper') - 0.4, 0.8)); return { p: [S.lerp(0.6, 0.2, d), S.lerp(2.8, 1.9, d) + d2 * 0.4, S.lerp(10.5, 6.0, d) + d2 * 1.4], t: [S.lerp(0.4, 0, d), S.lerp(2.3, 1.55, d) + d2 * 0.2, 0.6 * d], f: S.lerp(10, 5.4, d) + d2 * 1.4 }; },
    };
  })());

  // 4. the auction hall in Haarlem: nobody came
  sets.push((() => {
    const g = new T.Group(); plinth(g, 9, 8, '#4a3a2e');
    const tiles = tex(512, 512, (c, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#2a2420' : '#efe6d2'; c.fillRect(x * 64, y * 64, 64, 64); } }, [3, 3]);
    mesh(new T.BoxGeometry(9, 0.05, 8), new T.MeshStandardMaterial({ map: tiles, roughness: 0.35 }), g, 0, 0.02, 0);
    const pl = tex(256, 256, (c, w, h) => { c.fillStyle = '#e4d8bd'; c.fillRect(0, 0, w, h); }); wall(g, 10, 8, null, -3.2, 0, 0, pl);
    for (let i = -1; i <= 1; i++) { mesh(new T.BoxGeometry(1.3, 3.0, 0.06), M('#dcefff', 0.2, 0, { emissive: '#cfe9ff', emissiveIntensity: 1.2 }), g, i * 2.8, 3.6, -3.1, false); mesh(new T.BoxGeometry(1.45, 3.15, 0.04), M('#3a2a1e', 0.7), g, i * 2.8, 3.6, -3.13, false); for (let r = 1; r < 4; r++) mesh(new T.BoxGeometry(1.3, 0.04, 0.08), M('#3a2a1e', 0.7), g, i * 2.8, 2.1 + r * 0.75, -3.07, false); }
    const rays = []; for (let i = -1; i <= 1; i++) { const r = mesh(new T.PlaneGeometry(1.4, 7), new T.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0.08, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }), g, i * 2.8 + 0.6, 2.2, -1.6, false); r.rotation.set(-0.7, 0, 0.18); rays.push(r); }
    const banner = plane(3.4, 0.7, labelMat(1020, 210, (c, w, h) => { c.fillStyle = '#8a1f27'; c.fillRect(0, 0, w, h); c.strokeStyle = C.gold; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28); c.fillStyle = '#f6e3b0'; c.font = '900 92px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AUCTION · HAARLEM', w / 2, h / 2 + 4); }), g, 0, 5.6, -3.0);
    const lect = grp(g, 0, 0, -1.6); mesh(RB(1.2, 1.25, 0.8, 0.05), M('#6b3f24', 0.7), lect, 0, 0.62, 0); mesh(RB(1.4, 0.1, 0.9, 0.03), M('#7a4a2a', 0.6), lect, 0, 1.28, 0.05).rotation.x = 0.25;
    const pieter = place(person({ coat: '#26201c', breeches: '#3a2a20', ruff: true, sash: C.red, hat: 'capotain', beard: true, longNose: true, cuffs: true, hairCol: '#4a2a18' }), g, 0, 0, -2.2, 1.05);
    const gavel = grp(pieter.hand, 0, -0.04, 0.05); mesh(CY(0.022, 0.022, 0.42, 8), M('#5a3a22', 0.6), gavel, 0, 0, 0.18).rotation.x = Math.PI / 2; mesh(CY(0.07, 0.07, 0.2, 14), M('#4a2a16', 0.5), gavel, 0, 0, 0.38).rotation.z = Math.PI / 2;
    const drop = mesh(SP(0.05, 10, 8), M('#9fd6ff', 0.1, 0, { transparent: true, opacity: 0.85 }), pieter.head, 0.26, 0.1, 0.18, false); drop.scale.y = 1.4;
    for (let r = 0; r < 3; r++) { const z = 0.2 + r * 1.2; mesh(RB(4.2, 0.12, 0.45, 0.03), M('#8a5a32', 0.7), g, 0, 0.6, z); mesh(RB(4.2, 0.6, 0.08, 0.02), M('#7a4a26', 0.7), g, 0, 0.95, z + 0.24); [-1.8, 1.8].forEach(x => mesh(RB(0.1, 0.6, 0.4, 0.02), M('#5a3420', 0.8), g, x, 0.3, z)); }
    const bird = grp(g); const bb = mesh(SP(0.12, 14, 10), M('#7a5a3a', 0.7), bird); bb.scale.set(1.3, 1, 1); mesh(SP(0.08, 12, 10), M('#7a5a3a', 0.7), bird, 0.14, 0.08, 0); mesh(new T.ConeGeometry(0.025, 0.07, 8), M('#e0a030', 0.6), bird, 0.24, 0.07, 0).rotation.z = -Math.PI / 2; mesh(SP(0.015), M('#000', 0.2), bird, 0.18, 0.11, 0.05, false);
    const wing = mesh(SP(0.1, 10, 8), M('#5a3f28', 0.7), bird, -0.02, 0.05, 0.08); wing.scale.set(1.2, 0.3, 0.6);
    return { g, sun: { pos: [-2, 8, 3], col: '#f2f6ff', int: 2.4 }, hemi: 0.8,
      update(t) {
        const ta = at('auction'), tn = at('no buyers'), knock = (t > ta && t < ta + 0.25) || (t > ta + 0.45 && t < ta + 0.7);
        pose(pieter, t, { mood: t > tn ? 'worried' : 'smug', armR: knock ? [0.5, 1.6 - Math.sin(((t - ta) % 0.45) / 0.25 * Math.PI) * 0.5] : [0.5, t > tn ? 0.9 : 1.2], armL: [0.3, 0.6], look: t > tn ? noise(t * 1.5) * 0.5 : 0, eyeX: t > tn ? noise(t * 1.5) * 0.03 : 0, seed: 4, talk: t > ta - 0.6 && t < tn - 0.1 });
        drop.visible = t > tn + 0.3; drop.position.y = 0.1 - S.p(t, tn + 0.3, tn + 1.4) * 0.25;
        const u = S.p(t, tn + 0.1, tn + 1.8); bird.visible = t > tn; const hops = Math.abs(Math.sin(u * Math.PI * 5)); bird.position.set(2.4 - u * 4.6, 0.72 + hops * 0.25, 0.2); bird.rotation.y = Math.PI; wing.rotation.x = hops > 0.3 ? Math.sin(t * 40) * 0.6 : 0;
        rays.forEach((r, i) => r.material.opacity = 0.07 + Math.sin(t * 0.8 + i) * 0.015);
      },
      cam(t) { const tn = at('no buyers'), d = S.ease.inOut(P01(t, tn - 0.25, 0.9)), lt = t - CUT[4]; return { p: [S.lerp(-0.4, 0.4, d), S.lerp(2.2, 2.5, d), S.lerp(2.6 - lt * 0.05, 5.8, d)], t: [0, S.lerp(1.75, 1.15, d), S.lerp(-2.0, -1.0, d)], f: S.lerp(4.6, 8.6, d) }; },
    };
  })());

  // 5. the crash: a bar chart on a ledger falls apart
  sets.push((() => {
    const g = new T.Group(); plinth(g, 10, 8, '#3e2a1c');
    const page = tex(512, 512, (c, w, h) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,110,150,0.35)'; c.lineWidth = 3; for (let y = 30; y < h; y += 36) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.strokeStyle = 'rgba(200,50,40,0.5)'; c.beginPath(); c.moveTo(70, 0); c.lineTo(70, h); c.stroke(); });
    [-1, 1].forEach(sd => { const p = mesh(RB(3.8, 0.2, 5.2, 0.05), new T.MeshStandardMaterial({ map: page, roughness: 0.9 }), g, sd * 1.95, 0.1, 0); p.rotation.z = -sd * 0.04; });
    mesh(CY(0.12, 0.12, 5.2, 12), M('#e8dab8', 0.9), g, 0, 0.16, 0).rotation.x = Math.PI / 2;
    const backdrop = mesh(new T.PlaneGeometry(16, 10), M('#2a1c14', 1), g, 0, 4, -3.5, false);
    const H = [0.4, 0.55, 0.8, 1.1, 1.6, 2.2, 3.0, 4.0], bars = H.map((h, i) => { const b = grp(g, -2.8 + i * 0.75, 0.2, 0.3); const m = mesh(RB(0.55, 1, 0.55, 0.06), M(i === 7 ? C.red : S.mix('#c89a5a', '#d4553c', i / 7), 0.6), b, 0, 0.5, 0); return { b, m, h }; });
    const tu = tulip(g); tu.g.scale.setScalar(0.8);
    const petals = []; const pm = new T.MeshStandardMaterial({ map: FLAME, roughness: 0.5, side: T.DoubleSide }); for (let i = 0; i < 10; i++) { const p = mesh(new T.SphereGeometry(0.14, 10, 10, 0, 1.2, 0.3, 1.8), pm, g, 0, 0, 0, true); petals.push(p); }
    const puffs = []; for (let i = 0; i < 14; i++) puffs.push(mesh(SP(0.18, 12, 10), M('#e8dcc4', 1, 0, { transparent: true, opacity: 0.6 }), g, 0, 0, 0, false));
    const lab = plane(2.2, 0.5, labelMat(660, 150, (c, w, h) => { c.fillStyle = C.ink; c.font = '900 92px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PRICE', w / 2, h / 2); }), g, -2.4, 0.22, 2.2); lab.rotation.x = -Math.PI / 2;
    return { g, sun: { pos: [-3, 8, 5], col: '#fff0d6', int: 2.0 }, hemi: 0.45,
      update(t) {
        const tc = at('collapsed'), grow = S.ease.out(P01(t, CUT[5] - 0.2, 0.9));
        bars.forEach((o, i) => { const f = S.clamp((grow * 8 - i * 0.6)), t0 = tc + (7 - i) * 0.05, fall = S.ease.in(S.p(t, t0, t0 + 0.4)); const hh = o.h * S.ease.out(S.clamp(f)) * (1 - fall * 0.85) + 0.02; o.m.scale.y = hh; o.m.position.y = hh / 2; o.b.rotation.z = fall * (i % 2 ? 0.25 : -0.2) + damp(t, t0 + 0.4, 18, 7) * 0.05; o.b.position.y = 0.2 - fall * 0.05; });
        const top = bars[7], hTop = top.m.scale.y; const fallT = S.ease.in(S.p(t, tc + 0.02, tc + 0.6)); tu.g.position.set(top.b.position.x + fallT * 0.8, 0.2 + hTop + 0.02 - fallT * 0.4 * 0, 0.3 + fallT * 0.6); tu.g.rotation.z = -fallT * 1.4; tu.set(1, t > tc + 0.1 ? 0 : 1, 0);
        if (t > tc + 0.02) tu.g.position.y = Math.max(0.25, 0.2 + top.h + 0.02 - fallT * fallT * 4.5);
        petals.forEach((p, i) => { const r = S.rng(i + 70), u = t - tc - 0.08; p.visible = u > 0; if (u <= 0) return; p.position.set(top.b.position.x + (r() - 0.5) * 0.4 + (r() - 0.3) * u * 2.2, Math.max(0.22, 0.2 + top.h + 0.6 + u * (1.5 + r()) - u * u * 3.2), 0.3 + (r() - 0.3) * u * 2); p.rotation.set(u * (3 + r() * 4), u * 5 * r(), u * 4); });
        puffs.forEach((p, i) => { const r = S.rng(i + 90), u = t - tc - 0.35; p.visible = u > 0 && u < 1.3; if (!p.visible) return; p.position.set(-2.8 + r() * 5.4, 0.3 + u * 0.4, 0.3 + (r() - 0.5) * 1.2); p.scale.setScalar(0.4 + u * 1.5); p.material.opacity = 0.55 * (1 - u / 1.3); });
      },
      cam(t) { const tc = at('collapsed'), lt = t - CUT[5], d = S.ease.inOut(P01(t, tc - 0.1, 0.7)); return { p: [S.lerp(2.0, 0.9, d), S.lerp(2.4, 3.0, d), S.lerp(9.4, 9.8, d) - lt * 0.1], t: [S.lerp(1.0, 0.4, d), S.lerp(2.5, 1.3, d), 0.3], f: 8.6 }; },
    };
  })());

  // 6. walk away for 3.5%: a coin pie loses a sliver
  sets.push((() => {
    const g = new T.Group(); plinth(g, 9, 7, '#5a3420');
    const cloth = tex(256, 256, (c, w, h) => { c.fillStyle = '#2f4a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < w; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); } });
    mesh(RB(8.6, 0.06, 6.6, 0.02), new T.MeshStandardMaterial({ map: cloth, roughness: 0.95 }), g, 0, 0.03, 0); mesh(new T.PlaneGeometry(16, 10), M('#20160f', 1), g, 0, 4, -3.4, false);
    const slice = 0.035 * Math.PI * 2, s0 = Math.PI * 0.32, gold = M(C.gold, 0.3, 0.55, { emissive: '#3a2200', emissiveIntensity: 0.25 });
    const coin = mesh(CY(1.5, 1.5, 0.28, 96, false, s0 + slice, Math.PI * 2 - slice), gold, g, -0.6, 0.2, 0.1);
    const ring = mesh(new T.TorusGeometry(1.25, 0.04, 8, 80, Math.PI * 2 - slice), gold, coin, 0, 0.15, 0, false); ring.rotation.set(Math.PI / 2, 0, -(s0 + slice) + Math.PI / 2 * 0); ring.rotation.z = s0 + slice - Math.PI / 2;
    const faceTex = tex(512, 512, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); c.fillStyle = '#7a4a10'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 150px Fraunces'; c.fillText('ƒ10,000', w / 2, h / 2); });
    const face = plane(2.0, 2.0, new T.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.4 }), coin, 0, 0.142, 0); face.rotation.x = -Math.PI / 2;
    const piece = grp(g, -0.6, 0.2, 0.1); mesh(CY(1.5, 1.5, 0.28, 8, false, s0, slice), gold, piece);
    const pct = sprite(1.3, 0.62, (c, w, h) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.roundRect(10, 10, w - 20, h - 20, 60); c.fill(); c.lineWidth = 14; c.strokeStyle = C.ink; c.stroke(); c.fillStyle = '#b3241c'; c.font = '900 170px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('3.5%', w / 2, h / 2 + 8); }, g);
    const pieter = place(person({ coat: '#26201c', breeches: '#3a2a20', ruff: true, sash: C.red, hat: 'capotain', beard: true, longNose: true, cuffs: true, hairCol: '#4a2a18' }), g, 1.7, 0.06, 0.8, 1.05);
    const contract = scroll(pieter.handL); contract.position.set(0, -0.05, 0.12); contract.rotation.set(-0.3, 0, 0.2);
    const notes = [0, 1, 2].map(i => sprite(0.32, 0.4, (c, w, h) => { c.fillStyle = C.ink; c.font = '900 300px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(i % 2 ? '♪' : '♫', w / 2, h / 2); }, g));
    return { g, sun: { pos: [-3, 8, 5], col: '#ffe8c4', int: 2.2 }, hemi: 0.45,
      update(t) {
        const t35 = at('3.5'), tw = at('walk'), tp = at('price', 1, CUT[6]), out = S.ease.out(P01(t, t35 - 0.1, 0.45)), mid = s0 + slice / 2;
        piece.position.set(-0.6 + Math.cos(mid) * 0.0 + Math.sin(mid) * 0 , 0.2 + out * 0.35 * (1 - S.p(t, t35 + 0.4, t35 + 0.8)), 0.1); const dx = Math.cos(-mid + Math.PI / 2) , dz = Math.sin(mid);
        piece.position.x += out * 1.0 * Math.sin(mid + Math.PI / 2) * 0 + out * 0.9; piece.position.z += out * 0.5;
        const k2 = S.ease.back(P01(t, t35 + 0.05, 0.35)); pct.scale.set(1.3 * k2 + 0.001, 0.62 * k2 + 0.001, 1); pct.position.set(0.6, 1.5 + Math.sin(t * 3) * 0.04, 0.6);
        const walking = t > tp - 0.1, wu = Math.max(0, t - tp + 0.1); pieter.g.position.x = 1.7 + wu * 1.1; contract.visible = !walking;
        pose(pieter, t, { mood: t > t35 ? 'relief' : 'worried', walk: walking ? wu * 9 : null, turn: walking ? Math.PI / 2 * 0.8 : -0.5, armL: walking ? [0.2, 0] : [0.35, 0.8], armR: t > tw && !walking ? [0.6, 0.8] : [0.15, 0], look: walking ? -0.6 : 0, seed: 5 });
        notes.forEach((n, i) => { const u = (t - tp - i * 0.3); n.visible = u > 0; n.position.set(pieter.g.position.x + 0.3 + u * 0.3, 2.4 + u * 0.6, 0.6); n.material.opacity = S.clamp(1 - u / 1.5); });
      },
      cam(t) { const lt = t - CUT[6]; return { p: [0.2 + lt * 0.12, 4.2, 7.6 - lt * 0.1], t: [0.2 + lt * 0.08, 0.9, 0.2], f: 7.8 }; },
    };
  })());

  // 7. the map of the Dutch Republic: RUINED? Historians say no
  sets.push((() => {
    const g = new T.Group(); plinth(g, 10, 8, '#4a3020');
    const seaTex = tex(256, 256, (c, w, h) => { c.fillStyle = '#5d8fa8'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 3; for (let y = 10; y < h; y += 22) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x * 0.12 + y) * 3); c.stroke(); } }, [4, 4]);
    mesh(RB(9.6, 0.08, 7.6, 0.03), new T.MeshStandardMaterial({ map: seaTex, roughness: 0.4 }), g, 0, 0.04, 0);
    const pts = [[-0.9, -3.0], [-0.3, -2.7], [0.1, -2.0], [0.9, -2.2], [2.1, -2.5], [3.1, -2.3], [3.4, -1.0], [3.3, 0.6], [3.5, 1.8], [2.9, 3.0], [1.4, 3.2], [0.2, 2.9], [-0.9, 3.2], [-1.8, 2.7], [-1.9, 1.8], [-1.2, 1.1], [-1.5, 0.2], [-1.1, -0.8], [-1.4, -1.9]];
    const sh = new T.Shape(); pts.forEach(([x, z], i) => i ? sh.lineTo(x, -z) : sh.moveTo(x, -z));
    const land = mesh(new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 4 }), M('#9cba6a', 0.9), g, -0.6, 0.06, 0); land.rotation.x = -Math.PI / 2;
    const houses = []; const r = S.rng(31); for (let i = 0; i < 26; i++) { const x = -1.4 + r() * 3.6, z = -2 + r() * 4.4; if (Math.abs(x - 0.3) < 1.4 && Math.abs(z - 0.1) < 0.65) continue; const hg = grp(g, x - 0.6 + 0.4, 0.5, z); if (r() < 0.35) { mesh(CY(0.07, 0.11, 0.35, 8), M('#7a5a3e', 0.8), hg, 0, 0.18, 0); [0, Math.PI / 2].forEach(rz => { const sl = mesh(new T.BoxGeometry(0.4, 0.04, 0.02), M('#efe2c6', 0.9), hg, 0, 0.34, 0.08); sl.rotation.z = rz + 0.4; }); } else { mesh(new T.BoxGeometry(0.16, 0.16, 0.16), M(['#b0694a', '#a8553c', '#c08a5a'][i % 3], 0.85), hg, 0, 0.08, 0); mesh(new T.ConeGeometry(0.13, 0.12, 4), M('#5a3a2a', 0.8), hg, 0, 0.22, 0).rotation.y = Math.PI / 4; } houses.push(hg); }
    const names = [['Haarlem', -0.95, -0.3], ['Amsterdam', -0.2, -0.75]].map(([n, x, z]) => { const s = sprite(1.1, 0.32, (c, w, h) => { c.fillStyle = 'rgba(255,250,240,0.92)'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 40); c.fill(); c.fillStyle = C.ink; c.font = '900 100px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, w / 2, h / 2 + 4); }, g); s.position.set(x, 1.05, z); mesh(SP(0.07), M(C.red, 0.5), g, x, 0.55, z + 0.15); return s; });
    const stamp = grp(g); mesh(CY(0.16, 0.22, 1.0, 20), M('#7a4a26', 0.6), stamp, 0, 0.75, 0); mesh(SP(0.3, 20, 14), M('#7a4a26', 0.6), stamp, 0, 1.35, 0); mesh(RB(2.4, 0.28, 1.0, 0.05), M('#4a2e1a', 0.6), stamp, 0, 0.14, 0); mesh(RB(2.3, 0.06, 0.9, 0.02), M('#b3241c', 0.5), stamp, 0, 0.0, 0);
    const printT = tex(800, 320, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#c0281e'; c.lineWidth = 22; c.strokeRect(20, 20, w - 40, h - 40); c.fillStyle = '#c0281e'; c.font = '900 190px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RUINED?', w / 2, h / 2 + 10); });
    const print = plane(2.3, 0.92, new T.MeshStandardMaterial({ map: printT, transparent: true, roughness: 0.6, depthWrite: false }), g, 0.1, 0.64, 0.1); print.rotation.x = -Math.PI / 2;
    const hist = place(person({ coat: '#b23a2e', cardigan: true, hair: true, bun: true, hairCol: '#3d2a1e', glasses: true, skin: '#d9a27c', hose: '#2f3542' }), g, 4.2, 0.06, 1.8, 1.05);
    const book = grp(hist.handL, 0, -0.02, 0.12); mesh(RB(0.3, 0.4, 0.08, 0.02), M('#2d4a6b', 0.6), book);
    const no = sprite(1.0, 0.6, bubbleDraw('No.'), g);
    return { g, sun: { pos: [-3, 9, 4], col: '#fff2dc', int: 2.3 }, hemi: 0.55,
      update(t) {
        const tr = at('ruin'), te = at('economy'), th = at('historians'), tn = at('no', 1, th);
        const down = S.ease.in(P01(t, te - 0.35, 0.3)), up = S.ease.inOut(P01(t, te + 0.45, 0.5)), lift = S.ease.in(P01(t, tn + 0.1, 0.4));
        stamp.position.set(0.1, 0.6 + (1 - down) * 3.4 * (t < te ? 1 : 0) + up * 2.2 + lift * 4, 0.1); stamp.rotation.z = (1 - down) * 0.25 * (t < te ? 1 : 0); stamp.visible = t > tr - 0.4;
        print.visible = t > te - 0.02; print.material.opacity = t < tn ? 1 : 1 - S.p(t, tn + 0.1, tn + 0.6); print.scale.set(1 + damp(t, te, 22, 8) * 0.04, 1, 1);
        houses.forEach((h, i) => { h.position.y = 0.5 + Math.abs(damp(t, te + (i % 5) * 0.02, 20, 6)) * 0.12; });
        const walkIn = S.ease.out(P01(t, th - 0.4, 0.9)), walking = t < th + 0.5; hist.g.position.x = 3.9 - walkIn * 2.0;
        pose(hist, t, { walk: walking ? t * 9 : null, turn: walking ? -1.2 : -0.35, shake: t > tn - 0.05 && t < tn + 0.75 ? 1 : 0, mood: 'calm', armL: [0.2, 0.9], armR: t > tn ? [0.4, 0.6] : [0.15, 0], seed: 6 });
        const k2 = S.ease.back(P01(t, tn + 0.05, 0.3)); no.scale.set(k2 + 0.001, 0.6 * k2 + 0.001, 1); no.position.set(hist.g.position.x - 0.5, 3.2, 1.8);
      },
      cam(t) { const lt = t - CUT[7], th = at('historians'), d = S.ease.inOut(P01(t, th - 0.4, 0.9)); return { p: [S.lerp(0.0, 0.9, d), S.lerp(7.6, 4.6, d), S.lerp(5.6, 7.8, d)], t: [S.lerp(-0.1, 0.8, d), S.lerp(0.1, 1.0, d), S.lerp(-0.4, 0.6, d)], f: S.lerp(8.6, 7.6, d) }; },
    };
  })());

  // 8. the town square: only a handful in real trouble
  sets.push((() => {
    const g = new T.Group(); plinth(g, 10, 8, '#5a4a3a');
    const cob = tex(512, 512, (c, w, h) => { c.fillStyle = '#9a8a72'; c.fillRect(0, 0, w, h); const r = S.rng(4); for (let y = 0; y < h; y += 26) for (let x = (y / 26 % 2) * 16; x < w; x += 32) { c.fillStyle = `hsl(30,${12 + r() * 10}%,${52 + r() * 14}%)`; c.beginPath(); c.roundRect(x + 2, y + 2, 28, 22, 8); c.fill(); } }, [3, 3]);
    mesh(RB(10, 0.06, 8, 0.02), new T.MeshStandardMaterial({ map: cob, roughness: 0.9 }), g, 0, 0.03, 0);
    [[-3.8, '#a8553c', 2.4], [-2.2, '#8a4a34', 2.8], [-0.6, '#b0694a', 2.2], [1.0, '#9a5a40', 2.6], [2.6, '#a8553c', 2.3], [4.1, '#8a4a34', 2.7]].forEach(([x, c, h]) => gableHouse(g, x, -3.9, 1.5, h, c, 1));
    const sky = tex(256, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8ab8d6'); gr.addColorStop(1, '#f2dcb4'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }); mesh(new T.PlaneGeometry(22, 12), new T.MeshBasicMaterial({ map: sky }), g, 0, 5, -4.6, false);
    const fount = grp(g, 0, 0, -0.6); mesh(CY(0.9, 1.0, 0.4, 28), M('#bfb4a0', 0.8), fount, 0, 0.2, 0); mesh(CY(0.8, 0.8, 0.05, 28), M('#5d8fa8', 0.15, 0.1), fount, 0, 0.38, 0, false); mesh(CY(0.12, 0.16, 0.9, 12), M('#bfb4a0', 0.8), fount, 0, 0.7, 0);
    const people = [], coats = ['#6b5a3c', '#58603e', '#6d3f52', '#3e4a5e', '#7a4a2a', '#2f2723'], unlucky = [3, 11, 19, 26, 33];
    for (let i = 0; i < 38; i++) { const r = S.rng(i + 100); const p = mini({ coat: coats[i % 6], hat: ['cap', 'wide', 'none'][i % 3], hatCol: ['#4a3322', '#8a1f27', '#2a3a4a'][i % 3], hairCol: ['#5a3a22', '#2a1a10', '#8a6a42'][i % 3] }, g, 0, 0, 0.42); p.r = [r(), r(), r(), r()]; p.bad = unlucky.includes(i);
      if (p.bad) { p.cloud = grp(g); [[0, 0, 0.22], [0.2, 0.05, 0.17], [-0.2, 0.02, 0.18]].forEach(([a, b, s]) => mesh(SP(s, 12, 10), M('#6e7480', 0.9), p.cloud, a, b, 0, false)); p.rain = [0, 1, 2, 3].map(j => mesh(CY(0.008, 0.008, 0.18, 4), M('#9fc6e6', 0.3), p.cloud, -0.15 + j * 0.1, -0.2, 0, false)); }
      people.push(p); }
    return { g, sun: { pos: [-4, 9, 5], col: '#fff3dc', int: 2.4 }, hemi: 0.6,
      update(t) {
        const th = at('handful');
        people.forEach((p, i) => { const [a, b, c2, d] = p.r, stopped = p.bad && t > th + unlucky.indexOf(i) * 0.08; const sp = 0.25 + b * 0.25, ang = a * 7 + (stopped ? th : t) * sp * (c2 < 0.5 ? 1 : -1), rad = 1.6 + d * 2.0;
          const x = Math.cos(ang) * rad * 1.15, z = -0.6 + Math.sin(ang) * rad * 0.75; p.g.position.set(x, 0.06, z); p.g.rotation.y = -ang + (c2 < 0.5 ? 0 : Math.PI);
          const ph = (stopped ? 0 : t * 8 + i); p.legs[0].rotation.x = Math.sin(ph) * 0.5; p.legs[1].rotation.x = -Math.sin(ph) * 0.5; p.g.position.y = 0.06 + (stopped ? 0 : Math.abs(Math.cos(ph)) * 0.03);
          p.head.rotation.x = stopped ? 0.4 : 0; p.mouth.rotation.z = stopped ? 0 : Math.PI; p.mouth.position.y = stopped ? -0.14 : -0.1;
          if (p.bad) { const k2 = S.ease.back(P01(t, th + unlucky.indexOf(i) * 0.08, 0.35)); p.cloud.visible = t > th; p.cloud.position.set(x, 1.0, z); p.cloud.scale.setScalar(Math.max(0.001, k2)); p.rain.forEach((rr, j) => { rr.position.y = -0.2 - ((t * 2.2 + j * 0.27) % 0.5); }); } });
      },
      cam(t) { const lt = t - CUT[8], th = at('handful'), d = S.ease.inOut(P01(t, th - 0.2, 1.0)); return { p: [S.lerp(0, 0.6, d), S.lerp(6.8, 5.2, d), S.lerp(9.6, 8.0, d)], t: [S.lerp(0, 0.3, d), 0.2, S.lerp(-0.8, -0.4, d)], f: S.lerp(10.4, 8.6, d) }; },
    };
  })());

  // 9. satire rolls by, then the 1841 book slams down
  sets.push((() => {
    const g = new T.Group(); plinth(g, 10, 7, '#6b4a2e'); mesh(RB(10, 0.05, 2.0, 0.02), M('#c9a979', 0.95), g, 0, 0.03, 0.6);
    const paint = tex(512, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d9c7a0'); gr.addColorStop(1, '#b89a6a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#8a9a5a'; c.beginPath(); c.moveTo(0, h * 0.75); for (let x = 0; x <= w; x += 16) c.lineTo(x, h * 0.72 - Math.sin(x * 0.02) * 30 - Math.sin(x * 0.05) * 12); c.lineTo(w, h); c.lineTo(0, h); c.fill(); c.strokeStyle = 'rgba(60,40,20,0.25)'; c.lineWidth = 2; for (let y = 0; y < h * 0.6; y += 9) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
    mesh(new T.BoxGeometry(9, 5.5, 0.1), new T.MeshStandardMaterial({ map: paint, roughness: 0.95 }), g, 0, 2.75, -2.5); mesh(RB(9.4, 0.3, 0.3, 0.05), M(C.gold, 0.35, 0.6), g, 0, 5.55, -2.4); mesh(RB(9.4, 0.3, 0.3, 0.05), M(C.gold, 0.35, 0.6), g, 0, 0.15, -2.4);
    const cart = grp(g); mesh(RB(1.8, 0.35, 0.9, 0.06), M('#8a5a32', 0.7), cart, 0, 0.55, 0); const wheels = [[-0.65, 0.48], [0.65, 0.48], [-0.65, -0.48], [0.65, -0.48]].map(([x, z]) => { const w = grp(cart, x, 0.3, z); mesh(new T.TorusGeometry(0.26, 0.04, 8, 20), M('#5a3420', 0.7), w); for (let i = 0; i < 3; i++) mesh(new T.BoxGeometry(0.5, 0.03, 0.03), M('#5a3420', 0.7), w).rotation.z = i * Math.PI / 3; return w; });
    mesh(CY(0.035, 0.035, 2.2, 8), M('#5a3420', 0.7), cart, 0, 1.7, -0.1);
    const sailS = new T.Shape(); sailS.moveTo(0, 0); sailS.bezierCurveTo(-0.7, 0.2, -0.75, 1.0, -0.45, 1.5); sailS.lineTo(-0.2, 1.15); sailS.lineTo(0, 1.6); sailS.lineTo(0.2, 1.15); sailS.lineTo(0.45, 1.5); sailS.bezierCurveTo(0.75, 1.0, 0.7, 0.2, 0, 0);
    const sg = new T.ShapeGeometry(sailS); const uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.75) / 1.5, uv.getY(i) / 1.6); const sail = mesh(sg, new T.MeshStandardMaterial({ map: FLAME, side: T.DoubleSide, roughness: 0.6 }), cart, 0, 1.0, 0.0);
    const fools = [-0.5, 0.0, 0.5].map((x, i) => place(person({ coat: ['#e9b93a', C.red, '#3e6a8a'][i], hat: 'fool', hose: '#e9dcc3' }), cart, x, 0.72, 0.15, 0.5));
    const banner = sprite(2.6, 0.7, (c, w, h) => { c.fillStyle = '#f6ead0'; c.beginPath(); c.moveTo(40, 10); c.lineTo(w - 40, 10); c.lineTo(w - 10, h / 2); c.lineTo(w - 40, h - 10); c.lineTo(40, h - 10); c.lineTo(10, h / 2); c.closePath(); c.fill(); c.lineWidth = 10; c.strokeStyle = C.ink; c.stroke(); c.fillStyle = '#b3241c'; c.font = '900 64px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('A SATIRE, 1637', w / 2, h / 2 + 4); }, g); banner.position.set(0, 4.4, -1.2);
    const book = grp(g); const coverT = tex(512, 640, (c, w, h) => { c.fillStyle = '#6d1c16'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e2b35a'; c.lineWidth = 10; c.strokeRect(26, 26, w - 52, h - 52); c.fillStyle = '#e8c070'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'italic 700 46px Fraunces'; c.fillText('Extraordinary', w / 2, 170); c.font = '900 70px Fraunces'; c.fillText('Popular', w / 2, 250); c.fillText('Delusions', w / 2, 325); c.font = '900 120px Fraunces'; c.fillText('1841', w / 2, 480); });
    const bm = [M('#efe1bf', 0.9), M('#efe1bf', 0.9), new T.MeshStandardMaterial({ map: coverT, roughness: 0.6 }), M('#5a1712', 0.7), M('#efe1bf', 0.9), M('#5a1712', 0.7)]; const bk = mesh(new T.BoxGeometry(3.2, 0.6, 4.0), bm, book); book.rotation.y = 0.08;
    const dust = []; for (let i = 0; i < 18; i++) dust.push(mesh(SP(0.2, 10, 8), M('#e2d2b0', 1, 0, { transparent: true, opacity: 0.6 }), g, 0, 0, 0, false));
    return { g, sun: { pos: [-3, 8, 5], col: '#ffeccc', int: 2.3 }, hemi: 0.55,
      update(t) {
        const t0 = CUT[9], tb = at('1841'), x = -4.2 + (t - t0) * 1.15; cart.position.set(Math.min(x, 6), 0, 0.6); cart.visible = t < tb; wheels.forEach(w => w.rotation.z = -(t - t0) * 4.4); sail.rotation.y = Math.sin(t * 2) * 0.15;
        fools.forEach((f, i) => pose(f, t, { mood: 'happy', armR: [2.2 + Math.sin(t * 6 + i) * 0.4, 0.2], armL: [1.8 + Math.sin(t * 5 + i) * 0.4, 0.2], hop: Math.max(0, Math.sin(t * 7 + i * 2)) * 0.3, seed: i }));
        const ks = S.ease.back(P01(t, at('satire') - 0.15, 0.35)); banner.scale.set(2.6 * ks + 0.001, 0.7 * ks + 0.001, 1); banner.position.y = 4.0 + Math.sin(t * 2) * 0.05; banner.position.x = 0.3;
        const d = S.ease.in(P01(t, tb - 0.4, 0.4)); book.visible = t > tb - 0.4; book.position.set(-4.2 + (tb - t0) * 1.15, 0.3 + (1 - d) * 7 + Math.abs(damp(t, tb, 18, 9)) * 0.08, 0.5); book.rotation.x = (1 - d) * 0.4;
        dust.forEach((p, i) => { const u = t - tb, a = i / 18 * Math.PI * 2; p.visible = u > 0 && u < 1.2; if (!p.visible) return; const rr = 2.2 + u * 2.2; p.position.set(book.position.x + Math.cos(a) * rr * 0.9, 0.2 + u * 0.3, 0.5 + Math.sin(a) * rr * 0.7); p.scale.setScalar(0.5 + u * 1.6); p.material.opacity = 0.6 * (1 - u / 1.2); });
      },
      cam(t) { const lt = t - CUT[9], tb = at('1841'), d = S.ease.inOut(P01(t, tb - 0.5, 0.8)); return { p: [0.3 + lt * 0.03, S.lerp(2.2, 3.8, d), S.lerp(8.0, 9.2, d)], t: [0.3 + lt * 0.03, S.lerp(1.7, 0.9, d), 0.2], f: S.lerp(8.0, 9.0, d) }; },
    };
  })());
}

// ---------- shot list, camera and the whip pans between sets ----------
const CUTS = ['in 1637', 'a skilled', 'so traders', 'they called', 'then in february', 'within days', 'haarlem let', 'but did', 'only a handful', 'the ruin', 'the real bubble'];
const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // shot 10 returns to set 0 (slot 10 == slot 0 around the turntable)
const WHIP = 0.5;
function shotAt(t) { let i = 0; while (i < CUT.length - 1 && t >= CUT[i + 1]) i++; return i; }
const setOf = i => i % N;
function camPose(i, t) { const s = sets[setOf(i)], c = s.cam(t); return c; }
const V = (a) => new T.Vector3(a[0], a[1], a[2]);
function toWorld(angle, local) { const v = V(local); v.applyAxisAngle(new T.Vector3(0, 1, 0), -angle); const dir = new T.Vector3(Math.sin(angle), 0, -Math.cos(angle)).multiplyScalar(R); return v.add(dir); }

const DirBlur = { uniforms: { tDiffuse: { value: null }, amt: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float amt; varying vec2 vUv; void main(){ vec4 c = vec4(0.0); for (int i = 0; i < 17; i++) { float f = (float(i) / 16.0 - 0.5) * amt; c += texture2D(tDiffuse, vUv + vec2(f, 0.0)); } gl_FragColor = c / 17.0; }' };

export default {
  title: 'The tulip crash that never ruined anyone', fonts: ['Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700;1,9..144,900'], size: [1080, 1920], tail: 1.8,
  async build(kit) {
    k = kit; T = k.THREE; S = k.S; try { await document.fonts.load('900 80px Fraunces'); await document.fonts.load('italic 900 80px Fraunces'); } catch (e) {}
    CUT = CUTS.map((q, i) => i === 0 ? 0 : S.at(q) - 0.12);
    FLAME = flameTex(); SCROLLTEX = tex(420, 300, (c, w, h) => { c.fillStyle = '#f4e6c4'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(42,28,18,0.6)'; c.lineWidth = 6; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(40, 50 + i * 34); c.lineTo(w - 60 - (i % 2) * 70, 50 + i * 34); c.stroke(); } c.fillStyle = '#b3241c'; c.beginPath(); c.arc(w - 70, h - 60, 30, 0, 7); c.fill(); });
    scene = new T.Scene(); scene.background = new T.Color('#0d0906'); scene.fog = new T.Fog('#0d0906', 16, 34);
    cam = new T.PerspectiveCamera(50, 1080 / 1920, 0.1, 80);
    hemi = new T.HemisphereLight('#fff1dc', '#3a2618', 0.5); scene.add(hemi);
    sun = new T.DirectionalLight('#ffe8c8', 2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5; Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 }); scene.add(sun, sun.target);
    buildSets(); sets.forEach((s, i) => { const a = i * SLOT; s.g.position.copy(toWorld(a, [0, 0, 0])); s.g.rotation.y = -a; scene.add(s.g); });
    k.renderer.toneMappingExposure = 1.18; k.setup(scene, cam, { bloom: { strength: 0.32, radius: 0.55, threshold: 0.82 }, dof: { focus: 6, aperture: 0.0016, maxblur: 0.009 }, grain: 0.035, vignette: 0.42, fringe: 0.0012 });
    blur = new k.passes.finish.constructor(DirBlur); k.composer.insertPass(blur, 1);
  },
  update(t) {
    const i = shotAt(t), nx = Math.min(CUT.length - 1, i + 1), tc = CUT[nx];
    // which shot owns the frame, with a whip pan around each cut
    let a, local, si = i, w = 0;
    const inWhip = nx !== i && t > tc - WHIP / 2; const prevWhip = i > 0 && t < CUT[i] + WHIP / 2;
    if (inWhip || prevWhip) { const from = inWhip ? i : i - 1, to = from + 1, c = CUT[to]; w = S.p(t, c - WHIP / 2, c + WHIP / 2); const e = S.ease.inOut(w);
      const A = camPose(from, c - WHIP / 2), B = camPose(to, c + WHIP / 2); a = S.lerp(from * SLOT, to * SLOT, e); local = { p: A.p.map((v, j) => S.lerp(v, B.p[j], e)), t: A.t.map((v, j) => S.lerp(v, B.t[j], e)), f: S.lerp(A.f, B.f, e) }; si = e < 0.5 ? from : to;
      blur.uniforms.amt.value = Math.sin(w * Math.PI) ** 2 * 0.16; }
    else { a = i * SLOT; local = camPose(i, t); blur.uniforms.amt.value = 0; }
    sets.forEach(s => s.update(t));
    // camera shake on the big hits and a little hand-held drift
    let sh = 0; [S.at('collapsed'), S.at('economy'), S.at('1841'), S.at('10,000') + 0.3].forEach(h => { if (t > h && t < h + 0.5) sh = Math.max(sh, 0.09 * (1 - (t - h) / 0.5)); });
    const drift = [noise(t * 0.5, 1) * 0.03 + noise(t * 23, 3) * sh, noise(t * 0.4, 2) * 0.03 + noise(t * 21, 4) * sh, 0];
    const p = toWorld(a, local.p.map((v, j) => v + (drift[j] || 0))), tg = toWorld(a, local.t);
    cam.position.copy(p); cam.lookAt(tg); k.focus(local.f, 0.0016);
    // light follows the set on screen
    const s = sets[setOf(si)], L = s.sun; sun.position.copy(toWorld(si * SLOT, L.pos)); sun.target.position.copy(toWorld(si * SLOT, [0, 0, 0])); sun.color.set(L.col); sun.intensity = L.int; hemi.intensity = s.hemi;
    k.passes.finish.uniforms.vignette.value = 0.42;
  },
  overlay(c, t, kit) {
    // captions: chunky Fraunces, each word pops in as it is spoken
    const sn = S.sentenceAt(t); const HI = /^(1637|10,000|300|buried|ground|wind|no|paper|february|haarlem|collapsed|3\.5|ruin|historians|handful|satire|1841|bubble|story)$/i;
    if (sn && t < sn.e + 0.7 && t > sn.s - 0.15) { const fade = 1 - S.p(t, sn.e + 0.35, sn.e + 0.7); c.save(); c.globalAlpha = fade; c.textBaseline = 'middle'; c.lineJoin = 'round';
      const size = 76; c.font = `900 ${size}px Fraunces`; const lines = [[]]; let w = 0; sn.words.forEach(x => { const ww = c.measureText(x.w + ' ').width; if (w + ww > 900 && lines[lines.length - 1].length) { lines.push([]); w = 0; } lines[lines.length - 1].push(x); w += ww; });
      const y0 = 1420 - (lines.length - 1) * 46;
      lines.forEach((ln, li) => { let tw = 0; ln.forEach(x => tw += c.measureText(x.w + ' ').width); let x = 540 - tw / 2;
        ln.forEach(wd => { const ww = c.measureText(wd.w + ' ').width, k2 = S.p(t, wd.s - 0.06, wd.s + 0.16), sc = 0.55 + 0.45 * S.ease.back(k2), clean = wd.w.replace(/[^\w.,]/g, '').replace(/[.,]$/, ''), hi = HI.test(clean);
          if (k2 > 0) { c.save(); c.translate(x + (ww - c.measureText(' ').width) / 2, y0 + li * 92); c.scale(sc, sc); c.rotate((1 - k2) * -0.12); c.globalAlpha = fade * S.clamp(k2 * 1.6);
            c.shadowColor = 'rgba(20,10,0,0.55)'; c.shadowBlur = 18; c.shadowOffsetY = 6; c.lineWidth = 16; c.strokeStyle = '#2a170c'; c.textAlign = 'center'; c.strokeText(wd.w, 0, 0); c.shadowColor = 'transparent'; c.fillStyle = hi ? '#ffcf3f' : '#fffaf0'; c.fillText(wd.w, 0, 0); c.restore(); }
          x += ww; }); }); c.restore(); }
    // opening year and closing title
    const k1 = S.p(t, 0.1, 0.5) * (1 - S.p(t, S.at('10,000') - 0.6, S.at('10,000') - 0.25)); if (k1 > 0) { c.save(); c.globalAlpha = k1; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'italic 900 150px Fraunces'; c.lineWidth = 18; c.strokeStyle = '#2a170c'; c.lineJoin = 'round'; c.strokeText('1637', 540, 300 + (1 - S.ease.out(S.p(t, 0.1, 0.6))) * 40); c.fillStyle = '#ffcf3f'; c.fillText('1637', 540, 300 + (1 - S.ease.out(S.p(t, 0.1, 0.6))) * 40); c.font = '700 44px Fraunces'; c.lineWidth = 10; c.strokeText('THE DUTCH REPUBLIC', 540, 410); c.fillStyle = '#fffaf0'; c.fillText('THE DUTCH REPUBLIC', 540, 410); c.restore(); }
    const ts = S.at('story', 2), k3 = S.ease.out(S.p(t, ts + 0.5, ts + 1.0)); if (k3 > 0) { c.save(); c.globalAlpha = k3; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.font = 'italic 900 132px Fraunces'; c.lineWidth = 18; c.strokeStyle = '#2a170c'; const y = 330 - (1 - k3) * 30; c.strokeText('Tulip mania', 540, y); c.fillStyle = '#ffcf3f'; c.fillText('Tulip mania', 540, y); c.font = '700 40px Fraunces'; c.lineWidth = 9; c.strokeText('THE CRASH THAT RUINED (ALMOST) NO ONE', 540, y + 100); c.fillStyle = '#fffaf0'; c.fillText('THE CRASH THAT RUINED (ALMOST) NO ONE', 540, y + 100); c.restore(); }
  },
  sound() { return SOUND(); },
};

// ---------- the soundtrack plan for this film (rendered by soundtrack.py) ----------
function SOUND() {
  const A = (q, n, af) => +S.at(q, n, af).toFixed(3), cues = [];
  const add = (t, sfx, vol = 1, extra = {}) => cues.push(Object.assign({ t: +(+t).toFixed(3), sfx, vol }, extra));
  CUT.slice(1).forEach(c => add(c - 0.28, 'whoosh', 0.55));
  add(A('tulip') - 0.2, 'grow', 0.6); add(A('tulip') + 0.4, 'sparkle', 0.5); add(A('10,000') + 0.05, 'swing', 0.5); add(A('10,000') + 0.3, 'ding', 0.6); add(A('10,000') + 0.35, 'coins', 0.7);
  for (let x = CUT[1] + 0.21; x < A('300') - 0.2; x += 0.42) add(x, 'hammer', 0.55); for (let i = 0; i < 10; i++) add(A('300') - 0.1 + i * 0.05 + 0.25, 'clink', 0.35); add(A('300') + 0.5, 'boing', 0.45);
  add(A('bidding'), 'pop', 0.6); add(A('bidding') + 0.3, 'pop', 0.6); add(A('bulbs') - 0.05, 'pop', 0.7); add(CUT[2] + 0.1, 'murmur', 0.35, { dur: CUT[3] - CUT[2] }); add(A('buried') - 0.3, 'swoop', 0.5);
  add(A('wind') - 0.2, 'wind', 0.6, { dur: 4.5 }); add(A('no', 1, CUT[3]), 'pop', 0.5); add(A('changed'), 'clap', 0.5); add(A('paper') - 0.3, 'paper', 0.7, { dur: 1.6 });
  add(A('auction'), 'gavel', 0.8); add(A('auction') + 0.45, 'gavel', 0.7); add(A('no buyers') + 0.15, 'cricket', 0.5, { dur: 1.6 }); add(A('no buyers') + 0.35, 'tweet', 0.5);
  add(A('prices') - 0.1, 'rise', 0.5); add(A('collapsed'), 'crash', 0.9); add(A('collapsed') + 0.05, 'hit', 0.8);
  add(A('3.5') - 0.05, 'slide', 0.6); add(A('3.5') + 0.1, 'pop', 0.6); add(A('price', 1, CUT[6]), 'steps', 0.4, { dur: 1.2 }); add(A('price', 1, CUT[6]) + 0.1, 'whistle', 0.5);
  add(A('economy') - 0.08, 'stamp', 0.9); add(A('historians') - 0.4, 'steps', 0.4, { dur: 0.9 }); add(A('no', 1, A('historians')) + 0.05, 'pop', 0.5);
  add(A('handful'), 'thunder', 0.5); add(A('handful') + 0.1, 'rain', 0.35, { dur: 1.8 });
  add(CUT[9] + 0.1, 'jingle', 0.45, { dur: 2.6 }); add(A('satire') - 0.15, 'pop', 0.5); add(A('1841') - 0.05, 'thud', 1.0);
  add(A('story', 2) - 0.02, 'bubble', 0.8); add(A('story', 2) + 0.5, 'chime', 0.5);
  return { length: +S.length.toFixed(2), cues,
    music: { bpm: 104, key: 'D minor', feel: 'playful baroque miniature: harpsichord, pizzicato strings, bassoon, light woodblock',
      sections: [ { t: 0, chords: ['Dm', 'A', 'Dm', 'Gm', 'C', 'F', 'Gm', 'A'], style: 'baroque', energy: 0.7 },
        { t: +CUT[4].toFixed(2), chords: ['Dm', 'Dm', 'Bb', 'A'], style: 'sparse', energy: 0.4 },
        { t: +(S.at('collapsed') - 0.05).toFixed(2), chords: ['Bb', 'A'], style: 'stinger', energy: 1 },
        { t: +CUT[6].toFixed(2), chords: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'A'], style: 'baroque', energy: 0.6 },
        { t: +CUT[10].toFixed(2), chords: ['Dm', 'Gm', 'A', 'D'], style: 'ending', energy: 0.6 } ] } };
}
