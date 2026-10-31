# Possible WebAssembly refactoring

WebAssembly (WASM) could reduce CPU time in Neon City's software rasterizers. A focused experiment is justified if profiling confirms that these functions consume a substantial part of the frame budget. A broad rewrite is not currently justified, and memory savings would likely come primarily from data layout and allocation changes that are also possible in JavaScript.

This assessment is based on source inspection, not browser profiling or a benchmark against a WASM implementation. The rankings below are hypotheses to validate, not measured speedups.

## Candidates

| Area | Priority | Expected benefit |
| --- | --- | --- |
| `DepthRenderer.render()` in [depth-renderer.js](neon-city/depth-renderer.js) | Highest | Lower CPU cost for interior triangle rasterization, depth tests, texture reads, and lettering coverage. |
| `rasterizePitchedWall()` in [perspective.js](neon-city/perspective.js) | High | Lower CPU cost for perspective-correct texture sampling, filtering, and fog. |
| `orderSurfaces()` in [surface-order.js](neon-city/surface-order.js) | Conditional | Faster polygon overlap and clipping calculations, if these dominate outdoor geometry processing. |
| Music generation in [lobby-music.js](neon-city/lobby-music.js) and [pub-music.js](neon-city/pub-music.js) | Secondary | Shorter synthesis pauses when entering a venue or enabling sound. |
| Traffic, pedestrians, world generation, and interactions | Low | No demonstrated bottleneck that currently warrants a port. |

### Interior rasterization

`DepthRenderer.render()` performs nested loops over triangle bounding boxes. Each covered pixel can require barycentric coordinates, inverse-depth interpolation, a depth comparison, and a texture lookup. Smooth lettering adds a 4-by-4 coverage test within each candidate pixel.

These numeric loops are the strongest WASM candidate. Their inputs and outputs can be represented as contiguous geometry, texture, depth, and pixel buffers. A port should process a complete batch of faces rather than cross the JavaScript/WASM boundary for every pixel or triangle.

The current renderer also creates temporary objects in hot paths: `subarray()` creates a typed-array view for a textured pixel, and texture-overlay correction can allocate an array. Removing those allocations in JavaScript should precede a port and provide a fairer comparison.

### Pitched-wall rasterization

`rasterizePitchedWall()` computes perspective-correct texture coordinates, optionally performs bilinear filtering, and applies fog. It is used for textured interior faces and for outdoor walls when the camera is pitched.

Its scanline and pixel loops are suitable for WASM. The smooth-sampling path currently creates weight and index arrays per pixel and uses callback-based reductions. Scalar calculations in JavaScript could remove those allocations and simplify the loop before evaluating WASM.

A shared rasterization module could eventually serve both this function and the interior renderer. That should follow evidence from a smaller experiment rather than become a prerequisite for the first benchmark.

### Surface ordering

`orderSurfaces()` sorts faces, computes projected bounds and depth planes, and clips overlapping polygons to determine ordering constraints. Detailed faces are compared against the face list, making the amount of work sensitive to scene complexity.

WASM could accelerate these calculations, but reducing candidate comparisons through spatial indexing or another broad-phase filter may have a larger effect. The current inputs are JavaScript objects with nested arrays; converting them to packed buffers has a cost that must be included in any benchmark.

### Music synthesis

The lobby and pub generators run substantial loops over audio samples. WASM could shorten generation time, but [MusicLoop](neon-city/music-loop.js) generates only the selected visit's track and releases the retained track when the visit ends. Playback uses Web Audio rather than repeatedly running the synthesizer in the game loop.

The likely improvement is a shorter entry or sound-enabling stall, not a sustained increase in frame rate. Moving generation to a worker is another option if the primary problem is blocking the main thread; a worker changes where the work runs without necessarily reducing its CPU cost.

## What WASM would not directly accelerate

Canvas operations such as `drawImage()`, `putImageData()`, clipping, and compositing remain browser work. Rewriting the code that issues those calls does not inherently make the operations faster. In particular, the upright-wall path in `drawWallTexture()` issues drawing calls per screen column; its cost must be separated from JavaScript geometry calculations.

