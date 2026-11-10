import * as THREE from 'three';
import { CONFIG } from '../src/config.js';

// Preset Tema Lingkungan Lintasan
export const THEMES = {
  siang: {
    id: 'siang',
    name: '☀️ Siang (Padang Rumput)',
    skyColors: ['#1a5276', '#2980b9', '#6dd5fa', '#b8e2f2', '#dff9fb'],
    fogColor: 0xb8e2f2,
    terrainColor: 0x3d6b4f,
    hemiSky: 0xffffff,
    hemiGround: 0x4a7c59,
    sunColor: 0xfffaed,
    sunIntensity: 1.3
  },
  senja: {
    id: 'senja',
    name: '🌅 Senja (Sunset Hangat)',
    skyColors: ['#2c1654', '#6c3483', '#b03a2e', '#e67e22', '#f39c12'],
    fogColor: 0xd35400,
    terrainColor: 0x543d2b,
    hemiSky: 0xffd39b,
    hemiGround: 0x5a2d1d,
    sunColor: 0xffaa44,
    sunIntensity: 1.2
  },
  malam: {
    id: 'malam',
    name: '🌙 Malam (Bintang & Rembulan)',
    skyColors: ['#050811', '#0b162c', '#152b47', '#1c3b5e', '#2c4f7c'],
    fogColor: 0x152b47,
    terrainColor: 0x18241c,
    hemiSky: 0x68798e,
    hemiGround: 0x15221b,
    sunColor: 0x95afc0,
    sunIntensity: 0.85
  },
  gurun: {
    id: 'gurun',
    name: '🏜️ Gurun (Padang Pasir)',
    skyColors: ['#1b70a6', '#489dd4', '#8ec5e6', '#ded3b4', '#f5e6c8'],
    fogColor: 0xded3b4,
    terrainColor: 0xc29b61,
    hemiSky: 0xfff9e6,
    hemiGround: 0x8a6d3b,
    sunColor: 0xfff5cc,
    sunIntensity: 1.4
  }
};

// Mapping nama file aset lingkungan di /public/assets/environment/
const ASSET_FILES = {
  bush: 'Bush.gltf',
  bushFruit: 'Bush_Fruit.gltf',
  cloud1: 'Cloud_1.gltf',
  cloud2: 'Cloud_2.gltf',
  cloud3: 'Cloud_3.gltf',
  fruit: 'Fruit.gltf',
  grass1: 'Grass_1.gltf',
  grass2: 'Grass_2.gltf',
  grass3: 'Grass_3.gltf',
  rock1: 'Rock_1.gltf',
  rock2: 'Rock_2.gltf',
  platformTall: 'RockPlatform_Tall.gltf',
  platform1: 'RockPlatforms_1.gltf',
  platform2: 'RockPlatforms_2.gltf',
  platform3: 'RockPlatforms_3.gltf',
  platformLarge: 'RockPlatforms_Large.gltf',
  platformMedium: 'RockPlatforms_Medium.gltf',
  tree: 'Tree.gltf',
  treeFruit: 'Tree_Fruit.gltf'
};

