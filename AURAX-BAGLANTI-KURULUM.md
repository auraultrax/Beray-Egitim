# Aura X -> Beray Eğitim giriş bağlantısı

**Aura X uygulama dosyalarında hiçbir değişiklik yok.** Giriş köprüsü sadece Beray tarafına eklendi.

## 1) Beray'i GitHub'a yükle

Bu paketteki dosyaları Beray Eğitim GitHub deposuna yükle. `baglanti.js` depo kökünde olmalı; `index.html` onu zaten çağırıyor. Sonra GitHub Pages ile Beray'i yayımla.

## 2) Beray Supabase'inde giriş köprüsünü yayımla

GitHub Pages yalnızca tarayıcı dosyalarını yayımlar. Güvenli oturum oluşturmak için Beray'in kendi Supabase projesine bu küçük Edge Function'ı da bir kez yayımlamak gerekir. Aura X projesine dokunma. Supabase CLI kurulu bir bilgisayarda Beray klasöründe: 

```bash
supabase login
supabase functions deploy aurax-login-bridge --project-ref rzdvezdccgkfzfpizwmj --no-verify-jwt
```

`supabase login` yalnızca ilk kurulumda gerekir. Bu işlem sadece `aurax-login-bridge` isimli yeni fonksiyonu yayımlar; mevcut `education-actions` fonksiyonunu değiştirmez. Supabase'in Edge Function ortamında `SUPABASE_SERVICE_ROLE_KEY` bulunmalıdır; bu anahtarı HTML/JS/GitHub içine asla koyma.

## 3) Giriş nasıl çalışır?

1. `baglanti.js` kullanıcı adı/şifreyi Aura X'in mevcut `username-login` endpoint'ine yollar.
2. Yeni Beray fonksiyonu Aura X oturumunu ve o oturuma ait kullanıcı adını doğrular.
3. Beray tarafında ayrı bir oturum açar; eğitim puanları ve verileri Beray'in mevcut Supabase projesinde kalır.

**Önemli:** Bu dosyalarda Beray Supabase proje referansı `rzdvezdccgkfzfpizwmj` olarak mevcut eğitim yapılandırmasından alınmıştır. Canlı Beray projen farklıysa komuttaki proje referansını kendi Beray proje referansınla değiştir. Aura X projesi `zblbsjmtituericpmazj` olarak kaynak kodundan okunmuştur.
