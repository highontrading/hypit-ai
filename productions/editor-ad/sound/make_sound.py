"""Synthesize the ad's sound design and music bed from scratch (numpy only).

Every cue time below matches a beat in packages/viibe-ad/scene/scene.js.
Run: python3 productions/editor-ad/sound/make_sound.py
Writes productions/editor-ad/assets/sound.wav (48 kHz stereo, 11.9 s).
"""
import wave
from pathlib import Path

import numpy as np

SR = 48000
DUR = 11.9
N = int(SR * DUR)
rng = np.random.default_rng(7)
mix = np.zeros((N, 2))


def add(sig, t0, gain=1.0, pan=0.0):
    """Mix a mono or stereo signal at t0 seconds; pan in [-1, 1]."""
    i = int(t0 * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * left * 1.414, sig * right * 1.414], axis=1)
    if i < 0:
        sig, i = sig[-i:], 0
    n = min(len(sig), N - i)
    mix[i:i + n] += sig[:n] * gain


def svf(x, cutoff, q=0.7, mode="bp"):
    """State-variable filter with a per-sample cutoff array (Hz)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    f = 2 * np.sin(np.pi * np.clip(cutoff, 20, SR / 6) / SR)
    low = band = 0.0
    out = np.empty_like(x)
    damp = 1 / q
    for i in range(len(x)):
        low += f[i] * band
        high = x[i] - low - damp * band
        band += f[i] * high
        out[i] = band if mode == "bp" else low if mode == "lp" else high
    return out


def env(n, attack, release_shape=3.0):
    t = np.linspace(0, 1, n)
    a = max(attack, 1e-4)
    return np.where(t < a, (t / a) ** 2, (1 - (t - a) / (1 - a)) ** release_shape)


def whoosh(dur=0.35, f0=400, f1=3500, attack=0.7, q=1.2):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    sweep = np.geomspace(f0, f1, n)
    sig = svf(noise, sweep, q) * env(n, attack, 2.0)
    return sig / (np.abs(sig).max() + 1e-9)


def stereo_whoosh(dur, f0, f1, pan_from, pan_to, attack=0.7):
    mono = whoosh(dur, f0, f1, attack)
    p = np.linspace(pan_from, pan_to, len(mono))
    return np.stack([mono * np.cos((p + 1) * np.pi / 4), mono * np.sin((p + 1) * np.pi / 4)], axis=1) * 1.414


def click(freq=2200, dur=0.03, noise=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t * 180) + noise * rng.standard_normal(n) * np.exp(-t * 900)
    return s / np.abs(s).max()


def pop(f_hi=900, f_lo=220, dur=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 45)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)
    return s + 0.3 * click(3000, dur)


def impact(dur=1.2, depth=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 42 + 110 * np.exp(-t * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    crack = svf(rng.standard_normal(n), 1800, 0.6, "lp") * np.exp(-t * 22)
    tail = svf(rng.standard_normal(n), np.geomspace(3000, 400, n), 0.8, "lp") * np.exp(-t * 6) * 0.35
    s = sub * depth + 0.6 * crack / (np.abs(crack).max() + 1e-9) + tail / (np.abs(tail).max() + 1e-9) * 0.4
    return s / np.abs(s).max()


def glitch(dur=0.14):
    n = int(dur * SR)
    t = np.arange(n) / SR
    freqs = rng.choice([880, 1320, 1760, 2640, 660], size=8)
    seg = n // 8
    s = np.concatenate([np.sign(np.sin(2 * np.pi * f * t[:seg])) for f in freqs])
    s = np.round(s * 3) / 3 * (rng.random(len(s)) > 0.08)
    return np.pad(s, (0, n - len(s))) * np.exp(-t * 6) * 0.5


def chime():
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k, (f, dt) in enumerate([(1318.5, 0.0), (1760.0, 0.07), (2637.0, 0.14), (3520.0, 0.21)]):
        d = np.clip(t - dt, 0, None)
        s += (t >= dt) * np.sin(2 * np.pi * f * d) * np.exp(-d * (3.2 + k)) * (0.9 - 0.15 * k)
        s += (t >= dt) * 0.25 * np.sin(2 * np.pi * f * 2.01 * d) * np.exp(-d * 6)
    return s / np.abs(s).max()


def riser(dur, f0=200, f1=2400):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    sig = svf(noise, np.geomspace(f0, f1, n), 2.5) * np.linspace(0, 1, n) ** 2.5
    return sig / (np.abs(sig).max() + 1e-9)


# ---------------- music bed ----------------
def note_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pluck(m, dur=0.45, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = note_hz(m)
    s = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * (7 + 5 * h)) / h ** (1.6 - 0.4 * bright) for h in (1, 2, 3, 4))
    return s * np.minimum(1, t * 400)


def pad(notes, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        for detune in (-0.12, 0.0, 0.12):
            ph = 2 * np.pi * note_hz(m + detune) * t
            s += np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    fade = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.12)
    return s * fade / (len(notes) * 3)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 48 + 120 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def hat():
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return svf(rng.standard_normal(n), 8000, 0.8, "hp") * np.exp(-t * 70)


# Act 1 (dark): low drone + tension riser into the brand reveal.
n = int(4.15 * SR)
t = np.arange(n) / SR
drone = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.4 * t) + 0.25 * np.sin(2 * np.pi * 110.3 * t)) * np.minimum(1, t / 0.4)
drone *= np.minimum(1, (4.15 - t) / 0.05) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * t))
add(drone * 0.16, 0.0)
add(riser(1.2, 300, 3000) * 0.22, 2.15)
add(riser(0.5, 500, 5000) * 0.18, 3.5)

# Act 2+ (light): 120 BPM groove; chords change every 2 beats. Silence gap 7.08–7.3 as in the reference.
BEAT = 0.5
start = 4.15
chords = [[53, 57, 60, 64], [55, 59, 62, 64], [57, 60, 64, 67], [48, 55, 59, 64]]  # Fmaj7 G6 Am7 Cmaj7
arp = [0, 2, 1, 3, 2, 1, 3, 2]
beat_t = start
bar = 0
while beat_t < 11.3:
    chord = chords[bar % 4]
    gap = 7.08 <= beat_t < 7.3
    if not gap:
        add(pad(chord, 2 * BEAT) * 0.11, beat_t)
        add(np.sin(2 * np.pi * note_hz(chord[0] - 12) * np.arange(int(SR * 0.9)) / SR) * np.exp(-np.arange(int(SR * 0.9)) / SR * 3) * 0.16, beat_t)
    for k in range(4):  # 8th-note arpeggio over 2 beats
        tt = beat_t + k * BEAT / 2
        if tt >= 11.3 or 7.08 <= tt < 7.3:
            continue
        add(pluck(chord[arp[(bar * 4 + k) % 8]] + 12, 0.4) * 0.11, tt, pan=0.35 if k % 2 else -0.35)
    for k in range(2):
        tt = beat_t + k * BEAT
        if tt < 11.0 and not (7.08 <= tt < 7.3):
            add(kick() * 0.32, tt)
            add(hat() * 0.06, tt + BEAT / 2, pan=0.2)
    beat_t += 2 * BEAT
    bar += 1

# ---------------- sound design cues (scene beats) ----------------
W = lambda t0, dur, f0, f1, g, p0=-0.6, p1=0.6, a=0.7: add(stereo_whoosh(dur, f0, f1, p0, p1, a), t0 - dur * a, g)
W(0.18, 0.3, 300, 4000, 0.55, -0.9, 0.3)        # streak "Still looking"
W(0.34, 0.2, 600, 3000, 0.3, 0.3, -0.2)          # for an
for i in range(6):                                 # editor letters
    add(click(1600 + 220 * i, 0.03, 0.4), 0.42 + i * 0.045, 0.12, pan=-0.4 + 0.16 * i)
add(glitch(0.16), 0.72, 0.28)
W(1.0, 0.18, 800, 2500, 0.25)                     # laptop swap
add(pop(1100, 300), 1.0, 0.25)
W(1.45, 0.4, 2500, 300, 0.4, 0.4, -0.4, 0.5)       # dissolve
add(pop(1300, 420), 1.43, 0.3)                     # instagram icon
W(1.95, 0.25, 500, 2200, 0.22, -0.5, 0.5)          # search bar unroll
for i in range(len("Where can I get an editor")):  # typing
    add(click(2600 + rng.integers(-400, 400), 0.02, 0.8), 2.36 + i * 0.027, 0.09 + 0.03 * rng.random(), pan=rng.uniform(-0.2, 0.2))
W(3.3, 0.3, 400, 3500, 0.4, -0.7, 0.7)            # tap sweep
add(impact(1.0, 0.8), 3.34, 0.55)                 # brand reveal
add(pop(1400, 500), 3.4, 0.2)                     # arrow button
add(pop(900, 350, 0.1), 3.62, 0.12, pan=-0.3)     # flames
add(pop(1000, 380, 0.1), 3.68, 0.12, pan=0.3)
W(4.12, 0.32, 300, 5000, 0.75, -0.6, 0.9)         # rubber bend + whip
W(4.3, 0.22, 900, 3000, 0.35, -0.8, 0.0)          # Look
add(pop(800, 250), 4.25, 0.28, pan=-0.3)          # sleepy face
add(pop(950, 300), 4.36, 0.28, pan=0.3)           # fire
W(4.46, 0.15, 900, 3000, 0.25, 0.6, 0.1)          # no
add(glitch(0.3), 4.52, 0.24)
W(4.97, 0.16, 900, 3500, 0.3, 0.8, 0.0)           # further
W(5.2, 0.3, 3500, 400, 0.45, 0.0, 0.0, 0.4)       # scatter
W(5.47, 0.25, 600, 3000, 0.4)                     # cards fan in
add(click(1800, 0.04, 0.7), 5.72, 0.35)           # grab
W(5.95, 0.2, 2500, 600, 0.3, 0.0, 0.0, 0.5)       # squeeze into icon
add(pop(1200, 400), 5.9, 0.25)
W(6.2, 0.25, 400, 5000, 0.55, -0.2, 0.95)         # icon whips right
W(6.35, 0.22, 700, 3000, 0.35, -0.6, 0.4)         # Just drop your clips
W(7.05, 0.22, 3000, 600, 0.3, 0.0, 0.0, 0.5)      # words blur out
add(pop(1500, 500, 0.1), 7.24, 0.3)               # + button
W(7.84, 0.22, 500, 2500, 0.3, -0.3, 0.3)          # stretch into Vibe Edit
W(8.3, 0.4, 300, 2500, 0.35, -0.8, 0.0)           # cursor flies in
add(click(2400, 0.04, 0.9), 8.52, 0.6)            # CLICK
add(pop(1600, 700, 0.15), 8.58, 0.3)              # Editing
W(9.05, 0.3, 4000, 300, 0.5, 0.0, 0.0, 0.6)       # app screen falls
add(impact(1.4, 1.0), 9.12, 0.75)                 # app screen lands
W(9.82, 0.25, 600, 3500, 0.4, 0.9, -0.1)          # panel slides in
W(10.48, 0.25, 2500, 400, 0.3, 0.0, 0.0, 0.5)     # app drops away
W(10.86, 0.22, 600, 4500, 0.35, 0.0, 0.0)         # panel blurs out
add(chime(), 11.02, 0.5)                          # Edit Completed
add(pop(1300, 600, 0.12), 11.02, 0.2)

# ---------------- master ----------------
fade = np.ones(N)
k = int(0.5 * SR)
fade[-k:] = np.linspace(1, 0, k) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix *= 0.89 / np.abs(mix).max()

out = Path(__file__).resolve().parents[1] / "assets" / "sound.wav"
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print(out)
