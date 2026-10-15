/*
 * BERAY - Hazır Müfredat Kataloğu
 *
 * Bu katalog, 2026-2027 döneminde Türkiye Yüzyılı Maarif Modeli'nin
 * MEB tarafından yayımlanan sınıf/ders program sayfalarındaki Ünite/Tema
 * başlıkları esas alınarak hazırlanmıştır.
 *
 * ÖNEMLİ:
 * - Buradaki "Kolay Anlatım" metinleri Beray için sıfırdan yazılmış kısa
 *   özetlerdir; ders kitabından kopya değildir.
 * - Doğrudan PDF/video dosya URL'si tahmin edilmez. Öğrenci resmî MEB
 *   "Ders Kitapları" ve "Eğitim Videoları" kataloglarına yönlendirilir.
 */

import { UNIT_JOKES as BASE_JOKES } from "./unit-content.js";
import { EXTRA_NOTES, EXTRA_JOKES } from "./unit-extra.js";
const UNIT_JOKES = { ...BASE_JOKES, ...EXTRA_JOKES };
const UNIT_QUESTIONS = {}; // Sorular ve cevaplar artık yalnızca sunucuda (functions/ready_bank.json).

export const OFFICIAL = {
  books: "https://tymm.meb.gov.tr/ders-kitaplari",
  videos: "https://tymm.meb.gov.tr/egitim-videolari"
};

const clean = (s) => s.replace(/\s+/g, " ").trim();

