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

### 3. Establish visual parity and improve lettering

Preserve the native pixel grid, palette, fog and existing artwork. Use unlit
materials where appropriate to retain the existing painted colours. Existing
canvas artwork can become Three.js canvas textures; choose filtering per asset
so signs remain readable and sprites retain their intended appearance.

Check texture orientation, transparency, colour handling, face winding, coplanar
surfaces and camera conventions. Built-in fog may need adaptation to match the
existing depth-based effect. Exact pixel identity is not assumed, but visible
differences should be understood and reviewed.

Treat lettering readability as an explicit improvement in this stage, then apply
the approach to signs and labels as each interior and street scene is migrated.
Preserve the game's pixel aesthetic without requiring reproduction of existing
lettering defects.

Three.js provides texture filtering, mipmaps and anisotropic filtering that can
reduce shimmering and improve textured lettering viewed at oblique angles.
These tools do not automatically repair poor source typography: letter shapes,
spacing, contrast, margins and source texture resolution still need attention.
The low world-rendering resolution also limits readable detail; increasing a
texture's resolution alone cannot make tiny on-screen letters legible.

- **World signs and labels:** improve source typography and generate textures at
  a suitable resolution. Tune magnification, minification and anisotropic
  filtering per asset, checking frontal and oblique views at several distances.
  Balance smooth sampling against preserving the intended pixel appearance.
- **Raised lettering:** consider Three.js `TextGeometry` where actual geometric
  letters suit the sign. It generates letter geometry from a loaded font, but
  is unnecessary for most flat signs and does not remove the screen-resolution
  limit.
- **Menus and dialogue:** use browser text where practical so interface
  readability can be independent of the world's pixel resolution. Existing DOM
  text can remain in place; Canvas cabinet interfaces can be assessed separately.

Use representative signs and labels to establish reusable typography and
sampling choices before applying them widely. Keep text assets reusable under
the resource-sharing rules below. Reference the official documentation for
[texture filtering](https://threejs.org/docs/pages/Texture.html) and
[TextGeometry](https://threejs.org/docs/pages/TextGeometry.html).

Completion criterion: fixed camera comparisons establish an acceptable visual
baseline and identify any deliberate differences. Representative lettering is
reviewed for readability, spacing and stability during movement, including
oblique views, without an unintended change to the game's overall appearance.

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

Prefer Three.js geometry facilities and spatial queries as their corresponding
systems migrate. Keep existing WASM paths temporarily where needed for the
incremental transition; retaining them is not a goal. Replace rendering-specific
WASM as its responsibilities disappear, and consider custom WASM optimisations
only when profiling demonstrates a meaningful remaining CPU bottleneck.

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

## Debug destination and renderer menu

Add a debug mode controlled by a code constant, `DEBUG_MODE`. Keep it enabled in
the repository. Setting the constant to false must disable the debug shortcut
and menu.

While debug mode is enabled, typing `QWERTY` during gameplay opens a destination
menu. Ignore the sequence in text input fields and during arcade cabinet
sessions, where those letters may serve another purpose. Opening the menu pauses
gameplay and clears held movement keys.

List every game interior, the initial street, the riverside and the nearest park
as destination rows. Provide two renderer selection columns:

- **Canvas/WASM:** enter the destination using the existing renderer.
- **Three.js:** enter using the new renderer where that destination is supported.
  Keep unsupported entries visibly disabled until their implementation is
  available.

Selecting a destination must use normal scene setup so NPCs, objects and
interactions are initialized correctly. Entering a different destination uses a
fixed starting viewpoint suitable for repeatable testing. For the nearest park,
resolve the destination relative to the player's location when opening the menu.

When switching renderers for the same destination, preserve the camera and scene
state wherever possible so visual comparisons use equivalent conditions. The
menu should make both scene testing and old/new renderer comparisons available
without editing code or checking out another revision.

### Debug state controls

Include the following controls in the debug menu, all governed by `DEBUG_MODE`:

- **Money:** enter and apply a wallet balance, updating the normal money display.
- **Inventory:** open an object picker and select objects to add magically to
  the inventory through the normal inventory logic, without requiring collection
  in the world.
- **Game event register:** inspect the current global event register and add,
  edit or delete its keys and values. Preserve supported value types and validate
  edits before applying them.

The event editor must display current values and require an explicit **Apply**
action so partially typed changes do not affect gameplay. Text entry in these
controls must not trigger movement, gameplay shortcuts or the `QWERTY` sequence.

## Resource reuse and Three.js caching

Build on Three.js resource management rather than duplicating it with a general
custom rendering cache. Three.js manages GPU resources associated with the
geometry, materials and textures supplied to it. The game still decides which
objects to create, share, retain and release; independently creating equivalent
geometries does not automatically make them share one geometry.

The explicit [Three.js Cache](https://threejs.org/docs/pages/Cache.html) caches
loaded files for loaders that use it and is disabled by default. It does not
memoize the game's procedural object generation or manage city chunk lifetimes.

Use these initial rules for the new backend:

- Create scene objects when their scene or chunk loads, and retain them across
  frames. Update transforms, animation and changed appearance instead of
  rebuilding the scene every frame.
- Share geometry, materials and textures among compatible repeated objects.
  Consider instancing where it helps reduce draw calls.
- Generate unique building geometry once per loaded building, preferring Three.js
  geometry facilities. Existing generators can support the transition where
  useful; avoid retaining duplicate CPU representations unnecessarily.
- Reuse generated artwork as textures and update it only when its contents
  change.
- Give chunk-specific and shared resources clear owners. When a chunk unloads,
  dispose of resources no longer needed, while preserving resources still used
  elsewhere. Removing scene objects alone does not release their GPU allocations;
  use the appropriate disposal methods, such as
  [BufferGeometry.dispose()](https://threejs.org/docs/pages/BufferGeometry.html#dispose).

Start with straightforward asset sharing and chunk lifetimes. Add more elaborate
caches or object pools only when profiling demonstrates a benefit, checking both
frame time and memory use.

## Collision and interaction queries

Use Three.js spatial tools for collision detection and interaction checks where
appropriate, preserving the game's rules and behaviour during migration.
Three.js provides bounding volumes, raycasting and an
[Octree addon](https://threejs.org/docs/pages/Octree.html) for world collision
queries. The game still specifies responses such as sliding along walls,
pedestrian stopping, bump dialogue and traffic knockback.

Build interaction checks from three separate questions:

- **Distance:** measure distance to an explicit interaction point or area.
  Three.js vector distance methods suit point targets;
  [Box3.distanceToPoint()](https://threejs.org/docs/pages/Box3.html) can measure
  distance to a bounding box rather than its centre.
- **Facing:** compare the player's viewing direction with the direction towards
  the interaction target, using vector operations and a configured tolerance.
- **Reachability:** use a
  [Raycaster](https://threejs.org/docs/pages/Raycaster.html) where needed to check
  for walls or other blocking objects between the player and the target.

Give interactable objects explicit points or areas, such as a door handle, a
seat or the front of a cabinet, instead of relying solely on the visible mesh's
bounds. Define suitable interaction regions for people and counters as well.
The game controls reach distance, facing tolerance, target priority and which
surfaces block interaction. Preserve intentional interactions across counters;
visual geometry is not automatically an interaction blocker.

Keep interaction targets linked to shared game state so switching rendering
backends does not change which actions are available. Migrate spatial checks in
manageable steps and verify boundary distances, facing, intervening walls,
different floor heights and counter interactions. Prefer nearby candidate lists
and simple distance checks before detailed raycasts rather than testing every
mesh in the city for each interaction.
