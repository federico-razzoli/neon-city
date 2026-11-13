# Audio

`ouch-human.mp3` is the high-quality MP3 preview of “ouch screem.wav” by
samueleunimancer, used without modification.

Source: https://freesound.org/people/samueleunimancer/sounds/386893/

License: Creative Commons Zero (CC0 1.0)
https://creativecommons.org/publicdomain/zero/1.0/

`ouch-short.wav` keeps only 0.10–0.45 seconds of that recording (the initial
“ouch”), with short edge fades to prevent clicks. The following scream is removed.

`effort-grunt.wav` is the high-quality MP3 preview of “Grunt” by
SoundDawg101, a recording described as someone lifting something heavy.
Converted to mono PCM with short edge fades, at its original pitch and speed.

Source: https://freesound.org/people/SoundDawg101/sounds/171635/

License: Creative Commons Zero (CC0 1.0)
https://creativecommons.org/publicdomain/zero/1.0/

`cubicle-door-knocks.wav` contains two distinct wooden-door impacts from the
high-quality MP3 preview of “Knock on the door” by HunteR4708, recorded with a
Zoom H1. Converted to mono 22050 Hz PCM; excerpts at 0.44–0.74 and 2.79–3.09
seconds are normalized separately, faded at their edges and stored consecutively.

Source: https://freesound.org/people/HunteR4708/sounds/256513/
Preview: https://cdn.freesound.org/previews/256/256513_4772965-hq.mp3
License: Creative Commons Zero (CC0 1.0)
https://creativecommons.org/publicdomain/zero/1.0/

`cubicle-child-knock.wav` combines those two recorded knocks with “Mom? I can't
see you... Where are you?” synthesized with eSpeak NG's `en-us+f4` voice, high
pitch and slow delivery, with short echo taps. Only the last question uses local
speech-rate adjustments: “Where” at 160%, “are you?” at 75%. The earlier phrases,
voice, pitch and echo remain the same. No recording of a real child is used.
Mono PCM, 22050 Hz; bundled for consistent offline speech.
Rebuild with `python3 scripts/generate-cubicle-knock.py` (requires eSpeak NG).
