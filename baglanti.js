/* Beray Eğitim <-> Aura X giriş köprüsü.
 * Bu dosya yalnızca Beray tarafındadır. Aura X uygulama dosyalarını değiştirmez.
 * Aura X kullanıcı adı/şifresi Aura X'in kendi username-login endpoint'inde doğrulanır.
 * Beray oturumu, Beray'in education-actions Edge Function'ından tek kullanımlık magic-link tokenı alınarak açılır.
 */
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, supabaseClient } from './supabase-compat.js';

const AURAX_URL = 'https://zblbsjmtituericpmazj.supabase.co';
const AURAX_PUBLISHABLE_KEY = 'sb_publishable_0XUjb6u_goYIjSB6m7vYsQ_hpyI0Az7';
const $ = (id) => document.getElementById(id);

function showMessage(message) {
  const box = $('authMessage') || $('loginError');
  if (!box) return;
  box.textContent = String(message || 'Giriş yapılamadı.');
  box.classList.remove('hidden');
}

$('auraxBtn')?.addEventListener('click', () => {
  const form = $('auraxForm');
  if (form) form.classList.toggle('hidden');
});

$('auraxForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const username = String($('auraxUser')?.value || '').trim();
  const password = String($('auraxPass')?.value || '');
  if (!username || !password) {
    showMessage('Aura X kullanıcı adı ve şifresi gerekli.');
    return;
  }
  if (button) {
    button.disabled = true;
    button.dataset.originalText ||= button.textContent;
    button.textContent = 'Aura X hesabı doğrulanıyor…';
  }
  window.__BERAY_AURAX_LOGIN__ = true;
  try {
    // 1) Kimlik bilgileri yalnızca Aura X'in mevcut giriş servisine gönderilir.
    const auraResponse = await fetch(`${AURAX_URL}/functions/v1/username-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: AURAX_PUBLISHABLE_KEY
      },
      body: JSON.stringify({ username, password })
    });
    const auraResult = await auraResponse.json().catch(() => ({}));
    const auraSession = auraResult?.session;
    if (!auraResponse.ok || !auraSession?.access_token) {
      throw new Error(auraResult?.error || 'Aura X kullanıcı adı veya şifresi doğrulanamadı.');
    }

    // 2) Beray sunucusu Aura X tokenını doğrular; tarayıcı hiçbir servis-rol anahtarı taşımaz.
    const bridgeResponse = await fetch(`${SUPABASE_URL}/functions/v1/aurax-login-bridge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({
        action: 'auraxLoginBridge',
        auraAccessToken: auraSession.access_token,
        username
      })
    });
    const bridgeResult = await bridgeResponse.json().catch(() => ({}));
    const bridge = bridgeResult?.data;
    if (!bridgeResponse.ok || !bridge?.email || !bridge?.tokenHash) {
      throw new Error(bridgeResult?.error?.message || bridgeResult?.error || 'Beray tarafındaki bağlantı servisi henüz yayımlanmamış. aurax-login-bridge fonksiyonunu Beray Supabase projesine yayımla.');
    }

    // 3) Tek kullanımlık token Beray projesine ait; böylece eğitim API'si gerçek Beray oturumunu görür.
    const { error: verifyError } = await supabaseClient.auth.verifyOtp({
      email: bridge.email,
      token_hash: bridge.tokenHash,
      type: 'magiclink'
    });
    if (verifyError) throw verifyError;

    $('auraxPass').value = '';
    window.location.href = './student.html';
  } catch (error) {
    console.error('Aura X -> Beray giriş köprüsü:', error);
    window.__BERAY_AURAX_LOGIN__ = false;
    showMessage(error?.message || 'Aura X ile giriş yapılamadı.');
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Aura X hesabımı doğrula →';
    }
  }
});
