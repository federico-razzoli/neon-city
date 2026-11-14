# Bookshop window culling

Compared commit `b665cbc` with the window visibility and exterior bounds culling change.

Chromium 1248, headless, SwiftShader software rendering, 1280 × 800 viewport. Each view used 10 warm-up frames followed by 60 measured frames. Random seed 42 and `Date.now() = 123456` kept the city and view consistent. The camera stood at bookshop coordinates (9, 6), facing the windows (π) or shelves (0).

CPU time includes the game tick and render submission. It does not measure GPU completion or establish hardware FPS. These are single-run measurements; timings will vary with the machine and system load.

| View | Before median CPU | After median CPU | Before draw calls | After draw calls |
| --- | ---: | ---: | ---: | ---: |
| Windows | 30.70 ms | 19.25 ms | 126 | 92 |
| Shelves | 36.90 ms | 6.90 ms | 237 | 15 |

The exterior scene is retained but neither updated nor rendered when both window openings are outside the camera view. When visible, conservative cones through the openings reject street chunks, buildings, vehicles and pedestrian billboards that cannot appear through the glass. Chunk bounds include a 16-unit margin for bridges and pedestrians crossing chunk boundaries. Street simulation continues so looking back does not restart the scene.

Window-facing screenshots were inspected before and after. Street scenery and shop geometry remained intact, and Chromium reported no page errors.
