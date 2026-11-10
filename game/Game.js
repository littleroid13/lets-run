import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Lane } from '../lanes/Lane.js';
import { OverlayUI } from '../ui/OverlayUI.js';
import { LoginScreen } from '../ui/LoginScreen.js';
import { LobbyScreen } from '../ui/LobbyScreen.js';
import { CountdownScreen } from '../ui/CountdownScreen.js';
import { PodiumScreen } from '../ui/PodiumScreen.js';
import { EnvironmentManager } from '../environment/EnvironmentManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { TeacherSettingsModal } from '../ui/TeacherSettingsModal.js';
import { CHARACTERS } from '../src/characters.js';
import { CONFIG } from '../src/config.js';

export class Game {
  constructor(containerId = 'app') {
    this.container = document.getElementById(containerId);

    // Inisialisasi scene 3D
    this.scene = new THREE.Scene();

    // Inisialisasi renderer WebGL
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.loader = new GLTFLoader();

    // Setup pencahayaan Hemisphere, Sun, dan Ambient
    this.setupLighting();

    // Inisialisasi Environment Manager
    this.environment = new EnvironmentManager(this.scene, this.loader);

    // Konfigurasi 4 jalur dasar
    this.laneConfigs = [
      { id: 0, modelFile: 'BlueSoldier_Male.gltf', xOffset: -75, trackColor: 0x1f3c88 },
      { id: 1, modelFile: 'Cowboy_Hair.gltf', xOffset: -25, trackColor: 0xb33939 },
      { id: 2, modelFile: 'Ninja_Female.gltf', xOffset: 25, trackColor: 0x218c74 },
      { id: 3, modelFile: 'Zombie_Male.gltf', xOffset: 75, trackColor: 0x574b90 }
    ];

    // Buat 4 Lane mandiri
    this.lanes = this.laneConfigs.map(
      (cfg, idx) => new Lane(idx, cfg, this.scene, this.loader)
    );

    // Hubungkan event callback dari setiap jalur ke Overlay UI
    this.setupLaneCallbacks();

    // Layar UI game
    this.uiOverlay = new OverlayUI('ui-overlay', (playerId, optIdx) => {
      this.handlePlayerAnswer(playerId, optIdx);
    });

    // Inisialisasi Audio Manager (BGM & SFX)
    this.audioManager = new AudioManager();
    this.audioBtn = document.getElementById('audio-toggle-btn');
    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audioManager.toggleMute();
        this.updateAudioButtonState();
      });
    }
    this.updateAudioButtonState();
    this.audioManager.playBgm('lobby');

    // Container untuk layar antarmuka
    this.screenContainer = document.getElementById('screen-container');
    this.lobbyScreen = null;

    // State Game: 'LOGIN' | 'LOBBY' | 'COUNTDOWN' | 'RACE' | 'PODIUM'
    this.gameState = 'LOGIN';
    this.isPaused = false;

    // Data pemain aktif dan urutan finis
    this.activePlayers = [];
    this.finishOrder = [];

    // Muat preferensi guru yang tersimpan
    this.loadTeacherSettings();

    // Inisialisasi Modal Pengaturan Guru (Tombol ⚙️)
    this.teacherModal = new TeacherSettingsModal(this);
    const teacherBtn = document.getElementById('teacher-settings-btn');
    if (teacherBtn) {
      teacherBtn.style.display = 'none'; // Sembunyikan selama layar login
      const openSettings = (e) => {
        e.stopPropagation();
        this.teacherModal.show();
      };
      teacherBtn.addEventListener('pointerdown', openSettings);
      teacherBtn.addEventListener('click', openSettings);
    }

    // Inisialisasi Tombol Fullscreen (Layar Penuh)
    this.setupFullscreen();

    // Bank Soal
    this.rawQuestions = [];

    // Muat soal dari file JSON atau localStorage
    this.loadQuestions();

    // Muat aset lingkungan 3D
    this.initEnvironment();

    // Tampilkan Layar Login di depan untuk memasukkan Kode Akses ("MRLIT105")
    this.loginScreen = new LoginScreen(this.screenContainer, () => {
      this.initLobby();
    });

    this.clock = new THREE.Clock();
    window.addEventListener('resize', () => this.onResize());

    // Keyboard shortcut pause (Spasi atau P)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Space') {
        if (this.gameState === 'RACE') {
          this.togglePause();
        }
      }
    });

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x4a7c59, 1.25);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    this.sunLight.position.set(35, 55, 30);
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);
  }

  updateAudioButtonState() {
    if (!this.audioBtn) return;
    if (this.audioManager.isMuted) {
      this.audioBtn.textContent = '🔇';
      this.audioBtn.classList.add('muted');
      this.audioBtn.title = 'Suara Mati (Klik untuk Nyalakan)';
    } else {
      this.audioBtn.textContent = '🔊';
      this.audioBtn.classList.remove('muted');
      this.audioBtn.title = 'Suara Aktif (Klik untuk Matikan)';
    }
  }

  setupFullscreen() {
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    if (!this.fullscreenBtn) return;

    const updateFsIcon = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      this.fullscreenBtn.textContent = isFs ? '🗗' : '⛶';
      this.fullscreenBtn.title = isFs ? 'Keluar Layar Penuh (ESC)' : 'Layar Penuh (Full Screen)';
      this.fullscreenBtn.classList.toggle('active', isFs);
    };

    const toggleFs = (e) => {
      e.stopPropagation();
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          root.requestFullscreen().catch((err) => console.warn('Gagal Fullscreen:', err));
        } else if (root.webkitRequestFullscreen) {
          root.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => console.warn('Gagal Exit Fullscreen:', err));
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    };

    this.fullscreenBtn.addEventListener('click', toggleFs);
    document.addEventListener('fullscreenchange', updateFsIcon);
    document.addEventListener('webkitfullscreenchange', updateFsIcon);
    updateFsIcon();
  }

  setupLaneCallbacks() {
    this.lanes.forEach((lane) => {
      lane.onQuestionAppear = (laneIdx, qData, qIdx, totalQ) => {
        this.uiOverlay.showQuestionForLane(laneIdx, qData, qIdx, totalQ);
      };

      lane.onTimerUpdate = (laneIdx, ratio, sisaWaktu) => {
        this.uiOverlay.updateTimerForLane(laneIdx, ratio, sisaWaktu);
      };

      lane.onQuestionEvaluated = (laneIdx, result) => {
        this.uiOverlay.showEvaluationForLane(laneIdx, result);

        // Putar SFX Benar atau Salah saat jawaban terspill di pintu
        if (result.isCorrect) {
          this.audioManager.playSfx('benar');
        } else {
          this.audioManager.playSfx('salah');
        }
      };

      lane.onPlayerFinished = (laneIdx) => {
        this.handlePlayerFinished(laneIdx);
      };
    });
  }

  async initEnvironment() {
    try {
      await this.environment.loadAssets();

      const totalQ = CONFIG.TOTAL_QUESTIONS || 10;
      const cycleDist = CONFIG.REWARD_RUN_DISTANCE + CONFIG.APPROACH_DISTANCE;
      const trackLen = CONFIG.START_OFFSET + (totalQ * cycleDist) + CONFIG.FINISH_BUFFER;
      const finishZ = -trackLen;

      this.environment.updateTrackLength(trackLen);

      // Bangun dekorasi samping untuk tiap jalur sepanjang lintasan dinamis
      this.lanes.forEach((lane, idx) => {
        this.environment.buildLaneDecorations(lane.x, 20, finishZ - 30, idx);
      });

      // Bangun tebing & bukit di belakang garis finis
      this.environment.buildDistantScenery(finishZ);

      // Bangun awan-awan di langit
      this.environment.buildClouds(20, finishZ - 60);

      // Terapkan tema yang tersimpan di CONFIG
      this.environment.setTheme(CONFIG.THEME || 'siang', {
        hemiLight: this.hemiLight,
        sunLight: this.sunLight
      });
    } catch (err) {
      console.error('Error saat membangun lingkungan:', err?.message, err?.stack || err);
    }
  }

  loadTeacherSettings() {
    try {
      const saved = localStorage.getItem('lets_run_teacher_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.totalQuestions) CONFIG.TOTAL_QUESTIONS = parsed.totalQuestions;
        if (parsed.answerTime) CONFIG.ANSWER_TIME = parsed.answerTime;
        if (parsed.theme) CONFIG.THEME = parsed.theme;
        if (parsed.audioEnabled !== undefined) CONFIG.AUDIO_ENABLED = parsed.audioEnabled;
      }
    } catch (e) {
      console.warn('Gagal memuat preferensi guru dari localStorage:', e);
    }
  }

  async loadQuestions() {
    try {
      // Periksa apakah ada soal kustom tersimpan di localStorage
      const customData = localStorage.getItem('lets_run_custom_questions');
      if (customData) {
        try {
          const parsed = JSON.parse(customData);
          if (parsed && Array.isArray(parsed.soal) && parsed.soal.length > 0) {
            this.rawQuestions = parsed.soal;
            console.log(`Memuat ${this.rawQuestions.length} soal kustom dari localStorage ("${parsed.judul || 'Kustom'}")`);
            this.adjustTotalQuestionsLimit();
            return;
          }
        } catch (e) {
          console.warn('Gagal membaca data soal kustom di localStorage, beralih ke bawaan:', e);
        }
      }

      await this.loadDefaultQuestions();
    } catch (err) {
      console.error('Gagal memuat bank soal:', err);
    }
  }

  async loadDefaultQuestions() {
    try {
      const url = `${import.meta.env.BASE_URL}data/questions.json`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.soal) {
        this.rawQuestions = data.soal;
        console.log(`Memuat ${this.rawQuestions.length} soal bawaan dari questions.json`);
        this.adjustTotalQuestionsLimit();
      }
    } catch (err) {
      console.error('Gagal memuat default questions.json:', err);
    }
  }

  applyCustomQuestions(questions, title = 'Kustom') {
    if (!questions || questions.length === 0) return;
    this.rawQuestions = questions;
    console.log(`Berhasil menerapkan ${questions.length} soal kustom ("${title}")`);
    this.adjustTotalQuestionsLimit();
  }

  adjustTotalQuestionsLimit() {
    const maxAvailable = this.rawQuestions ? this.rawQuestions.length : 10;
    if (CONFIG.TOTAL_QUESTIONS > maxAvailable) {
      CONFIG.TOTAL_QUESTIONS = maxAvailable;
    }
    // Perbarui lintasan pada semua jalur aktif
    this.lanes.forEach(lane => {
      lane.recalculateTrack(CONFIG.TOTAL_QUESTIONS);
    });
  }

  // Buat set soal unik dan teracak secara independen untuk seorang pemain
  generateQuestionsForPlayer(playerId) {
    const totalQ = CONFIG.TOTAL_QUESTIONS || 10;
    let chosenList = [];

    if (CONFIG.MODE_SOAL === 'subset_beda' && this.rawQuestions.length > totalQ) {
      // Ambil subset acak dari bank soal
      const shuffledBank = [...this.rawQuestions].sort(() => Math.random() - 0.5);
      chosenList = shuffledBank.slice(0, totalQ);
    } else {
      // 'urutan_beda': Ambil totalQ soal, acak urutannya khusus pemain ini
      const basePool = this.rawQuestions.slice(0, Math.min(totalQ, this.rawQuestions.length));
      chosenList = [...basePool].sort(() => Math.random() - 0.5);
    }

    // Acak pula posisi pilihan A, B, C, D secara unik per soal untuk pemain ini
    return chosenList.map((item) => {
      const correctText = item.pilihan[item.benar];
      const shuffledOptions = [...item.pilihan].sort(() => Math.random() - 0.5);
      const newCorrectIndex = shuffledOptions.indexOf(correctText);

      return {
        tanya: item.tanya,
        pilihan: shuffledOptions,
        benar: newCorrectIndex,
        originalAnswer: correctText
      };
    });
  }

  // Inisialisasi dan tampilkan layar lobi setelah login berhasil
  initLobby() {
    this.gameState = 'LOBBY';
    const teacherBtn = document.getElementById('teacher-settings-btn');
    if (teacherBtn) {
      teacherBtn.style.display = 'flex';
    }

    if (!this.lobbyScreen) {
      this.lobbyScreen = new LobbyScreen(this.screenContainer, (selectedPlayers) => {
        this.startCountdown(selectedPlayers);
      });
    } else {
      this.lobbyScreen.show();
    }
  }

  // Masuk fase Countdown 3-2-1-GO
  startCountdown(allPlayers) {
    this.gameState = 'COUNTDOWN';
    this.isPaused = false;
    this.finishOrder = [];

    // Hentikan musik lobi saat countdown dimulai
    this.audioManager.fadeOutBgm(300);

    if (this.lobbyScreen) {
      this.lobbyScreen.hide();
    }

    const readyPlayers = allPlayers.filter(p => p.isReady);
    this.activePlayers = readyPlayers.map(p => {
      const char = CHARACTERS[p.charIdx];
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        charId: char.id,
        charName: char.name,
        charFile: char.file,
        charIcon: char.icon
      };
    });

    const totalQ = CONFIG.TOTAL_QUESTIONS || 10;

    // Siapkan tiap jalur secara independen
    this.lanes.forEach((lane) => {
      const player = this.activePlayers.find(p => p.id === lane.index);
      if (player) {
        lane.isActive = true;
        lane.trackGroup.visible = true;
        lane.recalculateTrack(totalQ);

        if (lane.currentModelFile !== player.charFile) {
          lane.loadCharacter(player.charFile);
        }

        // Generate soal acak independen untuk jalur ini
        const playerQuestions = this.generateQuestionsForPlayer(player.id);
        lane.prepareForRace(playerQuestions);
      } else {
        lane.isActive = false;
        lane.trackGroup.visible = false;
        if (lane.character) lane.character.visible = false;
      }
    });

    const countdown = new CountdownScreen(document.getElementById('screen-container'), () => {
      this.startRace();
    });
    countdown.start();
  }

  // Mulai Balapan
  startRace() {
    this.gameState = 'RACE';
    this.isPaused = false;
    this.finishOrder = [];

    // Putar musik latar lari (bgm_run) saat balapan dimulai
    this.audioManager.playBgm('run');

    // Pasang overlay UI untuk pemain aktif
    this.uiOverlay.setup(this.activePlayers);

    // Semua karakter aktif mulai lari di segmen awal
    this.lanes.forEach((lane) => {
      if (lane.isActive) {
        if (lane.character) lane.character.visible = true;
        lane.startRunning();
      }
    });
  }

  handlePlayerAnswer(playerId, choiceIndex) {
    if (this.gameState !== 'RACE' || this.isPaused) return;

    const lane = this.lanes[playerId];
    if (lane && lane.isActive) {
      lane.chooseAnswer(choiceIndex);
    }
  }

  // Tangani ketika salah satu pemain berhasil melewati garis finis
  handlePlayerFinished(laneIdx) {
    if (this.finishOrder.includes(laneIdx)) return;

    this.finishOrder.push(laneIdx);
    const rank = this.finishOrder.length; // 1, 2, 3, 4
    const bonus = CONFIG.FINISH_BONUSES[rank - 1] || 0;

    const lane = this.lanes[laneIdx];
    lane.score += bonus;
    lane.finishRank = rank;

    this.uiOverlay.showFinishBadgeForLane(laneIdx, `#${rank}`, bonus);
    this.uiOverlay.updateScore(laneIdx, lane.score);

    // Putar SFX menang saat juara 1 berhasil menyentuh garis finis
    if (rank === 1) {
      this.audioManager.playSfx('menang');
    }

    console.log(`Pemain ${laneIdx + 1} Finis di peringkat #${rank}! (+${bonus} PTS bonus finis)`);

    // Periksa apakah SEMUA pemain aktif sudah finis
    const allFinished = this.activePlayers.every(p => this.lanes[p.id].isFinished);
    if (allFinished) {
      console.log('Semua pemain telah finis! Menampilkan podium...');
      setTimeout(() => {
        this.showPodium();
      }, 1800);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    console.log(this.isPaused ? 'Game Dijeda (Paused)' : 'Game Dilanjutkan (Resumed)');
  }

  showPodium() {
    this.gameState = 'PODIUM';
    this.uiOverlay.hide();

    // Redupkan musik lari dan putar suara kemenangan (sfx_menang)
    this.audioManager.fadeOutBgm(600);
    this.audioManager.playSfx('menang');

    const totalRaceQ = CONFIG.TOTAL_QUESTIONS || 10;

    const results = this.activePlayers.map((player) => {
      const lane = this.lanes[player.id];
      const times = lane.stats.responseTimes;
      const avgTime = times.length > 0
        ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
        : '0.0';

      const totalQ = lane.questions.length || totalRaceQ;
      const correct = lane.stats.correctCount || 0;
      const accuracy = Math.round((correct / totalQ) * 100);
      const finishRank = lane.finishRank || 99;
      const finishBonus = CONFIG.FINISH_BONUSES[finishRank - 1] || 0;
      const baseScore = correct * CONFIG.BASE_SCORE;
      const extraScore = Math.max(0, lane.score - (baseScore + finishBonus));

      return {
        id: player.id,
        name: player.name,
        color: player.color,
        charName: player.charName,
        charIcon: player.charIcon,
        score: lane.score,
        correctCount: correct,
        totalQuestions: totalQ,
        accuracyPercent: accuracy,
        baseScore,
        extraScore,
        finishBonus,
        avgResponseTime: avgTime,
        finishRank
      };
    });

    // Urutkan peringkat: Skor tertinggi sebagai penentu utama, waktu/peringkat finis sebagai pemecah seri
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.finishRank - b.finishRank;
    });

    const gameMeta = {
      theme: CONFIG.THEME,
      totalQuestions: CONFIG.TOTAL_QUESTIONS,
      answerTime: CONFIG.ANSWER_TIME
    };

    new PodiumScreen(
      document.getElementById('screen-container'),
      results,
      () => {
        this.startCountdown(this.activePlayers.map(p => ({
          ...p,
          isReady: true,
          charIdx: CHARACTERS.findIndex(c => c.file === p.charFile)
        })));
      },
      () => {
        this.returnToLobby();
      },
      gameMeta
    );
  }

  returnToLobby() {
    this.gameState = 'LOBBY';
    this.isPaused = false;
    this.uiOverlay.hide();

    // Kembali putar musik lobi (bgm_lobbyrun)
    this.audioManager.playBgm('lobby');

    this.lanes.forEach((lane) => {
      lane.isActive = true;
      lane.trackGroup.visible = true;
      if (lane.character) lane.character.visible = true;
      lane.prepareForRace();
    });

    if (this.lobbyScreen) {
      this.lobbyScreen.show();
    }
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);

    if (this.isPaused) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Update awan lingkungan
    if (this.environment) {
      this.environment.update(delta);
    }

    // Update logika jalur secara independen
    for (let i = 0; i < this.lanes.length; i++) {
      this.lanes[i].update(delta);
    }

    // Viewport Scissor: Render kolom layar sesuai pemain aktif
    const activeLanes = (this.gameState === 'RACE' || this.gameState === 'COUNTDOWN')
      ? this.lanes.filter(l => l.isActive)
      : this.lanes;

    const count = activeLanes.length || 1;
    const totalWidth = window.innerWidth;
    const totalHeight = window.innerHeight;
    const colWidth = Math.floor(totalWidth / count);

    this.renderer.setScissorTest(true);

    for (let i = 0; i < count; i++) {
      const left = i * colWidth;
      const width = (i === count - 1) ? (totalWidth - left) : colWidth;
      const height = totalHeight;

      this.renderer.setViewport(left, 0, width, height);
      this.renderer.setScissor(left, 0, width, height);

      const lane = activeLanes[i];
      lane.camera.aspect = width / height;
      lane.camera.updateProjectionMatrix();

      this.renderer.render(this.scene, lane.camera);
    }
  }
}
