# Incremental Three.js migration

## Current renderer status

Three.js is now the only world renderer. The debug menu offers destination
travel without a Canvas renderer choice. Legacy Canvas rasterization, surface
ordering, texture readback/prewarming and `wall-columns.wasm` have been removed.
Arcade games still use Canvas 2D through `cabinet-renderer.js`, loaded into a
disposable iframe when entering the arcade. Leaving removes that iframe and
clears the renderer references, allowing its module map to be collected. Each
cabinet game retains its separate session iframe. Canvas-generated
textures, sprites, sky and overlays remain part of the Three.js implementation.
The migration entries below document earlier stages, including retired comparison
options and fallback behavior.

River water uses retained Three.js meshes and a shared animated shader in
`three-river-water.js`. Small world-space waves travel along the river's X axis and cross
chunk seams continuously. Diffuse crest lighting replaces the old painted ripple
polygons. Water has no bank glow or scene or sky reflection pass. River
chunks share their geometry and material, disposed when the street scene is
released.

`three-river-walks.js` adds retained stone paths along both banks at
`-3.4`, with the banks unchanged. Water is at `-3.9`, 50cm below the paths. Each bridge approach has a landing
and twelve larger steps down from an opening in the upper railing; there are no stairs
between bridges. Lighter treads, darker risers and small stone-colour variations
make each step visible. Lower paths pass
under bridges, with a separate player elevation so traffic and pedestrians
above do not collide with the player below. Water edges, retaining walls and
the sides of the stairs block movement; the stairs provide the return route.
Stairs and lower paths have no railings.
Each inter-bridge lower path has three wooden benches facing the river, with
their backs flush against the retaining wall. Clear distances are 64m to each
nearest bridge edge and 15m between adjacent benches. Space sits or stands using the
existing bench interaction. Bench wood and metal use two instanced batches per
populated chunk, sharing geometry and materials with no per-frame rebuilding.

## Objective

Introduce Three.js as an alternative renderer for Neon City in small, playable
steps. Preserve the game's appearance and behaviour while replacing the custom
software rendering pipeline scene by scene. Steps 1–2 and the debug menu are
implemented. The optional Three.js backend currently covers the hotel storage
room, stairwell, corridors, main hall, arcade, Midnite Books and the pub bar, lounge, lavatory and cubicles. Broader visual parity and lettering work remain pending.

Performance improvements are a hypothesis to measure, not a guaranteed outcome.
Each stage should leave the game usable and allow comparison with the existing
renderer.

## Existing boundaries

- [game.js](neon-city/game.js) owns gameplay and supplies an explicit frame of
  state to [world-scene.js](neon-city/world-scene.js). Scene construction no longer
  reads gameplay variables through a shared module scope.
- [world-scene.js](neon-city/world-scene.js) constructs interiors and streets
  through world-space `face`, `quad`, `box` and `billboard` operations. Canvas
  artwork generation remains here as a source of reusable textures.
- [render-camera.js](neon-city/render-camera.js) owns the native viewport and
  camera transform, clipping, projection and conservative visibility tests.
- [canvas-renderer.js](neon-city/canvas-renderer.js) is the initial backend. It
  owns projected queues, surface ordering, Canvas/WASM drawing, the interior
  [DepthRenderer](neon-city/depth-renderer.js), sky and screen effects, and arcade
  display scaling. DOM overlays and game state remain in `game.js`.
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

**Implemented.** The renderer boundary uses these conventions:

- `beginFrame({position, eye, pitch, indoors})` supplies the camera explicitly;
  `NATIVE_VIEW` supplies the 640 × 360 viewport, focal length 355, horizon 164,
  near distance 0.15 and far distance 260.
- `face(vertices, color, texture, smooth, buildingWall)` receives world-space
  positions and source-pixel UVs before any projection or clipping. `quad` and
  `box` receive world dimensions; the Canvas backend retains the existing
  camera-facing box culling. Geometry scratch arrays can be reused after the
  synchronous submission returns. A retaining backend must copy or own its data.
- `withStyle(options, submit)` scopes the existing detail, texture filtering and
  texture overlay options without exposing or editing projected faces in scene
  construction. Vehicle transforms also happen in world space before submission.
