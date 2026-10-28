#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "HATA: Node.js ve npm gerekli. Node.js LTS kurup bu dosyayı yeniden çalıştır."
  exit 1
fi

echo
echo "Aura X Eğitim Firebase kurulumu"
echo "ÖNEMLİ: Aura X'in giriş yaptığı Firebase projesinin aynısını kullan."
echo "Firebase Console'da Authentication > Email/Password açık olmalı; Firestore Database oluşturulmuş olmalı."
echo
read -r -p "Firebase Project ID: " PROJECT_ID
read -r -p "Web API key: " API_KEY
read -r -p "Auth domain [${PROJECT_ID}.firebaseapp.com]: " AUTH_DOMAIN
AUTH_DOMAIN="${AUTH_DOMAIN:-${PROJECT_ID}.firebaseapp.com}"
read -r -p "Messaging sender ID: " SENDER_ID
read -r -p "Web app ID (1:...:web:...): " APP_ID
read -r -p "Storage bucket (boş bırakılabilir): " STORAGE_BUCKET

if [[ -z "$PROJECT_ID" || -z "$API_KEY" || -z "$SENDER_ID" || -z "$APP_ID" ]]; then
  echo "HATA: Project ID, API key, Messaging sender ID ve Web app ID boş bırakılamaz."
  exit 1
fi

export PROJECT_ID API_KEY AUTH_DOMAIN SENDER_ID APP_ID STORAGE_BUCKET
node <<'NODE'
const fs = require('node:fs');
const c = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  messagingSenderId: process.env.SENDER_ID,
  appId: process.env.APP_ID
};
if (process.env.STORAGE_BUCKET.trim()) c.storageBucket = process.env.STORAGE_BUCKET.trim();
fs.writeFileSync('firebase-config.js', `export const firebaseConfig = ${JSON.stringify(c, null, 2)};\n`);
NODE
printf 'FIREBASE_WEB_API_KEY=%s\n' "$API_KEY" > functions/.env
chmod 600 functions/.env

if command -v firebase >/dev/null 2>&1; then
  FB=(firebase)
else
  FB=(npx --yes firebase-tools)
fi

if ! "${FB[@]}" projects:list --json >/dev/null 2>&1; then
  echo "Firebase hesabına giriş gerekiyor; açılan tarayıcıdaki giriş adımlarını tamamla."
  "${FB[@]}" login
fi

echo
echo "Functions paketleri kuruluyor..."
npm --prefix functions install

echo
echo "Firestore kuralları, Cloud Functions ve Hosting yayımlanıyor..."
"${FB[@]}" deploy --project "$PROJECT_ID" --only firestore:rules,functions,hosting

echo
echo "Tamamlandı. Hosting adresi deploy çıktısında yazıyor."
echo "Not: Aura X kullanıcılarının giriş yapabilmesi için iki uygulama aynı Firebase Auth ve kullanıcı adı dizinini kullanmalı."
