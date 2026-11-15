# Building generation, caching and memory lifetime

Buildings retain native Three.js wall geometry and GPU textures in the street
renderer. Canvas artwork stays attached to each building. Legacy consumers also
have per-building WASM arrays and pixel readbacks, as described below.

## Retained Three.js street walls

The default street renderer uses `createThreeBuildings()` in
[`three-buildings.js`](neon-city/three-buildings.js). `buildingTemplate()` generates
one unit building through WASM and caches that CPU array globally. Each street
scene lazily converts the template into four GPU wall geometries, preserving the
eight panels per wall and their UVs. All building positions and dimensions use
these same four geometries through cached group transforms.

Wall meshes and artwork textures are created only when a side is first visible.
Camera movement updates side visibility and selects artwork without rebuilding
panels or uploading their position/UV buffers. GPU back-face culling also applies
to the retained triangles. Each building's canvases can differ by seed, venue
and wall side, so meshes keep separate artwork materials rather than forcing
unrelated textures into an instance batch. Hotel sign dimming switches between
cached lit/dim textures, with no geometry changes.

Unloading a building releases its meshes, GPU textures and materials. The four
shared wall geometries survive until street-scene disposal. Offscreen and
bookshop-window bounds are checked before requesting geometry or artwork.
Legacy per-building `buildingGeometry()` arrays are not populated by native
street rendering.

## Generating and retaining buildings

[`City.update()` in world.js](neon-city/world.js) maintains a `Map` of loaded
chunks. Each chunk covers 64 by 64 world units. For ordinary city terrain,
`City.generate()` creates four building descriptions in a two-by-two arrangement.
Each building is 18 by 18 units, with a randomly selected height from 12 to 33
in steps of three, wall colour, venue sign, neon colour and artwork seed. River
and park chunks expose no buildings.

Generation initially creates descriptions, not wall meshes or canvases. Each
description contains dimensions, position and appearance parameters. The chunk's
`buildings` array owns those objects.

Ordinary chunks load within two chunk coordinates of the player's current chunk
on each axis. Existing ordinary chunks remain loaded until their maximum axis
distance exceeds three. This gap between loading and unloading distances avoids
discarding resources immediately when the player crosses a loading boundary.
River chunks have a separate, wider loading/retention policy.

The city uses a stateful random-number generator. Returning to a discarded chunk
creates fresh building objects and consumes new random values; it does not restore
the old buildings or their caches from an address-based persistent store. Some
venue details use address-based rules, but the building layout/appearance should
not be assumed to regenerate identically.

## Legacy wall sides: generated in WASM, cached in a typed array

[`building()` in world-scene.js](neon-city/world-scene.js) first checks the building's world
bounds against the camera. An offscreen building normally returns before creating
geometry or artwork. Seated texture prewarming is an exception for artwork,
described below.

When geometry is needed, [`buildingGeometry()`](neon-city/building-geometry.js)
looks up the building object in a module-level `WeakMap`. On a miss:

1. It calls the `building_build(x, z, w, d, h)` export of the shared
   [`geometry.wasm`](neon-city/geometry.wasm) instance.
2. [`building-geometry.c`](neon-city/building-geometry.c) generates all four wall
   sides, with eight separate quad panels per side. It writes world-space
   coordinates and texture coordinates into the shared scratch output buffer.
3. JavaScript copies the output with `Float64Array.slice()` and stores the copy
   under the building's weak key.

The payload is `4 sides * 8 panels * 4 vertices * 5 doubles * 8 bytes`, or
**5,120 bytes per cached building**. Each vertex stores `x`, `y`, `z`, `u` and
normalised `v`. The copy is independent of WASM memory, so another generator can
reuse the scratch buffer without damaging it.

All sides are generated together on the first geometry request. Repeated frames
reuse the same array. Different building objects have separate arrays, including
buildings with identical dimensions. Building position and dimensions are assumed
to remain unchanged after caching; this cache has no mutation-based invalidation.