- `billboard` receives a world position, dimensions and either an image or a lazy
  artwork resolver. Canvas sprite placement and drawing stay inside the backend;
  offscreen sprites do not generate artwork. Interior pixel characters remain
  world-space geometry, retaining their depth-tested edges.
- `beginPass`, `endPass` and `drawPass` describe the existing terrain/bank/detail
  order. Returned passes are opaque backend handles. `drawInterior` returns an
  opaque visibility handle that `drawSky` can use for corridor window occlusion.
  Scene construction never reads the projected queue or depth buffer.
- `drawSky`, `overlay`, `finishStreet` and `cabinet` make the remaining drawing
  operations explicit. Cabinet loading screens and display scaling belong to
  Canvas; existing cabinet games keep their own renderers.

The scene builder still runs per frame, preserving the current software path.
The optional storage backend introduced in step 2 retains room objects and owns
its GPU resources separately. The shared Canvas scene builder remains immediate.

Validation: Chromium comparisons against the pre-extraction revision used fixed
randomness, world state, time and a 1280 × 900 browser viewport. All 36 native
canvas comparisons matched pixel for pixel: three views (spawn, turned, pitched)
for the initial street, riverside, park, pub, lavatory, cubicle, hotel lobby,
stairwell, storage, corridor, arcade and bookshop. These checks establish visual
parity for the sampled views, not a performance improvement. Focused renderer
contract tests cover world coordinates and UV interpolation, scoped styles,
sprite submission, cabinet scaling, and storage scene construction through a
non-Canvas recording backend, including current note state and dropped objects.
All 457 automated tests pass. Live Chromium checks also passed for movement,
menu travel, collecting the storage note, leaving through the storage door,
and loading, drawing and closing pinball with native viewport restoration.

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

**Implemented.** In the debug menu's LOCATIONS tab, choose **Hotel storage room /
Three.js** or **Canvas/WASM**. Selecting the current room changes its backend
without resetting the camera, hotel, pinned note, inventory, dropped objects or
NPC state. Other Three.js destinations remain disabled. Three.js is the default
where implemented, including ordinary storage-room entry; unsupported locations
use Canvas. Explicit comparison choices are remembered per destination for the
session. Choosing Canvas elsewhere does not change the storage preference.
The start screen now prepares Three.js before gameplay is enabled, avoiding
temporary Canvas rendering while the engine loads on the first interior visit.
If WebGL 2 cannot start, play is enabled with Canvas preferences; an explicit
menu selection still reports startup failure and keeps Canvas available.

- [three-hotel-renderer.js](neon-city/three-hotel-renderer.js) creates a separate,
  initially hidden WebGL canvas at the start screen. The original canvas remains
  the keyboard/pointer/touch input surface, and DOM overlays remain above the
  selected image. Venue objects are created only on entry.
- [three-storage-scene.js](neon-city/three-storage-scene.js) builds and retains the
  complete room and window scenery from the existing helpers. Reflecting world Z
  reconciles camera handedness; the lens, shifted horizon, pitch, clipping planes
  and native pixel grid match the Canvas camera. Materials preserve the painted
  palette without lighting or tone mapping. Native Three.js `BoxGeometry`
  supplies complete boxes.
- The note has a separate mesh, toggled by the existing hotel state.
  [dropped-object.js](neon-city/dropped-object.js) shares the existing collectible
  models between both backends. Drops create meshes on addition and release them
  on collection. Guest meshes update position, yaw and animation through shared
  nearest-filtered artwork textures. Everything uses the room's WebGL depth buffer.
- Compatible static meshes share one vertex-color material; guests share a plane
  and artwork materials. Room-owned geometry, materials and textures are disposed
  on exit or hotel changes; the renderer/context is reused. The pinned,
  MIT-licensed [Three.js 0.187.0 modules](neon-city/vendor/three/README.md) include
  integrity hashes and require neither a runtime CDN nor package installation.
- Bounded User Timing markers distinguish simulation, Canvas geometry/rasterization
  and Three.js geometry/update/render work without accumulating performance entries.

