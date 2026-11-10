import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { AnswerDoor } from './AnswerDoor.js';

// Cache bersama untuk Rangka Gerbang (Pillar, Lintel, Signboard, Lamps)
class GateFrameAssetCache {
  constructor() {
    this.geometries = new Map();
    this.materials = new Map();
    this.textures = new Map();
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    const gateCfg = CONFIG.GATE_CONFIG;
    const trackWidth = gateCfg.trackWidth || 5.0;
    const gateHeight = gateCfg.gateHeight || 3.4;
    const lintelCfg = gateCfg.lintel || {};

    // 1. Geometri Tiang Kiri & Kanan
    this.geometries.set('pillar_base', new THREE.BoxGeometry(0.45, 0.22, 0.45));
    this.geometries.set('pillar_shaft', new THREE.CylinderGeometry(0.14, 0.16, gateHeight, 16));
    this.geometries.set('pillar_ring', new THREE.TorusGeometry(0.18, 0.035, 12, 24));

    // 2. Geometri Balok Melintang (Lintel Beam)
    const lintelWidth = trackWidth + 0.35;
    this.geometries.set('lintel_beam', new THREE.BoxGeometry(lintelWidth, 0.42, 0.42));
    this.geometries.set('lintel_lip', new THREE.BoxGeometry(lintelWidth + 0.15, 0.08, 0.48));

    // 3. Geometri Papan Nama (Signboard)
    this.geometries.set('signboard_box', new THREE.BoxGeometry(2.35, 0.55, 0.08));

    // 4. Geometri Lampu Marquee
    this.geometries.set('lamp_sphere', new THREE.SphereGeometry(0.065, 12, 12));

    // Material Tiang & Lintel Mengilap (MeshStandardMaterial dengan roughness rendah & sedikit emissive)
    const frameMat = new THREE.MeshStandardMaterial({
      color: lintelCfg.color || 0x1e272e,
      emissive: lintelCfg.emissive || 0x0f141a,
      roughness: lintelCfg.roughness || 0.22,
      metalness: lintelCfg.metalness || 0.7
    });
    this.materials.set('frame_metal', frameMat);

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xffa502,
      emissive: 0x331e00,
      roughness: 0.18,
      metalness: 0.85
    });
    this.materials.set('gold_trim', goldAccentMat);

    // Tekstur & Material Papan Nama
    const signTexture = this.createSignboardTexture(lintelCfg.signText || 'GERBANG SOAL');
    this.textures.set('signboard_texture', signTexture);

    const signMat = new THREE.MeshStandardMaterial({
      map: signTexture,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x222222
    });
    this.materials.set('signboard_mat', signMat);

    // Material Lampu Warna-Warni Emissive
    const lampColors = lintelCfg.lampColors || [0xff4757, 0xffa502, 0x2ed573, 0x1e90ff];
    lampColors.forEach((col, idx) => {
      const lampMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: lintelCfg.lampEmissiveIntensity || 1.2,
        roughness: 0.15,
        metalness: 0.1
      });
      this.materials.set(`lamp_mat_${idx}`, lampMat);
    });
  }

  createSignboardTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Background piringan navy arcade gelap
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 128);

    // Frame border ganda warna emas
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffa502';
    ctx.strokeRect(6, 6, 500, 116);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(14, 14, 484, 100);

    // Bintang sudut
    ctx.fillStyle = '#fffa65';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 38, 64);
    ctx.fillText('★', 474, 64);

    // Teks Utama Papan Nama
    ctx.font = '900 46px "Titan One", "Luckiest Guy", sans-serif, Arial';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 256, 64);

    // Gradient warna emas untuk teks
    const grad = ctx.createLinearGradient(0, 30, 0, 90);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#fff438');
    grad.addColorStop(1, '#ff9900');
    ctx.fillStyle = grad;
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}

// Singleton Cache Rangka Gerbang
export const gateFrameAssetCache = new GateFrameAssetCache();

export class Gate {
  constructor(laneX, gateZ, scene) {
    this.laneX = laneX;
    this.gateZ = gateZ;
    this.scene = scene;

    // Pastikan aset rangka gerbang siap
    gateFrameAssetCache.init();

    this.group = new THREE.Group();
    this.group.position.set(laneX, 0, gateZ);

    this.doors = []; // Berisi 4 instance AnswerDoor
    this.doorOffsets = CONFIG.GATE_CONFIG.doorOffsets || [-1.65, -0.55, 0.55, 1.65];
    this.letters = ['A', 'B', 'C', 'D'];

    this.isRevealed = false;
    this.correctIndex = null;
    this.chosenIndex = null;

    this.buildGate();
    this.scene.add(this.group);
  }

