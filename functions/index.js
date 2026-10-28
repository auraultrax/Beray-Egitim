'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const readyBank = require('./data/ready_bank.json');
const curriculumSeed = require('./data/curriculum_seed.json');

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();
const REGION = 'us-central1';
const AVATARS = new Set([
  'owl-blue', 'cat-white', 'bird-gray', 'panda-pink', 'fox-orange', 'frog-green',
  'turtle-mint', 'lion-yellow', 'rabbit-lilac'
]);
const GRADES = new Set(['5', '6', '7', '8', '9', '10', '11', '12']);
const clean = (value, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const asArray = value => Array.isArray(value) ? value : [];
const newId = () => require('node:crypto').randomUUID();
const timestamp = () => Timestamp.now();
const userRef = uid => db.collection('users').doc(uid);
const usernameRef = username => db.collection('usernameIndex').doc(username);
const recordRef = (collectionName, id) => db.collection(collectionName).doc(id);
const validUsername = username => /^[\p{L}\p{N}._-]{3,24}$/u.test(String(username || '').normalize('NFKC'));
const normalizeUsername = username => clean(username, 24).normalize('NFKC').toLocaleLowerCase('tr-TR');

function requireAuth(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Önce giriş yapmalısın.');
  return request.auth.uid;
}
async function requireProfile(uid) {
  const snapshot = await userRef(uid).get();
  if (!snapshot.exists) throw new HttpsError('failed-precondition', 'Eğitim profili bulunamadı. Firebase hesabının profilini oluştur.');
  return snapshot.data();
}
function requireStudent(profile) {
  if (profile.role !== 'student') throw new HttpsError('permission-denied', 'Bu işlem yalnızca öğrenci hesabında kullanılabilir.');
}
function requireTeacher(profile, request) {
  if (!['teacher', 'admin'].includes(String(profile.role || ''))) throw new HttpsError('permission-denied', 'Bu işlem için öğretmen yetkisi gerekir.');
  if (request.auth?.token?.email && request.auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Öğretmen hesabının e-posta adresi doğrulanmış olmalı.');
  }
}
function requireAdmin(profile) {
  if (profile.role !== 'admin') throw new HttpsError('permission-denied', 'Bu işlem yalnızca admin için kullanılabilir.');
}
function publicStudent(uid, profile = {}) {
  const completedTestsCount = Array.isArray(profile.completedTests) ? profile.completedTests.length : Number(profile.completedTestsCount || 0);
  const completedLessonsCount = Array.isArray(profile.completedLessons) ? profile.completedLessons.length : Number(profile.completedLessonsCount || 0);
  const points = Number(profile.points || 0);
  const badges = [];
  if (points >= 100) badges.push('⭐ Puan Avcısı');
  if (points >= 500) badges.push('🏆 Yıldız Öğrenci');
  if (completedTestsCount >= 10) badges.push('📝 Test Ustası');
  if (completedLessonsCount >= 10) badges.push('📚 İstikrarlı Öğrenci');
  if (!badges.length) badges.push('🌱 Yeni Başlangıç');
  const username = clean(profile.username || profile.auraxUsername || '', 40);
  return {
    uid,
    name: clean(profile.name || profile.displayName || username || 'Öğrenci', 80) || 'Öğrenci',
    username,
    usernameLower: clean(profile.usernameLower || username, 40).normalize('NFKC').toLocaleLowerCase('tr-TR'),
    avatarId: AVATARS.has(profile.avatarId) ? profile.avatarId : 'owl-blue',
    points,
    completedTestsCount,
    completedLessonsCount,
    badges: badges.slice(0, 3)
  };
}
function callable(handler) {
  return onCall({ region: REGION }, async request => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Firebase callable failed:', error);
      throw new HttpsError('internal', error?.message || 'Sunucu işlemi tamamlanamadı.');
    }
  });
}

// Username availability is checked server-side; the client never reads the private username index.
exports.usernameAvailable = callable(async request => {
  const username = normalizeUsername(request.data?.username);
  if (!validUsername(username)) throw new HttpsError('invalid-argument', 'Kullanıcı adı 3–24 karakter olmalı; harf, sayı, nokta, tire ve alt çizgi kullan.');
  const claim = await usernameRef(username).get();
  if (claim.exists) return { available: false };
  // Supports profiles created before the username index was introduced.
  const existing = await db.collection('users').where('usernameLower', '==', username).limit(1).get();
  return { available: existing.empty };
});

