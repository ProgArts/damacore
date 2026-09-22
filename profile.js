/* ═══════════════════════════════════════
   داماکور - منطق پروفایل
   ═══════════════════════════════════════ */

(function () {
  'use strict';
  
  /* ─── تبدیل به فارسی ─── */
  const persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  function fa(num) {
    return String(num).split('').map(d => persian[d] || d).join('');
  }
  
  /* ─── المان‌های DOM ─── */
  const loadingProfile = document.getElementById('loadingProfile');
  const profileData = document.getElementById('profileData');
  const notLoggedIn = document.getElementById('notLoggedIn');
  
  /* ─── راه‌اندازی ─── */
  async function init() {
    // چک کن کاربر لاگین کرده
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
      // کاربر لاگین نکرده
      loadingProfile.style.display = 'none';
      notLoggedIn.style.display = 'block';
      return;
    }
    
    // کاربر لاگین کرده → اطلاعات رو بارگذاری کن
    await loadProfile(session.user.id);
  }
  
  /* ─── بارگذاری پروفایل ─── */
  async function loadProfile(userId) {
    try {
      // پروفایل
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      
      // آمار
      const { data: stats, error: statsError } = await supabaseClient
        .from('stats')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (statsError) throw statsError;
      
      // نمایش
      displayProfile(profile, stats);
      
    } catch (error) {
      console.error('خطا در بارگذاری:', error);
      loadingProfile.innerHTML = '<p style="color: #EF4444;">❌ خطا در بارگذاری پروفایل</p>';
    }
  }
  
  /* ─── نمایش پروفایل ─── */
  function displayProfile(profile, stats) {
    // پروفایل
    document.getElementById('profileName').textContent = profile.username || 'بازیکن';
    document.getElementById('profileId').textContent = '@' + (profile.user_id || 'user');
    document.getElementById('profileBio').textContent = profile.bio || 'هنوز بیو نداری...';
    document.getElementById('coinAmount').textContent = fa(profile.damacoin || 0);
    
    // سطح
    const level = getLevel(stats.wins || 0);
    document.getElementById('profileLevel').textContent = level;
    
    // آمار کلی
    document.getElementById('totalGames').textContent = fa(stats.total_games || 0);
    document.getElementById('wins').textContent = fa(stats.wins || 0);
    document.getElementById('losses').textContent = fa(stats.losses || 0);
    
    const rate = stats.total_games > 0 
      ? Math.round((stats.wins / stats.total_games) * 100) 
      : 0;
    document.getElementById('winRate').textContent = fa(rate) + '٪';
    
    // آمار نبرد
    document.getElementById('piecesCaptured').textContent = fa(stats.pieces_captured || 0);
    document.getElementById('kingsMade').textContent = fa(stats.kings_made || 0);
    document.getElementById('perfectWins').textContent = fa(stats.perfect_wins || 0);
    
    // برد بر اساس سختی
    document.getElementById('easyWins').textContent = fa(stats.easy_wins || 0);
    document.getElementById('mediumWins').textContent = fa(stats.medium_wins || 0);
    document.getElementById('hardWins').textContent = fa(stats.hard_wins || 0);
    
    // نمایش
    loadingProfile.style.display = 'none';
    profileData.style.display = 'block';
  }
  
  /* ─── سطح ─── */
  function getLevel(wins) {
    if (wins >= 100) return '🏆 افسانه';
    if (wins >= 50) return '👑 استاد';
    if (wins >= 25) return '⚔️ حرفه‌ای';
    if (wins >= 10) return '🎯 ماهر';
    if (wins >= 5) return '🔰 تمرین‌کار';
    return '🌱 تازه‌کار';
  }
  
  /* ─── خروج از حساب ─── */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (!confirm('مطمئنی می‌خوای خارج شی؟')) return;
    
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
      alert('خطا در خروج');
      return;
    }
    
    window.location.href = 'index.html';
  });
  
  /* ─── شروع ─── */
  init();
  
})();
