# Voxel Dragon

A proof of concept: a 3D voxel grid with a pixel-art dragon at the origin. Every voxel runs through a stack of composable effects each frame. See [DESIGN.md](../DESIGN.md) for the architecture.

## Run

ES modules need HTTP, so `file://` won't work:

```sh
cd dragon && python3 -m http.server 8765
# open http://localhost:8765
```

Three.js 0.160.0 and lil-gui 0.19.2 load from jsDelivr, so there's no install or build step.

## Check

```sh
node tools/smoke.mjs   # headless: model build, identity stack, every effect + preset, JSON round-trip
```

## Regenerate the sprite draft

```sh
node tools/png-to-sprite.mjs iamadragon.png 32
```

Hand-clean the output into `src/model/dragonSprite.js`.

## Adding an effect

1. Create `src/effects/MyEffect.js` that extends `Effect`.
2. Set `static type`, `schema`, `defaults` and `defaultEnvelope`.
3. Implement `apply(work, model, indices, ctx, env)`. Call `env.value(i)` per voxel and write through `writeOffset` and `writeScale`, or write to `work.colour` directly.
4. Register it in `src/effects/index.js`.

The panel controls and JSON presets are generated from the schema.

The running app is exposed as `window.voxelDragon` for console experiments, for example `voxelDragon.stack.add('Jitter', { params: { amplitude: 1 } })`. Call `voxelDragon.loadState(voxelDragon.getState())` afterwards to refresh the panel.