// This operation atomically creates the profile and reserves the username.
exports.createUserProfile = callable(async request => {
  const uid = requireAuth(request);
  const name = clean(request.data?.name, 80).replace(/\s+/g, ' ');
  const username = clean(request.data?.username, 24).normalize('NFKC');
  const usernameLower = normalizeUsername(username);
  if (name.length < 2) throw new HttpsError('invalid-argument', 'Ad soyad en az iki karakter olmalı.');
  if (!validUsername(username)) throw new HttpsError('invalid-argument', 'Kullanıcı adı geçersiz.');
  const profileDoc = userRef(uid);
  const claimDoc = usernameRef(usernameLower);
  await db.runTransaction(async tx => {
    // Also check older Aura X profiles that predate usernameIndex, inside the same
    // transaction so a legacy duplicate cannot bypass the reservation step.
    const legacyNameQuery = db.collection('users').where('usernameLower', '==', usernameLower).limit(2);
    const [profileSnap, claimSnap, legacyNames] = await Promise.all([
      tx.get(profileDoc), tx.get(claimDoc), tx.get(legacyNameQuery)
    ]);
    if (claimSnap.exists && claimSnap.data().uid !== uid) throw new HttpsError('already-exists', 'Bu kullanıcı adı zaten kullanılıyor.');
    if (legacyNames.docs.some(row => row.id !== uid)) throw new HttpsError('already-exists', 'Bu kullanıcı adı zaten kullanılıyor.');
    const existing = profileSnap.exists ? profileSnap.data() : {};
    const profile = {
      ...existing,
      uid,
      name,
      username,
      usernameLower,
      auraxUsername: username,
      email: request.auth.token.email || '',
      provider: 'firebase',
      role: existing.role || 'student',
      points: Number(existing.points || 0),
      completedLessons: Array.isArray(existing.completedLessons) ? existing.completedLessons : [],
      completedTests: Array.isArray(existing.completedTests) ? existing.completedTests : [],
      avatarId: AVATARS.has(existing.avatarId) ? existing.avatarId : 'owl-blue',
      createdAt: existing.createdAt || timestamp(),
      updatedAt: timestamp()
    };
    tx.set(profileDoc, profile);
    tx.set(claimDoc, { uid, username, usernameLower, createdAt: claimSnap.exists ? (claimSnap.data().createdAt || timestamp()) : timestamp() });
  });
  return { success: true, uid, username, name };
});

// Creates a sensible starter profile for an already-authenticated Aura X user if needed.
exports.ensureUserProfile = callable(async request => {
  const uid = requireAuth(request);
  const current = await userRef(uid).get();
  if (current.exists) {
    const existing = current.data();
    const storedUsername = clean(existing.username || existing.auraxUsername || existing.usernameLower || '', 24).normalize('NFKC');
    if (storedUsername && validUsername(storedUsername)) {
      const usernameLower = normalizeUsername(storedUsername);
      const [claim, legacyMatches] = await Promise.all([
        usernameRef(usernameLower).get(),
        db.collection('users').where('usernameLower', '==', usernameLower).limit(2).get()
      ]);
      if (claim.exists && claim.data().uid !== uid) throw new HttpsError('already-exists', 'Aura X kullanıcı adı başka bir hesaba bağlı. Yönetici kontrolü gerekiyor.');
      if (legacyMatches.docs.some(row => row.id !== uid)) throw new HttpsError('already-exists', 'Aura X kullanıcı adı başka bir hesaba bağlı. Yönetici kontrolü gerekiyor.');
      await db.runTransaction(async tx => {
        const [profileSnap, claimSnap] = await Promise.all([tx.get(userRef(uid)), tx.get(usernameRef(usernameLower))]);
        if (claimSnap.exists && claimSnap.data().uid !== uid) throw new HttpsError('already-exists', 'Aura X kullanıcı adı başka bir hesaba bağlı. Yönetici kontrolü gerekiyor.');
        const existingProfile = profileSnap.exists ? profileSnap.data() : existing;
        tx.set(userRef(uid), { ...existingProfile, username: existingProfile.username || storedUsername, usernameLower, auraxUsername: existingProfile.auraxUsername || storedUsername, provider: existingProfile.provider || 'firebase', updatedAt: timestamp() }, { merge: true });
        tx.set(usernameRef(usernameLower), { uid, username: existingProfile.username || storedUsername, usernameLower, createdAt: claimSnap.exists ? (claimSnap.data().createdAt || timestamp()) : timestamp() }, { merge: true });
      });
      const updated = await userRef(uid).get();
      return { profile: updated.data(), created: false };
    }
    const linkedName = await db.collection('usernameIndex').where('uid', '==', uid).limit(1).get();
    if (!linkedName.empty) {
      const linkedRow = linkedName.docs[0];
      const username = String(linkedRow.data().username || linkedRow.data().usernameLower || linkedRow.id);
      await userRef(uid).update({ username, usernameLower: normalizeUsername(username), auraxUsername: username, provider: existing.provider || 'firebase' });
      const updated = await userRef(uid).get();
      return { profile: updated.data(), created: false };
    }
    return { profile: existing, created: false };
  }
  let username = '';
  const linked = await db.collection('usernameIndex').where('uid', '==', uid).limit(1).get();
  if (!linked.empty) username = linked.docs[0].data().usernameLower || linked.docs[0].id;
  const authUser = await adminAuth.getUser(uid);
  if (!username) username = `aura_${uid.replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase()}`;
  if (!validUsername(username)) username = `student_${uid.slice(0, 8).toLowerCase()}`;
  const profile = {
    uid,
    name: clean(authUser.displayName || authUser.email?.split('@')[0] || 'Aura X Öğrencisi', 80),
    email: authUser.email || '',
    username,
    usernameLower: normalizeUsername(username),
    auraxUsername: username,
    provider: 'firebase',
    role: 'student',
    points: 0,
    completedLessons: [],
    completedTests: [],
    avatarId: 'owl-blue',
    createdAt: timestamp()
  };
  await db.runTransaction(async tx => {
    const [again, claim] = await Promise.all([tx.get(userRef(uid)), tx.get(usernameRef(normalizeUsername(username)))]);
    if (again.exists) return;
    if (claim.exists && claim.data().uid !== uid) throw new HttpsError('already-exists', 'Aura X kullanıcı adı başka bir hesaba bağlı.');
    tx.set(userRef(uid), profile);
    tx.set(usernameRef(normalizeUsername(username)), { uid, username, usernameLower: normalizeUsername(username), createdAt: timestamp() });
  });
  const result = await userRef(uid).get();
  return { profile: result.data(), created: true };
});

