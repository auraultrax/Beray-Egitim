const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();
const authAdmin = getAuth();

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Bu işlem için giriş yapmalısın.");
  }
  return request.auth.uid;
}

async function getProfile(uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Kullanıcı profili bulunamadı.");
  }
  return snap.data();
}

function requireTeacher(profile, request) {
  if (!profile || !["teacher", "admin"].includes(profile.role)) {
    throw new HttpsError("permission-denied", "Bu işlem için öğretmen yetkisi gerekir.");
  }
  if (request.auth?.token?.email_verified !== true) {
    throw new HttpsError("permission-denied", "Öğretmen hesabının e-posta adresi doğrulanmış olmalı.");
  }
}

function requireStudent(profile) {
  if (!profile || profile.role !== "student") {
    throw new HttpsError("permission-denied", "Bu işlem yalnızca öğrenci hesabında kullanılabilir.");
  }
}

function requireAdmin(profile, request) {
  if (!profile || profile.role !== "admin") {
    throw new HttpsError("permission-denied", "Bu işlem yalnızca admin için kullanılabilir.");
  }
  if (request.auth?.token?.email_verified !== true) {
    throw new HttpsError("permission-denied", "Admin hesabının e-posta adresi doğrulanmış olmalı.");
  }
}

function cleanText(value, max = 5000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanName(value) {
  return cleanText(value, 80).replace(/\s+/g, " ");
}

function assertValidName(name) {
  if (typeof name !== "string" || name.length < 2 || name.length > 80) {
    throw new HttpsError("invalid-argument", "Ad soyad 2-80 karakter olmalıdır.");
  }
}

function assertValidText(value, field, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new HttpsError("invalid-argument", `${field} geçersiz veya çok uzun.`);
  }
}

async function rateLimit(uid, action, maxCalls, windowMs) {
  const ref = db.collection("_rateLimits").doc(`${uid}_${action}`);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const windowStart = Number(data?.windowStart || 0);
    const count = Number(data?.count || 0);
    const active = now - windowStart < windowMs;
    const nextCount = active ? count + 1 : 1;
    if (active && nextCount > maxCalls) {
      throw new HttpsError("resource-exhausted", "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar dene.");
    }
    tx.set(ref, { windowStart: active ? windowStart : now, count: nextCount }, { merge: true });
  });
}

function enforceHttpsUrl(value, field) {
  const text = cleanText(value, 1000);
  if (text && !/^https:\/\/[^\s]+$/.test(text)) {
    throw new HttpsError("invalid-argument", `${field} yalnızca HTTPS bağlantısı olabilir.`);
  }
  return text;
}

function normalizeQuestions(rawQuestions, rawAnswers) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length < 1 || rawQuestions.length > 100) {
    throw new HttpsError("invalid-argument", "Test 1-100 soru içermelidir.");
  }
  if (!Array.isArray(rawAnswers) || rawAnswers.length !== rawQuestions.length) {
    throw new HttpsError("invalid-argument", "Cevap anahtarı geçersiz.");
  }

  return rawQuestions.map((item, index) => {
    const question = cleanText(item?.question, 1000);
    const options = Array.isArray(item?.options)
      ? item.options.map((option) => cleanText(option, 500)).slice(0, 6)
      : [];
    const correctAnswer = Number(rawAnswers[index]);

    if (!question || options.length < 2 || options.some((option) => !option)) {
      throw new HttpsError("invalid-argument", "Sorular ve seçenekler eksiksiz olmalıdır.");
    }
    if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
      throw new HttpsError("invalid-argument", "Cevap anahtarında geçersiz seçenek var.");
    }

    return { question, options, correctAnswer };
  });
}

function validGrade(value) {
  const grade = String(value || "");
  return grade === "" || ["5","6","7","8","9","10","11","12"].includes(grade);
}

