# Hızlı Supabase kurulum kontrol listesi

- [ ] Aura X ve Beray Eğitim aynı Supabase proje URL'sini kullanıyor.
- [ ] Aura X paketindeki `SUPABASE_TUM_KURULUM.sql` bir defa, tamamı ve tek parça halinde SQL Editor'de çalıştırıldı.
- [ ] `username-login`, `username-available` ve `education-actions` Edge Function'ları yayımlandı.
- [ ] `education-actions` klasöründe `ready_bank.json` ve `curriculum_seed.json` var.
- [ ] Authentication e-posta/şifre sağlayıcısı açık; e-posta doğrulaması ayarı biliniyor.
- [ ] Statik site, `supabase/` backend dosyalarını herkese açık köke kopyalamıyor.
- [ ] Öğretmen/admin rolü doğru Auth UUID'sine verildi.

Eğer hata sürerse tarayıcı konsolunda görünen hata metni ve Supabase Edge Functions → Logs kaydı gerekir. ZIP içindeki kod tek başına canlı veritabanına erişip kurulum yapamaz.

**Cevap anahtarı gizliliği:** Hazır test bankaları ZIP içinde yerel Edge Function dağıtımı için bulunur. Bunları açık bir Git deposuna elle yüklemeyin; `.gitignore` bu dosyaların Git'e eklenmesini önler. GitHub Pages dışlama ayarı, açık Git deposundaki ham dosyaları gizlemez.
