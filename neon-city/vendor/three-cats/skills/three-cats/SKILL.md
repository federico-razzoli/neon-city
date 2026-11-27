---
name: three-cats
description: Integrate the three-cats plugin into a Three.js scene when adding an animated cat, wiring up petting and purring, or preserving its behaviour across scene changes.
---

# Integrate a Three.js cat

Import `createCat` from the plugin’s `cat.js` ES module. Pass the host application's Three.js namespace, scene, and camera. Set `position` to the point beneath the paws in scene coordinates. At zero rotation the cat faces local positive Z.

```js
const cat = createCat(THREE, { scene, camera, position });
```

Connect the instance to three places in the host application:

- **Render loop.** Call `cat.update()` before rendering. For positional purring, pass `cat.update({ audioContext })` with the application's running Web Audio context.
- **Interaction handler.** When the player pets this cat, call `cat.state.pet()` once for that interaction. The first touch wakes a sleeping cat. A subsequent touch while awake starts or extends a purr. The return value indicates whether the cat is purring.
- **Scene teardown.** Call `cat.dispose()` when removing the model. To carry its wake and purr timers into a replacement scene, retain `cat.state` and pass it as the next instance’s `state` option.

For custom timings, pass `purrDurationMs` and `awakeDurationMs` to `createCat`. If supplying a state explicitly, configure those durations when calling `createCatState`. Each cat normally has its own state.

See the [plugin argument reference](https://github.com/federico-razzoli/three-cats#arguments) for defaults, units, and method signatures.
