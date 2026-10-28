# Browser games

Each game lives in its own directory and runs independently as a static website. No build, package install, account, API, or externally hosted assets are needed.

## License

This program is licensed under the GNU Affero General Public License, version 3
only (`AGPL-3.0-only`). See [LICENSE](LICENSE) for the full license text.

Third-party assets retain their own licenses; see
[asset credits](neon-city/assets/CREDITS.md).

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
- Buildings are solid. Face a pub entrance from nearby and press Space to enter; face the door inside and press Space to return to the street. Each pub has a bar room with a bartender, wooden bottle shelves and beer taps, plus a lounge through an open passage on the right. Larger round tables have circular collision boundaries so you can walk around them. Each seat counts how many times you bump into its patron; staying in contact counts as one bump. On the third bump the patron has a 50% chance of standing up and leaving the pub, but only if nobody else is walking around in it. Either way, that seat's count starts again from zero. Other buildings cannot be entered. Pedestrians block walking, running and car knockback; you can slide around them. Each pedestrian keeps an individually randomized walking speed between 0.9 and 1.8 world units per second (1–2×), independent of appearance. Opposing pedestrians let one another pass: one steps aside, waits, then returns to the same spot on the path and resumes walking. If the sidestep is blocked, they wait for space. Pedestrians blocked for 1.5 seconds turn around when there is room behind them, including when blocked by the player. Queues can unwind from the free end. Interrupted sidesteps recover even when pedestrians face the same direction: they retreat or walk alongside the path until there is room to return. Recovery preserves position and collision clearance. Pedestrians on the street have no dialogue or other interaction.
- Sit at a pub table opposite a patron and they greet you with “HI THERE!”. Characters with something to say then speak their lines in order every 3–5 seconds, starting over after the last one, until you stand up. The shirtless tattooed man thinks everything sucks, the robot explains why ladybugs are more interesting than humans, the Black teen girl talks about her dad sending her to the pub, the gay man warns you about the robots, the punk girl tells you about her favourite polka band, and the bald man in the Hawaiian shirt cheerfully shares his unusual family arrangements before offering another pint, the teen nerd enthuses about Perl, and the tall woman confides how being judged hurts her.
- Moving red, blue, pink and green cars share one model. Cars give a short horn warning when you come within two world units of their body, with a 2.5-second cooldown between honks. Collisions play a short recorded human “ouch” (CC0; see `neon-city/assets/CREDITS.md`) and shove the player aside; there is no health, death or game over.
- The city uses a software-rendered, 640×360 pixel canvas, textured block buildings, and sixteen animated pedestrian sprites: a sunglasses-wearing guy, a clubgoer with solid-colour tights and heels, a Black guy in a leather jacket and gold chain, a pink-haired punk teen girl, a Black teen girl who wears one of three shirt-and-shoe colour combinations, a shirtless tattooed man carrying a beer bottle, and a gay man with pink hair, a pink shirt, white trousers and a right-ear earring, a businessman in a charcoal suit and red tie, a businesswoman in a burgundy blazer, pencil skirt and heels, a Muslim woman in a hijab and long abaya, a Sikh man in a saffron turban with a full beard, steel kara, bomber jacket and jeans, and a grey old-style tin robot with an antenna, glowing eyes, pincer hands and a wind-up key, an Egyptian mummy wrapped in bandages with glowing green eyes, and a short, fat bald man with wide-open eyes, a teal Hawaiian shirt, khaki shorts and sandals, a teen nerd with messy black or blonde hair, big glasses, a pocket protector and high-water cords, and a tall, beautiful Black woman with waist-length hair, a pink shirt, blue jeans and pink sneakers. Characters can have a relative street weight (default 1); the mummy’s 0.25 makes him four times rarer than the others on the street. Pubs ignore weights. Each character can be marked as not going to pubs (the Muslim woman and the mummy); everyone else may appear as a pub patron. Seated pub patrons keep the same outfits, including suit trousers, skirt hems above the knee, and heels.
- Ursa Major’s seven-star Big Dipper pattern sits at a fixed bearing in the sky, initially to the left of the moon. Its brighter stars stay anchored as you turn.
- Each block has zero to three randomly placed sidewalk manhole covers. They stay in place while the block is cached. Stand on or near a cover and press Space to try lifting it (hold Space to retry): a short male effort grunt plays and “IT'S TOO HEAVY.” appears.
- Each block has a 10% chance of being a park instead of four buildings, provided no other cached park lies within two blocks in any direction, diagonals included. A park has a kerbed lawn with grass tufts and flowers, a footpath that winds in an S or C curve between two opposite sidewalks, two wooden benches set parallel to the path, three to five tiered pines, 16–22 units tall, and a few fallen pine cones on the grass beneath them. The lawn and the light-brown path are walkable; benches and pine trunks are solid, and the lowest boughs start above head height. Pedestrians walking round a park take the footpath one time in four when they reach either end of it; at the far end they rejoin the sidewalk, turning left or right at random. Face a bench end from nearby and press Space to sit, just like a pub chair: movement locks, left/right turns up to 45°, up/down tilts the view up to the sky overhead, and Space stands you back up where you were. Near a park you hear night birds, synthesized in the browser: songbird trills and chirps, a two-note whistle and an occasional owl. Calls come from random directions with 0.8–3.5 seconds of quiet between them. They play at full volume on the lawn and its sidewalks, fade out across the street (silent 22 units from the lawn), and stop when you pause or enter a pub.
- Blocks are generated randomly on arrival. A 5×5 region is loaded around the player. Visited blocks remain cached within three blocks in each direction (at most 49 blocks); more distant blocks and their textures are released. Returning to a forgotten area generates a new layout. Reloading starts a new city. This is deliberately an endless, temporary world, not a persistent map.
- Traffic repeats seamlessly along the street grid. Pedestrians follow sidewalk loops. The game uses no network requests beyond its own source and audio files, no cookies, and no storage.
- Night River crosses district `0, 4` and occupies rows 4 and 5, roughly five blocks from the starting point. Its channel is 92 world units wide, with water seven units below grassy promenades. Both banks have a walking path and a road farther from the water. Arched two-lane bridges with pedestrian sidewalks rise six units above the banks; players, pedestrians and cars follow their slopes. Railings block movement into the water.

The renderer uses Canvas 2D with projected polygons and sprite billboards; no GPU/WebGL dependency. It intentionally uses coarse geometry and a restricted night palette, inspired by early adventure games rather than realistic modern graphics.

ARCADE storefronts have a permanently closed door and display windows showing lit arcade cabinets. Nearby arcades play a quiet mix of game melodies, coin pings and laser sounds; the sound fades out over 12 world units and mutes while paused. While nearby, random retro laser, car-crash and pinball effects play over the music for 1–2 seconds, with 3–6 seconds between effects.

## Checks

If Node.js is installed, run `node --test tests/world.test.mjs`. Tests cover bounded world memory, local retention, regeneration, building collision, pedestrian routes, traffic continuity and car colours.
