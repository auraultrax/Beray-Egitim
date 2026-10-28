# Aura X Eğitim — sade kurulum

Bu klasörde yalnızca uygulamanın çalışması ve Firebase'e yayımlanması için gereken dosyalar tutulur. `tools/`, eski Supabase dosyaları ve geliştirici kaynakları çıkarılmıştır.

## Kurulum (Linux)

1. ZIP'i çıkar.
2. Aura X'in kullandığı **aynı Firebase projesinde** Authentication > Sign-in method bölümünden Email/Password'u etkinleştir ve Firestore Database'i oluştur.
3. Terminali bu klasörde açıp `bash kurulum.sh` çalıştır.
4. Firebase Web App ayarlarında görünen Project ID, Web API key, Auth domain, Messaging sender ID ve App ID değerlerini gir. Storage bucket yoksa boş bırakabilirsin.
5. Açılan Firebase giriş adımını tamamla. Komut bittiğinde Hosting adresi gösterilir.

`kurulum.sh`, `firebase-config.js` dosyasını ve `functions/.env` dosyasını kendisi üretir; Cloud Functions paketlerini kurar ve rules/functions/hosting dağıtımını yapar.

## Önemli Aura X notu

Bu proje sadece Aura X ile aynı Firebase projesi ve aynı Authentication kullanıcıları/kullanıcı adı diziniyle çalışır. Eski Supabase kullanıcıları Firebase'e otomatik taşınmaz. Web App config tek başına mevcut Aura X kullanıcılarını farklı bir Firebase projesine bağlamaz.

`firestore.rules` güvenlik kuralları ayrı dosyadır. Cevap anahtarları ve puan/takip işlemleri istemciden değiştirilemez; bunları doğrulayan Cloud Functions da pakettedir.

Kurulum Cloud Functions dağıtımı gerektirir. Projenin Firebase hesabında gerekli servisler/plan etkin değilse Firebase CLI hata mesajı verir; bu durumda deploy tamamlanmış sayılmaz.
