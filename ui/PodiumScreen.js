import * as XLSX from 'xlsx';

/**
 * Fungsi pembantu untuk membuat dan mengunduh laporan hasil balapan kuis ke Excel (.xlsx)
 */
export function exportPodiumReportExcel(results, gameMeta = {}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalQuestions = gameMeta.totalQuestions || (results[0] ? results[0].totalQuestions : 10);
  const answerTime = gameMeta.answerTime || 8;
  const themeName = (gameMeta.theme || 'siang').toUpperCase();

  const rows = [
    ["LAPORAN HASIL KUIS BALAPAN LARI - LET'S RUN"],
    [`Tanggal: ${dateStr} ${timeStr}`, `Jumlah Soal: ${totalQuestions}`, `Waktu/Soal: ${answerTime} Detik`, `Tema: ${themeName}`],
    [], // Baris kosong pemisah
    [
      'Peringkat',
      'Nama Pemain',
      'Karakter',
      'Total Skor (PTS)',
      'Jawaban Benar',
      'Jawaban Salah',
      'Total Soal',
      'Akurasi (%)',
      'Rata-rata Waktu (detik)',
      'Urutan Finis',
      'Keterangan / Evaluasi'
    ]
  ];

  let totalScoreSum = 0;
  let totalAccuracySum = 0;

  results.forEach((r, idx) => {
    const rank = idx + 1;
    const accuracy = r.accuracyPercent ?? Math.round((r.correctCount / r.totalQuestions) * 100);
    const wrong = r.totalQuestions - r.correctCount;
    totalScoreSum += r.score;
    totalAccuracySum += accuracy;

    let evalText = 'Perlu Latihan';
    if (rank === 1) evalText = 'Juara 1 - Sangat Hebat!';
    else if (accuracy >= 80) evalText = 'Sangat Baik';
    else if (accuracy >= 60) evalText = 'Baik';

    rows.push([
      `Juara ${rank}`,
      r.name,
      r.charName,
      r.score,
      r.correctCount,
      wrong,
      r.totalQuestions,
      `${accuracy}%`,
      `${r.avgResponseTime}s`,
      `Finis ke-${r.finishRank}`,
      evalText
    ]);
  });

  // Ringkasan statistik kelas / permainan
  const avgScore = results.length > 0 ? Math.round(totalScoreSum / results.length) : 0;
  const avgAccuracy = results.length > 0 ? Math.round(totalAccuracySum / results.length) : 0;

  rows.push([]);
  rows.push(['RINGKASAN KELAS / PERMAINAN']);
  rows.push(['Total Peserta:', results.length]);
  rows.push(['Rata-rata Skor:', `${avgScore} PTS`]);
  rows.push(['Rata-rata Akurasi:', `${avgAccuracy}%`]);
  if (results[0]) {
    rows.push(['Pemenang Terbaik:', `${results[0].name} (${results[0].score} PTS, Akurasi ${results[0].accuracyPercent}%)`]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set lebar kolom agar rapi saat dibuka di Microsoft Excel / Google Sheets
  ws['!cols'] = [
    { wch: 14 }, // Peringkat
    { wch: 20 }, // Nama Pemain
    { wch: 18 }, // Karakter
    { wch: 18 }, // Total Skor
    { wch: 16 }, // Jawaban Benar
    { wch: 16 }, // Jawaban Salah
    { wch: 12 }, // Total Soal
    { wch: 14 }, // Akurasi
    { wch: 25 }, // Rata-rata Waktu
    { wch: 16 }, // Urutan Finis
    { wch: 26 }  // Keterangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Hasil Kuis');
  const fileDate = now.toISOString().slice(0, 10);
  const fileTime = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `Laporan_Hasil_LetsRun_${fileDate}_${fileTime}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export class PodiumScreen {
  constructor(container, results, onPlayAgain, onBackToLobby, gameMeta = {}) {
    this.container = container;
    this.results = results; // Array pemain yang telah diurutkan berdasarkan peringkat
    this.onPlayAgain = onPlayAgain;
    this.onBackToLobby = onBackToLobby;
    this.gameMeta = gameMeta;
    this.root = null;

    this.render();
  }

  render() {
    this.root = document.createElement('div');
    this.root.className = 'podium-screen';

    // Susun urutan tampilan visual podium (Juara 2 di kiri, Juara 1 di tengah tertinggi, Juara 3 di kanan, Juara 4 di sisi)
    const podiumOrder = this.getPodiumVisualOrder();

    this.root.innerHTML = `
      <div class="podium-content-wrap">
        <!-- HEADER POPUP -->
        <div class="podium-header">
          <div class="trophy-badge">🏆</div>
          <h1 class="podium-title">HASIL BALAPAN & KUIS</h1>
          <p class="podium-subtitle">Selamat kepada seluruh peserta atas usaha dan prestasinya!</p>
        </div>

        <!-- 1. BAGIAN VISUAL PODIUM JUARA (1, 2, 3, 4) -->
        <div class="podium-stage-container">
          <div class="podium-stage">
            ${podiumOrder.map(item => this.renderPodiumStand(item)).join('')}
          </div>
        </div>

        <!-- 2. BAGIAN DETAIL LIST PERINGKAT & SKOR -->
        <div class="leaderboard-section">
          <div class="leaderboard-header-row">
            <h3 class="leaderboard-title">📋 Rincian Skor & Akurasi Pemain</h3>
            <span class="leaderboard-note">Total Soal: ${this.results[0]?.totalQuestions || 10} Soal</span>
          </div>

          <div class="leaderboard-table-container">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th class="th-rank">Peringkat</th>
                  <th class="th-player">Pemain</th>
                  <th class="th-score">Total Skor</th>
                  <th class="th-accuracy">Jawaban Benar (%)</th>
                  <th class="th-time">Rata-rata Waktu</th>
                  <th class="th-finish">Urutan Finis</th>
                </tr>
              </thead>
              <tbody>
                ${this.results.map((r, rankIdx) => this.renderTableRow(r, rankIdx)).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. TOMBOL AKSI (EXPORT EXCEL, MAIN LAGI, KEMBALI KE LOBI) -->
        <div class="podium-actions">
          <button class="action-btn export-excel-btn" id="export-excel-btn" title="Unduh laporan lengkap dalam format Microsoft Excel">
            <span>📊 Unduh Laporan Excel (.xlsx)</span>
          </button>
          <button class="action-btn play-again-btn" id="play-again-btn">
            <span>🔄 Main Lagi</span>
          </button>
          <button class="action-btn back-lobby-btn" id="back-lobby-btn">
            <span>🏠 Kembali ke Lobi</span>
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.bindEvents();
  }

  getPodiumVisualOrder() {
    const list = [...this.results];
    const p1 = list[0] || null;
    const p2 = list[1] || null;
    const p3 = list[2] || null;
    const p4 = list[3] || null;

    const ordered = [];
    if (p2) ordered.push({ player: p2, rank: 2, heightClass: 'stand-rank-2', medal: '🥈', standNum: '2' });
    if (p1) ordered.push({ player: p1, rank: 1, heightClass: 'stand-rank-1', medal: '🥇', standNum: '1', isWinner: true });
    if (p3) ordered.push({ player: p3, rank: 3, heightClass: 'stand-rank-3', medal: '🥉', standNum: '3' });
    if (p4) ordered.push({ player: p4, rank: 4, heightClass: 'stand-rank-4', medal: '🏅', standNum: '4' });

    return ordered;
  }

  renderPodiumStand(item) {
    const p = item.player;
    const accuracy = p.accuracyPercent ?? Math.round((p.correctCount / p.totalQuestions) * 100);

    return `
      <div class="podium-column ${item.heightClass}" style="--player-color: ${p.color};">
        <!-- Karakter & Info Pemain di Atas Tiang Podium -->
        <div class="podium-top-actor">
          ${item.isWinner ? '<div class="crown-icon">👑</div>' : ''}
          <div class="podium-avatar-wrap">
            <span class="actor-medal">${item.medal}</span>
            <div class="actor-avatar">${p.charIcon}</div>
          </div>
          <div class="actor-name">${p.name}</div>
          <div class="actor-char">${p.charName}</div>
          <div class="actor-score-tag">${p.score} PTS</div>
          <div class="actor-acc-tag">${accuracy}% Benar</div>
        </div>

        <!-- Tiang Podium 3D Bevel dengan Nomor Peringkat -->
        <div class="podium-stand-block">
          <div class="stand-front">
            <span class="stand-number">${item.standNum}</span>
            <span class="stand-rank-label">JUARA ${item.standNum}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderTableRow(r, rankIdx) {
    const rank = rankIdx + 1;
    const accuracy = r.accuracyPercent ?? Math.round((r.correctCount / r.totalQuestions) * 100);
    const medalIcons = ['🥇', '🥈', '🥉', '🏅'];
    const rankClass = rank <= 3 ? `rank-top-${rank}` : 'rank-other';

    return `
      <tr class="leaderboard-row ${rankClass}">
        <td class="td-rank">
          <span class="rank-badge-item">
            <span class="rank-icon">${medalIcons[rankIdx] || '🏅'}</span>
            <strong>#${rank}</strong>
          </span>
        </td>

        <td class="td-player">
          <div class="player-cell">
            <span class="cell-avatar" style="border-color: ${r.color};">${r.charIcon}</span>
            <div>
              <div class="cell-name">${r.name}</div>
              <div class="cell-char-sub">${r.charName}</div>
            </div>
          </div>
        </td>

        <td class="td-score">
          <div class="score-cell">
            <span class="score-main">${r.score} <small>PTS</small></span>
            <span class="score-breakdown">
              (Dasar: ${r.baseScore || (r.correctCount * 100)} | Ekstra: +${r.extraScore || 0} | Finis: +${r.finishBonus || 0})
            </span>
          </div>
        </td>

        <td class="td-accuracy">
          <div class="accuracy-cell">
            <div class="accuracy-text-row">
              <strong class="acc-percent">${accuracy}%</strong>
              <span class="acc-fraction">(${r.correctCount} / ${r.totalQuestions} Benar)</span>
            </div>
            <div class="acc-progress-bar">
              <div class="acc-progress-fill" style="width: ${accuracy}%; background: ${accuracy >= 75 ? '#2ecc71' : (accuracy >= 50 ? '#f39c12' : '#e74c3c')};"></div>
            </div>
          </div>
        </td>

        <td class="td-time">
          <span class="time-badge">${r.avgResponseTime} dtk / soal</span>
        </td>

        <td class="td-finish">
          <span class="finish-badge">🏁 Finis #${r.finishRank || rank}</span>
        </td>
      </tr>
    `;
  }

  bindEvents() {
    // Tombol Export Excel
    const exportBtn = this.root.querySelector('#export-excel-btn');
    if (exportBtn) {
      exportBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        exportPodiumReportExcel(this.results, this.gameMeta);
      });
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportPodiumReportExcel(this.results, this.gameMeta);
      });
    }

    // Tombol Main Lagi
    const playAgainBtn = this.root.querySelector('#play-again-btn');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.destroy();
        if (this.onPlayAgain) this.onPlayAgain();
      });
    }

    // Tombol Kembali ke Lobi
    const backLobbyBtn = this.root.querySelector('#back-lobby-btn');
    if (backLobbyBtn) {
      backLobbyBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.destroy();
        if (this.onBackToLobby) this.onBackToLobby();
      });
    }
  }

  destroy() {
    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
      this.root = null;
    }
  }
}
