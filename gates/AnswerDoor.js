import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { playAudioSfx } from '../audio/AudioManager.js';

// Cache bersama untuk Geometri, Material, dan Tekstur agar performa 4 viewport tetap 60 FPS
class DoorAssetCache {
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
    const w = gateCfg.doorWidth || 1.05;
    const h = gateCfg.doorHeight || 2.35;
    const t = gateCfg.doorThickness || 0.12;

    // 1. Geometri Pintu A: Castle Arch (Lengkung Kastil)
    const archH = 0.45;
    const shapeA = new THREE.Shape();
    shapeA.moveTo(-w / 2, 0);
    shapeA.lineTo(-w / 2, h - archH);
    shapeA.absarc(0, h - archH, w / 2, Math.PI, 0, false);
    shapeA.lineTo(w / 2, 0);
    shapeA.closePath();
    this.geometries.set(
      'shape_castle_arch',
      new THREE.ExtrudeGeometry(shapeA, {
        depth: t,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.02,
        bevelThickness: 0.02
      })
    );

    // Rivet geometry untuk Pintu A
    this.geometries.set('rivet_sphere', new THREE.SphereGeometry(0.028, 8, 8));

    // 2. Geometri Pintu B: Capsule (Kapsul Melengkung)
    const shapeB = new THREE.Shape();
    const cornerR = 0.12;
    shapeB.moveTo(-w / 2 + cornerR, 0);
    shapeB.quadraticCurveTo(-w / 2, 0, -w / 2, cornerR);
    shapeB.lineTo(-w / 2, h - w / 2);
    shapeB.absarc(0, h - w / 2, w / 2, Math.PI, 0, false);
    shapeB.lineTo(w / 2, cornerR);
    shapeB.quadraticCurveTo(w / 2, 0, w / 2 - cornerR, 0);
    shapeB.closePath();
    this.geometries.set(
      'shape_capsule',
      new THREE.ExtrudeGeometry(shapeB, {
        depth: t,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.02,
        bevelThickness: 0.02
      })
    );