function buildStudyPack(subject, title) {
  const t = clean(title);
  const subjectKey = subject.toLocaleLowerCase("tr-TR");

  // Beray çalışma notları: kısa ama sınava hazırlanırken yazılıp tekrar edilebilecek yapı.
  const special = {
    "mustafa kemal’in hayatı": {
      explanation: "Mustafa Kemal Atatürk, çocukluğundan itibaren öğrenmeye ve ülkesinin sorunlarını anlamaya önem verdi. Askerî eğitim aldı; farklı görevlerde bulundu ve özellikle Trablusgarp ile Balkan Savaşları dönemlerinde tecrübe kazandı. I. Dünya Savaşı'nda Çanakkale Cephesi'ndeki başarısı onun askerî liderliğini öne çıkardı. Mondros Ateşkes Antlaşması sonrasında ülkenin işgal edilmesi üzerine Millî Mücadele'nin örgütlenmesinde öncü oldu. Samsun'a çıkışı, Amasya Genelgesi, Erzurum ve Sivas kongreleri, ardından TBMM'nin açılması Millî Mücadele'nin önemli aşamalarıdır. Daha sonra Cumhuriyet'in kurulması ve inkılapların gerçekleştirilmesinde liderlik yaptı.",
      keyPoints: ["Askerî eğitim ve görevleri", "Çanakkale'deki liderliği", "Samsun'a çıkış ve Millî Mücadele", "Amasya, Erzurum ve Sivas", "TBMM ve Cumhuriyet", "İnkılapların amacı ve önemi"],
      example: "Sınav için olayları kronolojik düşün: eğitim → askerî görevler → Çanakkale → Millî Mücadele → TBMM → Cumhuriyet ve inkılaplar.",
      quiz: [["Mustafa Kemal'in Millî Mücadele dönemindeki temel amacı nedir?", "Bağımsızlığı sağlamak ve millî egemenliğe dayalı yeni bir düzen kurmak."],["Çanakkale'nin önemi nedir?", "Mustafa Kemal'in askerî liderliğini öne çıkaran önemli bir başarı alanıdır."],["Millî Mücadele'de TBMM'nin önemi nedir?", "Millî iradenin temsil edildiği yönetim merkezi olmasıdır."]]
    },
    "birinci dünya savaşı": {
      explanation: "I. Dünya Savaşı, devletler arasındaki siyasi ve ekonomik rekabetlerin, bloklaşmaların ve milliyetçilik akımlarının etkisiyle başladı. Osmanlı Devleti savaşın başında tarafsız kalmaya çalışsa da Almanya'nın yanında savaşa girdi. Osmanlı; Kafkas, Kanal, Çanakkale, Irak, Suriye-Filistin gibi cephelerde mücadele etti. Savaşın sonunda İttifak Devletleri yenildi. Osmanlı Devleti Mondros Ateşkes Antlaşması'nı imzaladı ve bu antlaşma işgallere ortam hazırladı. Millî Mücadele'nin ortaya çıkışını anlamak için savaşın sonuçlarını ve Mondros'un etkisini birlikte düşünmek gerekir.",
      keyPoints: ["Bloklaşma ve rekabet", "Osmanlı Devleti'nin savaşa girişi", "Başlıca cepheler", "İtilaf ve İttifak devletleri", "Savaşın sonuçları", "Mondros'un etkisi"],
      example: "Neden-sonuç zinciri kur: savaşın sebepleri → Osmanlı'nın savaşa girişi → cepheler → yenilgi → Mondros → işgaller → Millî Mücadele.",
      quiz: [["Osmanlı Devleti I. Dünya Savaşı'nda hangi devletin yanında yer aldı?", "İttifak Devletleri, özellikle Almanya'nın yanında yer aldı."],["Mondros neden önemlidir?", "Osmanlı Devleti'nin fiilen savunmasız kalmasına ve işgallere zemin hazırlanmasına yol açtı."],["I. Dünya Savaşı'nın Millî Mücadele'yle ilişkisi nedir?", "Savaşın yenilgi ve işgallere yol açması Millî Mücadele'nin şartlarını oluşturdu."]]
    },
    "millî mücadele": {
      explanation: "Millî Mücadele, işgaller karşısında Türk milletinin bağımsızlığını korumak için yürüttüğü mücadeledir. Samsun'a çıkışla başlayan örgütlenme sürecinde Amasya Genelgesi ile mücadelenin amacı ve yöntemi ortaya kondu. Erzurum ve Sivas kongrelerinde millî birlik ve bağımsızlık düşüncesi güçlendirildi. Temsil Heyeti'nin çalışmaları ve Ankara'nın merkez hâline gelmesiyle mücadele daha düzenli bir yapıya kavuştu. TBMM'nin açılmasıyla millî irade yönetimde belirleyici oldu. Düzenli orduyla yürütülen askerî mücadeleler ve diplomatik gelişmeler sonucunda bağımsızlık mücadelesi başarıya ulaştı.",
      keyPoints: ["İşgallere karşı tepki", "Samsun ve örgütlenme", "Amasya Genelgesi", "Erzurum ve Sivas kongreleri", "TBMM'nin açılması", "Bağımsızlığa ulaşılması"],
      example: "Kronolojiyi tekrar et: Samsun → Amasya → Erzurum → Sivas → Ankara/TBMM → düzenli mücadele → zafer.",
      quiz: [["Millî Mücadele'nin temel amacı nedir?", "Vatanın ve bağımsızlığın korunmasıdır."],["TBMM'nin açılması neyi gösterir?", "Millî iradenin yönetimde söz sahibi olduğunu gösterir."],["Amasya Genelgesi neden önemlidir?", "Mücadelenin amacı ve milletin iradesine dayanan çözüm anlayışı açıkça ortaya konmuştur."]]
    },
    "türkiye cumhuriyeti’nin kuruluşu ve inkılaplar": {
      explanation: "Cumhuriyet'in kuruluş süreci, Millî Mücadele'nin kazanılması ve millî egemenlik anlayışının devlet yönetimine yerleşmesiyle şekillendi. Cumhuriyet yönetimiyle egemenliğin millete ait olduğu anlayışı güçlendi. Atatürk dönemindeki inkılaplar; eğitim, hukuk, toplum, ekonomi ve yönetim alanlarında çağdaşlaşmayı hedefledi. Bu değişiklikleri tek tek ezberlemek yerine amaçlarını düşünmek önemlidir: millî egemenliği güçlendirmek, vatandaşlık bilincini geliştirmek ve çağdaş bir devlet düzeni kurmak. İnkılaplar birbirinden bağımsız değil, aynı genel dönüşümün parçalarıdır.",
      keyPoints: ["Cumhuriyet ve millî egemenlik", "Yönetimde değişim", "Eğitim ve hukuk alanındaki dönüşüm", "Toplumsal düzen", "Çağdaşlaşma amacı", "İnkılapların ortak yönü"],
      example: "Bir inkılabı gördüğünde önce şu soruyu sor: Hangi sorunu çözmek veya hangi alanı geliştirmek için yapılmıştır?",
      quiz: [["Cumhuriyet yönetiminin temel anlayışlarından biri nedir?", "Egemenliğin millete ait olmasıdır."],["İnkılapların ortak amaçlarından biri nedir?", "Çağdaş ve düzenli bir devlet-toplum yapısı oluşturmaktır."],["İnkılapları çalışırken neye dikkat edilmelidir?", "Her değişikliğin amacı ve etkisi birlikte düşünülmelidir."]]
    }
  };

  const exact = special[t.toLocaleLowerCase("tr-TR")];
  if (exact) return exact;

  const focusBySubject = {
    "matematik": [
      `Bu ünitede ${t} başlığının temel kavramlarını öğren. Soruda verilen bilgileri ayır, hangi işlemin veya yöntemin gerektiğini belirle ve işlemini düzenli yap.`,
      "Bir soruyu çözerken: verilen → istenen → yöntem → işlem → kontrol sırasını kullan.",
      "Tanımları ve işlem kurallarını karıştırmamak için her kuralın yanına bir örnek yaz."
    ],
    "fen bilimleri": [
      `Bu ünitede ${t} konusunu olayların neden-sonuç ilişkisiyle öğren. Bir olayda ne olduğunu, neden olduğunu ve bunu hangi gözlem/deneyle açıklayabileceğimizi düşün.`,
      "Kavramları ezberlemek yerine sebep-sonuç bağlantısını kur.",
      "Günlük hayattan bir örnek bulup konuyla eşleştir."
    ],
    "tarih": [
      `Bu ünitede ${t} konusunu kronolojik ve neden-sonuç ilişkisiyle çalış. Olayı, olayın nedenini, gelişmesini ve sonucunu ayrı ayrı düşün.`,
      "Tarihte tarih/kişi/olay sorularında olayın bağlamını ve sonucunu da hatırla.",
      "Önemli gelişmeleri bir zaman çizelgesine yerleştir."
    ],
    "t.c. inkılap tarihi ve atatürkçülük": [
      `Bu ünitede ${t} konusunu olay sırası ve neden-sonuç ilişkisiyle çalış. Önce olayın nedenini, sonra gelişmesini, ardından sonucunu öğren.`,
      "Kişi, kurum, antlaşma ve olayları birbirine karıştırmamak için kısa bir kronoloji çıkar.",
      "Bir gelişmenin Millî Mücadele veya Cumhuriyet açısından neden önemli olduğunu tek cümleyle yaz."
    ],
    "coğrafya": [
      `Bu ünitede ${t} konusunu yer, dağılış, neden ve sonuç ilişkisiyle öğren. Harita veya günlük yaşam örneğiyle konuyu bağlamak kalıcılığı artırır.`,
      "Bir coğrafya bilgisinde 'nerede, neden orada, sonucu ne?' sorularını sor.",
      "Harita, tablo veya grafik varsa önce başlık ve birimleri kontrol et."
    ],
    "biyoloji": [
      `Bu ünitede ${t} konusunu yapı-görev ilişkisiyle öğren. Önce temel kavramları, sonra yapıların görevlerini ve aralarındaki ilişkiyi çalış.`,
      "Bir yapıyı öğrenirken 'nerede bulunur ve ne işe yarar?' sorularını sor.",
      "Benzer kavramları küçük bir karşılaştırma tablosunda ayır."
    ],
    "fizik": [
      `Bu ünitede ${t} konusunu önce kavram, sonra ilişki ve işlem sırasıyla öğren. Verilen büyüklükleri ve birimleri doğru belirlemek önemlidir.`,
      "Formülü ezberlemekten önce sembollerin ve birimlerin ne olduğunu öğren.",
      "Sonucun birimini ve yaklaşık büyüklüğünü kontrol et."
    ],
    "kimya": [
      `Bu ünitede ${t} konusunu tanım → özellik → değişim/ilişki sırasıyla çalış. Kavramları günlük hayattan örneklerle eşleştirmek hatırlamayı kolaylaştırır.`,
      "Maddelerin özelliklerini ve birbirleriyle ilişkilerini karşılaştır.",
      "İşlem veya denklem varsa verilenleri ve bilinmeyeni ayrı yaz."
    ],
    "türkçe": [
      `Bu ünitede ${t} konusunu anlam ve kullanım üzerinden öğren. Metinde ana düşünceyi, önemli ayrıntıları ve anlatım özelliklerini ayır.`,
      "Bir metni okurken konu, ana düşünce ve yardımcı düşünceleri karıştırma.",
      "Dil bilgisi veya yazım konusunda kuralı bir örnekle birlikte tekrar et."
    ],
    "türk dili ve edebiyatı": [
      `Bu ünitede ${t} konusunu tür, yapı, dil ve anlam açısından çalış. Bir metnin ne anlattığı kadar nasıl anlattığı da önemlidir.`,
      "Türün özelliklerini ve metindeki örneklerini birlikte öğren.",
      "Yorum sorularında düşünceni metinden kanıtla destekle."
    ],
    "ingilizce": [
      `Bu ünitede ${t} konusunu kelime + kalıp + cümle şeklinde öğren. Kelimeleri tek başına değil, kısa cümle içinde tekrar et.`,
      "Önemli kelimeleri anlamı ve kullanım örneğiyle birlikte öğren.",
      "Soru-cevap kalıplarını yüksek sesle birkaç kez tekrar et."
    ],
    "din kültürü ve ahlak bilgisi": [
      `Bu ünitede ${t} konusunun temel kavramlarını, anlamlarını ve aralarındaki ilişkileri öğren. Dinî ve ahlaki kavramları doğru anlamlandırmak önemlidir.`,
      "Temel kavramların anlamını kısa ve doğru cümlelerle not et.",
      "Konuyu günlük hayattaki davranışlarla ilişkilendir."
    ],
    "felsefe": [
      `Bu ünitede ${t} konusunu kavram, soru ve görüşler arasındaki ilişkiyle çalış. Bir felsefi görüşün ne söylediğini ve hangi gerekçeye dayandığını ayır.`,
      "Tanım ile yorumu birbirine karıştırma.",
      "Farklı görüşleri karşılaştırırken benzerlik ve farklarını kısa notlarla yaz."
    ]
  };

  const fallback = [
    `Bu ünitede ${t} konusunu temel kavramlardan başlayarak öğren. Önce konunun ne olduğunu, sonra önemli ayrıntıları ve aralarındaki ilişkileri kavra.`,
    "Önemli kavramları kısa tanımlarla yaz ve birbirinden ayır.",
    "Konunun günlük hayatla veya önceki konularla bağlantısını kur."
  ];
  const selected = focusBySubject[subjectKey] || fallback;
  const topicLines = selected.map(x => `• ${x}`).join("\\n");

  return {
    explanation: `${selected[0]}\\n\\nSınava hazırlanırken şu sırayı kullan:\\n${topicLines}\\n\\nSon tekrarında kitabı baştan sona okumak yerine bu başlıkları kendi cümlelerinle anlatmaya çalış.`,
    keyPoints: [selected[1], selected[2], "Tanım, neden-sonuç ve önemli ayrıntıları ayrı ayrı tekrar et.", "Bilmediğin kısmı işaretleyip tekrar gözden geçir.", "Sonunda kendine 3 soru sorup cevapla."],
    example: selected[2],
    quiz: [
      ["Bu ünitede ilk olarak neyi anlamalısın?", `Temel kavramları ve ${t.toLocaleLowerCase("tr-TR")} konusunun ana fikrini.`],
      ["Sınavda bir konuyu hatırlamak için hangi yöntem işe yarar?", "Kavramı tanım, neden-sonuç ve kısa örnekle birlikte tekrar etmek."],
      ["Son tekrar nasıl yapılabilir?", "Anahtar bilgileri kendi cümlelerinle anlatıp kendine kısa sorular sormak."]
    ]
  };
}

