# KNOT — a study in tension

An original, scroll-driven 3D study of a single glass torus knot. Not a clone:
the object, the lighting rig, the backdrop and the pool of light under it are all
generated at runtime.

Six chapters, a camera that travels through true depth, and a material that has
to be seen to be believed.

## Fly it

- **Scroll** — approach, enter, and pull back
- **Drag** — turn the knot (it keeps its momentum)
- Move the pointer — parallax
- Reduced motion? The lag, the idle spin and the cue animation switch off.

## What's inside

```
main.js                       scene, environment, camera path, scroll, pointer, grain
styles.css                    editorial type, chapters, intro/outro, HUD, cursor
vendor/three.*.min.js         three.js r180 (MIT), vendored
vendor/addons/                EffectComposer + UnrealBloomPass + OutputPass
```

- **Object** — `TorusKnotGeometry(1, 0.32, 420, 64)` in a `MeshPhysicalMaterial`
  with full transmission, thickness, clearcoat and a thin-film iridescence.
- **Light** — a softbox strip rig painted into an equirectangular canvas and
  prefiltered through `PMREMGenerator`. No HDR file, no lights-only trickery.
- **Post** — `UnrealBloomPass` over the specular hits, then `OutputPass` applies
  ACES tone mapping on the way out.
- **Camera** — six keyframes eased along the scroll, so the move through Z is
  real geometry, not parallax layers.
- **Type** — six chapters with masked lines that rise in on entry, a title card
  that clears on the first scroll, and a closing card at the end.
- **Ground** — an additive pool of light, so the knot sits in a space.

No textures, no model files, no build step. Open `index.html`.

## Credits

Built with [three.js](https://threejs.org) (MIT). Type set in the system serif
stack. Everything else is original.
