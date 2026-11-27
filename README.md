# Beray Eğitim — Forever + Supabase

Öğrenci ve öğretmen panelli eğitim platformu. Firebase kullanılmaz; **Forever ile aynı Supabase projesi** (AURA ULTRA X, `gfuewsdkytfssumxwyxz`) kullanılır. Forever hesabı olan herkes aynı hesapla Beray Eğitim'e girebilir.

## Site dosyaları

`index.html`, `student.html`, `teacher.html`, `app.js`, `baglanti.js`, `supabase-compat.js`, `curriculum.js`, içerik dosyaları, `style.css`, `manifest.webmanifest`, `sw.js` ve `icons/` site tarafıdır. `supabase/` içindeki Edge Function ve JSON bankaları sunucu dosyalarıdır; **web sitenin herkese açık köküne statik içerik olarak yayımlamayın**. Özellikle `ready_bank.json` cevap anahtarları sunucu tarafında kalmalıdır.

## Giriş ve kayıt nasıl çalışır?

- **E-posta ile giriş / kayıt:** Doğrudan Supabase Auth. Forever'da kullandığın e-posta ve şifreyle de girilebilir.
- **Forever ile Giriş Yap:** Forever kullanıcı adı ve şifresi `username-login` Edge Function'ında doğrulanır, dönen oturum Beray'e yüklenir. Ayrı bir köprü fonksiyonu gerekmez.
- **Kayıt:** Kullanıcı adı `username-available` ile denetlenir. Kullanım şartları kabulü ve KVKK aydınlatma bildirimi onayı ayrı ayrı alınır; Auth tetikleyicisi bu iki onayın sürümünü, metin özetini ve sunucu zamanını `education_consent_logs` tablosuna yazar.
- **Loglar:** Başarılı girişler `education_auth_logs` / `forever_auth_logs`; değişen Education kayıtlarının alan adları `education_audit_events`; Forever açık rıza kayıtları `forever_consent_logs` görünümünde izlenir. Parola veya ham erişim belirteci loglanmaz.

## Kurulum

1. `supabase-compat.js` içindeki `SUPABASE_URL` ve `SUPABASE_PUBLISHABLE_KEY` Forever'ın Supabase projesiyle aynı olmalıdır.
2. Eğitim tabloları, KVKK ve log migrasyonları aktif projeye uygulanmış olmalıdır. `education_records`, `education_consent_logs`, `education_auth_logs` ve `education_audit_events` tablolarının mevcut olduğunu doğrula.
3. `education-actions` Edge Function'ı (test oluşturma/puanlama, kullanıcı arama, takip, rol yönetimi, müfredat) Forever projesinde yayımlıdır. Yeniden yayımlamak için Supabase CLI kurulu ve giriş yapılmış bir bilgisayarda bu deponun klasöründe:

   ```bash
   supabase login
   supabase functions deploy education-actions --project-ref gfuewsdkytfssumxwyxz
   ```

   `ready_bank.json` ve `curriculum_seed.json` fonksiyon paketine dahil edilmez; ilk kullanımda `BANK_BASE_URL` adresinden okunur ve önbelleğe alınır. Varsayılan adres bu deponun GitHub'daki `main` dalıdır. Depoyu private yaparsan Supabase → Edge Functions → Secrets bölümüne erişilebilir bir adresle `BANK_BASE_URL` ekle. `username-login` ve `username-available` fonksiyonları aynı aktif projede yayımlanmalıdır.
4. Supabase Dashboard → Authentication → Sign In / Providers bölümünde e-posta/şifre yönteminin açık olduğuna bak. E-posta doğrulaması açıksa kullanıcı önce gelen bağlantıya tıklamalıdır.
5. Siteyi HTTPS üzerinden yayımla (GitHub Pages). `_config.yml` sunucu dosyalarını Pages'ten dışlar.

## İlk öğretmen/admin yetkisi

Yeni hesaplar `student` rolüyle başlar. İlk yönetici yetkisini yalnızca kendi hesabının gerçek Supabase Auth UUID'sini doğruladıktan sonra SQL Editor'de ver:

```sql
update public.education_records
set data = jsonb_set(data, '{role}', '"admin"'::jsonb, true)
where collection_name = 'users' and id = 'AUTH_USER_UUID';
```

`AUTH_USER_UUID` yerine Authentication → Users bölümündeki kendi kullanıcı UUID'ni yaz. Sonraki öğretmen ve öğrenci rollerini öğretmen panelinden yönet.

## Notlar

- Öğretmen paneli test oluşturma, test silme, rol değiştirme ve müfredat yükleme işlemlerini `education-actions` fonksiyonuna gönderir.
- Test cevap anahtarları tarayıcıya gönderilmez; puan hesabı sunucudadır ve aynı test ikinci kez puan kazandırmaz.
- Bu depodaki kod tek başına canlı Supabase projesinde SQL çalıştırmaz veya fonksiyon yayımlamaz.
