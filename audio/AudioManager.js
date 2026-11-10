import { CONFIG } from '../src/config.js';

let globalAudioManagerInstance = null;
export function setGlobalAudioManager(am) {
  globalAudioManagerInstance = am;
}
export function getGlobalAudioManager() {
  return globalAudioManagerInstance || window.__gameInstance?.audioManager || null;
}
export function playAudioSfx(type) {
  const am = getGlobalAudioManager();
  if (am) {
    am.playSfx(type);
  }
}

export class AudioManager {
  constructor() {
    const base = import.meta.env.BASE_URL || '/';
    // Pastikan path selalu valid
    const cleanBase = base.endsWith('/') ? base : `${base}/`;

    // Path primer menggunakan ekstensi .asset untuk mencegah intercept download otomatis IDM
    this.paths = {
      bgm_lobby: `${cleanBase}assets/audio/bgm_lobbyrun.asset`,
      bgm_run: `${cleanBase}assets/audio/bgm_run.asset`,
      sfx_benar: `${cleanBase}assets/audio/sfx_benar.asset`,
      sfx_salah: `${cleanBase}assets/audio/sfx_salah.asset`,
      sfx_menang: `${cleanBase}assets/audio/sfx_menang.asset`,
      sfx_door_open: `${cleanBase}assets/audio/sfx_door_open.asset`,
      sfx_door_bash: `${cleanBase}assets/audio/sfx_door_bash.asset`
    };

    // Fallback jika file .asset tidak tersedia
    this.fallbackPaths = {
      bgm_lobby: `${cleanBase}assets/audio/bgm_lobbyrun.mp3`,
      bgm_run: `${cleanBase}assets/audio/bgm_run.mp3`,
      sfx_benar: `${cleanBase}assets/audio/sfx_benar.mp3`,
      sfx_salah: `${cleanBase}assets/audio/sfx_salah.mp3`,
      sfx_menang: `${cleanBase}assets/audio/sfx_menang.mp3`,
      sfx_door_open: `${cleanBase}assets/audio/sfx_door_open.mp3`,
      sfx_door_bash: `${cleanBase}assets/audio/sfx_door_bash.mp3`
    };

    this.isMuted = !CONFIG.AUDIO_ENABLED;
    this.bgmVolume = CONFIG.BGM_VOLUME ?? 0.45;
    this.sfxVolume = CONFIG.SFX_VOLUME ?? 0.75;

    this.currentBgmType = null;
    this.fadeInterval = null;
    this.audioCtx = null;

    // Cache Blob URL di RAM (skema blob:http://...)
    // IDM tidak pernah mengintersepsi URL bertipe Blob RAM
    this.blobUrlCache = new Map();
    this.loadingPromises = new Map();

    // Elemen Audio BGM (Loop)
    this.bgmElements = {
      lobby: this.createAudioElement('bgm_lobby', true),
      run: this.createAudioElement('bgm_run', true)
    };

    // Pool SFX agar beberapa suara dapat diputar bersamaan tanpa terpotong (polyphonic)
    this.sfxPools = {
      benar: this.createSfxPool('sfx_benar', 4),
      salah: this.createSfxPool('sfx_salah', 4),
      menang: this.createSfxPool('sfx_menang', 2),
      door_open: this.createSfxPool('sfx_door_open', 4),
      door_bash: this.createSfxPool('sfx_door_bash', 4)
    };
    this.sfxIndices = { benar: 0, salah: 0, menang: 0, door_open: 0, door_bash: 0 };

    this.isUnlocked = false;
    this.pendingBgm = null;

    setGlobalAudioManager(this);
    this.setupUnlockListeners();

    // Preload seluruh audio ke Blob URL di background
    this.preloadAllAudio();
  }