If Canvas submission or pixel uploads dominate, reducing calls, reducing uploaded regions, or investigating GPU rendering may be more useful than a WASM port.

JavaScript/WASM interoperability also matters. Numeric buffers are a better interface than repeated exchanges of strings and object graphs. Both JavaScript and WASM can access an exported or imported linear memory, but conversions and copies may still be required by the surrounding APIs. See [MDN's WebAssembly memory documentation](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory) and [Mozilla's discussion of interoperability overhead](https://hacks.mozilla.org/2026/02/making-webassembly-a-first-class-language-on-the-web/).

## Memory implications

The interior renderer already reuses typed arrays. At its current 640-by-360 resolution, its principal buffers occupy:

| Buffers | Bytes per pixel | Total |
| --- | ---: | ---: |
| `depth`, `depthX`, `depthY`: three `Float64Array` buffers | 24 | 5.27 MiB |
| Output RGBA frame and texture scratch frame | 8 | 1.76 MiB |
| Optional `Uint16Array` lettering coverage | 2 | 0.44 MiB |
| **Total with coverage** | **34** | **7.47 MiB** |

These figures describe the listed pixel buffers only. They exclude geometry, textures, JavaScript objects, the touched-pixel list, and browser-managed Canvas storage. MiB means 1,048,576 bytes.

Moving the same buffers into WASM would not inherently shrink them. Replacing the three depth arrays with `Float32Array` would save approximately 2.64 MiB, and this is possible in JavaScript. It requires visual validation because the renderer uses depth gradients to resolve small lettering and intersecting projections.

Other relevant memory considerations are:

- Packed geometry could reduce object overhead, but JavaScript typed arrays can provide that layout too.
- Keeping JavaScript and WASM copies of geometry or textures would increase memory use. Buffer ownership should be explicit.
- Audio playback still needs its Web Audio buffer. A WASM synthesis buffer followed by a copy could increase peak memory compared with the current direct generation into the playback channel.
- Loaded city chunks are already pruned in `City.update()`, and texture pixels are cached with weak keys. WASM does not replace the need to manage retention and resource lifetimes.
- Less temporary allocation may reduce garbage collection pressure without materially changing retained memory.

## Validation plan

1. **Record a JavaScript baseline.** Profile representative interiors, smooth lettering, textured artwork, busy outdoor views, pitched outdoor views, and venue music generation. Include movement and turning, not only stationary scenes.
2. **Separate the costs.** Measure geometry preparation, surface ordering, rasterization, Canvas submission, and synthesis. Record frame-time distributions and slow frames, as well as retained and peak memory. Account for warm-up and distinguish first-use costs from steady-state behavior.
3. **Apply inexpensive JavaScript improvements.** Remove per-pixel allocations and simplify the filtering calculations. Evaluate narrower depth buffers separately, with visual checks. Preserve these improvements in the baseline used to judge WASM.
4. **Prototype one numeric workload.** Choose the rasterizer that profiling identifies as most expensive. Pass a batch of packed inputs and reuse its working buffers. Keep browser interaction in JavaScript and include packing, copies, and output submission in the measured cost.
5. **Check correctness and portability.** Compare rendered output for depth intersections, lettering, artwork, filtering, and fog. Test representative browsers and a slower device. Measure module loading and initialization as well as steady-state performance.
6. **Make an adoption decision from end-to-end results.** Adopt the port only if the user-visible improvement justifies the build tooling, integration code, debugging cost, and maintenance burden. Retain a JavaScript fallback if the experiment is adopted incrementally.

A faster isolated kernel does not guarantee a proportionate frame-rate improvement. For example, if rasterization accounts for 40% of frame time and becomes twice as fast, total frame time falls by 20% before integration overhead. This is an illustrative calculation, not a measurement of Neon City.

## Recommendation

Prioritize profiling and allocation cleanup in `DepthRenderer.render()` and `rasterizePitchedWall()`. If these remain substantial CPU bottlenecks, trial a batched WASM implementation of one rasterizer. Treat memory optimization as a separate data-layout and lifetime task, and defer broader game-system rewrites until measurements establish a need.