exports.createTest = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireTeacher(profile, request);
  await rateLimit(uid, "createTest", 10, 60 * 1000);

  const title = cleanText(request.data?.title, 200);
  const description = cleanText(request.data?.description, 2000);
  const grade = cleanText(request.data?.grade, 2);
  const normalized = normalizeQuestions(request.data?.questions, request.data?.answers);
  if (!validGrade(grade)) {
    throw new HttpsError("invalid-argument", "Geçersiz sınıf.");
  }

  assertValidText(title, "Test başlığı", 200);
  if (!validGrade(grade)) {
    throw new HttpsError("invalid-argument", "Geçersiz sınıf.");
  }

  const testRef = db.collection("tests").doc();
  const answerRef = db.collection("testAnswers").doc(testRef.id);

  const publicQuestions = normalized.map(({ question, options }) => ({
    question,
    options,
  }));
  const answers = normalized.map(({ correctAnswer }) => correctAnswer);

  const batch = db.batch();
  batch.set(testRef, {
    title,
    description,
    grade,
    questions: publicQuestions,
    teacherId: uid,
    teacherName: profile.name || request.auth.token.name || "Öğretmen",
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(answerRef, {
    testId: testRef.id,
    answers,
    teacherId: uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { testId: testRef.id };
});

exports.submitTest = onCall(async (request) => {
  const uid = requireAuth(request);
  const testId = cleanText(request.data?.testId, 200);
  const answers = request.data?.answers;

  if (!testId || !Array.isArray(answers)) {
    throw new HttpsError("invalid-argument", "Test gönderisi geçersiz.");
  }

  const profile = await getProfile(uid);
  requireStudent(profile);
  await rateLimit(uid, "submitTest", 30, 60 * 1000);

  const [testSnap, keySnap] = await Promise.all([
    db.collection("tests").doc(testId).get(),
    db.collection("testAnswers").doc(testId).get(),
  ]);
  const userRef = db.collection("users").doc(uid);

  if (!testSnap.exists || !keySnap.exists) {
    throw new HttpsError("not-found", "Test bulunamadı.");
  }

  const test = testSnap.data();
  const answerKey = keySnap.data().answers;
  if (!Array.isArray(test.questions) || !Array.isArray(answerKey) || test.questions.length !== answerKey.length) {
    throw new HttpsError("failed-precondition", "Test verisi bozuk.");
  }
  if (answers.length !== answerKey.length) {
    throw new HttpsError("invalid-argument", "Tüm sorular cevaplanmalı.");
  }

  const normalizedAnswers = answers.map((value) => Number(value));
  const valid = normalizedAnswers.every((value, index) =>
    Number.isInteger(value) && value >= 0 && value < test.questions[index].options.length
  );
  if (!valid) {
    throw new HttpsError("invalid-argument", "Cevaplardan biri geçersiz.");
  }

  const resultId = `${uid}_${testId}`;
  const resultRef = db.collection("results").doc(resultId);

  const existingResult = await resultRef.get();
  if (existingResult.exists) {
    const old = existingResult.data();
    return {
      score: Number(old.score || 0),
      correct: Number(old.correct || 0),
      wrong: Number(old.wrong || 0),
      pointsAwarded: Number(old.pointsAwarded || 0),
      alreadySubmitted: true,
    };
  }

  const correct = normalizedAnswers.reduce(
    (count, value, index) => count + (value === Number(answerKey[index]) ? 1 : 0),
    0
  );
  const wrong = answerKey.length - correct;
  const score = Math.round((correct / answerKey.length) * 100);

  const transactionResult = await db.runTransaction(async (tx) => {
    const [freshResult, userSnap] = await Promise.all([
      tx.get(resultRef),
      tx.get(userRef),
    ]);

    if (freshResult.exists) {
      const old = freshResult.data();
      return {
        score: Number(old.score || 0),
        correct: Number(old.correct || 0),
        wrong: Number(old.wrong || 0),
        pointsAwarded: Number(old.pointsAwarded || 0),
        alreadySubmitted: true,
      };
    }

    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "Kullanıcı profili bulunamadı.");
    }

    const user = userSnap.data();
    const completedTests = Array.isArray(user.completedTests) ? user.completedTests : [];
    const pointsAwarded = correct * 5;
    const nextCompletedTests = completedTests.includes(testId)
      ? completedTests
      : [...completedTests, testId];

    tx.set(resultRef, {
      studentId: uid,
      studentName: user.name || request.auth.token.name || "",
      testId,
      testTitle: test.title || "Test",
      correct,
      wrong,
      score,
      pointsAwarded,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(userRef, {
      completedTests: nextCompletedTests,
      points: Number(user.points || 0) + pointsAwarded,
    }, { merge: true });

    return { score, correct, wrong, pointsAwarded, alreadySubmitted: false };
  });

  return transactionResult;
});

exports.completeCourse = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireStudent(profile);
  const courseId = cleanText(request.data?.courseId, 200);
  if (!courseId) {
    throw new HttpsError("invalid-argument", "Ders seçilmedi.");
  }

  const courseSnap = await db.collection("courses").doc(courseId).get();
  if (!courseSnap.exists) {
    throw new HttpsError("not-found", "Ders bulunamadı.");
  }

  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "Kullanıcı profili bulunamadı.");
    }

    const user = userSnap.data();
    const completedLessons = Array.isArray(user.completedLessons) ? user.completedLessons : [];
    if (completedLessons.includes(courseId)) {
      return { alreadyCompleted: true, pointsAwarded: 0 };
    }

    tx.set(userRef, {
      completedLessons: [...completedLessons, courseId],
      points: Number(user.points || 0) + 10,
    }, { merge: true });

    return { alreadyCompleted: false, pointsAwarded: 10 };
  });
});

