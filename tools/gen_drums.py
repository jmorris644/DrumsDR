#!/usr/bin/env python3
"""Render layered, acoustic-style drum samples with numpy -> WAV."""
import numpy as np, wave, struct, os

SR = 44100
os.makedirs("/tmp/drumwav", exist_ok=True)

def env(n, a, d, curve=4.0):
    """attack-decay exponential envelope, length n samples."""
    e = np.ones(n)
    at = max(1, int(a*SR))
    e[:at] = np.linspace(0, 1, at)
    t = np.arange(n)/SR
    e *= np.exp(-t*curve/ max(d,1e-4))
    return e

def noise(n):
    return np.random.uniform(-1, 1, n)

def sine(f, n, phase=0):
    return np.sin(2*np.pi*f*np.arange(n)/SR + phase)

def pitch_sweep(f0, f1, n, tau=0.03):
    t = np.arange(n)/SR
    f = f1 + (f0-f1)*np.exp(-t/tau)
    ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)

def norm(x, peak=0.97):
    m = np.max(np.abs(x))+1e-9
    return x/m*peak

def soft(x, k=1.6):
    return np.tanh(x*k)/np.tanh(k)

def kick():
    n = int(0.42*SR)
    body = pitch_sweep(120, 46, n, tau=0.035) * env(n, 0.001, 0.34, 3.2)
    sub  = sine(45, n) * env(n, 0.001, 0.30, 3.0)*0.7
    click = (noise(n)*env(n,0.0005,0.006,10)) * 0.5
    hi = sine(1400, n)*env(n,0.0005,0.004,12)*0.3   # beater tick
    x = soft(body*0.9 + sub + click*0.4 + hi, 1.7)
    return norm(x, 0.99)

def snare():
    n = int(0.24*SR)
    t1 = sine(190, n)*env(n,0.0006,0.12,4.2)
    t2 = sine(285, n)*env(n,0.0006,0.10,4.8)*0.7
    body = (t1+t2)*0.95
    nz = noise(n)
    heavy = np.convolve(nz, np.ones(14)/14, mode='same')   # low-freq content
    hp = nz - heavy                                         # bright highpass
    wires = np.convolve(hp, np.ones(3)/3, mode='same')      # tame the extreme top
    wires *= env(n,0.0006,0.15,4.0)
    thud = np.convolve(nz, np.ones(30)/30, mode='same') * env(n,0.0006,0.06,5)*0.6
    x = soft(body + wires*0.8 + thud, 1.25)
    return norm(x, 0.95)

def tom(base=150):
    n = int(0.38*SR)
    b = pitch_sweep(base*1.4, base, n, tau=0.05) * env(n,0.0008,0.32,3.2)
    h = sine(base*2.0, n)*env(n,0.0008,0.18,4)*0.3
    at = noise(n)*env(n,0.0006,0.01,10)*0.25
    x = soft(b + h + at, 1.3)
    return norm(x, 0.95)

def _metallic(n, partials, decay, atk=0.0006):
    x = np.zeros(n)
    for f, a in partials:
        x += a*sine(f, n)
    x *= env(n, atk, decay, 3.2)
    return x

def closed_hat():
    n = int(0.09*SR)
    nz = noise(n)
    smooth = np.convolve(nz, np.ones(3)/3, mode='same')
    hp = (nz - smooth)
    met = _metallic(n, [(6100,.4),(8300,.5),(10500,.4),(12700,.3)], 0.03)
    x = (hp*0.8 + met*0.5) * env(n,0.0004,0.028,3.0)
    return norm(x, 0.85)

def ride():
    n = int(0.75*SR)
    # inharmonic bell partials + a clear ping attack + shimmer wash
    bell = _metallic(n, [(410,.55),(820,.4),(1230,.3),(1900,.25),(2700,.18),(3600,.14)], 0.6, atk=0.001)
    ping = sine(820, n)*env(n,0.0006,0.09,5)*0.4
    nz = noise(n)
    smooth = np.convolve(nz, np.ones(3)/3, mode='same')
    wash = (nz-smooth) * env(n,0.003,0.55,2.0) * 0.28
    x = bell*0.7 + ping + wash
    return norm(x, 0.9)

def crash():
    n = int(1.15*SR)
    nz = noise(n)
    smooth = np.convolve(nz, np.ones(3)/3, mode='same')
    hp = (nz - smooth)
    shimmer = _metallic(n, [(3400,.2),(5200,.2),(7100,.15),(9600,.12)], 0.9)
    x = (hp*0.9 + shimmer*0.4) * env(n,0.001,0.85,1.8)
    # a touch of attack punch
    x[:int(0.01*SR)] *= np.linspace(1.6,1,int(0.01*SR))
    return norm(x, 0.95)

def write_wav(name, data):
    data = np.clip(data, -1, 1)
    pcm = (data*32767).astype(np.int16)
    with wave.open(f"/tmp/drumwav/{name}.wav","wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return len(pcm)

np.random.seed(7)
samples = {
    "kick": kick(), "snare": snare(), "tom": tom(150),
    "hat": closed_hat(), "ride": ride(), "crash": crash(),
}
for k,v in samples.items():
    ln = write_wav(k, v)
    print(f"{k:6s} {ln/SR*1000:6.0f} ms")
print("done")
