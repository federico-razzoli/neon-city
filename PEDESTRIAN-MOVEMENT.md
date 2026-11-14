# Pedestrian movement and implementation

Street walkers follow route clocks and explicit movement states. Their routes,
choices, crossings and conversations are implemented in JavaScript. A separate
WASM kernel accelerates batched walker-to-walker collision resolution.

For car behaviour and the traffic side of crossings, see
[Traffic movement](TRAFFIC-MOVEMENT.md). This guide describes outdoor city walkers;
venue visitors and interior actors also have their own behaviour modules.

## Main implementation

- [`world.js`](neon-city/world.js): walker generation, route evaluation,
  `City.advancePedestrians()`, crossings, park paths, collision planning and
  recovery from blocked movement.
- [`river-pedestrians.js`](neon-city/river-pedestrians.js): generated river
  walkers, lower paths, stair choices, directional reservations and exit queues.
- [`pedestrian-collisions-wasm.js`](neon-city/pedestrian-collisions-wasm.js): numeric
  buffer interface and fallback selection.
- [`pedestrian-collisions.c`](neon-city/pedestrian-collisions.c): batched collision
  broad phase and propagation of stopped movement through queues.
- [`game.js`](neon-city/game.js): player movement, updates, dialogue integration
  and sprite rendering.

## Generation, routes and clocks

City generation creates seven walkers for an ordinary chunk. Each receives a
route phase, speed, direction (`reverse`), character type, visual variant and
`walkTime`. Speeds are selected once between 0.9 and 1.8 world units per second.
River chunks retain walkers only at the bridge-bearing starting chunk of a river
loop; their route spans the larger riverside area.

`pedestrianRoute()` maps phase plus signed speed times route time onto a
rectangular loop. Ordinary sidewalks use four 42-unit sides (168 units total),
with corners at local coordinates 11 and 53. River loops use widths of 170 and
lengths of 106 (552 units total) for legacy river states. Generated river walkers
use the explicit upper/lower routes described below.

## Lower riverside paths and stairs

Each generated river population starts four walkers on the lower paths, two on
each bank, with the remaining ten on the upper loop. Opposing normal walkers
use separate lanes. Explicit route progress controls position; `walkTime` still
controls animation and only advances on accepted movement.

At each stair approach, a walker makes one random choice: 25% take the stairs,
75% keep walking. A queued choice is retained rather than rerolled every frame.
The queue stops 1.5m before the junction so it leaves the exit available.

Stairs and their connecting landings are reserved by bridge, bank and direction.
Walkers travelling the same direction may follow with normal spacing. Opposing
walkers wait until all occupants have left. A walker cannot finish the route or
release its reservation until the destination path has space, on either level.
Reservations are reconstructed from loaded occupants, so unloading an area
cannot leave a stale lock.

All river owners advance together with a spatial collision index, including
nearby walkers from other chunks and the player. Ground height separates the
upper bridge/promenade from the lower path. Rendering and conversations use the
same explicit ground height, including the stair treads. The ordinary sidewalk
WASM resolver remains responsible for other pedestrians.

`pedestrian()` evaluates the current position, facing direction and sprite frame.
It uses `walkTime` when present, so stopping that clock stops route progress
without having to reconstruct a world position. Crossing and park-detour states
provide alternative position calculations. Animation and front/back sprite
selection are rendering concerns derived from this movement state.

## Planning and accepting a movement step

`City.advancePedestrians()` handles crossings first, then plans ordinary movement
per chunk. It computes before/after positions and marks steps held or blocked by
the player, solid world geometry or crossing walkers. Park path transitions are
part of the proposed position, so collisions check the route actually being taken.

Collision resolution uses the shared snapshot of planned moves. Accepted walkers
advance their clock and commit route/sideways changes; blocked walkers retain
their previous position. Stops propagate backwards through queues within the same
update. For walkers moving in the same direction, the follower stops rather than
pinning the leader. Ordinary walker clearance is 0.85 units; player interaction
uses a larger 1.275-unit bump radius and permits an overlapping actor to retreat.