All **463 automated tests pass**. Chromium checks cover state-preserving switches,
ordinary exit/re-entry, collection, dropping and recollection, guests, repeated
visits, GPU resource release, other Canvas scenes/cabinets and unavailable-WebGL
fallback. The 36 pre-extraction Canvas comparisons remain pixel identical. Four
fixed storage comparisons are close but differ at polygon edges.

See [the step 2 validation report](benchmarks/three-storage-step2/README.md) for
screenshots, CPU profiles, performance traces, measured frame costs and a
reproduction script. The recorded SwiftShader software-WebGL environment shows much less JavaScript
work but slower frame delivery. These measurements describe that environment,
not the experience on the user's hardware, where Three.js feels smoother and more
regular. At the user's request, implemented Three.js scenes now use it by default.
Hardware GPU measurements and broader visual/lettering review remain for step 3.

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

**Hotel stairwell implemented.** Three.js is the default for both the storage
room, stairwell, corridors and main hall; Canvas/WASM remains available in the
debug menu with independent choices per location.

- [three-interior-scene.js](neon-city/three-interior-scene.js) shares the retained
  camera, geometry adapter, dropped-object meshes, guest artwork and resource
  ownership between the two migrated interiors. The original storage exports
  remain compatible.
- [three-stairwell-scene.js](neon-city/three-stairwell-scene.js) uses the existing
  stairwell geometry and the current hotel's palette. All three floors, both
  flights, railings, doors, lights and STORAGE lettering are built once per visit.
  Floor changes and climbing only update the camera and moving guest meshes.
- [three-money-note.js](neon-city/three-money-note.js) reuses the existing banknote
  artwork and UVs, including the Canvas renderer's compensation for the hotel
  overlay. Its mesh follows the same per-hotel `taken` state and wallet logic.
  Dropped items retain their tread/landing heights and room identity.
- One WebGL renderer/context serves both rooms. Stairwell/storage transitions
  release the previous scene's resources before building the next. Street
  transitions return to Canvas and release scene-owned GPU resources. Movement,
  collisions, doors, guest routines, cash pickup and the light-switch event use
  the existing gameplay code.

Validation: six fixed Canvas/Three.js views cover the entry, both flights, middle
and upper landings, and banknote. Chromium checks passed for ascending both
flights, collecting cash and updating the wallet, same-scene renderer comparison,
rendering a guest on the stairs, storage/corridor/lobby transitions and GPU
resource release. Focused automated tests cover camera elevation across floors,
retained geometry, note persistence, dropped-item heights, banknote UVs and tint,
and resource disposal. No new performance benchmark is claimed for this interior.

**Hotel corridors implemented.** All three floors use Three.js by default,
including numbered room doors, ceiling lights, framed pictures, animated window
casements, guests and dropped objects. The shared gameplay still controls locked
room replies, window opening/reversal, leaning, viewing pitch and guest routines.

- [three-corridor-scene.js](neon-city/three-corridor-scene.js) retains each floor's
  complete corridor and exterior geometry from `drawHotelCorridor`. A floor change
  rebuilds the scene for the correct door numbers and street elevation. Window
  leaves retain their meshes and rotate around their jambs using the existing
  progress/easing function; geometry is not regenerated during opening or closing.
- The buildings, shopfronts, pavements, crossings, cars and pedestrians visible
  outside the window participate in the same WebGL depth buffer as the corridor.
  Stable IDs from `hotelStreetLife` retain moving street meshes across frames;
  complete car geometry and artwork are shared between compatible instances.
  [vehicle-textures.js](neon-city/vehicle-textures.js) supplies the existing taxi,
  van and Mercedes artwork to both renderers.
- [three-artwork.js](neon-city/three-artwork.js) preserves source-pixel UVs for
  shop signs and vehicle textures. [three-corridor-sky.js](neon-city/three-corridor-sky.js)
  reuses the existing pixel starfield and shooting-star drawing as a scene
  background texture, refreshing it only when the view or artwork changes. It is
  drawn behind the WebGL world, so no separate world-overlay canvas or depth
  readback is required.
