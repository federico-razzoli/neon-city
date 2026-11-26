# Companions

## Shared behaviour

These rules apply to every companion. Dialogue varies with the companion and the player's location.

### Following the player

On an ordinary street, the companion heads straight toward the player's current position at up to 4 game units per second. When the player turns a corner, the companion aims toward the player's new position. It stops advancing once it is within 1.6 units of the player.

The companion faces the direction it actually moves. Distance travelled advances its four-frame walking animation, so the frame stays still when the companion stops.

### At the river

- **Stairs.** The companion uses the stairs between the upper promenade and the lower river walk, even when the player cuts across the side of the staircase.
- **Bench.** When the player sits down, the companion approaches the free end of the bench, walking around an armrest if needed. Once in front of the seat, it pauses for two seconds and sits beside the player. While both share the bench, the player can turn past the usual 45° limit toward the companion until their face is centred. As the player turns past 45° on that side, the camera gradually allows a deeper downward tilt so the player can see the ground at the companion’s feet.
- **River gate.** The companion moves alongside the player and turns to face the opening.
- **Ice-cream van.** When the player boards, the companion approaches the rear of the van and walks up the ramp.
- **Waiting.** Once the companion reaches the river, it waits there if the player heads back into the city. It resumes following if the player returns to the river before the separation reaches 20 units. The usual warning and departure rules apply while it waits.

### Separation and departure

Measure separation as the straight-line horizontal distance between the player and the companion, including around corners and on stairs.

- **Over 16 and under 20 units.** The companion calls “HEY! WAIT FOR ME!” once. Returning to 16 units or closer allows another warning the next time the player gets too far ahead.
- **20 units or more.** The companion begins leaving immediately. Outdoors it retraces its own recent path at 1.3 units per second. Indoors it heads for the door. It disappears when it finishes its departure route or after 12 seconds, whichever comes first.
- **Entering a venue or room.** Each companion has its own set of venues and rooms it can enter. If the player enters a place outside that set, the companion disappears immediately.

## Lisa

To invite [Lisa](CHARACTERS.md#street-pedestrians-and-pub-patrons) on a date at a riverside pub, sit opposite her and, during the same conversation, give her a flower and choose “I DON'T JUDGE PEOPLE BASED ON THOSE THINGS.” This unlocks “WOULD YOU LIKE TO GO TO NIGHT RIVER WITH ME?” Lisa becomes a companion when she accepts. She stays seated until the player stands, then walks around the table to join them.

Lisa's date takes her from the pub where she accepted the invitation onto the street and to Night River. Entering another room or going back inside a venue ends the date. Afterward, the player can meet her in a riverside pub again.
