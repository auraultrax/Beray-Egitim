/* 8. sınıf Matematik + Fen: konuya özel anlatım, test ve espiriler. Anahtar: "sınıf|ders|ünite" */
const N = (t, p, e) => ({ t: t.join("\n\n"), p, e });

export const EXTRA_NOTES = {
  "8|Matematik|1. Ünite": N([
    "ÜSLÜ SAYILAR: aⁿ, a'nın n kez kendisiyle çarpımıdır (2³ = 2·2·2 = 8). Tabanlar aynıysa çarparken üsler toplanır (2³·2⁴ = 2⁷), bölerken çıkarılır (2⁵ ÷ 2² = 2³). Sıfırdan farklı her sayının 0. kuvveti 1'dir.",
    "KAREKÖKLÜ SAYILAR: √49 = 7 çünkü 7² = 49. √a·√b = √(a·b). Tam kare olmayanlar sadeleştirilir: √50 = √(25·2) = 5√2. Karekökün içinde negatif sayı olmaz.",
    "BİLİMSEL GÖSTERİM: Çok büyük/küçük sayılar a·10ⁿ biçiminde yazılır (1 ≤ a < 10). 4 500 000 = 4,5·10⁶; 0,00032 = 3,2·10⁻⁴."
  ], ["Üslü ifadelerde çarpma/bölme kuralları", "Karekökü bulma ve sadeleştirme", "Bilimsel gösterim", "Sıfırıncı kuvvet = 1"], "√72 = √(36·2) = 6√2"),
  "8|Matematik|2. Ünite": N([
    "DOĞRUSAL DENKLEM: Denklem bir terazidir; iki tarafa da aynı işlemi yap. 2x + 5 = 17 → 2x = 12 → x = 6.",
    "EŞİTSİZLİK: Aynı kurallar geçerli ama negatif bir sayıyla çarpar veya bölersen yön değişir: −2x > 6 → x < −3.",
    "EĞİM: Dikey değişim ÷ yatay değişim. (1,2) ve (3,8) noktaları için eğim = (8−2)/(3−1) = 3. y = mx + n doğrusunda m eğim, n ise y eksenini kestiği yerdir."
  ], ["Denklem çözme adımları", "Eşitsizlikte yön değişimi", "Eğim hesabı", "y = mx + n"], "3x − 4 = 11 → 3x = 15 → x = 5"),
  "8|Matematik|3. Ünite": N([
    "ÜÇGENLERDE AÇI: İç açılar toplamı 180°'dir. İki açı 50° ve 60° ise üçüncüsü 70°'dir.",
    "ÜÇGEN EŞİTSİZLİĞİ: Üçgen çizilebilmesi için |a − b| < c < a + b olmalı. 3, 4, 8 ile üçgen çizilmez çünkü 3 + 4 < 8.",
    "PİSAGOR: Dik üçgende a² + b² = c² (c hipotenüs, en uzun kenar). 6-8-10 ve 5-12-13 ünlü üçlülerdir."
  ], ["İç açılar toplamı 180°", "Üçgen eşitsizliği", "Pisagor bağıntısı", "Pisagor üçlüleri"], "Dik kenarlar 6 ve 8 → c² = 36 + 64 = 100 → c = 10"),
  "8|Matematik|4. Ünite": N([
    "PRİZMA HACMİ: Taban alanı × yükseklik. 3×4×5 dikdörtgenler prizmasında V = 60 birimküp.",
    "SİLİNDİR: Hacim V = π·r²·h; yanal alan = 2π·r·h; toplam alan = 2π·r·(r + h). π = 3 alınırsa r = 2, h = 5 için V = 3·4·5 = 60.",
    "Birimlere dikkat: alan birimkare (cm²), hacim birimküp (cm³) ile yazılır."
  ], ["Hacim = taban alanı × yükseklik", "Silindirin hacmi ve alanı", "Birim kontrolü"], "r = 3, h = 10, π = 3 → V = 3·9·10 = 270 cm³"),
  "8|Matematik|5. Ünite": N([
    "DÖNÜŞÜMLER (öteleme, yansıma, dönme) şeklin konumunu değiştirir; boyutunu ve biçimini değiştirmez.",
    "ÖTELEME: Her nokta aynı yöne aynı miktar kayar. A(1,2) → 3 sağa, 2 yukarı → A'(4,4).",
    "YANSIMA: x eksenine göre y işareti değişir: (2,3) → (2,−3). y eksenine göre x işareti değişir: (2,3) → (−2,3)."
  ], ["Öteleme", "x ve y eksenine göre yansıma", "Dönme", "Şeklin boyutu korunur"], "(4,−1) noktasının y eksenine göre yansıması (−4,−1)"),
  "8|Matematik|6. Ünite": N([
    "MERKEZİ EĞİLİM: Ortalama = toplam ÷ adet; medyan = sıralanmış verinin ortasındaki değer; mod = en çok tekrar eden değer; açıklık = en büyük − en küçük.",
    "Veri: 2, 4, 4, 6, 9 → ortalama 5, medyan 4, mod 4, açıklık 7.",
    "GRAFİK SEÇİMİ: Parçaların bütündeki payı için daire grafiği, zamanla değişim için çizgi grafiği, kategorileri karşılaştırmak için sütun grafiği."
  ], ["Ortalama, medyan, mod, açıklık", "Grafik türü seçimi", "Veri toplama ve düzenleme"], "Veri 3, 5, 5, 7 → ortalama 5, mod 5"),
  "8|Matematik|7. Ünite": N([
    "OLASILIK = istenen durum sayısı ÷ tüm durum sayısı. Değeri 0 ile 1 arasındadır; imkânsız olay 0, kesin olay 1'dir.",
    "Zar atılınca çift gelme olasılığı 3/6 = 1/2. Torbada 5 kırmızı, 3 mavi bilye varsa mavi çekme olasılığı 3/8'dir.",
    "Deneysel olasılık denemelerden, teorik olasılık eşit şanslı durumlardan hesaplanır; deneme sayısı arttıkça ikisi birbirine yaklaşır."
  ], ["Olasılık formülü", "0 ile 1 arası değer", "Deneysel ve teorik olasılık"], "Madeni para atışında yazı gelme olasılığı 1/2"),
  "8|Fen Bilimleri|1. Ünite": N([
    "MEVSİMLER: Dünya'nın dönme ekseni 23,5° eğiktir ve Dünya Güneş etrafında dolanır. Güneş ışınları bir yarım küreye daha dik gelince orada yaz yaşanır. Mevsimlerin nedeni Dünya'nın Güneş'e yakınlığı değildir.",
    "İKLİM ve HAVA DURUMU: Hava durumu kısa süreli atmosfer olaylarıdır; iklim ise bir bölgenin uzun yıllar boyunca ortalama hava koşullarıdır.",
    "İKLİM DEĞİŞİKLİĞİ: Sera gazları (CO₂, metan) artınca Dünya'dan kaçacak ısı tutulur, küresel ısınma olur. Çözüm: enerji tasarrufu, yenilenebilir enerji, ağaçlandırma."
  ], ["Eksen eğikliği ve mevsimler", "İklim ile hava durumu farkı", "Sera etkisi ve küresel ısınma"], "Kuzey Yarım Küre'de yaz iken Güney Yarım Küre'de kış yaşanır."),
  "8|Fen Bilimleri|3. Ünite": N([
    "DNA: Kalıtım maddesidir; çift sarmal yapıdadır. Genler DNA üzerindeki özellik bilgisi taşıyan bölgelerdir. Kromozomlar DNA'nın sıkıca paketlenmiş halidir; insanda 46 kromozom (23 çift) bulunur.",
    "KALITIM: Baskın gen (büyük harf, A) varsa kendini gösterir; çekinik gen (küçük harf, a) yalnızca aa olduğunda görünür. Aa × Aa çaprazında çocukların ¾'ü baskın özellik taşır.",
    "MUTASYON: DNA'daki kalıcı değişikliktir; zararlı, yararsız ya da yararlı olabilir. ADAPTASYON: Canlının yaşadığı ortama uyum sağlayan kalıtsal özelliğidir (deve hörgücü, kutup ayısı kürkü)."
  ], ["DNA ve kromozom", "Baskın / çekinik gen", "Mutasyon", "Adaptasyon"], "Aa × Aa → AA, Aa, Aa, aa (¾ baskın görünüm)"),
  "8|Fen Bilimleri|4. Ünite": N([
    "SES titreşimle oluşur ve maddesel ortamda yayılır; boşlukta yayılmaz. Katılarda en hızlı, gazlarda en yavaş ilerler.",
    "FREKANS (Hz): Birim zamandaki titreşim sayısıdır; sesin ince/kalın olmasını belirler (yüksek frekans = ince ses). GENLİK: Sesin şiddetini (kuvvetli/zayıf) belirler, birimi desibeldir (dB).",
    "YANKI: Sesin engelden yansıyıp en az 0,1 saniye sonra duyulmasıdır. Sonar ve ultrason bu ilkeyi kullanır."
  ], ["Sesin yayılması", "Frekans = ince/kalın", "Genlik = şiddet", "Yankı"], "Yıldırım önce görülür, gök gürültüsü sonra duyulur çünkü ışık sesten çok daha hızlıdır."),
  "8|Fen Bilimleri|5. Ünite": N([
    "PERİYODİK TABLO: Elementler artan atom numarasına göre dizilir. Yatay satırlara PERİYOT, düşey sütunlara GRUP denir. Aynı gruptaki elementlerin kimyasal özellikleri benzerdir.",
    "Metaller parlak, iletken ve şekillendirilebilir; ametaller genelde mat ve yalıtkandır. Soy gazlar (He, Ne, Ar) son katmanı dolu olduğu için kararlıdır ve tepkimeye girmez.",
    "KİMYASAL TEPKİME: Atomlar yeniden düzenlenir, yeni maddeler oluşur. Tepkimede atom sayısı ve toplam kütle korunur (kütlenin korunumu)."
  ], ["Periyot ve grup", "Metal / ametal / soy gaz", "Kütlenin korunumu"], "2H₂ + O₂ → 2H₂O: her iki tarafta 4 H ve 2 O atomu vardır."),
  "8|Fen Bilimleri|6. Ünite": N([
    "TEMEL KAVRAMLAR: Akım şiddeti (I) amper, potansiyel farkı/gerilim (V) volt, direnç (R) ohm ile ölçülür. OHM YASASI: V = I·R.",
    "SERİ BAĞLAMA: Akım her yerde aynıdır, gerilim paylaşılır; bir lamba sönerse devre kesilir. PARALEL BAĞLAMA: Her koldaki gerilim aynıdır; bir lamba sönse diğerleri yanmaya devam eder (evlerdeki bağlantı).",
    "ÖLÇÜM: Ampermetre devreye seri, voltmetre paralel bağlanır. Güvenlik: Islak elle prize dokunma, ek kablo ve çoklu prizleri aşırı yükleme."
  ], ["Ohm Yasası V = I·R", "Seri ve paralel devre", "Ampermetre / voltmetre", "Elektrik güvenliği"], "V = 12 V, R = 4 Ω → I = 12/4 = 3 A"),
  "8|Fen Bilimleri|7. Ünite": N([
    "MADDE DÖNGÜLERİ: Su, karbon ve azot gibi maddeler canlılar ve cansız çevre arasında sürekli dolaşır; madde yok olmaz, şekil değiştirir.",
    "FOTOSENTEZ: CO₂ + su + ışık → glikoz + O₂ (bitkiler). SOLUNUM: glikoz + O₂ → CO₂ + su + enerji. Karbon döngüsü bu iki olayla ve yanma/ayrışma ile sürer.",
    "SÜRDÜRÜLEBİLİRLİK: Kaynakları gelecek nesilleri düşünerek kullanmaktır. Geri dönüşüm, enerji tasarrufu, su tasarrufu ve yenilenebilir enerji (güneş, rüzgâr) temel adımlardır."
  ], ["Karbon ve su döngüsü", "Fotosentez – solunum", "Geri dönüşüm ve sürdürülebilirlik"], "Kâğıdı geri dönüştürmek ağaç kesimini ve enerji kullanımını azaltır.")
};