exports.setUserRole = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireAdmin(profile, request);
  await rateLimit(uid, "setUserRole", 20, 60 * 60 * 1000);

  const userId = cleanText(request.data?.userId, 200);
  const role = cleanText(request.data?.role, 20);
  if (!userId || !["student", "teacher"].includes(role)) {
    throw new HttpsError("invalid-argument", "Geçersiz kullanıcı veya rol.");
  }
  if (userId === uid) {
    throw new HttpsError("failed-precondition", "Kendi admin rolünü değiştiremezsin.");
  }

  const targetRef = db.collection("users").doc(userId);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "Kullanıcı bulunamadı.");
  }
  if (targetSnap.data().role === "admin") {
    throw new HttpsError("failed-precondition", "Başka bir adminin rolü bu panelden değiştirilemez.");
  }

  await targetRef.set({ role }, { merge: true });
  return { success: true, role };
});

exports.setStudentGrade = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireStudent(profile);
  await rateLimit(uid, "setStudentGrade", 10, 10 * 60 * 1000);
  const grade = cleanText(request.data?.grade, 2);
  if (!validGrade(grade) || !grade) {
    throw new HttpsError("invalid-argument", "Geçerli bir sınıf seç.");
  }
  await db.collection("users").doc(uid).set({ grade }, { merge: true });
  return { success: true, grade };
});

exports.updateStudentProfile = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireStudent(profile);
  await rateLimit(uid, "updateStudentProfile", 10, 10 * 60 * 1000);
  const name = cleanName(request.data?.name);
  const grade = cleanText(request.data?.grade, 2);
  const avatarId = cleanText(request.data?.avatarId, 40);
  const allowedAvatars = ["owl-blue", "cat-white", "bird-gray", "panda-pink", "fox-orange", "frog-green"];
  assertValidName(name);
  if (!validGrade(grade) || !grade) throw new HttpsError("invalid-argument", "Geçerli bir sınıf seç.");
  if (!allowedAvatars.includes(avatarId)) throw new HttpsError("invalid-argument", "Geçerli bir hazır profil seç.");
  await Promise.all([
    db.collection("users").doc(uid).set({ name, grade, avatarId }, { merge: true }),
    authAdmin.updateUser(uid, { displayName: name })
  ]);
  return { success: true, name, grade, avatarId };
});

exports.deleteCourse = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireTeacher(profile, request);
  await rateLimit(uid, "deleteCourse", 30, 60 * 1000);
  const courseId = cleanText(request.data?.courseId, 200);
  if (!courseId) throw new HttpsError("invalid-argument", "Ders seçilmedi.");
  const courseRef = db.collection("courses").doc(courseId);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) throw new HttpsError("not-found", "Ders bulunamadı.");
  const course = courseSnap.data();
  if (profile.role !== "admin" && course.teacherId !== uid) {
    throw new HttpsError("permission-denied", "Bu dersi silemezsin.");
  }

  const lessons = await db.collection("lessons").where("courseId", "==", courseId).get();
  let batch = db.batch();
  let count = 0;
  batch.delete(courseRef); count++;
  for (const lesson of lessons.docs) {
    batch.delete(lesson.ref); count++;
    if (count >= 450) { await batch.commit(); batch = db.batch(); count = 0; }
  }
  if (count) await batch.commit();
  return { success: true, deletedLessons: lessons.size };
});

exports.deleteLesson = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireTeacher(profile, request);
  await rateLimit(uid, "deleteLesson", 60, 60 * 1000);
  const lessonId = cleanText(request.data?.lessonId, 200);
  if (!lessonId) throw new HttpsError("invalid-argument", "Konu seçilmedi.");
  const lessonRef = db.collection("lessons").doc(lessonId);
  const lessonSnap = await lessonRef.get();
  if (!lessonSnap.exists) throw new HttpsError("not-found", "Konu bulunamadı.");
  const lesson = lessonSnap.data();
  if (profile.role !== "admin" && lesson.teacherId !== uid) {
    throw new HttpsError("permission-denied", "Bu konuyu silemezsin.");
  }
  await lessonRef.delete();
  return { success: true };
});

exports.deleteTest = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireTeacher(profile, request);
  await rateLimit(uid, "deleteTest", 30, 60 * 1000);

  const testId = cleanText(request.data?.testId, 200);
  if (!testId) throw new HttpsError("invalid-argument", "Test seçilmedi.");

  const testRef = db.collection("tests").doc(testId);
  const testSnap = await testRef.get();
  if (!testSnap.exists) throw new HttpsError("not-found", "Test bulunamadı.");

  const test = testSnap.data();
  if (profile.role !== "admin" && test.teacherId !== uid) {
    throw new HttpsError("permission-denied", "Bu testi silemezsin.");
  }

  const batch = db.batch();
  batch.delete(testRef);
  batch.delete(db.collection("testAnswers").doc(testId));
  await batch.commit();

  return { success: true };
});