    // Star geometry untuk hiasan atas Pintu B
    const starShape = new THREE.Shape();
    const pts = 5, outerR = 0.18, innerR = 0.08;
    for (let i = 0; i < pts * 2; i++) {
      const r = (i % 2 === 0) ? outerR : innerR;
      const angle = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();
    this.geometries.set(
      'star_decoration',
      new THREE.ExtrudeGeometry(starShape, { depth: 0.05, bevelEnabled: false })
    );

    // 3. Geometri Pintu C: Hexagon (Heksagon Garis Neon)
    const shapeC = new THREE.Shape();
    const chamferB = 0.22;
    const chamferT = 0.38;
    shapeC.moveTo(-w / 2 + chamferB, 0);
    shapeC.lineTo(w / 2 - chamferB, 0);
    shapeC.lineTo(w / 2, chamferB);
    shapeC.lineTo(w / 2, h - chamferT);
    shapeC.lineTo(0, h);
    shapeC.lineTo(-w / 2, h - chamferT);
    shapeC.lineTo(-w / 2, chamferB);
    shapeC.closePath();
    this.geometries.set(
      'shape_hexagon',
      new THREE.ExtrudeGeometry(shapeC, {
        depth: t,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.02,
        bevelThickness: 0.02
      })
    );

    // Neon lines geometry untuk Pintu C
    this.geometries.set('neon_strip_v', new THREE.BoxGeometry(0.04, 1.2, 0.03));
    this.geometries.set('neon_strip_h', new THREE.BoxGeometry(0.55, 0.04, 0.03));

    // 4. Geometri Pintu D: Crown (Mahkota Bergerigi dengan Permata)
    const shapeD = new THREE.Shape();
    shapeD.moveTo(-w / 2, 0);
    shapeD.lineTo(-w / 2, h - 0.25);
    shapeD.lineTo(-w / 2 + 0.12, h - 0.08); // Puncak kiri
    shapeD.lineTo(-w / 2 * 0.45, h - 0.28); // Lembah 1
    shapeD.lineTo(0, h);                   // Puncak utama tengah
    shapeD.lineTo(w / 2 * 0.45, h - 0.28);  // Lembah 2
    shapeD.lineTo(w / 2 - 0.12, h - 0.08);  // Puncak kanan
    shapeD.lineTo(w / 2, h - 0.25);
    shapeD.lineTo(w / 2, 0);
    shapeD.closePath();
    this.geometries.set(
      'shape_crown',
      new THREE.ExtrudeGeometry(shapeD, {
        depth: t,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.02,
        bevelThickness: 0.02
      })
    );

    // Gemstone geometry untuk puncak mahkota Pintu D
    this.geometries.set('gem_octahedron', new THREE.OctahedronGeometry(0.11, 0));

    // Badge piringan huruf (A, B, C, D)
    this.geometries.set('letter_badge', new THREE.CylinderGeometry(0.36, 0.36, 0.03, 32));
    this.geometries.set('letter_plane', new THREE.PlaneGeometry(0.68, 0.68));

    // ==========================================
    // GEOMETRI SERPIHAN PECAHAN (FRAGMENTS POOL)
    // ==========================================
    // Fragmen 0: Baji segitiga bergerigi
    const fShape0 = new THREE.Shape();
    fShape0.moveTo(-0.12, -0.08);
    fShape0.lineTo(0.14, -0.05);
    fShape0.lineTo(0.04, 0.18);
    fShape0.closePath();
    this.geometries.set('frag_geo_0', new THREE.ExtrudeGeometry(fShape0, { depth: 0.05, bevelEnabled: false }));

    // Fragmen 1: Trapesium bersudut
    const fShape1 = new THREE.Shape();
    fShape1.moveTo(-0.15, -0.1);
    fShape1.lineTo(0.16, -0.06);
    fShape1.lineTo(0.11, 0.14);
    fShape1.lineTo(-0.08, 0.16);
    fShape1.closePath();
    this.geometries.set('frag_geo_1', new THREE.ExtrudeGeometry(fShape1, { depth: 0.05, bevelEnabled: false }));

    // Fragmen 2: Pecahan quad tak beraturan
    const fShape2 = new THREE.Shape();
    fShape2.moveTo(-0.09, -0.12);
    fShape2.lineTo(0.13, -0.08);
    fShape2.lineTo(0.16, 0.11);
    fShape2.lineTo(-0.04, 0.14);
    fShape2.closePath();
    this.geometries.set('frag_geo_2', new THREE.ExtrudeGeometry(fShape2, { depth: 0.05, bevelEnabled: false }));

    // Fragmen 3: Serpihan tajam memanjang
    const fShape3 = new THREE.Shape();
    fShape3.moveTo(-0.06, -0.15);
    fShape3.lineTo(0.08, -0.1);
    fShape3.lineTo(0.03, 0.18);
    fShape3.closePath();
    this.geometries.set('frag_geo_3', new THREE.ExtrudeGeometry(fShape3, { depth: 0.05, bevelEnabled: false }));

    // Geometri Efek Visual: Retakan, Debu, Kilau, dan Cahaya Hangat
    this.geometries.set('crack_plane', new THREE.PlaneGeometry(w * 0.94, h * 0.92));
    this.geometries.set('dust_plane', new THREE.PlaneGeometry(0.38, 0.38));
    this.geometries.set('sparkle_plane', new THREE.PlaneGeometry(0.24, 0.24));
    this.geometries.set('glow_plane', new THREE.PlaneGeometry(w * 1.05, h * 1.02));

    // ==========================================
    // TEKSTUR KHUSUS EFEK PROSEDURAL
    // ==========================================
    const crackTex = this.createCrackCanvasTexture();
    this.textures.set('texture_crack', crackTex);

    const dustTex = this.createDustCanvasTexture();
    this.textures.set('texture_dust', dustTex);

    const sparkleTex = this.createSparkleCanvasTexture();
    this.textures.set('texture_sparkle', sparkleTex);

    const warmGlowTex = this.createWarmGlowCanvasTexture();
    this.textures.set('texture_warm_glow', warmGlowTex);

    // ==========================================
    // MATERIAL KHUSUS EFEK VISUAL
    // ==========================================
    // Material Retakan Pintu
    this.materials.set(
      'mat_crack',
      new THREE.MeshBasicMaterial({
        map: crackTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      })
    );

    // Material Debu Hancur
    this.materials.set(
      'mat_dust',
      new THREE.MeshBasicMaterial({
        map: dustTex,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      })
    );

    // Material Partikel Kilau
    this.materials.set(
      'mat_sparkle',
      new THREE.MeshBasicMaterial({
        map: sparkleTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    // Material Sorotan Cahaya Hangat Balik Pintu
    this.materials.set(
      'mat_warm_glow',
      new THREE.MeshBasicMaterial({
        map: warmGlowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );

    // Buat Tekstur & Material untuk tiap pintu (A, B, C, D)
    gateCfg.doors.forEach((dCfg) => {
      // 1. Tekstur Huruf Canvas
      const letterTexture = this.createLetterCanvasTexture(dCfg.letter, dCfg);
      this.textures.set(`texture_letter_${dCfg.letter}`, letterTexture);

      // 2. Material Pintu Utama
      const doorMat = new THREE.MeshStandardMaterial({
        color: dCfg.color,
        emissive: dCfg.emissive || 0x111111,
        roughness: dCfg.roughness || 0.25,
        metalness: dCfg.metalness || 0.5,
        side: THREE.DoubleSide
      });
      this.materials.set(`mat_door_${dCfg.letter}`, doorMat);

      // 3. Material Huruf Badge
      const letterMat = new THREE.MeshBasicMaterial({
        map: letterTexture,
        transparent: true,
        depthWrite: false
      });
      this.materials.set(`mat_letter_${dCfg.letter}`, letterMat);

      // 4. Material Badge Rim
      const badgeRimMat = new THREE.MeshStandardMaterial({
        color: dCfg.accentColor || 0xffffff,
        metalness: 0.8,
        roughness: 0.2
      });
      this.materials.set(`mat_badgerim_${dCfg.letter}`, badgeRimMat);

      // 5. Material Serpihan Khusus Warna Pintu
      const fragMat = new THREE.MeshStandardMaterial({
        color: dCfg.color,
        emissive: dCfg.emissive || 0x111111,
        roughness: 0.35,
        metalness: 0.3,
        side: THREE.DoubleSide
      });
      this.materials.set(`mat_frag_${dCfg.letter}`, fragMat);
    });

    // Material Khusus Aksesoris:
    // Rivet A
    this.materials.set(
      'mat_rivet',
      new THREE.MeshStandardMaterial({ color: 0xf5f6fa, metalness: 0.85, roughness: 0.15 })
    );

    // Star B
    this.materials.set(
      'mat_star',
      new THREE.MeshStandardMaterial({
        color: 0xfffa65,
        emissive: 0x554400,
        metalness: 0.6,
        roughness: 0.2
      })
    );

    // Neon C
    this.materials.set(
      'mat_neon',
      new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00d2d3,
        emissiveIntensity: 1.5,
        roughness: 0.1
      })
    );

    // Gem D
    this.materials.set(
      'mat_gem',
      new THREE.MeshStandardMaterial({
        color: 0xff3838,
        emissive: 0x770000,
        metalness: 0.9,
        roughness: 0.1
      })
    );

    // Material Status (Revealed / Result)
    this.materials.set(
      'mat_correct',
      new THREE.MeshStandardMaterial({
        color: 0x2ed573,
        emissive: 0x0fa848,
        emissiveIntensity: 1.4,
        roughness: 0.2,
        metalness: 0.4
      })
    );

    this.materials.set(
      'mat_wrong',
      new THREE.MeshStandardMaterial({
        color: 0xff4757,
        emissive: 0x880010,
        emissiveIntensity: 0.9,
        roughness: 0.3,
        metalness: 0.4
      })
    );

    this.materials.set(
      'mat_dimmed',
      new THREE.MeshStandardMaterial({
        color: 0x2f3542,
        emissive: 0x000000,
        roughness: 0.6,
        metalness: 0.2
      })
    );
  }

  createLetterCanvasTexture(letter, dCfg) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Lingkaran background lencana putih mengilap
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Border tebal lencana dengan warna aksen pintu
    ctx.lineWidth = 28;
    ctx.strokeStyle = typeof dCfg.color === 'number'
      ? '#' + dCfg.color.toString(16).padStart(6, '0')
      : dCfg.color;
    ctx.stroke();

    // Garis aksen lingkaran dalam tipis
    ctx.beginPath();
    ctx.arc(256, 256, 218, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1e272e';
    ctx.stroke();

    // Huruf A/B/C/D berukuran besar & outline hitam tebal agar sangat jelas dari kejauhan
    ctx.font = '900 320px "Titan One", "Luckiest Guy", sans-serif, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer stroke tebal
    ctx.strokeStyle = '#1e272e';
    ctx.lineWidth = 44;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(letter, 256, 268);

    // Inner fill cerah
    ctx.fillStyle = typeof dCfg.color === 'number'
      ? '#' + dCfg.color.toString(16).padStart(6, '0')
      : dCfg.color;
    ctx.fillText(letter, 256, 268);

    // Titik sorot putih atas untuk efek 3D permen arcade
    ctx.font = '900 300px "Titan One", "Luckiest Guy", sans-serif, Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText(letter, 256, 262);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Kanvas tekstur retakan visual bergerigi tajam
  createCrackCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    ctx.strokeStyle = '#11141a';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    const drawBranch = (startX, startY, len, angle, depth) => {
      if (depth <= 0 || len < 16) return;
      const endX = startX + Math.cos(angle) * len;
      const endY = startY + Math.sin(angle) * len;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const numBranches = (depth > 2) ? 2 : 1;
      for (let b = 0; b < numBranches; b++) {
        const branchAngle = angle + (Math.random() - 0.5) * 1.1;
        const branchLen = len * (0.62 + Math.random() * 0.22);
        drawBranch(endX, endY, branchLen, branchAngle, depth - 1);
      }
    };

    // 6 jalur retakan utama memancar dari pusat tumbukan
    const roots = 6;
    for (let i = 0; i < roots; i++) {
      const angle = (i / roots) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      drawBranch(256, 256, 120, angle, 4);
    }

    // Sorotan putih tajam di sisi tepi retakan (efek pecah kaca/kayu)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < roots; i++) {
      const angle = (i / roots) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      drawBranch(258, 258, 100, angle, 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Kanvas tekstur partikel kilau bintang
  createSparkleCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);

    // Glow radial di balik bintang
    const radGrad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    radGrad.addColorStop(0, 'rgba(255, 240, 160, 1)');
    radGrad.addColorStop(0.35, 'rgba(255, 210, 60, 0.7)');
    radGrad.addColorStop(1, 'rgba(255, 180, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    // Bintang 4 penjuru mengilap
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 8);
    ctx.quadraticCurveTo(64, 64, 120, 64);
    ctx.quadraticCurveTo(64, 64, 64, 120);
    ctx.quadraticCurveTo(64, 64, 8, 64);
    ctx.quadraticCurveTo(64, 64, 64, 8);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Kanvas tekstur lingkaran debu halus
  createDustCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0, 'rgba(240, 240, 245, 0.9)');
    grad.addColorStop(0.4, 'rgba(200, 205, 215, 0.5)');
    grad.addColorStop(0.8, 'rgba(160, 165, 175, 0.15)');
    grad.addColorStop(1, 'rgba(140, 145, 155, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Kanvas tekstur pancaran cahaya hangat di balik pintu
  createWarmGlowCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 124);
    grad.addColorStop(0, 'rgba(255, 235, 120, 0.95)');
    grad.addColorStop(0.25, 'rgba(255, 185, 40, 0.75)');
    grad.addColorStop(0.65, 'rgba(255, 130, 10, 0.35)');
    grad.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}

// Singleton Asset Cache
export const doorAssetCache = new DoorAssetCache();

export class AnswerDoor {
  constructor(doorConfig, index) {
    this.index = index;
    this.config = doorConfig;
    this.letter = doorConfig.letter;

    // Pastikan aset bersama siap
    doorAssetCache.init();

    // State pintu: 'closed' | 'opening' | 'open' | 'shaking' | 'breaking' | 'broken' | 'highlighting'
    this.validStates = ['closed', 'opening', 'open', 'shaking', 'breaking', 'broken', 'highlighting'];
    this.state = 'closed';

    // Grup utama AnswerDoor
    this.group = new THREE.Group();

    // HINGE PIVOT: Pivot rotasi pintu di sisi kiri (engsel pintu)
    const doorW = CONFIG.GATE_CONFIG.doorWidth || 1.05;
    this.doorW = doorW;
    this.hingePivot = new THREE.Group();
    this.hingePivot.position.set(-doorW / 2, 0, 0); // Posisi engsel di tepi kiri
    this.group.add(this.hingePivot);

    // DOOR BODY: Berisi mesh pintu yang bergeser +doorW / 2 dari engsel
    this.doorBody = new THREE.Group();
    this.doorBody.position.set(doorW / 2, 0, 0);
    this.hingePivot.add(this.doorBody);

    this.doorMesh = null;
    this.letterMesh = null;
    this.crackMesh = null;
    this.accessories = [];

    // Efek Pencahayaan Balik Pintu
    this.warmGlowLight = null;
    this.warmGlowMesh = null;

    // Object Pools (Zero runtime allocations)
    this.fragmentPool = [];
    this.dustPool = [];
    this.sparklesPool = [];

    // Kontrol Animasi
    this.animTime = 0;
    this.animDuration = 0;
    this.targetRotationY = 0;
    this.isSelected = false;
    this.isRevealed = false;

    this.build();
    this.buildLightingAndGlow();
    this.buildObjectPools();
  }

  build() {
    const dCfg = this.config;
    const t = CONFIG.GATE_CONFIG.doorThickness || 0.12;
    const h = CONFIG.GATE_CONFIG.doorHeight || 2.35;

    // 1. Mesh Utama Daun Pintu sesuai bentuk siluet (castle_arch / capsule / hexagon / crown)
    const geoKey = `shape_${dCfg.shape}`;
    const matKey = `mat_door_${dCfg.letter}`;
    const doorGeo = doorAssetCache.geometries.get(geoKey) || doorAssetCache.geometries.get('shape_castle_arch');
    const doorMat = doorAssetCache.materials.get(matKey);

    this.doorMesh = new THREE.Mesh(doorGeo, doorMat);
    // Geser agar ketebalan pintu berpusat di Z=0
    this.doorMesh.position.set(0, 0, -t / 2);
    this.doorBody.add(this.doorMesh);

    // 2. Mesh Retakan Visual (Crack Mesh)
    const crackGeo = doorAssetCache.geometries.get('crack_plane');
    const crackMat = doorAssetCache.materials.get('mat_crack');
    this.crackMesh = new THREE.Mesh(crackGeo, crackMat);
    this.crackMesh.position.set(0, h * 0.46, t / 2 + 0.025);
    this.crackMesh.visible = false;
    this.doorBody.add(this.crackMesh);

    // 3. Lencana & Huruf A/B/C/D Besar di tengah pintu
    const letterGeo = doorAssetCache.geometries.get('letter_plane');
    const letterMat = doorAssetCache.materials.get(`mat_letter_${dCfg.letter}`);
    this.letterMesh = new THREE.Mesh(letterGeo, letterMat);
    this.letterMesh.position.set(0, h * 0.44, t / 2 + 0.04);
    this.doorBody.add(this.letterMesh);

    // 4. Aksesoris Prosedural Unik per Pintu
    this.buildAccessories(dCfg, h, t);
  }

  buildAccessories(dCfg, h, t) {
    const w = CONFIG.GATE_CONFIG.doorWidth || 1.05;

    if (dCfg.shape === 'castle_arch' && dCfg.feature === 'rivets') {
      // Pintu A: Deretan rivet logam melengkung & di tepi
      const rivetGeo = doorAssetCache.geometries.get('rivet_sphere');
      const rivetMat = doorAssetCache.materials.get('mat_rivet');

      const rivetPositions = [
        [-w / 2 + 0.08, 0.3], [-w / 2 + 0.08, 0.8], [-w / 2 + 0.08, 1.3], [-w / 2 + 0.08, 1.8],
        [w / 2 - 0.08, 0.3], [w / 2 - 0.08, 0.8], [w / 2 - 0.08, 1.3], [w / 2 - 0.08, 1.8],
        [-0.32, h - 0.25], [-0.16, h - 0.12], [0, h - 0.08], [0.16, h - 0.12], [0.32, h - 0.25]
      ];

      rivetPositions.forEach(([rx, ry]) => {
        const rivet = new THREE.Mesh(rivetGeo, rivetMat);
        rivet.position.set(rx, ry, t / 2 + 0.03);
        this.doorBody.add(rivet);
        this.accessories.push(rivet);
      });
    } else if (dCfg.shape === 'capsule' && dCfg.feature === 'star') {
      // Pintu B: Bintang emas 3D di mahkota kubah atas kapsul
      const starGeo = doorAssetCache.geometries.get('star_decoration');
      const starMat = doorAssetCache.materials.get('mat_star');
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.set(0, h + 0.08, 0.01);
      this.doorBody.add(starMesh);
      this.accessories.push(starMesh);
    } else if (dCfg.shape === 'hexagon' && dCfg.feature === 'neon_lines') {
      // Pintu C: Garis neon bercahaya tosca/cyan
      const stripVGeo = doorAssetCache.geometries.get('neon_strip_v');
      const stripHGeo = doorAssetCache.geometries.get('neon_strip_h');
      const neonMat = doorAssetCache.materials.get('mat_neon');

      const leftStrip = new THREE.Mesh(stripVGeo, neonMat);
      leftStrip.position.set(-w / 2 + 0.06, h * 0.46, t / 2 + 0.03);
      this.doorBody.add(leftStrip);
      this.accessories.push(leftStrip);

      const rightStrip = new THREE.Mesh(stripVGeo, neonMat);
      rightStrip.position.set(w / 2 - 0.06, h * 0.46, t / 2 + 0.03);
      this.doorBody.add(rightStrip);
      this.accessories.push(rightStrip);

      const bottomStrip = new THREE.Mesh(stripHGeo, neonMat);
      bottomStrip.position.set(0, 0.12, t / 2 + 0.03);
      this.doorBody.add(bottomStrip);
      this.accessories.push(bottomStrip);
    } else if (dCfg.shape === 'crown' && dCfg.feature === 'gem') {
      // Pintu D: Permata segi delapan berkilau di puncak mahkota
      const gemGeo = doorAssetCache.geometries.get('gem_octahedron');
      const gemMat = doorAssetCache.materials.get('mat_gem');
      const gemMesh = new THREE.Mesh(gemGeo, gemMat);
      gemMesh.position.set(0, h - 0.16, t / 2 + 0.04);
      gemMesh.rotation.set(0.2, 0.4, 0.2);
      this.doorBody.add(gemMesh);
      this.accessories.push(gemMesh);
    }
  }

  buildLightingAndGlow() {
    const h = CONFIG.GATE_CONFIG.doorHeight || 2.35;

    // Cahaya hangat titik di balik pintu
    this.warmGlowLight = new THREE.PointLight(0xffa502, 0, 3.8, 1.8);
    this.warmGlowLight.position.set(0, h * 0.5, -0.45);
    this.group.add(this.warmGlowLight);

    // Plane pancaran cahaya hangat dengan Additive Blending
    const glowGeo = doorAssetCache.geometries.get('glow_plane');
    const glowMat = doorAssetCache.materials.get('mat_warm_glow');
    this.warmGlowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.warmGlowMesh.position.set(0, h * 0.5, -0.12);
    this.warmGlowMesh.visible = false;
    this.group.add(this.warmGlowMesh);
  }

  buildObjectPools() {
    const dCfg = this.config;
    const fragCount = CONFIG.DOOR_ANIMATIONS?.FRAGMENTS_PER_DOOR || 8;
    const dustCount = CONFIG.DOOR_ANIMATIONS?.DUST_PER_DOOR || 8;
    const sparkleCount = CONFIG.DOOR_ANIMATIONS?.SPARKLE_COUNT || 12;

    // 1. POOL SERPIHAN PECAHAN (FRAGMENTS POOL)
    const fragMat = doorAssetCache.materials.get(`mat_frag_${dCfg.letter}`);
    for (let i = 0; i < fragCount; i++) {
      const geoKey = `frag_geo_${i % 4}`;
      const geo = doorAssetCache.geometries.get(geoKey);
      const mesh = new THREE.Mesh(geo, fragMat);
      mesh.visible = false;
      this.group.add(mesh);

      this.fragmentPool.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        age: 0,
        life: 1.0
      });
    }

    // 2. POOL PARTIKEL DEBU (DUST POOL)
    const dustGeo = doorAssetCache.geometries.get('dust_plane');
    const dustMat = doorAssetCache.materials.get('mat_dust');
    for (let i = 0; i < dustCount; i++) {
      const mesh = new THREE.Mesh(dustGeo, dustMat);
      mesh.visible = false;
      this.group.add(mesh);

      this.dustPool.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        life: 0.8,
        baseScale: 1.0
      });
    }

