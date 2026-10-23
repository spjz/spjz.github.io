# Voxel Scene

A React Three Fiber component that renders a pixel-art voxel subject (a cartoon dragon by default) and runs a stack of composable per-voxel effects every frame. It's built to be a **portfolio background**, and is equally usable as an interactive scene.

| Doc | What |
|---|---|
| [DESIGN.md](DESIGN.md) | Engine design: model, effects, envelope, composer |
| [docs/REACT_DESIGN.md](docs/REACT_DESIGN.md) | React package design: props, diffing, drivers, subjects |
| [poc/](poc/) | The original vanilla proof of concept, kept as the parity reference |

## Quick start

```sh
npm install
npm run dev             # playground   → http://localhost:5173 (every prop + live effect panel)
npm run dev:portfolio   # portfolio example → next free port, e.g. :5174 (background usage)
```

## Workspace

```text
packages/voxel-scene/      the component library (@dragon/voxel-scene, private, not published)
  src/core/                engine: no React, no Three.js, no DOM  →  @dragon/voxel-scene/core
  src/subjects/            dragon sprite + sprite / voxels / image / .vox builders
  src/react/               VoxelScene, VoxelBackground, VoxelSubject, VoxelCamera, VoxelGrid, hooks
  src/debug/               leva panel (lazy; needs `leva`)  →  @dragon/voxel-scene/debug
apps/playground/           Vite app: every prop on a panel, presets, JSON save/load, URL hash
apps/portfolio-example/    Vite app: lazy background, scroll-driven burst, click-to-startle
tests/                     Vitest engine suites + Playwright visual tests (tests/visual)
tools/png-to-sprite.mjs    PNG → ASCII sprite draft (fixed palette or --auto k-means)
```

## Usage

```jsx
import { VoxelScene } from '@dragon/voxel-scene';

<VoxelScene preset="Idle" grid controls />
```

As a page background (fixed, transparent, click-through, pauses off-screen, respects reduced motion):

```jsx
const VoxelBackground = lazy(() => import('@dragon/voxel-scene').then((m) => ({ default: m.VoxelBackground })));

<Suspense fallback={null}>
  <VoxelBackground
    ref={scene}
    effects={[
      { id: 'wings', type: 'PartRotate', selector: 'wings', params: { angle: 30 }, envelope: { period: 1.4 } },
      { id: 'burst', type: 'Explode', envelope: { driver: 'scroll', shape: 'easeInOut' } },
      { id: 'boom', type: 'Explode', envelope: { mode: 'once', shape: 'adsr', period: 1.6 } },
    ]}
    scrollTarget="#work"
    position={[20, 0, 0]}
    parallax={6}
  />
</Suspense>
<button onClick={() => scene.current.trigger('boom')}>Startle</button>
```

### Main props

| Group | Props |
|---|---|
| Subject | `subject` (`'dragon'`, a sprite/voxels/image/vox definition, or a `VoxelModel`), `scale`, `position`, `rotation`, `lookAtPointer` (`true` or { maxYaw, maxPitch, smoothTime, eyeHeight, depth, target }: faces the viewer, then turns towards the cursor, or towards `target`, a fixed viewport point, when set), `voxelSize`, `showInterior` |
| Effects | `preset` (`Idle`, `Party`, `Explode loop`, `Wave`) or `effects` (array, diffed by `id`), `offsetStrength` |
| Animation cycle | `envelope` (defaults for every effect), `period`, `timeScale`, `paused`, `driver` (`'time'`, `'scroll'`, `'pointer'` or a function), `scrollTarget` |
| Camera | `camera` ({ azimuth, elevation, distance, target, fov }; changes animate), `cameraPreset`, `transition`, `autoOrbit`, `drift`, `parallax`, `onCameraChange` |
| Visibility | `controls`, `grid`, `axes`, `shadow`, `debug` |
| Look | `background` (`'transparent'` or a colour), `lighting` (`'lit'`, `'flat'`), `pixelate` |
| Performance / accessibility | `quality` (`'auto'`, `'low'`, `'high'`), `pauseWhenHidden`, `reducedMotion` (`'respect'`, `'ignore'`, `'static'`), `fallback` |
| Events | `onReady(api)`, `onFrame(ctx, api)`, `onSubjectClick(hit, api)` (window-level voxel hit-test; works behind click-through backgrounds; ignores links/buttons, drags and selections; `subjectCursor` while hovering), and `ref` → `trigger(id, { restart })`, `setEffect`, `goTo`, `pause`, `play`, `snapshot`, `getState` |

