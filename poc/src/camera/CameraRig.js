// Camera controls (DESIGN.md §8): OrbitControls kept in two-way sync with a
// numeric spherical state, plus presets (tweened), auto-orbit and envelope drift.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Envelope } from '../core/Envelope.js';

const DEG = Math.PI / 180;

export const CAMERA_PRESETS = {
  Front: { azimuth: 0, elevation: 5, distance: 62 },
  '¾': { azimuth: 35, elevation: 18, distance: 62 },
  Side: { azimuth: 90, elevation: 5, distance: 62 },
  Top: { azimuth: 0, elevation: 85, distance: 70 },
  Face: { azimuth: 10, elevation: 8, distance: 28, target: [0, 20, 0] },
};

const DEFAULT_STATE = {
  azimuth: 25,
  elevation: 15,
  distance: 62,
  target: [0, 15, 0],
  fov: 40,
  autoOrbit: false,
  autoOrbitSpeed: 12, // °/s
  damping: true,
  drift: false,
  driftAzimuth: 8, // ± degrees
  driftElevation: 4,
  driftPeriod: 6,
};

const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

export class CameraRig {
  constructor(domElement, aspect) {
    this.camera = new THREE.PerspectiveCamera(DEFAULT_STATE.fov, aspect, 0.1, 1000);
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 200;
    this.state = structuredClone(DEFAULT_STATE);
    this._drift = [0, 0]; // [az, el] degrees currently applied on top of state
    this._tween = null;
    this._driftEnv = new Envelope({ shape: 'sine', period: this.state.driftPeriod });
    this._driftEnv2 = new Envelope({ shape: 'sine', period: this.state.driftPeriod, phase: 0.25 });
    this.apply();
  }

  /** Push state (+ current drift) into the camera and controls. */
  apply() {
    const s = this.state;
    const az = (s.azimuth + this._drift[0]) * DEG;
    const el = Math.min(89.9, Math.max(-89.9, s.elevation + this._drift[1])) * DEG;
    const t = this.controls.target.set(...s.target);
    this.camera.position.set(
      t.x + s.distance * Math.cos(el) * Math.sin(az),
      t.y + s.distance * Math.sin(el),
      t.z + s.distance * Math.cos(el) * Math.cos(az),
    );
    this.camera.lookAt(t);
    if (this.camera.fov !== s.fov) {
      this.camera.fov = s.fov;
      this.camera.updateProjectionMatrix();
    }
    this.controls.enableDamping = s.damping;
  }

  /** Read the camera back into state, removing the drift we added. */
  _readBack() {
    const s = this.state, t = this.controls.target;
    const off = this.camera.position.clone().sub(t);
    const d = off.length();
    s.distance = d;
    s.elevation = Math.asin(off.y / d) / DEG - this._drift[1];
    s.azimuth = Math.atan2(off.x, off.z) / DEG - this._drift[0];
    s.target = [t.x, t.y, t.z];
  }

  goTo(preset, duration = 0.6) {
    const from = { azimuth: this.state.azimuth, elevation: this.state.elevation, distance: this.state.distance, target: [...this.state.target] };
    const to = { ...from, ...preset, target: preset.target ? [...preset.target] : [...DEFAULT_STATE.target] };
    // Shortest way round on azimuth.
    let dAz = ((to.azimuth - from.azimuth + 540) % 360) - 180;
    to.azimuth = from.azimuth + dAz;
    this._tween = { from, to, t: 0, duration };
  }

  update(dt) {
    // 1. Let OrbitControls apply user input / damping, then read it back.
    this.controls.update();
    this._readBack();
    const s = this.state;

    // 2. Programmatic motion on top.
    if (this._tween) {
      const tw = this._tween;
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const e = easeInOut(tw.t);
      for (const k of ['azimuth', 'elevation', 'distance']) s[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      s.target = tw.from.target.map((v, i) => v + (tw.to.target[i] - v) * e);
      if (tw.t >= 1) this._tween = null;
    }
    if (s.autoOrbit) s.azimuth += s.autoOrbitSpeed * dt;
    s.azimuth = ((s.azimuth + 180) % 360 + 360) % 360 - 180;

    // 3. Envelope-driven drift (DESIGN.md §8).
    if (s.drift) {
      this._driftT = (this._driftT || 0) + dt;
      for (const env of [this._driftEnv, this._driftEnv2]) {
        env.spec.period = s.driftPeriod;
        env.prepare({ t: this._driftT, globalPeriod: s.driftPeriod }, null);
      }
      this._drift = [s.driftAzimuth * (this._driftEnv.valueGlobal() * 2 - 1), s.driftElevation * (this._driftEnv2.valueGlobal() * 2 - 1)];
    } else {
      this._drift = [0, 0];
    }
    this.apply();
  }

  toJSON() {
    return structuredClone(this.state);
  }

  load(json = {}) {
    this.state = { ...structuredClone(DEFAULT_STATE), ...structuredClone(json) };
    this._tween = null;
    this.apply();
  }
}
