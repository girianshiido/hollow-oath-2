"""Compose and render the original Hollow Oath 2 score and sound effects.

Python 3 + numpy, FluidSynth and ffmpeg. No samples from the first game.
Usage: python3 scripts/compose-audio.py [--scores-only] [--force]
Set HO2_SOUNDFONT to another General MIDI .sf2 bank if desired.
Intermediate WAVs stay in the operating system temporary directory.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio"
SCORES = ROOT / "music"
WORK = Path(tempfile.gettempdir()) / "hollow-oath-2-audio"
FONT = Path(os.environ.get("HO2_SOUNDFONT", ROOT.parent / "science-fantasy-jrpg/soundfonts/MuseScore_General_HQ.sf2"))
SR = 44100
PPQ = 480

# Diatonic pitch classes. The melody's first four notes recur as an oath motif.
MINOR = [0, 2, 3, 5, 7, 8, 10]
MAJOR = [0, 2, 4, 5, 7, 9, 11]

TRACKS = [
    dict(id="title", title="An Open Gate", bpm=92, bars=32, tonic=52, major=False,
         progression=[0, 5, 2, 6, 0, 3, 5, 4], lead=73, answer=68, style="title"),
    dict(id="camp", title="A Fire for Two", bpm=84, bars=24, tonic=55, major=True,
         progression=[0, 4, 5, 2, 3, 0, 1, 4], lead=71, answer=73, style="camp"),
    dict(id="battle-1", title="The Briar Road", bpm=138, bars=48, tonic=52, major=False,
         progression=[0, 5, 2, 6, 3, 0, 5, 4], lead=73, answer=68, style="battle"),
    dict(id="battle-2", title="Brass and Undertow", bpm=144, bars=48, tonic=50, major=False,
         progression=[0, 3, 6, 2, 5, 3, 1, 4], lead=68, answer=71, style="dance"),
    dict(id="battle-3", title="Across the Violet Sky", bpm=152, bars=48, tonic=57, major=False,
         progression=[0, 6, 5, 4, 3, 5, 1, 4], lead=80, answer=73, style="sky"),
    dict(id="boss", title="The Guardian Wakes", bpm=160, bars=48, tonic=50, major=False,
         progression=[0, 0, 5, 3, 6, 5, 1, 4], lead=60, answer=48, style="boss"),
    dict(id="final", title="Two Against the Eclipse", bpm=168, bars=48, tonic=52, major=False,
         progression=[0, 5, 3, 6, 0, 2, 1, 4], lead=60, answer=48, style="final"),
    dict(id="bonus", title="Lanterns Below", bpm=128, bars=48, tonic=54, major=False,
         progression=[0, 3, 5, 1, 0, 6, 5, 4], lead=11, answer=71, style="bonus"),
]


def vlq(n: int) -> bytes:
    out = [n & 127]
    n >>= 7
    while n:
        out.insert(0, (n & 127) | 128)
        n >>= 7
    return bytes(out)


def chunk(tag: bytes, data: bytes) -> bytes:
    return tag + struct.pack(">I", len(data)) + data


def midi(parts: dict, configs: list, bpm: int, beats: float) -> bytes:
    tracks = []
    for name, channel, program, volume, pan in configs:
        events = [(0, b"\xff\x03" + vlq(len(name)) + name.encode()),
                  (0, bytes([0xC0 | channel, program])),
                  (0, bytes([0xB0 | channel, 7, volume])),
                  (0, bytes([0xB0 | channel, 10, pan])),
                  (0, bytes([0xB0 | channel, 91, 24])),
                  (0, bytes([0xB0 | channel, 93, 0]))]
        occupied = {}
        for beat, duration, pitch, velocity in sorted(parts[name]):
            start, end = round(beat * PPQ), round((beat + duration) * PPQ)
            assert 0 <= pitch <= 127 and end > start
            assert start >= occupied.get(pitch, -1), (name, beat, pitch)
            occupied[pitch] = end
            events.extend([(start, bytes([0x90 | channel, pitch, velocity])),
                           (end, bytes([0x80 | channel, pitch, 0]))])
        events.sort(key=lambda e: (e[0], 0 if e[1][0] & 0xF0 == 0x80 else 1))
        data = bytearray()
        last = 0
        for tick, msg in events:
            data.extend(vlq(tick - last))
            data.extend(msg)
            last = tick
        data.extend(vlq(max(0, round(beats * PPQ) - last)) + b"\xff\x2f\x00")
        tracks.append(chunk(b"MTrk", bytes(data)))
    tempo = round(60_000_000 / bpm)
    meta = b"\x00\xff\x51\x03" + tempo.to_bytes(3, "big") + b"\x00\xff\x58\x04\x04\x02\x18\x08\x00\xff\x2f\x00"
    return b"MThd" + struct.pack(">IHHH", 6, 1, len(tracks) + 1, PPQ) + chunk(b"MTrk", meta) + b"".join(tracks)


# Position, duration, diatonic degree relative to the current chord's root.
# Eight distinct bars make a phrase; a contrasting bridge uses different cells.
PHRASE = [
    [(0, .65, 4), (.75, .2, 3), (1, .7, 2), (2, .45, 4), (2.5, .95, 6), (3.5, .35, 4)],
    [(0, 1.35, 4), (1.5, .4, 2), (2, .9, 0), (3, .4, 1), (3.5, .35, 2)],
    [(0, .9, 2), (1, .4, 4), (1.5, .4, 5), (2, 1.35, 6), (3.5, .35, 4)],
    [(0, 1.4, 3), (1.5, .35, 2), (2, .7, 1), (2.75, .2, -1), (3, .85, 0)],
    [(.25, .4, 0), (.75, .65, 2), (1.5, .4, 4), (2, .9, 6), (3, .85, 5)],
    [(0, .9, 4), (1, .4, 3), (1.5, .4, 2), (2, .9, 0), (3, .85, 2)],
    [(0, .65, 2), (.75, .2, 4), (1, .9, 6), (2, .4, 7), (2.5, .4, 6), (3, .85, 4)],
    [(0, 1.4, 2), (1.5, .4, 1), (2, .9, 0), (3, .85, 4)],
]
BRIDGE = [
    [(.5, .9, 2), (1.5, .4, 4), (2, 1.7, 6)],
    [(0, .9, 5), (1, .9, 4), (2.5, 1.25, 2)],
    [(0, 1.4, 4), (1.5, .4, 3), (2, .9, 2), (3, .85, 0)],
    [(.5, 1.35, 1), (2, 1.7, 4)],
    [(0, .9, 0), (1.5, .4, 2), (2, 1.7, 4)],
    [(0, .65, 6), (.75, .2, 5), (1, .9, 4), (2.5, 1.2, 2)],
    [(0, .9, 2), (1, .9, 4), (2, .9, 5), (3, .85, 6)],
    [(0, 1.4, 5), (1.5, .4, 4), (2, 1.7, 2)],
]


def compose(spec: dict, repetitions: int = 1) -> tuple[bytes, dict]:
    style = spec["style"]
    slow = style in ("title", "camp")
    urgent = style in ("boss", "final")
    scale = MAJOR if spec["major"] else MINOR
    tonic = spec["tonic"]

    def pitch(degree: int, octave: int = 0) -> int:
        q, r = divmod(degree, 7)
        return tonic + scale[r] + q * 12 + octave * 12

    names = ["Theme", "Answer", "Harp", "Strings", "Bass", "Pulse", "Bell", "Drums", "Timpani"]
    parts = {name: [] for name in names}

    def note(name, beat, duration, key, velocity):
        parts[name].append((beat, duration, int(key), int(velocity)))

    for bar in range(spec["bars"] * repetitions):
        local = bar % spec["bars"]
        beat = bar * 4
        phrase_bar = local % 8
        section = local // 8
        bridge = section in ([2] if spec["bars"] <= 32 else [2, 3])
        rise = section >= (3 if spec["bars"] <= 32 else 4)
        degree = spec["progression"][phrase_bar]
        if bridge:
            degree = [3, 5, 0, 4, 1, 3, 5, 4][phrase_bar]
        chord = [pitch(degree + n) for n in (0, 2, 4)]

        # Sustain harmony in middle register; no huge stacked orchestral wall.
        for key in chord:
            note("Strings", beat + .025, 3.88, key, (42 if slow else 45) + (6 if rise else 0) - (7 if bridge else 0))

        # Harp/guitar voice changes its shape between sections.
        arp = [0, 2, 4, 7, 4, 2, 4, 2] if not bridge else [4, 2, 0, 2, 4, 7, 4, 2]
        for j, d in enumerate(arp):
            if style == "camp" and j in (3, 7):
                continue
            note("Harp", beat + j * .5, .43 if slow else .29, pitch(degree + d, 0 if slow else 1), 43 + (j % 3) * 3)

        bass_steps = [(0, 1.8), (2, 1.8)] if slow else [(0, .65), (.75, .2), (1, .7), (2, .65), (2.75, .2), (3, .7)]
        for idx, (offset, dur) in enumerate(bass_steps):
            d = degree + (4 if idx % 3 == 2 else 0)
            note("Bass", beat + offset, dur, pitch(d, -1), 60 if slow else 73)

        # The main tune breathes. The B section changes melody and instrument.
        melody = BRIDGE[phrase_bar] if bridge else PHRASE[phrase_bar]
        part = "Answer" if bridge else "Theme"
        for off, dur, d in melody:
            octave = 1 if slow or not urgent else 0
            if style == "sky":
                octave = 1
            note(part, beat + off, dur, pitch(degree + d, octave), (72 if slow else 85) + (5 if rise else 0))
        if rise and not slow:
            # A spare counterline instead of doubling every melody note.
            for off, d in [(0, 2), (2, 4)]:
                note("Answer", beat + off + .07, 1.65, pitch(degree + d, 1), 53)
        elif not bridge and phrase_bar in (1, 3, 5, 7):
            note("Answer", beat + 3, .8, pitch(degree + 2, 1), 48)

        if not slow:
            pulse = [.0, .5, 1.5, 2, 2.5, 3.5] if style == "dance" else [0, .5, 1, 1.5, 2, 2.5, 3, 3.5]
            for j, off in enumerate(pulse):
                if bridge and j % 2:
                    continue
                note("Pulse", beat + off, .20, pitch(degree + (0 if j % 2 == 0 else 4)), 43 if bridge else 57)

        if local % 4 == 0:
            note("Bell", beat + (1.5 if style == "bonus" else 0), 1.8, pitch(degree + 4, 2), 37 if slow else 40)
        if slow:
            if style == "title" and section >= 2:
                note("Drums", beat, .2, 36, 35)
                note("Drums", beat + 2, .12, 54, 30)
        else:
            for off in ([0, 1.5, 2.5] if style == "dance" else [0, 2]):
                note("Drums", beat + off, .16, 36, 62 if urgent else 50)
            for off in [1, 3]:
                note("Drums", beat + off, .14, 38 if urgent else 37, 45 if bridge else 57)
            for j in range(8):
                note("Drums", beat + j * .5, .09, 42 if urgent else 51, 22 + j % 2 * 7)
            if phrase_bar == 0:
                note("Drums", beat, .3, 49, 35 if bridge else 46)
            if urgent:
                note("Timpani", beat, .7, pitch(degree, -1), 67)
                note("Timpani", beat + 2, .7, pitch(degree, -1), 53)
            if phrase_bar == 7:
                for j, key in enumerate([47, 45, 43, 41]):
                    note("Drums", beat + 3 + j * .25, .12, key, 37 + j * 4)

    configs = [
        ("Theme", 0, spec["lead"], 100, 61),
        ("Answer", 1, spec["answer"], 83, 78),
        ("Harp", 2, 24 if style == "camp" else 46, 77, 43),
        ("Strings", 3, 48 if urgent else 49, 78, 65),
        ("Bass", 4, 42 if urgent else 43, 91, 55),
        ("Pulse", 5, 45 if urgent else 24, 76, 80),
        ("Bell", 6, 10 if style == "bonus" else 14, 63, 89),
        ("Drums", 9, 0, 82 if urgent else 72, 64),
        ("Timpani", 7, 47, 75, 50),
    ]
    tempo = round(60_000_000 / spec["bpm"])
    duration = spec["bars"] * 4 * tempo / 1_000_000
    return midi(parts, configs, spec["bpm"], spec["bars"] * 4 * repetitions), dict(
        title=spec["title"], bpm=spec["bpm"], bars=spec["bars"], duration=duration,
        loop=True, loopStart=0, loopEnd=duration,
        notes=sum(len(p) for p in parts.values()) // repetitions,
        instruments=9, samePitchOverlaps=0,
    )


def stinger(victory: bool) -> tuple[bytes, dict]:
    bpm = 116 if victory else 76
    root = 55 if victory else 52
    chord_notes = [0, 4, 7, 12] if victory else [0, 3, 7, 12]
    parts = {"Melody": [], "Harmony": [], "Harp": [], "Drums": []}
    tune = [(0, .35, 7), (.5, .35, 12), (1, .65, 16), (2, .35, 14), (2.5, .35, 16), (3, 2.8, 19)] if victory else [(0, 1.1, 12), (1.5, 1.1, 10), (3, 1.1, 7), (4.5, 2.4, 3)]
    for beat, dur, key in tune:
        parts["Melody"].append((beat, dur, root + key, 83 if victory else 62))
    for d in chord_notes:
        parts["Harmony"].append((0, 7.3, root + d - 12, 48))
    for j in range(12 if victory else 8):
        parts["Harp"].append((j * .5, .43, root + chord_notes[j % 4], 44))
    if victory:
        parts["Drums"].append((0, .3, 49, 46))
        parts["Drums"].append((3, .3, 36, 45))
    configs = [("Melody", 0, 60 if victory else 71, 98, 64),
               ("Harmony", 1, 48, 76, 64), ("Harp", 2, 46, 75, 44),
               ("Drums", 9, 0, 70, 64)]
    duration = 8 * round(60_000_000 / bpm) / 1_000_000 + 2.5
    return midi(parts, configs, bpm, 8), dict(
        title="A Promise Kept" if victory else "Embers Remain", bpm=bpm,
        duration=duration, loop=False, notes=sum(map(len, parts.values())), samePitchOverlaps=0,
    )


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as f:
        assert f.getframerate() == SR and f.getnchannels() == 2 and f.getsampwidth() == 2
        return np.frombuffer(f.readframes(f.getnframes()), dtype="<i2").reshape(-1, 2).astype(np.float64) / 32768


def write_wav(path: Path, samples: np.ndarray):
    assert np.isfinite(samples).all()
    assert abs(samples).max() < .999
    with wave.open(str(path), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(np.round(samples * 32767).astype("<i2").tobytes())


def encode(path: Path, stem: str):
    ffmpeg = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
    for ext, args in [("ogg", ["-c:a", "libvorbis", "-q:a", "3"]),
                      ("m4a", ["-c:a", "aac", "-b:a", "112k"] )]:
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(path),
                        *args, "-ar", str(SR), "-y", str(OUT / f"{stem}.{ext}")], check=True)


def render_score(stem: str, score: bytes, info: dict) -> dict:
    mid = WORK / f"{stem}-render.mid"
    raw = WORK / f"{stem}-raw.wav"
    mid.write_bytes(score)
    subprocess.run([shutil.which("fluidsynth") or "/opt/homebrew/bin/fluidsynth", "-ni", "-g", ".34",
                    "-o", "synth.reverb.active=1", "-o", "synth.chorus.active=0",
                    "-F", str(raw), "-r", str(SR), str(FONT), str(mid)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    samples = read_wav(raw)
    if info["loop"]:
        length = round(info["duration"] * SR)
        # Middle pass includes the preceding phrase's natural instrument releases.
        start = length
        assert len(samples) >= start + length
        master = samples[start:start + length].copy()
        seam = round(.025 * SR)
        ramp = np.linspace(0, 1, seam)[:, None]
        master[-seam:] = master[-seam:] * (1 - ramp) + samples[start-seam:start] * ramp
    else:
        master = samples[:round(info["duration"] * SR)].copy()
        master[:256] *= np.linspace(0, 1, 256)[:, None]
        fade = min(round(.6 * SR), len(master))
        master[-fade:] *= np.linspace(1, 0, fade)[:, None]
    # Restrained mastering. Compression only catches unusually loud ensemble peaks.
    rms = float(np.sqrt(np.mean(master ** 2)))
    gain = min(.17 / max(rms, 1e-8), .84 / max(float(abs(master).max()), 1e-8))
    master *= gain
    path = WORK / f"{stem}-master.wav"
    write_wav(path, master)
    encode(path, stem)
    return {**info, "duration":len(master) / SR, "peakDb":float(20 * np.log10(abs(master).max())),
            "rmsDb":float(20 * np.log10(np.sqrt(np.mean(master ** 2)))),
            "loopSeamJump":float(abs(master[-1] - master[0]).max()) if info["loop"] else None,
            "files":{ext:f"audio/{stem}.{ext}" for ext in ("ogg", "m4a")}}


def make_effect(kind: str) -> np.ndarray:
    durations = dict(steel=.24, fire=.50, ice=.56, heal=.72, guard=.52, reward=.85, select=.09, hit=.19, storm=.46)
    t = np.arange(round(durations[kind] * SR)) / SR
    rng = np.random.default_rng(947 + list(durations).index(kind))
    noise = rng.normal(0, 1, len(t))
    smooth = np.convolve(noise, np.ones(12) / 12, mode="same")
    envelope = np.minimum(1, t / .006) * (1 - t / durations[kind]) ** 2
    if kind == "steel":
        x = (.32 * noise * np.exp(-t * 35) + .19 * np.sin(2*np.pi*(1350*t-550*t*t)) * np.exp(-t*15)) * envelope
    elif kind == "hit":
        x = (.25 * smooth + .3 * np.sin(2*np.pi*(120*t-95*t*t))) * np.exp(-t*23) * envelope
    elif kind == "fire":
        x = (.35*smooth + .09*np.sin(2*np.pi*(190*t+350*t*t))) * np.sin(np.pi*t/durations[kind]) * envelope
    elif kind == "ice":
        x = sum(.075*np.sin(2*np.pi*f*t)*np.exp(-t*(6+i)) for i,f in enumerate([1568,2093,2637,3136])) * envelope + .045*noise*np.exp(-t*23)*envelope
    elif kind == "heal":
        x = np.zeros_like(t)
        for j,f in enumerate([659.25,783.99,987.77]):
            s = np.maximum(0,t-j*.10)
            x += .12*np.sin(2*np.pi*f*s)*(t>=j*.10)*np.minimum(1,s/.012)*np.exp(-s*5)
        x *= envelope
    elif kind == "guard":
        x = sum(.09*np.sin(2*np.pi*f*t) for f in [261.63,392,523.25]) * np.sin(np.pi*t/durations[kind]) * envelope
    elif kind == "reward":
        x = np.zeros_like(t)
        for j,f in enumerate([523.25,659.25,783.99,1046.5]):
            s = np.maximum(0,t-j*.11)
            x += .13*np.sin(2*np.pi*f*s)*(t>=j*.11)*np.minimum(1,s/.005)*np.exp(-s*8)
        x *= envelope
    elif kind == "storm":
        x = (.13*noise*np.exp(-t*10)+.18*np.sin(2*np.pi*(90*t+220*t*t))*np.exp(-t*7))*envelope
    else:
        x = .16*np.sin(2*np.pi*880*t)*envelope
    # Slight stereo width without changing onset or creating a hard tail.
    stereo = np.column_stack([x, .95*x + .05*np.roll(x, 83)])
    stereo[-128:] *= np.linspace(1,0,128)[:,None]
    target = .34 if kind in ("steel", "storm", "hit") else .27
    stereo *= target / max(float(abs(stereo).max()), 1e-8)
    return stereo


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scores-only", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    for directory in (OUT, SCORES, WORK):
        directory.mkdir(parents=True, exist_ok=True)
    manifest_path = SCORES / "audio-manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for spec in TRACKS:
        stem = "music-" + spec["id"]
        score, info = compose(spec)
        (SCORES / f"{stem}.mid").write_bytes(score)
        if args.scores_only:
            manifest[stem] = info
        elif args.force or not all((OUT / f"{stem}.{ext}").exists() for ext in ("ogg", "m4a")):
            print("Rendering", stem, flush=True)
            extended, _ = compose(spec, 3)
            manifest[stem] = render_score(stem, extended, info)
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    for victory in [True, False]:
        stem = "music-victory" if victory else "music-defeat"
        score, info = stinger(victory)
        (SCORES / f"{stem}.mid").write_bytes(score)
        if args.scores_only:
            manifest[stem] = info
        elif args.force or not all((OUT / f"{stem}.{ext}").exists() for ext in ("ogg", "m4a")):
            print("Rendering", stem, flush=True)
            manifest[stem] = render_score(stem, score, {**info, "loop":False})
    if not args.scores_only:
        for kind in ["steel", "fire", "ice", "heal", "guard", "reward", "select", "hit", "storm"]:
            stem = "sfx-" + kind
            samples = make_effect(kind)
            path = WORK / f"{stem}.wav"
            write_wav(path, samples)
            encode(path, stem)
            manifest[stem] = dict(duration=len(samples)/SR, loop=False,
                peakDb=float(20*np.log10(abs(samples).max())),
                files={ext:f"audio/{stem}.{ext}" for ext in ("ogg", "m4a")})
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({key:{k:info[k] for k in ["duration", "loop", "peakDb"] if k in info} for key,info in manifest.items()}, indent=2))


if __name__ == "__main__":
    main()