    // 3. POOL PARTIKEL KILAU BINTANG (SPARKLE POOL)
    const sparkleGeo = doorAssetCache.geometries.get('sparkle_plane');
    const sparkleMat = doorAssetCache.materials.get('mat_sparkle');
    for (let i = 0; i < sparkleCount; i++) {
      const mesh = new THREE.Mesh(sparkleGeo, sparkleMat);
      mesh.visible = false;
      this.group.add(mesh);

      this.sparklesPool.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        rotSpeed: 0,
        age: 0,
        life: 0.6,
        baseScale: 1.0
      });
    }
  }

  // ==========================================
  // METODE ANIMASI: open(), bash(), highlightCorrect(), reset()
  // ==========================================

  // Pintu berayun terbuka dengan easing, cahaya hangat dari baliknya, dan partikel kilau kecil
  open() {
    this.setState('opening');
    this.animTime = 0;
    this.animDuration = CONFIG.DOOR_ANIMATIONS?.OPEN_DURATION || 0.4;
    this.targetRotationY = -Math.PI * 0.48; // Berayun membuka ~86.4 derajat pada engsel kiri

    // Aktifkan cahaya hangat dan efek sorotan
    if (this.warmGlowLight) {
      this.warmGlowLight.color.setHex(0xffaa22);
      this.warmGlowLight.intensity = 0.5;
    }
    if (this.warmGlowMesh) {
      this.warmGlowMesh.visible = true;
      this.warmGlowMesh.scale.set(0.6, 0.6, 0.6);
    }

    // Munculkan partikel kilau kecil melayang dari balik pintu
    this.spawnSparkles(0xfffa65);

    // Hook Efek Suara Pintu Terbuka
    playAudioSfx('sfx_door_open');
  }

  // Pintu bergetar 2-3 kali dengan retakan visual, lalu hancur menjadi serpihan (fisika sederhana)
  bash() {
    this.setState('shaking');
    this.animTime = 0;
    this.animDuration = CONFIG.DOOR_ANIMATIONS?.SHAKE_DURATION || 0.24;

    // Tampilkan retakan visual di permukaan daun pintu
    if (this.crackMesh) {
      this.crackMesh.visible = true;
    }
  }

  // Pintu benar menyala hijau dan terbuka pelan untuk menunjukkan jawaban yang tepat saat pemain salah
  highlightCorrect() {
    this.setState('highlighting');
    this.animTime = 0;
    this.animDuration = CONFIG.DOOR_ANIMATIONS?.OPEN_SLOW_DURATION || 0.85;
    this.targetRotationY = -Math.PI * 0.48;

    // Ganti material pintu menjadi hijau menyala
    if (this.doorMesh) {
      this.doorMesh.material = doorAssetCache.materials.get('mat_correct');
    }

    // Aktifkan cahaya hijau emerald di balik pintu
    if (this.warmGlowLight) {
      this.warmGlowLight.color.setHex(0x2ed573);
      this.warmGlowLight.intensity = 0.5;
    }
    if (this.warmGlowMesh) {
      this.warmGlowMesh.visible = true;
      this.warmGlowMesh.scale.set(0.6, 0.6, 0.6);
    }

    // Partikel kilau emerald/emas
    this.spawnSparkles(0x2ed573);

    // Hook Efek Suara Pintu Terbuka
    playAudioSfx('sfx_door_open');
  }

  // Kembalikan pintu ke keadaan semula (closed) untuk pengujian debug atau soal berikutnya
  reset() {
    this.setState('closed');
    this.animTime = 0;
    this.animDuration = 0;
    this.isSelected = false;
    this.isRevealed = false;

    // Reset posisi dan rotasi engsel
    this.hingePivot.rotation.y = 0;
    this.doorBody.position.set(this.doorW / 2, 0, 0);
    this.doorBody.scale.set(1, 1, 1);
    this.group.scale.set(1, 1, 1);

    // Tampilkan kembali mesh utama dan sembunyikan retakan
    if (this.doorMesh) {
      this.doorMesh.visible = true;
      this.doorMesh.material = doorAssetCache.materials.get(`mat_door_${this.letter}`);
    }
    if (this.letterMesh) {
      this.letterMesh.visible = true;
    }
    if (this.crackMesh) {
      this.crackMesh.visible = false;
    }
    this.accessories.forEach(acc => {
      acc.visible = true;
    });

    // Matikan cahaya hangat
    if (this.warmGlowLight) {
      this.warmGlowLight.intensity = 0;
    }
    if (this.warmGlowMesh) {
      this.warmGlowMesh.visible = false;
    }

    // Nonaktifkan semua serpihan, debu, dan kilau dalam pool
    this.fragmentPool.forEach(f => {
      f.active = false;
      f.mesh.visible = false;
    });
    this.dustPool.forEach(d => {
      d.active = false;
      d.mesh.visible = false;
    });
    this.sparklesPool.forEach(s => {
      s.active = false;
      s.mesh.visible = false;
    });
  }

  // Spawn serpihan pecahan menggunakan object pool
  shatterDoor() {
    const w = CONFIG.GATE_CONFIG.doorWidth || 1.05;
    const h = CONFIG.GATE_CONFIG.doorHeight || 2.35;
    const fragLifetime = CONFIG.DOOR_ANIMATIONS?.FRAGMENT_LIFETIME || 1.0;

    // Sembunyikan pintu utama, lencana, retakan, dan aksesoris
    if (this.doorMesh) this.doorMesh.visible = false;
    if (this.letterMesh) this.letterMesh.visible = false;
    if (this.crackMesh) this.crackMesh.visible = false;
    this.accessories.forEach(acc => {
      acc.visible = false;
    });

    // Aktifkan serpihan pecahan dari pool dengan kecepatan acak, gravitasi, dan rotasi
    this.fragmentPool.forEach((frag, idx) => {
      frag.active = true;
      frag.age = 0;
      frag.life = fragLifetime * (0.85 + Math.random() * 0.3);
      frag.mesh.visible = true;

      // Sebar posisi serpihan merata di area pintu
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const fx = (col - 1) * (w * 0.28) + (Math.random() - 0.5) * 0.1;
      const fy = 0.4 + row * (h * 0.28) + (Math.random() - 0.5) * 0.15;
      const fz = (Math.random() - 0.5) * 0.08;

      frag.mesh.position.set(fx, fy, fz);
      frag.mesh.scale.set(1.1, 1.1, 1.1);

      // Kecepatan gerak serpihan terhambur ke depan dan samping
      frag.vx = (Math.random() - 0.5) * 4.6;
      frag.vy = Math.random() * 3.8 + 2.2; // Letupan ke atas
      frag.vz = -(Math.random() * 3.2 + 1.2); // Terlempar menembus gerbang ke depan (-Z)

      // Rotasi fisik serpihan
      frag.rx = (Math.random() - 0.5) * 12.0;
      frag.ry = (Math.random() - 0.5) * 12.0;
      frag.rz = (Math.random() - 0.5) * 12.0;
    });

    // Aktifkan partikel debu dari pool
    this.dustPool.forEach((dust) => {
      dust.active = true;
      dust.age = 0;
      dust.life = 0.75 + Math.random() * 0.35;
      dust.mesh.visible = true;

      const dx = (Math.random() - 0.5) * (w * 0.6);
      const dy = 0.3 + Math.random() * (h * 0.6);
      const dz = (Math.random() - 0.5) * 0.1;

      dust.mesh.position.set(dx, dy, dz);
      dust.baseScale = 0.6 + Math.random() * 0.8;
      dust.mesh.scale.setScalar(dust.baseScale);

      dust.vx = (Math.random() - 0.5) * 1.8;
      dust.vy = Math.random() * 1.5 + 0.4;
      dust.vz = -(Math.random() * 1.5 + 0.5);
    });

    // Hook Efek Suara Dentuman Pintu Hancur
    playAudioSfx('sfx_door_bash');
  }

  // Spawn partikel kilau hangat dari pool
  spawnSparkles() {
    const w = CONFIG.GATE_CONFIG.doorWidth || 1.05;
    const h = CONFIG.GATE_CONFIG.doorHeight || 2.35;

    this.sparklesPool.forEach((sp) => {
      sp.active = true;
      sp.age = 0;
      sp.life = 0.45 + Math.random() * 0.35;
      sp.mesh.visible = true;

      const sx = (Math.random() - 0.5) * (w * 0.7);
      const sy = 0.3 + Math.random() * (h * 0.75);
      const sz = -0.2 + (Math.random() - 0.5) * 0.2;

      sp.mesh.position.set(sx, sy, sz);
      sp.baseScale = 0.5 + Math.random() * 0.7;
      sp.mesh.scale.setScalar(sp.baseScale);

      sp.vx = (Math.random() - 0.5) * 1.6;
      sp.vy = Math.random() * 1.8 + 0.6;
      sp.vz = (Math.random() * 1.2 + 0.4);
      sp.rotSpeed = (Math.random() - 0.5) * 8.0;
    });
  }

  // Set status pintu (state machine)
  setState(newState) {
    if (!this.validStates.includes(newState)) {
      console.warn(`Status pintu tidak valid: ${newState}`);
      return;
    }
    this.state = newState;
  }

  getState() {
    return this.state;
  }

  // Seleksi visual saat pemain memilih pintu A/B/C/D
  select() {
    this.isSelected = true;
    this.group.scale.set(1.06, 1.03, 1.06);
    if (this.doorMesh && this.state === 'closed') {
      this.doorMesh.material.emissiveIntensity = 1.6;
    }
  }

  unselect() {
    this.isSelected = false;
    this.group.scale.set(1, 1, 1);
    if (this.doorMesh && this.state === 'closed') {
      this.doorMesh.material.emissiveIntensity = 1.0;
    }
  }

  // Tampilkan hasil evaluasi pintu
  reveal(isCorrect, isChosen) {
    this.isRevealed = true;

    if (isCorrect && isChosen) {
      // Pemain menjawab benar: pintu berayun terbuka gegap gempita
      this.open();
    } else if (isChosen && !isCorrect) {
      // Pemain menjawab salah: pintu bergetar retak dan hancur berkeping-keping
      this.bash();
    } else if (isCorrect && !isChosen) {
      // Pintu jawaban yang benar ditunjukkan menyala hijau dan terbuka pelan
      this.highlightCorrect();
    } else {
      // Pintu lainnya yang tidak dipilih dan salah diredupkan
      this.setState('closed');
      if (this.doorMesh) {
        this.doorMesh.material = doorAssetCache.materials.get('mat_dimmed');
      }
      this.group.scale.set(0.96, 0.96, 0.96);
    }
  }

  // Update frame animasi pintu
  update(delta) {
    const doorW = this.doorW;

    // 1. Animasi state 'opening' (Ayunan membuka dengan cubic ease-out)
    if (this.state === 'opening') {
      this.animTime += delta;
      const progress = Math.min(1.0, this.animTime / this.animDuration);
      // Easing Cubic Ease-Out
      const ease = 1.0 - Math.pow(1.0 - progress, 3);

      this.hingePivot.rotation.y = this.targetRotationY * ease;

      // Intensitas cahaya hangat naik
      if (this.warmGlowLight) {
        this.warmGlowLight.intensity = THREE.MathUtils.lerp(0.5, 3.2, ease);
      }
      if (this.warmGlowMesh) {
        const s = THREE.MathUtils.lerp(0.6, 1.05, ease);
        this.warmGlowMesh.scale.set(s, s, s);
      }

      if (progress >= 1.0) {
        this.hingePivot.rotation.y = this.targetRotationY;
        this.setState('open');
      }
    }

    // 2. Animasi state 'shaking' (Bergetar 2-3 kali dengan retakan visual)
    else if (this.state === 'shaking') {
      this.animTime += delta;
      const progress = Math.min(1.0, this.animTime / this.animDuration);
      const shakeCount = CONFIG.DOOR_ANIMATIONS?.SHAKE_COUNT || 3;
      const shakeAmp = CONFIG.DOOR_ANIMATIONS?.SHAKE_AMPLITUDE || 0.08;

      // Getaran harmonik lateral
      const offsetX = Math.sin(progress * Math.PI * 2 * shakeCount) * shakeAmp * (1.0 - progress * 0.4);
      this.doorBody.position.x = (doorW / 2) + offsetX;

      // Skala berdenyut sedikit saat hantaman
      const pulse = 1.0 + Math.sin(progress * Math.PI * shakeCount) * 0.04;
      this.doorBody.scale.set(pulse, 2.0 - pulse, pulse);

      if (progress >= 1.0) {
        this.doorBody.position.x = doorW / 2;
        this.doorBody.scale.set(1, 1, 1);
        this.setState('breaking');
        this.shatterDoor();
      }
    }

    // 3. Animasi state 'breaking' (Fisika serpihan pecahan melayang dan memudar)
    else if (this.state === 'breaking') {
      this.animTime += delta;
      const grav = CONFIG.DOOR_ANIMATIONS?.GRAVITY || 14.0;
      let anyFragActive = false;

      this.fragmentPool.forEach((frag) => {
        if (!frag.active) return;
        frag.age += delta;
        const p = frag.age / frag.life;

        if (p >= 1.0) {
          frag.active = false;
          frag.mesh.visible = false;
          return;
        }

        anyFragActive = true;

        // Fisika gerak
        frag.vy -= grav * delta;
        frag.mesh.position.x += frag.vx * delta;
        frag.mesh.position.y += frag.vy * delta;
        frag.mesh.position.z += frag.vz * delta;

        // Fisika rotasi
        frag.mesh.rotation.x += frag.rx * delta;
        frag.mesh.rotation.y += frag.ry * delta;
        frag.mesh.rotation.z += frag.rz * delta;

        // Memudar dan mengecil hingga hilang
        const scale = Math.max(0, 1.0 - Math.pow(p, 1.5));
        frag.mesh.scale.setScalar(scale);
      });

      if (!anyFragActive) {
        this.setState('broken');
      }
    }

    // 4. Animasi state 'highlighting' (Pintu menyala hijau dan terbuka pelan)
    else if (this.state === 'highlighting') {
      this.animTime += delta;
      const progress = Math.min(1.0, this.animTime / this.animDuration);
      // Smooth-step easing
      const ease = progress * progress * (3.0 - 2.0 * progress);

      this.hingePivot.rotation.y = this.targetRotationY * ease;

      if (this.warmGlowLight) {
        this.warmGlowLight.intensity = THREE.MathUtils.lerp(0.5, 2.6, ease);
      }
      if (this.warmGlowMesh) {
        const s = THREE.MathUtils.lerp(0.6, 1.0, ease);
        this.warmGlowMesh.scale.set(s, s, s);
      }

      if (progress >= 1.0) {
        this.hingePivot.rotation.y = this.targetRotationY;
        this.setState('open');
      }
    }

    // 5. Update partikel debu aktif dari pool
    this.dustPool.forEach((dust) => {
      if (!dust.active) return;
      dust.age += delta;
      const p = dust.age / dust.life;

      if (p >= 1.0) {
        dust.active = false;
        dust.mesh.visible = false;
        return;
      }

      dust.mesh.position.x += dust.vx * delta;
      dust.mesh.position.y += dust.vy * delta;
      dust.mesh.position.z += dust.vz * delta;

      // Debu membesar perlahan dan memudar
      const scale = dust.baseScale * (1.0 + p * 1.4);
      dust.mesh.scale.setScalar(scale);
    });

    // 6. Update partikel kilau aktif dari pool
    this.sparklesPool.forEach((sp) => {
      if (!sp.active) return;
      sp.age += delta;
      const p = sp.age / sp.life;

      if (p >= 1.0) {
        sp.active = false;
        sp.mesh.visible = false;
        return;
      }

      sp.mesh.position.x += sp.vx * delta;
      sp.mesh.position.y += sp.vy * delta;
      sp.mesh.position.z += sp.vz * delta;
      sp.mesh.rotation.z += sp.rotSpeed * delta;

      // Kilau berkedip dan mengecil
      const pulse = Math.sin(p * Math.PI);
      sp.mesh.scale.setScalar(sp.baseScale * pulse);
    });
  }

  destroy() {
    // Hapus dari induk tanpa menghapus geometri/material bersama di cache
    if (this.warmGlowLight) {
      this.warmGlowLight.intensity = 0;
    }
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