  buildGate() {
    const gateCfg = CONFIG.GATE_CONFIG;
    const trackWidth = gateCfg.trackWidth || 5.0;
    const gateHeight = gateCfg.gateHeight || 3.4;

    // 1. Tiang Kiri (Pillar Left)
    this.buildPillar(-trackWidth / 2 + 0.1, gateHeight);

    // 2. Tiang Kanan (Pillar Right)
    this.buildPillar(trackWidth / 2 - 0.1, gateHeight);

    // 3. Balok Melintang Atas (Lintel Beam)
    const lintelGeo = gateFrameAssetCache.geometries.get('lintel_beam');
    const lintelLipGeo = gateFrameAssetCache.geometries.get('lintel_lip');
    const frameMat = gateFrameAssetCache.materials.get('frame_metal');
    const goldMat = gateFrameAssetCache.materials.get('gold_trim');

    const lintelMesh = new THREE.Mesh(lintelGeo, frameMat);
    lintelMesh.position.set(0, gateHeight, 0);
    this.group.add(lintelMesh);

    const lintelLip = new THREE.Mesh(lintelLipGeo, goldMat);
    lintelLip.position.set(0, gateHeight + 0.22, 0);
    this.group.add(lintelLip);

    // 4. Papan Nama Soal di Tengah Lintel
    const signGeo = gateFrameAssetCache.geometries.get('signboard_box');
    const signMat = gateFrameAssetCache.materials.get('signboard_mat');
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, gateHeight + 0.44, 0.08);
    this.group.add(signMesh);

    // 5. Lampu-Lampu Hias Marquee Sepanjang Lintel
    this.buildLamps(trackWidth, gateHeight);

    // 6. Buat 4 Pintu Jawaban Prosedural A, B, C, D menggunakan komponen AnswerDoor
    gateCfg.doors.forEach((doorCfg, i) => {
      const answerDoor = new AnswerDoor(doorCfg, i);
      const posX = this.doorOffsets[i];
      answerDoor.group.position.set(posX, 0, 0);

      this.group.add(answerDoor.group);
      this.doors.push(answerDoor);
    });
  }

  buildPillar(x, gateHeight) {
    const baseGeo = gateFrameAssetCache.geometries.get('pillar_base');
    const shaftGeo = gateFrameAssetCache.geometries.get('pillar_shaft');
    const ringGeo = gateFrameAssetCache.geometries.get('pillar_ring');
    const frameMat = gateFrameAssetCache.materials.get('frame_metal');
    const goldMat = gateFrameAssetCache.materials.get('gold_trim');

    // Base pedestal
    const base = new THREE.Mesh(baseGeo, frameMat);
    base.position.set(x, 0.11, 0);
    this.group.add(base);

    // Pillar shaft
    const shaft = new THREE.Mesh(shaftGeo, frameMat);
    shaft.position.set(x, gateHeight / 2, 0);
    this.group.add(shaft);

    // Capital ring atas
    const ringTop = new THREE.Mesh(ringGeo, goldMat);
    ringTop.rotation.x = Math.PI / 2;
    ringTop.position.set(x, gateHeight - 0.08, 0);
    this.group.add(ringTop);

    // Ring bawah
    const ringBottom = new THREE.Mesh(ringGeo, goldMat);
    ringBottom.rotation.x = Math.PI / 2;
    ringBottom.position.set(x, 0.28, 0);
    this.group.add(ringBottom);
  }

  buildLamps(trackWidth, gateHeight) {
    const lampGeo = gateFrameAssetCache.geometries.get('lamp_sphere');
    const lampCount = 11;
    const startX = -trackWidth / 2 + 0.4;
    const endX = trackWidth / 2 - 0.4;
    const step = (endX - startX) / (lampCount - 1);
    const lampColorsCount = CONFIG.GATE_CONFIG.lintel.lampColors.length || 4;

    for (let i = 0; i < lampCount; i++) {
      const matIdx = i % lampColorsCount;
      const lampMat = gateFrameAssetCache.materials.get(`lamp_mat_${matIdx}`);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(startX + i * step, gateHeight - 0.02, 0.23);
      this.group.add(lamp);
    }
  }

  // Efek visual saat pemain memilih pintu A/B/C/D
  selectDoor(index) {
    this.chosenIndex = index;
    for (let i = 0; i < this.doors.length; i++) {
      if (i === index) {
        this.doors[i].select();
      } else {
        this.doors[i].unselect();
      }
    }
  }

  // Kontrol langsung per pintu untuk debugging / scripting
  openDoor(index) {
    if (this.doors[index]) this.doors[index].open();
  }

  bashDoor(index) {
    if (this.doors[index]) this.doors[index].bash();
  }

  highlightDoor(index) {
    if (this.doors[index]) this.doors[index].highlightCorrect();
  }

  resetDoor(index) {
    if (this.doors[index]) this.doors[index].reset();
  }

  resetDoors() {
    this.doors.forEach(d => d.reset());
  }

  // Tampilkan hasil saat waktu habis atau melewati gerbang
  reveal(correctIndex, chosenIndex) {
    this.isRevealed = true;
    this.correctIndex = correctIndex;
    this.chosenIndex = chosenIndex;

    for (let i = 0; i < this.doors.length; i++) {
      const isCorrect = (i === correctIndex);
      const isChosen = (i === chosenIndex);
      this.doors[i].reveal(isCorrect, isChosen);
    }
  }

  update(delta) {
    for (let i = 0; i < this.doors.length; i++) {
      this.doors[i].update(delta);
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.doors.forEach((door) => {
      door.destroy();
    });
    this.doors = [];
  }
}
