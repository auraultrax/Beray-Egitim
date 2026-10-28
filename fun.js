/* Beray — eğlence katmanı (yalnızca görsel).
   Firebase veritabanına HİÇBİR veri yazmaz, app.js'e dokunmaz. Sadece ekrandaki
   rakamları okuyup animasyon/rozet gösterir. Puan ve sonuç hesabı
   hâlâ sunucuda (Firebase Cloud Function) yapılır. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Konfeti ---------- */
  function confetti(count) {
    if (reduce) return;
    var colors = ["#6c4cf5", "#ff5fa2", "#ffc43d", "#1fcfa0", "#38a8ff", "#ff7a59"];
    for (var i = 0; i < (count || 80); i++) {
      var p = document.createElement("i");
      p.className = "confetti-piece";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", (Math.random() * 200 - 100) + "px");
      p.style.animationDuration = (2.2 + Math.random() * 2) + "s";
      p.style.animationDelay = (Math.random() * 0.5) + "s";
      p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      document.body.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 5200); })(p);
    }
  }

  /* ---------- Test sonucu kutlaması ---------- */
  var quizBox = $("quizBox");
  if (quizBox) {
    new MutationObserver(function () {
      var big = quizBox.querySelector(".quiz-result .big-score");
      if (!big || big.dataset.celebrated) return;
      big.dataset.celebrated = "1";
      var score = parseInt(big.textContent, 10);
      if (isNaN(score)) return;
      var msg;
      if (score >= 90) msg = "🎉 Muhteşem! Bugünün yıldızı sensin!";
      else if (score >= 80) msg = "🌟 Harika iş çıkardın!";
      else if (score >= 60) msg = "💪 İyi gidiyorsun, bir tur daha dene!";
      else msg = "🌱 Her deneme seni güçlendirir. Vazgeçme!";
      var cheer = document.createElement("div");
      cheer.className = "cheer";
      cheer.textContent = msg;
      big.insertAdjacentElement("afterend", cheer);
      if (score >= 80) confetti(score >= 90 ? 120 : 70);
    }).observe(quizBox, { childList: true });
  }

  /* ---------- Rakamlar sayarak yükselsin ---------- */
  var busy = new WeakSet();
  function countUp(el) {
    if (busy.has(el)) return;
    var txt = el.textContent.trim();
    var m = txt.match(/^(\d+)(%?)$/);
    if (!m) return;
    var target = parseInt(m[1], 10), suffix = m[2];
    el.dataset.target = String(target);
    if (reduce || target === 0) return;
    busy.add(el);
    var start = null, dur = 800;
    function step(t) {
      if (start === null) start = t;
      var k = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (k < 1) requestAnimationFrame(step);
      else setTimeout(function () { busy.delete(el); }, 50);
    }
    requestAnimationFrame(step);
  }
  ["dashboardLessons", "dashboardTests", "dashboardAverage", "dashboardPoints",
    "resultAverage", "resultBest", "resultTotal"].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    new MutationObserver(function () { if (!busy.has(el)) countUp(el); })
      .observe(el, { childList: true, characterData: true, subtree: true });
  });

  /* ---------- Seviye kartı (puana göre, sadece görsel) ---------- */
  var LEVELS = [
    ["🐣", "Yeni Kâşif"], ["🔭", "Meraklı Gezgin"], ["📚", "Bilgi Avcısı"],
    ["🧩", "Soru Ustası"], ["🚀", "Zeka Roketi"], ["🦸", "Ders Kahramanı"], ["👑", "Efsane Öğrenci"]
  ];
  var pointsEl = $("dashboardPoints");
  var dash = $("student-dashboard");
  if (pointsEl && dash) {
    var stats = dash.querySelector(".stats");
    var card = document.createElement("div");
    card.className = "level-card";
    var badge = document.createElement("div"); badge.className = "level-badge";
    var info = document.createElement("div"); info.className = "level-info";
    var title = document.createElement("strong");
    var sub = document.createElement("small");
    var bar = document.createElement("div"); bar.className = "level-bar";
    var fill = document.createElement("i"); bar.appendChild(fill);
    info.appendChild(title); info.appendChild(sub); info.appendChild(bar);
    card.appendChild(badge); card.appendChild(info);
    if (stats && stats.parentNode) stats.parentNode.insertBefore(card, stats);
    var seenLevelInMemory = null;
    var updateLevel = function () {
      var pts = parseInt(String(pointsEl.dataset.target || pointsEl.textContent), 10);
      if (isNaN(pts)) return;
      var level = Math.floor(pts / 100);
      var L = LEVELS[Math.min(level, LEVELS.length - 1)];
      badge.textContent = L[0];
      title.textContent = "Seviye " + (level + 1) + " • " + L[1];
      var into = pts % 100;
      sub.textContent = (100 - into) + " puan sonra bir üst seviye!";
      requestAnimationFrame(function () { fill.style.width = Math.max(into, 4) + "%"; });
      /* Konfeti sadece GERÇEKTEN yeni seviyeye çıkınca (giriş yaparken değil). */
      /* Yalnızca bu sayfa açıkken bellekte tutulur; tarayıcı depolamasına yazılmaz. */
      if (pts === 0) return;
      if (seenLevelInMemory !== null && level > seenLevelInMemory) confetti(90);
      if (seenLevelInMemory === null || level > seenLevelInMemory) seenLevelInMemory = level;
    };
    /* Sayaç animasyonu sırasında yarım değer okumamak için hedef değer data-target'tan okunur. */
    new MutationObserver(updateLevel)
      .observe(pointsEl, { childList: true, characterData: true, subtree: true });
    updateLevel();
  }

  /* ---------- Günün motivasyon cümlesi ---------- */
  var LINES = [
    "✨ Bugün 1 konu bitir, yarın 1 adım öndesin!",
    "🔥 Küçük adımlar büyük başarılar getirir.",
    "🧠 Merak eden öğrenir, öğrenen parlar!",
    "🚀 Hedefin yüksek olsun, sen zaten yoldasın.",
    "🌈 Hata yapmak öğrenmenin bir parçası. Devam!",
    "⭐ Her test seni biraz daha güçlendirir."
  ];
  var heroP = document.querySelector("#student-dashboard .dashboard-hero p");
  if (heroP) {
    var tag = document.createElement("span");
    tag.className = "motivation";
    tag.textContent = LINES[new Date().getDate() % LINES.length];
    heroP.insertAdjacentElement("afterend", tag);
  }

  /* ---------- Mobil: menüden sayfa seçince çekmeceyi kapat ---------- */
  document.querySelectorAll(".sidebar .nav-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var sb = b.closest(".sidebar");
      if (sb && window.innerWidth <= 1050) sb.classList.remove("open");
    });
  });
})();
