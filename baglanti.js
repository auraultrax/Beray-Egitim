/* Beray Eğitim <-> Forever girişi.
 * Beray ve Forever aynı Supabase projesini (Auth hesap havuzunu) kullanır; bu yüzden ayrı bir köprü gerekmez.
 * Forever kullanıcı adı/şifresi Forever'ın username-login Edge Function'ında doğrulanır ve dönen oturum
 * doğrudan Beray'in Supabase istemcisine yüklenir. Şifre yalnızca Supabase Auth'a gider.
 */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, supabaseClient } from './supabase-compat.js';

const $ = (id) => document.getElementById(id);

function showMessage(message) {
  const box = $('loginError') || $('authMessage');
  if (!box) return;
  box.textContent = String(message || 'Giriş yapılamadı.');
  box.classList.remove('hidden');
}

// "Forever ile Giriş Yap" düğmesi formu açıp kapatır.
$('auraxBtn')?.addEventListener('click', () => {
  const form = $('auraxForm');
  if (form) form.classList.toggle('hidden');
  $('auraxUser')?.focus();
});

$('auraxForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const username = String($('auraxUser')?.value || '').trim();
  const password = String($('auraxPass')?.value || '');
  $('loginError')?.classList.add('hidden');
  $('authMessage')?.classList.add('hidden');
  if (!username || !password) {
    showMessage('Forever kullanıcı adı ve şifresi gerekli.');
    return;
  }
  if (button) {
    button.disabled = true;
    button.dataset.originalText ||= button.textContent;
    button.textContent = 'Forever hesabı doğrulanıyor…';
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/username-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json().catch(() => ({}));
    const session = result?.session;
    if (!response.ok || !session?.access_token || !session?.refresh_token) {
      throw new Error(result?.error || 'Forever kullanıcı adı veya şifresi doğrulanamadı.');
    }

    // Aynı Supabase projesi olduğu için oturum doğrudan Beray istemcisine yüklenir.
    const { error: sessionError } = await supabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
    if (sessionError) throw sessionError;

    $('auraxPass').value = '';
    showMessage('Giriş başarılı, yönlendiriliyorsun…');
    // app.js oturumu algılayıp profile göre öğrenci/öğretmen sayfasına yönlendirir; takılırsa yedek yönlendirme.
    setTimeout(() => { window.location.href = './student.html'; }, 4000);
  } catch (error) {
    console.error('Forever girişi:', error);
    const msg = String(error?.message || error || '');
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      showMessage('Forever sunucusuna ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.');
    } else {
      showMessage(msg || 'Forever ile giriş yapılamadı.');
    }
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Forever hesabımı doğrula →';
    }
  }
});

// Apple ile giriş / kayıt (Supabase OAuth)
document.getElementById('appleBtn')?.addEventListener('click', async () => {
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  } catch (e) {
    console.error('Apple giriş:', e);
    showMessage('Apple ile giriş başlatılamadı: ' + (e.message || 'Supabase Apple sağlayıcısını kontrol et.'));
  }
});
