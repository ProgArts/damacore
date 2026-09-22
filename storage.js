/* ═══════════════════════════════════════
   داماکور - مدیریت داده‌ها (Supabase)
   ═══════════════════════════════════════ */

const Storage = (function () {
  'use strict';
  
  /* ─── کش لوکال برای سرعت ─── */
  let cache = {
    profile: null,
    stats: null,
    lastFetch: 0,
  };
  
  const CACHE_TIME = 5000; // ۵ ثانیه
  
  /* ─── چک لاگین ─── */
  async function getCurrentUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session ? session.user : null;
  }
  
  /* ─── خواندن پروفایل ─── */
  async function getProfile(forceRefresh = false) {
    const user = await getCurrentUser();
    
    if (!user) {
      return getGuestProfile();
    }
    
    // چک کش
    const now = Date.now();
    if (!forceRefresh && cache.profile && (now - cache.lastFetch) < CACHE_TIME) {
      return cache.profile;
    }
    
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      cache.profile = data;
      cache.lastFetch = now;
      return data;
      
    } catch (error) {
      console.error('خطا در خواندن پروفایل:', error);
      return getGuestProfile();
    }
  }
  
  /* ─── پروفایل مهمان ─── */
  function getGuestProfile() {
    return {
      id: null,
      username: 'مهمان',
      user_id: 'guest',
      bio: '',
      damacoin: 0,
      isGuest: true,
    };
  }
  
  /* ─── خواندن آمار ─── */
  async function getStats(forceRefresh = false) {
    const user = await getCurrentUser();
    
    if (!user) {
      return getGuestStats();
    }
    
    const now = Date.now();
    if (!forceRefresh && cache.stats && (now - cache.lastFetch) < CACHE_TIME) {
      return cache.stats;
    }
    
    try {
      const { data, error } = await supabaseClient
        .from('stats')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      cache.stats = data;
      cache.lastFetch = now;
      return data;
      
    } catch (error) {
      console.error('خطا در خواندن آمار:', error);
      return getGuestStats();
    }
  }
  
  /* ─── آمار مهمان ─── */
  function getGuestStats() {
    return {
      wins: 0,
      losses: 0,
      total_games: 0,
      pieces_captured: 0,
      kings_made: 0,
      easy_wins: 0,
      medium_wins: 0,
      hard_wins: 0,
      perfect_wins: 0,
      isGuest: true,
    };
  }
  
  /* ─── افزودن داماکوین ─── */
  async function addDamacoin(amount) {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('مهمان نمی‌تونه داماکوین بگیره');
      return 0;
    }
    
    try {
      // اول مقدار فعلی رو بگیر
      const profile = await getProfile();
      const currentAmount = profile.damacoin || 0;
      const newAmount = currentAmount + amount;
      
      // آپدیت
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          damacoin: newAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // آپدیت کش
      if (cache.profile) {
        cache.profile.damacoin = newAmount;
      }
      
      return newAmount;
      
    } catch (error) {
      console.error('خطا در افزودن داماکوین:', error);
      return 0;
    }
  }
  
  /* ─── کم کردن داماکوین ─── */
  async function spendDamacoin(amount) {
    const profile = await getProfile();
    
    if (profile.damacoin < amount) return false;
    
    await addDamacoin(-amount);
    return true;
  }
  
  /* ─── ثبت برد ─── */
  async function recordWin(difficulty, sessionStats = {}) {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('مهمان: برد ثبت نمی‌شه');
      return null;
    }
    
    try {
      const stats = await getStats();
      
      const updated = {
        wins: (stats.wins || 0) + 1,
        total_games: (stats.total_games || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      
      // اضافه کردن آمار اضافی
      if (sessionStats.piecesCaptured) {
        updated.pieces_captured = (stats.pieces_captured || 0) + sessionStats.piecesCaptured;
      }
      if (sessionStats.kingsMade) {
        updated.kings_made = (stats.kings_made || 0) + sessionStats.kingsMade;
      }
      if (sessionStats.perfectWin) {
        updated.perfect_wins = (stats.perfect_wins || 0) + 1;
      }
      
      // آمار بر اساس سختی
      if (difficulty === 'easy') {
        updated.easy_wins = (stats.easy_wins || 0) + 1;
      } else if (difficulty === 'medium') {
        updated.medium_wins = (stats.medium_wins || 0) + 1;
      } else if (difficulty === 'hard') {
        updated.hard_wins = (stats.hard_wins || 0) + 1;
      }
      
      const { error } = await supabaseClient
        .from('stats')
        .update(updated)
        .eq('id', user.id);
      
      if (error) throw error;
      
      // آپدیت کش
      cache.stats = { ...stats, ...updated };
      
      return updated;
      
    } catch (error) {
      console.error('خطا در ثبت برد:', error);
      return null;
    }
  }
  
  /* ─── ثبت باخت ─── */
  async function recordLoss() {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }
    
    try {
      const stats = await getStats();
      
      const updated = {
        losses: (stats.losses || 0) + 1,
        total_games: (stats.total_games || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabaseClient
        .from('stats')
        .update(updated)
        .eq('id', user.id);
      
      if (error) throw error;
      
      cache.stats = { ...stats, ...updated };
      
      return updated;
      
    } catch (error) {
      console.error('خطا در ثبت باخت:', error);
      return null;
    }
  }
  
  /* ─── بروزرسانی پروفایل ─── */
  async function updateProfile(data) {
    const user = await getCurrentUser();
    
    if (!user) return false;
    
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // آپدیت کش
      if (cache.profile) {
        Object.assign(cache.profile, data);
      }
      
      return true;
      
    } catch (error) {
      console.error('خطا:', error);
      return false;
    }
  }
  
  /* ─── پاک کردن کش ─── */
  function clearCache() {
    cache.profile = null;
    cache.stats = null;
    cache.lastFetch = 0;
  }
  
  /* ─── API ─── */
  return {
    getProfile,
    getStats,
    addDamacoin,
    spendDamacoin,
    recordWin,
    recordLoss,
    updateProfile,
    clearCache,
    getCurrentUser,
  };
})();
