/* ═══════════════════════════════════════
   داماکور - ویرایش پروفایل
   ═══════════════════════════════════════ */

(function () {
  'use strict';
  
  /* ─── تبدیل فارسی ─── */
  const persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  function fa(num) {
    return String(num).split('').map(d => persian[d] || d).join('');
  }
  
  /* ─── المان‌ها ─── */
  const loadingEdit = document.getElementById('loadingEdit');
  const editForm = document.getElementById('editForm');
  const editName = document.getElementById('editName');
  const editUserId = document.getElementById('editUserId');
  const editBio = document.getElementById('editBio');
  const editMessage = document.getElementById('editMessage');
  const bioCount = document.getElementById('bioCount');
  const saveBtn = document.getElementById('saveBtn');
  
  let currentUserId = null;
  let currentProfile = null;
  
  /* ─── راه‌اندازی ─── */
  async function init() {
    // چک کن کاربر لاگین کرده
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
      // کاربر لاگین نکرده → برو به login
      window.location.href = 'login.html';
      return;
    }
    
    currentUserId = session.user.id;
    
    // بارگذاری پروفایل فعلی
    await loadProfile();
    
    // رویدادها
    editBio.addEventListener('input', updateBioCount);
    editUserId.addEventListener('input', validateUserId);
    saveBtn.addEventListener('click', saveChanges);
  }
  
  /* ─── بارگذاری پروفایل ─── */
  async function loadProfile() {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single();
      
      if (error) throw error;
      
      currentProfile = data;
      
      // پر کردن فرم
      editName.value = data.username || '';
      editUserId.value = data.user_id || '';
      editBio.value = data.bio || '';
      
      updateBioCount();
      
      // نمایش فرم
      loadingEdit.style.display = 'none';
      editForm.style.display = 'block';
      
    } catch (error) {
      console.error('خطا:', error);
      loadingEdit.innerHTML = '<p style="color: #EF4444;">❌ خطا در بارگذاری</p>';
    }
  }
  
  /* ─── شمارنده بیو ─── */
  function updateBioCount() {
    bioCount.textContent = fa(editBio.value.length);
  }
  
  /* ─── اعتبارسنجی آیدی ─── */
  function validateUserId() {
    const value = editUserId.value.trim();
    const hint = editUserId.parentElement.parentElement.querySelector('.input-hint');
    
    if (value.length < 3) {
      hint.textContent = '❌ حداقل ۳ کاراکتر';
      hint.className = 'input-hint has-error';
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      hint.textContent = '❌ فقط حروف انگلیسی، عدد و _';
      hint.className = 'input-hint has-error';
      return false;
    }
    
    hint.textContent = '✅ آیدی معتبر';
    hint.className = 'input-hint has-success';
    return true;
  }
  
  /* ─── نمایش پیام ─── */
  function showMessage(text, type = 'info') {
    editMessage.textContent = text;
    editMessage.className = 'edit-message ' + type;
  }
  
  /* ─── ذخیره تغییرات ─── */
  async function saveChanges() {
    const newName = editName.value.trim();
    const newUserId = editUserId.value.trim().toLowerCase();
    const newBio = editBio.value.trim();
    
    // اعتبارسنجی
    if (!newName) {
      showMessage('❌ اسم نمی‌تونه خالی باشه', 'error');
      return;
    }
    
    if (newName.length > 20) {
      showMessage('❌ اسم حداکثر ۲۰ کاراکتر', 'error');
      return;
    }
    
    if (!validateUserId()) {
      showMessage('❌ آیدی معتبر نیست', 'error');
      return;
    }
    
    if (newBio.length > 150) {
      showMessage('❌ بیو حداکثر ۱۵۰ کاراکتر', 'error');
      return;
    }
    
    showMessage('⏳ در حال ذخیره...', 'info');
    saveBtn.disabled = true;
    
    try {
      // اگه آیدی عوض شده، چک کن تکراری نباشه
      if (newUserId !== currentProfile.user_id) {
        const { data: existing, error: checkError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('user_id', newUserId)
          .neq('id', currentUserId)
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }
        
        if (existing) {
          showMessage('❌ این آیدی قبلاً گرفته شده', 'error');
          saveBtn.disabled = false;
          return;
        }
      }
      
      // آپدیت
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          username: newName,
          user_id: newUserId,
          bio: newBio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUserId);
      
      if (updateError) throw updateError;
      
      showMessage('✅ تغییرات ذخیره شد!', 'success');
      
      // برو به پروفایل بعد از ۱.۵ ثانیه
      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 1500);
      
    } catch (error) {
      console.error('خطا:', error);
      showMessage('❌ خطا در ذخیره: ' + error.message, 'error');
      saveBtn.disabled = false;
    }
  }
  
  /* ─── شروع ─── */
  init();
  
})();
