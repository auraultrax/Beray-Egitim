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
