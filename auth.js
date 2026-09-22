/* ═══════════════════════════════════════
   داماکور - احراز هویت (ورود/ثبت‌نام)
   ═══════════════════════════════════════ */

(function () {
  'use strict';
  
  /* ─── المان‌های DOM ─── */
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginMessage = document.getElementById('loginMessage');
  const signupMessage = document.getElementById('signupMessage');
  
  /* ─── تبدیل به فارسی ─── */
  const persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  function fa(num) {
    return String(num).split('').map(d => persian[d] || d).join('');
  }
  
  /* ─── تب‌ها ─── */
  loginTab.addEventListener('click', () => switchTab('login'));
  signupTab.addEventListener('click', () => switchTab('signup'));
  
  function switchTab(tab) {
    if (tab === 'login') {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.classList.add('active');
      signupForm.classList.remove('active');
    } else {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.classList.add('active');
      loginForm.classList.remove('active');
    }
    clearMessages();
  }
  
  function clearMessages() {
    loginMessage.textContent = '';
    signupMessage.textContent = '';
    loginMessage.className = 'auth-message';
    signupMessage.className = 'auth-message';
  }
  
  /* ─── نمایش پیام ─── */
  function showMessage(element, text, type = 'info') {
    element.textContent = text;
    element.className = 'auth-message ' + type;
  }
  
  /* ─── ترجمه خطاها ─── */
  function translateError(error) {
    const msg = error.message || '';
    
    if (msg.includes('Invalid login credentials')) {
      return '❌ ایمیل یا رمز عبور اشتباهه';
    }
    if (msg.includes('Email not confirmed')) {
      return '📧 اول ایمیلت رو تأیید کن (به ایمیلت برو)';
    }
    if (msg.includes('User already registered')) {
      return '❌ این ایمیل قبلاً ثبت شده';
    }
    if (msg.includes('Password should be at least')) {
      return '❌ رمز عبور باید حداقل ۶ کاراکتر باشه';
    }
    if (msg.includes('Unable to validate email')) {
      return '❌ ایمیل معتبر نیست';
    }
    if (msg.includes('Email rate limit exceeded')) {
      return '⏳ یه کم صبر کن، بعداً تلاش کن';
    }
    if (msg.includes('Signups not allowed')) {
      return '❌ ثبت‌نام غیرفعاله';
    }
    
    return '❌ خطا: ' + msg;
  }
  
  /* ═══════════════════════════════════════
     ثبت‌نام
     ═══════════════════════════════════════ */
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    if (!email || !password) {
      showMessage(signupMessage, '❌ همه فیلدها پر کن', 'error');
      return;
    }
    
    if (password.length < 6) {
      showMessage(signupMessage, '❌ رمز عبور باید حداقل ۶ کاراکتر باشه', 'error');
      return;
    }
    
    showMessage(signupMessage, '⏳ در حال ثبت‌نام...', 'info');
    
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
      });
      
      if (error) throw error;
      
      // چک کن اگه تایید ایمیل فعاله
      if (data.user && !data.session) {
        showMessage(
          signupMessage,
          '✅ ثبت‌نام شد! به ایمیلت برو و روی لینک تأیید کلیک کن 📧',
          'success'
        );
      } else if (data.session) {
        showMessage(signupMessage, '✅ خوش اومدی! در حال انتقال...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      }
      
    } catch (error) {
      console.error('خطای ثبت‌نام:', error);
      showMessage(signupMessage, translateError(error), 'error');
    }
  });
  
  /* ═══════════════════════════════════════
     ورود
     ═══════════════════════════════════════ */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      showMessage(loginMessage, '❌ همه فیلدها پر کن', 'error');
      return;
    }
    
    showMessage(loginMessage, '⏳ در حال ورود...', 'info');
    
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (error) throw error;
      
      showMessage(loginMessage, '✅ خوش اومدی! در حال انتقال...', 'success');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
      
    } catch (error) {
      console.error('خطای ورود:', error);
      showMessage(loginMessage, translateError(error), 'error');
    }
  });
  
  /* ─── اگه کاربر قبلاً وارد شده */
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      console.log('کاربر وارد شده:', session.user.email);
    }
  });
  
})();