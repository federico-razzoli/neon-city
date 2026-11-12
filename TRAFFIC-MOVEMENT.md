# Traffic movement and implementation

Traffic is a persistent JavaScript simulation over the currently loaded city.
Car rendering uses cached WASM-generated geometry, but movement, braking, junction
priority and spawning are implemented in JavaScript.

For the other half of road-crossing coordination, see
[Pedestrian movement](PEDESTRIAN-MOVEMENT.md). For car model caching, see
[Object geometry caching](OBJECT-GEOMETRY-CACHING.md).

## Main implementation

- [`world.js`](neon-city/world.js): `traffic(chunk, time)` produces candidate cars;
  road layout, river rows, bridge availability and ground height live here too.
- [`traffic.js`](neon-city/traffic.js): `Traffic` owns active cars and implements
  spawning, spacing, crossings, junction priority and riverside turns.
- [`game.js`](neon-city/game.js): calls the simulation, handles player/car contact,
  horn warnings and draws the resulting positions.

A car stores world coordinates, `axis` (0 moves along z, 1 along x), `dir` (-1 or
+1), appearance, speed and waiting state. Optional turn and crossing-decision
state are retained between updates. Cars retain identity while slowing, waiting
and crossing chunk boundaries.

## Candidate streams and lifetime

`world.traffic()` derives candidate positions from time, lane and stream identity.
Normal streams use 67.5-unit nominal spacing with stable per-car jitter; successive
gaps are approximately 65–70 units. Riverside streams start with 64-unit spacing
and are thinned by `Traffic.update()` to leave room for merging traffic. Stable
stream identifiers also select appearance. Current model weights are ordinary
car 10, taxi 1, hippie van 1 and Mercedes 1.

`Traffic.update()` reconciles those candidates with its persistent `cars` array:

1. Remove cars whose current tile is no longer loaded.
2. Refresh lane spawn locks and consider incoming candidates.
3. Reject candidates too close to the player, crossing requests or another car;
   reject unsafe junction arrivals and inappropriate river-road candidates.
4. Avoid respawning a stream car that should already exist in the loaded area.
5. Advance the accepted persistent cars and retain the loaded-tile set for the
   next update.

Two or more waiting cars can lock a lane against new spawns. Locks track those
waiting cars and clear when they leave or stop waiting, preventing an indefinitely
expanding queue of newly spawned vehicles.

## Following and braking

Cruising speed is 10 world units per second. Acceleration and braking constants
are both 4 units per second squared. The following clearance reserves a nine-unit
centre-to-centre headway.

`advance()` divides elapsed movement into steps of at most 0.04 seconds. Each
step constructs a `RoadIndex`: cars are indexed on both axes in three-unit-wide
transverse strips, with entries sorted by longitudinal position. Binary searches
limit following-distance and junction-exit queries to nearby cars. Index entries
are refreshed immediately after each car's movement, including early returns.

Available travel is constrained by the car ahead, crossing stops, junction
priority and turning/merging conflicts. A braking-distance envelope caps speed
before reaching a stop position. Waiting cars accelerate again when clearance
opens. These rules are local traffic coordination, not destination-based routing.

## Ordinary junction priority

Approaching cars are grouped by their nearest junction. The approach region
extends 31.5 units from the centre; the stop position is 17 units before it,
keeping the vehicle outside the painted crossing.

The simulation records estimated arrival times and retains a junction owner so
priority does not change arbitrarily every frame. Vehicles already inside clear
first. Otherwise, eligible approaches with a clear exit are ordered by arrival,
with axis and direction as tie-breakers. Parallel lanes can share priority when
that does not overtake waiting cross-traffic. An occupied exit can prevent entry.
Riverside merges use their separate turning rules.

## Painted crossings and pedestrians

`occupiedCrossings()` recognises the painted crossing regions and describes the
road axis, street coordinate and crossing interval. `advance()` combines the
player and pedestrian requests, deduplicating requests for the same crossing.

A vehicle decides whether it has enough braking distance to stop at the approach
line. That decision is retained for the active crossing, so a late arrival does
not suddenly brake or reverse after committing. A car already too close may
continue through; crossings do not force physically impossible stops.

`Traffic.canCross()` is the pedestrian-side safety check. A walker waits until
relevant approaching cars can stop or have passed far enough. Crossing requests
remain active while the walker crosses, holding traffic until the pavement is
reached. See [Pedestrian movement](PEDESTRIAN-MOVEMENT.md) for request creation,
waiting, sideways yielding and transfer between chunks.

## Rivers and turns

Road generation suppresses routes across water where no bridge exists. Cars
approaching those riverbank junctions turn onto the riverside road rather than
continuing into the river. Before turning, the car checks a merge area against
nearby traffic and waits if it is occupied.

Turns follow a radius-six quarter-circle. Travel advances the turn angle from
zero to pi/2; position is computed from that angle. On completion, the car changes
to the x axis and drops its turn state. Bridge surface elevation and slope are
applied when rendering; ground/collision helpers describe the same road surface.

## Game integration and validation

During an outdoor update, the game moves the player, updates loaded chunks, calls
`roadTraffic.update()` with player and pedestrian crossing requests, then advances
pedestrians using the resulting traffic state. Waiting cars remain solid and can
trigger horn/reply feedback; moving-car contact can push the player and produce a
warning. The game handles these player responses separately from lane following.

Run `npm test`. Traffic scenarios in [`tests/world.test.mjs`](tests/world.test.mjs)
cover spawning, queues, braking, occupied crossings, junction ownership, exit
blocking, river turns and interactions with pedestrians. Geometry-cache tests
check car appearance separately from movement.