// Pembuat gradien langit berdasarkan tema
function createSkyCanvas(skyColors) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  const colors = skyColors || THEMES.siang.skyColors;
  const step = 1.0 / (colors.length - 1);
  colors.forEach((color, i) => {
    grad.addColorStop(Math.min(1.0, i * step), color);
  });

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// Pseudo-random deterministic generator berbasis seed agar susunan konsisten
function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export class EnvironmentManager {
  constructor(scene, loader) {
    this.scene = scene;
    this.loader = loader;

    // Cache template model GLTF
    this.templates = new Map();
    this.isLoaded = false;
    this.currentTheme = CONFIG.THEME || 'siang';

    // Grup utama lingkungan
    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);

    // Daftar awan untuk animasi perlahan
    this.clouds = [];

    // Pasang langit dan fog
    this.setupSkyAndFog();
    this.setupTerrain();
  }

  setupSkyAndFog() {
    const theme = THEMES[this.currentTheme] || THEMES.siang;
    this.scene.background = createSkyCanvas(theme.skyColors);
    this.scene.fog = new THREE.Fog(theme.fogColor, 110, 360);
  }

  setupTerrain() {
    const theme = THEMES[this.currentTheme] || THEMES.siang;
    const terrainGeo = new THREE.PlaneGeometry(700, 1800);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: theme.terrainColor,
      roughness: 0.9,
      metalness: 0.05
    });

    this.terrain = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.position.set(0, -0.04, -800);
    this.terrain.matrixAutoUpdate = false;
    this.terrain.updateMatrix();
    this.environmentGroup.add(this.terrain);
  }

  setTheme(themeId, lights = null) {
    const theme = THEMES[themeId] || THEMES.siang;
    this.currentTheme = theme.id;
    CONFIG.THEME = theme.id;

    if (this.scene.background && this.scene.background.dispose) {
      this.scene.background.dispose();
    }
    this.scene.background = createSkyCanvas(theme.skyColors);

    if (this.scene.fog) {
      this.scene.fog.color.setHex(theme.fogColor);
    }

    if (this.terrain && this.terrain.material) {
      this.terrain.material.color.setHex(theme.terrainColor);
    }

    if (lights) {
      if (lights.hemiLight) {
        lights.hemiLight.color.setHex(theme.hemiSky);
        lights.hemiLight.groundColor.setHex(theme.hemiGround);
      }
      if (lights.sunLight) {
        lights.sunLight.color.setHex(theme.sunColor);
        lights.sunLight.intensity = theme.sunIntensity;
      }
    }
  }

  updateTrackLength(trackLength) {
    if (this.terrain) {
      const neededLength = trackLength + 300;
      this.terrain.scale.y = Math.max(1.0, neededLength / 1800);
      this.terrain.position.z = -trackLength / 2;
      this.terrain.updateMatrix();
    }
  }

  async loadAssets() {
    const promises = Object.entries(ASSET_FILES).map(async ([key, fileName]) => {
      const url = `${import.meta.env.BASE_URL}assets/environment/${fileName}`;
      try {
        const gltf = await this.loader.loadAsync(url);
        const root = gltf.scene;

        // Normalisasi pivot Y agar dasar objek selalu duduk tepat di tanah (y = 0)
        const box = new THREE.Box3().setFromObject(root);
        const wrapper = new THREE.Group();

        if (isFinite(box.min.y)) {
          root.position.y = -box.min.y;
        }

        // Optimalkan material (roughness wajar, tanpa bayangan berat berlebihan)
        root.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.roughness = 0.8;
            child.material.metalness = 0.1;
          }
        });

        wrapper.add(root);
        this.templates.set(key, wrapper);
      } catch (err) {
        console.error(`Gagal memuat aset environment: ${fileName}`, err);
      }
    });

    await Promise.all(promises);
    this.isLoaded = true;
    console.log(`Semua ${this.templates.size} aset lingkungan berhasil dimuat.`);
  }

  // Ambil salinan objek (clone) dengan efisiensi tinggi (berbagi geometry & material)
  spawnProp(key, x, y, z, scale = 1.0, rotY = 0) {
    const template = this.templates.get(key);
    if (!template) return null;

    const clone = template.clone(true);
    clone.position.set(x, y, z);
    clone.scale.setScalar(scale);
    clone.rotation.y = rotY;

    // Nonaktifkan auto-update matrix untuk objek statis demi performa 60 fps
    clone.matrixAutoUpdate = false;
    clone.updateMatrix();
    clone.traverse((child) => {
      child.matrixAutoUpdate = false;
      child.updateMatrix();
    });

    this.environmentGroup.add(clone);
    return clone;
  }

  // Bangun dekorasi samping untuk sebuah jalur secara proporsional dan tanpa tumpang tindih
  buildLaneDecorations(laneX, startZ = 15, endZ = -530, laneIndex = 0) {
    if (!this.isLoaded) return;

    // Daftar jenis prop
    const treeTypes = ['tree', 'treeFruit'];
    const bushTypes = ['bush', 'bushFruit'];
    const rockTypes = ['rock1', 'rock2'];
    const grassTypes = ['grass1', 'grass2', 'grass3'];
    const platformTypes = ['platform1', 'platform2', 'platform3', 'platformMedium', 'platformTall'];

    let seed = laneIndex * 1000 + 42;

    // Bagi lintasan menjadi cell/grid Z setiap 7 unit agar prop tersebar rapi & proporsional
    const stepZ = 7.5;
    for (let z = startZ; z >= endZ; z -= stepZ) {
      seed++;

      // Dekorasi sisi KIRI (dx negatif) dan KANAN (dx positif)
      [-1, 1].forEach((side) => {
        seed += 3.7;
        const rnd = pseudoRandom(seed);
        const rotY = pseudoRandom(seed * 1.5) * Math.PI * 2;

        // Zona 1: Tepi batas lintasan dekat (dx = ±3.4 s/d 4.6) -> Rumput, batu kecil, semak
        if (rnd < 0.35) {
          // Rumput
          const grassKey = grassTypes[Math.floor(pseudoRandom(seed * 2.1) * grassTypes.length)];
          const posX = laneX + side * (3.4 + pseudoRandom(seed * 2.3) * 0.9);
          const sc = 0.9 + pseudoRandom(seed * 2.5) * 0.3;
          this.spawnProp(grassKey, posX, 0, z + (pseudoRandom(seed) - 0.5) * 2, sc, rotY);
        } else if (rnd < 0.62) {
          // Batu kecil / sedang
          const rockKey = rockTypes[Math.floor(pseudoRandom(seed * 3.1) * rockTypes.length)];
          const posX = laneX + side * (3.6 + pseudoRandom(seed * 3.3) * 0.9);
          const sc = 0.45 + pseudoRandom(seed * 3.5) * 0.25;
          this.spawnProp(rockKey, posX, 0, z + (pseudoRandom(seed * 1.8) - 0.5) * 2, sc, rotY);
        } else if (rnd < 0.85) {
          // Semak buah / semak rimbun
          const bushKey = bushTypes[Math.floor(pseudoRandom(seed * 4.1) * bushTypes.length)];
          const posX = laneX + side * (3.8 + pseudoRandom(seed * 4.3) * 0.9);
          const sc = 0.4 + pseudoRandom(seed * 4.5) * 0.15;
          this.spawnProp(bushKey, posX, 0, z, sc, rotY);

          // Terkadang tambahkan buah kecil di samping semak
          if (pseudoRandom(seed * 4.7) < 0.3) {
            this.spawnProp('fruit', posX + (pseudoRandom(seed * 4.9) - 0.5) * 0.8, 0, z + 0.4, 0.7, rotY);
          }
        }

        // Zona 2: Jalur samping pepohonan (dx = ±6.2 s/d 9.2) -> Diberi jarak agar tajuk daun terlihat alami
        const treeRnd = pseudoRandom(seed * 5.7);
        if (treeRnd < 0.45) {
          const treeKey = treeTypes[Math.floor(pseudoRandom(seed * 6.1) * treeTypes.length)];
          const posX = laneX + side * (6.2 + pseudoRandom(seed * 6.3) * 2.5);
          const sc = 0.85 + pseudoRandom(seed * 6.5) * 0.3;
          this.spawnProp(treeKey, posX, 0, z + (pseudoRandom(seed * 7.1) - 0.5) * 3, sc, rotY);
        }

        // Zona 3: Tebing / formasi batuan samping luar (dx = ±10.5 s/d 16.5) -> Rock platforms
        const platRnd = pseudoRandom(seed * 8.3);
        if (platRnd < 0.26) {
          const platKey = platformTypes[Math.floor(pseudoRandom(seed * 9.1) * platformTypes.length)];
          const posX = laneX + side * (10.5 + pseudoRandom(seed * 9.3) * 5.0);
          const sc = 0.55 + pseudoRandom(seed * 9.5) * 0.35;
          this.spawnProp(platKey, posX, 0, z + (pseudoRandom(seed * 9.7) - 0.5) * 4, sc, rotY);
        }
      });
    }
  }

  // Bangun pemandangan pegunungan & tebing megah di kejauhan (belakang garis finis)
  buildDistantScenery(finishZ = -520) {
    if (!this.isLoaded) return;

    const largePlatforms = ['platformLarge', 'platformTall', 'platform2', 'platform3', 'platform1'];

    // Barisan tebing & bukit di kejauhan belakang garis finis
    for (let x = -130; x <= 130; x += 18) {
      const seed = Math.abs(x * 13.7);
      const platKey = largePlatforms[Math.floor(pseudoRandom(seed) * largePlatforms.length)];
      const zPos = finishZ - 45 - pseudoRandom(seed * 2) * 80;
      const sc = 1.3 + pseudoRandom(seed * 3) * 0.8;
      const rotY = pseudoRandom(seed * 4) * Math.PI * 2;

      this.spawnProp(platKey, x + (pseudoRandom(seed * 5) - 0.5) * 8, 0, zPos, sc, rotY);
    }
  }

  // Bangun awan-awan di langit yang melayang di atas jalur
  buildClouds(startZ = 20, endZ = -580) {
    if (!this.isLoaded) return;

    const cloudTypes = ['cloud1', 'cloud2', 'cloud3'];
    let seed = 999;

    for (let z = startZ; z >= endZ; z -= 35) {
      seed += 7.3;
      for (let i = 0; i < 2; i++) {
        seed += 3.1;
        const cloudKey = cloudTypes[Math.floor(pseudoRandom(seed) * cloudTypes.length)];
        const template = this.templates.get(cloudKey);
        if (!template) continue;

        const clone = template.clone(true);
        const x = (pseudoRandom(seed * 2) - 0.5) * 220;
        const y = 18 + pseudoRandom(seed * 3) * 10;
        const sc = 1.4 + pseudoRandom(seed * 4) * 1.0;

        clone.position.set(x, y, z + (pseudoRandom(seed * 5) - 0.5) * 15);
        clone.scale.setScalar(sc);
        clone.rotation.y = pseudoRandom(seed * 6) * Math.PI * 2;

        this.environmentGroup.add(clone);
        this.clouds.push({
          mesh: clone,
          speed: 0.4 + pseudoRandom(seed * 7) * 0.6
        });
      }
    }
  }

  update(delta) {
    // Geser awan perlahan di langit agar pemandangan terasa hidup
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.mesh.position.x += c.speed * delta;
      if (c.mesh.position.x > 140) {
        c.mesh.position.x = -140;
      }
    }
  }
}
