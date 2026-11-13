# Incremental Three.js migration

## Objective

Introduce Three.js as an alternative renderer for Neon City in small, playable
steps. Preserve the game's appearance and behaviour while replacing the custom
software rendering pipeline scene by scene. This document is a plan; no renderer
changes have been implemented as part of writing it.

Performance improvements are a hypothesis to measure, not a guaranteed outcome.
Each stage should leave the game usable and allow comparison with the existing
renderer.

## Existing boundaries

- [game.js](neon-city/game.js) combines simulation orchestration, camera projection,
  geometry submission and drawing. These rendering responsibilities need a clearer
  boundary before introducing a second backend.
- Interior drawing functions already accept geometry helpers such as
  `{face, quad, box}`. For example,
  [hotel-interior.js](neon-city/hotel-interior.js) describes the hotel through these
  helpers. This is a useful starting point for a renderer interface.
- Interiors use [DepthRenderer](neon-city/depth-renderer.js); streets also use
  surface ordering and the wall rendering routines in
  [perspective.js](neon-city/perspective.js).
- Geometry modules, including
  [building-geometry.js](neon-city/building-geometry.js), already cache generated
  geometry. Some of that data may be reusable by a Three.js backend.

World generation, traffic, NPC routines, dialogue, inventory, audio, movement and
collision logic should continue to use the existing game state. A rendering
migration does not require replacing them or introducing a physics engine.

## Migration stages

### 1. Extract the renderer boundary

Separate camera setup, submission of world-space geometry and final drawing from
gameplay orchestration. Keep the current Canvas renderer as the initial backend.
Preserve world coordinates and texture coordinates before projection and clipping
so that both backends can consume scene descriptions.

Use the existing `face`, `quad` and `box` conventions where practical. Identify
special cases that issue Canvas drawing commands directly, such as sprites and
overlays, and give them explicit rendering operations as needed. The existing
projected face queue is not automatically a backend-neutral scene description.

Completion criterion: the existing game still renders and behaves as before,
with scene construction separated sufficiently to support a second backend.

### 2. Add an optional Three.js hotel storage room

Introduce a renderer selection switch and implement the hotel storage room as
the first complete Three.js scene. Keep the existing renderer available for
comparison and for all other scenes. Establish how the Canvas and WebGL surfaces
are selected when entering and leaving the room; they need separate rendering
contexts.

Match the current camera position, direction, pitch, eye height, field of view,
near clipping and viewport. Render the room's complete contents, including
interactive and dropped items, using existing gameplay state.

Completion criterion: the player can enter, use and leave the storage room with
either renderer, with matching interactions and no changes to the rest of the
game's rendering.

### 3. Establish visual parity

Preserve the native pixel grid, palette, fog and existing artwork. Use unlit
materials where appropriate to retain the existing painted colours. Existing
canvas artwork can become Three.js canvas textures; choose filtering per asset
so signs remain readable and sprites retain their intended appearance.

Check texture orientation, transparency, colour handling, face winding, coplanar
surfaces and camera conventions. Built-in fog may need adaptation to match the
existing depth-based effect. Exact pixel identity is not assumed, but visible
differences should be understood and reviewed.

Completion criterion: fixed camera comparisons establish an acceptable visual
baseline and identify any deliberate differences.

### 4. Migrate interiors individually

Expand to other interiors one at a time, choosing the order after the first
experiment. Include characters, furniture, signs and collectible objects in each
converted scene. Keep simulation and interaction logic shared between backends.

Handle special views explicitly, including hotel corridor windows and their
street scenery. Arcade cabinet games can retain their current Canvas renderers;
switching into a cabinet does not require porting the game inside it.

Completion criterion for each interior: visual comparison, working entry and
exit, correct occlusion, and unchanged interactions with objects and characters.

### 5. Migrate the street renderer

Start with a complete, limited street scene before expanding coverage to the
procedural city. Convert roads, buildings, signs, pedestrians, traffic, parks,
bridges and rivers in manageable increments within the optional backend.

Reuse cached geometry where suitable. Evaluate batching or instancing for
repeated objects after correctness is established. Manage mesh and texture
lifetimes as city chunks load and unload; CPU-side weak caches do not release
GPU resources automatically.

Completion criterion: the new backend supports normal city traversal and venue
transitions, with correct visibility and stable resource use.

### 6. Retire superseded rendering paths

Make Three.js the default only after coverage, visual checks and measurements
support that decision. Remove obsolete projection, surface ordering and software
rasterization code once no remaining scenes depend on it. Decide explicitly
whether a maintained Canvas fallback is still useful before removing it.

Keep simulation and collision WASM code. Assess geometry-generation WASM for
reuse; replace rendering-specific WASM only as its responsibilities disappear.

## Occlusion and mixed rendering

Prefer migrating complete rooms or scenes. Overlaying a Canvas containing
pedestrians on a Three.js canvas containing buildings does not give them a shared
depth buffer: people could appear in front of walls that should hide them.

DOM interface elements and screen overlays can remain separate. World objects
that overlap must participate in a consistent visibility solution within the
selected scene renderer. Any temporary hybrid approach needs an explicit
occlusion strategy rather than relying on canvas stacking order.

## Validation and measurement

- Compare fixed camera views with the same world seed, state and viewport.
  Include close walls, oblique signs, pitched views, sprites behind furniture,
  transparent edges and distant scenery as those features are migrated.
- Exercise movement, collisions, object collection, doors, conversations and
  transitions between converted scenes, Canvas scenes and arcade games.
- Run existing tests relevant to changed code. Add focused tests for meaningful
  renderer contracts or regressions where practical.
- Measure complete frame times and stalls on comparable scenes, including scene
  construction and resource uploads. Also check initial loading, repeated venue
  visits, chunk turnover and memory growth. FPS alone is insufficient.
- Use Chromium for browser validation if installation is needed. Never install
  Firefox, including Playwright Firefox builds, and never use a browser install
  command that downloads all browsers.

### Flame graphs for both renderers

Capture CPU flame graphs for the existing Canvas/WASM renderer and the Three.js
renderer using Chromium's performance profiler. Use the renderer selection
switch to compare both backends from the same revision wherever possible.

- Use the same scene, world seed, game state, camera route, viewport, hardware
  and browser settings, with matching recording durations.
- Warm up textures and geometry before recording steady gameplay. Record initial
  loading and venue transitions separately so their costs remain visible.
- Add profiling markers around simulation, geometry preparation and rendering
  to help distinguish shared gameplay costs from backend-specific work.
- Save the performance traces with the revision, renderer choice and reproduction
  steps so results can be inspected and repeated.

Three.js moves much of the rendering work onto the GPU. A smaller JavaScript
flame graph alone does not demonstrate an overall improvement: compare CPU
profiles alongside complete frame times, dropped frames and GPU timings where
available. Inspect WASM work in the existing backend too; record any limitations
in function names or attribution rather than treating missing detail as free
execution time.

## First milestone

Deliver a renderer extraction plus an optional Three.js hotel storage room.
Keep the remaining game on its current renderer and preserve the room's existing
gameplay. Record visual comparisons, measured frame costs and any limitations
before deciding how to expand the migration.

Three.js reference: [official documentation](https://threejs.org/docs/), including
`CanvasTexture` for reusing canvas artwork.
