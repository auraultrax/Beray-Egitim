# Hızlı Supabase kurulum kontrol listesi

- [ ] Forever ve Beray Eğitim aynı Supabase proje URL'sini kullanıyor (`zblbsjmtituericpmazj`).
- [ ] Eğitim SQL kurulumu (`education_records` tablosu, profil tetikleyicisi, RLS) projede mevcut.
- [ ] `username-login` ve `username-available` Edge Function'ları yayımlı (Forever tarafında).
- [ ] `education-actions` Edge Function'ı yayımlandı; klasöründe `ready_bank.json` ve `curriculum_seed.json` var.
- [ ] Authentication e-posta/şifre sağlayıcısı açık; e-posta doğrulaması ayarı biliniyor.
- [ ] Statik site, `supabase/` backend dosyalarını herkese açık köke kopyalamıyor.
- [ ] Öğretmen/admin rolü doğru Auth UUID'sine verildi.

Hata sürerse tarayıcı konsolundaki hata metni ve Supabase Edge Functions → Logs kaydı gerekir.

**Cevap anahtarı gizliliği:** Hazır test bankaları Edge Function dağıtımı içindir. Açık (public) bir Git deposunda tutulursa herkes okuyabilir; mümkünse depoyu private yap veya bu dosyaları depodan çıkar.
