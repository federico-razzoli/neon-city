#!/usr/bin/env python3
"""Rebuild the bundled child event WAV. Requires the espeak-ng executable."""
import array
import math
from pathlib import Path
import subprocess
import tempfile
import wave

rate = 22050
voice = []
with tempfile.TemporaryDirectory(prefix='cubicle-knock-') as directory:
    for name, text, speed in [('mom', 'Mom?', 135), ('see', "I can't see you.", 135), ('where', '<speak><prosody rate="160%">Where</prosody> <prosody rate="75%">are you?</prosody></speak>', 128)]:
        path = Path(directory) / f'{name}.wav'
        subprocess.run(['espeak-ng', '-m', '-v', 'en-us+f4', '-p', '78', '-s', str(speed), '-a', '140', '-w', str(path), text], check=True)
        with wave.open(str(path)) as audio:
            assert audio.getframerate() == rate
            samples = array.array('h', audio.readframes(audio.getnframes()))
        active = [i for i, sample in enumerate(samples) if abs(sample) > 100]
        voice.extend(sample / 32768 for sample in samples[max(0, active[0] - 220):min(len(samples), active[-1] + 660)])
        voice.extend([0.0] * int(rate * .4))

voice_at = 2.1
out = [0.0] * math.ceil((voice_at + len(voice) / rate + .45) * rate)
# Two different knuckle impacts recorded on a wooden door, cropped to 0.3 s
# each in cubicle-door-knocks.wav. Keep their natural attack and resonances.
knock_path = Path(__file__).resolve().parents[1] / 'neon-city/assets/cubicle-door-knocks.wav'
with wave.open(str(knock_path)) as audio:
    assert audio.getframerate() == rate and audio.getnchannels() == 1
    knocks = array.array('h', audio.readframes(audio.getnframes()))
hit_frames = len(knocks) // 2
for hit, start in enumerate([.7, 1.08]):
    for i, sample in enumerate(knocks[hit * hit_frames:(hit + 1) * hit_frames]):
        out[int(start * rate) + i] += sample / 32768
for i, value in enumerate(voice):
    at = int(voice_at * rate) + i
    out[at] += value * .72
    for delay, gain in [(.075, .12), (.145, .07), (.26, .035)]:
        j = at + int(delay * rate)
        if j < len(out):
            out[j] += value * gain
pcm = array.array('h', (round(max(-.98, min(.98, value)) * 32767) for value in out))
path = Path(__file__).resolve().parents[1] / 'neon-city/assets/cubicle-child-knock.wav'
with wave.open(str(path), 'wb') as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(rate)
    audio.writeframes(pcm.tobytes())
print(f'{path}: {len(out) / rate:.3f} seconds')