Legacy rendering still selects the sides facing the player each frame, transforms their vertices
into camera space, scales vertical texture coordinates by the canvas height,
clips, projects, sorts and draws. Keeping eight panels per side preserves finer
depth ordering against pedestrians and vehicles. Neither the projected polygons
nor the final screen image are permanently cached.

## Artwork: painted in JavaScript, cached per side

`wallTexture(building, side)` in [`world-scene.js`](neon-city/world-scene.js) creates artwork
lazily. The first request for a side paints a canvas and stores it in
`building.textures[side]`. Further requests return that canvas. Four wall sides
can therefore have four canvases, even when some of their artwork is identical.
These textures are not shared between different buildings.

Each canvas is 160 pixels wide and `building.h * 9` pixels tall. Painting includes:

- The building's wall colour.
- Upper windows, with seed-dependent dark or lit glass and cross-shaped frames.
- The ground-floor strip, trim, window frames and neon accents.
- Venue-specific artwork for arcades, pubs, hotels, bookshops and Blue Note.
- Sign backing, border, lettering and glow, plus the vertical hotel sign where
  applicable.

Windows are pixels in this artwork, not individual 3D window meshes. Their frames
and lighting pattern are not reconstructed every frame. WASM generates the wall
surfaces and texture coordinates; canvas painting remains in JavaScript.

Hotel dimming keeps a second set in `building.dimTextures[side]`. On first use,
the code obtains the normal canvas, copies it into a new canvas and applies
`dimHotelH()`. Switching between states then selects the corresponding cached
canvas. The normal canvas remains unchanged, so each variant has its own artwork. Dim variants add memory; they do not replace the normal canvases.

## Three.js texture use

Three.js uploads the retained artwork canvases as textures. The legacy Canvas
pixel-readback cache and seated texture prewarmer have been removed. Offscreen
buildings are culled without generating their wall artwork just for prewarming.

## Unloading and garbage collection

When an ordinary chunk moves beyond the retention radius, `City.update()` deletes
its entry from `city.chunks`. There is no explicit `free()` call for each wall or
canvas. Removing the chunk drops one ownership chain:

```text
city.chunks -> chunk -> buildings[] -> building -> textures / dimTextures
```

Once nothing else references a building, its weak geometry-cache entry does not
keep it alive. Its 5,120-byte array becomes eligible for garbage collection. Its canvases become eligible for collection once no scene textures or other
objects retain them.

Deleting a chunk does **not** guarantee immediate reclamation. Active venue
references such as `currentVenue` or `currentHotel`, a pending prewarm request,
or a render queue that still references a canvas may retain resources longer.
JavaScript garbage collection and browser graphics-resource cleanup decide when
memory is actually reclaimed. A weak cache permits collection; it does not force
it or remove other strong references.

The shared WASM instance and its scratch memory stay loaded for the game session.
Unloading buildings releases eligible per-building copies, not the generator.
Returning after unloading creates new caches on demand.

## Memory accounting

- Geometry adds **5,120 bytes per cached building**, excluding wrappers and weak
  map overhead.
- One artwork canvas has `160 * (9 * height)` pixels. One four-byte RGBA buffer
  therefore represents **5,760 * height bytes per side**.
- At height 33, one side's RGBA buffer represents 190,080 bytes; four sides
  represent **760,320 bytes (742.5 KiB)**. Only requested sides are painted.
- Each populated dim variant adds another canvas. Each cached `ImageData`
  readback adds a pixel array of the corresponding dimensions.

Canvas backing stores, renderer resources, JavaScript objects and transient
vertices have additional engine-dependent costs. Pixel-buffer arithmetic is not
an exact measurement of total browser memory. The artwork can outweigh the wall
geometry substantially.

See [Object geometry caching](OBJECT-GEOMETRY-CACHING.md) for the shared generator's
memory, the other object caches, and build/test instructions.
