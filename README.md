# Beray Eğitim — Aura X + Supabase

Öğrenci ve öğretmen panelli eğitim platformu. Kimlik doğrulama, kayıt, öğretmen işlemleri ve test değerlendirmesi için **Firebase kullanılmaz**; Aura X ile aynı Supabase projesi kullanılır.

## Site dosyaları

`index.html`, `student.html`, `teacher.html`, `app.js`, `aurax-login.js`, `supabase-compat.js`, `curriculum.js`, içerik dosyaları, `style.css`, `manifest.webmanifest`, `sw.js` ve `icons/` site tarafıdır. `supabase/` içindeki SQL, Edge Function ve JSON bankaları sunucu/dağıtım dosyalarıdır; **web sitenin herkese açık köküne statik içerik olarak yayımlamayın**. Özellikle `ready_bank.json` cevap anahtarları sunucu tarafında kalmalıdır.

## Kurulum

1. Aura X projesiyle **aynı** Supabase projesini kullanın. `supabase-compat.js` içindeki `SUPABASE_URL` ve `SUPABASE_PUBLISHABLE_KEY` değerlerinin canlı projedeki URL ve publishable key ile aynı olduğunu doğrulayın.
2. Aura X ZIP'inde bulunan `SUPABASE_TUM_KURULUM.sql` dosyasının tamamını Supabase Dashboard → SQL Editor bölümünde çalıştırın. Bu tek dosya Aura X tablolarını ve gerekli fonksiyonları, Education profillerini, yetkileri, güvenli test puanlama işlemlerini kurar. Ayrı SQL dosyalarını rastgele sırayla çalıştırmayın.
3. Bilgisayarınızda Supabase CLI kurulu ve projenize giriş yapılmışken Aura X proje klasöründe çalıştırın:

   ```bash
   supabase login
   supabase link --project-ref PROJE_REF
   supabase functions deploy username-login --no-verify-jwt
   supabase functions deploy username-available --no-verify-jwt
   supabase functions deploy education-actions
   ```

   `PROJE_REF` değerini Supabase proje URL'sinin `https://...supabase.co` bölümündeki proje kimliğinden alın. `education-actions` fonksiyonu `ready_bank.json` ve `curriculum_seed.json` dosyalarını aynı klasörden paketler; bu iki dosyayı silmeyin.
4. Supabase Dashboard → Authentication → Sign In / Providers alanında e-posta/şifre yönteminin etkin olduğuna bakın. E-posta doğrulaması açıksa kullanıcı önce gelen doğrulama bağlantısına tıklamalıdır.
5. Aura X ve Eğitim sayfalarını HTTPS üzerinden yayımlayın. Statik site dağıtımı `supabase/` backend klasörünü ve SQL dosyalarını herkese açık siteye kopyalamamalıdır.

## İlk öğretmen/admin yetkisi

Yeni hesaplar güvenli biçimde `student` rolüyle başlar. Kurulum, Aura X tarafında rolü gerçekten `admin` olan ayrılmış `A_UR_A_XX` hesabını mevcutsa otomatik olarak Eğitim yöneticisine eşler. Bu eşleşme yoksa ilk yönetici yetkisini yalnızca kendi hesabınızın gerçek Supabase Auth UUID'sini doğruladıktan sonra SQL Editor'de verin:

```sql
update public.education_records
set data = jsonb_set(data, '{role}', '"admin"'::jsonb, true)
where collection_name = 'users' and id = 'AUTH_USER_UUID';
```

`AUTH_USER_UUID` yerine Authentication → Users bölümündeki kendi kullanıcı UUID'nizi yazın. Sonraki öğretmen ve öğrenci rollerini öğretmen panelinden yönetin. Rastgele bir kullanıcıya admin rolü vermeyin.

## Notlar

- Aura X hesabıyla Eğitim girişi aynı Supabase Auth oturumunu kullanır; Aura X kullanıcı adı girişi `username-login` Edge Function'ı üzerinden yapılır.
- Öğretmen paneli test oluşturma, test silme, rol değiştirme ve müfredat yükleme işlemlerini `education-actions` sunucu fonksiyonuna gönderir.
- Test cevap anahtarları tarayıcıya gönderilmez. Puan hesabı ve puan yazımı sunucu tarafındadır; aynı testin tekrar gönderilmesi ikinci kez puan kazandırmaz.
- ZIP dosyalarını hazırlamak canlı Supabase projesinde SQL çalıştırmaz veya fonksiyonları yayımlamaz. Yukarıdaki kurulum adımları uygulanmadan çevrimiçi projede değişiklikler etkinleşmez.