  // Mengunduh file audio via fetch() dan mengubahnya menjadi Blob URL di RAM
  async loadBlobUrl(key) {
    if (this.blobUrlCache.has(key)) {
      return this.blobUrlCache.get(key);
    }
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const promise = (async () => {
      const primary = this.paths[key];
      const fallback = this.fallbackPaths[key];

      const tryFetch = async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const buf = await res.arrayBuffer();
          if (!buf || buf.byteLength === 0) return null;
          const blob = new Blob([buf], { type: 'audio/mpeg' });
          return URL.createObjectURL(blob);
        } catch {
          return null;
        }
      };

      // 1. Coba fetch format .asset (aman dari filter file type IDM)
      let blobUrl = primary ? await tryFetch(primary) : null;

      // 2. Jika belum ada, coba fetch format .mp3 dan bungkus ke Blob
      if (!blobUrl && fallback) {
        blobUrl = await tryFetch(fallback);
      }

      if (blobUrl) {
        this.blobUrlCache.set(key, blobUrl);
        return blobUrl;
      }

      return fallback || primary || null;
    })();

    this.loadingPromises.set(key, promise);
    const result = await promise;
    this.loadingPromises.delete(key);
    return result;
  }

  async preloadAllAudio() {
    const keys = ['bgm_lobby', 'bgm_run', 'sfx_benar', 'sfx_salah', 'sfx_menang'];
    await Promise.all(keys.map((k) => this.loadBlobUrl(k)));
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended' && this.isUnlocked) {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  playFallbackSynth(type) {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      if (type === 'door_open' || type === 'sfx_door_open') {
        // Sintesis suara ayunan pintu halus (whoosh + nada kilau hangat)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.32);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25 * this.sfxVolume, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'door_bash' || type === 'sfx_door_bash') {
        // Sintesis suara dentuman keras & pecahan kayu/batu (bash crash)
        const sampleRate = ctx.sampleRate;
        const dur = 0.35;
        const buffer = ctx.createBuffer(1, Math.floor(sampleRate * dur), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const decay = Math.exp(-i / (sampleRate * 0.06));
          data[i] = (Math.random() * 2 - 1) * decay;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + dur);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.55 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      }
    } catch {
      // Fallback aman tanpa error
    }
  }

  createAudioElement(key, loop = false) {
    const audio = new Audio();
    audio.loop = loop;
    audio.preload = 'auto';

    // Sambungkan ke Blob URL segera setelah siap
    this.loadBlobUrl(key).then((blobUrl) => {
      if (blobUrl && !audio.src) {
        audio.src = blobUrl;
      }
    });

    return audio;
  }

  createSfxPool(key, count = 3) {
    const pool = [];
    for (let i = 0; i < count; i++) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio._hasError = false;
      audio.addEventListener('error', () => {
        audio._hasError = true;
      });
      pool.push(audio);
    }

    this.loadBlobUrl(key).then((blobUrl) => {
      if (blobUrl) {
        pool.forEach((audio) => {
          if (!audio.src) {
            audio.src = blobUrl;
          }
        });
      }
    });

    return pool;
  }

  setupUnlockListeners() {
    const onUserInteraction = async () => {
      this.isUnlocked = true;
      if (this.pendingBgm && !this.isMuted) {
        const audio = this.bgmElements[this.pendingBgm];
        if (audio) {
          if (!audio.src) {
            const blobUrl = await this.loadBlobUrl(`bgm_${this.pendingBgm}`);
            if (blobUrl) audio.src = blobUrl;
          }
          if (audio.paused) {
            audio.volume = this.bgmVolume;
            audio.play().catch(() => {});
          }
        }
      }
    };

    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('click', onUserInteraction, { passive: true });
  }

  async playBgm(type) {
    this.pendingBgm = type;
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const key = `bgm_${type}`;
    const targetAudio = this.bgmElements[type];
    if (!targetAudio) return;

    // Pastikan audio memiliki sumber Blob URL sebelum dimainkan
    if (!targetAudio.src || targetAudio.src === '' || targetAudio.src === window.location.href) {
      const blobUrl = await this.loadBlobUrl(key);
      if (blobUrl && targetAudio.src !== blobUrl) {
        targetAudio.src = blobUrl;
      }
    }

    if (this.currentBgmType === type) {
      if (targetAudio.paused && !this.isMuted) {
        targetAudio.volume = this.bgmVolume;
        targetAudio.play().catch(() => {});
      }
      return;
    }

    // Hentikan BGM sebelumnya jika ada
    Object.keys(this.bgmElements).forEach((k) => {
      if (k !== type) {
        const el = this.bgmElements[k];
        el.pause();
        el.currentTime = 0;
      }
    });

    this.currentBgmType = type;
    targetAudio.currentTime = 0;
    targetAudio.volume = this.isMuted ? 0 : this.bgmVolume;
    targetAudio.loop = true;

    const playPromise = targetAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isUnlocked = true;
        })
        .catch(() => {
          // Tertahan autoplay browser, akan dimulai otomatis saat interaksi pertama
        });
    }
  }

  stopBgm() {
    this.pendingBgm = null;
    this.currentBgmType = null;
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    Object.values(this.bgmElements).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  fadeOutBgm(durationMs = 600) {
    if (!this.currentBgmType) return;
    const audio = this.bgmElements[this.currentBgmType];
    if (!audio || audio.paused) {
      this.stopBgm();
      return;
    }

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    const startVolume = audio.volume;
    const stepTime = 50;
    const steps = Math.max(1, durationMs / stepTime);
    const volumeStep = startVolume / steps;

    this.fadeInterval = setInterval(() => {
      if (audio.volume > volumeStep) {
        audio.volume = Math.max(0, audio.volume - volumeStep);
      } else {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        this.stopBgm();
      }
    }, stepTime);
  }

  playSfx(type) {
    if (this.isMuted) return;

    // Normalisasi kunci (mis. 'sfx_door_open' atau 'door_open')
    const key = type.startsWith('sfx_') ? type.replace('sfx_', '') : type;
    const pool = this.sfxPools[key] || this.sfxPools[type];

    if (!pool || pool.length === 0) {
      this.playFallbackSynth(key);
      return;
    }

    const idx = this.sfxIndices[key] ?? this.sfxIndices[type] ?? 0;
    const poolLength = pool.length;
    if (this.sfxIndices[key] !== undefined) {
      this.sfxIndices[key] = (idx + 1) % poolLength;
    } else if (this.sfxIndices[type] !== undefined) {
      this.sfxIndices[type] = (idx + 1) % poolLength;
    }

    const audio = pool[idx];
    if (!audio || audio._hasError) {
      this.playFallbackSynth(key);
      return;
    }

    if (!audio.src) {
      const cached = this.blobUrlCache.get(`sfx_${key}`) || this.blobUrlCache.get(key);
      if (cached) {
        audio.src = cached;
      } else {
        this.playFallbackSynth(key);
        return;
      }
    }

    audio.pause();
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, this.sfxVolume));

    const promise = audio.play();
    if (promise !== undefined) {
      promise.catch(() => {
        // Fallback jika browser menolak memutar audio (404 / autoplay policy)
        this.playFallbackSynth(key);
      });
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    CONFIG.AUDIO_ENABLED = !muted;

    Object.values(this.bgmElements).forEach((audio) => {
      audio.volume = this.isMuted ? 0 : this.bgmVolume;
    });

    if (!this.isMuted && this.currentBgmType) {
      const active = this.bgmElements[this.currentBgmType];
      if (active && active.paused) {
        active.play().catch(() => {});
      }
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return !this.isMuted;
  }

  setBgmVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    CONFIG.BGM_VOLUME = this.bgmVolume;
    if (!this.isMuted && this.currentBgmType) {
      const active = this.bgmElements[this.currentBgmType];
      if (active) active.volume = this.bgmVolume;
    }
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    CONFIG.SFX_VOLUME = this.sfxVolume;
  }
}
