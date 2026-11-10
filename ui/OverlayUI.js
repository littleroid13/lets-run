// Modul Overlay UI balapan dengan progres mandiri per jalur
export class OverlayUI {
  constructor(containerId = 'ui-overlay', onSelectAnswer) {
    this.container = document.getElementById(containerId);
    this.onSelectAnswer = onSelectAnswer;
    this.activePlayers = [];
  }

  setup(activePlayers) {
    this.activePlayers = activePlayers;
    this.container.innerHTML = '';
    this.container.className = 'game-overlay-container';

    activePlayers.forEach((player) => {
      const col = document.createElement('div');
      col.className = `player-column player-col-${player.id}`;
      col.id = `player-column-${player.id}`;

      col.innerHTML = `
        <!-- Efek garis kecepatan (speed lines) saat boost/lari cepat -->
        <div class="speed-lines-overlay" id="speed-lines-${player.id}"></div>

        <!-- Label singkat pengungkapan jawaban benar saat salah/timeout -->
        <div class="answer-reveal-banner" id="answer-reveal-${player.id}"></div>

        <div class="col-top-panel">
          <div class="col-header" style="background: ${player.color};">
            <div class="header-left">
              <span class="col-title">${player.name} (${player.charName})</span>
              <span class="streak-badge" id="streak-${player.id}"></span>
            </div>
            <div class="header-right">
              <span class="col-score" id="score-${player.id}">0 PTS</span>
            </div>
          </div>

          <div class="timer-section">
            <div class="timer-bar-wrap">
              <div class="timer-bar-fill" id="timer-bar-${player.id}" style="background: ${player.color};"></div>
            </div>
            <div class="timer-text" id="timer-text-${player.id}">8.0s</div>
          </div>

          <div class="question-card" id="q-card-${player.id}">
            <div class="question-meta" id="q-meta-${player.id}">Bersiap...</div>
            <div class="question-text" id="q-text-${player.id}">Lari bebas...</div>
          </div>

          <div class="feedback-badge" id="feedback-${player.id}"></div>
        </div>

        <div class="col-bottom-panel" id="options-panel-${player.id}">
          <div class="btn-grid">
            ${['A', 'B', 'C', 'D'].map((letter, optIdx) => `
              <button class="answer-btn" id="btn-${player.id}-${optIdx}" data-player="${player.id}" data-opt="${optIdx}">
                <span class="btn-letter" style="background: ${player.color};">${letter}</span>
                <span class="btn-text" id="btn-text-${player.id}-${optIdx}">-</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;

      this.container.appendChild(col);

      // Pasang Pointer Events untuk multi-touch independen
      for (let optIdx = 0; optIdx < 4; optIdx++) {
        const btn = col.querySelector(`#btn-${player.id}-${optIdx}`);
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.handleButtonPress(player.id, optIdx);
        }, { passive: false });
      }
    });
  }

  handleButtonPress(playerId, optIdx) {
    const btn = document.getElementById(`btn-${playerId}-${optIdx}`);
    if (!btn || btn.disabled) return;

    // Kunci tombol terpilih di jalur ini (jawaban terkunci, tidak bisa diganti)
    for (let j = 0; j < 4; j++) {
      const b = document.getElementById(`btn-${playerId}-${j}`);
      if (b) {
        b.disabled = true;
        b.classList.remove('selected');
      }
    }
    btn.classList.add('selected');

    // Tampilkan status "Menuju Pintu..." (jawaban benar BELUM terspill sampai masuk ke pintu)
    const feedback = document.getElementById(`feedback-${playerId}`);
    if (feedback) {
      feedback.className = 'feedback-badge feedback-waiting';
      feedback.textContent = 'Menuju Pintu...';
    }

    if (this.onSelectAnswer) {
      this.onSelectAnswer(playerId, optIdx);
    }
  }

  // Tampilkan soal mandiri untuk satu jalur tertentu
  showQuestionForLane(laneIndex, questionData, qIndex, totalQuestions) {
    const meta = document.getElementById(`q-meta-${laneIndex}`);
    const text = document.getElementById(`q-text-${laneIndex}`);
    const feedback = document.getElementById(`feedback-${laneIndex}`);
    const speedLines = document.getElementById(`speed-lines-${laneIndex}`);

    if (speedLines) speedLines.classList.remove('active');

    if (!questionData) {
      if (meta) meta.textContent = 'FINIS DI DEPAN!';
      if (text) text.textContent = '🏁 Sprint menuju garis finis!';
      if (feedback) {
        feedback.className = 'feedback-badge';
        feedback.textContent = '';
      }
      for (let optIdx = 0; optIdx < 4; optIdx++) {
        const btn = document.getElementById(`btn-${laneIndex}-${optIdx}`);
        if (btn) btn.disabled = true;
      }
      return;
    }

    if (meta) meta.textContent = `SOAL ${qIndex + 1} / ${totalQuestions}`;
    if (text) text.textContent = questionData.tanya;
    if (feedback) {
      feedback.className = 'feedback-badge';
      feedback.textContent = '';
    }

    // Pasang pilihan jawaban yang diacak khusus jalur ini
    for (let optIdx = 0; optIdx < 4; optIdx++) {
      const btn = document.getElementById(`btn-${laneIndex}-${optIdx}`);
      const btnText = document.getElementById(`btn-text-${laneIndex}-${optIdx}`);

      if (btn) {
        btn.disabled = false;
        btn.className = 'answer-btn';
      }
      if (btnText) {
        btnText.textContent = questionData.pilihan[optIdx];
      }
    }

    this.updateTimerForLane(laneIndex, 1.0, 8.0);
  }

  // Update timer dinamis berbasis jarak fisik untuk jalur tertentu
  updateTimerForLane(laneIndex, ratio, sisaWaktu) {
    const bar = document.getElementById(`timer-bar-${laneIndex}`);
    const timerText = document.getElementById(`timer-text-${laneIndex}`);

    if (bar) {
      bar.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
      if (ratio < 0.25) {
        bar.style.background = '#e74c3c';
      } else if (ratio < 0.5) {
        bar.style.background = '#f39c12';
      } else {
        const player = this.activePlayers.find(p => p.id === laneIndex);
        bar.style.background = player ? player.color : '#3498db';
      }
    }

    if (timerText) {
      timerText.textContent = `${sisaWaktu.toFixed(1)}s`;
    }
  }

  // Tampilkan hasil evaluasi SAAT KARAKTER MASUK KE PINTU
  showEvaluationForLane(laneIndex, result) {
    const feedback = document.getElementById(`feedback-${laneIndex}`);
    const scoreEl = document.getElementById(`score-${laneIndex}`);
    const streakEl = document.getElementById(`streak-${laneIndex}`);
    const speedLines = document.getElementById(`speed-lines-${laneIndex}`);

    // Update skor & streak resmi
    if (scoreEl) {
      scoreEl.textContent = `${result.totalScore} PTS`;
    }

    if (streakEl) {
      if (result.streak >= 2) {
        streakEl.textContent = `🔥 ${result.streak}x`;
        streakEl.style.display = 'inline-block';
      } else {
        streakEl.style.display = 'none';
      }
    }

    // Kunci tombol dan spill jawaban yang benar vs pilihan pemain
    for (let optIdx = 0; optIdx < 4; optIdx++) {
      const btn = document.getElementById(`btn-${laneIndex}-${optIdx}`);
      if (btn) {
        btn.disabled = true;
        if (optIdx === result.correctIndex) {
          btn.classList.add('correct');
        } else if (optIdx === result.chosenIndex && !result.isCorrect) {
          btn.classList.add('wrong');
        }
      }
    }

    if (feedback) {
      if (result.isCorrect) {
        feedback.className = 'feedback-badge feedback-correct';
        const streakText = (result.streak >= 3) ? ' (Streak!)' : '';
        feedback.textContent = `BENAR! +${result.roundScore}${streakText}`;

        // Aktifkan speed lines karena kecepatan melonjak
        if (speedLines) speedLines.classList.add('active');
      } else {
        feedback.className = 'feedback-badge feedback-wrong';
        feedback.textContent = result.isTimeout ? 'WAKTU HABIS!' : 'KURANG TEPAT!';
        if (speedLines) speedLines.classList.remove('active');

        // Jangan tampilkan jawaban di tengah layar saat salah (sesuai permintaan user)
        const revealBanner = document.getElementById(`answer-reveal-${laneIndex}`);
        if (revealBanner) {
          revealBanner.classList.remove('visible');
          revealBanner.textContent = '';
        }
      }
    }
  }

  // Tampilkan tanda finis per pemain saat tiba di garis finis
  showFinishBadgeForLane(laneIndex, rankText, finishBonus) {
    const feedback = document.getElementById(`feedback-${laneIndex}`);
    const speedLines = document.getElementById(`speed-lines-${laneIndex}`);

    if (speedLines) speedLines.classList.remove('active');

    if (feedback) {
      feedback.className = 'feedback-badge feedback-correct';
      feedback.textContent = `FINIS ${rankText}! (+${finishBonus} PTS)`;
    }
  }

  updateScore(laneIndex, score) {
    const scoreEl = document.getElementById(`score-${laneIndex}`);
    if (scoreEl) {
      scoreEl.textContent = `${score} PTS`;
    }
  }

  hide() {
    this.container.innerHTML = '';
  }
}