- Returning to the stairwell changes the retained scene within the same renderer;
  leaving the hotel releases GPU resources and uses Canvas. Floor,
  window state, viewpoint and gameplay survive explicit renderer comparisons.

Validation: seven fixed Canvas/Three.js views cover corridor entry, room numbering,
closed and partially open casements, and leaning up, down and sideways on different
floors. Chromium checks passed for opening and closing the window, leaning and
returning inside, state-preserving renderer switches, guest/street rendering and
normal stairwell exit, without page or shader errors. Automated checks cover
window hinge transforms, retained pedestrian/vehicle meshes, floor-dependent
scenery and drops, source UVs, bounded sky updates and resource disposal. No new
performance benchmark is claimed for this interior.

**Hotel hall (lobby) implemented.** All hotel interiors now use Three.js by
default, including ordinary street entry. The hall is still labeled **Hotel lobby**
in the debug menu; Canvas/WASM remains available for comparison.

- [three-hall-scene.js](neon-city/three-hall-scene.js) retains the existing hall
  geometry and per-hotel finishes: floor and carpet, reception desk and keys,
  bell, roses, sofa, palms, lift, chandelier, staircase and upper landing.
- Both existing receptionist models use the shared `drawStaff` geometry, built
  once and translated with the persistent receptionist position. Her lamp trip
  reads the existing gameplay routine; changing the receptionist type rebuilds
  only her own geometry.
- The desk lamp has retained on/off meshes and a marble glow, updated from the
  existing `lampOn` and `lampTaken` flags. Taking the lamp hides these meshes;
  returning to the hall retains its collected state. The static-room helper can
  omit the lamp and receptionist while preserving the Canvas defaults.
- Guests and dropped objects use the shared interior machinery, including their
  heights on the staircase and landing. Dialogue, bell sounds, sofa seating,
  collisions, lamp interaction and doors continue to use the existing game state.
  Hall/stairwell transitions reuse one WebGL renderer, and street exit releases
  scene-owned GPU resources and returns to Canvas.

Validation: eight fixed Canvas/Three.js views cover entry, reception, lamp off/on,
the blonde receptionist, sofa, landing and chandelier. Chromium checks passed for
normal default selection, guests, sitting/standing, the bell, receptionist
conversation, five lamp shutoff routines and lamp collection, renderer switching,
climbing the hall stairs, both door transitions and resource cleanup, without
page or shader errors. Automated tests cover retained hall geometry and camera
height, receptionist movement/type changes, lamp persistence and geometry reuse,
elevated guests/drops, resource disposal and unchanged Canvas drawing defaults.
No new performance benchmark is claimed for this interior.

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

Implemented in [debug-menu.js](neon-city/debug-menu.js). Type `QWERTY` during
ordinary gameplay to open it; Escape or **Close and resume** returns to play.
`DEBUG_MODE` is enabled in that module. All current scenes support Canvas/WASM;
all hotel interiors, the arcade, Midnite Books and all pub interiors also support Three.js. Other Three.js buttons stay disabled.
Selecting the current interior keeps its viewpoint and state. Venue travel uses the same
initialization as door entry. The event editor accepts a JSON object and applies
the complete validated replacement only when **Apply events** is pressed.


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

### Arcade interior

The arcade now defaults to Three.js on normal entry and supports state-preserving
Canvas/WASM comparison in the debug menu. `three-arcade-scene.js` retains the
existing room, cabinet fronts, labels, pinball, attendant, desk and bridge furniture
as shared unlit geometry. Visitors use the shared nearest-filtered sprite meshes,
reading the existing arcade life state; dropped items share the room depth buffer.
Room resources are released on venue changes and cabinet sessions. Cabinet games
continue using their existing renderers, and returning restores the arcade backend.
WebGL startup failure includes the arcade in the Canvas fallback preferences.

Validation: automated coverage checks default selection, room bounds, retained
geometry, visitor updates/removal, seated camera pitch, dropped token removal and
resource disposal. Chromium checks compare four fixed Canvas/Three.js views and
exercise visitors, renderer switches, cabinet return, hotel/arcade/street travel
and GPU cleanup. Polygon edges and a few overlapping cabinet decorations differ
between backends; no performance improvement is claimed.

