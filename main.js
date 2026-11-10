import { Game } from './game/Game.js';

// Inisialisasi game 4 jalur split-screen
window.addEventListener('DOMContentLoaded', () => {
  window.__gameInstance = new Game('app');
});
