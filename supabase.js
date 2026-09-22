/* ═══════════════════════════════════════
   داماکور - اتصال به Supabase
   ═══════════════════════════════════════ */

// ─── اطلاعات پروژه ───
const SUPABASE_URL = 'https://mzbanumtqymytohthqoq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-5Zhn5oVMd-XsGc2AUo7mg_NRMNSiFf';

// ─── ساخت اتصال ───
// ⚠️ اسم متغیر: supabaseClient (نه supabase)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('✅ Supabase وصل شد');