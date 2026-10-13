// Wiring + render loop (DESIGN.md §3, §5).
import { extrudeDragon } from './model/Extruder.js';
import { EffectStack } from './effects/index.js';
import { Clock } from './core/Clock.js';
import { compose } from './render/Composer.js';
import { VoxelRenderer } from './render/VoxelRenderer.js';
import { CameraRig } from './camera/CameraRig.js';
import { Panel } from './ui/Panel.js';
import { PRESETS } from './ui/presets.js';

const DEFAULT_SETTINGS = {
  globalOffsetStrength: 1,
  voxelSize: 0.96,
  showInterior: false,
  showGrid: true,
  flat: false,
  background: '#1b1f2a',
};

const container = document.getElementById('app');
const hud = document.getElementById('hud');

const model = extrudeDragon();
const clock = new Clock();
const stack = new EffectStack(model);
const renderer = new VoxelRenderer(container, model);
const rig = new CameraRig(renderer.renderer.domElement, container.clientWidth / container.clientHeight);

const app = {
  model, clock, stack, renderer, rig,
  settings: { ...DEFAULT_SETTINGS },

  getState() {
    return {
      global: { ...this.settings, timeScale: clock.timeScale, paused: clock.paused, period: clock.period },
      camera: rig.toJSON(),
      effects: stack.toJSON(),
    };
  },

  loadState(state) {
    const g = { ...DEFAULT_SETTINGS, timeScale: 1, paused: false, period: 2, ...(state.global || {}) };
    clock.timeScale = g.timeScale;
    clock.paused = g.paused;
    clock.period = g.period;
    for (const k of Object.keys(DEFAULT_SETTINGS)) this.settings[k] = g[k];
    renderer.setGridVisible(this.settings.showGrid);
    renderer.setFlat(this.settings.flat);
    renderer.setBackground(this.settings.background);
    rig.load(state.camera || {});
    stack.load(state.effects || []);
    panel?.refresh();
  },

  saveJSON() {
    const blob = new Blob([JSON.stringify(this.getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'voxel-dragon-preset.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  openJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      try {
        this.loadState(JSON.parse(await input.files[0].text()));
      } catch (err) {
        alert(`Could not load preset: ${err.message}`);
      }
    };
    input.click();
  },

  copyLink() {
    writeHash();
    navigator.clipboard?.writeText(location.href);
  },
};

// URL hash persistence (DESIGN.md §10): #s=<base64url JSON>.
const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
let lastHash = '';
function writeHash() {
  const h = `#s=${encode(app.getState())}`;
  if (h !== lastHash) {
    history.replaceState(null, '', h);
    lastHash = h;
  }
}
function readHash() {
  const m = location.hash.match(/^#s=(.+)$/);
  if (!m) return null;
  try {
    return decode(m[1]);
  } catch {
    return null;
  }
}

let panel = null;
app.loadState(readHash() || PRESETS.Idle);
panel = new Panel(app);
window.voxelDragon = app; // handy for console experiments

// Camera state changes every frame while orbiting, so persist on a slow timer.
setInterval(writeHash, 1000);

function resize() {
  renderer.resize(rig.camera);
}
window.addEventListener('resize', resize);
resize();

// Render loop.
let fpsFrames = 0, fpsT = performance.now(), fps = 0, effectsMs = 0;
function frame(now) {
  const ctx = clock.tick(now);
  const work = stack.run(ctx);
  const count = compose(model, work, renderer.matrixArray, renderer.colourArray, {
    globalOffsetStrength: app.settings.globalOffsetStrength,
    voxelSize: app.settings.voxelSize,
    includeInterior: app.settings.showInterior || stack.needsInterior,
  });
  renderer.upload(count);
  rig.update(clock.realDt);
  renderer.render(rig.camera);

  effectsMs = effectsMs * 0.9 + stack.lastMs * 0.1;
  fpsFrames++;
  if (now - fpsT > 500) {
    fps = (fpsFrames * 1000) / (now - fpsT);
    fpsFrames = 0;
    fpsT = now;
    hud.textContent = `${fps.toFixed(0)} fps · effects ${effectsMs.toFixed(2)} ms · ${count}/${model.count} voxels · t ${clock.t.toFixed(1)}s`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
