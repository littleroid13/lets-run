import { playAudioSfx } from '../audio/AudioManager.js';

export class LoginScreen {
  constructor(container, onLoginSuccess) {
    this.container = container;
    this.onLoginSuccess = onLoginSuccess;
    this.ACCESS_CODE = 'MRLIT105';
    this.root = null;
    this.render();
  }

  render() {
    this.root = document.createElement('div');
    this.root.className = 'login-screen-overlay';

    this.root.innerHTML = `
      <!-- Animated Background Rays & Atmosphere -->
      <div class="login-bg-layer">
        <div class="login-sky-gradient"></div>
        <div class="login-sunburst anim-sunburst">
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
      </div>

      <!-- Main Login Container Card -->
      <div class="login-content-wrapper">
        <div class="login-card anim-card-in">
          <!-- Corner Rivets -->
          <span class="card-rivet rivet-tl"></span>
          <span class="card-rivet rivet-tr"></span>
          <div class="candy-rect-gloss"></div>

          <!-- Logo Banner -->
          <div class="login-logo-wrap">
            <img src="${import.meta.env.BASE_URL}assets/logo.png" alt="LET'S RUN!" class="login-logo-img">
          </div>

          <!-- Title Badge -->
          <div class="login-badge-title">
            <span class="login-lock-icon">🔒</span>
            <span class="font-candy">MASUKKAN KODE AKSES</span>
          </div>

          <!-- Access Code Input Form -->
          <form class="login-form" id="login-form" autocomplete="off" onsubmit="return false;">
            <div class="login-input-group">
              <input 
                type="text" 
                id="access-code-input" 
                class="login-input-field font-candy" 
                placeholder="KODE AKSES" 
                maxlength="16"
                autofocus
                spellcheck="false"
                autocomplete="off"
              />
              <span class="input-clear-btn" id="input-clear-btn" title="Hapus">✖</span>
            </div>

            <div class="login-msg-box" id="login-msg-box"></div>

            <button type="submit" class="btn-candy login-submit-btn" id="login-submit-btn">
              <div class="candy-pill-gloss"></div>
              <span class="submit-rocket-icon">🚀</span>
              <span class="font-candy submit-text">MASUK KE GAME</span>
              <span class="font-candy submit-arrow">➔</span>
            </button>
          </form>

          <!-- Contact / Get Access Code Section -->
          <div class="login-contact-section">
            <div class="contact-prompt-text font-body">
              Untuk mendapatkan kode akses silahkan hubungi kontak di bawah:
            </div>

            <!-- Social Links Grid -->
            <div class="social-links-grid">
              <!-- Instagram -->
              <a href="https://www.instagram.com/littleroid13/" target="_blank" rel="noopener noreferrer" class="social-btn social-instagram" title="Hubungi via Instagram">
                <div class="social-icon-box">
                  <svg viewBox="0 0 24 24" class="social-svg">
                    <path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div class="social-label-group">
                  <span class="social-platform">Instagram</span>
                  <span class="social-handle">@littleroid13</span>
                </div>
              </a>

              <!-- TikTok -->
              <a href="https://www.tiktok.com/@littleoid13" target="_blank" rel="noopener noreferrer" class="social-btn social-tiktok" title="Hubungi via TikTok">
                <div class="social-icon-box">
                  <svg viewBox="0 0 24 24" class="social-svg">
                    <path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </div>
                <div class="social-label-group">
                  <span class="social-platform">TikTok</span>
                  <span class="social-handle">@littleoid13</span>
                </div>
              </a>

              <!-- WhatsApp -->
              <a href="https://wa.me/6288705917045" target="_blank" rel="noopener noreferrer" class="social-btn social-whatsapp" title="Hubungi via WhatsApp">
                <div class="social-icon-box">
                  <svg viewBox="0 0 24 24" class="social-svg">
                    <path fill="currentColor" d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </div>
                <div class="social-label-group">
                  <span class="social-platform">WhatsApp</span>
                  <span class="social-handle">+62 887-0591-7045</span>
                </div>
              </a>
            </div>
          </div>

          <!-- Bottom Copyright -->
          <div class="login-copyright-text">
            LET'S RUN! &copy; 2026 &bull; Created by <span class="author-highlight">littleroid13</span>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.root);
    this.bindEvents();
  }

  bindEvents() {
    const form = this.root.querySelector('#login-form');
    const input = this.root.querySelector('#access-code-input');
    const clearBtn = this.root.querySelector('#input-clear-btn');
    const msgBox = this.root.querySelector('#login-msg-box');

    // Auto-focus input
    setTimeout(() => {
      if (input) input.focus();
    }, 200);

    // Clear button toggle
    input.addEventListener('input', () => {
      clearBtn.style.display = input.value.length > 0 ? 'block' : 'none';
      if (msgBox.textContent) {
        msgBox.textContent = '';
        msgBox.className = 'login-msg-box';
      }
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
    });

    // Form submit verification
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.verifyCode();
    });
  }

  verifyCode() {
    const input = this.root.querySelector('#access-code-input');
    const msgBox = this.root.querySelector('#login-msg-box');
    const card = this.root.querySelector('.login-card');
    const submitBtn = this.root.querySelector('#login-submit-btn');

    const enteredCode = input ? input.value.trim().toUpperCase() : '';

    if (!enteredCode) {
      this.showMessage('Silakan masukkan kode akses terlebih dahulu!', 'error');
      playAudioSfx('sfx_salah');
      this.shakeCard(card);
      if (input) input.focus();
      return;
    }

    if (enteredCode === this.ACCESS_CODE) {
      // Kode Benar!
      playAudioSfx('sfx_benar');
      this.showMessage('Kode Akses Benar! Memuat Permainan...', 'success');
      
      if (input) input.disabled = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-success-state');
      }

      // Animasi transisi sukses
      card.classList.add('anim-card-success');

      setTimeout(() => {
        this.destroy();
        if (this.onLoginSuccess) {
          this.onLoginSuccess();
        }
      }, 750);
    } else {
      // Kode Salah!
      playAudioSfx('sfx_salah');
      this.showMessage('Kode Akses Salah! Silakan cek kembali atau hubungi kontak.', 'error');
      this.shakeCard(card);
      if (input) {
        input.select();
        input.focus();
      }
    }
  }

  showMessage(text, type = 'error') {
    const msgBox = this.root.querySelector('#login-msg-box');
    if (!msgBox) return;
    msgBox.textContent = text;
    msgBox.className = `login-msg-box ${type === 'success' ? 'msg-success' : 'msg-error'} anim-pop`;
  }

  shakeCard(card) {
    if (!card) return;
    card.classList.remove('anim-shake');
    void card.offsetWidth; // trigger reflow
    card.classList.add('anim-shake');
  }

  destroy() {
    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
      this.root = null;
    }
  }
}
