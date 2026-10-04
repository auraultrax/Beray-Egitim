const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

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

function requireTeacher(profile) {
  if (!profile || !["teacher", "admin"].includes(profile.role)) {
    throw new HttpsError("permission-denied", "Bu işlem için öğretmen yetkisi gerekir.");
  }
}

function requireStudent(profile) {
  if (!profile || profile.role !== "student") {
    throw new HttpsError("permission-denied", "Bu işlem yalnızca öğrenci hesabında kullanılabilir.");
  }
}

function requireAdmin(profile) {
  if (!profile || profile.role !== "admin") {
    throw new HttpsError("permission-denied", "Bu işlem yalnızca admin için kullanılabilir.");
  }
}

function cleanText(value, max = 5000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
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
  requireTeacher(profile);

  const title = cleanText(request.data?.title, 200);
  const description = cleanText(request.data?.description, 2000);
  const grade = cleanText(request.data?.grade, 2);
  const normalized = normalizeQuestions(request.data?.questions, request.data?.answers);
  if (!validGrade(grade)) {
    throw new HttpsError("invalid-argument", "Geçersiz sınıf.");
  }

  if (!title) {
    throw new HttpsError("invalid-argument", "Test başlığı gerekli.");
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
  requireAdmin(profile);

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
  const grade = cleanText(request.data?.grade, 2);
  if (!validGrade(grade) || !grade) {
    throw new HttpsError("invalid-argument", "Geçerli bir sınıf seç.");
  }
  await db.collection("users").doc(uid).set({ grade }, { merge: true });
  return { success: true, grade };
});

exports.deleteCourse = onCall(async (request) => {
  const uid = requireAuth(request);
  const profile = await getProfile(uid);
  requireTeacher(profile);
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
  requireTeacher(profile);
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
  requireTeacher(profile);

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
  requireAdmin(profile);

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