### Midnite Books interior

Midnite Books now uses Three.js by default, with the Canvas/WASM comparison
available in the debug menu. `three-bookshop-scene.js` retains the shelves,
lettering, furniture and lights as one room mesh. The bookseller, backpack and
individual books have retained meshes. Books share geometry by cover color and
move between displays, reading tables, visitors and the bookseller using existing
bookshop state. Completed loans release their mesh references. Backpack visibility
reads the existing persistent collection state.

Visitors use the existing facing rule and animation frames. Seated readers use
the upper 32 sprite rows, the original seated scale and head height; standing
restores the complete sprite. Books, people and furniture share WebGL depth.
Room and shared resources are disposed on exit, and startup failure falls back
to Canvas. Canvas drawing defaults and gameplay rules are preserved.

Validation includes four fixed Canvas/Three.js views in Chromium, book pickup,
reading and restocking, seated/walking visitors, backpack persistence, renderer
switching, arcade/bookshop/street transitions and GPU cleanup, without page or
shader errors. Automated coverage checks retained room and seller geometry,
loans, backpack visibility, seated sprite cropping, resource disposal and Canvas
defaults. Small polygon-edge and overlapping-surface differences remain; no
performance improvement is claimed.

### Pub bar and lounge

Both connected pub rooms now default to Three.js, with Canvas/WASM comparison
available under Pub in the debug menu. `three-pub-scene.js` retains their complete
room geometry, connecting arch, bar, shelves, bottles, taps, tables, chairs, door
signs and chandeliers. The toilet and cubicles remain Canvas scenes; normal door
transitions restore the selected pub backend on return.

The four existing bartender models and the venue's counter pint use separate
retained meshes. Occupied seats retain their original leg/shoe geometry and drinks,
with cropped, nearest-filtered upper-body sprites using the original seated facing
rule. A seat changes only when occupancy, outfit or drink appearance changes;
emptying it removes its occupant and pint. The existing walking patron reads shared
pub life state and keeps the Canvas pub walking scale. Dropped objects participate
in the same depth buffer. Scene-owned geometry, materials and textures are released
on exit; unsupported-WebGL startup includes the pub in the Canvas fallback.

Validation: all 494 automated tests pass. Chromium checks cover six paired
Canvas/Three.js views across both rooms, all four bartender models, seating,
connecting-arch traversal, a walking patron, tap replies, bartender conversation,
state-preserving renderer switches, toilet and street doors, re-entry and GPU
cleanup, with no page or shader errors. Sampled views retain the painted palette
and artwork; polygon-edge differences remain. No performance gain is claimed.

### Pub lavatory and cubicles

The lavatory and cubicles now default to Three.js, with both destinations in the
debug renderer menu. `three-lavatory-scene.js` retains the tiled rooms, doors,
pictograms, basins, mirrors, toilet and paper roll. Door flags switch between
retained red and green meshes using current occupancy. Three.js sink water uses
retained translucent streams, small splash droplets and animated basin ripples;
visitors and dropped objects use the shared interior depth buffer.

Mirrors use the official Three.js 0.187.0 Reflector addon, bundled locally with
an import-path adjustment. Each mirror renders the room, fixtures, visitors and
dropped items from a reflected camera, preserving perspective during approach,
sideways movement and turning. A simple dark player body reuses the original head,
neck and torso outlines, with shallow extrusion and legs. It follows the player's
position and heading on a separate camera layer, visible only in reflections.
The Canvas mirror keeps its original clipped silhouette.

Each mirror owns a 640 × 360 nearest-filtered render target without multisampling.
Other mirror surfaces are hidden during the reflection pass to prevent recursive
renders. Body geometry is retained, and mirror render targets, materials and
geometry are disposed on exit. Reflector adds scene rendering work; no frame-time
improvement is claimed.

Cubicle seating keeps the existing camera height, pitch and flush interaction.
The banshee event uses the original timing and portrait artwork, drawn into a
scene-owned screen texture and composited after the room. The overlay restores
the renderer's clear state and releases its GPU resources on exit. Normal doors
switch between pub, lavatory, cubicle and street with the existing gameplay state.
WebGL startup failure includes both new destinations in the Canvas fallback.

