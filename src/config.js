// Konfigurasi visual kamera, skala karakter, dan sistem gameplay kuis progres mandiri
export const CONFIG = {
  // Kamera & Karakter
  characterScale: 0.4,       // Skala karakter
  cameraHeight: 2.4,         // Posisi tinggi kamera dari tanah
  cameraDistance: 6.9,       // Jarak kamera di belakang karakter
  lookAhead: 9.3,            // Jarak titik pandang (lookAt) di depan karakter
  lookAtY: 0.4,              // Tinggi titik pandang (lookAt) di depan karakter
  cameraFOV: 54,             // Field of View kamera

  // Kecepatan & Jarak Fisik Progres Mandiri
  BASE_SPEED: 7.0,           // Kecepatan dasar normal (unit/detik)
  ANSWER_TIME: 8.0,          // Waktu maksimal menjawab soal (detik)
  get APPROACH_DISTANCE() {  // Jarak kemunculan gerbang di depan saat soal mulai
    return this.BASE_SPEED * this.ANSWER_TIME; // 7.0 * 8.0 = 56.0 unit
  },
  REWARD_RUN_DISTANCE: 25.0, // Jarak lari bebas setelah melewati gerbang (unit)
  START_OFFSET: 20.0,        // Jarak dari start line ke soal pertama (unit)
  FINISH_BUFFER: 20.0,       // Jarak dari gerbang soal terakhir ke garis finis (unit)

  // Multiplier Kecepatan Saat Terjawab & Reward
  DASH_MULTIPLIER: 1.6,      // Kecepatan dash saat benar menuju pintu
  WRONG_SPEED_MULTIPLIER: 0.55, // Kecepatan melambat saat salah menuju pintu
  REWARD_BOOST_MULTIPLIER: 1.55, // Kecepatan lari bebas setelah gerbang (jawaban benar)
  REWARD_SLOW_MULTIPLIER: 0.65,  // Kecepatan lari bebas setelah gerbang (jawaban salah)
  BASH_SLOW_MULTIPLIER: 0.5,     // Kecepatan melambat setelah menabrak pintu hancur
  BASH_SLOW_DURATION: 2.0,       // Durasi efek melambat setelah menabrak pintu (detik)
  DOOR_TRIGGER_DISTANCE: 5.0,    // Jarak saat pintu mulai bereaksi (open/bash) mendekati gerbang (unit)
  CAMERA_SHAKE_INTENSITY: 0.18,  // Intensitas getaran kamera saat tabrakan pintu
  CAMERA_SHAKE_DURATION: 0.35,   // Durasi getaran kamera lokal jalur (detik)
  ANSWER_REVEAL_DURATION: 1.5,   // Durasi label teks jawaban benar tampil di overlay (detik)
  LATERAL_SPEED: 9.0,        // Kecepatan transisi lateral ke pintu yang dipilih

  // Efek Visual & Animasi
  EFFECTS_ENABLED: true,     // Sakelar efek partikel debu & speed lines
  BOOST_TIMESCALE: 1.7,      // Kecepatan animasi lari saat boost
  SLOW_TIMESCALE: 0.65,      // Kecepatan animasi lari saat salah/melambat
  BOOST_FOV_EXTRA: 3.5,      // Tambahan FOV dinamis saat dash/boost
  PARTICLE_COUNT: 40,        // Ukuran object pool partikel debu per jalur

  // Sistem Soal & Skor
  TOTAL_QUESTIONS: 10,       // Jumlah soal per balapan (dapat disetel 5, 10, atau 20)
  MODE_SOAL: 'urutan_beda',  // 'urutan_beda' (semua soal sama, urutan acak) | 'subset_beda'
  BASE_SCORE: 100,           // Skor dasar per jawaban benar
  TIME_BONUS_MAX: 50,        // Bonus kecepatan maksimal
  STREAK_THRESHOLD: 3,       // Ambang batas streak benar beruntun
  STREAK_BONUS: 20,          // Bonus tambahan setiap streak >= threshold
  FINISH_BONUSES: [50, 30, 10, 0], // Bonus finis: ke-1 (+50), ke-2 (+30), ke-3 (+10), ke-4 (0)

  // Pengaturan Audio (BGM & SFX)
  AUDIO_ENABLED: true,       // Sakelar audio aktif/mute
  BGM_VOLUME: 0.45,          // Volume musik latar belakang (0.0 - 1.0)
  SFX_VOLUME: 0.75,          // Volume efek suara (0.0 - 1.0)

  // Animasi Pintu Gerbang (AnswerDoor)
  DOOR_ANIMATIONS: {
    OPEN_DURATION: 0.4,          // Durasi pintu terbuka saat benar (detik)
    OPEN_SLOW_DURATION: 0.85,    // Durasi pintu terbuka pelan saat highlight jawaban benar (detik)
    SHAKE_DURATION: 0.24,        // Durasi getar sebelum pecah (detik)
    SHAKE_COUNT: 3,              // Frekuensi getaran pintu
    SHAKE_AMPLITUDE: 0.08,       // Amplitudo getaran lateral
    FRAGMENT_LIFETIME: 1.0,      // Lama waktu serpihan melayang sebelum hilang (detik)
    FRAGMENTS_PER_DOOR: 8,       // Jumlah serpihan pecahan pintu (object pool)
    DUST_PER_DOOR: 8,            // Jumlah partikel debu saat hancur
    SPARKLE_COUNT: 12,           // Jumlah partikel kilau saat terbuka
    GRAVITY: 14.0                // Gravitasi serpihan pintu (unit/s^2)
  },

  // Konfigurasi Gerbang Soal & 4 Pintu Jawaban 3D Prosedural
  GATE_CONFIG: {
    trackWidth: 5.0,
    gateHeight: 3.4,
    doorWidth: 1.05,
    doorHeight: 2.35,
    doorThickness: 0.12,
    doorOffsets: [-1.65, -0.55, 0.55, 1.65],

    // Rangka gerbang bersama (lintel) & tiang
    lintel: {
      color: 0x1e272e,
      emissive: 0x0f141a,
      roughness: 0.22,
      metalness: 0.7,
      signboardColor: 0x111620,
      signboardEmissive: 0x222f3e,
      signText: 'GERBANG SOAL',
      lampColors: [0xff4757, 0xffa502, 0x2ed573, 0x1e90ff, 0x9b59b6, 0xff6b81, 0x70a1ff],
      lampEmissiveIntensity: 1.0
    },

    // 4 Pintu dengan siluet, warna, dan dekorasi unik
    doors: [
      {
        letter: 'A',
        shape: 'castle_arch',   // Lengkung kastil dengan rivet
        color: 0xff6b35,        // Oranye hangat
        accentColor: 0xd35400,
        emissive: 0x3d1400,
        roughness: 0.26,
        metalness: 0.4,
        feature: 'rivets',
        rivetColor: 0xf5f6fa,
        rivetMetalness: 0.85
      },
      {
        letter: 'B',
        shape: 'capsule',       // Kapsul dengan bintang di atas
        color: 0xff477e,        // Pink arcade
        accentColor: 0xc0392b,
        emissive: 0x3d0014,
        roughness: 0.24,
        metalness: 0.4,
        feature: 'star',
        starColor: 0xfffa65,
        starEmissive: 0x554400
      },
      {
        letter: 'C',
        shape: 'hexagon',       // Heksagon dengan garis neon
        color: 0x00d2d3,        // Tosca cerah
        accentColor: 0x01a3a4,
        emissive: 0x003b3c,
        roughness: 0.22,
        metalness: 0.5,
        feature: 'neon_lines',
        neonColor: 0x00f0ff,
        neonEmissive: 0x00a8ff
      },
      {
        letter: 'D',
        shape: 'crown',         // Mahkota bergerigi dengan permata
        color: 0xff9f1a,        // Kuning emas
        accentColor: 0xcc7a00,
        emissive: 0x381f00,
        roughness: 0.24,
        metalness: 0.6,
        feature: 'gem',
        gemColor: 0xff3838,
        gemEmissive: 0x550000
      }
    ]
  }
};