// Username/password login uses the same Firebase Auth tenant. Password verification is delegated
// to Firebase Identity Toolkit; only a Firebase custom token is returned to the browser.
exports.auraxSignIn = callable(async request => {
  const username = normalizeUsername(request.data?.username);
  const password = typeof request.data?.password === 'string' ? request.data.password : '';
  if (!validUsername(username) || !password) throw new HttpsError('invalid-argument', 'Aura X kullanıcı adı ve şifresi gerekli.');
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey || apiKey.startsWith('YOUR_')) throw new HttpsError('failed-precondition', 'functions/.env içindeki FIREBASE_WEB_API_KEY ayarlanmalı.');
  let uid = '';
  const claim = await usernameRef(username).get();
  if (claim.exists) uid = String(claim.data().uid || '');
  if (!uid) {
    const legacy = await db.collection('users').where('usernameLower', '==', username).limit(1).get();
    if (!legacy.empty) {
      uid = legacy.docs[0].id;
      await usernameRef(username).set({ uid, username, usernameLower: username, createdAt: timestamp() }, { merge: true });
    }
  }
  if (!uid) throw new HttpsError('unauthenticated', 'Aura X kullanıcı adı veya şifresi doğrulanamadı.');
  const account = await adminAuth.getUser(uid).catch(() => null);
  if (!account?.email) throw new HttpsError('unauthenticated', 'Aura X hesabında doğrulanabilir e-posta bulunamadı.');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password, returnSecureToken: true })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.localId !== uid) throw new HttpsError('unauthenticated', 'Aura X kullanıcı adı veya şifresi doğrulanamadı.');
  const customToken = await adminAuth.createCustomToken(uid);
  return { customToken };
});

