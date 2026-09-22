/* ═══════════════════════════════════════
   داماکور - جاوااسکریپت کامل
   ═══════════════════════════════════════ */

(function () {
  'use strict';
  
  const CONFIG = {
    GAME: {
      NAME_FA: 'داماکور',
      NAME_EN: 'DamaCore',
      VERSION: '1.0.0',
    },
  };
  
  function init() {
    console.log(`🎮 ${CONFIG.GAME.NAME_FA} v${CONFIG.GAME.VERSION}`);
    setupButtons();
  }
  
  function setupButtons() {
    const buttons = document.querySelectorAll('.btn[data-action]');
    
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        handleAction(btn.dataset.action, btn);
      });
    });
  }
  
  function handleAction(action, btn) {
    animateClick(btn);
    
    switch (action) {
      case 'join':
        onJoinGame();
        break;
      case 'leaderboard':
        onLeaderboard();
        break;
      case 'settings':
        onSettings();
        break;
    }
  }
  
  function animateClick(btn) {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = '';
    }, 150);
  }
  
  function onJoinGame() {
    console.log('🔗 پیوستن به بازی');
    showToast('به زودی... 🚧');
  }
  
  function onLeaderboard() {
    console.log('🏆 جدول امتیازات');
    showToast('به زودی... 🚧');
  }
  
  function onSettings() {
    console.log('⚙️ تنظیمات');
    showToast('به زودی... 🚧');
  }
  
  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: linear-gradient(135deg, #FCD34D, #F59E0B);
      color: #020617;
      padding: 15px 30px;
      border-radius: 12px;
      font-family: 'Lalezar', sans-serif;
      font-size: 18px;
      box-shadow: 0 10px 40px rgba(251, 191, 36, 0.5);
      z-index: 1000;
      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      letter-spacing: 1px;
    `;
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();