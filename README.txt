BERAY - ÖĞRENCİ PANELİ

Dosyalar:
index.html
student.html
firebase.js
app.js
style.css
firestore.rules
README.txt

Kurulum:
1) Firebase Authentication -> Sign-in method -> Email/Password aç.
2) Firestore Database oluştur.
3) firestore.rules içeriğini Rules bölümüne yapıştır ve Publish et.
4) Bu dosyaları HTTPS destekli bir hostingde yayınla.
5) Öğrenciler index.html üzerinden kayıt olur.
6) Kayıt olanlar student.html'e gider.

PDF:
Öğretmen tarafı Firestore'da lessons belgesine fileUrl veya courses belgesine fileUrl koyduğunda öğrenci bunu platform içindeki PDF penceresinde açabilir. iframe, tarayıcının yerleşik PDF görüntüleyicisini kullanır.

Örnek lesson:
{
  courseId: "COURSE_ID",
  title: "Kesirler",
  body: "Kesirler konu anlatımı...",
  fileUrl: "https://alanadiniz.com/kesirler.pdf",
  videoUrl: "https://..."
}
