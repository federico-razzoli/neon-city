# Object geometry caching

Neon City generates static object geometry once and reuses it while drawing.
Several templates remain cached for the entire game session and are shared by
every matching object, including objects in newly generated city chunks.
Camera movement does not rebuild these templates.

## Shared WASM generators

The geometry generators are written in C and compiled together into
[`neon-city/geometry.wasm`](neon-city/geometry.wasm).
[`geometry-wasm.js`](neon-city/geometry-wasm.js) loads and instantiates that module
once. All geometry wrappers import its exports, sharing one WASM instance, linear
memory, stack and scratch output buffer. Each object type still has its own
generator function; there is no additional dispatch generator.

On a cache miss, JavaScript calls the relevant WASM export. C computes the static
coordinates and, where applicable, normals, texture coordinates, material indices,
visibility rules and lighting information. For pine cones, JavaScript supplies the
orientation's sine and cosine when generating the cached mesh.

The generator writes numeric data into `geometry_output`, declared in
[`geometry.h`](neon-city/geometry.h). The exported `output()` function returns its
byte address. Every generator uses this same scratch space synchronously.

## Typed arrays and cache ownership

JavaScript reads the output through a `Float64Array` view over WASM memory:

```js
const scratch = new Float64Array(memory.buffer, output(), valueCount);
build(/* shape parameters */);
const geometry = scratch.slice();
```

`scratch` is a view, but `.slice()` creates an independent typed array. That copy
is essential: the next generator call overwrites the shared WASM output. Cached
meshes must never retain only a view of the scratch buffer.

Each generator has a documented numeric record layout. These packed arrays avoid
keeping large nested collections of vertex objects in the geometry cache. Draw
functions read the records and construct the vertices needed by the renderer;
rendering is not allocation-free. Cached arrays are treated as immutable.

## Templates retained for the game session

Templates are created lazily, on first use. Module-level variables and `Map`
caches retain them until the page/module instance is discarded; reloading the
game starts fresh caches. They are not saved to disk or local storage.

| Object | Sharing and cache key |
| --- | --- |
| Riverbanks | Grass, promenade, bridge approaches and separate retaining-wall panels, keyed by river-block half and bridge presence. Water-side culling and the original draw passes remain dynamic. |
| River railings | Complete bank and bridge railing templates keyed by river-block half and bridge presence on either edge. Individual faces and segment submission order are retained; blocks share templates regardless of position. |
| Road markings | One complete template for lane dashes and crossing stripes, translated to each street chunk. |
| Trees | One complete unit-scale pine, including trunk, foliage tiers, normals and shading. Every tree applies its own scale and position. Generated trunk radius is proportional to scale. |
| Flowers | One three-quad template shared across sizes and colours. Drawing applies size, position and ground height, and optionally omits the centre. |
| Cars | Complete models keyed by vehicle type, road axis and direction: at most 16 templates for the current four types. Position, paint colour, turns and bridge slopes do not create new templates. |
| Manholes | Geometry keyed by radius. Current covers share the same radius and template. |
| Newspaper machines | Geometry keyed by orientation, width and depth, shared across positions and newspaper designs. |
| Fingerpost signs | Board geometry keyed by direction, dimensions and texture dimensions; pole geometry keyed by height and radius. Position and lettering do not create new geometry. |

The geometry caches for parameterised templates use `Map` without eviction. Their
current parameter sets are limited; introducing continuously varying dimensions
requires reviewing cache growth rather than assuming every new key is cheap.

## Geometry retained with individual objects

Some meshes vary enough that their cache belongs to the object instead of a
global template collection:

- **Buildings:** a `WeakMap` caches the wall panels and texture coordinates per
  building. The generator uses the building's position and dimensions. Building
  geometry is assumed to stay unchanged while that object is loaded.
- **Pine cones:** a `WeakMap` caches the complete mesh, face normals and shading
  per cone. Changes to length, radius or angle regenerate it. Changes to position
  or ground height reuse it. The inventory preview retains a stable cone object
  so it also reuses its mesh.

Weak keys allow these arrays to be garbage-collected after their objects become
unreachable, for example after a chunk unloads. They are not guaranteed to survive
for the entire game. Regenerating a discarded building or cone generates a new
mesh.

## Memory usage

The figures below describe the current shared geometry module and the numeric
payloads of its caches. They were checked against the compiled module and the
cached arrays' `byteLength` values. One KiB is 1,024 bytes. These are not measurements
of the browser's total memory consumption.

### WASM generator memory

| Allocation | Current size | Ownership |
| --- | ---: | --- |
| Shared linear memory | 131,072 bytes (128 KiB) | One allocation for all these generators. |
| Scratch output buffer | 49,152 bytes (48 KiB) | Inside linear memory: `256 * 24` doubles, at eight bytes each. |
| Reserved C stack | 16,384 bytes (16 KiB) | Inside linear memory, configured by the shared build script. |
| `geometry.wasm` binary | 51,775 bytes | File size of the current build, not its runtime compiled-code size. |

The scratch buffer and stack are **included in** the 128 KiB figure, not extra
allocations to add to it. Linear memory also accommodates C static data and
alignment; the remainder is not a separate object cache. The generators currently
do not grow this memory. Each JavaScript `scratch` view shares that allocation,
even when several views overlap it.

