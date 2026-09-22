/* ═══════════════════════════════════════
   داماکور - بازی آنلاین
   ═══════════════════════════════════════ */

(function () {
  'use strict';
  
  /* ─── ثابت‌ها ─── */
  const BOARD_SIZE = 8;
  const CELL = 60;
  
  /* ─── وضعیت ─── */
  let board = [];
  let selected = null;
  let possibleMoves = [];
  let currentTurn = 'white';
  let myColor = 'white';
  let opponentColor = 'black';
  let gameOver = false;
  let isMyTurn = false;
  let gameId = null;
  let currentUser = null;
  let channel = null;
  let isConnected = false;
  
  /* ─── DOM ─── */
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const statusBar = document.getElementById('statusBar');
  const winnerModal = document.getElementById('winnerModal');
  const winnerIcon = document.getElementById('winnerIcon');
  const winnerText = document.getElementById('winnerText');
  const opponentBar = document.getElementById('opponentBar');
  const myBar = document.getElementById('myBar');
  const opponentName = document.getElementById('opponentName');
  const myName = document.getElementById('myName');
  const connectionStatus = document.getElementById('connectionStatus');
  const opponentLeftModal = document.getElementById('opponentLeftModal');
  const leaveBtn = document.getElementById('leaveBtn');
  
  /* ─── راه‌اندازی ─── */
  async function init() {
    // چک لاگین
    currentUser = await Storage.getCurrentUser();
    
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }
    
    // خواندن پارامترها از URL
    const params = new URLSearchParams(window.location.search);
    gameId = params.get('game');
    myColor = params.get('color') || 'white';
    opponentColor = myColor === 'white' ? 'black' : 'white';
    
    if (!gameId) {
      window.location.href = 'online.html';
      return;
    }
    
    // تنظیم رنگ‌ها
    if (myColor === 'black') {
      myBar.classList.remove('my-bar');
      myBar.classList.add('opponent-bar');
      opponentBar.classList.remove('opponent-bar');
      opponentBar.classList.add('my-bar');
      
      // عوض کردن اسم‌ها
      const tempName = myName.textContent;
      myName.textContent = opponentName.textContent;
      opponentName.textContent = tempName;
    }
    
    // بارگذاری بازی
    await loadGame();
    
    // گوش دادن به تغییرات
    subscribeToGame();
    
    // رویدادها
    canvas.addEventListener('click', onCanvasClick);
    leaveBtn.addEventListener('click', onLeave);
    
    // نمایش پیام اتصال
    setConnectionStatus('connecting');
    statusBar.textContent = 'در حال اتصال...';
    statusBar.className = 'status-bar connecting';
  }
  
  /* ─── وضعیت اتصال ─── */
  function setConnectionStatus(status) {
    connectionStatus.className = 'connection-status ' + status;
    isConnected = status === 'connected';
  }
  
  /* ─── بارگذاری بازی ─── */
  async function loadGame() {
    try {
      const { data, error } = await supabaseClient
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
      
      if (error) throw error;
      
      board = data.board;
      currentTurn = data.current_turn;
      gameOver = data.status === 'finished';
      
      isMyTurn = currentTurn === myColor && !gameOver;
      
      // تنظیم نام‌ها
      await setPlayerNames(data);
      
      drawBoard();
      updateUI();
      
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('خطا:', error);
      statusBar.textContent = '❌ خطا در بارگذاری';
      statusBar.className = 'status-bar';
    }
  }
  
  /* ─── تنظیم اسم‌ها ─── */
  async function setPlayerNames(gameData) {
    try {
      // اسم من
      const { data: myProfile } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('id', currentUser.id)
        .single();
      
      // اسم حریف
      const opponentId = myColor === 'white' 
        ? gameData.player_black 
        : gameData.player_white;
      
      let opponentUsername = 'حریف';
      
      if (opponentId) {
        const { data: oppProfile } = await supabaseClient
          .from('profiles')
          .select('username')
          .eq('id', opponentId)
          .single();
        
        if (oppProfile) opponentUsername = oppProfile.username;
      }
      
      if (myColor === 'white') {
        myName.textContent = myProfile?.username || 'شما';
        opponentName.textContent = opponentUsername;
      } else {
        myName.textContent = myProfile?.username || 'شما';
        opponentName.textContent = opponentUsername;
      }
      
    } catch (error) {
      console.error('خطا در اسم‌ها:', error);
    }
  }
  
  /* ─── گوش دادن به بازی ─── */
  function subscribeToGame() {
    channel = supabaseClient
      .channel('game-channel-' + gameId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: 'id=eq.' + gameId,
      }, (payload) => {
        handleRemoteUpdate(payload.new);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'games',
        filter: 'id=eq.' + gameId,
      }, () => {
        // بازی حذف شد (حریف ترک کرد یا لغو شد)
        opponentLeftModal.classList.add('show');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });
  }
  
  /* ─── مدیریت تغییرات از طرف حریف ─── */
  function handleRemoteUpdate(gameData) {
    // اگه بازی تموم شده
    if (gameData.status === 'finished') {
      board = gameData.board;
      currentTurn = gameData.current_turn;
      gameOver = true;
      
      drawBoard();
      showWinner(gameData.winner);
      return;
    }
    
    // آپدیت تخته
    board = gameData.board;
    currentTurn = gameData.current_turn;
    isMyTurn = currentTurn === myColor;
    
    // پاک کردن انتخاب
    selected = null;
    possibleMoves = [];
    
    drawBoard();
    updateUI();
  }
  
  /* ─── UI ─── */
  function updateUI() {
    let whiteCount = 0;
    let blackCount = 0;
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c]?.color === 'white') whiteCount++;
        if (board[r][c]?.color === 'black') blackCount++;
      }
    }
    
    const persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    const fa = (n) => String(n).split('').map(d => persian[d] || d).join('');
    
    const myPiecesCount = myColor === 'white' ? whiteCount : blackCount;
    const oppPiecesCount = myColor === 'white' ? blackCount : whiteCount;
    
    document.getElementById('myPieces').textContent = fa(myPiecesCount);
    document.getElementById('opponentPieces').textContent = fa(oppPiecesCount);
    
    opponentBar.classList.toggle('active', currentTurn === opponentColor);
    myBar.classList.toggle('active', currentTurn === myColor);
    
    if (gameOver) return;
    
    if (isMyTurn) {
      statusBar.textContent = '🟢 نوبت شماست';
      statusBar.className = 'status-bar your-turn';
    } else {
      statusBar.textContent = '⏳ نوبت حریف';
      statusBar.className = 'status-bar opponent-turn';
    }
  }
  
  /* ─── رسم تخته ─── */
  function drawBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? '#F0D9B5' : '#B58863';
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        
        if (selected && selected.r === r && selected.c === c) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }
        
        const move = possibleMoves.find(m => m.r === r && m.c === c);
        if (move) {
          ctx.beginPath();
          ctx.arc(
            c * CELL + CELL / 2,
            r * CELL + CELL / 2,
            move.jump ? 12 : 10,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = move.jump 
            ? 'rgba(239, 68, 68, 0.7)' 
            : 'rgba(16, 185, 129, 0.7)';
          ctx.fill();
        }
        
        const piece = board[r][c];
        if (piece) drawPiece(c, r, piece);
      }
    }
  }
  
  function drawPiece(c, r, piece) {
    const cx = c * CELL + CELL / 2;
    const cy = r * CELL + CELL / 2;
    const radius = CELL / 2 - 6;
    
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 3, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    
    const gradient = ctx.createRadialGradient(
      cx - radius / 3, cy - radius / 3, radius / 6,
      cx, cy, radius
    );
    
    if (piece.color === 'white') {
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(1, '#BBBBBB');
    } else {
      gradient.addColorStop(0, '#4B5563');
      gradient.addColorStop(1, '#111827');
    }
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = piece.color === 'white' ? '#888' : '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (piece.king) {
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', cx, cy + 2);
    }
  }
  
  /* ─── حرکت‌های مجاز ─── */
  function getValidMoves(r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    
    const moves = [];
    const directions = piece.king
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : piece.color === 'white'
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]];
    
    for (const [dr, dc] of directions) {
      const nr = r + dr, nc = c + dc;
      if (isInBounds(nr, nc) && !board[nr][nc]) {
        moves.push({ r: nr, c: nc, jump: false });
      }
      
      const jr = r + dr * 2, jc = c + dc * 2;
      if (isInBounds(jr, jc) && !board[jr][jc]) {
        const midPiece = board[nr]?.[nc];
        if (midPiece && midPiece.color !== piece.color) {
          moves.push({
            r: jr, c: jc, jump: true,
            captured: { r: nr, c: nc }
          });
        }
      }
    }
    
    return moves;
  }
  
  function isInBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }
  
  /* ─── کلیک ─── */
  function onCanvasClick(e) {
    if (gameOver || !isMyTurn) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    
    if (!isInBounds(r, c)) return;
    
    const piece = board[r][c];
    if (piece && piece.color === myColor) {
      selected = { r, c };
      possibleMoves = getValidMoves(r, c);
      drawBoard();
      return;
    }
    
    if (selected) {
      const move = possibleMoves.find(m => m.r === r && m.c === c);
      if (move) executeMove(selected, move);
    }
  }
  
  /* ─── اجرای حرکت ─── */
  async function executeMove(from, to) {
    if (!isMyTurn || gameOver) return;
    
    const piece = board[from.r][from.c];
    
    if (to.jump && to.captured) {
      board[to.captured.r][to.captured.c] = null;
    }
    
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;
    
    if (
      (piece.color === 'white' && to.r === 0) ||
      (piece.color === 'black' && to.r === BOARD_SIZE - 1)
    ) {
      piece.king = true;
    }
    
    selected = null;
    possibleMoves = [];
    currentTurn = opponentColor;
    isMyTurn = false;
    
    drawBoard();
    updateUI();
    
    // بررسی پایان بازی
    const gameStatus = checkGameOver();
    
    // ارسال به Supabase
    try {
      const updateData = {
        board: board,
        current_turn: currentTurn,
      };
      
      if (gameStatus.finished) {
        updateData.status = 'finished';
        updateData.winner = gameStatus.winner;
      }
      
      const { error } = await supabaseClient
        .from('games')
        .update(updateData)
        .eq('id', gameId);
      
      if (error) throw error;
      
      if (gameStatus.finished) {
        gameOver = true;
        showWinner(gameStatus.winner);
      }
      
    } catch (error) {
      console.error('خطا:', error);
      alert('خطا در ارسال حرکت');
    }
  }
  
  /* ─── بررسی پایان ─── */
  function checkGameOver() {
    let whiteCount = 0, blackCount = 0;
    let whiteMoves = 0, blackMoves = 0;
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        
        if (piece.color === 'white') {
          whiteCount++;
          if (getValidMoves(r, c).length > 0) whiteMoves++;
        } else {
          blackCount++;
          if (getValidMoves(r, c).length > 0) blackMoves++;
        }
      }
    }
    
    if (whiteCount === 0 || whiteMoves === 0) {
      return { finished: true, winner: 'black' };
    }
    if (blackCount === 0 || blackMoves === 0) {
      return { finished: true, winner: 'white' };
    }
    
    return { finished: false };
  }
  
  /* ─── نمایش برنده ─── */
  function showWinner(winnerColor) {
    const didIWin = winnerColor === myColor;
    
    winnerIcon.textContent = didIWin ? '🎉' : '😢';
    winnerText.textContent = didIWin ? 'بردی!' : 'باختی!';
    
    statusBar.textContent = didIWin ? '🎉 بردی!' : '😢 باختی!';
    statusBar.className = 'status-bar';
    
    setTimeout(() => {
      winnerModal.classList.add('show');
    }, 500);
  }
  
  /* ─── ترک بازی ─── */
  async function onLeave() {
    if (gameOver) {
      window.location.href = 'online.html';
      return;
    }
    
    if (!confirm('مطمئنی می‌خوای از بازی خارج شی؟\nاگه خارج شی، باخت حساب می‌شی.')) return;
    
    try {
      // علامت‌گذاری بازی به عنوان تموم شده با باخت من
      await supabaseClient
        .from('games')
        .update({
          status: 'finished',
          winner: opponentColor,
        })
        .eq('id', gameId);
      
      window.location.href = 'online.html';
      
    } catch (error) {
      console.error('خطا:', error);
      window.location.href = 'online.html';
    }
  }
  
  /* ─── قبل از بستن صفحه ─── */
  window.addEventListener('beforeunload', () => {
    if (!gameOver && gameId) {
      // علامت‌گذاری
      navigator.sendBeacon?.(
        SUPABASE_URL + '/rest/v1/games?id=eq.' + gameId,
        new Blob([JSON.stringify({
          status: 'finished',
          winner: opponentColor,
        })], { type: 'application/json' })
      );
    }
  });
  
  /* ─── شروع ─── */
  init();
  
})();
