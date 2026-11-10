import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { Gate } from '../gates/Gate.js';
import { DustParticleSystem } from '../environment/DustParticleSystem.js';

// Pembuatan tekstur papan catur untuk garis finis dan garis awal
function createCheckeredTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const size = 16;
  for (let y = 0; y < 128; y += size) {
    for (let x = 0; x < 128; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#ffffff' : '#1a1a1a';
      ctx.fillRect(x, y, size, size);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);
  return texture;
}

// Tekstur spanduk FINISH pada gerbang finis
function createFinishBannerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINISH', 256, 64);

  return new THREE.CanvasTexture(canvas);
}

export class Lane {
  constructor(index, config, scene, loader) {
    this.index = index;
    this.config = config;
    this.scene = scene;
    this.loader = loader;

    // Status keikutsertaan pemain
    this.isActive = true;

    // Posisi X jalur di dunia 3D
    this.x = config.xOffset;
    this.totalQuestions = CONFIG.TOTAL_QUESTIONS || 10;

    // Hitung posisi finis dinamis
    this.cycleDistance = CONFIG.REWARD_RUN_DISTANCE + CONFIG.APPROACH_DISTANCE;
    this.trackLength = CONFIG.START_OFFSET + (this.totalQuestions * this.cycleDistance) + CONFIG.FINISH_BUFFER;
    this.finishZ = -this.trackLength;

    // State mandiri per jalur
    // State: 'WAITING' | 'LARI_BEBAS' | 'SOAL_MENDEKAT' | 'LEWAT_GERBANG' | 'FINISH_RUN' | 'SELESAI'
    this.state = 'WAITING';
    this.currentSpeed = 0;
    this.currentTimeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.isFinished = false;
    this.finishRank = 0;

    // Skor dan streak
    this.score = 0;
    this.streak = 0;
    this.stats = {
      correctCount: 0,
      totalAnswered: 0,
      responseTimes: []
    };

    // Data soal independen untuk jalur ini
    this.questions = [];
    this.currentQIndex = 0;
    this.currentGate = null;
    this.chosenChoice = null;
    this.savedSisaWaktu = 0;
    this.hasAnsweredCurrentQ = false;
    this.rewardRunStartPosZ = 0;

    // Kontrol reaksi gerbang & animasi tabrakan
    this.hasDeterminedOutcome = false;
    this.hasExecutedGateImpact = false;
    this.isCurrentAnswerCorrect = false;

    // Getaran kamera lokal jalur (Camera Shake)
    this.cameraShakeIntensity = 0;
    this.cameraShakeTimer = 0;

    // Squash & stretch prosedural
    this.squashStretchTimer = 0;

    // Posisi lateral karakter
    this.targetLateralX = this.x;
    this.doorOffsets = [-1.65, -0.55, 0.55, 1.65];

    // Kamera per jalur
    this.camera = new THREE.PerspectiveCamera(CONFIG.cameraFOV, 1, 0.1, 400);
    this.camera.position.set(this.x, CONFIG.cameraHeight, CONFIG.cameraDistance);
    this.camera.lookAt(this.x, CONFIG.lookAtY, -CONFIG.lookAhead);

    // Animasi dan karakter
    this.character = null;
    this.mixer = null;
    this.actions = {};

    // Grup elemen visual lintasan dan finis
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
    this.buildModularTrack();
    this.buildFinishLine();

    // Efek Bintang Pusing (Dizzy Stars) di atas kepala karakter
    this.buildDizzyStars();

    // Sistem Partikel Debu (Object Pool 40 partikel)
    this.particleSystem = new DustParticleSystem(this.scene, CONFIG.PARTICLE_COUNT);

    // Muat karakter glTF
    this.currentModelFile = config.modelFile;
    this.loadCharacter(this.currentModelFile);

    // Callbacks ke UI & Game
    this.onQuestionAppear = null;
    this.onTimerUpdate = null;
    this.onQuestionEvaluated = null;
    this.onPlayerFinished = null;
  }

