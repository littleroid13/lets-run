import { CHARACTERS } from '../src/characters.js';
import { CharacterPreviewRenderer } from './CharacterPreviewRenderer.js';

export class LobbyScreen {
  constructor(container, onStartRace) {
    this.container = container;
    this.onStartRace = onStartRace;

    // 4 Pemain dengan warna arcade solid vibrant
    this.players = [
      { id: 0, name: 'Pemain 1', charIdx: 0, isReady: false, color: '#0066EE', theme: 'blue' },
      { id: 1, name: 'Pemain 2', charIdx: 1, isReady: false, color: '#E6002E', theme: 'red' },
      { id: 2, name: 'Pemain 3', charIdx: 2, isReady: false, color: '#00B048', theme: 'green' },
      { id: 3, name: 'Pemain 4', charIdx: 3, isReady: false, color: '#6628BF', theme: 'purple' }
    ];

    this.root = null;
    this.previewRenderer = null;
    this.render();
  }

  render() {
    this.root = document.createElement('div');
    this.root.className = 'lobby-screen';

    this.root.innerHTML = `
      <!-- ================= BACKGROUND SUBWAY ARCADE ================= -->
      <div class="lobby-bg-layer">
        <!-- Sunny sky horizon gradient -->
        <div class="lobby-sky-gradient"></div>

        <!-- Animated Comic Sunburst Rays -->
        <div class="lobby-sunburst anim-sunburst">
          <svg viewBox="0 0 1000 1000" fill="#FFFFFF">
            <polygon points="500,500 480,0 520,0"></polygon>
            <polygon points="500,500 700,40 735,70"></polygon>
            <polygon points="500,500 890,200 920,240"></polygon>
            <polygon points="500,500 990,440 1000,480"></polygon>
            <polygon points="500,500 960,680 930,720"></polygon>
            <polygon points="500,500 780,890 740,920"></polygon>
            <polygon points="500,500 520,1000 480,1000"></polygon>
            <polygon points="500,500 280,940 240,910"></polygon>
            <polygon points="500,500 90,760 70,720"></polygon>
            <polygon points="500,500 0,520 0,480"></polygon>
            <polygon points="500,500 60,260 90,220"></polygon>
            <polygon points="500,500 240,80 280,50"></polygon>
          </svg>
        </div>

        <!-- Soft Cartoon Clouds -->
        <div class="lobby-cloud cloud-left"></div>
        <div class="lobby-cloud cloud-right"></div>

        <!-- Stylized City Skyline Silhouette -->
        <svg class="lobby-skyline" preserveAspectRatio="none" viewBox="0 0 1920 280">
          <path d="M0,280 L0,180 L50,180 L50,140 L100,140 L100,200 L160,200 L160,110 L230,110 L230,220 L310,220 L310,80 L380,80 L380,210 L470,210 L470,140 L550,140 L550,230 L640,230 L640,100 L720,100 L720,220 L820,220 L820,70 L900,70 L900,210 L1020,210 L1020,120 L1100,120 L1100,230 L1210,230 L1210,90 L1290,90 L1290,210 L1380,210 L1380,150 L1460,150 L1460,240 L1580,240 L1580,110 L1670,110 L1670,220 L1780,220 L1780,80 L1850,80 L1850,200 L1920,200 L1920,280 Z" fill="#782068"></path>
        </svg>

        <!-- Left Graffiti Wall -->
        <div class="lobby-wall wall-left">
          <div class="wall-tag tag-yellow">RUN!</div>
          <div class="wall-tag tag-cyan">SPEED</div>
          <div class="wall-tag tag-pink">⚡GO!</div>
        </div>

        <!-- Right Graffiti Wall -->
        <div class="lobby-wall wall-right">
          <div class="wall-tag tag-cyan">JUARA!</div>
          <div class="wall-tag tag-yellow">TURBO</div>
          <div class="wall-tag tag-green">READY</div>
        </div>

        <!-- Perspective Subway Tracks Under Start Button -->
        <svg class="lobby-tracks" preserveAspectRatio="none" viewBox="0 0 1920 340">
          <polygon fill="#2E1C12" points="200,340 780,180 1140,180 1720,340"></polygon>
          <polygon fill="#693C1E" points="790,195 1130,195 1140,203 780,203" stroke="#1D0B03" stroke-width="2"></polygon>
          <polygon fill="#7A4522" points="750,215 1170,215 1182,225 738,225" stroke="#1D0B03" stroke-width="2"></polygon>
          <polygon fill="#8C4E26" points="700,242 1220,242 1236,254 684,254" stroke="#1D0B03" stroke-width="3"></polygon>
          <polygon fill="#9E572B" points="630,276 1290,276 1310,290 610,290" stroke="#1D0B03" stroke-width="4"></polygon>
          <polygon fill="#9E572B" points="530,318 1390,318 1415,335 505,335" stroke="#1D0B03" stroke-width="4"></polygon>
          <polygon fill="#F1F5F9" points="820,180 828,180 620,340 605,340" stroke="#0F172A" stroke-width="3"></polygon>
          <line stroke="#FFFFFF" stroke-width="4" x1="824" x2="615" y1="180" y2="340"></line>
          <polygon fill="#F1F5F9" points="1100,180 1108,180 1315,340 1300,340" stroke="#0F172A" stroke-width="3"></polygon>
          <line stroke="#FFFFFF" stroke-width="4" x1="1104" x2="1305" y1="180" y2="340"></line>
        </svg>
      </div>

      <!-- ================= HEADER BAR ================= -->
      <header class="lobby-header-bar">
        <!-- Ruang kiri (tempat tombol mengapung 🔊 & ⚙️) -->
        <div class="header-left-space"></div>

        <!-- Official Arcade Hero Logo -->
        <div class="lobby-hero-logo">
          <img src="${import.meta.env.BASE_URL}assets/logo.png" alt="LET'S RUN! Kuis Lari Rintangan" class="lobby-logo-img" />
        </div>

        <!-- Ruang kanan agar logo tetap persis di tengah -->
        <div class="header-right-space"></div>
      </header>

      <!-- ================= 4 VIBRANT PLAYER CARDS ================= -->
      <main class="lobby-cards-container">
        <div class="lobby-cards-grid">
          ${this.players.map((p, idx) => this.renderPlayerCard(p, idx)).join('')}
        </div>
      </main>

      <!-- ================= FOOTER: MASSIVE CANDY START BUTTON ================= -->
      <footer class="lobby-footer-bar">
        <div class="start-btn-cluster">
          <div class="start-btn-interactive-wrap">
            <!-- Light burst rays -->
            <div class="start-rays anim-sunburst">
              <svg viewBox="0 0 400 400" fill="#FFAA00">
                <polygon points="200,200 180,0 220,0"></polygon>
                <polygon points="200,200 350,50 370,80"></polygon>
                <polygon points="200,200 400,180 400,220"></polygon>
                <polygon points="200,200 360,330 330,360"></polygon>
                <polygon points="200,200 220,400 180,400"></polygon>
                <polygon points="200,200 50,350 30,320"></polygon>
                <polygon points="200,200 0,220 0,180"></polygon>
                <polygon points="200,200 40,50 70,30"></polygon>
              </svg>
            </div>

            <!-- Pulsing Glow -->
            <div class="start-glow-backing anim-start-glow"></div>

            <!-- Star stickers -->
            <span class="star-sticker star-left anim-sparkle">★</span>
            <span class="star-sticker star-right anim-sparkle">★</span>

            <!-- Extra Large Candy Start Button -->
            <button class="btn-candy start-race-candy-btn" id="start-race-btn" disabled>
              <div class="candy-pill-gloss"></div>
              <span class="start-rocket-icon">🚀</span>
              <span class="start-title-text font-candy">MULAI BALAPAN</span>
              <span class="start-arrow-icon font-candy">➔</span>
            </button>
          </div>

          <!-- Subtext Pill Status -->
          <div class="ready-counter-pill" id="ready-counter">
            <span class="counter-dot"></span>
            <span class="counter-text">Menunggu minimal 1 pemain siap...</span>
          </div>

          <!-- Credit / Copyright -->
          <div class="game-copyright-text">
            LET'S RUN! &copy; 2026 &bull; Created by <span class="author-highlight">littleroid13</span>
          </div>
        </div>
      </footer>
    `;

    this.container.appendChild(this.root);
    this.bindEvents();
    this.updateStartButton();

    // Inisialisasi 3D Character Preview Renderer
    this.previewRenderer = new CharacterPreviewRenderer(CHARACTERS);
    this.previewRenderer.initSlots(
      this.players.map((p, idx) => ({
        slotIdx: idx,
        charIdx: p.charIdx,
        canvasId: `char-canvas-${idx}`
      }))
    );
  }