function makeUnit(grade, subject, unitNo, title, source, focus = []) {
  const label = `${unitNo}. ${title}`;
  const note = EXTRA_NOTES[`${grade}|${subject}|${unitNo}. Ünite`];
  return {
    id: `${grade}-${subject}-${unitNo}-${title}`.toLowerCase().replace(/[^a-z0-9çğıöşü-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
    grade: String(grade),
    subject,
    unit: `${unitNo}. Ünite`,
    title: clean(title),
    summary: `${clean(title)} konusunun temel kavramlarını öğrenir, ana fikirleri ayırır ve kısa örneklerle pekiştirirsin.`,
    explanation: note ? note.t : buildStudyPack(subject, title).explanation,
    topics: note ? note.p : (focus.length ? focus : buildStudyPack(subject, title).keyPoints),
    keyPoints: note ? note.p : buildStudyPack(subject, title).keyPoints,
    example: note ? note.e : buildStudyPack(subject, title).example,
    examples: buildExamples(subject, title, focus.length ? focus : buildStudyPack(subject, title).keyPoints),
    funTip: buildFunTip(subject),
    quiz: buildStudyPack(subject, title).quiz,
    source,
    videoUrl: OFFICIAL.videos,
    fileUrl: OFFICIAL.books,
    wordwallUrl: "",
    sourceLabel: "MEB Programı",
    videoLabel: "MEB Videoları",
    fileLabel: "MEB Ders Kitapları"
  };
}

const src = {
  tr5: "https://tymm.meb.gov.tr/ogretim-programlari/ortaokul-turkce-dersi/6",
  tr6: "https://tymm.meb.gov.tr/ogretim-programlari/ortaokul-turkce-dersi/7",
  tr7: "https://tymm.meb.gov.tr/ogretim-programlari/ortaokul-turkce-dersi/8",
  tr8: "https://tymm.meb.gov.tr/ogretim-programlari/ortaokul-turkce-dersi/9",
  mat5: "https://tymm.meb.gov.tr/ogretim-programlari/ortaokul-matematik-dersi/6",
  mat6: "https://tymm.meb.gov.tr/ogretim-programlari/ortaokul-matematik-dersi/7",
  mat7: "https://tymm.meb.gov.tr/ogretim-programlari/ortaokul-matematik-dersi/8",
  mat8: "https://tymm.meb.gov.tr/ogretim-programlari/ortaokul-matematik-dersi/9",
  fen5: "https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/6",
  fen6: "https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/7",
  fen7: "https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/8",
  fen8: "https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/9",
  sos5: "https://tymm.meb.gov.tr/ogretim-programlari/sosyal-bilgiler-dersi/6",
  sos6: "https://tymm.meb.gov.tr/ogretim-programlari/sosyal-bilgiler-dersi/7",
  sos7: "https://tymm.meb.gov.tr/ogretim-programlari/sosyal-bilgiler-dersi/8",
  eng5: "https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-temel-egitim/6",
  eng6: "https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-temel-egitim/7",
  eng7: "https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-temel-egitim/8",
  eng8: "https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-temel-egitim/9",
  dkab5: "https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi/6",
  dkab6: "https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi/7",
  dkab7: "https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi/8",
  dkab8: "https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi/9",
  ink8: "https://tymm.meb.gov.tr/ogretim-programlari/tc-inkilap-tarihi-ve-ataturkculuk-dersi/9",
  tde9: "https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/11",
  tde10: "https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/12",
  tde11: "https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/13",
  tde12: "https://tymm.meb.gov.tr/ogretim-programlari/turk-dili-ve-edebiyati-dersi/14",
  mat9: "https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/11",
  mat10: "https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/12",
  mat11: "https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/13",
  mat12: "https://tymm.meb.gov.tr/ogretim-programlari/matematik-dersi/14",
  fiz9: "https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/11",
  fiz10: "https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/12",
  fiz11: "https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/13",
  fiz12: "https://tymm.meb.gov.tr/ogretim-programlari/fizik-dersi/14",
  kim9: "https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/11",
  kim10: "https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/12",
  kim11: "https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/13",
  kim12: "https://tymm.meb.gov.tr/ogretim-programlari/kimya-dersi/14",
  bio9: "https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/11",
  bio10: "https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/12",
  bio11: "https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/13",
  bio12: "https://tymm.meb.gov.tr/ogretim-programlari/biyoloji-dersi/14",
  tar9: "https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/11",
  tar10: "https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/12",
  tar11: "https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/13",
  cog9: "https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/11",
  cog10: "https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/12",
  cog11: "https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/13",
  cog12: "https://tymm.meb.gov.tr/ogretim-programlari/cografya-dersi/14",
  eng9: "https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/11",
  eng10: "https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/12",
  eng11: "https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/13",
  eng12: "https://tymm.meb.gov.tr/ogretim-programlari/ingilizce-dersi-9-12/14",
  dkab9: "https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/11",
  dkab10: "https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/12",
  dkab11: "https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/13",
  dkab12: "https://tymm.meb.gov.tr/ogretim-programlari/din-kulturu-ve-ahlak-bilgisi-dersi-2/14",
  fel11: "https://tymm.meb.gov.tr/ogretim-programlari/felsefe-dersi/13"
};

function buildFunTip(subject) {
  const key = subject.toLocaleLowerCase("tr-TR");
  if (key.includes("matematik")) return "😄 İşlem senden korkmasın; önce verilen ve isteneni bul, sonra hesapla!";
  if (key.includes("fen") || key.includes("fizik") || key.includes("kimya") || key.includes("biyoloji")) return "🔬 Fen dersinde “neden?” sorusu çok güçlüdür; cevabı bulunca konu yerine oturur.";
  if (key.includes("tarih") || key.includes("inkılap")) return "🕰️ Tarihi ezberlemek yerine hikâyeyi sıraya koy: önce neden, sonra olay, sonra sonuç!";
  if (key.includes("coğrafya")) return "🗺️ Haritaya bakarken üçlü formül: nerede, neden orada, sonucu ne?";
  if (key.includes("türkçe") || key.includes("edebiyat")) return "📚 Nokta, virgül ve paragraf küçük görünebilir; sınavda büyük işler çıkarabilir. 😄";
  if (key.includes("ingilizce")) return "🇬🇧 Kelimeyi tek başına ezberleme; kısa cümlede kullan, beyin daha kolay hatırlar.";
  if (key.includes("din")) return "🌟 Kavramı sadece tanım olarak değil, günlük hayattan bir örnekle düşün.";
  if (key.includes("felsefe")) return "🧠 Felsefede iyi soru bazen cevaptan daha değerlidir; önce soruyu doğru kur!";
  return "✨ Konuyu kendi cümlenle anlatabiliyorsan gerçekten öğrenmişsindir.";
}

function buildExamples(subject, title, points = []) {
  const safePoints = Array.isArray(points) ? points.filter(Boolean).slice(0, 6) : [];
  const examples = safePoints.map((point, index) => {
    const tone = ["🎯 Temeli yakala", "💡 Nedenini düşün", "🧩 Bağlantıyı kur", "🚀 Sınavda uygula", "🔎 Kontrol et", "🏆 Kendine anlat"][index] || "💡 Örnek";
    return `${tone}: “${point}” için 3 küçük adım yap: (1) Ne demek? (2) Neden önemli? (3) Sınavda nasıl sorulabilir? Sonra bir örnek soru çöz.`;
  });
  while (examples.length < 4) {
    const n = examples.length + 1;
    examples.push(`📝 Örnek ${n}: “${title}” içinden bir ana kavram seç, kısa tanımını yaz ve günlük hayattan bir bağlantı kur.`);
  }
  return examples.slice(0, 6);
}

const arr = (grade, subject, source, titles, topicMap = {}) => titles.map((t, i) => makeUnit(grade, subject, i + 1, t, source, topicMap[t]));

const READY_CURRICULUM = [
  ...arr(5, "Türkçe", src.tr5, ["Oyun Dünyası", "Atatürk’ü Tanımak", "Duygularımı Tanıyorum", "Geleneklerimiz", "İletişim Ve Sosyal İlişkiler", "Sağlıklı Yaşıyorum"]),
  ...arr(6, "Türkçe", src.tr6, ["Dilimizin Zenginliği", "Bağımsızlık Yolu", "Farklı Dünyalar", "İletişim Ve Sosyal İlişkiler", "Bilim Ve Teknoloji", "Lider Ruhlar"]),
  ...arr(7, "Türkçe", src.tr7, ["Hayat Boyu Gelişim", "Bir Hilal Uğruna", "İletişim Ve Sosyal İlişkiler", "Türk Sanatı", "Okuma Kültürü", "Hak Ve Sorumluluklar"]),
  ...arr(8, "Türkçe", src.tr8, ["İletişim Ve Sosyal İlişkiler", "Vatan Sevgisi", "Doğa Ve İnsan", "Türk Hikâye Geleneği Ve Destanları", "Sanat Ve Estetik", "Akademik Düşünme Dünyası"]),

  ...arr(5, "Matematik", src.mat5, ["Sayılar Ve Nicelikler (1)", "Sayılar Ve Nicelikler (2)", "İşlemlerle Cebirsel Düşünme", "Geometrik Şekiller", "Geometrik Nicelikler", "İstatistiksel Araştırma Süreci", "Veriden Olasılığa"]),
  ...arr(6, "Matematik", src.mat6, ["Sayılar Ve Nicelikler (1)", "Sayılar Ve Nicelikler (2)", "İşlemlerle Cebirsel Düşünme Ve Değişimler", "Geometrik Şekiller", "Geometrik Nicelikler", "İstatistiksel Araştırma Süreci", "Veriden Olasılığa"]),
  ...arr(7, "Matematik", src.mat7, ["Sayılar Ve Nicelikler (1)", "Sayılar Ve Nicelikler (2)", "İşlemlerle Cebirsel Düşünme Ve Değişimler", "Dönüşüm", "Geometrik Nicelikler (1)", "Geometrik Nicelikler (2)", "Geometrik Şekiller", "İstatistiksel Araştırma Süreci", "Veriden Olasılığa"]),
  ...arr(8, "Matematik", src.mat8, ["Sayılar Ve Nicelikler", "Cebirsel Düşünme Ve Değişimler", "Geometrik Şekiller", "Geometrik Nicelikler", "Dönüşüm", "İstatistiksel Araştırma Süreci", "Veriden Olasılığa"]),

  ...arr(5, "Fen Bilimleri", src.fen5, ["Gökyüzündeki Komşularımız Ve Biz", "Kuvveti Tanıyalım", "Canlıların Yapısına Yolculuk", "Işığın Dünyası", "Maddenin Doğası", "Yaşamımızdaki Elektrik", "Sürdürülebilir Yaşam Ve Geri Dönüşüm"]),
  ...arr(6, "Fen Bilimleri", src.fen6, ["Güneş Sistemi Ve Tutulmalar", "Kuvvetin Etkisinde Hareket", "Canlılarda Sistemler", "Işığın Yansıması Ve Renkler", "Maddenin Ayırt Edici Özellikleri", "Elektriğin İletimi Ve Direnç", "Sürdürülebilir Yaşam Ve Etkileşim"]),
  ...arr(7, "Fen Bilimleri", src.fen7, ["Uzay Çağı", "Kuvvet Ve Enerjiyi Keşfedelim", "Vücudumuzdaki Sistemler", "Işığın Kırılması Ve Mercekler", "Maddenin Doğasına Yolculuk", "Elektriklenme", "Sürdürülebilir Yaşam Ve Enerji"]),
  ...arr(8, "Fen Bilimleri", src.fen8, ["Mevsimler Ve İklim", "Yaşamı Kolaylaştıran Kuvvet", "Yaşamın Gizemi", "Sesin Dünyası", "Periyodik Tablo Ve Maddenin Etkileşimi", "Elektriğin Yolculuğu", "Sürdürülebilir Yaşam Ve Madde Döngüleri"]),

  ...arr(5, "Sosyal Bilgiler", src.sos5, ["Birlikte Yaşamak", "Evimiz Dünya", "Ortak Mirasımız", "Yaşayan Demokrasimiz", "Hayatımızdaki Ekonomi", "Teknoloji Ve Sosyal Bilimler"]),
  ...arr(6, "Sosyal Bilgiler", src.sos6, ["Birlikte Yaşamak", "Evimiz Dünya", "Ortak Mirasımız", "Yaşayan Demokrasimiz", "Hayatımızdaki Ekonomi", "Teknoloji Ve Sosyal Bilimler"]),
  ...arr(7, "Sosyal Bilgiler", src.sos7, ["Birlikte Yaşamak", "Evimiz Dünya", "Ortak Mirasımız", "Yaşayan Demokrasimiz", "Hayatımızdaki Ekonomi", "Teknoloji Ve Sosyal Bilimler"]),

  ...arr(5, "İngilizce", src.eng5, ["School Life", "Classroom Life", "Personal Life", "Family Life", "Life In The Neighbourhood & City", "Life In The World", "Life In Nature", "Life In The Universe & Future"]),
  ...arr(6, "İngilizce", src.eng6, ["School Life", "Classroom Life", "Personal Life", "Family Life", "Life In The Neighbourhood & City", "Life In The World & Culture", "Life In Nature & Global Problems", "Life In The Universe & Future"]),
  ...arr(7, "İngilizce", src.eng7, ["School Life & Education", "Classroom Life & Learning", "Personal Life & Well-Being", "Family Life & Home", "Life In The Neighbourhood & City And Social Life", "Life In The World & Culture", "Life In Nature", "Life In The Universe & Future"]),
  ...arr(8, "İngilizce", src.eng8, ["School Life & Education", "Classroom Life & Learning", "Personal Life & Well-Being", "Family Life & Home", "Life In The Neighbourhood & City And Social Life", "Life In The World & Culture", "Life In Nature", "Life In The Universe & Future"]),

  ...arr(5, "Din Kültürü ve Ahlak Bilgisi", src.dkab5, ["Allah İnancı", "Namaz", "Kur’an-ı Kerim", "Peygamber Kıssaları", "Mimarimizde Dinî Motifler"]),
  ...arr(6, "Din Kültürü ve Ahlak Bilgisi", src.dkab6, ["Peygamber Ve İlahi Kitap İnancı", "Ramazan Ve Oruç", "Ahlaki Davranışlar", "Peygamberliğinden Önce Hz. Muhammed", "Kültürümüzdeki Dinî Motifler"]),
  ...arr(7, "Din Kültürü ve Ahlak Bilgisi", src.dkab7, ["Melek Ve Ahiret İnancı", "Hac, Umre Ve Kurban", "İslam Düşüncesinde Yorumlar", "Peygamber Olarak Hz. Muhammed", "Yaşayan Dünya Dinleri"]),
  ...arr(8, "Din Kültürü ve Ahlak Bilgisi", src.dkab8, ["Kader İnancı", "Zekât Ve Sadaka", "Din Ve Sosyal Hayat", "Kur’an Ve İnsan", "Müslümanların Bilim Ve Kültüre Katkısı"]),
  ...arr(8, "T.C. İnkılap Tarihi Ve Atatürkçülük", src.ink8, ["Mustafa Kemal’in Hayatı", "Birinci Dünya Savaşı", "Millî Mücadele", "Türkiye Cumhuriyeti’nin Kuruluşu Ve İnkılaplar"]),

  ...arr(9, "Türk Dili Ve Edebiyatı", src.tde9, ["Sözün İnceliği", "Anlam Arayışı", "Anlamın Yapı Taşları", "Dilin Zenginliği"]),
  ...arr(10, "Türk Dili Ve Edebiyatı", src.tde10, ["Sözün Ezgisi", "Kelimelerin Ritmi", "Dünden Bugüne", "Nesillerin Mirası"]),
  ...arr(11, "Türk Dili Ve Edebiyatı", src.tde11, ["Bir Diyeceğim Var!", "Kültür Yolculuğu", "Yaşamın İzinde", "Hayatın Aynası"]),
  ...arr(12, "Türk Dili Ve Edebiyatı", src.tde12, ["Benim Yolculuğum", "Toplumun Ahengi", "Hayatın Dengesi", "Hayalimdeki Yarın"]),

  ...arr(9, "Matematik", src.mat9, ["Sayılar", "Nicelikler Ve Değişimler", "Geometrik Şekiller", "Eşlik Ve Benzerlik", "Algoritma Ve Bilişim", "İstatistiksel Araştırma Süreci", "Veriden Olasılığa"]),
  ...arr(10, "Matematik", src.mat10, ["Geometrik Şekiller", "İstatistiksel Araştırma Süreci", "Sayılar", "Nicelikler Ve Değişimler", "Sayma, Algoritma Ve Bilişim", "Analitik İnceleme", "Veriden Olasılığa"]),
  ...arr(11, "Matematik", src.mat11, ["İstatistiksel Araştırma Süreci", "Geometrik Şekiller", "Nicelikler Ve Değişimler (1)", "Nicelikler Ve Değişimler (2)", "Nicelikler Ve Değişimler (3)"]),
  ...arr(12, "Matematik", src.mat12, ["Nicelikler Ve Değişimler (1)", "Nicelikler Ve Değişimler (2)", "Geometrik Şekiller", "Geometrik Cisimler", "Değişimin Matematiği (1)", "Değişimin Matematiği (2)", "Değişimin Matematiği (3)", "Hazır Veriler Üzerinde Çalışma"]),

  ...arr(9, "Fizik", src.fiz9, ["Fizik Bilimi Ve Kariyer Keşfi", "Kuvvet Ve Hareket", "Akışkanlar", "Enerji"]),
  ...arr(10, "Fizik", src.fiz10, ["Kuvvet Ve Hareket", "Enerji", "Elektrik", "Dalgalar"]),
  ...arr(11, "Fizik", src.fiz11, ["Kuvvet Ve Hareket", "Elektrik Ve Manyetizma", "Optik"]),
  ...arr(12, "Fizik", src.fiz12, ["Kuvvet Ve Hareket", "Enerji", "Dalgalar", "Madde Ve Doğası"]),

  ...arr(9, "Kimya", src.kim9, ["Etkileşim", "Çeşitlilik", "Sürdürülebilirlik"]),
  ...arr(10, "Kimya", src.kim10, ["Etkileşim", "Çeşitlilik", "Sürdürülebilirlik"]),
  ...arr(11, "Kimya", src.kim11, ["Etkileşim", "Çeşitlilik", "Sürdürülebilirlik"]),
  ...arr(12, "Kimya", src.kim12, ["Etkileşim", "Çeşitlilik", "Sürdürülebilirlik"]),

  ...arr(9, "Biyoloji", src.bio9, ["Yaşam", "Organizasyon"]),
  ...arr(10, "Biyoloji", src.bio10, ["Enerji", "Ekoloji"]),
  ...arr(11, "Biyoloji", src.bio11, ["Tepki", "Homeostazi"]),
  ...arr(12, "Biyoloji", src.bio12, ["Üreme", "Gen"]),

  ...arr(9, "Tarih", src.tar9, ["Geçmişin İnşa Sürecinde Tarih", "Eski Çağ Medeniyetleri", "Orta Çağ Medeniyetleri"]),
  ...arr(10, "Tarih", src.tar10, ["Türkistan’dan Türkiye’ye (1040-1299)", "Beylikten Devlete Osmanlı (1299-1453)", "Cihan Devleti Osmanlı (1453-1683)"]),
  ...arr(11, "Tarih", src.tar11, ["Değişen Dünyada Osmanlı Devleti (1683-1789)", "Dönüşüm Sürecinde Osmanlı (1789-1908)", "Savaşlar Sarmalında Osmanlı (1908-1918)"]),

  ...arr(9, "Coğrafya", src.cog9, ["Coğrafyanın Doğası", "Mekânsal Bilgi Teknolojileri", "Doğal Sistemler Ve Süreçler", "Beşerî Sistemler Ve Süreçler", "Ekonomik Faaliyetler Ve Etkileri", "Afetler Ve Sürdürülebilir Çevre", "Bölgeler, Ülkeler Ve Küresel Bağlantılar"]),
  ...arr(10, "Coğrafya", src.cog10, ["Coğrafyanın Doğası", "Mekânsal Bilgi Teknolojileri", "Doğal Sistemler Ve Süreçler", "Beşerî Sistemler Ve Süreçler", "Ekonomik Faaliyetler Ve Etkileri", "Afetler Ve Sürdürülebilir Çevre", "Bölgeler, Ülkeler Ve Küresel Bağlantılar"]),
  ...arr(11, "Coğrafya", src.cog11, ["Coğrafyanın Doğası", "Mekânsal Bilgi Teknolojileri", "Doğal Sistemler Ve Süreçler", "Beşerî Sistemler Ve Süreçler", "Ekonomik Faaliyetler Ve Etkileri", "Afetler Ve Sürdürülebilir Çevre", "Bölgeler, Ülkeler Ve Küresel Bağlantılar"]),
  ...arr(12, "Coğrafya", src.cog12, ["Coğrafyanın Doğası", "Mekânsal Bilgi Teknolojileri", "Doğal Sistemler Ve Süreçler", "Beşerî Sistemler Ve Süreçler", "Ekonomik Faaliyetler Ve Etkileri", "Afetler Ve Sürdürülebilir Çevre", "Bölgeler, Ülkeler Ve Küresel Bağlantılar"]),

  ...arr(9, "İngilizce", src.eng9, ["School Life", "Classroom Life", "Personal Life: Physical Appearance & Personality", "Family Life", "Life In The House & Neighbourhood", "Life In The City & Country", "Life In The World & Nature", "Life In The Universe & Future"]),
  ...arr(10, "İngilizce", src.eng10, ["School Life & Education", "Classroom Life & Learning", "Personal Life & Well-Being", "Family Life & Home", "Life In The Neighbourhood, City & Social Life", "Life In The World & Culture", "Life In Nature & Global Problems", "Life In The Universe & The Future"]),
  ...arr(11, "İngilizce", src.eng11, ["School Life & Education", "Classroom Life & Learning", "Personal Life & Well-Being", "Family Life & Home", "Life In The Neighbourhood, City & Social Life", "Life In The World & Culture", "Life In Nature & Global Problems", "Life In The Universe & The Future"]),
  ...arr(12, "İngilizce", src.eng12, ["School Life & Education", "Classroom Life & Learning", "Personal Life & Well-Being", "Family Life & Home", "Life In The Neighbourhood, City & Social Life", "Life In The World & Culture", "Life In Nature & Global Problems", "Life In The Universe & The Future"]),

  ...arr(9, "Din Kültürü ve Ahlak Bilgisi", src.dkab9, ["Allah-İnsan İlişkisi", "İslam’da İnanç Esasları", "İslam’da İbadetler", "İslam’da Ahlak İlkeleri", "Kur’an’a Göre Hz. Muhammed"]),
  ...arr(10, "Din Kültürü ve Ahlak Bilgisi", src.dkab10, ["İslam’da Varlık Ve Bilgi", "Allah’ı Tanımak", "İslam’ın Evrensel Mesajları", "Din, Çevre Ve Teknoloji", "İslam Düşüncesinde İtikadi-Siyasi Ve Fıkhi Yorumlar"]),
  ...arr(11, "Din Kültürü ve Ahlak Bilgisi", src.dkab11, ["Kader, İrade Ve Sorumluluk", "Din, Felsefe, Bilim Ve Sanat", "İslam Medeniyeti Ve Gönül Coğrafyamız", "İnançla İlgili Meseleler", "Yahudilik Ve Hristiyanlık"]),
  ...arr(12, "Din Kültürü ve Ahlak Bilgisi", src.dkab12, ["Kur’an-ı Kerim", "Din Ve Aile", "Güncel Dinî Meseleler", "İslam Düşüncesinde Tasavvufi Yorumlar", "Hint Ve Çin Dinleri"]),

  ...arr(11, "Felsefe", src.fel11, ["Felsefeyi Tanıma", "Bilgi Felsefesi", "Bilim Felsefesi", "Varlık Felsefesi", "Hayatın Anlamı"])
];



function makeChoices(correct, distractors) {
  const unique = [...new Set([String(correct), ...distractors.map(String)])].slice(0, 4);
  const answer = unique.indexOf(String(correct));
  return { options: unique, correctAnswer: answer };
}

function stableIndex(text, length) {
  let hash = 0;
  for (const char of String(text)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % length;
}

function makeStudyJoke(subject, title) {
  const key = `${subject}|${title}`;
  const pools = {
    "matematik": [
      "Bu konuda x bile senden önce yerini bulmuş olabilir. 😐",
      "Matematikte bilinmeyen çok; ama bahaneye denklem açılmıyor. 🥶",
      "Sayılar arası ilişkiyi kurduk. Sosyal hayat hâlâ bilinmiyor. 😶‍🌫️"
    ],
    "fen bilimleri": [
      "Bilim açıklamayı sever; bahane üretmeyi değil. 🧪",
      "Bu konu deney istiyor. Senin uykun da kontrol grubunda galiba. 🥶",
      "Sebep-sonuç belli. Tek belirsiz değişken sensin. 😐"
    ],
    "tarih": [
      "Tarih tekerrür eder; test de tekrar çözülür. 🥶",
      "Geçmişe bakıyoruz çünkü geleceği tahmin etmek bazen yetmiyor. 😐",
      "Bu konuyu unutursan tarih seni de kronolojiye ekler. 🗿"
    ],
    "t.c. inkılap tarihi ve atatürkçülük": [
      "Kronoloji karışırsa tarih değil, sen zaman yolculuğu yapmış olursun. 🥶",
      "Olayların sırası önemli. Beynin 'ben karıştırırım' diyorsa iyi bak. 😐",
      "Millî Mücadele uzun sürdü; bu test kısa. Mazeret sayılmıyor. 🥶"
    ],
    "coğrafya": [
      "Harita yön gösterir; cevabı direkt söylemez. Keşke söylese. 🗺️🥶",
      "Nerede, neden orada, sonucu ne? Coğrafya bile dedikodu yapar gibi çalışıyor. 😐",
      "Dağılış belli. Dikkatin nerede, onu bulalım. 🥶"
    ],
    "ingilizce": [
      "İngilizce'de tense var; test sonunda senin de biraz tense olman normal. 🥶",
      "Kelimeler kaçmıyor. Ama yanlış seçenekler fazla özgüvenli. 😐",
      "Cümle doğru, hayat yanlış olabilir. Dil bilgisinde sorun yok. 🥶"
    ],
    "türkçe": [
      "Noktalama işaretleri bile senden daha düzenli görünmek zorunda değil. 🥶",
      "Anlamı buluyoruz. Virgül bile bugün senden daha kararlı. 😐",
      "Paragraf uzun olabilir; sabır kısmı ücretsiz. 🥶"
    ],
    "türk dili ve edebiyatı": [
      "Edebiyatta anlam derin; bu testin bahaneleri yüzeysel. 🥶",
      "Metni yorumla, moralini değil. 😐",
      "Türü bulmak kolay; zor olan 'ben bunu biliyordum' dememek. 🥶"
    ],
    "biyoloji": [
      "Hücreler görevini biliyor. Sen de görevini biliyorsun: soruyu çöz. 🥶",
      "Canlılar uyum sağlar; sen de yanlışlarına uyum sağlama. 😐",
      "Yapı-görev ilişkisi sağlam. Bahane-görev ilişkisi zayıf. 🥶"
    ],
    "fizik": [
      "Fizikte kuvvet var. Bu testte kullanman gereken kuvvet: dikkat. 🥶",
      "Birimler yerinde. Panik yapmanın birimi hâlâ yok. 😐",
      "Formül kısa, dikkat uzun. Fizik böyle küçük bir şaka yapıyor. 🥶"
    ],
    "kimya": [
      "Kimya karışım sevmeyi öğretir; seçenekleri değil. 🥶",
      "Tepkime var, sonuç var. Rastgele işaretleme yok. 😐",
      "Maddeler değişiyor. Cevapların da değişmesin diye dikkat et. 🥶"
    ],
    "din kültürü ve ahlak bilgisi": [
      "Kavramlar önemli. Test de hafızanın küçük bir ahlak sınavı gibi. 🥶",
      "Anlamı bil, ezberi yönet. Çünkü seçenekler de seni tanıyor. 😐",
      "Bu konuda dikkat seviyesi ibreyi yukarı taşır. Telekinezi gerekmez. 🥶"
    ],
    "felsefe": [
      "Felsefede soru çok. Cevap sayısı biraz daha kontrollü olsun. 🥶",
      "Düşünüyoruz. Evet, bu testte gerçekten düşünmeniz gerekiyor. 😐",
      "Bir görüşü bilmek güzel; nedenini bilmek daha az soğuk. 🥶"
    ]
  };
  const pool = pools[subject.toLocaleLowerCase("tr-TR")] || [
    "Konu ciddi. Espri soğuk. Dikkat sıcak kalsın. 🥶",
    "Bu test bilgini ölçüyor; özgüvenini değil. Gerçi ikisi de çıkabilir. 😐",
    "Dersi öğrendiysen harika. Şimdi seçeneklere fazla artistlik yaptırma. 🥶"
  ];
  return pool[stableIndex(key, pool.length)];
}

function makePracticeQuestions(item) {
  const points = Array.isArray(item.keyPoints) ? item.keyPoints.map(String).filter(Boolean) : [];
  const existing = Array.isArray(item.quiz) ? item.quiz : [];
  const title = item.title;
  const q = [];

  const add = (question, correct, distractors, focus) => {
    const c = makeChoices(correct, distractors);
    q.push({ question, options: c.options, correctAnswer: c.correctAnswer, focus: focus || title });
  };

  existing.slice(0, 3).forEach((entry, index) => {
    if (!entry) return;
    const correct = String(entry[1]);
    const fallbackDistractors = [
      "Konuyla ilgisi olmayan bir bilgiyi seçmek.",
      "Soruyu okumadan rastgele cevap vermek.",
      "Sadece başlığı bilmenin yeterli olduğunu düşünmek.",
      "Önemli kavramları birbirine karıştırmak.",
      "Sonucu kontrol etmeden işaretlemek."
    ];
    add(entry[0], correct, fallbackDistractors.slice(index, index + 3).concat(fallbackDistractors.slice(0, index)).slice(0, 3), points[index] || title);
  });

  // Ünitedeki anahtar noktaların her birini doğrudan ölçen 6 soru daha oluştur.
  points.slice(0, 6).forEach((point, index) => {
    const distractors = points.filter((other, i) => i !== index).slice(0, 3);
    add(
      `“${title}” konusunda aşağıdakilerden hangisi özellikle bilinmelidir?`,
      point,
      distractors.length >= 3
        ? distractors
        : [
            "Konuyu hiç çalışmadan cevap vermek.",
            "Sadece başlığı ezberlemek.",
            "Öğrendiğini kontrol etmemek."
          ],
      point
    );
  });

  // Her ünitede toplam 10 soru garanti edilir.
  const fallbacks = [
    [
      `“${title}” çalışırken en iyi yaklaşım hangisidir?`,
      "Kavramı anlayıp kısa bir örnekle kontrol etmek.",
      ["Soruyu okumadan seçenek işaretlemek", "Sadece başlığı ezberlemek", "Yanlışları hiç incelememek"]
    ],
    [
      `“${title}” konusunda kendini gerçekten öğrendiğini nasıl anlarsın?`,
      "Konuyu kendi cümlelerinle açıklayıp soru çözebildiğinde.",
      ["Sadece notları tekrar okuyunca", "Cevabı görünce hatırlayınca", "Başlığı tanıyınca"]
    ],
    [
      `“${title}” testinde yanlış yaptığında ilk neye bakmalısın?`,
      "Yanlış yaptığın kavramı bulup neden karıştırdığını incelemelisin.",
      ["Soruyu hemen geçmelisin", "Sadece puana bakmalısın", "Yanlışı ezberleyip devam etmelisin"]
    ],
    [
      `“${title}” için sınav öncesi en yararlı tekrar hangisidir?`,
      "Anahtar noktaları kısa tekrar edip ardından soru çözmek.",
      ["Sadece başlığı okumak", "Hiç soru çözmemek", "Bütün kitabı son dakikada ezberlemek"]
    ]
  ];

  for (const item of fallbacks) {
    if (q.length >= 10) break;
    add(item[0], item[1], item[2], points[q.length % Math.max(points.length, 1)] || title);
  }

  return q.slice(0, 10);
}

function unitQuestions(item) {
  const own = UNIT_QUESTIONS[`${item.grade}|${item.subject}|${item.unit}`];
  if (!own) return makePracticeQuestions(item);
  return own.map(([question, correct, wrong], i) => {
    const c = makeChoices(correct, wrong);
    return { question, options: c.options, correctAnswer: c.correctAnswer, focus: item.title };
  });
}

export const READY_COURSES = Array.from(
  READY_CURRICULUM.reduce((map, item) => {
    const key = `${item.grade}-${item.subject}`;
    if (!map.has(key)) {
      const lower = item.subject.toLocaleLowerCase("tr-TR");
      map.set(key, {
        id: `ready-course-${key.toLowerCase().replace(/[^a-z0-9-]+/gi, "-")}`,
        title: `${item.grade}. Sınıf ${item.subject}`,
        grade: item.grade,
        subject: item.subject,
        icon: lower.includes("matematik") ? "🧮" :
          (lower.includes("fen") || lower.includes("fizik") || lower.includes("kimya") || lower.includes("biyoloji")) ? "🔬" :
          (lower.includes("tarih") || lower.includes("coğrafya")) ? "🗺️" :
          lower.includes("ingilizce") ? "🇬🇧" :
          lower.includes("din") ? "📖" : "📚",
        description: `${item.grade}. sınıf ${item.subject} dersi — ünite ve konu çalışma alanı.`,
        source: item.source,
        videoUrl: OFFICIAL.videos,
        fileUrl: OFFICIAL.books,
        wordwallUrl: "",
        isReadyCurriculumCourse: true,
        unitIds: []
      });
    }
    map.get(key).unitIds.push(item.id);
    return map;
  }, new Map()).values()
);

export const READY_TESTS = READY_CURRICULUM.map((item) => ({
  id: `ready-${item.id}`,
  title: `${item.grade}. Sınıf ${item.subject} ${item.unit}`,
  description: `🧠 ${item.title} ünitesi için öğrenme testi. ${UNIT_JOKES[`${item.grade}|${item.subject}|${item.unit}`] || makeStudyJoke(item.subject, item.title)}`,
  grade: item.grade,
  subject: item.subject,
  unit: item.unit,
  isReadyCurriculumTest: true,
  joke: UNIT_JOKES[`${item.grade}|${item.subject}|${item.unit}`] || makeStudyJoke(item.subject, item.title),
  questionCount: 10,
  questions: Array.from({ length: 10 }, () => ({ question: "", options: [] })) // yer tutucu; gerçek sorular sunucudan gelir
}));

// Güvenli API: başka dosyalar bu diziyi kullanır.
export { READY_CURRICULUM };

export function getReadyCurriculumForGrade(grade) {
  return READY_CURRICULUM.filter(item => String(item.grade) === String(grade));
}

export function getReadyCurriculumSubjects(grade) {
  return [...new Set(getReadyCurriculumForGrade(grade).map(item => item.subject))].sort((a, b) => a.localeCompare(b, "tr"));
}
