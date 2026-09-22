/* ═══════════════════════════════════════
   داماکور - منطق بازی آنلاین
   ═══════════════════════════════════════ */

(function () {
  'use strict';
  
  /* ─── المان‌ها ─── */
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const createModal = document.getElementById('createModal');
  const joinModal = document.getElementById('joinModal');
  const roomCodeDisplay = document.getElementById('roomCodeDisplay');
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  const cancelRoomBtn = document.getElementById('cancelRoomBtn');
  const roomCodeInput = document.getElementById('roomCodeInput');
  const joinMessage = document.getElementById('joinMessage');
  const confirmJoinBtn = document.getElementById('confirmJoinBtn');
  const cancelJoinBtn = document.getElementById('cancelJoinBtn');
  
  /* ─── متغیرها ─── */
  let currentUser = null;
  let myRoomId = null;
  let myGameCode = null;
  let channel = null;
  
  /* ─── راه‌اندازی ─── */
  async function init() {
    // چک لاگین
    currentUser = await Storage.getCurrentUser();
    
    if (!currentUser) {
      // اگه لاگین نکرده → برو لاگین
      window.location.href = 'login.html';
      return;
    }
    
    // رویدادها
    createRoomBtn.addEventListener('click', onCreateRoom);
    joinRoomBtn.addEventListener('click', () => showJoinModal());
    copyCodeBtn.addEventListener('click', copyCode);
    cancelRoomBtn.addEventListener('click', cancelRoom);
    confirmJoinBtn.addEventListener('click', onJoinRoom);
    cancelJoinBtn.addEventListener('click', () => hideJoinModal());
    
    // ورودی کد: فقط حروف و اعداد
    roomCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    
    // Enter برای پیوستن
    roomCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') onJoinRoom();
    });
  }
  
  /* ─── ساخت کد اتاق ─── */
  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
  
  /* ═══════════════════════════════════════
     ساخت اتاق
     ═══════════════════════════════════════ */
  async function onCreateRoom() {
    try {
      // ساخت کد یکتا
      let code;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        code = generateRoomCode();
        
        const { data } = await supabaseClient
          .from('games')
          .select('id')
          .eq('game_code', code)
          .eq('status', 'waiting')
          .maybeSingle();
        
        if (!data) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        alert('خطا در ساخت کد، دوباره تلاش کن');
        return;
      }
      
      // تخته اولیه
      const initialBoard = createInitialBoard();
      
      // ساخت بازی در Supabase
      const { data, error } = await supabaseClient
        .from('games')
        .insert({
          player_white: currentUser.id,
          board: initialBoard,
          current_turn: 'white',
          status: 'waiting',
          game_code: code,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // ذخیره اطلاعات
      myRoomId = data.id;
      myGameCode = code;
      
      // نمایش مودال
      roomCodeDisplay.textContent = code;
      createModal.classList.add('show');
      
      // گوش دادن به تغییرات
      subscribeToGame(data.id);
      
    } catch (error) {
      console.error('خطا در ساخت اتاق:', error);
      alert('خطا در ساخت اتاق: ' + error.message);
    }
  }
  
  /* ─── تخته اولیه ─── */
  function createInitialBoard() {
    const b = Array(8).fill(null).map(() => Array(8).fill(null));
    
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          b[r][c] = { color: 'black', king: false };
        }
      }
    }
    
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          b[r][c] = { color: 'white', king: false };
        }
      }
    }
    
    return b;
  }
  
  /* ─── گوش دادن به بازی ─── */
  function subscribeToGame(gameId) {
    // اگه قبلاً subscribe بود، لغو کن
    if (channel) {
      supabaseClient.removeChannel(channel);
    }
    
    channel = supabaseClient
      .channel('game-' + gameId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: 'id=eq.' + gameId,
      }, (payload) => {
        handleGameUpdate(payload.new);
      })
      .subscribe();
  }
  
  /* ─── مدیریت تغییرات ─── */
  function handleGameUpdate(gameData) {
    // اگه حریف اومد
    if (gameData.player_black && gameData.status === 'playing') {
      // برو به صفحه بازی
      window.location.href = 'game-online.html?game=' + gameData.id + '&color=white';
    }
  }
  
  /* ─── کپی کد ─── */
  function copyCode() {
    if (!myGameCode) return;
    
    navigator.clipboard.writeText(myGameCode).then(() => {
      copyCodeBtn.querySelector('span:last-child').textContent = 'کپی شد! ✅';
      
      setTimeout(() => {
        copyCodeBtn.querySelector('span:last-child').textContent = 'کپی کد';
      }, 2000);
    }).catch(() => {
      alert('کد: ' + myGameCode);
    });
  }
  
  /* ─── لغو اتاق ─── */
  async function cancelRoom() {
    if (!myRoomId) return;
    
    if (!confirm('مطمئنی می‌خوای اتاق رو لغو کنی؟')) return;
    
    try {
      // حذف از Supabase
      await supabaseClient
        .from('games')
        .delete()
        .eq('id', myRoomId);
      
      // لغو subscription
      if (channel) {
        supabaseClient.removeChannel(channel);
        channel = null;
      }
      
      myRoomId = null;
      myGameCode = null;
      createModal.classList.remove('show');
      
    } catch (error) {
      console.error('خطا:', error);
      alert('خطا در لغو');
    }
  }
  
  /* ═══════════════════════════════════════
     پیوستن به اتاق
     ═══════════════════════════════════════ */
  function showJoinModal() {
    roomCodeInput.value = '';
    joinMessage.textContent = '';
    joinMessage.className = 'modal-message';
    joinModal.classList.add('show');
    setTimeout(() => roomCodeInput.focus(), 100);
  }
  
  function hideJoinModal() {
    joinModal.classList.remove('show');
  }
  
  async function onJoinRoom() {
    const code = roomCodeInput.value.trim().toUpperCase();
    
    if (code.length !== 6) {
      joinMessage.textContent = '❌ کد باید ۶ کاراکتر باشه';
      joinMessage.className = 'modal-message error';
      return;
    }
    
    joinMessage.textContent = '⏳ در حال جستجو...';
    joinMessage.className = 'modal-message info';
    confirmJoinBtn.disabled = true;
    
    try {
      // پیدا کردن اتاق
      const { data, error } = await supabaseClient
        .from('games')
        .select('*')
        .eq('game_code', code)
        .eq('status', 'waiting')
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        joinMessage.textContent = '❌ اتاقی با این کد پیدا نشد';
        joinMessage.className = 'modal-message error';
        confirmJoinBtn.disabled = false;
        return;
      }
      
      // چک کن خودم صاحب اتاق نباشم
      if (data.player_white === currentUser.id) {
        joinMessage.textContent = '❌ نمی‌تونی به اتاق خودت بپیوندی';
        joinMessage.className = 'modal-message error';
        confirmJoinBtn.disabled = false;
        return;
      }
      
      // پیوستن
      const { error: updateError } = await supabaseClient
        .from('games')
        .update({
          player_black: currentUser.id,
          status: 'playing',
        })
        .eq('id', data.id);
      
      if (updateError) throw updateError;
      
      joinMessage.textContent = '✅ وارد شدی! در حال انتقال...';
      joinMessage.className = 'modal-message success';
      
      // برو به صفحه بازی
      setTimeout(() => {
        window.location.href = 'game-online.html?game=' + data.id + '&color=black';
      }, 1000);
      
    } catch (error) {
      console.error('خطا:', error);
      joinMessage.textContent = '❌ خطا: ' + error.message;
      joinMessage.className = 'modal-message error';
      confirmJoinBtn.disabled = false;
    }
  }
  
  /* ─── شروع ─── */
  init();
  
})();
