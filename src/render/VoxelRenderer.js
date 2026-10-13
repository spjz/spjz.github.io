// One InstancedMesh for every voxel (DESIGN.md §2).
import * as THREE from 'three';

export class VoxelRenderer {
  constructor(container, model) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1b1f2a);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x3a4a30, 1.6);
    this.key = new THREE.DirectionalLight(0xffffff, 2.2);
    this.key.position.set(25, 50, 40);
    this.scene.add(this.hemi, this.key);

    this.grid = new THREE.GridHelper(64, 64, 0x55607a, 0x2c3344);
    this.scene.add(this.grid);
    this.axes = new THREE.AxesHelper(4);
    this.axes.position.y = 0.01;
    this.scene.add(this.axes);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.litMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.flatMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, this.litMaterial, model.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // instanceColor must exist before the first render so the shader compiles with it.
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(model.count * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    // Effects can move voxels far from the rest pose; skip the stale bounding sphere.
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.matrixArray = this.mesh.instanceMatrix.array;
    this.colourArray = this.mesh.instanceColor.array;
  }

  setFlat(flat) {
    this.mesh.material = flat ? this.flatMaterial : this.litMaterial;
  }

  setGridVisible(v) {
    this.grid.visible = v;
    this.axes.visible = v;
  }

  setBackground(hex) {
    this.scene.background.set(hex);
  }

  upload(count) {
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  resize(camera) {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  render(camera) {
    this.renderer.render(this.scene, camera);
  }
}
