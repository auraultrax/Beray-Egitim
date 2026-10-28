import { auth, functions, signInWithCustomToken, httpsCallable } from './firebase.js';

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
  const username = String($('auraxUser')?.value || '').trim().normalize('NFKC').toLocaleLowerCase('tr-TR');
  const password = String($('auraxPass')?.value || '');
  try {
    if (!username || !password) throw new Error('Aura X kullanıcı adı ve şifresi gerekli.');
    const response = await httpsCallable(functions, 'auraxSignIn')({ username, password });
    const customToken = response?.data?.customToken;
    if (!customToken) throw new Error('Firebase Aura X oturum anahtarı döndürmedi.');
    await signInWithCustomToken(auth, customToken);
    $('auraxPass').value = '';
    location.href = './student.html';
  } catch (error) {
    console.error('Aura X Eğitim girişi:', error);
    window.__BERAY_AURAX_LOGIN__ = false;
    const code = String(error?.code || '');
    const message = code.includes('failed-precondition')
      ? 'Firebase kurulumu eksik. README içindeki API anahtarı ve Cloud Functions adımlarını kontrol et.'
      : (error?.message || 'Aura X ile giriş yapılamadı.');
    showMessage(message);
    if (button) { button.disabled = false; button.textContent = button.dataset.originalText || 'Aura X hesabımı doğrula →'; }
  }
});
