// Stage: the plumbing every original film shares. It holds NO drawings, palettes, characters or layouts.
// A film is one hand-written file (videos/<slug>/film.js) that calls FILM({...}). This file only gives it
// the canvas size, the time of every spoken word, easing, randomness and text fitting.
(function () {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9.%]/g, '').replace(/\.$/, '');
  const ease = {
    lin: x => clamp(x), in: x => clamp(x) ** 2, out: x => 1 - (1 - clamp(x)) ** 3, inOut: x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; },
    back: x => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; },
    elastic: x => { x = clamp(x); return x === 0 || x === 1 ? x : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1; },
    bounce: x => { x = clamp(x); const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; },
  };
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function noise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
  function mix(a, b, f) { const p = c => { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
    const A = p(a), B = p(b), f2 = clamp(f); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * f2).toString(16).padStart(2, '0')).join(''); }

  function makeStage(film, words, W, H) {
    const ws = (words || []).map((w, i) => ({ w: w.w, s: w.s, e: w.e, i, n: norm(w.w) }));
    const total = ws.length ? ws[ws.length - 1].e : (film.length || 30);
    const sentences = []; let cur = null;
    ws.forEach(w => { if (!cur) cur = { words: [], s: w.s }; cur.words.push(w); cur.e = w.e; if (/[.?!:]$/.test(w.w)) { sentences.push(cur); cur = null; } }); if (cur) sentences.push(cur);
    sentences.forEach((s, i) => { s.i = i; s.text = s.words.map(w => w.w).join(' '); });
    const S = {
      W, H, words: ws, sentences, total, length: total + (film.tail != null ? film.tail : 1.2), clamp, ease, rng, noise, hash, mix,
      lerp: (a, b, f) => a + (b - a) * f,
      p: (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a)), // progress of t from a to b, 0..1
      // time a word or phrase starts being spoken. at('collapsed'), at('no buyers'), at('haarlem', 2) for the 2nd one, at('only', 1, 30) for the first after 30 s
      find(phrase, nth = 1, after = -1) { const raw = String(phrase).split(/\s+/).filter(Boolean), q = raw.map(norm), pre = raw.map(x => x.endsWith('*')); let k = 0; // exact words; end a word with * to match its start ("trad*")
        for (let i = 0; i + q.length <= ws.length; i++) { if (ws[i].s < after) continue; if (q.every((x, j) => ws[i + j].n === x || (pre[j] && ws[i + j].n.startsWith(x)))) { if (++k === nth) return { s: ws[i].s, e: ws[i + q.length - 1].e, i }; } }
        return null; },
      at(phrase, nth, after) { const f = S.find(phrase, nth, after); if (!f) { S.missing.add(phrase); return 0; } return f.s; },
      end(phrase, nth, after) { const f = S.find(phrase, nth, after); if (!f) { S.missing.add(phrase); return 0; } return f.e; },
      missing: new Set(),
      sentenceAt: t => { let r = sentences[0]; for (const s of sentences) if (s.s - 0.05 <= t) r = s; return r; },
      spokenUpTo: t => ws.filter(w => w.s <= t), // words heard so far
      // shrink a font until the text fits maxW. font is a template like '700 {}px "IM Fell English"'
      fit(ctx, text, font, size, maxW) { let z = size; ctx.font = font.replace('{}', z); while (z > 8 && ctx.measureText(text).width > maxW) { z -= 2; ctx.font = font.replace('{}', z); } return z; },
      wrap(ctx, text, maxW) { const out = []; let line = ''; String(text).split(/\s+/).forEach(w => { const tr = line ? line + ' ' + w : w; if (ctx.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr; }); if (line) out.push(line); return out; },
    };
    return S;
  }
  const g = typeof window !== 'undefined' ? window : globalThis;
  g.FILM = def => { g.__film = def; };
  g.Stage = { makeStage, ease, rng, noise, mix, clamp };
})();
