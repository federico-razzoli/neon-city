# Three.js counter cat

A small black cat for a Three.js scene. It sleeps, stretches awake when petted, follows a nearby camera with its eyes and head while sitting, and purrs when petted again. The model and sound are generated at runtime.

## Use in a browser

Copy `counter-cat.js` into your application and import it as an ES module. Pass the same Three.js namespace used to create your scene and camera. The plugin needs no external assets or build step.

```js
import {createCounterCat} from './counter-cat.js';

const cat = createCounterCat(THREE, {
  scene,
  camera,
  position: new THREE.Vector3(0, 1, 0),
  purrDurationMs: 5000,
  awakeDurationMs: 30000,
  rotationY: Math.PI / 4
});
```

Place the origin at the surface beneath the paws. The cat faces local positive Z. Position defaults to the parent scene origin and rotation defaults to zero radians.

Timing options accept finite, nonnegative numbers in milliseconds.

| Option | Default | Effect |
| --- | --- | --- |
| `purrDurationMs` | 10000 | Length of a new purr. Petting during a purr adds twice this duration. Set to zero to disable purring. |
| `awakeDurationMs` | 20000 | Time after the most recent pet before the cat starts lying down. The transition takes another 2500 ms. |

When sharing a state, set these options on `createCatState({purrDurationMs, awakeDurationMs})`. A supplied state owns its timers.

- Call `cat.update({audioContext})` before each render. Supply a running Web Audio context to hear positional purring. Calling `cat.update()` animates the cat silently.
- Call `cat.state.pet()` when your interaction handler detects a pet. The first touch wakes a sleeping cat. Another touch while awake starts or extends the purr and resets the awake timer. The return value tells you whether the cat is purring.
- Call `cat.dispose()` when removing the cat to release its geometry, materials, and audio resources.
- To preserve interaction state across scene changes, create it with the exported `createCatState()` and pass it as the `state` option each time you create the model. By default each cat gets its own state.

`state.pose()` returns the sitting and stretching weights. Both `pose(now)` and `pet(now)` accept an optional timestamp in milliseconds on the browser performance clock. `state.purrUntil` uses the same clock. The optional `refDistance` controls the distance at which the purr begins to attenuate (default 2.58 scene units, maximum audible distance 4.5). The plugin uses the supplied audio context as the Three.js audio context and attaches its listener to the camera on the first audible purr.

## License

GNU Affero General Public License, version 3 only. See LICENSE.