  recalculateTrack(totalQuestions) {
    this.totalQuestions = totalQuestions;
    this.cycleDistance = CONFIG.REWARD_RUN_DISTANCE + CONFIG.APPROACH_DISTANCE;
    this.trackLength = CONFIG.START_OFFSET + (this.totalQuestions * this.cycleDistance) + CONFIG.FINISH_BUFFER;
    this.finishZ = -this.trackLength;

    while (this.trackGroup.children.length > 0) {
      const obj = this.trackGroup.children[0];
      this.trackGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this.buildModularTrack();
    this.buildFinishLine();
  }

  buildModularTrack() {
    const trackWidth = 5.0;
    const segmentLength = 20.0;
    const startZ = 20.0;
    const segmentCount = Math.ceil((this.trackLength + 40.0) / segmentLength);

    const roadBaseMat = new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.85,
      metalness: 0.1
    });

    const laneStripMat = new THREE.MeshStandardMaterial({
      color: this.config.trackColor || 0x2980b9,
      roughness: 0.75,
      metalness: 0.15
    });

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xecf0f1,
      roughness: 0.6
    });

    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < segmentCount; i++) {
      const segZ = startZ - (i * segmentLength) - segmentLength / 2;
      const segGroup = new THREE.Group();

      const baseGeo = new THREE.PlaneGeometry(trackWidth, segmentLength);
      const baseMesh = new THREE.Mesh(baseGeo, roadBaseMat);
      baseMesh.rotation.x = -Math.PI / 2;
      baseMesh.position.set(this.x, 0, segZ);
      segGroup.add(baseMesh);

      const stripGeo = new THREE.PlaneGeometry(trackWidth - 0.8, segmentLength);
      const stripMesh = new THREE.Mesh(stripGeo, laneStripMat);
      stripMesh.rotation.x = -Math.PI / 2;
      stripMesh.position.set(this.x, 0.002, segZ);
      segGroup.add(stripMesh);

      const curbGeo = new THREE.BoxGeometry(0.18, 0.08, segmentLength);
      const leftCurb = new THREE.Mesh(curbGeo, curbMat);
      leftCurb.position.set(this.x - trackWidth / 2 + 0.09, 0.04, segZ);
      segGroup.add(leftCurb);

      const rightCurb = new THREE.Mesh(curbGeo, curbMat);
      rightCurb.position.set(this.x + trackWidth / 2 - 0.09, 0.04, segZ);
      segGroup.add(rightCurb);

      for (let d = 0; d < 3; d++) {
        const dashGeo = new THREE.PlaneGeometry(0.14, 2.4);
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.rotation.x = -Math.PI / 2;
        const dashZ = (segZ + segmentLength / 2) - ((d + 0.5) * (segmentLength / 3));
        dash.position.set(this.x, 0.005, dashZ);
        segGroup.add(dash);
      }

      segGroup.matrixAutoUpdate = false;
      segGroup.updateMatrix();
      segGroup.traverse((child) => {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      });

      this.trackGroup.add(segGroup);
    }

    const startGeo = new THREE.PlaneGeometry(trackWidth - 0.2, 1.8);
    const startMat = new THREE.MeshBasicMaterial({ map: createCheckeredTexture() });
    const startMesh = new THREE.Mesh(startGeo, startMat);
    startMesh.rotation.x = -Math.PI / 2;
    startMesh.position.set(this.x, 0.01, 0.9);
    startMesh.matrixAutoUpdate = false;
    startMesh.updateMatrix();
    this.trackGroup.add(startMesh);
  }

  buildFinishLine() {
    const trackWidth = 5.0;

    const finishGeo = new THREE.PlaneGeometry(trackWidth, 3.2);
    const finishMat = new THREE.MeshBasicMaterial({ map: createCheckeredTexture() });
    this.finishMesh = new THREE.Mesh(finishGeo, finishMat);
    this.finishMesh.rotation.x = -Math.PI / 2;
    this.finishMesh.position.set(this.x, 0.015, this.finishZ);
    this.trackGroup.add(this.finishMesh);

    const poleGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.8, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.3 });

    this.leftPole = new THREE.Mesh(poleGeo, poleMat);
    this.leftPole.position.set(this.x - trackWidth / 2 + 0.1, 2.4, this.finishZ);
    this.trackGroup.add(this.leftPole);

    this.rightPole = new THREE.Mesh(poleGeo, poleMat);
    this.rightPole.position.set(this.x + trackWidth / 2 - 0.1, 2.4, this.finishZ);
    this.trackGroup.add(this.rightPole);

    const bannerGeo = new THREE.PlaneGeometry(trackWidth - 0.2, 1.3);
    const bannerMat = new THREE.MeshBasicMaterial({
      map: createFinishBannerTexture(),
      side: THREE.DoubleSide
    });
    this.bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    this.bannerMesh.position.set(this.x, 4.0, this.finishZ);
    this.trackGroup.add(this.bannerMesh);
  }

  buildDizzyStars() {
    this.dizzyStarsGroup = new THREE.Group();
    this.dizzyStarsGroup.visible = false;
    this.scene.add(this.dizzyStarsGroup);

    this.dizzyStars = [];
    const starGeo = new THREE.OctahedronGeometry(0.09, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffea00,
      emissive: 0xff9900,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.5
    });

    for (let i = 0; i < 3; i++) {
      const star = new THREE.Mesh(starGeo, starMat);
      this.dizzyStarsGroup.add(star);
      this.dizzyStars.push(star);
    }

    this.isDizzyStarsActive = false;
    this.dizzyTimer = 0;
    this.dizzyOrbitAngle = 0;
  }

  triggerCameraShake(intensity = 0.18, duration = 0.35) {
    this.cameraShakeIntensity = intensity;
    this.cameraShakeTimer = duration;
  }

  playHitReaction() {
    // 1. Cek klip animasi model GLTF ('recievehit' atau 'punch')
    const hitAction = this.actions['recievehit'] || this.actions['punch'] || this.actions['defeat'];
    const runAction = this.actions['run'] || this.actions['run_carry'] || this.actions['walk'];

    if (hitAction) {
      if (runAction) runAction.fadeOut(0.12);
      hitAction.reset().fadeIn(0.12);
      hitAction.setLoop(THREE.LoopOnce);
      hitAction.clampWhenFinished = true;
      hitAction.play();

      // Kembalikan ke animasi lari setelah animasi hit selesai (~0.5 dtk)
      setTimeout(() => {
        if (this.state !== 'SELESAI' && this.character) {
          hitAction.fadeOut(0.2);
          if (runAction) runAction.reset().fadeIn(0.2).play();
        }
      }, 500);
    }

    // 2. Squash-and-stretch prosedural + sentakan mundur
    this.squashStretchTimer = 0.35;
    if (this.character) {
      this.character.position.z += 0.35; // Tersentak mundur dari pintu
    }
  }

  loadCharacter(modelFile) {
    if (this.character) {
      this.scene.remove(this.character);
      this.character = null;
    }
    this.currentModelFile = modelFile;

    const modelUrl = `${import.meta.env.BASE_URL}assets/characters/${modelFile}`;

    this.loader.load(
      modelUrl,
      (gltf) => {
        this.character = gltf.scene;
        this.character.scale.setScalar(CONFIG.characterScale);
        this.character.position.set(this.x, 0, 0);
        this.character.rotation.y = Math.PI;
        this.scene.add(this.character);

        this.actions = {};
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.character);

          gltf.animations.forEach((clip) => {
            this.actions[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
          });

          const idleAction = this.actions['idle'] || this.actions['walk'] || Object.values(this.actions)[0];
          if (idleAction) {
            idleAction.play();
          }
        }
      },
      undefined,
      (err) => {
        console.error(`Gagal memuat model di jalur ${this.index + 1}:`, err);
      }
    );
  }

  prepareForRace(laneQuestions) {
    this.questions = laneQuestions || [];
    this.currentQIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.stats = {
      correctCount: 0,
      totalAnswered: 0,
      responseTimes: []
    };
    this.isFinished = false;
    this.finishRank = 0;
    this.state = 'WAITING';
    this.currentSpeed = 0;
    this.currentTimeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.targetLateralX = this.x;
    this.chosenChoice = null;
    this.hasAnsweredCurrentQ = false;
    this.savedSisaWaktu = 0;

    // Reset status reaksi gerbang & animasi tabrakan
    this.hasDeterminedOutcome = false;
    this.hasExecutedGateImpact = false;
    this.isCurrentAnswerCorrect = false;

    // Reset getaran kamera lokal jalur
    this.cameraShakeIntensity = 0;
    this.cameraShakeTimer = 0;

    // Reset squash & stretch dan bintang pusing
    this.squashStretchTimer = 0;
    this.isDizzyStarsActive = false;
    this.dizzyTimer = 0;
    if (this.dizzyStarsGroup) {
      this.dizzyStarsGroup.visible = false;
    }

    if (this.currentGate) {
      this.currentGate.destroy();
      this.currentGate = null;
    }

    if (this.character) {
      this.character.position.set(this.x, 0, 0);
      const runAction = this.actions['run'] || this.actions['run_carry'];
      const victoryAction = this.actions['victory'];
      const idleAction = this.actions['idle'] || Object.values(this.actions)[0];

      if (runAction) runAction.stop();
      if (victoryAction) victoryAction.stop();
      if (idleAction) idleAction.reset().play();
    }

    this.camera.position.set(this.x, CONFIG.cameraHeight, CONFIG.cameraDistance);
    this.camera.lookAt(this.x, CONFIG.lookAtY, -CONFIG.lookAhead);
  }

  startRunning() {
    this.state = 'LARI_BEBAS';
    this.currentSpeed = CONFIG.BASE_SPEED;
    this.targetTimeScale = 1.0;
    this.rewardRunStartPosZ = 0;

    const idleAction = this.actions['idle'];
    const runAction = this.actions['run'] || this.actions['run_carry'] || this.actions['walk'] || Object.values(this.actions)[0];

    if (idleAction && runAction) {
      idleAction.fadeOut(0.3);
      runAction.reset().fadeIn(0.3).play();
    } else if (runAction) {
      runAction.play();
    }
  }

  triggerNextQuestion() {
    if (this.currentQIndex >= this.questions.length) {
      // Semua soal selesai! Lari ke finis sejauh FINISH_BUFFER
      this.state = 'FINISH_RUN';
      this.currentSpeed = CONFIG.BASE_SPEED * 1.35;
      this.targetTimeScale = 1.35;
      if (this.onQuestionAppear) {
        this.onQuestionAppear(this.index, null, this.currentQIndex, this.questions.length);
      }
      return;
    }

    this.state = 'SOAL_MENDEKAT';
    this.currentSpeed = CONFIG.BASE_SPEED; // Kecepatan dasar tetap agar waktu tempuh = waktu menjawab
    this.targetTimeScale = 1.0;
    this.chosenChoice = null;
    this.hasAnsweredCurrentQ = false;
    this.savedSisaWaktu = 0;
    this.targetLateralX = this.x;
    this.hasDeterminedOutcome = false;
    this.hasExecutedGateImpact = false;
    this.isCurrentAnswerCorrect = false;

    // Gerbang muncul tepat di jarak APPROACH_DISTANCE di depan karakter saat ini
    const gateZ = this.character.position.z - CONFIG.APPROACH_DISTANCE;
    if (this.currentGate) {
      this.currentGate.destroy();
    }
    this.currentGate = new Gate(this.x, gateZ, this.scene);

    // Tampilkan soal di UI untuk jalur ini
    const currentQ = this.questions[this.currentQIndex];
    if (this.onQuestionAppear) {
      this.onQuestionAppear(this.index, currentQ, this.currentQIndex, this.questions.length);
    }
  }

  // Pemain memilih salah satu jawaban A/B/C/D
  // Hasil benar/salah ditentukan saat berjarak DOOR_TRIGGER_DISTANCE (~5 unit)
  chooseAnswer(choiceIdx) {
    if (this.state !== 'SOAL_MENDEKAT' || this.hasAnsweredCurrentQ) return;

    this.hasAnsweredCurrentQ = true;
    this.chosenChoice = choiceIdx;

    // Simpan sisa waktu saat tombol ditekan untuk perhitungan bonus kecepatan nanti
    const distToGate = Math.max(0, this.character.position.z - this.currentGate.gateZ);
    this.savedSisaWaktu = Math.min(CONFIG.ANSWER_TIME, distToGate / CONFIG.BASE_SPEED);

    // Geser karakter menuju posisi pintu yang dipilih
    this.targetLateralX = this.x + this.doorOffsets[choiceIdx];
    this.currentGate.selectDoor(choiceIdx);

    // Jika karakter sudah berada di jarak <= DOOR_TRIGGER_DISTANCE saat menjawab
    if (distToGate <= (CONFIG.DOOR_TRIGGER_DISTANCE || 5.0) && !this.hasDeterminedOutcome) {
      this.hasDeterminedOutcome = true;
      this.determineGateReaction();
    }
  }

  // 1. Tentukan reaksi gerbang saat berjarak DOOR_TRIGGER_DISTANCE (~5 unit)
  determineGateReaction() {
    const currentQ = this.questions[this.currentQIndex];
    if (!currentQ) return;
    const isAnswered = (this.chosenChoice !== null && this.hasAnsweredCurrentQ);

    if (!isAnswered) {
      // Pemain yang tidak menjawab menabrak pintu terdekat di depannya
      let closestIdx = 0;
      let minDist = Infinity;
      for (let i = 0; i < this.doorOffsets.length; i++) {
        const doorWorldX = this.x + this.doorOffsets[i];
        const dist = Math.abs(this.character.position.x - doorWorldX);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }
      this.chosenChoice = closestIdx;
      this.targetLateralX = this.x + this.doorOffsets[closestIdx];
    }

    const isCorrect = isAnswered && (this.chosenChoice === currentQ.benar);
    this.isCurrentAnswerCorrect = isCorrect;

    if (isCorrect) {
      // Jawaban benar: panggil open() pada pintu terpilih, karakter lewat dengan boost dan asap
      if (this.currentGate && this.currentGate.doors[this.chosenChoice]) {
        this.currentGate.doors[this.chosenChoice].open();
      }
      this.currentSpeed = CONFIG.BASE_SPEED * CONFIG.DASH_MULTIPLIER;
      this.targetTimeScale = CONFIG.BOOST_TIMESCALE;
    } else {
      // Jawaban salah atau waktu habis: pintu tetap tertutup, karakter melambat mendekat
      this.currentSpeed = CONFIG.BASE_SPEED * CONFIG.WRONG_SPEED_MULTIPLIER;
      this.targetTimeScale = CONFIG.SLOW_TIMESCALE;
    }
  }

  // 2. Eksekusi tabrakan/penembusan pintu saat karakter menyentuh gerbang (distToGate <= 0.1)
  executeGateImpact() {
    const currentQ = this.questions[this.currentQIndex];
    if (!currentQ) return;
    const isAnswered = this.hasAnsweredCurrentQ;
    const isCorrect = this.isCurrentAnswerCorrect;
    const responseTime = isAnswered
      ? Math.max(0.1, CONFIG.ANSWER_TIME - this.savedSisaWaktu)
      : CONFIG.ANSWER_TIME;

    this.stats.totalAnswered++;
    this.stats.responseTimes.push(responseTime);

    let roundScore = 0;
    let timeBonus = 0;
    let streakBonus = 0;

    if (isCorrect) {
      // JAWABAN BENAR:
      this.stats.correctCount++;
      this.streak++;

      timeBonus = Math.round((this.savedSisaWaktu / CONFIG.ANSWER_TIME) * CONFIG.TIME_BONUS_MAX);
      if (this.streak >= CONFIG.STREAK_THRESHOLD) {
        streakBonus = CONFIG.STREAK_BONUS;
      }
      roundScore = CONFIG.BASE_SCORE + timeBonus + streakBonus;
      this.score += roundScore;

      // Karakter melaju menembus pintu terbuka dengan reward boost kecepatan
      this.currentSpeed = CONFIG.BASE_SPEED * CONFIG.REWARD_BOOST_MULTIPLIER;
      this.targetTimeScale = CONFIG.BOOST_TIMESCALE;
    } else {
      // JAWABAN SALAH / WAKTU HABIS:
      this.streak = 0;
      roundScore = 0;

      // 1. Animasi tabrakan: mainkan animasi hit/kick jika ada, atau squash-and-stretch procedural + sentak mundur
      this.playHitReaction();

      // 2. Panggil bash() pada pintu yang ditabrak
      if (this.currentGate && this.chosenChoice !== null && this.currentGate.doors[this.chosenChoice]) {
        this.currentGate.doors[this.chosenChoice].bash();
      }

      // 3. Panggil highlightCorrect() pada pintu jawaban yang benar (menyala hijau dan terbuka pelan)
      if (this.currentGate && this.currentGate.doors[currentQ.benar]) {
        this.currentGate.doors[currentQ.benar].highlightCorrect();
      }

      // 4. Getaran kamera kecil HANYA pada viewport jalur ini
      this.triggerCameraShake(CONFIG.CAMERA_SHAKE_INTENSITY, CONFIG.CAMERA_SHAKE_DURATION);

      // 5. Melambat (BASH_SLOW_MULTIPLIER ≈ 0.5 selama BASH_SLOW_DURATION ≈ 2 dtk) dengan efek bintang pusing di atas kepala
      this.isDizzyStarsActive = true;
      this.dizzyTimer = CONFIG.BASH_SLOW_DURATION || 2.0;
      this.currentSpeed = CONFIG.BASE_SPEED * (CONFIG.BASH_SLOW_MULTIPLIER || 0.5);
      this.targetTimeScale = CONFIG.SLOW_TIMESCALE;
    }

    // Beritahu UI untuk menampilkan jawaban benar/salah, perolehan skor, dan teks jawaban benar
    const options = currentQ.pilihan || currentQ.opsi || [];
    const correctText = options[currentQ.benar] || '';
    if (this.onQuestionEvaluated) {
      this.onQuestionEvaluated(this.index, {
        isCorrect,
        correctIndex: currentQ.benar,
        correctText: correctText,
        chosenIndex: this.chosenChoice,
        roundScore,
        totalScore: this.score,
        sisaWaktu: this.savedSisaWaktu,
        streak: this.streak,
        isTimeout: !isAnswered
      });
    }
  }

  update(delta) {
    if (!this.isActive) return;

    // Perbarui animasi mixer dengan timeScale halus
    this.currentTimeScale = THREE.MathUtils.lerp(this.currentTimeScale, this.targetTimeScale, 8.0 * delta);
    if (this.mixer) {
      this.mixer.timeScale = this.currentTimeScale;
      this.mixer.update(delta);
    }

    if (this.currentGate) {
      this.currentGate.update(delta);
    }

    if (!this.character) return;

    // Squash & Stretch prosedural saat tabrakan pintu
    if (this.squashStretchTimer > 0) {
      this.squashStretchTimer -= delta;
      const p = Math.max(0, this.squashStretchTimer / 0.35);
      const squashY = 1.0 - Math.sin(p * Math.PI) * 0.35;
      const stretchXZ = 1.0 + Math.sin(p * Math.PI) * 0.22;
      this.character.scale.set(
        CONFIG.characterScale * stretchXZ,
        CONFIG.characterScale * squashY,
        CONFIG.characterScale * stretchXZ
      );
    } else {
      this.character.scale.setScalar(CONFIG.characterScale);
    }

    // Efek Bintang Pusing (Dizzy Stars) di atas kepala
    if (this.isDizzyStarsActive && this.character) {
      this.dizzyTimer -= delta;
      this.dizzyOrbitAngle += delta * 7.0;

      if (this.dizzyStarsGroup) {
        this.dizzyStarsGroup.visible = true;
        const headY = 1.85;
        const radius = 0.34;

        this.dizzyStars.forEach((star, idx) => {
          const angle = this.dizzyOrbitAngle + (idx * Math.PI * 2 / 3);
          const sx = this.character.position.x + Math.cos(angle) * radius;
          const sz = this.character.position.z + Math.sin(angle) * radius;
          const sy = headY + Math.sin(angle * 2.0) * 0.06;
          star.position.set(sx, sy, sz);
          star.rotation.x += delta * 4.0;
          star.rotation.y += delta * 5.0;
        });
      }

      if (this.dizzyTimer <= 0) {
        this.isDizzyStarsActive = false;
        if (this.dizzyStarsGroup) this.dizzyStarsGroup.visible = false;
        if (this.state === 'LARI_BEBAS') {
          this.currentSpeed = CONFIG.BASE_SPEED * CONFIG.REWARD_SLOW_MULTIPLIER;
          this.targetTimeScale = CONFIG.SLOW_TIMESCALE;
        }
      }
    } else {
      if (this.dizzyStarsGroup) {
        this.dizzyStarsGroup.visible = false;
      }
    }

    // Efek pelebaran FOV kamera saat boost
    const isBoosting = (this.currentSpeed > CONFIG.BASE_SPEED * 1.1);
    const targetFOV = isBoosting ? (CONFIG.cameraFOV + CONFIG.BOOST_FOV_EXTRA) : CONFIG.cameraFOV;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 6.0 * delta);
    this.camera.updateProjectionMatrix();

    // Update sistem partikel debu di belakang karakter saat lari cepat/boost
    this.particleSystem.update(
      delta,
      isBoosting && this.state !== 'SELESAI',
      this.character.position.x,
      this.character.position.y,
      this.character.position.z
    );

    // -------------------------------------------------------------
    // LOGIKA STATE MACHINE MANDIRI
    // -------------------------------------------------------------
    if (this.state === 'WAITING') {
      return;
    }

    if (this.state === 'LARI_BEBAS') {
      // Maju dengan kecepatan reward (boost jika benar sebelumnya, slow jika salah)
      this.character.position.z -= this.currentSpeed * delta;

      const distTraveled = Math.abs(this.character.position.z - this.rewardRunStartPosZ);
      const targetDist = (this.currentQIndex === 0) ? CONFIG.START_OFFSET : CONFIG.REWARD_RUN_DISTANCE;

      if (distTraveled >= targetDist) {
        this.triggerNextQuestion();
      }
    } else if (this.state === 'SOAL_MENDEKAT') {
      // Maju dengan BASE_SPEED tetap menuju pintu
      this.character.position.z -= this.currentSpeed * delta;

      // Hitung sisa jarak dan waktu ke gerbang (tetap berbasis jarak)
      const distToGate = this.character.position.z - this.currentGate.gateZ;
      const sisaWaktu = Math.max(0, distToGate / CONFIG.BASE_SPEED);
      const timerRatio = Math.max(0, Math.min(1, sisaWaktu / CONFIG.ANSWER_TIME));

      // Kirim pembaruan timer ke UI
      if (this.onTimerUpdate) {
        this.onTimerUpdate(this.index, timerRatio, sisaWaktu);
      }

      // 1. Pada jarak DOOR_TRIGGER_DISTANCE (~5 unit) dari gerbang:
      // Tentukan hasil jawaban (Benar -> open() pada pintu terpilih; Salah/Timeout -> pintu tertutup)
      if (distToGate <= (CONFIG.DOOR_TRIGGER_DISTANCE || 5.0) && !this.hasDeterminedOutcome) {
        this.hasDeterminedOutcome = true;
        this.determineGateReaction();
      }

      // 2. Saat karakter menyentuh gerbang (distToGate <= 0.1):
      // Jika salah/timeout -> karakter menabrak (hit/kick + squash-stretch + bash() + highlightCorrect() + camera shake + dizzy stars)
      // Jika benar -> lewat mulus dengan boost dan asap
      if (distToGate <= 0.1 && !this.hasExecutedGateImpact) {
        this.hasExecutedGateImpact = true;
        this.state = 'LEWAT_GERBANG';
        this.executeGateImpact();
      }
    } else if (this.state === 'LEWAT_GERBANG') {
      // Karakter melaju menembus pintu gerbang dengan kecepatan boost atau slow
      this.character.position.z -= this.currentSpeed * delta;

      // Berikan jarak cukup agar animasi serpihan pecahan (1.0 detik) selesai dengan tuntas
      if (this.character.position.z <= this.currentGate.gateZ - 7.5) {
        // Hancurkan gerbang yang telah dilewati tanpa kebocoran memori
        this.currentGate.destroy();
        this.currentGate = null;
        this.hasDeterminedOutcome = false;
        this.hasExecutedGateImpact = false;

        this.currentQIndex++;

        if (this.currentQIndex < this.questions.length) {
          // Masuk ke segmen LARI_BEBAS untuk soal berikutnya
          this.state = 'LARI_BEBAS';
          this.rewardRunStartPosZ = this.character.position.z;
        } else {
          // Semua soal selesai! Lari sprint ke garis finis
          this.state = 'FINISH_RUN';
          this.currentSpeed = CONFIG.BASE_SPEED * 1.35;
          this.targetTimeScale = 1.35;
          if (this.onQuestionAppear) {
            this.onQuestionAppear(this.index, null, this.currentQIndex, this.questions.length);
          }
        }
      }
    } else if (this.state === 'FINISH_RUN') {
      this.character.position.z -= this.currentSpeed * delta;

      if (this.character.position.z <= this.finishZ) {
        this.state = 'SELESAI';
        this.isFinished = true;
        this.currentSpeed = 0;
        this.targetTimeScale = 1.0;
        this.character.position.z = this.finishZ;

        // Animasi Selebrasi Victory
        const runAction = this.actions['run'] || this.actions['run_carry'];
        const victoryAction = this.actions['victory'] || this.actions['idle'];

        if (runAction && victoryAction) {
          runAction.fadeOut(0.3);
          victoryAction.reset().fadeIn(0.3).play();
        }

        if (this.onPlayerFinished) {
          this.onPlayerFinished(this.index);
        }
      }
    }

    // Geser posisi X karakter secara halus menuju pintu yang dipilih
    this.character.position.x = THREE.MathUtils.lerp(
      this.character.position.x,
      this.targetLateralX,
      CONFIG.LATERAL_SPEED * delta
    );

    // Getaran kamera kecil (Camera Shake) HANYA pada viewport jalur ini
    let shakeX = 0, shakeY = 0;
    if (this.cameraShakeTimer > 0) {
      this.cameraShakeTimer -= delta;
      const p = Math.max(0, this.cameraShakeTimer / (CONFIG.CAMERA_SHAKE_DURATION || 0.35));
      const amp = this.cameraShakeIntensity * p;
      shakeX = (Math.random() - 0.5) * 2 * amp;
      shakeY = (Math.random() - 0.5) * 2 * amp;
    }

    // Kamera mengikuti dari belakang (independen per jalur)
    this.camera.position.set(
      this.x + shakeX,
      CONFIG.cameraHeight + shakeY,
      this.character.position.z + CONFIG.cameraDistance
    );
    this.camera.lookAt(
      this.x + shakeX * 0.4,
      CONFIG.lookAtY + shakeY * 0.4,
      this.character.position.z - CONFIG.lookAhead
    );
  }

  destroy() {
    if (this.currentGate) {
      this.currentGate.destroy();
    }
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    if (this.dizzyStarsGroup) {
      this.scene.remove(this.dizzyStarsGroup);
    }
  }
}
