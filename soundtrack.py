#!/usr/bin/env python3
"""Soundtrack for an original film: music from the film's own music plan (General MIDI through FluidSynth),
sound effects synthesised here, the voice on top, music ducked under the voice.

  python3 soundtrack.py videos/<slug>      reads sound.json (from `node original3d.js cues`) and voice-tight.wav or voice.mp3
  writes music.wav, sfx.wav and soundtrack.wav (loudness about -14 LUFS, ready for TikTok)
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from scipy import signal
import mido

SR = 44100
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
D = sys.argv[1].rstrip('/') + '/'
plan = json.load(open(D + 'sound.json'))
LENGTH = plan['length'] + 0.5
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- helpers
def t_(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.005, r=0.2, shape=4.0):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    tt = np.arange(n) / SR; return e * np.exp(-tt * shape / max(r, 1e-3))
def bp(x, lo, hi, order=2): b, a = signal.butter(order, [lo / (SR / 2), min(hi / (SR / 2), 0.99)], 'band'); return signal.lfilter(b, a, x)
def lp(x, f, order=2): b, a = signal.butter(order, min(f / (SR / 2), 0.99), 'low'); return signal.lfilter(b, a, x)
def hp(x, f, order=2): b, a = signal.butter(order, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def noise(d): return rng.standard_normal(int(d * SR))
def sweep(f0, f1, d, kind='exp'):
    tt = t_(d); f = f0 * (f1 / f0) ** (tt / d) if kind == 'exp' else f0 + (f1 - f0) * tt / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def norm(x, peak=0.9): m = np.max(np.abs(x)) or 1; return x / m * peak
def moving_band(x, f0, f1, steps=24):
    out = np.zeros_like(x); n = len(x); seg = n // steps
    for i in range(steps):
        f = f0 * (f1 / f0) ** (i / (steps - 1)); s, e = i * seg, (n if i == steps - 1 else (i + 1) * seg)
        out[s:e] = bp(x[max(0, s - 400):e], f * 0.7, f * 1.4)[s - max(0, s - 400):]
    return out
def metal(f, d, partials=(1, 2.76, 5.4, 8.93), decay=6):
    tt = t_(d); return sum(np.sin(2 * np.pi * f * p * tt + rng.random() * 6) * np.exp(-tt * decay * (1 + i * 0.6)) / (i + 1) for i, p in enumerate(partials))

# ---------------------------------------------------------------- sound effects (all made here)
def sfx(name, dur=None):
    if name == 'whoosh': d = 0.55; x = moving_band(noise(d), 300, 2400); return norm(x * np.sin(np.pi * t_(d) / d) ** 2, 0.8)
    if name == 'swoop': d = 0.7; x = moving_band(noise(d), 2400, 250); return norm(x * np.sin(np.pi * t_(d) / d) ** 1.5, 0.7)
    if name == 'swing': d = 0.5; x = moving_band(noise(d), 500, 900); return norm(x * np.sin(np.pi * t_(d) / d), 0.5)
    if name == 'pop': d = 0.12; x = sweep(1100, 240, d) * env(int(d * SR), 0.002, 0.05) + hp(noise(d), 2000) * env(int(d * SR), 0.001, 0.01) * 0.3; return norm(x, 0.8)
    if name == 'bubble': d = 0.35; x = sweep(280, 1400, 0.09); x = np.concatenate([x * env(len(x), 0.002, 0.08), np.zeros(int(0.02 * SR))]); n2 = hp(noise(0.24), 3000) * env(int(0.24 * SR), 0.001, 0.05) * 0.5; return norm(np.concatenate([x, n2]), 0.8)
    if name == 'clink': d = 0.5; return norm(metal(2600 + rng.random() * 900, d, decay=9), 0.6)
    if name == 'coins':
        d = 1.2; out = np.zeros(int(d * SR))
        for i in range(16):
            s = int((rng.random() ** 1.6) * 0.8 * SR); c = metal(2200 + rng.random() * 1800, 0.35, decay=12) * (0.4 + rng.random() * 0.6); out[s:s + len(c)] += c[:len(out) - s]
        return norm(out, 0.8)
    if name == 'ding': d = 1.6; return norm(metal(1318, d, (1, 2.0, 3.01, 4.2), decay=2.2), 0.6)
    if name == 'chime':
        d = 2.2; out = np.zeros(int(d * SR))
        for i, f in enumerate([1175, 1480, 1760, 2349]): c = metal(f, 1.4, (1, 2.0, 3.0), decay=2.5); s = int(i * 0.11 * SR); out[s:s + len(c)] += c[:len(out) - s]
        return norm(out, 0.6)
    if name == 'sparkle':
        d = 1.0; out = np.zeros(int(d * SR))
        for i in range(14): f = 2800 + rng.random() * 3200; c = np.sin(2 * np.pi * f * t_(0.15)) * env(int(0.15 * SR), 0.002, 0.05); s = int(rng.random() * 0.8 * SR); out[s:s + len(c)] += c * (0.3 + rng.random() * 0.7)
        return norm(out, 0.5)
    if name == 'grow': d = 1.0; x = sweep(320, 1100, d) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t_(d))) * np.sin(np.pi * t_(d) / d); return norm(x, 0.35)
    if name == 'hammer': d = 0.25; x = np.sin(2 * np.pi * 110 * t_(d)) * env(int(d * SR), 0.001, 0.06) + bp(noise(d), 900, 2600) * env(int(d * SR), 0.0005, 0.03) * 0.9; return norm(x, 0.8)
    if name == 'gavel': d = 0.5; x = np.sin(2 * np.pi * 680 * t_(d)) * env(int(d * SR), 0.0005, 0.07) * 0.7 + np.sin(2 * np.pi * 95 * t_(d)) * env(int(d * SR), 0.001, 0.1) + bp(noise(d), 1500, 5000) * env(int(d * SR), 0.0003, 0.012); return norm(x, 0.9)
    if name == 'clap': d = 0.2; return norm(bp(noise(d), 900, 3500) * env(int(d * SR), 0.001, 0.035), 0.6)
    if name == 'boing': d = 0.6; tt = t_(d); f = 180 + 220 * tt / d + 40 * np.sin(2 * np.pi * 14 * tt); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.005, 0.35); return norm(x, 0.5)
    if name == 'murmur':
        d = dur or 3; out = np.zeros(int(d * SR))
        for i in range(int(d * 9)):
            l = 0.15 + rng.random() * 0.35; f = 250 + rng.random() * 600; b = bp(noise(l), f, f * 1.6) * np.sin(np.pi * t_(l) / l); s = int(rng.random() * (d - l) * SR); out[s:s + len(b)] += b * (0.3 + rng.random())
        return norm(lp(out, 2000) * np.minimum(1, np.minimum(t_(d), d - t_(d)) * 3), 0.45)
    if name == 'wind':
        d = dur or 4; tt = t_(d); x = lp(noise(d), 900) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.35 * tt + 1)) + bp(noise(d), 600, 760) * 0.6 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * tt))
        return norm(x * np.minimum(1, np.minimum(tt, d - tt) * 1.2), 0.6)
    if name == 'paper':
        d = dur or 1.5; tt = t_(d); x = hp(noise(d), 1800) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (14 + 6 * np.sin(tt * 5)) * tt))) ; return norm(lp(x, 7000) * np.minimum(1, np.minimum(tt, d - tt) * 4), 0.55)
    if name == 'cricket':
        d = dur or 1.6; out = np.zeros(int(d * SR))
        for g in np.arange(0.05, d - 0.3, 0.42):
            for j in range(3): c = np.sin(2 * np.pi * 4600 * t_(0.035)) * np.sin(np.pi * t_(0.035) / 0.035); s = int((g + j * 0.05) * SR); out[s:s + len(c)] += c
        return norm(out, 0.4)
    if name == 'tweet':
        d = 0.5; out = np.zeros(int(d * SR))
        for j, s0 in enumerate([0, 0.13, 0.24]): c = sweep(3200, 5200 if j % 2 == 0 else 2600, 0.08) * np.sin(np.pi * t_(0.08) / 0.08); s = int(s0 * SR); out[s:s + len(c)] += c
        return norm(out, 0.45)
    if name == 'rise': d = 0.8; tt = t_(d); x = moving_band(noise(d), 400, 3000) * (tt / d) ** 2 + sweep(200, 600, d) * 0.2 * (tt / d); return norm(x, 0.5)
    if name == 'crash':
        d = 1.6; tt = t_(d); x = lp(noise(d), 3500) * np.exp(-tt * 3.5); out = x.copy()
        for i in range(30): s = int((rng.random() ** 2) * 1.0 * SR); c = bp(noise(0.05), 800, 4000) * env(int(0.05 * SR), 0.0005, 0.02); out[s:s + len(c)] += c * rng.random() * 1.5
        out += np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 4) * 1.5; return norm(out, 0.95)
    if name == 'thud': d = 1.2; tt = t_(d); x = np.sin(2 * np.pi * (48 + 30 * np.exp(-tt * 20)) * tt) * np.exp(-tt * 5) * 1.4 + lp(noise(d), 600) * np.exp(-tt * 7); return norm(x, 1.0)
    if name == 'stamp': d = 0.6; tt = t_(d); x = np.sin(2 * np.pi * (70 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9) + bp(noise(d), 400, 2500) * np.exp(-tt * 30) * 0.8; return norm(x, 0.95)
    if name == 'thunder': d = 1.8; tt = t_(d); x = lp(noise(d), 220, 3) * (np.exp(-tt * 2.5) * (1 + 0.6 * np.sin(2 * np.pi * 3 * tt))) ; x[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR)); return norm(x, 0.7)
    if name == 'rain':
        d = dur or 2; out = hp(noise(d), 3000) * 0.15
        for i in range(int(d * 60)): c = np.sin(2 * np.pi * (2000 + rng.random() * 3000) * t_(0.01)) * env(int(0.01 * SR), 0.0005, 0.004); s = int(rng.random() * (d - 0.02) * SR); out[s:s + len(c)] += c * rng.random()
        return norm(out * np.minimum(1, np.minimum(t_(d), d - t_(d)) * 3), 0.4)
    if name == 'slide': d = 0.45; x = moving_band(noise(d), 600, 1800) * np.sin(np.pi * t_(d) / d); return norm(x, 0.5)
    if name == 'steps':
        d = dur or 1.2; out = np.zeros(int(d * SR))
        for s0 in np.arange(0, d - 0.1, 0.27): c = np.sin(2 * np.pi * 120 * t_(0.08)) * env(int(0.08 * SR), 0.001, 0.025) + bp(noise(0.08), 800, 2000) * env(int(0.08 * SR), 0.0005, 0.01) * 0.4; s = int(s0 * SR); out[s:s + len(c)] += c
        return norm(out, 0.5)
    if name == 'whistle':
        out = []
        for f, l in [(1568, 0.18), (1976, 0.18), (2349, 0.4)]: tt = t_(l); out.append(np.sin(2 * np.pi * f * tt + 0.004 * np.sin(2 * np.pi * 6 * tt) * f) * np.sin(np.pi * tt / l) ** 0.5)
        return norm(np.concatenate(out), 0.35)
    if name == 'jingle':
        d = dur or 2.5; out = np.zeros(int(d * SR))
        for s0 in np.arange(0, d - 0.3, 0.145):
            for j in range(3): c = metal(4200 + rng.random() * 1500, 0.2, decay=20); s = int((s0 + rng.random() * 0.02) * SR); out[s:s + len(c)] += c * 0.5
        return norm(out, 0.4)
    if name == 'hit': return None  # rendered with the orchestra below
    raise ValueError('unknown sfx ' + name)

# ---------------------------------------------------------------- music: an arranger that plays the film's own chords
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def chord_notes(ch):
    root = ch[:2] if len(ch) > 1 and ch[1] in '#b' else ch[:1]; q = ch[len(root):]; r = NOTE[root]
    return r, ([0, 3, 7] if q.startswith('m') else [0, 4, 7])
def write_music(path):
    mid = mido.MidiFile(ticks_per_beat=480); bpm = plan['music']['bpm']; tempo = mido.bpm2tempo(bpm); spb = 60 / bpm
    tracks = {}; ev = []  # (time_s, msg)
    def note(ch, n, t0, dur, vel):
        ev.append((t0, mido.Message('note_on', channel=ch, note=int(n), velocity=int(max(1, min(127, vel))))));
        ev.append((t0 + dur, mido.Message('note_off', channel=ch, note=int(n), velocity=0)))
    progs = {0: 6, 1: 45, 2: 70, 3: 48, 4: 9, 5: 55, 6: 47, 7: 42}  # harpsichord, pizzicato, bassoon, strings, glockenspiel, orchestra hit, timpani, cello
    for ch, p in progs.items(): ev.append((0, mido.Message('program_change', channel=ch, program=p)))
    secs = plan['music']['sections']
    for si, sec in enumerate(secs):
        t0 = sec['t']; t1 = secs[si + 1]['t'] if si + 1 < len(secs) else LENGTH; e = sec.get('energy', 0.6); style = sec['style']; bar = 4 * spb
        if style == 'stinger':
            r, iv = chord_notes(sec['chords'][0]); [note(5, 48 + r + x, t0, 0.6, 110) for x in iv + [12]]; [note(6, 38 + r, t0 + k * 0.06, 0.1, 100 - k * 5) for k in range(10)]
            ev.append((t0, mido.Message('note_on', channel=9, note=49, velocity=110))); ev.append((t0 + 1, mido.Message('note_off', channel=9, note=49, velocity=0)))
            r2, iv2 = chord_notes(sec['chords'][-1]); [note(3, 50 + r2 + x, t0 + 0.4, max(0.3, t1 - t0 - 0.4), 50) for x in iv2]; continue
        b = 0; t = t0
        while t < t1 - 0.05:
            ch = sec['chords'][b % len(sec['chords'])]; r, iv = chord_notes(ch); base = 50 + r if r < 7 else 38 + r
            if style in ('baroque', 'ending'):
                arp = [base + 12 + iv[0], base + 12 + iv[1], base + 12 + iv[2], base + 24 + iv[0], base + 12 + iv[2], base + 12 + iv[1], base + 12 + iv[0], base + 12 + iv[1]]
                n16 = 8 if style == 'baroque' else 4; step = bar / 8 if style == 'baroque' else bar / 4
                for k in range(8 if style == 'baroque' else 4):
                    tk = t + k * step
                    if tk < t1: note(0, arp[k % 8], tk, step * 0.9, 62 + 18 * e + (10 if k % 4 == 0 else 0))
                for k in (0, 2):
                    if t + k * spb < t1: note(1, base - 12 + iv[0], t + k * spb, spb * 0.5, 80 + 20 * e)
                if e > 0.5:
                    for k in range(4):
                        if t + k * spb < t1: note(2, base - 12 + [iv[0], iv[1], iv[2], iv[1]][k], t + k * spb, spb * 0.85, 55 + 15 * e)
                    for k in range(4):
                        if t + (k + 0.5) * spb < t1: ev.append((t + (k + 0.5) * spb, mido.Message('note_on', channel=9, note=76 if k % 2 else 77, velocity=int(40 + 25 * e)))); ev.append((t + (k + 0.6) * spb, mido.Message('note_off', channel=9, note=76 if k % 2 else 77, velocity=0)))
                if style == 'ending' and t + bar >= t1 - 0.05:
                    [note(3, base + x, t, max(0.5, t1 - t + 1.5), 60) for x in iv]; note(4, base + 24 + iv[2], t + 0.1, 1.5, 70)
            elif style == 'sparse':
                note(1, base - 12 + iv[0], t, spb, 70); note(1, base + iv[2], t + 2 * spb, spb, 55); note(7, base - 12 + iv[0], t, bar * 0.98, 45)
                if b % 2 == 1: note(0, base + 12 + iv[1], t + 1.5 * spb, spb, 55)
            t += bar; b += 1
    ev.sort(key=lambda x: (x[0], 0 if x[1].type == 'note_off' else 1))
    tr = mido.MidiTrack(); mid.tracks.append(tr); tr.append(mido.MetaMessage('set_tempo', tempo=tempo)); last = 0
    for ts, m in ev: tick = int(round(ts / spb * 480)); m.time = max(0, tick - last); last = tick; tr.append(m)
    mid.save(path)
def render_midi(mpath, wpath):
    subprocess.check_call(['fluidsynth', '-ni', '-g', '0.8', '-r', str(SR), '-F', wpath, SF2, mpath], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def readwav(p):
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)
def writewav(p, x, ch=1):
    x = np.clip(x, -1, 1).astype(np.float32); subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ac', str(ch), '-ar', str(SR), '-i', '-', p], input=x.tobytes(), check=True)

N = int(LENGTH * SR)
tmp = tempfile.mkdtemp()
write_music(tmp + '/m.mid'); render_midi(tmp + '/m.mid', tmp + '/m.wav'); music = readwav(tmp + '/m.wav')[:N]; music = np.pad(music, (0, N - len(music)))
# orchestra hits as sound effects
hits = np.zeros(N)
for c in plan['cues']:
    if c['sfx'] != 'hit': continue
    m = mido.MidiFile(ticks_per_beat=480); tr = mido.MidiTrack(); m.tracks.append(tr); tr.append(mido.Message('program_change', channel=0, program=55))
    for n in (50, 57, 62): tr.append(mido.Message('note_on', channel=0, note=n, velocity=120, time=0))
    tr.append(mido.Message('note_off', channel=0, note=50, velocity=0, time=700)); m.save(tmp + '/h.mid'); render_midi(tmp + '/h.mid', tmp + '/h.wav'); h = readwav(tmp + '/h.wav'); s = int(c['t'] * SR); hits[s:s + len(h)] += h[:N - s] * c['vol']
fx = hits.copy(); cache = {}
for c in plan['cues']:
    if c['sfx'] == 'hit': continue
    key = (c['sfx'], c.get('dur')); x = sfx(c['sfx'], c.get('dur')) if c.get('dur') or key not in cache else cache[key]; cache[key] = x
    s = max(0, int(c['t'] * SR)); e = min(N, s + len(x)); fx[s:e] += x[:e - s] * c['vol']
vpath = D + 'voice-tight.wav' if os.path.exists(D + 'voice-tight.wav') else D + 'voice.mp3'
voice = readwav(vpath)[:N]; voice = np.pad(voice, (0, N - len(voice)))
# duck the music under the voice (smooth envelope of the voice)
ve = np.abs(voice); win = int(0.12 * SR); ve = np.convolve(ve, np.ones(win) / win, 'same'); ve = ve / (np.max(ve) or 1)
duck = 1 - 0.55 * np.clip(ve * 4, 0, 1); duck = np.convolve(duck, np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same')
music = norm(music, 1) * 0.38 * duck
fx = fx * 0.42
fade = np.ones(N); fl = int(1.2 * SR); fade[-fl:] = np.linspace(1, 0, fl)
mix = (voice * 0.95 + music + fx) * fade
writewav(D + 'music.wav', music); writewav(D + 'sfx.wav', fx); writewav(tmp + '/mix.wav', mix)
subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', tmp + '/mix.wav', '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', str(SR), '-ac', '2', D + 'soundtrack.wav'])
print('wrote soundtrack.wav,', round(LENGTH, 1), 's,', len(plan['cues']), 'sound cues')