  renderPlayerCard(p, idx) {
    const char = CHARACTERS[p.charIdx];
    const themeClass = `card-theme-${p.theme}`;

    return `
      <section class="player-card ${themeClass} ${p.isReady ? 'is-ready anim-ready-card' : ''}" id="lobby-zone-${idx}" style="--player-accent: ${p.color};">
        <!-- Corner Rivets -->
        <span class="card-rivet rivet-tl"></span>
        <span class="card-rivet rivet-tr"></span>
        <div class="candy-rect-gloss"></div>

        <!-- Star Sparkles (Saat Siap) -->
        <span class="ready-sparkle sparkle-1 font-display anim-sparkle">★</span>
        <span class="ready-sparkle sparkle-2 font-display anim-sparkle">✦</span>

        <!-- Card Header: Pill Nama + Status Ribbon -->
        <div class="card-header-row">
          <div class="player-name-pill">
            <span class="player-color-dot" style="background: ${p.color};"></span>
            <span class="player-name-text font-candy">${p.name}</span>
          </div>

          <div class="ready-badge-pill ${p.isReady ? 'is-ready' : 'is-waiting'}" id="status-badge-${idx}">
            ${p.isReady 
              ? '<span class="badge-icon">✓</span><span class="badge-text font-candy uppercase">SIAP</span>'
              : '<span class="ping-dot"></span><span class="badge-text font-candy">Menunggu</span>'
            }
          </div>
        </div>

        <!-- Character Stage: Navigation + Hologram Preview + 3D Round Podium -->
        <div class="character-stage-wrap">
          <div class="stage-center-box">
            <!-- Nav Prev Button -->
            <button class="btn-candy stage-nav-btn prev-btn" id="prev-btn-${idx}" title="Karakter Sebelumnya" aria-label="Sebelumnya">
              <div class="candy-pill-gloss"></div>
              <span>◀</span>
            </button>

            <!-- Hologram Preview Box -->
            <div class="char-hologram-cluster">
              <div class="char-hologram-box">
                <div class="char-canvas-wrap">
                  <canvas class="char-preview-canvas" id="char-canvas-${idx}" width="320" height="420"></canvas>
                </div>
                <div class="char-title-name font-candy" id="char-name-${idx}">${char.name}</div>
                <div class="char-desc-badge" id="char-desc-${idx}">${char.desc}</div>
              </div>

              <!-- High-Gloss 3D Round Podium -->
              <div class="char-3d-podium-wrap">
                <div class="podium-shadow-base"></div>
                <div class="podium-disk-top">
                  <div class="podium-disk-highlight"></div>
                </div>
              </div>
            </div>

            <!-- Nav Next Button -->
            <button class="btn-candy stage-nav-btn next-btn" id="next-btn-${idx}" title="Karakter Berikutnya" aria-label="Berikutnya">
              <div class="candy-pill-gloss"></div>
              <span>▶</span>
            </button>
          </div>
        </div>

        <!-- Action Button: CANDY ORANGE "SENTUH! 👆" / CANDY GREEN "SIAP! ✓" -->
        <div class="card-action-wrap">
          <button class="btn-candy card-action-btn ${p.isReady ? 'btn-ready-active' : 'btn-ready-waiting'}" id="ready-btn-${idx}">
            <div class="candy-rect-gloss"></div>
            <span class="ready-btn-content font-candy stroke-dark-thick">
              ${p.isReady ? 'SIAP! ✓' : 'SENTUH! 👆'}
            </span>
          </button>
        </div>
      </section>
    `;
  }