Every prop is JSDoc-typed. Run `npm run types` to emit `.d.ts` files to `packages/voxel-scene/types/`.

### Effects

Built in:
- `Colour`: tint, multiply, add, hueRotate, gradient or rainbow
- `Scale`
- `WaveTranslate`
- `Jitter`
- `Explode`
- `PartRotate`
- `Blink`
- `Bob`

Each effect has `selector`, `strength`, `offsetStrength`, `params` and an `envelope`. The envelope takes:
- `shape`: one of 8 shapes
- `period` and `phase`
- `min` and `max`
- `spatial` phase
- `mode`: `'loop'` or `'once'`
- `driver`

A custom effect is a single call:

```js
import { defineEffect } from '@dragon/voxel-scene';

const Sink = defineEffect({
  type: 'Sink',
  schema: [{ key: 'depth', type: 'number', min: 0, max: 10, step: 0.1 }],
  defaults: { depth: 3 },
  apply(work, model, indices, ctx, env) {
    for (const i of indices) this.writeOffset(work, i, 0, -this.params.depth * env.value(i), 0);
  },
});

<VoxelScene effects={[{ id: 'sink', type: Sink }]} />
```

`schema` drives the debug panel automatically. Call `registerEffect(Sink)` to use it by name in JSON presets.

### Envelope drivers

- **`time`**: loops over `period`.
- **`scroll` / `pointer`**: 0–1 progress, eased. A single cycle clamps instead of wrapping, and `spatial` phase becomes a per-voxel stagger, so progress 0 is always fully at rest.
- **`mode: 'once'`**: holds the end value until `ref.current.trigger(id)` is called, then plays one cycle.

## Checks

```sh
npm test               # Vitest: engine, PoC parity, diffing, envelopes, look angles, portfolio content, section helpers (67 tests)
npm run test:visual    # Playwright (one worker; WebGL): presets, palette, cursor tracking, click-to-explode, portfolio page, section snap scrolling, level experiences, the production build under /resume/ (record with -- --update-snapshots)
npm run typecheck      # tsc --checkJs over the package
npm run lint           # Biome
npm run build          # production builds of both apps
npm run og             # re-render the portfolio share image (apps/portfolio-example/public/og.png)
```

## Deploy

The portfolio (`apps/portfolio-example`) is published to GitHub Pages at <https://spjz.github.io/resume/> by `.github/workflows/pages.yml` on every push to `master`. The workflow runs the unit tests, builds the portfolio, checks the email address isn't in the build, and deploys `apps/portfolio-example/dist`.

- One-off repo setting: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- Builds use the `/resume/` base path. Set `BASE_PATH=/` when building for a custom domain at the root.
- To try the production build locally, exactly as Pages serves it:

```sh
npm run build -w @dragon/portfolio-example
npx vite preview apps/portfolio-example   # → http://localhost:4173/resume/
```

## Notes

- **Colour:** `<Canvas flat>` (no tone mapping) is deliberate. R3F's default ACES shifts the palette, and the visual test guards against that.
- **Debug panel:** `debug` lazy-loads leva and drei's `StatsGl`. Production backgrounds never download them.
- **Console warning:** the `THREE.Clock … deprecated` warning comes from R3F 9 internals with three 0.186, not from this package.
- **Selectors:** a selector the subject doesn't define (for example `wings` on a custom image) selects nothing and warns once. It never falls back to every voxel.