exports.migrateLegacyTests = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireAdmin(profile, request);
  await rateLimit(uid, "migrateLegacyTests", 1, 10 * 60 * 1000);

  const snap = await db.collection("tests").limit(500).get();
  let migrated = 0;
  let operations = [];

  async function flush() {
    if (!operations.length) return;
    const batch = db.batch();
    for (const operation of operations) {
      if (operation.type === "set") {
        batch.set(operation.ref, operation.data, operation.options || undefined);
      } else {
        batch.update(operation.ref, operation.data);
      }
    }
    await batch.commit();
    operations = [];
  }

  for (const docSnap of snap.docs) {
    const test = docSnap.data();
    const questions = Array.isArray(test.questions) ? test.questions : [];
    if (!questions.length || !questions.some((q) => Object.prototype.hasOwnProperty.call(q || {}, "correctAnswer"))) {
      continue;
    }

    const answers = questions.map((q) => Number(q.correctAnswer));
    const valid = answers.every((value, index) =>
      Number.isInteger(value) &&
      value >= 0 &&
      Array.isArray(questions[index]?.options) &&
      value < questions[index].options.length
    );
    if (!valid) {
      logger.warn("Skipping invalid legacy test", { testId: docSnap.id });
      continue;
    }

    operations.push({
      type: "set",
      ref: db.collection("testAnswers").doc(docSnap.id),
      data: {
        testId: docSnap.id,
        answers,
        teacherId: test.teacherId || null,
        createdAt: FieldValue.serverTimestamp(),
        migratedAt: FieldValue.serverTimestamp(),
      },
      options: { merge: true },
    });

    operations.push({
      type: "update",
      ref: docSnap.ref,
      data: {
        questions: questions.map((q) => ({
          question: cleanText(q.question, 1000),
          options: Array.isArray(q.options) ? q.options.map((x) => cleanText(x, 500)) : [],
        })),
      },
    });

    migrated += 1;
    if (operations.length >= 400) await flush();
  }

  await flush();
  return { migrated };
});


exports.seedCurriculum = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireAdmin(profile, request);
  await rateLimit(uid, "seedCurriculum", 1, 10 * 60 * 1000);

  const fs = require("fs");
  const path = require("path");
  const seedPath = path.join(__dirname, "curriculum_seed.json");
  if (!fs.existsSync(seedPath)) {
    throw new HttpsError("failed-precondition", "Müfredat seed dosyası bulunamadı.");
  }

  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const writer = db.bulkWriter();
  let writes = 0;
  const upsert = (collectionName, item) => {
    const { id, ...data } = item;
    if (!id) return;
    writer.set(db.collection(collectionName).doc(id), {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    writes += 1;
  };

  for (const item of seed.courses || []) upsert("courses", item);
  for (const item of seed.lessons || []) upsert("lessons", item);
  for (const item of seed.tests || []) upsert("tests", item);
  for (const item of seed.testAnswers || []) upsert("testAnswers", item);
  await writer.close();

  logger.info("Curriculum seeded", { uid, writes });
  return {
    courses: (seed.courses || []).length,
    lessons: (seed.lessons || []).length,
    tests: (seed.tests || []).length,
    writes
  };
});

/* Aura X ile giriş/kayıt: doğrulamayı Supabase yapar; Firebase profilini sunucuda oluşturur. */
const AURAX_URL = "https://rzdvezdccgkfzfpizwmj.supabase.co";
const AURAX_KEY = "sb_publishable_yVs-2YKiVpZ2_wOmPZvdag_AzkxdABU";