  bindEvents() {
    this.players.forEach((p, idx) => {
      const prevBtn = this.root.querySelector(`#prev-btn-${idx}`);
      const nextBtn = this.root.querySelector(`#next-btn-${idx}`);
      const readyBtn = this.root.querySelector(`#ready-btn-${idx}`);

      // Tombol ganti karakter sebelumnya
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.changeCharacter(idx, -1);
        });
      }

      // Tombol ganti karakter berikutnya
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.changeCharacter(idx, 1);
        });
      }

      // Tombol Siap
      if (readyBtn) {
        readyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleReady(idx);
        });
      }
    });

    // Tombol Mulai Balapan
    const startBtn = this.root.querySelector('#start-race-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const readyPlayers = this.players.filter(p => p.isReady);
        if (readyPlayers.length >= 1 && this.onStartRace) {
          this.onStartRace(this.players);
        }
      });
    }
  }

  changeCharacter(playerIdx, direction) {
    const player = this.players[playerIdx];
    player.charIdx = (player.charIdx + direction + CHARACTERS.length) % CHARACTERS.length;

    const char = CHARACTERS[player.charIdx];
    const nameEl = this.root.querySelector(`#char-name-${playerIdx}`);
    const descEl = this.root.querySelector(`#char-desc-${playerIdx}`);

    if (nameEl) nameEl.textContent = char.name;
    if (descEl) descEl.textContent = char.desc;

    // Perbarui 3D Character Preview di kartu
    if (this.previewRenderer) {
      this.previewRenderer.setSlotCharacter(playerIdx, player.charIdx);
    }

    // Perbarui model karakter 3D di viewport jika ada
    if (window.__gameInstance && window.__gameInstance.lanes[playerIdx]) {
      window.__gameInstance.lanes[playerIdx].loadCharacter(char.file);
    }
  }

  toggleReady(playerIdx) {
    const player = this.players[playerIdx];
    player.isReady = !player.isReady;

    const card = this.root.querySelector(`#lobby-zone-${playerIdx}`);
    const readyBtn = this.root.querySelector(`#ready-btn-${playerIdx}`);
    const statusBadge = this.root.querySelector(`#status-badge-${playerIdx}`);

    if (player.isReady) {
      card?.classList.add('is-ready', 'anim-ready-card');
      if (readyBtn) {
        readyBtn.className = 'btn-candy card-action-btn btn-ready-active';
        readyBtn.querySelector('.ready-btn-content').textContent = 'SIAP! ✓';
      }
      if (statusBadge) {
        statusBadge.className = 'ready-badge-pill is-ready';
        statusBadge.innerHTML = '<span class="badge-icon">✓</span><span class="badge-text font-candy uppercase">SIAP</span>';
      }
    } else {
      card?.classList.remove('is-ready', 'anim-ready-card');
      if (readyBtn) {
        readyBtn.className = 'btn-candy card-action-btn btn-ready-waiting';
        readyBtn.querySelector('.ready-btn-content').textContent = 'SENTUH! 👆';
      }
      if (statusBadge) {
        statusBadge.className = 'ready-badge-pill is-waiting';
        statusBadge.innerHTML = '<span class="ping-dot"></span><span class="badge-text font-candy">Menunggu</span>';
      }
    }

    this.updateStartButton();
  }

  updateStartButton() {
    const readyCount = this.players.filter(p => p.isReady).length;
    const startBtn = this.root.querySelector('#start-race-btn');
    const counter = this.root.querySelector('#ready-counter');

    if (readyCount >= 1) {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.classList.add('can-start');
      }
      if (counter) {
        counter.innerHTML = `
          <span class="counter-dot ping-active"></span>
          <span class="counter-text"><strong class="highlight-yellow">${readyCount} dari 4 Pemain SIAP!</strong> Sentuh untuk mulai balapan.</span>
        `;
      }
    } else {
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.classList.remove('can-start');
      }
      if (counter) {
        counter.innerHTML = `
          <span class="counter-dot"></span>
          <span class="counter-text">Menunggu minimal 1 pemain siap...</span>
        `;
      }
    }
  }

  show() {
    if (this.root) this.root.style.display = 'flex';
    if (this.previewRenderer) this.previewRenderer.start();
  }

  hide() {
    if (this.root) this.root.style.display = 'none';
    if (this.previewRenderer) this.previewRenderer.stop();
  }

  destroy() {
    if (this.previewRenderer) {
      this.previewRenderer.destroy();
      this.previewRenderer = null;
    }
    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    }
  }
}
