# Beray Security Hardening

Bu sürüm mevcut uygulama akışını koruyarak güvenlik katmanlarını sıkılaştırır.

## Uygulama tarafında yapılanlar
- Firestore yazmalarında alan/uzunluk/tür kontrolleri sıkılaştırıldı.
- Öğretmen içeriklerinde `teacherId` ve `teacherName` sunucudaki oturum profiliyle eşleştiriliyor.
- Kullanıcı profil güncellemeleri yalnızca Cloud Function üzerinden yapılabiliyor.
- Öğretmen/admin Cloud Function işlemleri doğrulanmış e-posta gerektiriyor.
- Hassas callable işlemlerinde kullanıcı bazlı hız sınırı eklendi.
- Test cevap anahtarları istemciye kapalı kalıyor.
- Sonuçlar ve puan değişimleri sunucu tarafında kalıyor.
- `_rateLimits` istemciden tamamen kapalı.
- `.gitignore` hassas anahtar/dosya yanlışlıkla GitHub'a gönderilmesini azaltıyor.

## Firebase Console'da ayrıca yapılması gerekenler
1. Öğretmen/admin hesaplarının e-posta doğrulamasını zorunlu tutun.
2. Web API anahtarına HTTP referrer kısıtlaması uygulayın; yalnızca kendi alan adlarınızı ekleyin.
3. Mümkünse Firebase App Check'i etkinleştirin ve web uygulamasını reCAPTCHA Enterprise/v3 ile bağlayın.
4. Firebase Authentication'da yalnızca ihtiyaç duyulan giriş sağlayıcılarını açık bırakın.
5. Firestore ve Functions deploy işleminden sonra üretimde test hesaplarıyla yetki sınırlarını tekrar kontrol edin.

> Not: Firebase web API anahtarı istemci kodunda görünür olabilir; bu tek başına gizli anahtar değildir. Güvenlik Firestore kuralları, Authentication, Functions ve API-kısıtlarıyla sağlanır.

## Yeni güvenlik değişiklikleri
- **Aura X girişi:** Aura X şifresi artık Firebase'e yazılmıyor. İstemci Aura X'ten oturum belirteci alır, `auraxSignIn` Cloud Function'ı belirteci doğrular. `@aurax.beray.local` e-postasıyla elle kayıt Firestore kurallarında engellendi.
- **Hazır testler:** Sorular ve cevaplar tarayıcı dosyalarından çıkarıldı. `getReadyTest` soruları cevapsız verir, `checkReadyTest` sonucu sunucuda hesaplar. Veri `functions/ready_bank.json` içindedir.
- Soru bankasını yeniden üretmek için (kendi bilgisayarında): `node tools/build-ready-bank.mjs`

## ÖNEMLİ: GitHub'a yüklerken
`functions/` ve `tools/` klasörlerini **GitHub'a / herkese açık siteye yükleme**. Cevap anahtarı oradadır. Bu klasörler yalnızca kendi bilgisayarından `firebase deploy --only functions,firestore:rules` ile yayınlanır. Siteye yalnızca ana klasördeki dosyalar (html, js, css, icons, manifest, sw.js) gider.

## Firebase Console'da senin yapman gerekenler (koddan yapılamaz)
1. Project settings → API anahtarı kısıtı: yalnızca kendi alan adını (HTTP referrer) ekle.
2. App Check: web uygulamasını reCAPTCHA v3 ile kaydet, sonra Functions ve Firestore için "Enforce" aç.
3. Authentication → Sign-in method: yalnızca kullandığın sağlayıcılar (E-posta/Şifre) açık kalsın.
4. Öğretmen/admin hesaplarının e-postasını doğrula.