async function gradeAndPersist(uid, testId, title, answers, key, wrongFocus = [], isReady = false) {
  const total = key.length;
  const correct = key.reduce((count, answer, index) => count + (Number(answers[index]) === Number(answer) ? 1 : 0), 0);
  const score = total ? Math.round(correct * 100 / total) : 0;
  const requestedPoints = isReady ? 0 : correct * 5;
  const resultId = `${uid}__${testId}`.replace(/[/.#$\[\]]/g, '_').slice(0, 1400);
  const resultRef = recordRef('results', resultId);
  const profileRef = userRef(uid);
  return db.runTransaction(async tx => {
    const [resultSnap, profileSnap] = await Promise.all([tx.get(resultRef), tx.get(profileRef)]);
    if (resultSnap.exists) {
      const old = resultSnap.data();
      return { score: Number(old.score || 0), correct: Number(old.correct || 0), total: Number(old.total || total), pointsAwarded: 0, wrongFocus: old.wrongFocus || [], alreadyCompleted: true };
    }
    if (!profileSnap.exists) throw new HttpsError('failed-precondition', 'Öğrenci profili bulunamadı.');
    const profile = profileSnap.data();
    const completedTests = Array.isArray(profile.completedTests) ? profile.completedTests : [];
    tx.set(resultRef, {
      userId: uid, studentId: uid, testId, title: clean(title, 200) || 'Test', score, correct, total,
      pointsAwarded: requestedPoints, wrongFocus: asArray(wrongFocus).slice(0, 6),
      isReadyCurriculumTest: Boolean(isReady), createdAt: timestamp()
    });
    tx.update(profileRef, {
      points: Number(profile.points || 0) + requestedPoints,
      completedTests: completedTests.includes(testId) ? completedTests : [...completedTests, testId],
      updatedAt: timestamp()
    });
    return { score, correct, total, pointsAwarded: requestedPoints, wrongFocus: asArray(wrongFocus).slice(0, 6), alreadyCompleted: false };
  });
}

async function runAction(action, request) {
  const uid = requireAuth(request);
  const body = request.data || {};
  const profile = action === 'deleteSelf' ? ((await userRef(uid).get()).data() || {}) : await requireProfile(uid);
  let output = {};

  switch (action) {
    case 'createTest': {
      requireTeacher(profile, request);
      const title = clean(body.title, 200), description = clean(body.description, 2000), grade = clean(body.grade, 2);
      const questions = asArray(body.questions), answers = asArray(body.answers).map(Number);
      if (!title) throw new HttpsError('invalid-argument', 'Test başlığı gerekli.');
      if (!GRADES.has(grade)) throw new HttpsError('invalid-argument', 'Geçersiz sınıf.');
      if (questions.length < 1 || questions.length > 100 || answers.length !== questions.length) throw new HttpsError('invalid-argument', 'Test 1–100 soru içermeli.');
      const normalized = questions.map((question, index) => {
        const prompt = clean(question?.question, 1000);
        const options = asArray(question?.options).map(item => clean(item, 500)).slice(0, 6);
        if (!prompt || options.length < 2 || options.some(item => !item) || !Number.isInteger(answers[index]) || answers[index] < 0 || answers[index] >= options.length) {
          throw new HttpsError('invalid-argument', `Soru ${index + 1} veya doğru cevabı eksik.`);
        }
        return { question: prompt, options };
      });
      const testId = newId();
      await recordRef('tests', testId).set({ title, description, grade, questions: normalized, teacherId: uid, teacherName: clean(profile.name || request.auth.token.name || 'Öğretmen', 80), createdAt: timestamp() });
      await recordRef('testAnswerKeys', testId).set({ answers, createdBy: uid, createdAt: timestamp() });
      output = { testId };
      break;
    }
    case 'submitTest': {
      requireStudent(profile);
      const testId = clean(body.testId, 200), answers = asArray(body.answers).map(Number);
      if (!testId || !answers.length) throw new HttpsError('invalid-argument', 'Test gönderisi geçersiz.');
      const [testSnap, keySnap] = await Promise.all([recordRef('tests', testId).get(), recordRef('testAnswerKeys', testId).get()]);
      if (!testSnap.exists || !keySnap.exists || !Array.isArray(keySnap.data().answers)) throw new HttpsError('not-found', 'Test bulunamadı veya cevap anahtarı eksik.');
      const test = testSnap.data(), questions = asArray(test.questions), key = asArray(keySnap.data().answers).map(Number);
      if (questions.length !== key.length || answers.length !== key.length) throw new HttpsError('invalid-argument', 'Testteki tüm sorular cevaplanmalı.');
      if (!answers.every((value, index) => Number.isInteger(value) && value >= 0 && value < asArray(questions[index]?.options).length)) throw new HttpsError('invalid-argument', 'Cevaplardan biri geçersiz.');
      output = await gradeAndPersist(uid, testId, test.title, answers, key, [], false);
      break;
    }
    case 'getReadyTest': {
      const testId = clean(body.testId, 200), entry = readyBank[testId];
      if (!entry) throw new HttpsError('not-found', 'Hazır test bulunamadı. Müfredat test bankası güncel değil.');
      output = { questions: entry.questions };
      break;
    }
    case 'checkReadyTest': {
      requireStudent(profile);
      const testId = clean(body.testId, 200), entry = readyBank[testId], answers = asArray(body.answers).map(Number);
      if (!entry || answers.length !== asArray(entry.answers).length || !answers.every((value, index) => Number.isInteger(value) && value >= 0 && value < asArray(entry.questions[index]?.options).length)) {
        throw new HttpsError('invalid-argument', 'Test cevapları geçersiz veya eksik.');
      }
      const wrongFocus = [...new Set(answers.flatMap((value, index) => value === Number(entry.answers[index]) ? [] : [clean(entry.questions?.[index]?.focus, 200)]).filter(Boolean))].slice(0, 6);
      output = await gradeAndPersist(uid, testId, clean(entry.title, 200) || testId, answers, entry.answers.map(Number), wrongFocus, true);
      break;
    }
    case 'completeCourse': {
      requireStudent(profile);
      const courseId = clean(body.courseId, 200);
      if (!courseId) throw new HttpsError('invalid-argument', 'Ders seçilmedi.');
      output = await db.runTransaction(async tx => {
        const ref = userRef(uid), courseRef = recordRef('courses', courseId);
        const [snap, courseSnap] = await Promise.all([tx.get(ref), tx.get(courseRef)]);
        if (!snap.exists) throw new HttpsError('failed-precondition', 'Öğrenci profili bulunamadı.');
        if (!courseSnap.exists) throw new HttpsError('not-found', 'Tamamlanacak ders bulunamadı.');
        const data = snap.data(), completed = Array.isArray(data.completedLessons) ? data.completedLessons : [];
        if (completed.includes(courseId)) return { alreadyCompleted: true, points: Number(data.points || 0) };
        const points = Number(data.points || 0) + 10;
        tx.update(ref, { completedLessons: [...completed, courseId], points, updatedAt: timestamp() });
        return { alreadyCompleted: false, pointsAwarded: 10, points };
      });
      break;
    }
    case 'setStudentGrade': {
      requireStudent(profile);
      const grade = clean(body.grade, 2);
      if (!GRADES.has(grade)) throw new HttpsError('invalid-argument', 'Geçerli bir sınıf seç.');
      await userRef(uid).update({ grade, updatedAt: timestamp() });
      output = { success: true, grade };
      break;
    }
    case 'updateStudentProfile': {
      requireStudent(profile);
      const name = clean(body.name, 80).replace(/\s+/g, ' '), grade = clean(body.grade, 2), avatarId = clean(body.avatarId, 40);
      if (name.length < 2 || !GRADES.has(grade)) throw new HttpsError('invalid-argument', 'Ad soyad ve geçerli sınıf gerekli.');
      if (!AVATARS.has(avatarId)) throw new HttpsError('invalid-argument', 'Profil resmi geçersiz.');
      await userRef(uid).update({ name, grade, avatarId, updatedAt: timestamp() });
      await adminAuth.updateUser(uid, { displayName: name });
      output = { success: true, name, grade, avatarId };
      break;
    }
    case 'setUserRole': {
      requireAdmin(profile);
      const userId = clean(body.userId, 200), role = clean(body.role, 20);
      if (!userId || !['student', 'teacher'].includes(role) || userId === uid) throw new HttpsError('invalid-argument', 'Kullanıcı veya rol geçersiz.');
      const targetRef = userRef(userId), target = await targetRef.get();
      if (!target.exists) throw new HttpsError('not-found', 'Kullanıcı bulunamadı.');
      if (target.data().role === 'admin') throw new HttpsError('failed-precondition', 'Başka bir adminin rolü bu panelden değiştirilemez.');
      await targetRef.update({ role, updatedAt: timestamp() });
      output = { success: true, role };
      break;
    }
    case 'deleteCourse': {
      requireTeacher(profile, request);
      const courseId = clean(body.courseId, 200), courseRef = recordRef('courses', courseId), course = await courseRef.get();
      if (!course.exists) throw new HttpsError('not-found', 'Ders bulunamadı.');
      if (profile.role !== 'admin' && course.data().teacherId !== uid) throw new HttpsError('permission-denied', 'Bu dersi silemezsin.');
      const lessons = await db.collection('lessons').where('courseId', '==', courseId).get();
      let deletedLessons = 0;
      for (let start = 0; start < lessons.docs.length; start += 400) {
        const batch = db.batch();
        lessons.docs.slice(start, start + 400).forEach(doc => batch.delete(doc.ref));
        await batch.commit(); deletedLessons += Math.min(400, lessons.docs.length - start);
      }
      await courseRef.delete();
      output = { success: true, deletedLessons };
      break;
    }
    case 'deleteLesson': {
      requireTeacher(profile, request);
      const lessonId = clean(body.lessonId, 200), ref = recordRef('lessons', lessonId), snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Konu bulunamadı.');
      if (profile.role !== 'admin' && snap.data().teacherId !== uid) throw new HttpsError('permission-denied', 'Bu konuyu silemezsin.');
      await ref.delete(); output = { success: true }; break;
    }
    case 'deleteTest': {
      requireTeacher(profile, request);
      const testId = clean(body.testId, 200), ref = recordRef('tests', testId), snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Test bulunamadı.');
      if (profile.role !== 'admin' && snap.data().teacherId !== uid) throw new HttpsError('permission-denied', 'Bu testi silemezsin.');
      await Promise.all([ref.delete(), recordRef('testAnswerKeys', testId).delete().catch(() => {})]);
      output = { success: true }; break;
    }
    case 'migrateLegacyTests': {
      requireAdmin(profile);
      const rows = await db.collection('tests').limit(2000).get(); let updated = 0;
      for (const row of rows.docs) {
        const data = row.data(), questions = asArray(data.questions);
        if (!questions.some(question => Number.isInteger(question?.correctAnswer))) continue;
        const answers = questions.map(question => Number(question.correctAnswer));
        const cleaned = questions.map(question => { const { correctAnswer, ...publicQuestion } = question; return publicQuestion; });
        await recordRef('testAnswerKeys', row.id).set({ answers, createdBy: data.teacherId || uid, createdAt: timestamp() });
        await row.ref.update({ questions: cleaned }); updated++;
      }
      output = { success: true, updated }; break;
    }
    case 'seedCurriculum': {
      // The teacher-panel button is visible to teachers; only a fixed built-in seed is applied.
      requireTeacher(profile, request);
      const operations = [];
      for (const course of asArray(curriculumSeed.courses)) operations.push(['courses', String(course.id), { ...course, createdAt: timestamp() }]);
      for (const lesson of asArray(curriculumSeed.lessons)) operations.push(['lessons', String(lesson.id), { ...lesson, createdAt: timestamp() }]);
      for (const test of asArray(curriculumSeed.tests)) {
        const questions = asArray(test.questions);
        const publicQuestions = questions.map(question => { const { correctAnswer, ...safe } = question; return safe; });
        operations.push(['tests', String(test.id), { ...test, questions: publicQuestions, createdAt: timestamp() }]);
      }
      for (let start = 0; start < operations.length; start += 400) {
        const batch = db.batch();
        operations.slice(start, start + 400).forEach(([name, id, data]) => batch.set(recordRef(name, id), data, { merge: true }));
        await batch.commit();
      }
      const answerEntries = asArray(curriculumSeed.testAnswers);
      for (let start = 0; start < answerEntries.length; start += 400) {
        const batch = db.batch();
        answerEntries.slice(start, start + 400).forEach(answer => {
          batch.set(recordRef('testAnswerKeys', String(answer.testId || answer.id)), { answers: asArray(answer.answers).map(Number), createdBy: uid, createdAt: timestamp() }, { merge: true });
        });
        await batch.commit();
      }
      output = { courses: asArray(curriculumSeed.courses).length, lessons: asArray(curriculumSeed.lessons).length, tests: asArray(curriculumSeed.tests).length };
      break;
    }
    case 'searchStudents': {
      requireStudent(profile);
      const raw = clean(body.query, 40).normalize('NFKC').toLocaleLowerCase('tr-TR');
      if (raw.length < 2) throw new HttpsError('invalid-argument', 'Kullanıcı adını aramak için en az iki karakter yaz.');
      // Exact username first, otherwise an indexed prefix lookup: no full-collection scan.
      const exactClaim = await usernameRef(raw).get();
      let rows = [];
      if (exactClaim.exists && exactClaim.data().uid && exactClaim.data().uid !== uid) {
        const snap = await userRef(String(exactClaim.data().uid)).get();
        if (snap.exists) rows = [{ id: snap.id, data: snap.data() }];
      } else {
        const matches = await db.collection('users')
          .where('usernameLower', '>=', raw)
          .where('usernameLower', '<=', `${raw}\uf8ff`)
          .orderBy('usernameLower')
          .limit(25)
          .get();
        rows = matches.docs.map(doc => ({ id: doc.id, data: doc.data() }));
      }
      const results = rows.filter(row => row.id !== uid && row.data.role === 'student')
        .map(row => ({ ...publicStudent(row.id, row.data), points: undefined, pointsVisible: false, badges: ['👋 Öğrenci'] }));
      output = { results }; break;
    }
    case 'requestFollow': {
      requireStudent(profile);
      const targetUid = clean(body.targetUid, 160);
      if (!targetUid || targetUid === uid) throw new HttpsError('invalid-argument', 'Kendini takip edemezsin.');
      const friendshipId = [uid, targetUid].sort().join('__');
      const requestId = `${uid}_${targetUid}`;
      const requestRef = recordRef('followRequests', requestId);
      const notificationRef = db.collection('notifications').doc();
      const actor = publicStudent(uid, profile);
      await db.runTransaction(async tx => {
        const [targetSnap, friendSnap, requestSnap] = await Promise.all([
          tx.get(userRef(targetUid)), tx.get(recordRef('friendships', friendshipId)), tx.get(requestRef)
        ]);
        if (!targetSnap.exists || targetSnap.data().role !== 'student') throw new HttpsError('not-found', 'Öğrenci bulunamadı.');
        if (friendSnap.exists) throw new HttpsError('already-exists', 'Bu öğrenciyle zaten birbirinizi takip ediyorsunuz.');
        if (requestSnap.exists && requestSnap.data().status === 'pending') throw new HttpsError('already-exists', 'Takip isteğin zaten gönderilmiş.');
        const now = timestamp();
        tx.set(requestRef, { fromUid: uid, toUid: targetUid, status: 'pending', fromName: profile.name || 'Öğrenci', toName: targetSnap.data().name || 'Öğrenci', createdAt: now, updatedAt: now });
        tx.set(notificationRef, {
          userId: targetUid, title: 'Yeni takip isteği',
          body: `${actor.username || actor.name} seni takip etmek istiyor. Onaylıyor musun?`,
          type: 'follow-request', read: false, createdAt: now, actorUid: uid, relatedId: requestId
        });
      });
      output = { success: true }; break;
    }
    case 'respondFollow': {
      requireStudent(profile);
      const requestId = clean(body.requestId, 300), decision = clean(body.decision, 20), requestRef = recordRef('followRequests', requestId);
      if (!['accept', 'reject'].includes(decision)) throw new HttpsError('invalid-argument', 'Yanıt geçersiz.');
      const accepted = decision === 'accept';
      const notificationRef = db.collection('notifications').doc();
      const actor = publicStudent(uid, profile);
      let fromUid = '';
      await db.runTransaction(async tx => {
        const snap = await tx.get(requestRef);
        if (!snap.exists) throw new HttpsError('not-found', 'Takip isteği bulunamadı.');
        const requestData = snap.data();
        if (requestData.toUid !== uid) throw new HttpsError('permission-denied', 'Bu takip isteği sana ait değil.');
        if (requestData.status !== 'pending') throw new HttpsError('failed-precondition', 'Bu istek artık yanıtlanamıyor.');
        fromUid = String(requestData.fromUid || '');
        const now = timestamp();
        tx.update(requestRef, { status: accepted ? 'accepted' : 'rejected', updatedAt: now });
        if (accepted) {
          const members = [uid, fromUid].sort();
          tx.set(recordRef('friendships', members.join('__')), { members, userA: members[0], userB: members[1], createdAt: now });
        }
        tx.set(notificationRef, {
          userId: fromUid,
          title: accepted ? 'Takip isteğin kabul edildi' : 'Takip isteğin reddedildi',
          body: `${actor.username || actor.name} takip isteğine ${accepted ? 'olumlu' : 'olumsuz'} yanıt verdi.`,
          type: accepted ? 'follow-accepted' : 'follow-rejected', read: false, createdAt: now, actorUid: uid, relatedId: requestId
        });
      });
      output = { success: true, status: accepted ? 'accepted' : 'rejected' }; break;
    }
    case 'getStudentSocial': {
      requireStudent(profile);
      // Query only documents connected to this user instead of scanning entire collections.
      const [incomingSnap, outgoingSnap, friendSnap, sentSnap, receivedSnap] = await Promise.all([
        db.collection('followRequests').where('toUid', '==', uid).get(),
        db.collection('followRequests').where('fromUid', '==', uid).get(),
        db.collection('friendships').where('members', 'array-contains', uid).get(),
        db.collection('pointTransfers').where('fromUid', '==', uid).get(),
        db.collection('pointTransfers').where('toUid', '==', uid).get()
      ]);
      const incomingRows = incomingSnap.docs.filter(doc => doc.data().status === 'pending').map(doc => ({ id: doc.id, data: doc.data() }));
      const outgoingRows = outgoingSnap.docs.filter(doc => doc.data().status === 'pending').map(doc => ({ id: doc.id, data: doc.data() }));
      const friendUids = friendSnap.docs.map(doc => asArray(doc.data().members).find(member => member !== uid)).filter(Boolean);
      const transferRows = [...new Map([...sentSnap.docs, ...receivedSnap.docs].map(doc => [doc.id, { id: doc.id, data: doc.data() }])).values()];
      const ids = [...new Set([...incomingRows.map(row => String(row.data.fromUid)), ...outgoingRows.map(row => String(row.data.toUid)), ...friendUids])].filter(id => id !== uid);
      const profiles = new Map();
      for (const otherId of ids) {
        const snap = await userRef(otherId).get();
        if (snap.exists) profiles.set(otherId, publicStudent(otherId, snap.data()));
      }
      const hidePendingPoints = student => student ? { ...student, points: undefined, pointsVisible: false, badges: ['👋 Öğrenci'] } : student;
      const incoming = incomingRows.map(row => ({ id: row.id, ...row.data, student: hidePendingPoints(profiles.get(String(row.data.fromUid)) || { uid: row.data.fromUid, name: row.data.fromName || 'Öğrenci' }) }));
      const outgoing = outgoingRows.map(row => ({ id: row.id, ...row.data, student: hidePendingPoints(profiles.get(String(row.data.toUid)) || { uid: row.data.toUid, name: row.data.toName || 'Öğrenci' }) }));
      const friends = friendUids.map(id => profiles.get(id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      const transfers = transferRows.filter(row => row.data.fromUid === uid || row.data.toUid === uid)
        .sort((a, b) => Number(b.data.createdAt?.seconds || 0) - Number(a.data.createdAt?.seconds || 0)).slice(0, 40)
        .map(row => {
          const direction = row.data.fromUid === uid ? 'out' : 'in';
          const otherId = direction === 'out' ? row.data.toUid : row.data.fromUid;
          return { id: row.id, ...row.data, direction, other: profiles.get(String(otherId)) || { uid: otherId, name: direction === 'out' ? row.data.toName : row.data.fromName } };
        });
      output = { me: publicStudent(uid, profile), incoming, outgoing, friends, transfers }; break;
    }
    case 'sharePoints': {
      requireStudent(profile);
      const targetUid = clean(body.targetUid, 160), amount = Number(body.amount);
      if (!targetUid || targetUid === uid || !Number.isInteger(amount) || amount < 20 || amount > 100) throw new HttpsError('invalid-argument', '20–100 arasında tam sayı puan seç.');
      const transferId = newId();
      const notificationRef = db.collection('notifications').doc();
      let senderPoints = 0, receiverPoints = 0;
      await db.runTransaction(async tx => {
        const senderRef = userRef(uid), receiverRef = userRef(targetUid);
        const friendshipId = [uid, targetUid].sort().join('__');
        const [senderSnap, receiverSnap, friendshipSnap] = await Promise.all([tx.get(senderRef), tx.get(receiverRef), tx.get(recordRef('friendships', friendshipId))]);
        if (!senderSnap.exists || !receiverSnap.exists || receiverSnap.data().role !== 'student') throw new HttpsError('not-found', 'Öğrenci bulunamadı.');
        if (!friendshipSnap.exists || !asArray(friendshipSnap.data().members).includes(uid) || !asArray(friendshipSnap.data().members).includes(targetUid)) throw new HttpsError('failed-precondition', 'Puan paylaşmak için takip isteğinin kabul edilmiş olması gerekir.');
        const sender = senderSnap.data(), receiver = receiverSnap.data();
        const balance = Number(sender.points || 0);
        if (balance < amount) throw new HttpsError('failed-precondition', 'Bu kadar puanın yok.');
        senderPoints = balance - amount;
        receiverPoints = Number(receiver.points || 0) + amount;
        const now = timestamp();
        tx.update(senderRef, { points: senderPoints, updatedAt: now });
        tx.update(receiverRef, { points: receiverPoints, updatedAt: now });
        tx.set(recordRef('pointTransfers', transferId), {
          fromUid: uid, toUid: targetUid, fromName: sender.name || 'Öğrenci', toName: receiver.name || 'Öğrenci',
          amount, createdAt: now
        });
        tx.set(notificationRef, {
          userId: targetUid, title: 'Puan hediyesi aldın! ⭐',
          body: `${clean(sender.username || sender.name || 'Bir öğrenci', 80)} sana ${amount} puan gönderdi.`,
          type: 'points-received', read: false, createdAt: now, actorUid: uid, amount, relatedId: transferId
        });
      });
      output = { success: true, amount, senderPoints, receiverPoints }; break;
    }
    case 'markStudentNotificationsRead': {
      requireStudent(profile);
      const rows = await db.collection('notifications').where('userId', '==', uid).limit(250).get();
      const unread = rows.docs.filter(row => row.data().read !== true);
      for (let start = 0; start < unread.length; start += 400) {
        const batch = db.batch();
        unread.slice(start, start + 400).forEach(row => batch.update(row.ref, { read: true, readAt: timestamp() }));
        await batch.commit();
      }
      output = { success: true, updated: unread.length }; break;
    }
    case 'deleteSelf': {
      const current = await userRef(uid).get();
      const username = normalizeUsername(current.data()?.username || current.data()?.usernameLower || '');
      if (username) {
        const claim = await usernameRef(username).get();
        if (claim.exists && claim.data().uid === uid) await usernameRef(username).delete();
      }
      await userRef(uid).delete();
      await adminAuth.deleteUser(uid);
      output = { success: true }; break;
    }
    default:
      throw new HttpsError('not-found', `Eğitim işlemi tanınmıyor: ${action || '(boş)'}`);
  }
  return output;
}

const actionNames = [
  'createTest', 'submitTest', 'getReadyTest', 'checkReadyTest', 'completeCourse',
  'setStudentGrade', 'updateStudentProfile', 'setUserRole', 'deleteCourse',
  'deleteLesson', 'deleteTest', 'migrateLegacyTests', 'seedCurriculum',
  'searchStudents', 'requestFollow', 'respondFollow', 'getStudentSocial',
  'sharePoints', 'markStudentNotificationsRead', 'deleteSelf'
];
for (const name of actionNames) exports[name] = callable(request => runAction(name, request));
