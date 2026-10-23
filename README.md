# Browser games

Each game lives in its own directory and runs independently as a static website. No build, package install, account, API, or externally hosted assets are needed.

## Play locally

To test Neon City with the tiny Flask app on Linux, run:

```sh
./start.py
```

Open `http://<server-ip>/` from another computer, or http://127.0.0.1/ on the server.
The app listens on all IPv4 interfaces on port 80 and serves the game and its assets
directly from `neon-city/`. Any server or provider firewall must allow inbound TCP port 80.

To stop the background app:

```sh
./stop.py
```

These executable scripts work from any working directory. `start.py` creates `.venv`
if needed, installs `requirements.txt`, and launches the app with `.venv/bin/python`.
If setup fails, it reports the error without launching the app. `stop.py` preserves
the virtual environment for the next start. The process is tracked in `.neon-city.pid`;
server output goes to `.neon-city.log`.
Starting an already running app or stopping an already stopped app is harmless.

Alternatively, use Python's static file server without installing Flask.
From the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/neon-city/ in a modern browser. Serve over HTTP rather than opening the HTML as a file, because the game uses JavaScript modules.

## Embed on another website

Host this repository on any static web host, then use the game's URL:

```html
<iframe
  src="https://your-games-host.example/neon-city/"
  title="Neon City"
  width="960"
  height="540"
  style="width:100%;max-width:960px;aspect-ratio:16/9;height:auto;border:0"
  loading="lazy"
  allow="fullscreen"
></iframe>
```

Cross-origin embedding works without CORS configuration. Configure your hosting service to allow framing by the intended parent websites (avoid `X-Frame-Options: DENY` or `SAMEORIGIN`; set any CSP `frame-ancestors` directive appropriately). If the parent uses a sandboxed iframe, include `allow-scripts allow-same-origin` so ES modules can load. Clicking the start button focuses keyboard input inside the game. Keyboard events are captured only while playing. No parent-page access or messaging is needed.

## Neon City

- Up/down arrows: walk forward/backward. Left/right arrows: turn. Hold Shift to triple movement and turning speed (also works with W/S and A/D). A RUNNING ×3 indicator confirms that Shift is held.
- W/S also walk; A/D sidestep. Touch controls are available on touch devices.
- Space starts the game from the opening screen or resumes it when paused.
- Escape or the pause button pauses. Switching away pauses automatically.
- Buildings are solid. Face a pub entrance from nearby and press Space to enter; face the door inside and press Space to return to the street. Each pub has a bar room with a bartender, wooden bottle shelves and beer taps, plus a lounge through an open passage on the right. Larger round tables have circular collision boundaries so you can walk around them. Other buildings cannot be entered. Pedestrians block walking, running and car knockback; you can slide around them. Each pedestrian keeps an individually randomized walking speed between 0.9 and 1.8 world units per second (1–2×), independent of appearance. Opposing pedestrians let one another pass: one steps aside, waits, then returns to the same spot on the path and resumes walking. If the sidestep is blocked, they wait for space. Pedestrians blocked for 1.5 seconds turn around when there is room behind them, including when blocked by the player. Queues can unwind from the free end. Interrupted sidesteps recover even when pedestrians face the same direction: they retreat or walk alongside the path until there is room to return. Recovery preserves position and collision clearance. There is no dialogue or other interaction.
- Moving red, blue, pink and green cars share one model. Cars give a short horn warning when you come within two world units of their body, with a 2.5-second cooldown between honks. Collisions play a short recorded human “ouch” (CC0; see `neon-city/assets/CREDITS.md`) and shove the player aside; there is no health, death or game over.
- The city uses a software-rendered, 640×360 pixel canvas, textured block buildings, and seven animated pedestrian sprites: a sunglasses-wearing guy, a clubgoer with solid-colour tights and heels, a Black guy in a leather jacket and gold chain, a pink-haired punk teen girl, a Black teen girl, a shirtless tattooed man carrying a beer bottle, and a gay man with pink hair, a pink shirt, white trousers and a right-ear earring.
- Ursa Major’s seven-star Big Dipper pattern sits at a fixed bearing in the sky, initially to the left of the moon. Its brighter stars stay anchored as you turn.
- Each block has zero to three randomly placed sidewalk manhole covers. They stay in place while the block is cached. Stand on or near a cover and press Space to try lifting it (hold Space to retry): a short male effort grunt plays and “IT'S TOO HEAVY.” appears.
- Blocks are generated randomly on arrival. A 5×5 region is loaded around the player. Visited blocks remain cached within three blocks in each direction (at most 49 blocks); more distant blocks and their textures are released. Returning to a forgotten area generates a new layout. Reloading starts a new city. This is deliberately an endless, temporary world, not a persistent map.
- Traffic repeats seamlessly along the street grid. Pedestrians follow sidewalk loops. The game uses no network requests beyond its own source and audio files, no cookies, and no storage.

The renderer uses Canvas 2D with projected polygons and sprite billboards; no GPU/WebGL dependency. It intentionally uses coarse geometry and a restricted night palette, inspired by early adventure games rather than realistic modern graphics.

ARCADE storefronts have a permanently closed door and display windows showing lit arcade cabinets. Nearby arcades play a quiet mix of game melodies, coin pings and laser sounds; the sound fades out over 12 world units and mutes while paused. While nearby, random retro laser, car-crash and pinball effects play over the music for 1–2 seconds, with 3–6 seconds between effects.

## Checks

If Node.js is installed, run `node --test tests/world.test.mjs`. Tests cover bounded world memory, local retention, regeneration, building collision, pedestrian routes, traffic continuity and car colours.
