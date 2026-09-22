/* ═══════════════════════════════════════
   داماکور - مدیریت ذخیره‌سازی
   ═══════════════════════════════════════ */

const Storage = (function () {
  'use strict';
  
  const KEYS = {
    PROFILE: 'damacore_profile',
    STATS: 'damacore_stats',
  };
  
  /* ─── پروفایل پیش‌فرض ─── */
  const DEFAULT_PROFILE = {
    name: 'بازیکن',
    damacoin: 0,
    avatar: '👤',
    createdAt: Date.now(),
  };
  
  /* ─── آمار پیش‌فرض ─── */
  const DEFAULT_STATS = {
    wins: 0,
    losses: 0,
    totalGames: 0,
    piecesCaptured: 0,
    kingsMade: 0,
    easyWins: 0,
    mediumWins: 0,
    hardWins: 0,
    perfectWins: 0,
  };
  
  /* ─── خواندن پروفایل ─── */
  function getProfile() {
    try {
      const data = localStorage.getItem(KEYS.PROFILE);
      if (!data) return { ...DEFAULT_PROFILE };
      return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
    } catch (e) {
      return { ...DEFAULT_PROFILE };
    }
  }
  
  /* ─── ذخیره پروفایل ─── */
  function saveProfile(profile) {
    try {
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /* ─── خواندن آمار ─── */
  function getStats() {
    try {
      const data = localStorage.getItem(KEYS.STATS);
      if (!data) return { ...DEFAULT_STATS };
      return { ...DEFAULT_STATS, ...JSON.parse(data) };
    } catch (e) {
      return { ...DEFAULT_STATS };
    }
  }
  
  /* ─── ذخیره آمار ─── */
  function saveStats(stats) {
    try {
      localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /* ─── افزودن داماکوین ─── */
  function addDamacoin(amount) {
    const profile = getProfile();
    profile.damacoin = (profile.damacoin || 0) + amount;
    saveProfile(profile);
    return profile.damacoin;
  }
  
  /* ─── کم کردن داماکوین ─── */
  function spendDamacoin(amount) {
    const profile = getProfile();
    if (profile.damacoin < amount) return false;
    profile.damacoin -= amount;
    saveProfile(profile);
    return true;
  }
  
  /* ─── ثبت برد ─── */
  function recordWin(difficulty, stats = {}) {
    const s = getStats();
    s.wins++;
    s.totalGames++;
    
    if (difficulty === 'easy') s.easyWins++;
    else if (difficulty === 'medium') s.mediumWins++;
    else if (difficulty === 'hard') s.hardWins++;
    
    if (stats.piecesCaptured) s.piecesCaptured += stats.piecesCaptured;
    if (stats.kingsMade) s.kingsMade += stats.kingsMade;
    if (stats.perfectWin) s.perfectWins++;
    
    saveStats(s);
    return s;
  }
  
  /* ─── ثبت باخت ─── */
  function recordLoss() {
    const s = getStats();
    s.losses++;
    s.totalGames++;
    saveStats(s);
    return s;
  }
  
  /* ─── ریست همه چیز ─── */
  function resetAll() {
    localStorage.removeItem(KEYS.PROFILE);
    localStorage.removeItem(KEYS.STATS);
  }
  
  /* ─── API ─── */
  return {
    getProfile,
    saveProfile,
    getStats,
    saveStats,
    addDamacoin,
    spendDamacoin,
    recordWin,
    recordLoss,
    resetAll,
  };
})();