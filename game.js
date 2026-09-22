/* ═══════════════════════════════════════
   داماکور - منطق بازی چکرز
   ═══════════════════════════════════════ */

(function () {
  'use strict';
  
  /* ─── ثابت‌ها ─── */
  const BOARD_SIZE = 8;
  const CELL = 60;
  const PLAYER = 'white';
  const AI = 'black';
  
  /* ─── جوایز داماکوین ─── */
  const REWARDS = {
    easy: 10,
    medium: 25,
    hard: 50,
    perPiece: 1,
    perKing: 5,
    perfectBonus: 25,
  };
  
  /* ─── وضعیت بازی ─── */
  let board = [];
  let selected = null;
  let possibleMoves = [];
  let currentTurn = PLAYER;
  let gameOver = false;
  let gameMode = 'ai';
  let difficulty = 'easy';
  let aiThinking = false;
  let isLoggedIn = false;
  
  /* ─── آمار این بازی ─── */
  let sessionStats = {
    piecesCaptured: 0,
    kingsMade: 0,
    playerPiecesLost: 0,
    coinsEarned: 0,
  };
  
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
  const gameCoin = document.getElementById('gameCoin');
  const coinEarned = document.getElementById('coinEarned');
  
  /* ─── راه‌اندازی ─── */
  async function init() {
    const params = new URLSearchParams(window.location.search);
    gameMode = params.get('mode') === 'pvp' ? 'pvp' : 'ai';
    difficulty = params.get('difficulty') || 'medium';
    
    // چک لاگین
    const user = await Storage.getCurrentUser();
    isLoggedIn = !!user;
    
    // اگه لاگین نکرده و بازی آنلاینه، برو لاگین
    if (!isLoggedIn && gameMode === 'online') {
      window.location.href = 'login.html';
      return;
    }
    
    // تنظیم نام‌ها
    if (gameMode === 'ai') {
      const diffEmoji = difficulty === 'easy' ? '🟢' 
                     : difficulty === 'hard' ? '🔴' : '🟡';
      opponentName.textContent = `ربات ${diffEmoji}`;
      
      if (isLoggedIn) {
        const profile = await Storage.getProfile();
        myName.textContent = profile.username || 'شما';
      } else {
        myName.textContent = 'مهمان';
      }
    } else {
      opponentName.textContent = 'بازیکن ۲';
      myName.textContent = 'بازیکن ۱';
    }
    
    // نمایش داماکوین
    await updateCoinDisplay();
    
    resetGame();
    
    canvas.addEventListener('click', onCanvasClick);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('playAgainBtn').addEventListener('click', () => {
      winnerModal.classList.remove('show');
      resetGame();
    });
  }
  
  /* ─── نمایش داماکوین ─── */
  async function updateCoinDisplay() {
    const persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    
    if (!isLoggedIn) {
      gameCoin.textContent = '۰';
      return;
    }
    
    const profile = await Storage.getProfile();
    const count = profile.damacoin || 0;
    gameCoin.textContent = String(count).split('').map(d => persian[d] || d).join('');
  }
  
  /* ─── نمایش داماکوین کسب‌شده ─── */
  function showCoinEarned(amount) {
    const persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
    const amountFa = String(amount).split('').map(d => persian[d] || d).join('');
    coinEarned.textContent = `+${amountFa} 🪙`;
    coinEarned.classList.add('show');
    setTimeout(() => coinEarned.classList.remove('show'), 1800);
  }
  
  /* ─── ریست بازی ─── */
  function resetGame() {
    board = createInitialBoard();
    selected = null;
    possibleMoves = [];
    currentTurn = PLAYER;
    gameOver = false;
    aiThinking = false;
    sessionStats = {
      piecesCaptured: 0,
      kingsMade: 0,
      playerPiecesLost: 0,
      coinsEarned: 0,
    };
    winnerModal.classList.remove('show');
    
    updateUI();
    drawBoard();
  }
  
  /* ─── ساخت تخته ─── */
  function createInitialBoard() {
    const b = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          b[r][c] = { color: 'black', king: false };
        }
      }
    }
    
    for (let r = 5; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r + c) % 2 === 1) {
          b[r][c] = { color: 'white', king: false };
        }
      }
    }
    
    return b;
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
    
    document.getElementById('myPieces').textContent = fa(whiteCount);
    document.getElementById('opponentPieces').textContent = fa(blackCount);
    
    opponentBar.classList.toggle('active', currentTurn === AI);
    myBar.classList.toggle('active', currentTurn === PLAYER);
    
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
    
    const piece = board[r][c];
    if (piece && piece.color === PLAYER) {
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
    const piece = board[from.r][from.c];
    
    if (to.jump && to.captured) {
      board[to.captured.r][to.captured.c] = null;
      sessionStats.piecesCaptured++;
      
      // جایزه: خوردن مهره
      if (isLoggedIn) {
        await Storage.addDamacoin(REWARDS.perPiece);
        showCoinEarned(REWARDS.perPiece);
        updateCoinDisplay();
      }
    }
    
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;
    
    if (
      (piece.color === 'white' && to.r === 0) ||
      (piece.color === 'black' && to.r === BOARD_SIZE - 1)
    ) {
      piece.king = true;
      if (piece.color === PLAYER) {
        sessionStats.kingsMade++;
        
        if (isLoggedIn) {
          await Storage.addDamacoin(REWARDS.perKing);
          showCoinEarned(REWARDS.perKing);
          updateCoinDisplay();
        }
      }
    }
    
    selected = null;
    possibleMoves = [];
    currentTurn = currentTurn === PLAYER ? AI : PLAYER;
    
    drawBoard();
    updateUI();
    
    if (checkGameOver()) return;
    
    if (gameMode === 'ai' && currentTurn === AI) {
      aiThinking = true;
      updateUI();
      setTimeout(makeAIMove, 600);
    }
  }
  
  /* ─── پایان بازی ─── */
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
    
    let winner = null;
    if (whiteCount === 0 || whiteMoves === 0) winner = 'black';
    else if (blackCount === 0 || blackMoves === 0) winner = 'white';
    
    if (winner) {
      gameOver = true;
      aiThinking = false;
      handleGameEnd(winner === PLAYER);
      return true;
    }
    
    return false;
  }
  
  /* ─── مدیریت پایان ─── */
  async function handleGameEnd(playerWon) {
    if (gameMode === 'ai') {
      if (playerWon) {
        let reward = REWARDS[difficulty] || REWARDS.medium;
        let perfect = false;
        
        if (sessionStats.playerPiecesLost === 0) {
          reward += REWARDS.perfectBonus;
          perfect = true;
        }
        
        // ثبت در Supabase
        if (isLoggedIn) {
          await Storage.addDamacoin(reward);
          await Storage.recordWin(difficulty, {
            piecesCaptured: sessionStats.piecesCaptured,
            kingsMade: sessionStats.kingsMade,
            perfectWin: perfect,
          });
          await updateCoinDisplay();
        }
        
        winnerIcon.textContent = '🎉';
        winnerText.textContent = 'بردی!';
        
        let rewardMsg = isLoggedIn ? `+${reward} 🪙 داماکوین` : '';
        if (perfect) rewardMsg += ' (برد بی‌نقص! ⭐)';
        
        statusBar.textContent = `🎉 بردی! ${rewardMsg}`;
        statusBar.className = 'status-bar';
      } else {
        if (isLoggedIn) {
          await Storage.recordLoss();
        }
        
        winnerIcon.textContent = '😢';
        winnerText.textContent = 'باختی!';
        statusBar.textContent = '😢 باختی! دوباره تلاش کن';
        statusBar.className = 'status-bar';
      }
    } else {
      winnerIcon.textContent = '🎉';
      winnerText.textContent = playerWon ? 'بازیکن ۱ برد!' : 'بازیکن ۲ برد!';
    }
    
    setTimeout(() => {
      winnerModal.classList.add('show');
    }, 500);
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
    
    let chosenMove;
    if (difficulty === 'easy') {
      chosenMove = chooseEasyMove(allMoves);
    } else if (difficulty === 'medium') {
      chosenMove = chooseMediumMove(allMoves);
    } else {
      chosenMove = chooseHardMove(allMoves);
    }
    
    if (chosenMove) executeAIMove(chosenMove);
    aiThinking = false;
  }
  
  function getAllAIMoves() {
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== AI) continue;
        
        const pieceMoves = getValidMoves(r, c);
        for (const move of pieceMoves) {
          moves.push({ from: { r, c }, to: move });
        }
      }
    }
    return moves;
  }
  
  function chooseEasyMove(moves) {
    if (Math.random() < 0.3) return chooseMediumMove(moves);
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  function chooseMediumMove(moves) {
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of moves) {
      let score = 0;
      
      if (move.to.jump) {
        score += 100;
        const captured = board[move.to.captured.r][move.to.captured.c];
        if (captured?.king) score += 50;
      }
      
      const piece = board[move.from.r][move.from.c];
      if (!piece.king && move.to.r === BOARD_SIZE - 1) score += 80;
      
      score += (move.to.r - move.from.r) * 5;
      
      if (move.to.c === 0 || move.to.c === BOARD_SIZE - 1) score += 3;
      
      score += Math.random() * 10;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  function chooseHardMove(moves) {
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of moves) {
      let score = 0;
      
      if (move.to.jump) {
        score += 150;
        const captured = board[move.to.captured.r][move.to.captured.c];
        if (captured?.king) score += 100;
      }
      
      const piece = board[move.from.r][move.from.c];
      if (!piece.king && move.to.r === BOARD_SIZE - 1) score += 120;
      
      const danger = evaluateDangerAfterMove(move);
      score -= danger * 60;
      
      score += (move.to.r - move.from.r) * 8;
      
      if (move.to.c === 0 || move.to.c === BOARD_SIZE - 1) score += 5;
      
      const centerDist = Math.abs(move.to.c - 3.5);
      score -= centerDist * 2;
      
      score += Math.random() * 3;
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  function evaluateDangerAfterMove(move) {
    const piece = board[move.from.r][move.from.c];
    const captured = move.to.jump 
      ? board[move.to.captured.r][move.to.captured.c] 
      : null;
    
    board[move.to.r][move.to.c] = piece;
    board[move.from.r][move.from.c] = null;
    if (move.to.jump && move.to.captured) {
      board[move.to.captured.r][move.to.captured.c] = null;
    }
    
    let danger = 0;
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = board[r][c];
        if (!p || p.color !== PLAYER) continue;
        
        const playerMoves = getValidMoves(r, c);
        for (const pm of playerMoves) {
          if (pm.jump && pm.captured && 
              pm.captured.r === move.to.r && 
              pm.captured.c === move.to.c) {
            danger += p.king ? 3 : 1;
          }
        }
      }
    }
    
    board[move.from.r][move.from.c] = piece;
    board[move.to.r][move.to.c] = null;
    if (captured) {
      board[move.to.captured.r][move.to.captured.c] = captured;
    }
    
    return danger;
  }
  
  function executeAIMove(move) {
    const piece = board[move.from.r][move.from.c];
    
    if (move.to.jump && move.to.captured) {
      board[move.to.captured.r][move.to.captured.c] = null;
      sessionStats.playerPiecesLost++;
    }
    
    board[move.to.r][move.to.c] = piece;
    board[move.from.r][move.from.c] = null;
    
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
