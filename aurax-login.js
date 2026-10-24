import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, supabaseClient } from './supabase-compat.js';

const $ = (id) => document.getElementById(id);
const showMessage = (message) => {
  const box = $('authMessage') || $('loginError');
  if (!box) return;
  box.textContent = message;
  box.classList.remove('hidden');
};

$('auraxBtn')?.addEventListener('click', () => {
  const form = $('auraxForm');
  if (form) form.classList.toggle('hidden');
});

$('auraxForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  if (button) { button.disabled = true; button.dataset.originalText ||= button.textContent; button.textContent = 'Aura X hesabı doğrulanıyor…'; }
  window.__BERAY_AURAX_LOGIN__ = true;
  const username = String($('auraxUser')?.value || '').trim().toLowerCase();
  const password = String($('auraxPass')?.value || '');
  try {
    if (!username || !password) throw new Error('Aura X kullanıcı adı ve şifresi gerekli.');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/username-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json().catch(() => ({}));
    const session = result?.session;
    if (!response.ok || !session?.access_token || !session?.refresh_token) {
      throw new Error(result?.error || 'Aura X kullanıcı adı veya şifresi doğrulanamadı.');
    }
    const { error } = await supabaseClient.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (error) throw error;
    $('auraxPass').value = '';
    location.href = './student.html';
  } catch (error) {
    console.error('Aura X Eğitim girişi:', error);
    window.__BERAY_AURAX_LOGIN__ = false;
    showMessage(error?.message || 'Aura X ile giriş yapılamadı.');
    if (button) { button.disabled = false; button.textContent = button.dataset.originalText || 'Aura X hesabımı doğrula →'; }
  }
});
