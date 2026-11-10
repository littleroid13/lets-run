import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export class CharacterPreviewRenderer {
  constructor(characters) {
    this.characters = characters || [];
    this.loader = new GLTFLoader();
    this.cache = new Map(); // file -> gltf
    this.slots = []; // Array of { slotIdx, canvas, ctx, model, mixer, charIdx }

    this.isRunning = false;
    this.rafId = null;
    this.clock = new THREE.Clock();

    this.setupThree();
  }

  setupThree() {
    // Canvas offscreen untuk render preview Three.js
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power'
    });
    this.renderWidth = 320;
    this.renderHeight = 420;
    this.renderer.setSize(this.renderWidth, this.renderHeight);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Mini scene preview
    this.scene = new THREE.Scene();

    // Kamera vertikal proporsional membidik seluruh tubuh karakter dari kepala hingga kaki
    this.camera = new THREE.PerspectiveCamera(34, this.renderWidth / this.renderHeight, 0.1, 50);
    this.camera.position.set(0, 0.42, 3.1);
    this.camera.lookAt(0, 0.38, 0);

    // Pencahayaan studio 3D yang terang, cerah & pop untuk karakter gelap maupun terang
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.4);
    this.scene.add(hemiLight);

    // Cahaya utama dari depan-atas kamera agar wajah & pakaian terang
    const frontLight = new THREE.DirectionalLight(0xffffff, 2.8);
    frontLight.position.set(1.0, 2.5, 3.5);
    this.scene.add(frontLight);

    // Rim light cyan cerah dari belakang agar siluet karakter terpisah tajam dari background
    const rimLight = new THREE.DirectionalLight(0xa5f3fc, 1.6);
    rimLight.position.set(-2.5, 2.0, -2.0);
    this.scene.add(rimLight);

    // Top light lembut dari atas untuk menerangi kepala dan bahu
    const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
    topLight.position.set(0, 3.5, 0.5);
    this.scene.add(topLight);
  }

  // Muat GLTF dan simpan ke cache
  async loadModel(file) {
    if (this.cache.has(file)) {
      return this.cache.get(file);
    }

    const url = `${import.meta.env.BASE_URL}assets/characters/${file}`;
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          this.cache.set(file, gltf);
          resolve(gltf);
        },
        undefined,
        (err) => {
          console.error(`Gagal memuat preview model ${file}:`, err);
          reject(err);
        }
      );
    });
  }

  // Inisialisasi slot untuk 4 pemain
  async initSlots(slotsConfig) {
    this.slots = slotsConfig.map((cfg) => {
      const canvas = document.getElementById(cfg.canvasId);
      const ctx = canvas ? canvas.getContext('2d') : null;
      return {
        slotIdx: cfg.slotIdx,
        canvas,
        ctx,
        charIdx: cfg.charIdx,
        model: null,
        mixer: null
      };
    });

    // Muat semua karakter slot awal secara paralel
    const promises = this.slots.map((slot) => this.setSlotCharacter(slot.slotIdx, slot.charIdx));
    await Promise.all(promises);

    this.start();
  }

  // Ganti karakter di slot tertentu
  async setSlotCharacter(slotIdx, charIdx) {
    const slot = this.slots[slotIdx];
    if (!slot) return;

    slot.charIdx = charIdx;
    const charData = this.characters[charIdx];
    if (!charData) return;

    try {
      const gltf = await this.loadModel(charData.file);

      // Bersihkan model dan mixer lama
      if (slot.mixer) {
        slot.mixer.stopAllAction();
        slot.mixer = null;
      }
      slot.model = null;

      // Klon model agar tiap slot independen
      const clonedScene = clone(gltf.scene);
      clonedScene.scale.setScalar(0.42); // Ukuran proporsional membidik seluruh badan (kepala s.d. kaki)
      clonedScene.position.set(0, -0.32, 0); // Kaki berada pas di atas batas bawah canvas
      clonedScene.rotation.y = 0.25; // Menghadap ke arah pemain (+Z) dengan sedikit sudut 3D 15 derajat

      // Pastikan material terang, cerah dan kontras tinggi di dalam kartu
      clonedScene.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.roughness = 0.45;
          child.material.metalness = 0.05;
          if (child.material.color) {
            // Memberikan sedikit kecerahan emissive agar karakter bertubuh gelap terlihat jelas detailnya
            child.material.emissive = child.material.color.clone().multiplyScalar(0.12);
          }
        }
      });

      // Setup mixer animasi Idle
      let mixer = null;
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(clonedScene);
        // Cari klip Idle (case-insensitive)
        const idleClip = gltf.animations.find(
          (c) => c.name.toLowerCase() === 'idle'
        ) || gltf.animations[0];

        if (idleClip) {
          const action = mixer.clipAction(idleClip);
          action.play();
          // Offset waktu agar 4 karakter tidak bernapas serempak persis
          action.time = (slotIdx * 0.7) % (idleClip.duration || 1);
        }
      }

      slot.model = clonedScene;
      slot.mixer = mixer;
    } catch (err) {
      console.warn(`Gagal set karakter di slot ${slotIdx}:`, err);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    const loop = () => {
      if (!this.isRunning) return;
      this.rafId = requestAnimationFrame(loop);
      this.renderFrame();
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  renderFrame() {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    for (const slot of this.slots) {
      if (!slot.ctx || !slot.model) continue;

      if (slot.mixer) {
        slot.mixer.update(delta);
      }

      // Render model ke WebGL offscreen
      this.scene.add(slot.model);
      this.renderer.render(this.scene, this.camera);
      this.scene.remove(slot.model);

      // Salin ke 2D canvas slot pemain
      const w = slot.canvas.width;
      const h = slot.canvas.height;
      slot.ctx.clearRect(0, 0, w, h);
      slot.ctx.drawImage(this.renderer.domElement, 0, 0, w, h);
    }
  }

  destroy() {
    this.stop();
    this.slots.forEach((s) => {
      if (s.mixer) s.mixer.stopAllAction();
    });
    this.slots = [];
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