exports.auraxSignIn = onCall(async (request) => {
  const token = String(request.data?.accessToken || "");
  if (token.length < 20) throw new HttpsError("invalid-argument", "Aura X oturumu bulunamadı.");
  const headers = { apikey: AURAX_KEY, Authorization: `Bearer ${token}` };
  const authResponse = await fetch(`${AURAX_URL}/auth/v1/user`, { headers });
  if (!authResponse.ok) throw new HttpsError("unauthenticated", "Aura X hesabı doğrulanamadı. Yeniden giriş yap.");
  const au = await authResponse.json();
  if (!au?.id) throw new HttpsError("unauthenticated", "Aura X hesabı doğrulanamadı.");
  const meta = au.user_metadata || {};
  let userData = {};
  let username = String(meta.username || "").trim();
  try {
    const linkResponse = await fetch(`${AURAX_URL}/rest/v1/account_links?id=eq.${encodeURIComponent(au.id)}&select=data&limit=1`, { headers });
    if (linkResponse.ok) username = username || String((await linkResponse.json())?.[0]?.data?.username || "").trim();
  } catch (error) { logger.warn("Aura X hesap eşlemesi okunamadı", error); }
  if (username) {
    try {
      const profileResponse = await fetch(`${AURAX_URL}/rest/v1/users?id=eq.${encodeURIComponent(username)}&select=data&limit=1`, { headers });
      if (profileResponse.ok) userData = (await profileResponse.json())?.[0]?.data || {};
    } catch (error) { logger.warn("Aura X profili okunamadı", error); }
  }
  const firstName = String(meta.first_name || userData.firstName || "").slice(0, 60);
  const lastName = String(meta.last_name || userData.lastName || "").slice(0, 60);
  const name = String(userData.displayName || `${firstName} ${lastName}`.trim() || username || "Aura X Kullanıcısı").slice(0, 80);
  const uid = `aurax_${au.id}`;
  const email = `${au.id}@aurax.beray.local`;
  const password = require("crypto").randomBytes(24).toString("hex");
  try {
    // Önce kullanıcı adı çakışmasını kontrol et; çakışan isimle Auth hesabı oluşturup
    // parolasını değiştirmeyelim. Var olan Aura X hesabı etkilenmeden açıklayıcı hata döner.
    const usernameLower = username.toLowerCase();
    if (/^[a-z0-9._-]{3,24}$/.test(usernameLower)) {
      const claimRef = db.collection("usernameClaims").doc(usernameLower);
      const claim = await claimRef.get();
      const ownerUidHash = require("crypto").createHash("sha256").update(uid).digest("hex");
      if (claim.exists && claim.data()?.ownerUidHash && claim.data().ownerUidHash !== ownerUidHash) {
        throw new HttpsError("already-exists", "Bu Aura X kullanıcı adı Beray Eğitim Platformu'nda başka bir hesap tarafından kullanılıyor.");
      }
    }
    try {
      await authAdmin.getUser(uid);
      await authAdmin.updateUser(uid, { email, password, displayName: name });
    } catch (error) {
      if (error?.code && error.code !== "auth/user-not-found") throw error;
      await authAdmin.createUser({ uid, email, password, displayName: name });
    }
    const ref = db.collection("users").doc(uid);
    const existing = await ref.get();
    const stored = existing.exists ? existing.data() : {};
    if (/^[a-z0-9._-]{3,24}$/.test(usernameLower)) {
      const claimRef = db.collection("usernameClaims").doc(usernameLower);
      const claim = await claimRef.get();
      const ownerUidHash = require("crypto").createHash("sha256").update(uid).digest("hex");
      if (claim.exists && claim.data()?.ownerUidHash && claim.data().ownerUidHash !== ownerUidHash) {
        throw new HttpsError("already-exists", "Bu Aura X kullanıcı adı Beray Eğitim Platformu'nda başka bir hesap tarafından kullanılıyor.");
      }
      if (!claim.exists) await claimRef.set({ claimed: true, ownerUidHash, createdAt: FieldValue.serverTimestamp(), provider: "aurax" });
    }
    await ref.set({
      uid, name, firstName, lastName,
      ...(username ? { username, usernameLower, auraxUsername: username } : {}),
      provider: "aurax", role: stored.role || "student", points: Number(stored.points || 0),
      completedLessons: Array.isArray(stored.completedLessons) ? stored.completedLessons : [],
      completedTests: Array.isArray(stored.completedTests) ? stored.completedTests : [],
      avatarId: stored.avatarId || "owl-blue",
      createdAt: stored.createdAt || FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("auraxSignIn hesap hatası", error);
    throw new HttpsError("failed-precondition", "Aura X doğrulandı ancak Beray profili oluşturulamadı. Cloud Functions günlüklerini kontrol et.");
  }
  return { email, password, name };
});

/* Öğrenci sosyal alanı: arama, takip isteği ve puan transferi yalnızca sunucuda yetkilendirilir. */
const SOCIAL_AVATARS = new Set(["owl-blue", "cat-white", "bird-gray", "panda-pink", "fox-orange", "frog-green"]);
function publicStudent(uid, data = {}) {
  const completedTests = Array.isArray(data.completedTests) ? data.completedTests.length : Number(data.completedTestsCount || 0);
  const completedLessons = Array.isArray(data.completedLessons) ? data.completedLessons.length : Number(data.completedLessonsCount || 0);
  const points = Number(data.points || 0); const badges = [];
  if (points >= 100) badges.push("⭐ Puan Avcısı"); if (points >= 500) badges.push("🏆 Yıldız Öğrenci");
  if (completedTests >= 10) badges.push("📝 Test Ustası"); if (completedLessons >= 10) badges.push("📚 İstikrarlı Öğrenci");
  if (!badges.length) badges.push("🌱 Yeni Başlangıç");
  const username = cleanText(data.username || data.auraxUsername || "", 40);
  return { uid, name: cleanName(data.name || data.displayName || username || "Öğrenci") || "Öğrenci", username,
    usernameLower: cleanText(data.usernameLower || username, 40).toLowerCase(),
    avatarId: SOCIAL_AVATARS.has(data.avatarId) ? data.avatarId : "owl-blue", points,
    completedTestsCount: completedTests, completedLessonsCount: completedLessons, badges: badges.slice(0, 3) };
}
function friendshipDocId(a, b) { return [String(a), String(b)].sort().join("__"); }
async function addStudentNotification(userId, title, body, type, extra = {}) {
  await db.collection("notifications").add({ userId, title: cleanText(title, 160), body: cleanText(body, 1000), type,
    read: false, createdAt: FieldValue.serverTimestamp(), ...extra });
}
exports.searchStudents = onCall(async (request) => {
  const uid = requireAuth(request); const profile = await getProfile(uid); requireStudent(profile);
  await rateLimit(uid, "searchStudents", 30, 60 * 1000);
  const rawSearch = cleanText(request.data?.query, 40);
  const searchUsername = rawSearch.toLowerCase();
  const searchName = rawSearch.toLocaleLowerCase("tr-TR");
  if (rawSearch.length < 2) throw new HttpsError("invalid-argument", "Aramak için en az iki karakter yaz.");
  const snapshot = await db.collection("users").where("role", "==", "student").limit(1000).get();
  const results = snapshot.docs.filter(item => item.id !== uid).map(item => publicStudent(item.id, item.data()))
    .filter(item => item.usernameLower.includes(searchUsername) || item.name.toLocaleLowerCase("tr-TR").includes(searchName))
    .sort((a,b) => (a.usernameLower === searchUsername ? 0 : 1) - (b.usernameLower === searchUsername ? 0 : 1) || a.usernameLower.localeCompare(b.usernameLower, "tr")).slice(0, 25);
  return { results };
});
exports.requestFollow = onCall(async (request) => {
  const uid = requireAuth(request); const profile = await getProfile(uid); requireStudent(profile);
  await rateLimit(uid, "requestFollow", 20, 60 * 1000);
  const targetUid = cleanText(request.data?.targetUid, 160);
  if (!targetUid || targetUid === uid) throw new HttpsError("invalid-argument", "Kendini takip edemezsin.");
  const targetSnap = await db.collection("users").doc(targetUid).get();
  if (!targetSnap.exists || targetSnap.data()?.role !== "student") throw new HttpsError("not-found", "Öğrenci bulunamadı.");
  const friendshipRef = db.collection("friendships").doc(friendshipDocId(uid, targetUid));
  const requestRef = db.collection("followRequests").doc(`${uid}_${targetUid}`);
  const notificationRef = db.collection("notifications").doc();
  const actor = publicStudent(uid, profile);
  await db.runTransaction(async tx => {
    const [friendSnap, reqSnap] = await Promise.all([tx.get(friendshipRef), tx.get(requestRef)]);
    if (friendSnap.exists) throw new HttpsError("already-exists", "Bu öğrenciyle zaten arkadaşsınız.");
    if (reqSnap.exists && reqSnap.data()?.status === "pending") throw new HttpsError("already-exists", "Takip isteğin zaten gönderilmiş.");
    tx.set(requestRef, { fromUid: uid, toUid: targetUid, status: "pending", fromName: profile.name || "Öğrenci", toName: targetSnap.data()?.name || "Öğrenci", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.set(notificationRef, { userId: targetUid, title: "Yeni takip isteği", body: `${actor.username || actor.name} Öğrenci seni takip etmek istiyor.`, type: "follow-request", read: false, createdAt: FieldValue.serverTimestamp(), actorUid: uid, relatedId: requestRef.id });
  });
  return { success: true };
});
exports.respondFollow = onCall(async (request) => {
  const uid = requireAuth(request); const profile = await getProfile(uid); requireStudent(profile);
  await rateLimit(uid, "respondFollow", 40, 60 * 1000);
  const requestId = cleanText(request.data?.requestId, 300); const decision = cleanText(request.data?.decision, 20);
  if (!requestId || !["accept", "reject"].includes(decision)) throw new HttpsError("invalid-argument", "Takip isteği yanıtı geçersiz.");
  const reqRef = db.collection("followRequests").doc(requestId); const reqSnap = await reqRef.get();
  if (!reqSnap.exists) throw new HttpsError("not-found", "Takip isteği bulunamadı.");
  const follow = reqSnap.data();
  if (follow.toUid !== uid) throw new HttpsError("permission-denied", "Bu takip isteği sana ait değil.");
  if (follow.status !== "pending") throw new HttpsError("failed-precondition", "Bu istek daha önce yanıtlanmış.");
  const fromUid = String(follow.fromUid || ""); const friendshipRef = db.collection("friendships").doc(friendshipDocId(uid, fromUid));
  const notificationRef = db.collection("notifications").doc();
  const actor = publicStudent(uid, profile);
  const accepted = decision === "accept";
  await db.runTransaction(async tx => {
    const [fresh, friendship] = await Promise.all([tx.get(reqRef), tx.get(friendshipRef)]);
    if (!fresh.exists || fresh.data()?.status !== "pending" || fresh.data()?.toUid !== uid) throw new HttpsError("failed-precondition", "Takip isteği artık yanıtlanamıyor.");
    tx.update(reqRef, { status: accepted ? "accepted" : "rejected", updatedAt: FieldValue.serverTimestamp() });
    if (accepted && !friendship.exists) { const members = [uid, fromUid].sort(); tx.set(friendshipRef, { members, userA: members[0], userB: members[1], createdAt: FieldValue.serverTimestamp() }); }
    tx.set(notificationRef, { userId: fromUid, title: accepted ? "Takip isteğin kabul edildi" : "Takip isteğin reddedildi", body: `${actor.username || actor.name} takip isteğine ${accepted ? "olumlu" : "olumsuz"} yanıt verdi.`, type: accepted ? "follow-accepted" : "follow-rejected", read: false, createdAt: FieldValue.serverTimestamp(), actorUid: uid, relatedId: requestId });
  });
  return { success: true, status: decision === "accept" ? "accepted" : "rejected" };
});
exports.getStudentSocial = onCall(async (request) => {
  const uid = requireAuth(request); const profile = await getProfile(uid); requireStudent(profile);
  await rateLimit(uid, "getStudentSocial", 60, 60 * 1000);
  const [incomingSnap,outgoingSnap,friendshipSnap,sentSnap,receivedSnap] = await Promise.all([
    db.collection("followRequests").where("toUid","==",uid).limit(100).get(), db.collection("followRequests").where("fromUid","==",uid).limit(100).get(),
    db.collection("friendships").where("members","array-contains",uid).limit(100).get(),
    db.collection("pointTransfers").where("fromUid","==",uid).limit(40).get(), db.collection("pointTransfers").where("toUid","==",uid).limit(40).get()
  ]);
  const incomingDocs=incomingSnap.docs.filter(d=>d.data()?.status==="pending"), outgoingDocs=outgoingSnap.docs.filter(d=>d.data()?.status==="pending");
  const friendUids=friendshipSnap.docs.map(d=>(d.data()?.members||[]).find(member=>member!==uid)).filter(Boolean);
  const others=[...new Set([...incomingDocs.map(d=>d.data().fromUid),...outgoingDocs.map(d=>d.data().toUid),...friendUids].filter(Boolean))];
  const snaps=await Promise.all(others.map(id=>db.collection("users").doc(id).get()));
  const profiles=new Map(snaps.filter(x=>x.exists).map(x=>[x.id,publicStudent(x.id,x.data())]));
  const incoming=incomingDocs.map(d=>({id:d.id,...d.data(),student:profiles.get(d.data().fromUid)||{uid:d.data().fromUid,name:d.data().fromName||"Öğrenci"}}));
  const outgoing=outgoingDocs.map(d=>({id:d.id,...d.data(),student:profiles.get(d.data().toUid)||{uid:d.data().toUid,name:d.data().toName||"Öğrenci"}}));
  const friends=friendUids.map(id=>profiles.get(id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name,"tr"));
  const transfers=[...sentSnap.docs,...receivedSnap.docs].map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)).slice(0,40);
  for (const item of transfers) { const otherId=item.fromUid===uid?item.toUid:item.fromUid; item.direction=item.fromUid===uid?"out":"in"; const otherName=item.direction==="out"?item.toName:item.fromName; item.other=profiles.get(otherId)||{uid:otherId,name:otherName||"Öğrenci"}; }
  return { me: publicStudent(uid,profile), incoming, outgoing, friends, transfers };
});
exports.sharePoints = onCall(async (request) => {
  const uid = requireAuth(request); const profile = await getProfile(uid); requireStudent(profile); await rateLimit(uid,"sharePoints",20,60000);
  const targetUid=cleanText(request.data?.targetUid,160), amount=Number(request.data?.amount);
  if (!targetUid || targetUid===uid || !Number.isInteger(amount) || amount<20 || amount>100) throw new HttpsError("invalid-argument","20–100 arasında tam sayı puan seç.");
  const friendshipRef=db.collection("friendships").doc(friendshipDocId(uid,targetUid)), senderRef=db.collection("users").doc(uid), receiverRef=db.collection("users").doc(targetUid), transferRef=db.collection("pointTransfers").doc(), notificationRef=db.collection("notifications").doc();
  let senderAfter=0,receiverAfter=0;
  await db.runTransaction(async tx=>{
    const [friend,sender,receiver]=await Promise.all([tx.get(friendshipRef),tx.get(senderRef),tx.get(receiverRef)]);
    if (!friend.exists || !(friend.data()?.members||[]).includes(uid) || !(friend.data()?.members||[]).includes(targetUid)) throw new HttpsError("permission-denied","Puan paylaşmak için önce karşılıklı arkadaş olmalısınız.");
    if (!sender.exists || !receiver.exists || receiver.data()?.role!=="student") throw new HttpsError("not-found","Arkadaş profili bulunamadı.");
    const points=Math.max(0,Number(sender.data().points||0)), targetPoints=Math.max(0,Number(receiver.data().points||0));
    if (points<amount) throw new HttpsError("failed-precondition","Bu kadar puanın yok.");
    senderAfter=points-amount; receiverAfter=targetPoints+amount; tx.update(senderRef,{points:senderAfter}); tx.update(receiverRef,{points:receiverAfter});
    tx.set(transferRef,{fromUid:uid,toUid:targetUid,amount,fromName:cleanName(sender.data().name||"Öğrenci"),toName:cleanName(receiver.data().name||"Öğrenci"),createdAt:FieldValue.serverTimestamp()});
    tx.set(notificationRef,{userId:targetUid,title:"Arkadaşından puan geldi",body:`${cleanName(profile.name||"Bir arkadaşın")} sana ${amount} puan gönderdi.`,type:"points-received",read:false,createdAt:FieldValue.serverTimestamp(),actorUid:uid,relatedId:transferRef.id});
  });
  return {success:true,amount,senderPoints:senderAfter,receiverPoints:receiverAfter};
});
exports.markStudentNotificationsRead = onCall(async (request) => {
  const uid=requireAuth(request),profile=await getProfile(uid); requireStudent(profile); await rateLimit(uid,"markStudentNotificationsRead",20,60000);
  const snapshot=await db.collection("notifications").where("userId","==",uid).where("read","==",false).limit(100).get();
  if(snapshot.empty)return {success:true,updated:0}; let batch=db.batch(),count=0;
  for(const item of snapshot.docs){batch.update(item.ref,{read:true,readAt:FieldValue.serverTimestamp()});count++;if(count===450){await batch.commit();batch=db.batch();count=0;}}
  if(count)await batch.commit();return {success:true,updated:snapshot.size};
});

/* Hazır müfredat testleri: sorular ve cevap anahtarı yalnızca sunucuda durur (functions/ready_bank.json).
   İstemci soruları cevapsız alır, cevapları gönderir ve sonucu sunucudan öğrenir. */
let READY_BANK = null;
const readyBank = () => {
  if (READY_BANK) return READY_BANK;
  try { READY_BANK = require("./ready_bank.json"); }
  catch (error) { logger.error("Hazır test bankası yüklenemedi; dağıtım paketinde bulunmuyor olabilir.", error); throw new HttpsError("failed-precondition", "Hazır test cevap bankası sunucuda yok. Önce `node tools/build-ready-bank.mjs` çalıştır, ardından Firebase Functions'ı yeniden yayımla."); }
  if (!READY_BANK || typeof READY_BANK !== "object" || !Object.keys(READY_BANK).length) throw new HttpsError("failed-precondition", "Hazır test cevap bankası boş. `node tools/build-ready-bank.mjs` çalıştırıp yeniden yayımla.");
  return READY_BANK;
};

exports.getReadyTest = onCall(async (request) => {
  const uid = requireAuth(request);
  const testId = cleanText(request.data?.testId, 200);
  await rateLimit(uid, "getReadyTest", 60, 60 * 1000);
  const entry = readyBank()[testId];
  if (!entry) throw new HttpsError("not-found", "Test bulunamadı.");
  return { questions: entry.questions };
});

exports.checkReadyTest = onCall(async (request) => {
  const uid = requireAuth(request);
  const testId = cleanText(request.data?.testId, 200);
  const answers = request.data?.answers;
  await rateLimit(uid, "checkReadyTest", 30, 60 * 1000);
  const entry = readyBank()[testId];
  if (!entry || !Array.isArray(answers) || answers.length !== entry.answers.length) {
    throw new HttpsError("invalid-argument", "Test gönderisi geçersiz.");
  }
  const picked = answers.map((v) => Number(v));
  if (!picked.every((v) => Number.isInteger(v) && v >= 0 && v <= 3)) {
    throw new HttpsError("invalid-argument", "Test cevaplarından biri geçersiz.");
  }
  const wrongFocus = [];
  let correct = 0;
  picked.forEach((v, i) => {
    if (v === entry.answers[i]) correct += 1;
    else if (entry.questions[i].focus) wrongFocus.push(entry.questions[i].focus);
  });
  const total = entry.answers.length;
  const score = Math.round((correct / total) * 100);
  const focusResults = [...new Set(wrongFocus)].slice(0, 6);
  const resultRef = db.collection("results").doc(`${uid}_${testId}`);
  const userRef = db.collection("users").doc(uid);
  const finalResult = await db.runTransaction(async (tx) => {
    const [existing, userSnap] = await Promise.all([tx.get(resultRef), tx.get(userRef)]);
    if (existing.exists) {
      const old = existing.data();
      return { score: Number(old.score || 0), correct: Number(old.correct || 0), wrong: Number(old.wrong || 0), pointsAwarded: 0, alreadySubmitted: true, wrongFocus: Array.isArray(old.wrongFocus) ? old.wrongFocus : [] };
    }
    if (!userSnap.exists) throw new HttpsError("failed-precondition", "Kullanıcı profili bulunamadı.");
    const user = userSnap.data();
    const completedTests = Array.isArray(user.completedTests) ? user.completedTests : [];
    tx.set(resultRef, {
      studentId: uid, studentName: user.name || request.auth.token.name || "", testId,
      testTitle: entry.title || testId, correct, wrong: total - correct, score, pointsAwarded: 0,
      wrongFocus: focusResults, createdAt: FieldValue.serverTimestamp(), isReadyCurriculumTest: true
    });
    tx.set(userRef, { completedTests: completedTests.includes(testId) ? completedTests : [...completedTests, testId] }, { merge: true });
    return { score, correct, wrong: total - correct, pointsAwarded: 0, alreadySubmitted: false, wrongFocus: focusResults };
  });
  return finalResult;
});
