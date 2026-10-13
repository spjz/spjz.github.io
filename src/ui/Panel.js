// lil-gui control panel (DESIGN.md §10). Effect controls are generated from
// each effect class's static schema, so new effects need no UI code.
import GUI from 'lil-gui';
import { EffectStack } from '../effects/index.js';
import { SHAPES } from '../core/Envelope.js';
import { SELECTORS } from '../model/palette.js';
import { CAMERA_PRESETS } from '../camera/CameraRig.js';
import { PRESETS } from './presets.js';

const AXES = ['x', 'y', 'z'];

export class Panel {
  constructor(app) {
    this.app = app;
    this.gui = new GUI({ title: 'Voxel Dragon', width: 320 });
    this.buildGlobal();
    this.buildCamera();
    this.buildPresets();
    this.effectsFolder = null;
    this.buildEffects();
  }

  buildGlobal() {
    const { app } = this;
    const f = this.gui.addFolder('Global');
    f.add(app.clock, 'timeScale', 0, 3, 0.01);
    f.add(app.clock, 'paused').listen();
    f.add({ step: () => app.clock.step() }, 'step').name('step one frame');
    f.add(app.clock, 'period', 0.1, 10, 0.05).name('cycle period (s)');
    f.add(app.settings, 'globalOffsetStrength', 0, 3, 0.01).name('offset strength');
    f.add(app.settings, 'voxelSize', 0.1, 1.5, 0.01).name('voxel size');
    f.add(app.settings, 'showInterior').name('show interior');
    f.add(app.settings, 'showGrid').name('grid').onChange((v) => app.renderer.setGridVisible(v));
    f.add(app.settings, 'flat').name('flat shading').onChange((v) => app.renderer.setFlat(v));
    f.addColor(app.settings, 'background').onChange((v) => app.renderer.setBackground(v));
    this.globalFolder = f;
  }

  buildCamera() {
    const { rig } = this.app;
    const f = this.gui.addFolder('Camera');
    const apply = () => rig.apply();
    // Bind through getters so controllers follow rig.state even after load() replaces it.
    const proxy = {};
    for (const key of ['azimuth', 'elevation', 'distance', 'fov', 'autoOrbit', 'autoOrbitSpeed', 'damping', 'drift', 'driftAzimuth', 'driftElevation', 'driftPeriod']) {
      Object.defineProperty(proxy, key, { get: () => rig.state[key], set: (v) => { rig.state[key] = v; } });
    }
    for (const a of [0, 1, 2]) {
      Object.defineProperty(proxy, `target${AXES[a]}`, { get: () => rig.state.target[a], set: (v) => { rig.state.target[a] = v; } });
    }
    f.add(proxy, 'azimuth', -180, 180, 0.1).name('azimuth (°)').listen().onChange(apply);
    f.add(proxy, 'elevation', -10, 85, 0.1).name('elevation (°)').listen().onChange(apply);
    f.add(proxy, 'distance', 8, 200, 0.1).listen().onChange(apply);
    for (const a of AXES) f.add(proxy, `target${a}`, -40, 40, 0.1).name(`target ${a}`).listen().onChange(apply);
    f.add(proxy, 'fov', 20, 75, 1).name('fov (°)').listen().onChange(apply);
    f.add(proxy, 'autoOrbit').name('auto-orbit').listen();
    f.add(proxy, 'autoOrbitSpeed', -90, 90, 1).name('orbit °/s').listen();
    f.add(proxy, 'damping').listen().onChange(apply);
    const d = f.addFolder('Drift (envelope)').close();
    d.add(proxy, 'drift').name('enabled').listen();
    d.add(proxy, 'driftAzimuth', 0, 45, 0.5).name('± azimuth (°)').listen();
    d.add(proxy, 'driftElevation', 0, 30, 0.5).name('± elevation (°)').listen();
    d.add(proxy, 'driftPeriod', 0.5, 30, 0.1).name('period (s)').listen();
    const presets = {};
    for (const [name, p] of Object.entries(CAMERA_PRESETS)) presets[name] = () => rig.goTo(p);
    for (const name of Object.keys(CAMERA_PRESETS)) f.add(presets, name).name(`→ ${name}`);
  }

