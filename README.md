# KNOT — a study in tension

An original, scroll-driven 3D study of a single glass torus knot. Not a clone:
the object, the lighting rig and the backdrop are all generated at runtime.

Five short chapters, a camera that travels through true depth, and a material
that has to be seen to be believed.

## Fly it

- **Scroll** — approach, enter, and pull back
- **Drag** — turn the knot (it keeps its momentum)
- Move the pointer — parallax
- Reduced motion? The lag and idle spin switch off.

## What's inside

```
main.js                 scene, environment, camera path, scroll, pointer, grain
styles.css              editorial type, chapters, HUD, cursor
vendor/three.*.min.js   three.js r180 (MIT), vendored
```

- **Object** — `TorusKnotGeometry(1, 0.32, 420, 64)` in a `MeshPhysicalMaterial`
  with full transmission, thickness, clearcoat and a thin-film iridescence.
- **Light** — a softbox strip rig painted into an equirectangular canvas and
  prefiltered through `PMREMGenerator`. No HDR file, no lights-only trickery.
- **Camera** — six keyframes eased along the scroll, so the move through Z is
  real geometry, not parallax layers.
- **Chapters** — headlines split into masked lines that rise in on entry.
- **Grain + vignette** — a live noise buffer and a CSS grade.

No textures, no model files, no build step. Open `index.html`.

## Credits

Built with [three.js](https://threejs.org) (MIT). Type set in the system serif
stack. Everything else is original.
