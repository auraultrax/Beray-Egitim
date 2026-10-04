# Beray Güvenli Sürüm

Bu sürüm şu kritik güvenlik değişikliklerini içerir:

- Öğrenci artık Firestore'dan `points`, `completedLessons`, `completedTests` değiştiremez.
- Öğretmen kendi hesabını/başkasını admin yapamaz.
- Rol değişimi yalnızca `setUserRole` Cloud Function üzerinden yapılır.
- Testlerde `correctAnswer` artık öğrenciye gönderilen `tests` dokümanında tutulmaz.
- Cevap anahtarı `testAnswers` altında server-only tutulur.
- Test sonucu, puan ve tamamlanan test sunucuda hesaplanır.
- Aynı öğrenci aynı testi ikinci kez gönderirse ekstra puan alamaz.
- Öğretmen yalnızca kendi oluşturduğu ders/konu/duyuruyu silebilir; admin tümünü yönetebilir.
- Dış video/PDF URL'lerinde Firestore tarafında yalnızca HTTPS kabul edilir.

## Kurulum / yayın sırası

1. Firebase projesinde Authentication -> Email/Password açık olmalı.
2. Bu klasörde Node.js 22 ve Firebase CLI kullanılmalı. Firebase'in güncel dokümantasyonunda Cloud Functions için Node.js 20 ve 22 destekleniyor; bu proje Node.js 22 kullanır. [Firebase dokümantasyonu](https://firebase.google.com/docs/functions/get-started)
3. `cd functions && npm install`
4. Önce yalnızca backend fonksiyonlarını dağıt: `firebase deploy --only functions`
5. Yeni uygulama dosyalarını hosting'e gönder.
6. Mevcut eski testlerde `correctAnswer` varsa, admin hesabıyla uygulamadaki backend function'ı bir kez çağırmak için Firebase Functions shell/API kullan veya `migrateLegacyTests` callable'ını çağır. Bu işlem cevap anahtarlarını `testAnswers` koleksiyonuna taşıyıp herkese açık test belgesinden siler.
7. Eski testler temizlendikten sonra Firestore Rules'ı dağıt: `firebase deploy --only firestore:rules`

> ÖNEMLİ: `migrateLegacyTests` çalıştırılmadan önce yeni Rules'ı canlıya almak, eski `tests` belgelerinde bulunan `correctAnswer` alanlarını otomatik olarak gizlemez; Firestore field-level filtering yapmaz. Önce migration, sonra Rules yayınlanması gerekir.

## Admin hesabı

İlk admin kullanıcıyı mevcut Firestore `users/{uid}` kaydında bir kez `role: "admin"` yapman gerekir. Bunu Firebase Console üzerinden kendin yapabilirsin. Bundan sonra rol değişimleri panel üzerinden `setUserRole` fonksiyonuyla yapılır.

## Test güvenliği

Öğrencinin tarayıcısına doğru cevaplar gönderilmediği için puanlama istemci tarafında yapılamaz. `submitTest` cevap anahtarını sunucudan okur, sonucu oluşturur ve puan/ilerlemeyi aynı transaction içinde günceller.


## Yeni basit öğrenci akışı
- Öğrenci giriş yaptıktan sonra sınıfını bir kez seçer (5-12). Seçim Cloud Function üzerinden güvenli biçimde kullanıcı profiline yazılır.
- Dersler ekranındaki sınıf filtresi öğrencinin sınıfını otomatik seçer; `Tüm Sınıflar` ile tüm dersler görülebilir.
- Testler ekranında `Sınıfım / Tüm Sınıflar` filtresi bulunur.
- Öğretmen ders ve test oluştururken sınıf seçebilir; sınıf boş bırakılırsa içerik tüm sınıflara görünür.
- Video ve PDF bağlantıları öğrenci tarafında normal bağlantı olarak doğrudan yeni sekmede açılır; özel PDF görüntüleyici/iframe kullanılmaz.
- Ders silme işlemi `deleteCourse` Cloud Function üzerinden yapılır ve derse bağlı konular da silinir.
