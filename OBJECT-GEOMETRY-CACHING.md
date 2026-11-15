# Object geometry caching

Neon City generates static object geometry once and reuses it while drawing.
The WASM generators cover buildings, manholes, newspaper machines, fingerpost signs,
trees, flowers, pine cones and riverbank retaining walls. Cars, roads, road
markings, river railings, riverbank ground and bridge approaches are generated
directly in Three.js; their former WASM generators and fallback paths have been
removed.

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
| Riverbank retaining walls | Separate wall panels keyed by river-block half. Bridge presence does not change this template; doorway cutouts and water-side culling remain dynamic. |
| Trees | One complete unit-scale pine, including trunk, foliage tiers, normals and shading. Every tree applies its own scale and position. Generated trunk radius is proportional to scale. |
| Flowers | One three-quad template shared across sizes and colours. Drawing applies size, position and ground height, and optionally omits the centre. |
| Manholes | Geometry keyed by radius. Current covers share the same radius and template. |
| Newspaper machines | Geometry keyed by orientation, width and depth, shared across positions and newspaper designs. |
| Fingerpost signs | Board geometry keyed by direction, dimensions and texture dimensions; pole geometry keyed by height and radius. Position and lettering do not create new geometry. |

The geometry caches for parameterised templates use `Map` without eviction. Their
current parameter sets are limited; introducing continuously varying dimensions
requires reviewing cache growth rather than assuming every new key is cheap.

## Geometry retained with individual objects

For the complete building lifecycle, including generation, wall sides, artwork,
pixel readbacks and unloading, see [Building caching](BUILDING-CACHING.md).

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
| Shared linear memory | 65,536 bytes (64 KiB) | One allocation for all these generators. |
| Scratch output buffer | 12,992 bytes (about 12.7 KiB) | Inside linear memory: `56 * 29` doubles, at eight bytes each. |
| Reserved C stack | 16,384 bytes (16 KiB) | Inside linear memory, configured by the shared build script. |
| `geometry.wasm` binary | 20,788 bytes | File size of the current build, not its runtime compiled-code size. |

The scratch buffer and stack are **included in** the 64 KiB figure, not extra
allocations to add to it. Linear memory also accommodates C static data and
alignment; the remainder is not a separate object cache. The generators currently
do not grow this memory. Each JavaScript `scratch` view shares that allocation,
even when several views overlap it.

The browser also maintains the WASM instance, compiled machine code and JavaScript
wrappers. Their engine-dependent overhead is not included in the table. In
particular, adding the `.wasm` file size to linear memory does not give an exact
runtime memory total. The separate pedestrian-collision WASM module is outside these figures.

### Cached typed-array payloads

`.slice()` copies live in separate JavaScript `ArrayBuffer` allocations, outside
WASM linear memory. Every `Float64Array` element occupies eight bytes, including
numeric face counts, palette indices and any unused slots in fixed-size records.

| Cached object | Payload per cached entry | Current sharing / total when populated |
| --- | ---: | --- |
| Tree | 12,992 bytes | One template for all tree scales and positions. |
| Flower | 120 bytes | One template for all flowers, including optional centres. |
| Riverbank retaining wall | 2,688 bytes | Two block-half templates together: 5,376 bytes (5.25 KiB). |
| Manhole | 792 bytes | Per distinct radius; current covers share one entry. |
| Newspaper machine | 1,760 bytes | Per distinct orientation/width/depth key. |
| Sign board | 1,904 bytes | Per distinct board geometry key. |
| Sign pole | 1,904 bytes | Per distinct height/radius key. |
| Building | 5,120 bytes | Per cached building, released with its weak key. |
| Pine cone | 3,496 bytes | Per cached cone, released with its weak key. The inventory preview has its own entry. |

Populating the tree, flower, both retaining-wall templates and one manhole radius
retains **19,280 bytes** (about 18.8 KiB) of typed-array payload. Together with
shared WASM linear memory, that is **84,816 bytes** (about 82.8 KiB). This excludes
signs, newspaper machines, buildings and pine cones, whose counts depend on the
scene and cache history. It also excludes native Three.js meshes and GPU buffers;
it is not a complete game-memory estimate. Lazy caches consume less before all
those templates have been encountered.

For the variable entries, add `1,904 * (boardKeys + poleKeys)`,
`1,760 * machineKeys`, `5,120 * cachedBuildings` and `3,496 * cachedCones` bytes,
plus 792 bytes for each additional manhole radius. Weak-map entries become
eligible for collection when their keys are no longer reachable; reclamation is
not necessarily immediate. Regenerating a cone after changing its shape also
temporarily leaves its old array awaiting collection.

These payload counts exclude typed-array wrappers, `Map`/`WeakMap` storage, cache
keys, metadata objects, retaining-wall range maps, temporary render vertices and
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

## Retained Three.js trees

