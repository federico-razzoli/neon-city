# Statistical street population

Status: design goal, not yet implemented.

## Goal

Pedestrians and cars that the player cannot see should cost no simulation time.
Instead of moving every character and car in every loaded chunk in real time,
the game should only simulate the ones that can be seen. Unseen ones are not
tracked: they appear where and when they would be *likely* to appear, and
disappear once they can no longer be seen.

This applies to pedestrians and cars alike, outdoors and in venues.

## Current behaviour

- On the street, every car and pedestrian in every loaded chunk is simulated in
  full each frame: routes, road crossings, stepping aside, collisions and
  queuing at junctions. This includes chunks beyond the street draw distance
  (170 units; 260 for river chunks), characters beyond the 105-unit character
  draw cutoff, and objects hidden in fog.
- Inside the bookshop and the Blue Note, the whole loaded area is still
  simulated in full, although the windows show only a small part of it.
- Inside venues without windows, the street freezes: cars and pedestrians
  stop where they were and resume when the player leaves.
- Pedestrians are created with their chunk, belong to it, and are handed from
  chunk to chunk when they cross a road. Cars are owned separately by the
  traffic system.

## Principles

- **Visibility is not extended.** Characters and cars keep today's limits: the
  105-unit character cutoff, the street draw distance and the fog. "Coming out
  of the fog" is shorthand: newcomers appear only where the player cannot see
  them, then walk or drive into view as usual.
- **Only what can be seen is simulated faithfully.** Crossing, stepping-aside
  and junction behaviour that nobody can see is not reproduced.
- **Cars and characters are treated uniformly** wherever the policy is the
  same.
- **Characters with identity are never replaced by statistics.**

## Population manager

A single population manager owns every pedestrian and car. It takes that
ownership away from chunks and from the traffic system, and is the only place
that decides which actors exist and how they are simulated. Movement itself
stays with the existing pedestrian and traffic logic; the manager decides who
it runs for.

Each actor carries a few properties the manager uses:

- **Simulation level:** *full* while seen; *dropped* once it has been unseen for
  longer than the grace period.
- **Protected:** whether the actor has identity and must never be dropped.
- **Last seen:** when the actor was last in the seen area, for the grace period.

### Seen and unseen

An actor is **seen** when it is within draw distance and inside the camera's
view, or inside a window's view while the player is in a venue. Everything
else is **unseen**.

Seen actors are simulated in full, with all current interactions. Unseen actors
that are not protected are not simulated at all.

### Spawn points

Newcomers appear only where they are unseen:

- beyond the distance at which characters or cars are drawn;
- outside the camera's view, including behind the player;
- outside every window's view, when the player is inside a venue.

Positions hidden only by buildings are also unseen, but the renderer does not
currently compute occlusion, so they are not used as spawn points.

### Appearing

- Spawn rates follow each street's expected density and flow, so busy streets
  stay busy and quiet ones stay quiet.
- Pedestrians start on a valid route position and cars in a valid lane and
  direction.
- A newcomer must not overlap anyone or anything already present, and must not
  start in the middle of a crossing or a junction manoeuvre.

### Disappearing

- An actor that leaves the seen area keeps its state for a short grace period.
  If the player turns back quickly, it is still roughly where it was.
- After the grace period, an unprotected actor is dropped and may later be
  replaced by a statistical newcomer.

### Protected actors

These keep their identity and are simulated normally wherever they are:

- the active companion;
- anyone the player is talking to or has just bumped into;
- characters holding an item or otherwise carrying state, such as a carried
  ice cream;
- river walkers with dialogue and other characters with lines;
- fixed characters such as the ice cream vendors.

## Chunks

A chunk no longer creates or owns pedestrians. It describes how busy its
streets and paths are, and the manager uses that description to set spawn rates
and initial densities. Actors are created and dropped as the player moves.

The city's random number generator is stateful, so taking pedestrians out of
chunk generation changes the sequence of random values chunk generation uses.
Any layout that relies on that sequence must be checked.

## Venues

### With windows (bookshop, Blue Note)

- Only actors inside the windows' view are seen and simulated in full.
- Passers-by appear in the windows at believable rates.
- Actors seen through a window keep their identity. When the player leaves,
  they continue from where they were last seen.

### Without windows

- Nothing outside is simulated, as today.

### Leaving any venue

On exit, the manager performs one tidy-up step:

- returns any pedestrian left in the middle of a crossing or a step-aside to
  their normal route;
- places cars along the roads with sensible gaps, not overlapping each other
  or sitting on an occupied crossing;
- fills the street to its expected density outside the player's initial view.

For venues without windows this replaces resuming the frozen street, so time
appears to have passed outside.

## Why not an Entity Component System

Adopting an Entity Component System first was considered and rejected:

- It would be a rewrite, not a refactor. Pedestrian logic, traffic, river
  walkers, companions and the renderers all treat actors as plain objects held
  in chunk lists.
- It does not address the problem. Its main benefits are flexible composition
  and fast iteration over many entities. The game has at most a few hundred
  actors, and the difficult part is the policy (who exists, where newcomers
  appear, who is protected), which is the same with or without it.
- Rewriting risks breaking specific behaviours, such as crossings, stepping
  aside, conversations and companions yielding to the player, in ways that are
  hard to notice.

If the actors later clearly need a component structure, the population manager
is the natural place to introduce one gradually.

## Implementation order

1. Introduce the population manager and move ownership of pedestrians and cars
   into it, without changing behaviour.
2. Add the per-actor properties: simulation level, protected and last seen.
3. Build statistical spawning, the grace period and dropping on top of them.
4. Apply the same rules to venues, including the tidy-up step on exit.

## Non-goals

- Extending character, car or street visibility.
- Faithful simulation of anything the player cannot see.
- Persisting unseen ordinary pedestrians or cars after they are dropped.
- Converting the game to an Entity Component System.

## Related

- [Pedestrian movement](PEDESTRIAN-MOVEMENT.md)
- [Traffic movement](TRAFFIC-MOVEMENT.md)
- [Companions](COMPANIONS.md)
