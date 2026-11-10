import * as THREE from 'three';
import { CONFIG } from '../src/config.js';

let sharedDustTexture = null;

function getDustTexture() {
  if (sharedDustTexture) return sharedDustTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(240, 243, 245, 0.85)');
  grad.addColorStop(0.4, 'rgba(215, 225, 230, 0.5)');
  grad.addColorStop(0.8, 'rgba(195, 205, 215, 0.18)');
  grad.addColorStop(1.0, 'rgba(195, 205, 215, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  sharedDustTexture = new THREE.CanvasTexture(canvas);
  return sharedDustTexture;
}

export class DustParticleSystem {
  constructor(scene, poolSize = CONFIG.PARTICLE_COUNT) {
    this.scene = scene;
    this.poolSize = poolSize;
    this.particles = [];
    this.spawnTimer = 0;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initPool();
  }

  initPool() {
    const texture = getDustTexture();

    for (let i = 0; i < this.poolSize; i++) {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.group.add(sprite);

      this.particles.push({
        sprite,
        mat,
        active: false,
        life: 0,
        maxLife: 0.7,
        startScale: 0.25,
        endScale: 0.95,
        vx: 0,
        vy: 0,
        vz: 0
      });
    }
  }

  emit(posX, posY, posZ) {
    if (!CONFIG.EFFECTS_ENABLED) return;

    // Cari partikel non-aktif dari pool
    let p = this.particles.find(item => !item.active);
    if (!p) {
      // Jika pool penuh, pakai partikel tertua
      p = this.particles[0];
    }

    p.active = true;
    p.life = 0;
    p.maxLife = 0.6 + Math.random() * 0.2; // 0.6 - 0.8 detik
    p.startScale = 0.2 + Math.random() * 0.1;
    p.endScale = 0.85 + Math.random() * 0.3;

    // Posisi di belakang kaki karakter
    p.sprite.position.set(
      posX + (Math.random() - 0.5) * 0.4,
      posY + 0.12,
      posZ + 0.35 + Math.random() * 0.2
    );

    // Kecepatan gerak perlahan ke belakang dan sedikit naik
    p.vx = (Math.random() - 0.5) * 0.5;
    p.vy = 0.35 + Math.random() * 0.4;
    p.vz = 1.2 + Math.random() * 1.5; // Mengarah ke +Z (ke belakang karakter)

    p.sprite.scale.setScalar(p.startScale);
    p.mat.opacity = 0.75;
    p.sprite.visible = true;
  }

  update(delta, isEmitting, emitterX, emitterY, emitterZ) {
    if (!CONFIG.EFFECTS_ENABLED) return;

    // Spawn partikel baru saat sedang lari cepat/dash
    if (isEmitting) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= 0.05) { // ~20 partikel per detik
        this.spawnTimer = 0;
        this.emit(emitterX, emitterY, emitterZ);
      }
    } else {
      this.spawnTimer = 0;
    }

    // Update seluruh partikel di pool
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += delta;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }

      const progress = p.life / p.maxLife;

      p.sprite.position.x += p.vx * delta;
      p.sprite.position.y += p.vy * delta;
      p.sprite.position.z += p.vz * delta;

      // Partikel membesar dan memudar halus
      const currentScale = THREE.MathUtils.lerp(p.startScale, p.endScale, progress);
      p.sprite.scale.setScalar(currentScale);
      p.mat.opacity = (1 - progress) * 0.7;
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.particles.forEach(p => {
      p.mat.dispose();
    });
  }
}