export const EXTRA_JOKES = {
  "8|Matematik|1. Ünite": "Üs neden hep kendini beğenir? Çünkü kendini sürekli kendiyle çarpıyor. 🥶",
  "8|Matematik|2. Ünite": "Denklem neden terapiye gitti? Hep bilinmeyenle yaşamaktan yorulmuştu. 😐",
  "8|Matematik|3. Ünite": "Pisagor kafede ne içer? Hipotenüs: en uzun bardak, hep kendi kenarında. 🥶",
  "8|Matematik|4. Ünite": "Silindir neden hep rahat? Hacmi geniş, tabanı sağlam. 😐",
  "8|Matematik|5. Ünite": "Yansıma aynaya küsmüş: 'Hep simetrik çıkıyorsun, özgün ol!' 🥶",
  "8|Matematik|6. Ünite": "Ortalama bir espri yaptım, medyan güldü, mod da tekrar istedi. 😐",
  "8|Matematik|7. Ünite": "Zar atarken 7 gelmedi; olasılık dersinde de olmaz, boşuna bekleme. 🥶",
  "8|Fen Bilimleri|1. Ünite": "Mevsimler neden kavga etti? Biri hep 'ben eğiğim ama haklıyım' diyordu. 🥶",
  "8|Fen Bilimleri|3. Ünite": "DNA neden evde rahat? Hep sarmal, hiç dağılmıyor. 😐",
  "8|Fen Bilimleri|4. Ünite": "Frekans neden çok konuşur? Saniyede binlerce kez titriyor, susamıyor. 🥶",
  "8|Fen Bilimleri|5. Ünite": "Soy gaz parti vermiş ama kimse tepkimeye girmemiş. Çok soylu, çok sessiz. 😐",
  "8|Fen Bilimleri|6. Ünite": "Direnç neden iş yerinde sevilmez? Herkesin akımını kesiyor. 🥶",
  "8|Fen Bilimleri|7. Ünite": "Geri dönüşüm kutusu neden mutlu? Her gün yeni bir hayat veriyor. 😐"
};

