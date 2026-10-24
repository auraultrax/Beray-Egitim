# Beray Eğitim Platformu

Öğrenci/öğretmen paneli olan, Firebase tabanlı eğitim platformu (5–12. sınıf, MEB müfredatı).

## Klasör yapısı

| Yer | Ne işe yarar | Herkese açık siteye gider mi? |
|---|---|---|
| `index.html`, `student.html`, `teacher.html` | Sayfalar | Evet |
| `app.js`, `aurax-login.js`, `firebase.js`, `fun.js` | Uygulama kodu (`fun.js` yalnızca animasyon/rozet) | Evet |
| `curriculum.js`, `unit-content.js`, `unit-extra.js` | Ünite başlıkları ve konu anlatımları (soru/cevap yok) | Evet |
| `style.css`, `icons/`, `manifest.webmanifest`, `sw.js` | Tema, ikonlar, PWA | Evet |
| `firestore.rules`, `firebase.json`, `.firebaserc` | Firebase ayarları | Gerekmez |
| `functions/` | Sunucu kodu **ve cevap anahtarları** | **HAYIR** |
| `tools/` | Soru bankası üreticisi (cevaplar burada) | **HAYIR** |

> `functions/ready_bank.json`, `functions/curriculum_seed.json` ve `tools/` `.gitignore` ile GitHub dışında tutulur. `.firebaseignore` bu özel sunucu dosyalarının Functions dağıtım paketine dahil olmasını sağlar.
> Cevap anahtarları tarayıcı dosyalarına konmaz; Functions paketinde kalır.

## Kurulum / yayın sırası

1. Firebase → Authentication → **E-posta/Şifre** açık olsun.
2. Proje kökünde `node tools/build-ready-bank.mjs` çalıştır (her ünite için 10 soruluk standart ve pekiştirme testlerinin cevap bankasını üretir; bankayı GitHub'a yükleme).
3. `cd functions && npm install` (Node.js 22 + Firebase CLI gerekir).
4. Proje köküne dön ve `firebase deploy --only functions,firestore:rules` çalıştır.
5. Eski testlerde `correctAnswer` kalmışsa admin hesabıyla `migrateLegacyTests` fonksiyonunu **bir kez** çalıştır (panelde "Eski Testleri Güvenli Hale Getir").
6. Site dosyalarını HTTPS destekli bir hosting'e yükle.

İlk admin: Firebase Console → Firestore → `users/{uid}` kaydında bir kez `role: "admin"` yap. Sonraki rol değişimleri panelden (`setUserRole`) yapılır.

Soru bankasını yeniden üretmek (kendi bilgisayarında): `node tools/build-ready-bank.mjs`

Müfredatı yüklemek: admin hesabıyla **Kullanıcılar → 📚 Müfredatı Firestore'a Yükle**.

## Yeni eklenen özellikler

- Öğretmen/yönetici Zoom toplantısı oluşturabilir; öğrenci kendi sınıfına veya tüm sınıflara yayımlanmış toplantıları görür. Katıl düğmesi başlangıç saatinden önce kilitlidir; saatler Europe/Istanbul olarak gösterilir.
- PDF bağlantıları ders veya ünite üzerinden Google Docs Viewer ön izlemesinde açılır; bağlantı HTTPS olmalıdır.
- Öğrenciler altı hazır avatar arasından seçim yapabilir, kullanıcı adı kayıt anında hem Beray'da hem Aura X'te kontrol edilir.
- Öğrenci arama, takip isteği/kabulü, bildirimler, başarı armaları ve 20–100 puan paylaşımı sunucu fonksiyonlarıyla yürütülür.
- Her müfredat ünitesi için standart ve pekiştirme testi bulunur; sonuçlar kaydedilir ve test listesi “Çözülmemiş/Çözdüklerim” filtrelerinde görünür.

## Güvenlik özeti

- Puan, tamamlanan ders/test ve rol değişimi yalnızca Cloud Functions ile yapılır; istemci yazamaz.
- Test cevap anahtarları tarayıcıya hiç gönderilmez; sonuç sunucuda hesaplanır, aynı test ikinci kez puan vermez.
- Öğretmenler yalnızca kendi içeriğini siler/düzenler; admin hepsini yönetir.
- Video/PDF/Wordwall bağlantıları yalnızca `https` kabul edilir (hem Firestore kurallarında hem istemcide).
- Kullanıcıdan gelen tüm metinler ekrana basılmadan önce kaçışlanır.
- Hassas işlemlerde kullanıcı başına hız sınırı vardır.
- Aura X şifresi Beray'a/Firebase'e kaydedilmez; belirteç sunucuda doğrulanır.

### Firebase Console'da senin yapman gerekenler (koddan yapılamaz)

1. **Project settings → API anahtarı kısıtı:** yalnızca kendi alan adını (HTTP referrer) ekle. (Web API anahtarı gizli değildir ama kısıtlanmalıdır.)
2. **App Check:** reCAPTCHA v3 ile kaydet, sonra Functions ve Firestore için "Enforce" aç.
3. **Authentication → Sign-in method:** yalnızca kullandığın sağlayıcılar açık kalsın.
4. Öğretmen/admin hesaplarının e-postasını doğrula.

## Müfredat kapsamı

MEB Türkiye Yüzyılı Maarif Modeli ünite/tema başlıkları (5–12. sınıf). Doğrulanmamış PDF/video/Wordwall bağlantıları uydurulmamıştır; Wordwall bağlantısını ders/konu formundaki alana kendin eklersin. 12. sınıf Tarih için doğrulanmış güncel program sayfası pakete eklenmemiştir.
