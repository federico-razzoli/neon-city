# Optional Three.js storage room: step 2 validation

This report covers the step 2 working tree based on `0ad5b98` (the renderer
extraction), with both backends available in the same revision. These software-WebGL
measurements do **not** establish general performance on the user's hardware.
The user reports smoother, more regular motion with Three.js; implemented Three.js
locations now use it by default, with Canvas/WASM available for comparison.

## Fixed-view comparisons

Both backends use the same hotel, game state, 640 × 360 pixel grid, camera and
painted palette. Browser viewport: 1280 × 900. World seed: 123456. Four samples:

| View | Canvas/WASM | Three.js | Pixels differing out of 230,400 |
| --- | --- | --- | ---: |
| Entry viewpoint | [Canvas](canvas-spawn.png) | [Three.js](three-spawn.png) | 509 (0.221%) |
| Pinned note | [Canvas](canvas-note.png) | [Three.js](three-note.png) | 12 (0.005%) |
| Near the crate | [Canvas](canvas-crate.png) | [Three.js](three-crate.png) | 40 (0.017%) |
| Facing the exit | [Canvas](canvas-exit.png) | [Three.js](three-exit.png) | 360 (0.156%) |

The samples are visually close. Differences appear along polygon edges; GPU
triangle rasterization does not reproduce every software edge pixel. Palette,
room contents, lens and viewpoint match. These four samples are not a substitute
for the broader visual and lettering review in step 3. The camera's handedness,
pitch, off-center horizon and clipping parameters are also covered by numerical
projection tests. The existing 36 fixed Canvas views remain pixel identical to
the pre-extraction reference.

[Raw image comparison](visual-comparison.json) records counts and mean absolute
RGB channel errors. These screenshots show the native renderer output before DOM
scanlines, vignettes or HUD elements.

## Measurements

Headless Chromium 156.0.8078.4, Linux x86-64. WebGL renderer:
`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.
This is software WebGL, not a hardware GPU benchmark. Browser settings, viewport,
room state and a ten-second stationary yaw route were matched. Each recording
followed 30 warmup frames; timed guest arrivals were held back to keep the initial
empty-room fixture consistent. Simulation uses a fixed 1/60-second step in this
fixture. Normal movement and NPC behavior are tested separately below.

| Measurement | Canvas/WASM | Three.js |
| --- | ---: | ---: |
| First selection + loading + first submitted render | 304.7 ms | 379.3 ms |
| Complete tick CPU time, median / p95 | 69.0 / 88.8 ms | 0.5 / 3.5 ms |
| Animation-frame interval, median / p95 | 83.3 / 100.0 ms | 116.6 / 116.7 ms |
| Frames in approximately ten seconds | 124 | 91 |
| Observed intervals over 25 ms / total intervals | 123 / 123 | 89 / 90 |

Three.js submits much less JavaScript work because the room is retained and
rasterization moves out of the main JavaScript thread. Frame delivery in this
software-WebGL run is slower. The CPU profile alone would therefore give a
misleading performance conclusion. Animation-frame intervals measure presentation
cadence, not an isolated GPU timer. No hardware GPU timings were collected.
Initial selection is measured separately from steady rendering; the traces below
contain the warmed recording, not the initial parse/compile/upload spike.

[Metrics and environment](metrics.json), [Canvas samples](canvas-samples.json),
and [Three.js samples](three-samples.json) retain the distributions and phase
measurements. User Timing phases include shared simulation, Canvas geometry and
rasterization, and Three.js scene construction, updates and render submission.
Three.js room construction happens on entry, so it is absent from the warmed
trace. No attributable WASM execution appears in these storage-only CPU profiles;
the street's WASM paths were not profiled by this experiment.

## Inspect the profiles

- [Canvas CPU profile](canvas.cpuprofile) and [Three.js CPU profile](three.cpuprofile)
  can be imported into Chromium DevTools to inspect their call trees/flame charts.
- [Canvas performance trace](canvas.trace.json.gz) and
  [Three.js performance trace](three.trace.json.gz) include main-thread,
  compositor/GPU and User Timing events. If the viewer does not accept gzip,
  decompress a copy first and import the resulting JSON.

## Reproduce

Use an existing Chromium installation and a Python environment containing
Playwright. No browser or project dependency installation is performed by this
script. Never install Firefox.

Serve the repository, for example:

```sh
python3 -m http.server 8899 --bind 127.0.0.1
```

Then run, substituting the path to your installed Chromium:

```sh
python3 scripts/profile-storage-renderers.py \
  --browser-executable /path/to/chromium \
  --base-url http://127.0.0.1:8899 \
  --output /tmp/neon-storage-profile \
  --seconds 10
```

The script intercepts the game module to add temporary test hooks, seeds the
fixture, schedules identical timed yaw routes, and writes screenshots, raw frame
samples, CPU profiles and performance traces. Those hooks are not shipped by the
game. It deliberately selects SwiftShader for this reproducible software-WebGL
comparison. Repeat profiling on target hardware before drawing GPU performance
conclusions or expanding the migration.

## Gameplay and resource checks

Live Chromium checks passed for:

- Lazy loading: no Three.js modules are fetched during ordinary Canvas play.
- The storage Three.js menu button is enabled; unsupported destinations remain
  disabled. Renderer changes preserve player coordinates, hotel and item state.
- Collecting the pinned note, dropping and recollecting it, and rendering a guest
  with shared sprite artwork in the room's depth buffer.
- Leaving through the normal storage door, returning through the stairwell door,
  retaining the note state, and automatically changing rendering surfaces.
- Repeated visits, zero uploaded scene geometries/textures after exit, and bounded
  resource counts on re-entry. At the benchmark entry view, one room geometry and
  no textures are uploaded; looking at the note uploads its separate geometry.
- Returning to Canvas arcade rendering, loading pinball and restoring the native
  viewport after closing it.
- Unavailable WebGL: the menu stays paused, reports that Canvas remains available,
  and successfully enters with Canvas without leaving a WebGL surface behind.

All **463 automated tests pass**. Tests cover camera projection parity, complete room/object geometry,
retention across movement and note changes, all nine collectible dropped-object
models, room filtering, disposal, supported destinations and bounded profiling
entries. Existing simulation and interaction tests remain shared between both
renderers.