Automated checks cover default renderer selection, debug destinations, retained
room and animated geometry, occupancy, taps, silhouettes, visitors, drops, seated
camera, banshee composition and resource disposal. Chromium checks compare four
fixed Canvas/Three.js views and exercise renderer switching, taps, visitors,
toilet seating, the banshee phases, normal door transitions and GPU cleanup.

Reflector validation: all 501 automated tests pass. Mirror camera tests verify
reflection across the glass plane, movement, reflection-only player visibility,
bounded mirror passes, retained body geometry and render-target disposal.
Chromium comparisons additionally cover near/far, sideways, turned and second-mirror
views. The old glass panels are omitted in Three.js and the clipping plane uses
zero bias so they cannot cover the reflection at distant or oblique angles.
The normal lavatory/cubicle gameplay and cleanup checks pass without page or
shader errors.

### Sink water appearance

`three-sink-water.js` adds tapered translucent streams with descending highlights,
five small low-poly splash droplets per sink, and spreading rings on a translucent
basin surface. Unlit colors and the native viewport keep the pixel style. Closing
a tap hides its stream immediately, lets the splashes fade, and settles the rings
over 1.6 seconds. The calm basin retains a subtle water tint. The two sinks operate
independently; pausing freezes their animation and settling.

Geometry stays retained and shared where compatible. Frames update uniforms and
droplet transforms, with no texture uploads or geometry rebuilding. Water uses the
room depth buffer and appears in the existing Reflector mirrors. Scene exit disposes
its geometry and materials. Canvas/WASM keeps the original water appearance.

Validation: all 507 automated tests pass, including tap alignment, independent
shutoff/settling, pause behavior, retained geometry and resource disposal. Chromium
checks cover running, settling and calm close-up views, animated frame differences,
mirrors, renderer switches, toilet seating, banshee phases, door transitions and
GPU cleanup without page or shader errors. No performance improvement is claimed.

### Native pub objects and glass/drinks

`three-pub-objects.js` builds the bar and lounge structure, doors and signs, tables,
chairs, bar panels, backbar shelves, bottles, taps and chandeliers directly with
Three.js BoxGeometry, PlaneGeometry, CylinderGeometry, LatheGeometry and TorusGeometry.
The pub no longer uses `drawPubInterior` to construct its Three.js room. Repeated
opaque parts use InstancedMesh batches with shared geometry and palette materials.
The existing people, their artwork and gameplay interactions remain unchanged.
Shared dropped-item models remain depth-tested Three.js meshes.

All 84 bottles have tinted translucent glass, visible liquid, opaque paper labels
and caps. Pints have separate tapered glass shells, bases, rims, lager/stout liquid,
exposed liquid surfaces, foam heads and small foam bubbles. View-dependent glass
highlights preserve the unlit painted palette without adding room lighting or
refraction render passes. Glass uses depth testing without depth writes; individual
shells retain Three.js transparency sorting.

Each seat retains its pint and updates visibility, position and liquid material
from existing occupancy and drink state. Empty seats hide their pints. The counter
pint follows the venue's persistent location and beer type without rebuilding
geometry. Scene-owned shared materials, geometry and instance resources are
released on exit. Canvas/WASM retains its original objects and drinks.

Validation: all 508 automated tests pass. Focused tests cover native primitive
coverage, bottle count and transparency, shared retained pints, drink changes,
occupancy, unchanged people/camera behavior and resource disposal. Chromium checks
compare six room views and additional lager, stout and bottle close-ups, all four
bartenders, seating, arch traversal, walking patrons, tap replies, conversation,
renderer switches, toilet and street doors and GPU cleanup. No page or shader
errors were reported. No performance improvement is claimed.

### Prepare the renderer at the start screen

The initial button displays “LOADING THE NIGHT” and stays disabled while the shared
Three.js modules and WebGL renderer initialize. Click, Space and the resume button
cannot start gameplay until preparation finishes. The normal start button then
returns. No venue scene, furniture, people or artwork textures are constructed
by this preparation; readiness reports zero venue geometries and textures.
All converted venues use the same prepared renderer on their first entry.