  buildPresets() {
    const { app } = this;
    const f = this.gui.addFolder('Presets');
    const actions = {};
    for (const name of Object.keys(PRESETS)) {
      actions[name] = () => app.loadState(PRESETS[name]);
      f.add(actions, name).name(`▶ ${name}`);
    }
    f.add({ save: () => app.saveJSON() }, 'save').name('Save JSON');
    f.add({ load: () => app.openJSON() }, 'load').name('Load JSON');
    f.add({ link: () => app.copyLink() }, 'link').name('Copy link');
  }

  /** Rebuild the effects folder after any structural change (add/remove/move/load). */
  buildEffects() {
    const { app } = this;
    const stack = app.stack;
    if (this.effectsFolder) this.effectsFolder.destroy();
    const f = (this.effectsFolder = this.gui.addFolder('Effects'));

    const adder = { type: EffectStack.types[0], add: () => { stack.add(adder.type); this.buildEffects(); } };
    f.add(adder, 'type', EffectStack.types).name('new effect');
    f.add(adder, 'add').name('+ add');

    stack.effects.forEach((e, idx) => {
      const C = e.constructor;
      const ef = f.addFolder(this.effectTitle(e, idx)).close();
      const retitle = () => ef.title(this.effectTitle(e, idx));
      ef.add(e, 'enabled').onChange(retitle);
      ef.add(e, 'name').onFinishChange(retitle);
      const btns = {
        solo: () => { stack.toggleSolo(e); this.buildEffects(); },
        up: () => { stack.move(e, -1); this.buildEffects(); },
        down: () => { stack.move(e, 1); this.buildEffects(); },
        remove: () => { stack.remove(e); this.buildEffects(); },
      };
      ef.add(btns, 'solo').name(stack.soloId === e.id ? '◉ unsolo' : '○ solo');
      ef.add(btns, 'up').name('↑ move up');
      ef.add(btns, 'down').name('↓ move down');
      ef.add(btns, 'remove').name('✕ remove');
      ef.add(e, 'selector', Object.keys(SELECTORS));
      ef.add(e, 'strength', 0, 2, 0.01);
      ef.add(e, 'offsetStrength', 0, 3, 0.01).name('offset strength');
      ef.add(e, 'offsetMode', ['add', 'set']).name('offset mode');
      ef.add(e, 'scaleMode', ['multiply', 'add', 'set']).name('scale mode');

      for (const s of C.schema) this.addParam(ef, e.params, s);

      const env = e.envelope.spec;
      const vf = ef.addFolder('Envelope');
      vf.add(env, 'shape', SHAPES);
      vf.add(env, 'period', 0, 10, 0.05).name('period (s, 0 = global)');
      vf.add(env, 'phase', 0, 1, 0.01);
      vf.add(env, 'min', -1, 2, 0.01);
      vf.add(env, 'max', -1, 2, 0.01);
      vf.add(env, 'duty', 0.01, 1, 0.01).name('duty (square/pulse)');
      const af = vf.addFolder('ADSR (s)').close();
      for (const k of ['a', 'd', 's', 'r', 'hold']) af.add(env.adsr, k, 0, k === 's' ? 1 : 5, 0.01);
      const sf = vf.addFolder('Spatial phase').close();
      AXES.forEach((a, i) => sf.add(env.spatial.vector, String(i), -0.2, 0.2, 0.005).name(`cycles/unit ${a}`));
      sf.add(env.spatial, 'random', 0, 2, 0.01).name('random desync');
    });
  }

  effectTitle(e, idx) {
    const solo = this.app.stack.soloId === e.id ? ' ◉' : '';
    const off = e.enabled ? '' : ' (off)';
    return `${idx + 1}. ${e.name} · ${e.constructor.type}${solo}${off}`;
  }

  addParam(folder, params, s) {
    const label = s.label || s.key;
    switch (s.type) {
      case 'number':
        return folder.add(params, s.key, s.min, s.max, s.step).name(label);
      case 'bool':
        return folder.add(params, s.key).name(label);
      case 'select':
        return folder.add(params, s.key, s.options).name(label);
      case 'colour':
        return folder.addColor(params, s.key).name(label);
      case 'vec3':
        AXES.forEach((a, i) => folder.add(params[s.key], String(i), s.min, s.max, s.step).name(`${label} ${a}`));
        return null;
      default:
        return null;
    }
  }

  /** Refresh every controller after state is replaced externally. */
  refresh() {
    this.buildEffects();
    for (const c of this.gui.controllersRecursive()) c.updateDisplay();
  }
}