The street renderer converts the cached WASM pine template into one shared,
vertex-coloured `BufferGeometry` per street scene. Each park owns one
`InstancedMesh`, with each tree's position and uniform scale written once when
that park first renders. Camera movement does not regenerate tree vertices or
mark geometry or instance buffers for upload. Three.js handles back-face and
frustum culling; the original WASM face normals determine triangle winding so
trunks, foliage caps and colours match the former draw path.

Tree instances remain retained while their park is loaded, including frames
where it is outside the street view. Unloading a park releases its instance
buffer; disposing the street scene releases the shared geometry and material.
Bookshop window culling can hide the tree instances as well. The legacy
`drawTreeGeometry` helper remains for non-native geometry consumers and parity
tests; the Three.js street backend bypasses it.

## Retained Three.js manholes

The street renderer converts each cached WASM manhole radius into one shared,
vertex-coloured GPU geometry. The three layered disks and three slots retain
their original colours and elevations. Each street chunk retains an instanced
mesh for each radius it contains; positions are uploaded on creation and remain
unchanged as the camera moves. Bookshop window bounds can hide these meshes
without rebuilding them. Chunk unloading releases instance buffers, and street
scene disposal releases the shared geometry and material. The legacy per-cover
face submission remains available to non-native consumers but is bypassed by the
Three.js street backend.

## Retained Three.js retaining walls

The street renderer converts the cached WASM riverbank wall panels into shared
Three.js geometry, including the recessed-door cutouts. Geometry is keyed by bank
half and bridge presence on each edge (six layouts under the current bridge
rules). Each river chunk retains a translated mesh and reuses the GPU buffers;
camera movement only changes visibility. The original water-facing-side rule,
Three.js frustum culling and bookshop window bounds determine what is rendered.
Chunk unloading drops its mesh, and disposing the street scene releases all
shared wall geometries and the material. Bridge fascias and slab undersides
remain on their existing rendering paths.

## Retained Three.js fingerposts

Fingerpost poles, coloured board edges and both textured arrow faces are built
once from the cached WASM geometry. Matching board layouts and pole heights
share complete assemblies, while sign positions use retained scene transforms.
Lettering canvases remain shared by text and arrow direction, and their Three.js
textures use nearest-neighbour sampling without mipmaps to keep lettering crisp.
Camera frames do not reconstruct sign vertices, UVs or textures. Park signs drop
their scene groups on chunk unloading; the initial street sign persists for the
street scene. All shared geometry, materials and textures release on scene exit.
Bookshop window bounds can hide and restore these assemblies. Facade lettering
and the separate Rive Gauche tourist signs remain on their existing paths.

## Work that remains dynamic

For the remaining streamed geometry, each frame still selects visible faces, applies the relevant position, scale,
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

## Retained Three.js pine cones, flowers and newspaper machines

The street renderer uses instanced meshes for all three object types, including
outdoor dropped cones and flowers. Geometry and materials are retained for the
street scene, with instance batches grouped by chunk. Camera movement checks
visibility but does not recreate vertices, recalculate placement matrices, or
upload instance buffers. Pickups, drops and changes to object properties repack
only the affected chunk's batches. Unloading chunks releases their instance
buffers; leaving the scene releases the shared models, textures and materials.
Bookshop window clipping and bounds also apply to these instances.

Pine cones share one global unit WASM template. Instance matrices provide length,
radius, rotation, position and floor height. Outward face winding lets the GPU
cull back faces. A vertex shader transforms face normals using the instance's
nonuniform scale and rotation, then reproduces the original five-color shading
palette. The palette uses the original street coordinates, so composing the
street behind a bookshop window does not rotate its baked light direction.
The per-cone WASM cache remains available for inventory previews and other
non-native callers; street rendering no longer populates it for individual cones.

Flowers share separate petal and gold-center geometries. Instance colors supply
petal variation, X/Z scaling supplies size, and Y scale stays at one to preserve
the center's fixed 0.001 elevation. Compatible flowers share batches, omitting
the center for park flowers. Dropped flowers retain their original depth bias.

Newspaper machines use canonical south-facing templates keyed by width, depth
and newspaper artwork. Instance rotation supplies the other three directions,
so compatible machines facing different streets share a batch. Body faces use
GPU back-face culling and original face colors; the front artwork retains its
two-sided rendering and smooth mipmapped texture. Canvas artwork is cached by
newspaper name, and GPU textures are shared within each street scene.

Indoor pine-cone and flower drops use the same instanced renderers with
natural outdoor objects disabled and room-specific filtering. They inherit the
room's material type and omit the street depth bias, preserving indoor lighting
and floor placement. Other indoor dropped items keep their retained per-item
meshes. Legacy geometry emitters remain for other consumers and appearance tests.

## Retained Three.js building walls

Native building walls use one global WASM unit template and four GPU geometries
per street scene. Position and dimensions are cached transforms; camera frames
change visibility and artwork selection without rebuilding or uploading panels.
Wall textures remain building-specific. Lit/dim hotel artwork switches between
retained GPU textures. Building unloading releases artwork materials/textures;
shared wall geometry releases on scene exit. See `BUILDING-CACHING.md`.