If initialization fails, the start screen explains that play remains available,
selects Canvas/WASM for converted venues and enables the start button. Explicit
debug renderer choices can still retry Three.js. Ordinary pause/resume behavior
and scene disposal on exit are unchanged; this does not introduce a pub cache.
Room construction and first-use shader/GPU uploads still occur on entry.

Validation: all 511 automated tests pass. Chromium checks hold back the renderer
module to verify disabled-start and early-Space behavior, then confirm readiness
without venue allocations, direct Three.js first-pub rendering with no Canvas
frames, and playable Canvas fallback when WebGL is unavailable. No page errors.

### Three.js pub collisions and targeting

The main pub room now uses `three-pub-spatial.js` when its Three.js renderer is
selected. A radius .18 player body collides with Three.js box/sphere volumes for
walls, furniture and people. Movement uses .08 maximum substeps and slides along
blocked axes. The old .3 furniture clearance and .85 person separation no longer
apply to this path. Occupied-seat bumps still notify the pub life system.

Seating, doors, bottles, the pint, taps and bartender use exact Three.js raycasts
against dedicated object volumes. Horizontal seat/hand/eye rays replace facing
cones: targets need a hit, with intervening furniture blocking each ray.
The glass has .18 units of extra targeting radius and taps have .2, allowing
slightly off-centre aim without changing their collision shapes or reach.
Targets are within two units of the ray origin, except the bartender's eye ray
which reaches 3.5 units to span the counter. Occupied and reserved chairs remain
unavailable. Table ray hits within 1.4375 units of a chair centre also target
that chair. Collisions in the same table-edge region count as bumping its seated
patron when occupied; the table's sides and opposite unoccupied seat do not
trigger that patron. Replies, dialogue and venue transitions still use shared game state.
Generic inventory and dropped-item handling remain shared with other rooms.

Spatial objects are created lazily, reused during the visit and disposed when
leaving the renderer's room. Canvas mode retains its existing spatial checks;
the lavatory and cubicles are outside this change.

Validation: 520 automated tests pass, including direct collision and raycasting
checks. Chromium verifies wall blocking, arch traversal, seating, tap replies,
bartender conversation, toilet return and street exit without page errors.

### Three.js lavatory and cubicle collisions and targeting

`three-lavatory-spatial.js` now supplies spatial queries for both rooms when
Three.js is selected. Three.js box/sphere checks block the player at walls,
sinks, the toilet and walking robots, using a .18 body radius and .08 maximum
movement substeps. Robot walking and emergence use a Three.js line-segment
proximity check against the player, including an escape path for overlapping
bodies moving apart.

Three.js raycasts select the lavatory exit, individual cubicle doors, each sink,
the toilet seat and the cubicle exit. Seat/hand/eye rays stop at intervening
fixtures and robots; reach is two units. Sink hits toggle the corresponding tap.
Door hits consult current occupancy before admitting the player or giving an
occupied reply. Sitting, standing and flushing, banshee rolls and the child-knock
event retain shared gameplay state. Canvas mode keeps its previous spatial code;
generic dropped-item handling remains shared.

Spatial resources are lazy and disposed on room changes. Chromium checks passed
for sink/toilet blocking, both tap toggles, occupied/vacant doors, toilet seating,
standing, cubicle exit and return to the pub, with no page errors. Automated
coverage includes robot blocking and the knock-event door flow with both spatial
backends.

### Hall desk lamp lighting

The hall lamp now uses a warm Three.js `SpotLight` beneath its shade, aimed at
the reception desk with a soft cone edge and distance falloff. This replaces
the two flat coloured glow rectangles. The hall's shared surface material is
now `MeshLambertMaterial`, with ambient light preserving its painted appearance
when the lamp is off; other interiors keep their existing material. Artwork and
character sprites keep their existing materials.

The spotlight follows the shared lamp-on and lamp-taken flags, including the
receptionist's automatic shutoff. It is retained during the visit and disposed
on exit. It does not enable shadow maps. Canvas rendering is unchanged.
