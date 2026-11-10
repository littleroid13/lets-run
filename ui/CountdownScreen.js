export class CountdownScreen {
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.root = null;
  }

  start() {
    this.root = document.createElement('div');
    this.root.className = 'countdown-screen';
    this.root.innerHTML = `
      <div class="countdown-number" id="countdown-num">3</div>
    `;
    this.container.appendChild(this.root);

    const steps = ['3', '2', '1', 'GO! 🏁'];
    let currentStep = 0;

    const el = this.root.querySelector('#countdown-num');

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        el.textContent = steps[currentStep];
        el.className = 'countdown-number pop-animation';
        if (steps[currentStep].startsWith('GO')) {
          el.classList.add('go-text');
        }
        // Force reflow for CSS animation restart
        void el.offsetWidth;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.destroy();
          if (this.onComplete) this.onComplete();
        }, 500);
      }
    }, 900);
  }

  destroy() {
    if (this.root && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
      this.root = null;
    }
  }
}
