import { CONFIG } from '../src/config.js';
import { THEMES } from '../environment/EnvironmentManager.js';
import {
  parseQuestionsJSON,
  parseQuestionsExcel,
  downloadExcelTemplate
} from '../src/utils/QuestionParser.js';

export class TeacherSettingsModal {
  constructor(game) {
    this.game = game;
    this.root = null;
    this.isOpen = false;
  }

  show() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.render();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
      this.root = null;
    }
  }

  render() {
    this.root = document.createElement('div');
    this.root.className = 'teacher-modal-backdrop';

    const maxQuestions = this.game.rawQuestions ? this.game.rawQuestions.length : 10;
    const currentQCount = Math.min(CONFIG.TOTAL_QUESTIONS || 10, maxQuestions);
    const currentTime = CONFIG.ANSWER_TIME || 8.0;
    const currentTheme = CONFIG.THEME || 'siang';
    const isAudioOn = CONFIG.AUDIO_ENABLED !== false;
    const isCustomBank = !!localStorage.getItem('lets_run_custom_questions');

    this.root.innerHTML = `
      <div class="teacher-modal-box">
        <div class="teacher-modal-header">
          <div class="modal-title-wrap">
            <span class="modal-icon">⚙️</span>
            <div>
              <h2 class="modal-title">Pengaturan Guru & Bank Soal</h2>
              <p class="modal-subtitle">Atur jumlah soal, waktu, tema visual, serta muat soal sendiri</p>
            </div>
          </div>
          <button class="modal-close-btn" id="modal-close-btn" title="Tutup">✕</button>
        </div>

        <div class="teacher-modal-body">
          <!-- BAGIAN 1: PENGATURAN BALAPAN -->
          <div class="settings-section">
            <h3 class="section-title">🏃‍♂️ Pengaturan Balapan</h3>

            <div class="form-grid">
              <!-- Jumlah Soal -->
              <div class="form-group">
                <label for="cfg-total-q">
                  Jumlah Soal per Balapan:
                  <span class="label-info">(Tersedia: <strong id="lbl-available-q">${maxQuestions}</strong> soal)</span>
                </label>
                <div class="input-with-presets">
                  <input type="number" id="cfg-total-q" min="1" max="${maxQuestions}" value="${currentQCount}" class="text-input" />
                  <div class="preset-buttons">
                    <button type="button" class="preset-btn" data-val="5">5</button>
                    <button type="button" class="preset-btn" data-val="10">10</button>
                    <button type="button" class="preset-btn" data-val="15">15</button>
                    <button type="button" class="preset-btn" data-val="${maxQuestions}">Semua (${maxQuestions})</button>
                  </div>
                </div>
              </div>

              <!-- Waktu per Soal -->
              <div class="form-group">
                <label for="cfg-answer-time">
                  Waktu Menjawab per Soal:
                  <span class="badge-pill" id="lbl-answer-time">${currentTime} Detik</span>
                </label>
                <div class="slider-row">
                  <span class="slider-min">4s</span>
                  <input type="range" id="cfg-answer-time" min="4" max="20" step="1" value="${currentTime}" class="range-slider" />
                  <span class="slider-max">20s</span>
                </div>
                <small class="helper-text">Karakter tiba di pintu tepat saat waktu habis (${currentTime} detik).</small>
              </div>

              <!-- Suara & Audio -->
              <div class="form-group">
                <label>Audio & Suara:</label>
                <div class="audio-toggle-row">
                  <label class="toggle-switch">
                    <input type="checkbox" id="cfg-audio-enable" ${isAudioOn ? 'checked' : ''} />
                    <span class="toggle-slider"></span>
                  </label>
                  <span id="lbl-audio-status" class="toggle-status-text">${isAudioOn ? '🔊 Suara Aktif' : '🔇 Suara Bisu (Muted)'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- BAGIAN 2: PILIHAN TEMA LINTASAN -->
          <div class="settings-section">
            <h3 class="section-title">🎨 Tema Visual Lintasan</h3>
            <div class="theme-cards-grid">
              ${Object.values(THEMES).map(t => `
                <div class="theme-card ${t.id === currentTheme ? 'active' : ''}" data-theme="${t.id}">
                  <div class="theme-preview-strip" style="background: linear-gradient(135deg, ${t.skyColors[0]} 0%, ${t.skyColors[2]} 50%, ${t.skyColors[4] || t.skyColors[3]} 100%);"></div>
                  <div class="theme-card-info">
                    <span class="theme-name">${t.name}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- BAGIAN 3: BANK SOAL & UNGGAH FILE -->
          <div class="settings-section">
            <div class="section-header-row">
              <h3 class="section-title">📚 Bank Soal Mandiri</h3>
              <span class="status-badge ${isCustomBank ? 'badge-custom' : 'badge-default'}" id="bank-status-badge">
                ${isCustomBank ? '📘 Soal Kustom Guru' : '📗 Soal Bawaan Sistem'}
              </span>
            </div>

            <!-- Tombol Aksi Soal -->
            <div class="question-action-bar">
              <button type="button" class="action-outline-btn" id="btn-download-template">
                <span>📥 Unduh Template XLS</span>
              </button>

              <label class="action-solid-btn" for="input-upload-questions">
                <span>📤 Unggah File Soal (.JSON / .XLS / .XLSX)</span>
                <input type="file" id="input-upload-questions" accept=".json,.xls,.xlsx" style="display: none;" />
              </label>

              <button type="button" class="action-danger-btn" id="btn-reset-questions" ${isCustomBank ? '' : 'style="display:none;"'}>
                <span>🔄 Reset Soal Bawaan</span>
              </button>
            </div>

            <!-- Kotak Notifikasi / Validasi -->
            <div class="upload-alert-box" id="upload-alert-box" style="display: none;"></div>

            <!-- Panduan Format Singkat -->
            <div class="format-help-card">
              <div class="help-title">ℹ️ Petunjuk Format Kolom (Excel / JSON):</div>
              <ul class="help-list">
                <li>Kolom <strong>tanya</strong>: Teks pertanyaan soal.</li>
                <li>Kolom <strong>A, B, C, D</strong>: Pilihan jawaban (harus terisi lengkap).</li>
                <li>Kolom <strong>benar</strong>: Kunci jawaban (tulis huruf <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, atau <strong>D</strong>).</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="teacher-modal-footer">
          <button type="button" class="btn-cancel" id="btn-modal-cancel">Batal</button>
          <button type="button" class="btn-save" id="btn-modal-save">💾 Simpan & Terapkan</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.root);
    this.bindEvents();
  }

  bindEvents() {
    // Tombol Close & Cancel
    this.root.querySelector('#modal-close-btn').addEventListener('click', () => this.close());
    this.root.querySelector('#btn-modal-cancel').addEventListener('click', () => this.close());

    // Klik backdrop luar untuk menutup
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) {
        this.close();
      }
    });

    // Slider Waktu per Soal
    const timeSlider = this.root.querySelector('#cfg-answer-time');
    const timeLabel = this.root.querySelector('#lbl-answer-time');
    timeSlider.addEventListener('input', () => {
      timeLabel.textContent = `${timeSlider.value} Detik`;
    });

    // Preset Jumlah Soal
    const qInput = this.root.querySelector('#cfg-total-q');
    this.root.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        qInput.value = btn.getAttribute('data-val');
      });
    });

    // Toggle Audio
    const audioCheckbox = this.root.querySelector('#cfg-audio-enable');
    const audioStatusLabel = this.root.querySelector('#lbl-audio-status');
    audioCheckbox.addEventListener('change', () => {
      audioStatusLabel.textContent = audioCheckbox.checked ? '🔊 Suara Aktif' : '🔇 Suara Bisu (Muted)';
    });

    // Pilihan Tema
    let selectedTheme = CONFIG.THEME || 'siang';
    const themeCards = this.root.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        themeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedTheme = card.getAttribute('data-theme');
      });
    });

    // Unduh Template XLS
    this.root.querySelector('#btn-download-template').addEventListener('click', () => {
      downloadExcelTemplate();
    });

    // Unggah File Soal
    const fileInput = this.root.querySelector('#input-upload-questions');
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      await this.handleFileUpload(file);
      fileInput.value = ''; // Reset input agar bisa unggah ulang file yang sama
    });

    // Reset ke Soal Bawaan
    const resetBtn = this.root.querySelector('#btn-reset-questions');
    resetBtn.addEventListener('click', async () => {
      localStorage.removeItem('lets_run_custom_questions');
      await this.game.loadDefaultQuestions();
      this.showAlert('success', 'Soal telah dikembalikan ke bank soal bawaan sistem!');
      this.updateBankStatusUI(false);
    });

    // Simpan & Terapkan Pengaturan
    this.root.querySelector('#btn-modal-save').addEventListener('click', () => {
      const maxAvailable = this.game.rawQuestions ? this.game.rawQuestions.length : 10;
      let totalQ = parseInt(qInput.value, 10);
      if (isNaN(totalQ) || totalQ < 1) totalQ = 5;
      if (totalQ > maxAvailable) totalQ = maxAvailable;

      const answerTime = parseFloat(timeSlider.value) || 8.0;
      const audioEnabled = audioCheckbox.checked;

      // Perbarui CONFIG
      CONFIG.TOTAL_QUESTIONS = totalQ;
      CONFIG.ANSWER_TIME = answerTime;
      CONFIG.THEME = selectedTheme;
      CONFIG.AUDIO_ENABLED = audioEnabled;

      // Simpan preferensi guru ke localStorage
      localStorage.setItem('lets_run_teacher_settings', JSON.stringify({
        totalQuestions: totalQ,
        answerTime: answerTime,
        theme: selectedTheme,
        audioEnabled: audioEnabled
      }));

      // Terapkan tema ke dunia 3D
      if (this.game.environment) {
        this.game.environment.setTheme(selectedTheme, {
          hemiLight: this.game.hemiLight,
          sunLight: this.game.sunLight
        });
      }

      // Terapkan status audio
      if (this.game.audioManager) {
        this.game.audioManager.setMuted(!audioEnabled);
        this.game.updateAudioButtonState();
      }

      // Hitung ulang lintasan untuk jumlah soal baru
      this.game.lanes.forEach(lane => {
        lane.recalculateTrack(totalQ);
      });

      this.close();
    });
  }

  async handleFileUpload(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    let result;

    if (ext === 'json') {
      result = await parseQuestionsJSON(file);
    } else if (ext === 'xls' || ext === 'xlsx') {
      result = await parseQuestionsExcel(file);
    } else {
      this.showAlert('error', 'Format file tidak didukung. Harap unggah file dengan format .JSON, .XLS, atau .XLSX.');
      return;
    }

    if (!result.success) {
      this.showValidationErrors(result.errors, result.totalErrors);
      return;
    }

    // Simpan ke localStorage
    const savedData = {
      judul: result.title || file.name,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      soal: result.questions
    };
    localStorage.setItem('lets_run_custom_questions', JSON.stringify(savedData));

    // Perbarui game questions bank
    this.game.applyCustomQuestions(result.questions, result.title || file.name);

    this.showAlert(
      'success',
      `✅ Berhasil memuat ${result.questions.length} soal baru dari "${file.name}"! Soal kini aktif dan tersimpan.`
    );
    this.updateBankStatusUI(true, result.questions.length);
  }

  showAlert(type, message) {
    const box = this.root.querySelector('#upload-alert-box');
    if (!box) return;
    box.style.display = 'block';
    box.className = `upload-alert-box alert-${type}`;
    box.innerHTML = `<div>${message}</div>`;
  }

  showValidationErrors(errors, totalCount) {
    const box = this.root.querySelector('#upload-alert-box');
    if (!box) return;
    box.style.display = 'block';
    box.className = 'upload-alert-box alert-error';

    const countText = totalCount && totalCount > errors.length
      ? `<p class="alert-summary">Ditemukan <strong>${totalCount} kesalahan</strong> pada file. Perbaiki hal berikut:</p>`
      : '<p class="alert-summary">Ditemukan kesalahan pada file. Perbaiki hal berikut:</p>';

    const listHtml = errors.map(err => `<li>${err}</li>`).join('');

    box.innerHTML = `
      <div class="alert-content">
        ${countText}
        <ul class="alert-error-list">${listHtml}</ul>
        <p class="alert-tip">💡 Tip: Anda dapat mengunduh template contoh XLS untuk melihat format kolom yang benar.</p>
      </div>
    `;
  }

  updateBankStatusUI(isCustom, count) {
    const badge = this.root.querySelector('#bank-status-badge');
    const resetBtn = this.root.querySelector('#btn-reset-questions');
    const qCountLbl = this.root.querySelector('#lbl-available-q');
    const qInput = this.root.querySelector('#cfg-total-q');

    const totalAvailable = count || (this.game.rawQuestions ? this.game.rawQuestions.length : 10);

    if (badge) {
      badge.className = `status-badge ${isCustom ? 'badge-custom' : 'badge-default'}`;
      badge.textContent = isCustom ? `📘 Soal Kustom Guru (${totalAvailable} Soal)` : `📗 Soal Bawaan Sistem (${totalAvailable} Soal)`;
    }

    if (resetBtn) {
      resetBtn.style.display = isCustom ? 'inline-flex' : 'none';
    }

    if (qCountLbl) {
      qCountLbl.textContent = totalAvailable;
    }

    if (qInput) {
      qInput.max = totalAvailable;
      if (parseInt(qInput.value, 10) > totalAvailable) {
        qInput.value = totalAvailable;
      }
    }
  }
}
