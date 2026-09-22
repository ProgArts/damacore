/* ═══════════════════════════════════════
   داماکور - منطق بازی چکرز
   ═══════════════════════════════════════ */

(function () {
  'use strict';
  
  /* ─── ثابت‌ها ─── */
  const BOARD_SIZE = 8;
  const CELL = 60;
  const PLAYER = 'white';   // بازیکن انسانی
  const AI = 'black';        // ربات
  
  /* ─── وضعیت بازی ─── */
  let board = [];
  let selected = null;
  let possibleMoves = [];
  let currentTurn = PLAYER;
  let gameOver = false;
  let gameMode = 'ai';        // 'ai' یا 'pvp'
  let aiThinking = false;
  
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
  
  /* ─── راه‌اندازی ─── */
  function init() {
    // تشخیص حالت بازی از URL
    const params = new URLSearchParams(window.location.search);
    gameMode = params.get('mode') === 'pvp' ? 'pvp' : 'ai';
    
    // تنظیم نام‌ها
    if (gameMode === 'ai') {
      opponentName.textContent = 'ربات 🤖';
      myName.textContent = 'شما';
    } else {
      opponentName.textContent = 'بازیکن ۲';
      myName.textContent = 'بازیکن ۱';
    }
    
    // ساخت تخته
    resetGame();
    
    // رویدادها
    canvas.addEventListener('click', onCanvasClick);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('playAgainBtn').addEventListener('click', () => {
      winnerModal.classList.remove('show');
      resetGame();
    });
  }
  
  /* ─── ریست بازی ─── */
  function resetGame() {
    board = createInitialBoard();
    selected = null;
    possibleMoves = [];
    currentTurn = PLAYER;
    gameOver = false;
    aiThinking = false;
    winnerModal.classList.remove('show');
    
    updateUI();
    drawBoard();
  }
  
  /* ─── ساخت تخته اولیه ─── */
  function createInitialBoard() {
    const b = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    
    // مهره‌های سیاه (بالا) - ردیف 0 تا 2
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          b[r][c] = { color: 'black', king: false };
        }
      }
    }
    
    // مهره‌های سفید (پایین) - ردیف 5 تا 7
    for (let r = 5; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          b[r][c] = { color: 'white', king: false };
        }
      }
    }
    
    return b;
  }
  
  /* ─── به‌روزرسانی رابط کاربری ─── */
  function updateUI() {
    // شمارش مهره‌ها
    let whiteCount = 0;
    let blackCount = 0;
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c]?.color === 'white') whiteCount++;
        if (board[r][c]?.color === 'black') blackCount++;
      }
    }
    
    document.getElementById('myPieces').textContent = toPersianNumber(whiteCount);
    document.getElementById('opponentPieces').textContent = toPersianNumber(blackCount);
    
    // نوارهای فعال
    opponentBar.classList.toggle('active', currentTurn === AI);
    myBar.classList.toggle('active', currentTurn === PLAYER);
    
    // نوار وضعیت
    if (gameOver) return;
    
    if (currentTurn === PLAYER) {
      statusBar.textContent = 'نوبت شماست';
      statusBar.className = 'status-bar your-turn';
    } else {
      if (gameMode === 'ai') {
        statusBar.textContent = 'ربات داره فکر می‌کنه...';
      } else {
        statusBar.textContent = 'نوبت بازیکن ۲';
      }
      statusBar.className = 'status-bar opponent-turn';
    }
  }
  
  /* ─── تبدیل عدد به فارسی ─── */
  function toPersianNumber(num) {
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).split('').map(d => persian[d] || d).join('');
  }
  
  /* ─── رسم تخته ─── */
  function drawBoard() {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        // رنگ خانه
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? '#F0D9B5' : '#B58863';
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        
        // هایلایت انتخاب
        if (selected && selected.r === r && selected.c === c) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }
        
        // هایلایت حرکت‌های ممکن
        const move = possibleMoves.find(m => m.r === r && m.c === c);
        if (move) {
          if (move.jump) {
            // دایره قرمز برای خوردن
            ctx.beginPath();
            ctx.arc(
              c * CELL + CELL / 2,
              r * CELL + CELL / 2,
              12,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
            ctx.fill();
          } else {
            // نقطه سبز برای حرکت ساده
            ctx.beginPath();
            ctx.arc(
              c * CELL + CELL / 2,
              r * CELL + CELL / 2,
              10,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
            ctx.fill();
          }
        }
        
        // رسم مهره
        const piece = board[r][c];
        if (piece) {
          drawPiece(c, r, piece);
        }
      }
    }
  }
  
  /* ─── رسم مهره ─── */
  function drawPiece(c, r, piece) {
    const cx = c * CELL + CELL / 2;
    const cy = r * CELL + CELL / 2;
    const radius = CELL / 2 - 6;
    
    // سایه مهره
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 3, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    
    // گرادیانت مهره
    const gradient = ctx.createRadialGradient(
      cx - radius / 3,
      cy - radius / 3,
      radius / 6,
      cx,
      cy,
      radius
    );
    
    if (piece.color === 'white') {
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(1, '#BBBBBB');
    } else {
      gradient.addColorStop(0, '#4B5563');
      gradient.addColorStop(1, '#111827');
    }
    
    // بدنه مهره
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // حاشیه
    ctx.strokeStyle = piece.color === 'white' ? '#888' : '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // تاج برای شاه
    if (piece.king) {
      ctx.font = '28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', cx, cy + 2);
    }
  }
  
  /* ─── پیدا کردن حرکت‌های مجاز ─── */
  function getValidMoves(r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    
    const moves = [];
    const directions = piece.king
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : piece.color === 'white'
        ? [[-1, -1], [-1, 1]]   // سفید به سمت بالا
        : [[1, -1], [1, 1]];     // سیاه به سمت پایین
    
    for (const [dr, dc] of directions) {
      // حرکت ساده
      const nr = r + dr;
      const nc = c + dc;
      if (isInBounds(nr, nc) && !board[nr][nc]) {
        moves.push({ r: nr, c: nc, jump: false });
      }
      
      // پرش (خوردن حریف)
      const jr = r + dr * 2;
      const jc = c + dc * 2;
      if (isInBounds(jr, jc) && !board[jr][jc]) {
        const midPiece = board[nr]?.[nc];
        if (midPiece && midPiece.color !== piece.color) {
          moves.push({
            r: jr,
            c: jc,
            jump: true,
            captured: { r: nr, c: nc }
          });
        }
      }
    }
    
    return moves;
  }
  
  /* ─── بررسی داخل تخته ─── */
  function isInBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }
  
  /* ─── کلیک روی تخته ─── */
  function onCanvasClick(e) {
    if (gameOver || aiThinking) return;
    if (currentTurn !== PLAYER) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    
    if (!isInBounds(r, c)) return;
    
    // اگه روی مهره خودی کلیک شد
    const piece = board[r][c];
    if (piece && piece.color === PLAYER) {
      selected = { r, c };
      possibleMoves = getValidMoves(r, c);
      drawBoard();
      return;
    }
    
    // اگه روی یه خانه قابل حرکت کلیک شد
    if (selected) {
      const move = possibleMoves.find(m => m.r === r && m.c === c);
      if (move) {
        executeMove(selected, move);
      }
    }
  }
  
  /* ─── اجرای حرکت ─── */
  function executeMove(from, to) {
    const piece = board[from.r][from.c];
    
    // حذف مهره خورده شده
    if (to.jump && to.captured) {
      board[to.captured.r][to.captured.c] = null;
    }
    
    // جابجایی
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;
    
    // ارتقا به شاه
    if (
      (piece.color === 'white' && to.r === 0) ||
      (piece.color === 'black' && to.r === BOARD_SIZE - 1)
    ) {
      piece.king = true;
    }
    
    selected = null;
    possibleMoves = [];
    
    // تغییر نوبت
    currentTurn = currentTurn === PLAYER ? AI : PLAYER;
    
    drawBoard();
    updateUI();
    
    // بررسی پایان بازی
    if (checkGameOver()) return;
    
    // نوبت ربات
    if (gameMode === 'ai' && currentTurn === AI) {
      aiThinking = true;
      updateUI();
      setTimeout(makeAIMove, 700);
    }
  }
  
  /* ─── بررسی پایان بازی ─── */
  function checkGameOver() {
    let whiteCount = 0;
    let blackCount = 0;
    let whiteMoves = 0;
    let blackMoves = 0;
    
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
    
    let winner = null;
    
    if (whiteCount === 0 || whiteMoves === 0) {
      winner = 'black';
    } else if (blackCount === 0 || blackMoves === 0) {
      winner = 'white';
    }
    
    if (winner) {
      gameOver = true;
      aiThinking = false;
      showWinner(winner);
      return true;
    }
    
    return false;
  }
  
  /* ─── نمایش برنده ─── */
  function showWinner(winner) {
    const isPlayerWin = winner === PLAYER;
    
    winnerIcon.textContent = isPlayerWin ? '🎉' : '😢';
    
    if (gameMode === 'ai') {
      winnerText.textContent = isPlayerWin ? 'بردی!' : 'باختی!';
    } else {
      winnerText.textContent = isPlayerWin ? 'بازیکن ۱ برد!' : 'بازیکن ۲ برد!';
    }
    
    statusBar.textContent = isPlayerWin ? '🎉 بردی!' : '😢 باختی!';
    statusBar.className = 'status-bar';
    
    setTimeout(() => {
      winnerModal.classList.add('show');
    }, 400);
  }
  
  /* ═══════════════════════════════════════
     هوش مصنوعی ربات
     ═══════════════════════════════════════ */
  
  function makeAIMove() {
    if (gameOver) {
      aiThinking = false;
      return;
    }
    
    const allMoves = getAllAIMoves();
    
    if (allMoves.length === 0) {
      aiThinking = false;
      checkGameOver();
      return;
    }
    
    // انتخاب بهترین حرکت
    const bestMove = chooseBestMove(allMoves);
    
    if (bestMove) {
      executeAIMove(bestMove);
    }
    
    aiThinking = false;
  }
  
  /* ─── جمع کردن همه حرکت‌های ربات ─── */
  function getAllAIMoves() {
    const moves = [];
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== AI) continue;
        
        const pieceMoves = getValidMoves(r, c);
        for (const move of pieceMoves) {
          moves.push({
            from: { r, c },
            to: move
          });
        }
      }
    }
    
    return moves;
  }
  
  /* ─── انتخاب بهترین حرکت ─── */
  function chooseBestMove(moves) {
    // اولویت‌بندی:
    // 1. خوردن مهره حریف
    // 2. رسیدن به شاه
    // 3. نزدیک شدن به مهره‌های حریف
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of moves) {
      let score = 0;
      
      // خوردن مهره
      if (move.to.jump) {
        score += 100;
        
        // پاداش بیشتر برای خوردن مهره شاه
        const captured = board[move.to.captured.r][move.to.captured.c];
        if (captured?.king) score += 50;
      }
      
      // رسیدن به شاه
      const piece = board[move.from.r][move.from.c];
      if (!piece.king && move.to.r === BOARD_SIZE - 1) {
        score += 80;
      }
      
      // پیشروی به جلو
      score += (move.to.r - move.from.r) * 5;
      
      // نزدیک شدن به لبه‌ها (امن‌تر)
      if (move.to.c === 0 || move.to.c === BOARD_SIZE - 1) {
        score += 3;
      }
      
      // کمی تصادفی برای تنوع
      score += Math.random() * 5;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  /* ─── اجرای حرکت ربات ─── */
  function executeAIMove(move) {
    const piece = board[move.from.r][move.from.c];
    
    // حذف مهره خورده شده
    if (move.to.jump && move.to.captured) {
      board[move.to.captured.r][move.to.captured.c] = null;
    }
    
    // جابجایی
    board[move.to.r][move.to.c] = piece;
    board[move.from.r][move.from.c] = null;
    
    // ارتقا به شاه
    if (piece.color === 'black' && move.to.r === BOARD_SIZE - 1) {
      piece.king = true;
    }
    
    currentTurn = PLAYER;
    
    drawBoard();
    updateUI();
    
    checkGameOver();
  }
  
  /* ─── شروع ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();