The JavaScript broad phase uses four-unit spatial cells around swept movement
bounds. Pair ordering is stable. Reused position maps, pair arrays and cell pools
reduce repeated allocation; position references are cleared after the phase.
Crossing walkers use a separate spatial lookup that updates each accepted move
immediately, allowing later walkers to see the new position.

## WASM collision resolution

The collision wrapper is normally called once per chunk's ordinary movement batch.
It packs before/after x/z coordinates into a reusable `Float64Array` view and
initial blocked flags into a `Uint8Array`. C resolves potential collisions and
returns blocked flags through another `Uint8Array`. Walker objects and route
state remain in JavaScript.

This kernel has its own WASM instance and memory; it is separate from the shared
static-object geometry generator. Its current capacity is 512 walkers per batch.
The C resolver uses spatial hashing and pair bitsets, iterating until stopped
movement no longer changes other walkers' decisions.

The wrapper uses the JavaScript resolver if WASM cannot load, capacity/storage
limits are exceeded, inputs are unsupported, or a distance comparison is too close
to a floating-point boundary. It publishes no partial WASM result on fallback.
This preserves the JavaScript behaviour rather than silently dropping checks.

## Passing, conversations and deadlock recovery

Opposing sidewalk walkers approaching within 1.2 units can reserve one participant
to step aside. The forward walker is chosen consistently rather than by array
iteration order. Its states are `out`, `wait` and `back`, with a maximum offset
of 1.3 units and sideways speed of 1.8 units per second. Forward route progress
is held while it yields. The partner initially waits for room to pass.

Conversation waiters remain stopped while the player blocks any participant's
forward route. Nearby walkers can join that waiting group. Place-specific lines
are reported to the game's dialogue system. Walkers intentionally talking do not
use ordinary turnaround recovery to walk away during the encounter.

Blocked movement accumulates `stuckTime`. After 1.5 seconds, the code can recover
an interrupted sidestep or reverse an eligible walker after checking that the new
route is clear. A three-second turnaround cooldown prevents immediate oscillation.
Detours reverse along their existing path; normal route reversal adjusts phase to
preserve position. Recovery does not teleport walkers past obstacles.

## Park footpaths

`footpathStep()` detects reaching a path entrance and stores a random choice to
enter or remain on the pavement. A blocked step retains that choice rather than
rerolling every frame. Walkers taking the path receive a detour with its own
position/direction evaluation. At the far end they choose a sidewalk direction
and rejoin the loop. Detour progress is committed only with accepted movement.

## Road crossings and traffic coordination

At suitable sidewalk corners, a walker has a 50% crossing attempt. Only painted
crossings on the north and west pavement edges are used. The neighbouring chunk
must be loaded and must not be a river chunk.

A crossing state stores its origin, direction, progress, target chunk and a
request position on the stripes. Traffic sees those requests before pedestrian
advancement. The walker waits for `Traffic.canCross()` before starting; see
[Traffic movement](TRAFFIC-MOVEMENT.md) for braking and committed vehicles.

A crossing covers 22 units at the walker's speed. Movement still checks the player
and other walkers. Opposing crossing pedestrians have their own sideways yielding
states so they can pass while remaining associated with the same crossing request.

At completion, the walker is removed from the source chunk and added to the target
chunk. Direction and phase are adjusted to join the target sidewalk continuously;
a one-update exit marker prevents immediately handling the arrival as another
crossing. Waiting/crossing walkers are excluded from the ordinary sidewalk update
so they are not advanced twice.

## Lifetime and validation

Walker state normally lives in its chunk's `people` array. Crossing transfers
change that owner; discarding a chunk removes its normal city ownership. Crossing
partner/target references and other active gameplay state can extend lifetimes.
There is no persistent movement-history store for unloaded ordinary walkers.
Conversation waiter entries for absent walkers are removed on later updates.

Run `npm test`. [`tests/world.test.mjs`](tests/world.test.mjs) exercises routes,
passing, queues, player obstruction, footpaths, crossings and recovery.
[`tests/pedestrian-collisions.test.mjs`](tests/pedestrian-collisions.test.mjs)
checks WASM/JavaScript parity, supported bounds and fallback behaviour.