The browser also maintains the WASM instance, compiled machine code and JavaScript
wrappers. Their engine-dependent overhead is not included in the table. In
particular, adding the `.wasm` file size to linear memory does not give an exact
runtime memory total. Other WASM systems, such as wall rendering and pedestrian
collisions, are outside this shared geometry module and these figures.

### Cached typed-array payloads

`.slice()` copies live in separate JavaScript `ArrayBuffer` allocations, outside
WASM linear memory. Every `Float64Array` element occupies eight bytes, including
numeric face counts, palette indices and any unused slots in fixed-size records.

| Cached object | Payload per cached entry | Current sharing / total when populated |
| --- | ---: | --- |
| Road markings | 2,880 bytes | One template for the game. |
| Tree | 12,992 bytes | One template for all tree scales and positions. |
| Flower | 120 bytes | One template for all flowers, including optional centres. |
| Ordinary car | 9,216 bytes | Four axis/direction variants. |
| Hippie van | 9,984 bytes | Four axis/direction variants. |
| Mercedes | 48,576 bytes | Four axis/direction variants. |
| Taxi | 37,248 bytes | Four axis/direction variants. |
| All car variants | 420,096 bytes | All 16 complete templates together (about 410.3 KiB). |
| River railings | 19,800–31,680 bytes | Six reachable block layouts together: 165,120 bytes (161.25 KiB). |
| Riverbanks | 4,704–4,928 bytes | Six reachable block layouts together: 29,120 bytes (about 28.4 KiB). |
| Manhole | 792 bytes | Per distinct radius; current covers share one entry. |
| Newspaper machine | 1,760 bytes | Per distinct orientation/width/depth key. |
| Sign board | 1,904 bytes | Per distinct board geometry key. |
| Sign pole | 1,904 bytes | Per distinct height/radius key. |
| Building | 5,120 bytes | Per cached building, released with its weak key. |
| Pine cone | 3,496 bytes | Per cached cone, released with its weak key. The inventory preview has its own entry. |

River layout totals use the current bridge placement rule: adjacent streets
cannot both have a bridge, so only three bridge-presence patterns occur for each
of the two river-block halves. The generators can also represent both bridges,
but those layouts are not generated by the current world.

For example, populating every car, railing and riverbank variant, the road, tree
and flower templates, and one manhole radius retains **631,120 bytes** (about
616.3 KiB) of typed-array payload. Together with shared WASM linear memory, that
is **762,192 bytes** (about 744.3 KiB). This example excludes signs, newspaper
machines, buildings and pine cones, whose counts depend on the scene and cache
history. It is not an upper bound or a complete game-memory estimate. Lazy caches
consume less before all those variants have been encountered.

For the variable entries, add `1,904 * (boardKeys + poleKeys)`,
`1,760 * machineKeys`, `5,120 * cachedBuildings` and `3,496 * cachedCones` bytes,
plus 792 bytes for each additional manhole radius. Weak-map entries become
eligible for collection when their keys are no longer reachable; reclamation is
not necessarily immediate. Regenerating a cone after changing its shape also
temporarily leaves its old array awaiting collection.

These payload counts exclude typed-array wrappers, `Map`/`WeakMap` storage, cache
keys, metadata objects, railing/bank range maps, temporary render vertices and
other caches such as bush meshes and textures. Those have additional runtime
costs.

### Building artwork memory

Building canvas textures are separate from the geometry arrays. A wall texture is
160 pixels wide and `9 * buildingHeight` pixels tall. At four bytes per pixel,
one RGBA pixel buffer is approximately `5,760 * buildingHeight` bytes. Four sides
of a height-20 building would therefore need 460,800 bytes (450 KiB) for one pixel
buffer per side, although sides are created only when needed.

This is a pixel-storage estimate, not an exact canvas allocation measurement.
Dim hotel variants create additional canvases, and renderer pixel caches, browser
backing stores or graphics resources can add further copies and overhead. Geometry
payload figures must not be mistaken for the memory cost of an entire building.

## Work that remains dynamic

Each frame still selects visible faces, applies the relevant position, scale,
turn and ground transforms, projects into the camera, clips geometry, handles
depth and draws it. Static geometry caches do not store the final screen image.
Collectible state, such as whether a flower or cone has been taken, remains on
the game objects.

Building artwork is a separate cache: wall colours, windows, storefronts and
lettering are painted into canvas textures in JavaScript when a building side is
first needed. Those textures are retained on the building, rather than shared
globally between buildings. WASM generates the wall geometry, not this artwork.

## Building and checking changes

Rebuild the shared module after changing a C generator or its headers:

```sh
sh tools/build-geometry.sh
```

The build uses Clang targeting `wasm32`, optimisation level `-O3`, and disables
fast-math and floating-point contraction to preserve arithmetic behaviour.
Commit the regenerated `geometry.wasm` with its source changes. The older
per-object build scripts delegate to this shared build.

Run `npm test` to check geometry against the original formulas, rendering
behaviour and cache reuse. In particular,
[`tests/geometry-wasm.test.mjs`](tests/geometry-wasm.test.mjs) checks that every
generator can overwrite shared scratch memory without corrupting cached arrays.

When adding a generator, register its C source in the shared build, ensure the
scratch buffer is large enough, document its array layout, choose the appropriate
cache lifetime, and copy its output before another generator runs. If future code
allows WASM memory to grow, existing typed-array views must be recreated after
growth.
