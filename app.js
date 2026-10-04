
import { auth, db, functions } from "./firebase.js";

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";
import { READY_CURRICULUM, READY_COURSES, READY_TESTS } from "./curriculum.js";


/* =========================================================
   BERAY - ORTAK YARDIMCILAR
========================================================= */

const $ = (id) => document.getElementById(id);

const path = window.location.pathname.toLowerCase();

const isIndex =
    path.endsWith("index.html") ||
    path === "/" ||
    path.endsWith("/");

const isStudent = path.endsWith("student.html");
const isTeacher = path.endsWith("teacher.html");

const callFunction = (name, data = {}) =>
    httpsCallable(functions, name)(data);

const CLASS_OPTIONS = ["5","6","7","8","9","10","11","12"];

function classLabel(value) {
    return value ? `${value}. Sınıf` : "Tüm Sınıflar";
}

function courseMatchesStudent(item) {
    const grade = String(item.grade || "");
    const selected = String(studentState.profile?.grade || "");
    return !grade || !selected || grade === selected;
}


function show(element) {
    if (element) element.classList.remove("hidden");
}


function hide(element) {
    if (element) element.classList.add("hidden");
}


function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function authErrorMessage(error) {

    const messages = {

        "auth/invalid-credential":
            "E-posta veya şifre yanlış.",

        "auth/email-already-in-use":
            "Bu e-posta zaten kayıtlı.",

        "auth/invalid-email":
            "Geçerli bir e-posta adresi gir.",

        "auth/weak-password":
            "Şifre en az 6 karakter olmalı.",

        "auth/network-request-failed":
            "İnternet bağlantısını kontrol et.",

        "auth/too-many-requests":
            "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.",

        "auth/operation-not-allowed":
            "E-posta/şifre ile kayıt Firebase Authentication'da etkin değil.",

        "auth/api-key-not-valid":
            "Firebase API anahtarı geçersiz. firebase.js ayarlarını kontrol et.",

        "auth/internal-error":
            "Firebase tarafında beklenmeyen bir hata oluştu. Konsol logunu kontrol et."

    };

    return messages[error.code]
        || error.message
        || "Bir hata oluştu.";

}


function toast(message, area = "student") {

    const element =
        area === "teacher"
            ? $("teacherToast")
            : $("studentToast");

    if (!element) return;

    element.textContent = message;

    element.classList.add("show");

    clearTimeout(element._timer);

    element._timer = setTimeout(() => {
        element.classList.remove("show");
    }, 2800);

}


/* =========================================================
   INDEX - GİRİŞ / KAYIT
========================================================= */

if (isIndex && $("loginForm")) {

    const loginTab = $("loginTab");
    const registerTab = $("registerTab");
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    loginTab?.addEventListener("click", () => {

        loginTab.classList.add("active");
        registerTab.classList.remove("active");

        show(loginForm);
        hide(registerForm);

        if ($("authTitle")) {
            $("authTitle").textContent = "Hoş Geldin";
        }

        if ($("authDesc")) {
            $("authDesc").textContent =
                "Beray Eğitim Platformu'na giriş yap";
        }

    });


    registerTab?.addEventListener("click", () => {

        registerTab.classList.add("active");
        loginTab.classList.remove("active");

        hide(loginForm);
        show(registerForm);

        if ($("authTitle")) {
            $("authTitle").textContent = "Hesap Oluştur";
        }

        if ($("authDesc")) {
            $("authDesc").textContent =
                "Beray ailesine katıl";
        }

    });


    /* GİRİŞ */

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const errorBox = $("loginError");

        hide(errorBox);

        const email =
            $("loginEmail")
                ?.value
                .trim()
                .toLowerCase();

        const password =
            $("loginPassword")
                ?.value || "";


        if (!email || !password) {

            if (errorBox) {

                errorBox.textContent =
                    "E-posta ve şifre gerekli.";

                show(errorBox);

            }

            return;
        }


        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        } catch (error) {

            console.error(
                "Giriş hatası:",
                error
            );

            if (errorBox) {

                errorBox.textContent =
                    authErrorMessage(error);

                show(errorBox);

            }

        }

    });


    /* KAYIT */

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const errorBox = $("authMessage");
        hide(errorBox);

        // Alanları doğrudan form üzerinden oku; böylece ID/value uyuşmazlığına karşı daha dayanıklı olur.
        const getValue = (id) => {
            const field = $(id);
            return field ? String(field.value ?? "").trim() : "";
        };

        const name = getValue("registerName");
        const email = getValue("registerEmail").toLowerCase();
        const password = $("registerPassword")?.value ?? "";
        const confirmPassword = $("registerPasswordConfirm")?.value ?? "";
        const terms = $("terms");

        const showError = (message, field = null) => {
            if (errorBox) {
                errorBox.textContent = message;
                show(errorBox);
            }
            field?.focus();
        };

        if (!name) {
            showError("Ad Soyad alanını doldur.", $("registerName"));
            return;
        }

        if (!email) {
            showError("E-posta alanını doldur.", $("registerEmail"));
            return;
        }

        if (!password) {
            showError("Şifre alanını doldur.", $("registerPassword"));
            return;
        }

        if (!confirmPassword) {
            showError("Şifre Tekrar alanını doldur.", $("registerPasswordConfirm"));
            return;
        }

        if (terms && !terms.checked) {
            showError("Kayıt olmak için kullanım şartlarını kabul et.", terms);
            return;
        }

        if (name.length < 2) {
            showError("Ad soyad en az 2 karakter olmalı.", $("registerName"));
            return;
        }

        if (password.length < 6) {
            showError("Şifre en az 6 karakter olmalı.", $("registerPassword"));
            return;
        }

        if (password !== confirmPassword) {
            showError("Şifreler eşleşmiyor.", $("registerPasswordConfirm"));
            return;
        }

        try {

            const credential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            const firebaseUser = credential.user;

            await updateProfile(firebaseUser, {
                displayName: name
            });

            await setDoc(
                doc(db, "users", firebaseUser.uid),
                {
                    uid: firebaseUser.uid,
                    name,
                    email,
                    role: "student",
                    points: 0,
                    completedLessons: [],
                    completedTests: [],
                    createdAt: serverTimestamp()
                }
            );

            window.location.href = "./student.html";

        } catch (error) {

            console.error("Kayıt hatası:", error);

            if (errorBox) {
                errorBox.textContent = authErrorMessage(error);
                show(errorBox);
            }
        }

    });


    /* ŞİFRE GÖSTER */

    $("showLoginPassword")?.addEventListener(
        "click",
        () => {

            const input =
                $("loginPassword");

            input.type =
                input.type === "password"
                    ? "text"
                    : "password";

        }
    );


    $("showRegisterPassword")?.addEventListener(
        "click",
        () => {

            const input =
                $("registerPassword");

            input.type =
                input.type === "password"
                    ? "text"
                    : "password";

        }
    );


    /* ŞİFRE SIFIRLAMA MODALI */

    $("forgotPassword")?.addEventListener(
        "click",
        () => {

            show($("forgotModal"));

            const email =
                $("loginEmail")
                    ?.value
                    ?.trim();

            if (email && $("resetEmail")) {
                $("resetEmail").value = email;
            }

        }
    );


    $("closeForgotModal")?.addEventListener(
        "click",
        () => hide($("forgotModal"))
    );


    $("forgotModal")?.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                $("forgotModal")
            ) {

                hide($("forgotModal"));

            }

        }
    );


    $("resetButton")?.addEventListener(
        "click",
        async () => {

            const email =
                $("resetEmail")
                    ?.value
                    ?.trim()
                    ?.toLowerCase();


            if (!email) {

                $("resetMessage").textContent =
                    "E-posta adresini gir.";

                return;

            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );


                $("resetMessage").textContent =
                    "Şifre yenileme bağlantısı gönderildi.";

            } catch (error) {

                $("resetMessage").textContent =
                    authErrorMessage(error);

            }

        }
    );

}


/* =========================================================
   OTURUM KONTROLÜ
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        try {

            if (!user) {

                if (isStudent) {
                    hide($("studentApp"));
                    hide($("studentLoading"));
                    location.href = "./index.html";
                }

                if (isTeacher) {
                    hide($("teacherApp"));
                    hide($("teacherLoading"));
                    location.href = "./index.html";
                }

                return;

            }


            const userSnapshot =
                await getDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    )
                );


            /*
             * Eski kullanıcıda profil yoksa
             * oluşturmayı dene.
             */
            if (!userSnapshot.exists()) {

                if (isIndex) {

                    await setDoc(
                        doc(
                            db,
                            "users",
                            user.uid
                        ),
                        {
                            uid:user.uid,
                            name:user.displayName || "Öğrenci",
                            email:user.email || "",
                            role:"student",
                            points:0,
                            completedLessons:[],
                            completedTests:[],
                            createdAt:serverTimestamp()
                        }
                    );

                    location.href =
                        "./student.html";

                    return;

                }

                await signOut(auth);

                return;

            }


            const profile =
                userSnapshot.data();


            /* GİRİŞ SAYFASINDAN */

            if (isIndex) {

                if (
                    profile.role === "teacher" ||
                    profile.role === "admin"
                ) {

                    location.href =
                        "./teacher.html";

                } else {

                    location.href =
                        "./student.html";

                }

                return;

            }


            /* ÖĞRENCİ */

            if (isStudent) {

                if (
                    profile.role !==
                    "student"
                ) {

                    location.href =
                        "./teacher.html";

                    return;

                }

                await initializeStudent(
                    user,
                    profile
                );

                return;

            }


            /* ÖĞRETMEN / ADMİN */

            if (isTeacher) {

                if (
                    profile.role !== "teacher" &&
                    profile.role !== "admin"
                ) {

                    location.href =
                        "./student.html";

                    return;

                }

                await initializeTeacher(
                    user,
                    profile
                );

            }

        } catch (error) {

            console.error(
                "Auth state hatası:",
                error
            );

            if (isStudent) {
                hide($("studentLoading"));
            }

            if (isTeacher) {
                hide($("teacherLoading"));
            }

        }

    }
);


/* =========================================================
   ÖĞRENCİ STATE
========================================================= */

const studentState = {

    user:null,

    profile:null,

    courses:[],

    lessons:[],

    tests:[],

    results:[],

    announcements:[]

};


/* =========================================================
   ÖĞRENCİ BAŞLAT
========================================================= */

async function initializeStudent(
    user,
    profile
) {

    hide($("studentLoading"));

    show($("studentApp"));

    studentState.user =
        user;

    studentState.profile =
        profile;


    const name =
        profile.name ||
        user.displayName ||
        "Öğrenci";


    const initial =
        name
            .charAt(0)
            .toUpperCase();


    if ($("studentName")) {

        $("studentName")
            .textContent =
            name;

    }


    if ($("studentAvatar")) {

        $("studentAvatar")
            .textContent =
            initial;

    }


    if ($("profileAvatar")) {

        $("profileAvatar")
            .textContent =
            initial;

    }


    if ($("profileName")) {

        $("profileName")
            .textContent =
            name;

    }


    if ($("profileEmail")) {

        $("profileEmail")
            .textContent =
            user.email || "";

    }


    if ($("profileEditName")) {
        $("profileEditName").value = profile.name || name || "";
    }
    if ($("profileEditGrade")) {
        $("profileEditGrade").value = profile.grade || "";
    }

    if ($("welcomeName")) {

        $("welcomeName")
            .textContent =
            name;

    }


    const renderClassControls = () => {
        const selected = String(studentState.profile?.grade || "");
        const setup = $("studentClassSetup");
        const select = $("studentClassSelect");
        const courseFilter = $("courseFilter");
        if (select) select.value = selected;
        if (setup) setup.classList.toggle("hidden", !!selected);
        if (courseFilter) {
            courseFilter.innerHTML = `<option value="">${escapeHTML(selected ? classLabel(selected) : "Sınıfım")}</option>` +
                CLASS_OPTIONS.filter(v => v !== selected).map(v => `<option value="${v}">${escapeHTML(classLabel(v))}</option>`).join("") +
                `<option value="all">Tüm Sınıflar</option>`;
            courseFilter.value = selected || "";
        }
    };

    $("saveProfile")?.addEventListener("click", async () => {
        const name = $("profileEditName")?.value?.trim() || "";
        const grade = $("profileEditGrade")?.value || "";
        if (!name || !CLASS_OPTIONS.includes(grade)) {
            toast("Ad soyad ve sınıfı doldur.");
            return;
        }
        try {
            const result = await callFunction("updateStudentProfile", { name, grade });
            studentState.profile = { ...studentState.profile, name: result.data.name, grade: result.data.grade };
            updateStudentIdentity();
            renderStudentCourses();
            renderStudentTests("all");
            toast("Profilin güncellendi. ✅");
        } catch (error) {
            console.error("Profil güncelleme:", error);
            toast(error?.message || "Profil güncellenemedi.");
        }
    });

    $("saveStudentClass")?.addEventListener("click", async () => {
        const grade = $("studentClassSelect")?.value || "";
        if (!CLASS_OPTIONS.includes(grade)) { toast("Önce sınıfını seç."); return; }
        try {
            await callFunction("setStudentGrade", { grade });
            studentState.profile = { ...studentState.profile, grade };
            renderClassControls();
            renderStudentCourses();
            renderStudentTests("all");
            toast(`${classLabel(grade)} seçildi.`);
        } catch (error) {
            console.error("Sınıf seçimi:", error);
            toast(error?.message || "Sınıf kaydedilemedi.");
        }
    });

    $("courseFilter")?.addEventListener("change", renderStudentCourses);
    document.querySelectorAll("[data-class-filter]").forEach(button => {
        button.onclick = () => {
            document.querySelectorAll("[data-class-filter]").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            renderStudentTests("all", button.dataset.classFilter);
        };
    });

    $("studentLogout").onclick =
        () => signOut(auth);


    $("studentMenu").onclick =
        () => {

            $("studentSidebar")
                ?.classList
                .toggle("open");

        };


    document
        .querySelectorAll(".student-nav")
        .forEach(button => {

            button.onclick = () => {

                openStudentPage(
                    button.dataset.page,
                    button
                );

            };

        });


    document
        .querySelectorAll("[data-go-page]")
        .forEach(button => {

            button.onclick = () => {

                openStudentPage(
                    button.dataset.goPage
                );

            };

        });


    $("backFromQuiz")?.addEventListener(
        "click",
        () => openStudentPage("tests")
    );


    $("courseSearch")?.addEventListener(
        "input",
        renderStudentCourses
    );


    document
        .querySelectorAll("[data-test-filter]")
        .forEach(button => {

            button.onclick = () => {

                document
                    .querySelectorAll(
                        "[data-test-filter]"
                    )
                    .forEach(
                        b =>
                            b.classList
                            .remove("active")
                    );


                button
                    .classList
                    .add("active");


                renderStudentTests(
                    button.dataset.testFilter
                );

            };

        });


    $("notificationButton")?.addEventListener(
        "click",
        () =>
            show(
                $("notificationPanel")
            )
    );


    $("closeNotificationPanel")
        ?.addEventListener(
            "click",
            () =>
                hide(
                    $("notificationPanel")
                )
        );


    await refreshStudent();

}


/* =========================================================
   ÖĞRENCİ SAYFALARI
========================================================= */

function openStudentPage(
    pageName,
    button = null
) {

    document
        .querySelectorAll(".student-page")
        .forEach(section => {

            section.classList
                .remove("active");

        });


    const section =
        $("student-" + pageName);


    if (section) {

        section
            .classList
            .add("active");

    }


    document
        .querySelectorAll(".student-nav")
        .forEach(item => {

            item.classList
                .remove("active");

        });


    if (button) {

        button
            .classList
            .add("active");

    } else {

        document
            .querySelector(
                `.student-nav[data-page="${pageName}"]`
            )
            ?.classList
            .add("active");

    }


    const titles = {

        dashboard:
            "Ana Sayfa",

        courses:
            "Dersler",

        tests:
            "Testler",

        results:
            "Sonuçlarım",

        announcements:
            "Duyurular",

        profile:
            "Profilim",

        quiz:
            "Test"

    };


    if ($("studentPageTitle")) {

        $("studentPageTitle")
            .textContent =
            titles[pageName] ||
            "Beray";

    }


    $("studentSidebar")
        ?.classList
        .remove("open");

}


/* =========================================================
   ÖĞRENCİ VERİLERİNİ ÇEK
========================================================= */

async function refreshStudent() {

    const uid =
        auth.currentUser?.uid;


    if (!uid) return;


    try {

        const userSnapshot =
            await getDoc(
                doc(
                    db,
                    "users",
                    uid
                )
            );


        if (!userSnapshot.exists()) {
            await signOut(auth);
            return;
        }


        studentState.profile =
            userSnapshot.data();


        const coursesSnapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        "courses"
                    ),
                    orderBy(
                        "createdAt",
                        "desc"
                    ),
                    limit(100)
                )
            );


        const lessonsSnapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        "lessons"
                    ),
                    orderBy(
                        "createdAt",
                        "desc"
                    ),
                    limit(200)
                )
            );


        const testsSnapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        "tests"
                    ),
                    orderBy(
                        "createdAt",
                        "desc"
                    ),
                    limit(100)
                )
            );


        const resultsSnapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        "results"
                    ),
                    where(
                        "studentId",
                        "==",
                        uid
                    ),
                    limit(200)
                )
            );


        const announcementSnapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        "announcements"
                    ),
                    orderBy(
                        "createdAt",
                        "desc"
                    ),
                    limit(50)
                )
            );


        studentState.courses =
            coursesSnapshot.docs.map(
                item => ({
                    id:item.id,
                    ...item.data()
                })
            );


        studentState.lessons =
            lessonsSnapshot.docs.map(
                item => ({
                    id:item.id,
                    ...item.data()
                })
            );


        studentState.tests =
            testsSnapshot.docs.map(
                item => ({
                    id:item.id,
                    ...item.data()
                })
            );


        studentState.results =
            resultsSnapshot.docs
                .map(
                    item => ({
                        id:item.id,
                        ...item.data()
                    })
                )
                .sort(
                    (a,b) =>
                        (
                            b.createdAt?.seconds || 0
                        )
                        -
                        (
                            a.createdAt?.seconds || 0
                        )
                );


        studentState.announcements =
            announcementSnapshot.docs.map(
                item => ({
                    id:item.id,
                    ...item.data()
                })
            );


        updateStudentDashboard();

        const setup = $("studentClassSetup");
        const classSelect = $("studentClassSelect");
        const selectedGrade = String(studentState.profile?.grade || "");
        if (setup && classSelect) { classSelect.value = selectedGrade; setup.classList.toggle("hidden", !!selectedGrade); }
        const courseFilter = $("courseFilter");
        if (courseFilter) {
            courseFilter.innerHTML = `<option value="">${escapeHTML(selectedGrade ? classLabel(selectedGrade) : "Sınıfım")}</option>` +
                CLASS_OPTIONS.filter(v => v !== selectedGrade).map(v => `<option value="${v}">${escapeHTML(classLabel(v))}</option>`).join("") +
                `<option value="all">Tüm Sınıflar</option>`;
            courseFilter.value = selectedGrade || "";
        }
        renderStudentCourses();

        renderStudentTests("all");

        renderStudentResults();

        renderStudentAnnouncements();

        updateStudentNotifications();

    } catch (error) {

        console.error(
            "Öğrenci verileri:",
            error
        );

        toast(
            "Veriler yüklenirken hata oluştu."
        );

    }

}


/* =========================================================
   ÖĞRENCİ DASHBOARD
========================================================= */

function updateStudentDashboard() {

    const profile =
        studentState.profile || {};


    const lessons =
        (
            profile.completedLessons ||
            []
        ).length;


    const tests =
        (
            profile.completedTests ||
            []
        ).length;


    const results =
        studentState.results;


    const average =
        results.length
            ? Math.round(
                results.reduce(
                    (sum,item) =>
                        sum +
                        Number(
                            item.score || 0
                        ),
                    0
                ) /
                results.length
            )
            : 0;


    const values = {

        dashboardLessons:
            lessons,

        dashboardTests:
            tests,

        dashboardAverage:
            average + "%",

        dashboardPoints:
            profile.points || 0,

        profilePoints:
            profile.points || 0,

        profileLessons:
            lessons,

        profileTests:
            tests

    };


    Object
        .entries(values)
        .forEach(
            ([id,value]) => {

                if ($(id)) {

                    $(id)
                        .textContent =
                        value;

                }

            }
        );

}


/* =========================================================
   HAZIR MÜFREDAT
========================================================= */

function renderReadyCurriculumCard(item) {
    const topics = item.topics.map(topic => `<li>${escapeHTML(topic)}</li>`).join("");
    const quiz = (item.quiz || []).map((q, i) => `
        <div class="card" style="padding:12px;margin-top:8px">
            <strong>${i + 1}. ${escapeHTML(q[0])}</strong>
            <details style="margin-top:6px">
                <summary>Cevabı göster</summary>
                <p class="muted" style="margin:8px 0 0">${escapeHTML(q[1])}</p>
            </details>
        </div>`).join("");
    return `
        <article class="card ready-course-card">
            <div class="card-icon">📘</div>
            <span class="eyebrow">${escapeHTML(classLabel(item.grade))} · ${escapeHTML(item.unit)} · ${escapeHTML(item.subject)}</span>
            <h3>${escapeHTML(item.title)}</h3>
            <p class="muted">${escapeHTML(item.summary)}</p>
            ${item.funTip ? `<div class="card" style="padding:10px;margin-top:8px"><strong>${escapeHTML(item.funTip)}</strong></div>` : ""}

            <details open>
                <summary><strong>🧠 Beray'ın Kolay Anlatımı</strong></summary>
                <p class="muted" style="margin-top:10px">${escapeHTML(item.explanation)}</p>
                <strong>Bilmen gerekenler</strong>
                <ul class="muted" style="padding-left:20px">${topics}</ul>
                <strong>💡 Mini örnekler</strong>
                <p class="muted" style="margin-top:6px">${escapeHTML(item.example || "")}</p>
                ${(item.examples || []).slice(0, 6).map((example, i) => `<div class="card" style="padding:10px;margin-top:6px"><strong>${i + 1}.</strong> ${escapeHTML(example)}</div>`).join("")}
            </details>

            <details>
                <summary><strong>📝 Mini Test</strong></summary>
                <div style="margin-top:8px">${quiz || '<p class="muted">Bu ünite için doğrulanmış mini test henüz eklenmedi.</p>'}</div>
            </details>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                <a class="ghost-button" href="${escapeHTML(item.source)}" target="_blank" rel="noopener noreferrer">📚 MEB Programı</a>
                ${item.videoUrl ? `<a class="ghost-button" href="${escapeHTML(item.videoUrl)}" target="_blank" rel="noopener noreferrer">▶ Resmî Videolar</a>` : ""}
                ${item.fileUrl ? `<a class="ghost-button" href="${escapeHTML(item.fileUrl)}" target="_blank" rel="noopener noreferrer">📄 Resmî Ders Kitapları</a>` : ""}
            </div>
            <small class="muted" style="display:block;margin-top:10px">Resmî PDF/video dosyasına özel bağlantı doğrulanmadığında tahmin yapılmaz; düğmeler MEB'in resmî kataloglarına gider.</small>
        </article>`;
}

/* =========================================================
   DERSLER
========================================================= */

function renderStudentCourses() {

    const container =
        $("studentCourses");


    if (!container) return;


    const search =
        (
            $("courseSearch")
                ?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const selectedFilter = $("courseFilter")?.value || String(studentState.profile?.grade || "");
    const courses =
        studentState.courses
            .filter(course => {
                const grade = String(course.grade || "");
                return selectedFilter === "all" || !selectedFilter || !grade || grade === selectedFilter;
            })
            .filter(
                course => {

                    const title =
                        String(
                            course.title || ""
                        )
                        .toLowerCase();


                    const description =
                        String(
                            course.description || ""
                        )
                        .toLowerCase();


                    return !search ||
                        title.includes(search) ||
                        description.includes(search);

                }
            );


    const completed =
        studentState.profile
            ?.completedLessons ||
        [];


    const makeCard =
        course => `

        <article class="card">

            <div class="card-icon">
                ${escapeHTML(course.icon || "📚")}
            </div>
            <span class="eyebrow">${escapeHTML(classLabel(course.grade))}</span>
            <h3>
                ${escapeHTML(
                    course.title ||
                    "Ders"
                )}
            </h3>

            <p class="muted">
                ${escapeHTML(
                    course.description ||
                    ""
                )}
            </p>

            ${
                course.videoUrl
                    ? `
                    <a
                        class="ghost-button"
                        href="${escapeHTML(
                            course.videoUrl
                        )}"
                        target="_blank"
                        rel="noopener noreferrer">

                        ▶ Videoyu Aç

                    </a>
                    `
                    : ""
            }

            ${
                course.fileUrl
                    ? `
                    <a
                        class="ghost-button"
                        href="${escapeHTML(
                            course.fileUrl
                        )}"
                        target="_blank"
                        rel="noopener noreferrer">

                        📄 PDF'yi Aç

                    </a>
                    `
                    : ""
            }

            ${course.wordwallUrl ? `<a class="ghost-button" href="${escapeHTML(course.wordwallUrl)}" target="_blank" rel="noopener noreferrer">🎮 Wordwall</a>` : ""}

            <button
                class="ghost-button"
                data-complete-course="${course.id}">

                ${
                    completed.includes(course.id)
                        ? "Tamamlandı ✓"
                        : "Dersi Tamamla"
                }

            </button>

        </article>

    `;


    const ready = READY_CURRICULUM.filter(item => {
        if (selectedFilter !== "all" && selectedFilter && String(item.grade) !== String(selectedFilter)) return false;
        return !search || item.title.toLowerCase().includes(search) || item.summary.toLowerCase().includes(search) || item.subject.toLowerCase().includes(search);
    });

    const courseItems = [
        ...courses.map(course => ({ grade: String(course.grade || ""), html: makeCard(course) })),
        ...ready.map(item => ({ grade: String(item.grade || ""), html: renderReadyCurriculumCard(item) }))
    ];
    const groups = {};
    courseItems.forEach(item => { (groups[item.grade || "all"] ||= []).push(item); });
    const groupKeys = Object.keys(groups).sort((a, b) => {
        if (a === "all") return 1;
        if (b === "all") return -1;
        return Number(a) - Number(b);
    });
    container.innerHTML =
        groupKeys.map(key => `
            <div style="grid-column:1/-1">
                <div class="section-head" style="margin-top:16px;margin-bottom:4px">
                    <div><span class="kicker">🎓 SINIF</span><h2>${escapeHTML(key === "all" ? "Tüm Sınıflar" : classLabel(key))}</h2></div>
                </div>
            </div>
            ${groups[key].map(item => item.html).join("")}
        `).join("")
        ||
        `
        <div class="card">

            <h3>
                Ders bulunamadı
            </h3>

            <p class="muted">
                Henüz yayınlanmış ders bulunmuyor.
            </p>

        </div>
        `;


    if ($("dashboardCourses")) {

        $("dashboardCourses").innerHTML =
            studentState.courses
                .slice(0,3)
                .map(makeCard)
                .join("")
            ||
            `
            <div class="card">

                <h3>
                    Henüz ders yok
                </h3>

                <p class="muted">
                    Öğretmenin ders eklediğinde
                    burada görünecek.
                </p>

            </div>
            `;

    }


    document
        .querySelectorAll(
            "[data-complete-course]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        completeStudentCourse(
                            button
                                .dataset
                                .completeCourse
                        );

            }
        );

}


async function completeStudentCourse(courseId) {

    if (!auth.currentUser?.uid || !courseId) return;

    try {
        const result = await callFunction("completeCourse", { courseId });
        toast(
            result.data?.alreadyCompleted
                ? "Bu ders zaten tamamlandı."
                : "Ders tamamlandı. +10 puan ⭐"
        );
        await refreshStudent();
    } catch (error) {
        console.error("Ders tamamlama:", error);
        toast(error?.message || "Ders tamamlanamadı.");
    }
}


/* =========================================================
   TESTLER
========================================================= */

function renderStudentTests(
    filter = "all",
    classMode = "mine"
) {

    const container =
        $("studentTests");


    if (!container) return;


    const results =
        studentState.results;


    const firestoreTests = Array.isArray(studentState.tests) ? studentState.tests : [];
    const selectedGrade = String(studentState.profile?.grade || "");
    const readyTests = READY_TESTS.filter(test => !selectedGrade || String(test.grade) === selectedGrade);
    const mergedTests = [...readyTests, ...firestoreTests];

    let tests = mergedTests.filter(test => {
        const grade = String(test.grade || "");
        const selected = String(studentState.profile?.grade || "");
        return classMode !== "mine" || !selected || !grade || grade === selected;
    });


    if (filter === "new") {

        tests =
            tests.filter(
                test =>
                    test.isReadyCurriculumTest ||
                    !results.some(
                        result =>
                            result.testId ===
                            test.id
                    )
            );

    }


    if (filter === "done") {

        tests =
            tests.filter(
                test =>
                    !test.isReadyCurriculumTest &&
                    results.some(
                        result =>
                            result.testId ===
                            test.id
                    )
            );

    }


    container.innerHTML =
        tests
            .map(
                test => {

                    const previous =
                        results.find(
                            result =>
                                result.testId ===
                                test.id
                        );


                    return `

                    <article class="test-item">

                        <div>

                            <span class="eyebrow">
                                BERAY TEST
                            </span>

                            <h3>
                                ${escapeHTML(
                                    `${test.isReadyCurriculumTest ? "🧠 " : ""}${test.title || "Test"}`
                                )}
                            </h3>

                            <p class="muted">
                                ${escapeHTML(
                                    test.description ||
                                    ""
                                )}
                            </p>

                            <small class="muted">

                                ${
                                    (
                                        test.questions ||
                                        []
                                    ).length
                                }
                                soru

                            </small>

                        </div>


                        <div
                            class="test-action">

                            ${
                                previous
                                ?
                                `
                                <span class="score-pill">

                                    Sonuç:
                                    ${previous.score}%

                                </span>
                                `
                                :
                                ""
                            }


                            <button
                                class="primary-button"
                                data-start-test="${test.id}">

                                ${
                                    previous
                                        ? "Tekrar Çöz"
                                        : "Teste Başla"
                                }

                            </button>

                        </div>

                    </article>

                    `;

                }
            )
            .join("")
        ||
        `
        <div class="card">

            <h3>
                Test bulunamadı
            </h3>

            <p class="muted">
                Henüz yayınlanmış test yok.
            </p>

        </div>
        `;


    document
        .querySelectorAll(
            "[data-start-test]"
        )
        .forEach(button => {

            button.onclick =
                () => {

                    const test =
                        [...READY_TESTS, ...studentState.tests]
                            .find(
                                item =>
                                    item.id ===
                                    button.dataset
                                        .startTest
                            );


                    startStudentQuiz(
                        test
                    );

                };

        });


    if ($("dashboardTestsList")) {

        $("dashboardTestsList")
            .innerHTML =
            [...READY_TESTS, ...studentState.tests]
                .filter(test => !studentState.profile?.grade || String(test.grade || "") === String(studentState.profile.grade || ""))
                .slice(0,3)
                .map(
                    test => `

                    <article
                        class="test-item">

                        <div>

                            <h3>
                                ${escapeHTML(
                                    `${test.isReadyCurriculumTest ? "🧠 " : ""}${test.title}`
                                )}
                            </h3>

                            <p class="muted">
                                ${
                                    (
                                        test.questions
                                        || []
                                    ).length
                                } soru
                            </p>

                        </div>

                        <button
                            class="primary-button"
                            data-dashboard-test="${test.id}">

                            Başla

                        </button>

                    </article>

                    `
                )
                .join("");

        document
            .querySelectorAll(
                "[data-dashboard-test]"
            )
            .forEach(button => {

                button.onclick =
                    () => {

                        const test =
                            [...READY_TESTS, ...studentState.tests]
                                .find(
                                    item =>
                                        item.id ===
                                        button.dataset
                                            .dashboardTest
                                );

                        startStudentQuiz(test);

                    };

            });

    }

}


/* =========================================================
   QUIZ
========================================================= */

async function startStudentQuiz(test) {

    const isReadyTest = Boolean(test?.isReadyCurriculumTest);

    if (!test || !Array.isArray(test.questions) || !test.questions.length) {
        toast("Bu testte henüz soru yok.");
        return;
    }

    openStudentPage("quiz");

    let currentQuestion = 0;
    const answers = [];
    let locked = false;

    const renderQuestion = () => {
        locked = false;
        const question = test.questions[currentQuestion];
        const total = test.questions.length;

        $("quizBox").innerHTML = `
            <div class="quiz-top">
                <div>
                    <span class="eyebrow">TEST</span>
                    <h1>${escapeHTML(test.title)}</h1>
                    ${test.joke ? `<p class="muted" style="margin-top:6px">🥶 ${escapeHTML(test.joke)}</p>` : ""}
                </div>
                <strong>${currentQuestion + 1} / ${total}</strong>
            </div>
            <div class="quiz-progress">
                <div class="quiz-progress-bar" style="width:${((currentQuestion + 1) / total) * 100}%;"></div>
            </div>
            <div class="quiz-question">
                <h2>${escapeHTML(question.question)}</h2>
                <div class="quiz-answers">
                    ${(question.options || []).map((option, index) => `
                        <button class="answer" data-answer="${index}">
                            <span>${String.fromCharCode(65 + index)}</span>
                            ${escapeHTML(option)}
                        </button>
                    `).join("")}
                </div>
            </div>
        `;

        document.querySelectorAll("[data-answer]").forEach(button => {
            button.onclick = () => {
                if (locked) return;
                locked = true;

                const selected = Number(button.dataset.answer);
                answers[currentQuestion] = selected;

                document.querySelectorAll("[data-answer]").forEach(item => {
                    item.disabled = true;
                    if (Number(item.dataset.answer) === selected) item.classList.add("selected");
                });

                const next = document.createElement("button");
                next.className = "primary-button";
                next.style.marginTop = "20px";
                next.textContent = currentQuestion === total - 1 ? "Testi Bitir" : "Sonraki Soru";
                next.onclick = () => {
                    currentQuestion++;
                    if (currentQuestion < total) renderQuestion();
                    else finishQuiz();
                };
                $("quizBox").appendChild(next);
            };
        });
    };

    const finishQuiz = async () => {
        const total = test.questions.length;
        if (!auth.currentUser?.uid) return;

        try {
            $("quizBox").innerHTML = `
                <div class="quiz-result">
                    <div class="result-icon">⏳</div>
                    <h1>Sonuç hesaplanıyor…</h1>
                    <p class="muted">Cevapların güvenli şekilde kontrol ediliyor.</p>
                </div>
            `;

            let data;
            if (isReadyTest) {
                const correct = answers.reduce((count, value, index) => count + (Number(value) === Number(test.questions[index].correctAnswer) ? 1 : 0), 0);
                data = {
                    score: Math.round((correct / test.questions.length) * 100),
                    correct,
                    wrong: test.questions.length - correct,
                    pointsAwarded: 0
                };
            } else {
                const result = await callFunction("submitTest", { testId: test.id, answers });
                data = result.data || {};
            }
            const score = Number(data.score || 0);
            const correct = Number(data.correct || 0);
            const pointsAwarded = Number(data.pointsAwarded || 0);
            const wrongFocus = isReadyTest
                ? [...new Set(test.questions
                    .map((q, index) => Number(answers[index]) !== Number(q.correctAnswer) ? q.focus : "")
                    .filter(Boolean))]
                : [];

            const feedback = score >= 90
                ? "🔥 Konuyu çok sağlam kavramışsın. Şimdi zorlayıcı sorulara geçebilirsin."
                : score >= 80
                    ? "💪 Temel çok iyi. Birkaç ayrıntıyı daha oturtursan konu iyice kapanır."
                    : score >= 60
                        ? "🧠 Konunun ana fikri var ama bazı noktalar karışıyor. Özellikle yanlış yaptığın başlıklara tekrar bak."
                        : "📚 Bu konu için kısa bir tekrar şart. Önce özet noktaları oku, sonra testi yeniden çöz.";
            const focusText = wrongFocus.length
                ? `<p class="muted" style="margin-top:10px"><strong>🔎 Şunlara iyi bak:</strong> ${escapeHTML(wrongFocus.slice(0, 4).join(" • "))}</p>`
                : `<p class="muted" style="margin-top:10px">✅ Yanlış odak alanı çıkmadı. Konuyu bir kez daha kendi cümlelerinle anlatmayı dene.</p>`;

            $("quizBox").innerHTML = `
                <div class="quiz-result">
                    <div class="result-icon">${score >= 80 ? "🏆" : score >= 50 ? "⭐" : "📚"}</div>
                    <h1>Test Tamamlandı</h1>
                    <p class="muted">${correct} / ${total} doğru cevap • ${total - correct} yanlış</p>
                    <strong class="big-score">${score}%</strong>
                    <p>${escapeHTML(feedback)}</p>
                    ${focusText}
                    ${test.joke ? `<p class="yellow-text">🥶 ${escapeHTML(test.joke)}</p>` : ""}
                    ${isReadyTest ? '<p class="yellow-text">🧠 Öğrenme testi — amaç konuyu gerçekten kavramanı görmek.</p>' : `<p class="yellow-text">+${pointsAwarded} puan</p>`}
                    <button id="quizReturn" class="primary-button">Testlere Dön</button>
                </div>
            `;

            $("quizReturn").onclick = async () => {
                await refreshStudent();
                openStudentPage("tests");
            };
        } catch (error) {
            console.error("Test gönderme:", error);
            $("quizBox").innerHTML = `
                <div class="quiz-result">
                    <div class="result-icon">⚠️</div>
                    <h1>Test gönderilemedi</h1>
                    <p class="muted">${escapeHTML(error?.message || "Beklenmeyen bir hata oluştu.")}</p>
                    <button id="quizRetry" class="primary-button">Tekrar Dene</button>
                </div>
            `;
            $("quizRetry").onclick = renderQuestion;
        }
    };

    renderQuestion();
}


/* =========================================================
   SONUÇLAR
========================================================= */

function renderStudentResults() {

    const results =
        studentState.results;


    const scores =
        results.map(
            result =>
                Number(
                    result.score || 0
                )
        );


    const average =
        scores.length
            ? Math.round(
                scores.reduce(
                    (a,b)=>a+b,
                    0
                ) /
                scores.length
            )
            : 0;


    const best =
        scores.length
            ? Math.max(...scores)
            : 0;


    if ($("resultAverage")) {
        $("resultAverage")
            .textContent =
            average + "%";
    }


    if ($("resultBest")) {
        $("resultBest")
            .textContent =
            best + "%";
    }


    if ($("resultTotal")) {
        $("resultTotal")
            .textContent =
            results.length;
    }


    if (!$("studentResults")) {
        return;
    }


    $("studentResults").innerHTML =
        results
            .map(
                result => `

                <article
                    class="test-item">

                    <div>

                        <h3>
                            ${escapeHTML(
                                result.testTitle
                            )}
                        </h3>

                        <p class="muted">

                            ${result.correct || 0}
                            doğru ·

                            ${result.wrong || 0}
                            yanlış

                        </p>

                    </div>

                    <strong>
                        ${result.score || 0}%
                    </strong>

                </article>

            `
            )
            .join("")
        ||
        `
        <div class="card">

            <h3>
                Henüz sonuç yok
            </h3>

            <p class="muted">
                Bir test çözdüğünde sonuçların burada görünecek.
            </p>

        </div>
        `;

}


/* =========================================================
   DUYURULAR
========================================================= */

function renderStudentAnnouncements() {

    if (!$("studentAnnouncements")) {
        return;
    }


    $("studentAnnouncements").innerHTML =
        studentState.announcements
            .map(
                item => `

                <article
                    class="announcement-card">

                    <div
                        class="announcement-icon">

                        📢

                    </div>

                    <div>

                        <h3>
                            ${escapeHTML(
                                item.title
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                item.body
                            )}
                        </p>

                    </div>

                </article>

            `
            )
            .join("")
        ||
        `
        <div class="card">
            <h3>Henüz duyuru yok</h3>
        </div>
        `;

}


function updateStudentNotifications() {

    const count =
        studentState.announcements.length;


    if ($("announcementBadge")) {

        $("announcementBadge")
            .textContent =
            count;


        $("announcementBadge")
            .classList
            .toggle(
                "hidden",
                count === 0
            );

    }


    if ($("notificationCount")) {

        $("notificationCount")
            .textContent =
            count;


        $("notificationCount")
            .classList
            .toggle(
                "hidden",
                count === 0
            );

    }


    if ($("notificationList")) {

        $("notificationList").innerHTML =
            studentState
                .announcements
                .slice(0,10)
                .map(
                    item => `

                    <div
                        class="notification-item">

                        <strong>
                            ${escapeHTML(
                                item.title
                            )}
                        </strong>

                        <p>
                            ${escapeHTML(
                                item.body
                            )}
                        </p>

                    </div>

                `
                )
                .join("")
            ||
            `
            <div class="notification-empty">
                Bildirim yok.
            </div>
            `;

    }

}


/* =========================================================
   ÖĞRETMEN STATE
========================================================= */

const teacherState = {

    profile:null,

    courses:[],

    lessons:[],

    tests:[],

    students:[],

    results:[],

    announcements:[],

    users:[]

};


/* =========================================================
   ÖĞRETMEN BAŞLAT
========================================================= */

async function initializeTeacher(
    user,
    profile
) {

    hide($("teacherLoading"));

    show($("teacherApp"));


    teacherState.profile =
        profile;


    const name =
        profile.name ||
        user.displayName ||
        "Öğretmen";


    const initial =
        name
            .charAt(0)
            .toUpperCase();


    $("teacherName").textContent =
        name;


    $("dashboardTeacherName")
        .textContent =
        name.split(" ")[0];


    $("teacherAvatar")
        .textContent =
        initial;


    $("sidebarTeacherAvatar")
        .textContent =
        initial;


    $("sidebarTeacherName")
        .textContent =
        name;


    const role =
        profile.role === "admin"
            ? "Admin"
            : "Öğretmen";


    $("teacherRole").textContent =
        role;


    $("sidebarTeacherRole").textContent =
        role;


    $("teacherRoleLabel")
        .textContent =
        profile.role === "admin"
            ? "ADMİN PANELİ"
            : "ÖĞRETMEN PANELİ";


    if (
        profile.role ===
        "admin"
    ) {

        show(
            $("adminUsersNav")
        );

    }


    $("teacherLogout").onclick =
        () => signOut(auth);


    $("teacherMenu").onclick =
        () =>
            $("teacherSidebar")
                ?.classList
                .toggle("open");


    document
        .querySelectorAll(".teacher-nav")
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openTeacherPage(
                            button.dataset.page,
                            button
                        );

            }
        );


    document
        .querySelectorAll("[data-modal]")
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openTeacherModal(
                            button.dataset.modal
                        );

            }
        );


    $("closeModal")?.addEventListener(
        "click",
        () => hide($("modal"))
    );


    await refreshTeacher();

    $("refreshTeacherResults")?.addEventListener("click", async () => {
        try {
            await refreshTeacher();
            toast("Sonuçlar yenilendi. ✅", "teacher");
        } catch (error) {
            toast(error?.message || "Sonuçlar yenilenemedi.", "teacher");
        }
    });

}


/* =========================================================
   ÖĞRETMEN SAYFALARI
========================================================= */

function openTeacherPage(
    pageName,
    button = null
) {

    document
        .querySelectorAll(".teacher-page")
        .forEach(
            page =>
                page.classList
                    .remove("active")
        );


    $("teacher-" + pageName)
        ?.classList
        .add("active");


    document
        .querySelectorAll(".teacher-nav")
        .forEach(
            item =>
                item.classList
                    .remove("active")
        );


    if (button) {

        button.classList
            .add("active");

    }


    const titles = {

        dashboard:
            "Genel Bakış",

        courses:
            "Dersler",

        lessons:
            "Konular",

        tests:
            "Testler",

        students:
            "Öğrenciler",

        results:
            "Sonuçlar",

        announcements:
            "Duyurular",

        users:
            "Kullanıcılar"

    };


    $("teacherPageTitle")
        .textContent =
        titles[pageName] ||
        "Beray";


    if (pageName === "results") {
        refreshTeacher().catch(error => console.error("Sonuç yenileme:", error));
    }

    $("teacherSidebar")
        ?.classList
        .remove("open");

}


/* =========================================================
   ÖĞRETMEN VERİLERİ
========================================================= */

async function refreshTeacher() {

    const [
        coursesSnap,
        lessonsSnap,
        testsSnap,
        studentsSnap,
        resultsSnap,
        announcementsSnap
    ] = await Promise.all([


        getDocs(
            query(
                collection(
                    db,
                    "courses"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(100)
            )
        ),


        getDocs(
            query(
                collection(
                    db,
                    "lessons"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(200)
            )
        ),


        getDocs(
            query(
                collection(
                    db,
                    "tests"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(100)
            )
        ),


        getDocs(
            query(
                collection(
                    db,
                    "users"
                ),
                where(
                    "role",
                    "==",
                    "student"
                ),
                limit(500)
            )
        ),


        getDocs(
            query(
                collection(
                    db,
                    "results"
                ),
                limit(500)
            )
        ),


        getDocs(
            query(
                collection(
                    db,
                    "announcements"
                ),
                orderBy(
                    "createdAt",
                    "desc"
                ),
                limit(100)
            )
        )

    ]);


    teacherState.courses =
        coursesSnap.docs.map(
            item=>({
                id:item.id,
                ...item.data()
            })
        );


    teacherState.lessons =
        lessonsSnap.docs.map(
            item=>({
                id:item.id,
                ...item.data()
            })
        );


    teacherState.tests =
        testsSnap.docs.map(
            item=>({
                id:item.id,
                ...item.data()
            })
        );


    teacherState.students =
        studentsSnap.docs.map(
            item=>({
                id:item.id,
                ...item.data()
            })
        );


    teacherState.results =
        resultsSnap.docs
            .map(
                item=>({
                    id:item.id,
                    ...item.data()
                })
            )
            .sort(
                (a,b)=>
                    (
                        b.createdAt?.seconds ||
                        0
                    )
                    -
                    (
                        a.createdAt?.seconds ||
                        0
                    )
            );


    teacherState.announcements =
        announcementsSnap.docs.map(
            item=>({
                id:item.id,
                ...item.data()
            })
        );


    updateTeacherStats();

    renderTeacherCourses();

    renderTeacherLessons();

    renderTeacherTests();

    renderTeacherStudents();

    renderTeacherResults();

    renderTeacherAnnouncements();


    if (
        teacherState.profile?.role ===
        "admin"
    ) {

        await loadAdminUsers();

    }

}


/* =========================================================
   ÖĞRETMEN İSTATİSTİK
========================================================= */

function updateTeacherStats() {

    $("adminStudentCount")
        .textContent =
        teacherState.students.length;


    $("adminCourseCount")
        .textContent =
        teacherState.courses.length;


    $("adminTestCount")
        .textContent =
        teacherState.tests.length;


    $("adminResultCount")
        .textContent =
        teacherState.results.length;

}


/* =========================================================
   ÖĞRETMEN DERSLER
========================================================= */

function renderTeacherCourses() {

    const container =
        $("teacherCourses");


    if (!container) return;


    container.innerHTML =
        teacherState.courses
            .map(
                course => `

                <article class="card">

                    <div class="card-icon">

                        ${escapeHTML(
                            course.icon ||
                            "📚"
                        )}

                    </div>


                    <h3>
                        ${escapeHTML(
                            course.title
                        )}
                    </h3>


                    <p class="muted">
                        ${escapeHTML(
                            course.description ||
                            ""
                        )}
                    </p>


                    <button
                        class="ghost-button danger"
                        data-delete-course="${course.id}">

                        Dersi Sil

                    </button>

                </article>

            `
            )
            .join("")
        ||
        `
        <div class="card">

            <h3>
                Henüz ders yok
            </h3>

        </div>
        `;


    document
        .querySelectorAll(
            "[data-delete-course]"
        )
        .forEach(
            button => {

                button.onclick =
                    async () => {

                        if (
                            !confirm(
                                "Bu ders silinsin mi?"
                            )
                        ) return;


                        try {
                            await callFunction("deleteCourse", { courseId: button.dataset.deleteCourse });
                            toast("Ders ve bağlı konular silindi.", "teacher");
                            await refreshTeacher();
                        } catch (error) {
                            console.error("Ders silme:", error);
                            toast(error?.message || "Ders silinemedi.", "teacher");
                        }

                    };

            }
        );

}


/* =========================================================
   ÖĞRETMEN KONULARI
========================================================= */

function renderTeacherLessons() {

    const container =
        $("teacherLessons");


    if (!container) return;


    container.innerHTML =
        teacherState.lessons
            .map(
                lesson => {

                    const course =
                        teacherState.courses
                            .find(
                                item =>
                                    item.id ===
                                    lesson.courseId
                            );


                    return `

                    <article class="test-item">

                        <div>

                            <span class="eyebrow">

                                ${escapeHTML(
                                    course?.title ||
                                    "Ders"
                                )}

                            </span>


                            <h3>
                                ${escapeHTML(
                                    lesson.title
                                )}
                            </h3>


                            <p class="muted">
                                ${escapeHTML(
                                    lesson.body ||
                                    ""
                                )}
                            </p>


                            ${
                                lesson.videoUrl
                                ?
                                `
                                <a
                                    class="ghost-button"
                                    href="${escapeHTML(
                                        lesson.videoUrl
                                    )}"
                                    target="_blank">

                                    ▶ Video

                                </a>
                                `
                                :
                                ""
                            }


                            ${
                                lesson.fileUrl
                                ?
                                `
                                <a
                                    class="ghost-button"
                                    href="${escapeHTML(
                                        lesson.fileUrl
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer">

                                    📄 PDF

                                </a>
                                `
                                :
                                ""
                            }

                            ${lesson.wordwallUrl ? `<a class="ghost-button" href="${escapeHTML(lesson.wordwallUrl)}" target="_blank" rel="noopener noreferrer">🎮 Wordwall</a>` : ""}

                        </div>


                        <button
                            class="ghost-button danger"
                            data-delete-lesson="${lesson.id}">

                            Sil

                        </button>

                    </article>

                    `;

                }
            )
            .join("")
        ||
        `
        <div class="card">
            <h3>Henüz konu yok.</h3>
        </div>
        `;


    document
        .querySelectorAll(
            "[data-delete-lesson]"
        )
        .forEach(
            button => {

                button.onclick =
                    async () => {

                        if (
                            !confirm(
                                "Bu konu silinsin mi?"
                            )
                        ) return;


                        try {
                            await callFunction("deleteLesson", { lessonId: button.dataset.deleteLesson });
                            toast("Konu silindi.", "teacher");
                            await refreshTeacher();
                        } catch (error) {
                            console.error("Konu silme:", error);
                            toast(error?.message || "Konu silinemedi.", "teacher");
                        }

                    };

            }
        );

}


/* =========================================================
   ÖĞRETMEN TESTLER
========================================================= */

function renderTeacherTests() {

    const container =
        $("teacherTests");


    if (!container) return;


    container.innerHTML =
        teacherState.tests
            .map(
                test => `

                <article class="test-item">

                    <div>

                        <span class="eyebrow">
                            TEST
                        </span>

                        <h3>
                            ${escapeHTML(
                                test.title
                            )}
                        </h3>


                        <p class="muted">
                            ${escapeHTML(
                                test.description ||
                                ""
                            )}
                        </p>


                        <small>
                            ${
                                (
                                    test.questions ||
                                    []
                                ).length
                            }
                            soru
                        </small>

                    </div>


                    <button
                        class="ghost-button danger"
                        data-delete-test="${test.id}">

                        Testi Sil

                    </button>

                </article>

            `
            )
            .join("")
        ||
        `
        <div class="card">
            <h3>Henüz test yok.</h3>
        </div>
        `;


    document
        .querySelectorAll(
            "[data-delete-test]"
        )
        .forEach(
            button => {

                button.onclick =
                    async () => {

                        if (
                            !confirm(
                                "Bu test silinsin mi?"
                            )
                        ) return;


                        await callFunction("deleteTest", { testId: button.dataset.deleteTest });


                        toast(
                            "Test silindi.",
                            "teacher"
                        );


                        refreshTeacher();

                    };

            }
        );

}


/* =========================================================
   ÖĞRENCİLER
========================================================= */

function renderTeacherStudents() {

    const container =
        $("teacherStudents");


    if (!container) return;


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Öğrenci
                    </th>

                    <th>
                        E-posta
                    </th>

                    <th>
                        Puan
                    </th>

                    <th>
                        Ders
                    </th>

                    <th>
                        Test
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    teacherState.students
                        .map(
                            student => `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        student.name
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        student.email
                                    )}
                                </td>

                                <td>
                                    ${student.points || 0}
                                </td>

                                <td>
                                    ${
                                        (
                                            student.completedLessons
                                            ||
                                            []
                                        ).length
                                    }
                                </td>

                                <td>
                                    ${
                                        (
                                            student.completedTests
                                            ||
                                            []
                                        ).length
                                    }
                                </td>

                            </tr>

                        `
                        )
                        .join("")
                }

            </tbody>

        </table>

    `;

}


/* =========================================================
   SONUÇLAR
========================================================= */

function renderTeacherResults() {

    const container =
        $("teacherResults");


    if (!container) return;


    const scores =
        teacherState.results
            .map(
                result =>
                    Number(
                        result.score || 0
                    )
            );


    const average =
        scores.length
            ? Math.round(
                scores.reduce(
                    (a,b)=>a+b,
                    0
                ) /
                scores.length
            )
            : 0;


    const best =
        scores.length
            ? Math.max(...scores)
            : 0;


    $("teacherAverage")
        .textContent =
        average + "%";


    $("teacherBest")
        .textContent =
        best + "%";


    $("teacherTotalResults")
        .textContent =
        teacherState.results.length;


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Öğrenci
                    </th>

                    <th>
                        Test
                    </th>

                    <th>
                        Doğru
                    </th>

                    <th>
                        Yanlış
                    </th>

                    <th>
                        Başarı
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    teacherState.results
                        .map(
                            result => `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        result.studentName
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        result.testTitle
                                    )}
                                </td>

                                <td>
                                    ${result.correct || 0}
                                </td>

                                <td>
                                    ${result.wrong || 0}
                                </td>

                                <td>
                                    <strong>
                                        ${result.score || 0}%
                                    </strong>
                                </td>

                            </tr>

                        `
                        )
                        .join("")
                }

            </tbody>

        </table>

    `;

}


/* =========================================================
   DUYURULAR
========================================================= */

function renderTeacherAnnouncements() {

    const container =
        $("teacherAnnouncements");


    if (!container) return;


    container.innerHTML =
        teacherState.announcements
            .map(
                announcement => `

                <article
                    class="announcement-card">

                    <div
                        class="announcement-icon">

                        📢

                    </div>

                    <div>

                        <h3>
                            ${escapeHTML(
                                announcement.title
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                announcement.body
                            )}
                        </p>

                    </div>

                </article>

            `
            )
            .join("")
        ||
        `
        <div class="card">
            <h3>Henüz duyuru yok.</h3>
        </div>
        `;

}


/* =========================================================
   ADMIN KULLANICILAR
========================================================= */

async function loadAdminUsers() {

    const snapshot =
        await getDocs(
            collection(
                db,
                "users"
            )
        );


    teacherState.users =
        snapshot.docs.map(
            item => ({
                id:item.id,
                ...item.data()
            })
        );


    renderAdminUsers();

    $("migrateLegacyTests")?.addEventListener("click", async () => {
        const button = $("migrateLegacyTests");
        if (!button) return;
        if (!confirm("Eski testlerdeki cevap anahtarları güvenli alana taşınsın mı?")) return;

        button.disabled = true;
        button.textContent = "Taşınıyor…";
        try {
            const result = await callFunction("migrateLegacyTests");
            const count = Number(result.data?.migrated || 0);
            toast(`${count} eski test güvenli hale getirildi.`, "teacher");
        } catch (error) {
            console.error("Test migration:", error);
            toast(error?.message || "Migration başarısız.", "teacher");
        } finally {
            button.disabled = false;
            button.textContent = "🔒 Eski Testleri Güvenli Hale Getir";
        }
    });

}


function renderAdminUsers() {

    const container =
        $("teacherUsers");


    if (!container) return;


    container.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Ad
                    </th>

                    <th>
                        E-posta
                    </th>

                    <th>
                        Rol
                    </th>

                    <th>
                        İşlem
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    teacherState.users
                        .map(
                            user => `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        user.name
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        user.email
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        user.role
                                    )}
                                </td>

                                <td>

                                    ${
                                        user.id === auth.currentUser.uid
                                            ? "Mevcut hesap"
                                            : user.role === "admin"
                                                ? "Admin hesabı"
                                                : `
                                                <button
                                                    class="ghost-button"
                                                    data-change-role="${user.id}"
                                                    data-role="${user.role}">
                                                    ${user.role === "teacher" ? "Öğrenci Yap" : "Öğretmen Yap"}
                                                </button>
                                                `
                                    }

                                </td>

                            </tr>

                        `
                        )
                        .join("")
                }

            </tbody>

        </table>

    `;


    document
        .querySelectorAll(
            "[data-change-role]"
        )
        .forEach(
            button => {

                button.onclick =
                    async () => {

                        const newRole =
                            button.dataset.role ===
                            "teacher"
                                ? "student"
                                : "teacher";


                        try {
                            await callFunction("setUserRole", {
                                userId: button.dataset.changeRole,
                                role: newRole
                            });

                            toast(
                                "Kullanıcı rolü güncellendi.",
                                "teacher"
                            );

                            await loadAdminUsers();
                        } catch (error) {
                            console.error("Rol değiştirme:", error);
                            toast(error?.message || "Rol değiştirilemedi.", "teacher");
                        }

                    };

            }
        );

}


/* =========================================================
   TEACHER MODAL
========================================================= */

function openTeacherModal(type) {

    show($("modal"));


    /* DERS */

    if (type === "course") {

        $("modalBody").innerHTML = `

            <span class="eyebrow">
                İÇERİK
            </span>

            <h2>
                Yeni Ders
            </h2>


            <label>
                Ders adı

                <input
                    id="newCourseTitle"
                    maxlength="120">

            </label>


            <label>
                İkon

                <input
                    id="newCourseIcon"
                    value="📚"
                    maxlength="4">

            </label>


            <label>
                Açıklama

                <textarea
                    id="newCourseDescription">
                </textarea>

            </label>


            <label>
                Sınıf
                <select id="newCourseGrade">
                    <option value="">Tüm sınıflar</option>
                    ${CLASS_OPTIONS.map(v => `<option value="${v}">${escapeHTML(classLabel(v))}</option>`).join("")}
                </select>
            </label>

            <label>
                Video URL

                <input
                    id="newCourseVideo"
                    placeholder="https://...">

            </label>


            <label>
                PDF URL

                <input
                    id="newCourseFile"
                    placeholder="https://...">

            </label>

            <label>
                🎮 Wordwall bağlantısı (etkinliği siz oluşturduktan sonra ekleyin)

                <input
                    id="newCourseWordwall"
                    placeholder="https://wordwall.net/...">

            </label>


            <button
                id="saveCourse"
                class="primary-button full">

                Dersi Yayınla

            </button>

        `;


        $("saveCourse").onclick =
            saveTeacherCourse;

    }


    /* KONU */

    if (type === "lesson") {

        if (!teacherState.courses.length) {

            $("modalBody").innerHTML = `

                <h2>
                    Önce ders oluştur
                </h2>

                <p class="muted">
                    Konu eklemek için önce bir ders oluştur.
                </p>

            `;

            return;

        }


        $("modalBody").innerHTML = `

            <span class="eyebrow">
                DERS İÇERİĞİ
            </span>

            <h2>
                Yeni Konu
            </h2>


            <label>
                Ders

                <select
                    id="lessonCourse">

                    ${
                        teacherState.courses
                            .map(
                                course => `

                                <option
                                    value="${course.id}">

                                    ${escapeHTML(
                                        course.title
                                    )}

                                </option>

                            `
                            )
                            .join("")
                    }

                </select>

            </label>


            <label>
                Konu adı

                <input
                    id="lessonTitle"
                    maxlength="150">

            </label>


            <label>
                Konu anlatımı

                <textarea
                    id="lessonBody">
                </textarea>

            </label>


            <label>
                Video URL

                <input
                    id="lessonVideo">

            </label>


            <label>
                PDF URL

                <input
                    id="lessonFile"
                    placeholder="https://...">

            </label>

            <label>
                🎮 Wordwall bağlantısı (sen oluşturduktan sonra ekle)

                <input
                    id="lessonWordwall"
                    placeholder="https://wordwall.net/...">

            </label>


            <button
                id="saveLesson"
                class="primary-button full">

                Konuyu Yayınla

            </button>

        `;


        $("saveLesson").onclick =
            saveTeacherLesson;

    }


    /* DUYURU */

    if (type === "announcement") {

        $("modalBody").innerHTML = `

            <span class="eyebrow">
                İLETİŞİM
            </span>

            <h2>
                Yeni Duyuru
            </h2>


            <label>
                Başlık

                <input
                    id="announcementTitle"
                    maxlength="120">

            </label>


            <label>
                Mesaj

                <textarea
                    id="announcementBody">
                </textarea>

            </label>


            <button
                id="saveAnnouncement"
                class="primary-button full">

                Duyuruyu Yayınla

            </button>

        `;


        $("saveAnnouncement").onclick =
            saveTeacherAnnouncement;

    }


    /* TEST */

    if (type === "test") {

        buildTestModal();

    }

}


/* =========================================================
   DERS KAYDET
========================================================= */

async function saveTeacherCourse() {

    const title =
        $("newCourseTitle")
        .value
        .trim();


    if (!title) {

        toast(
            "Ders adı gerekli.",
            "teacher"
        );

        return;

    }


    try {

        await addDoc(
            collection(
                db,
                "courses"
            ),
            {

                title,

                icon:
                    $("newCourseIcon")
                    .value
                    .trim()
                    ||
                    "📚",

                description:
                    $("newCourseDescription")
                    .value
                    .trim(),

                grade:
                    $("newCourseGrade")
                    .value,

                videoUrl:
                    $("newCourseVideo")
                    .value
                    .trim(),

                fileUrl:
                    $("newCourseFile")
                    .value
                    .trim(),

                wordwallUrl:
                    $("newCourseWordwall")
                    .value
                    .trim(),

                teacherId:
                    auth.currentUser.uid,

                teacherName:
                    auth.currentUser
                        .displayName ||
                    stateName(),

                createdAt:
                    serverTimestamp()

            }
        );


        hide($("modal"));


        toast(
            "Ders yayınlandı ✓",
            "teacher"
        );


        await refreshTeacher();


    } catch (error) {

        console.error(error);

        toast(
            "Ders kaydedilemedi: " +
            error.message,
            "teacher"
        );

    }

}


/* =========================================================
   KONU KAYDET
========================================================= */

async function saveTeacherLesson() {

    const title =
        $("lessonTitle")
        .value
        .trim();


    if (!title) {

        toast(
            "Konu adı gerekli.",
            "teacher"
        );

        return;

    }


    try {

        await addDoc(
            collection(
                db,
                "lessons"
            ),
            {

                courseId:
                    $("lessonCourse")
                    .value,

                grade:
                    teacherState.courses.find(course => course.id === $("lessonCourse").value)?.grade || "",

                title,

                body:
                    $("lessonBody")
                    .value
                    .trim(),

                videoUrl:
                    $("lessonVideo")
                    .value
                    .trim(),

                fileUrl:
                    $("lessonFile")
                    .value
                    .trim(),

                wordwallUrl:
                    $("lessonWordwall")
                    .value
                    .trim(),

                teacherId:
                    auth.currentUser.uid,

                teacherName:
                    auth.currentUser
                        .displayName ||
                    stateName(),

                createdAt:
                    serverTimestamp()

            }
        );


        hide($("modal"));


        toast(
            "Konu yayınlandı ✓",
            "teacher"
        );


        await refreshTeacher();

    } catch (error) {

        console.error(error);

        toast(
            "Konu kaydedilemedi: " +
            error.message,
            "teacher"
        );

    }

}


/* =========================================================
   DUYURU KAYDET
========================================================= */

async function saveTeacherAnnouncement() {

    const title =
        $("announcementTitle")
        .value
        .trim();


    const body =
        $("announcementBody")
        .value
        .trim();


    if (!title || !body) {

        toast(
            "Başlık ve mesaj gerekli.",
            "teacher"
        );

        return;

    }


    try {

        await addDoc(
            collection(
                db,
                "announcements"
            ),
            {

                title,

                body,

                teacherId:
                    auth.currentUser.uid,

                teacherName:
                    auth.currentUser
                        .displayName ||
                    stateName(),

                createdAt:
                    serverTimestamp()

            }
        );


        hide($("modal"));


        toast(
            "Duyuru yayınlandı ✓",
            "teacher"
        );


        await refreshTeacher();

    } catch (error) {

        console.error(error);

        toast(
            "Duyuru kaydedilemedi: " +
            error.message,
            "teacher"
        );

    }

}


/* =========================================================
   TEST OLUŞTURMA
========================================================= */

function buildTestModal() {

    $("modalBody").innerHTML = `

        <span class="eyebrow">
            SINAV
        </span>

        <h2>
            Yeni Test
        </h2>


        <label>

            Test adı

            <input
                id="testTitle"
                maxlength="120">

        </label>


        <label>

            Açıklama

            <textarea
                id="testDescription">
            </textarea>

        </label>

        <label>
            Sınıf
            <select id="testGrade">
                <option value="">Tüm sınıflar</option>
                ${CLASS_OPTIONS.map(v => `<option value="${v}">${escapeHTML(classLabel(v))}</option>`).join("")}
            </select>
        </label>

        <div
            id="questionEditors">
        </div>


        <button
            id="addQuestion"
            class="ghost-button">

            ＋ Soru Ekle

        </button>


        <button
            id="saveTest"
            class="primary-button full"
            style="margin-top:15px">

            Testi Yayınla

        </button>

    `;


    let questionNumber = 0;


    function addQuestion() {

        questionNumber++;


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "question-editor";


        wrapper.innerHTML = `

            <div
                class="question-editor-title">

                Soru ${questionNumber}

            </div>


            <input
                class="question-text"
                placeholder="Soruyu yaz">


            <div class="option-grid">

                <input
                    class="question-a"
                    placeholder="A şıkkı">

                <input
                    class="question-b"
                    placeholder="B şıkkı">

                <input
                    class="question-c"
                    placeholder="C şıkkı">

                <input
                    class="question-d"
                    placeholder="D şıkkı">

            </div>


            <select
                class="question-correct">

                <option value="0">
                    Doğru cevap: A
                </option>

                <option value="1">
                    Doğru cevap: B
                </option>

                <option value="2">
                    Doğru cevap: C
                </option>

                <option value="3">
                    Doğru cevap: D
                </option>

            </select>

        `;


        $("questionEditors")
            .appendChild(wrapper);

    }


    $("addQuestion").onclick =
        addQuestion;


    addQuestion();


    $("saveTest").onclick =
        async () => {

            const title =
                $("testTitle")
                .value
                .trim();


            if (!title) {

                toast(
                    "Test adı gerekli.",
                    "teacher"
                );

                return;

            }


            const rows =
                [
                    ...
                    document
                        .querySelectorAll(
                            ".question-editor"
                        )
                ];


            if (!rows.length) {

                toast(
                    "En az bir soru ekle.",
                    "teacher"
                );

                return;

            }


            const questions =
                rows.map(
                    row => ({

                        question:
                            row
                                .querySelector(
                                    ".question-text"
                                )
                                .value
                                .trim(),

                        options: [

                            row
                                .querySelector(
                                    ".question-a"
                                )
                                .value
                                .trim(),

                            row
                                .querySelector(
                                    ".question-b"
                                )
                                .value
                                .trim(),

                            row
                                .querySelector(
                                    ".question-c"
                                )
                                .value
                                .trim(),

                            row
                                .querySelector(
                                    ".question-d"
                                )
                                .value
                                .trim()

                        ],

                        correctAnswer:
                            Number(
                                row
                                    .querySelector(
                                        ".question-correct"
                                    )
                                    .value
                            )

                    })
                );


            const invalid =
                questions.some(
                    question =>
                        !question.question ||
                        question.options.some(
                            option =>
                                !option
                        )
                );


            if (invalid) {

                toast(
                    "Soruları eksiksiz doldur.",
                    "teacher"
                );

                return;

            }

            try {

                await callFunction("createTest", {
                    title,
                    description: $("testDescription").value.trim(),
                    grade: $("testGrade").value,
                    questions: questions.map(question => ({
                        question: question.question,
                        options: question.options
                    })),
                    answers: questions.map(question => Number(question.correctAnswer))
                });

                hide($("modal"));
                toast("Test yayınlandı ✓", "teacher");
                await refreshTeacher();


            } catch (error) {

                console.error(error);

                toast(
                    "Test kaydedilemedi: " +
                    error.message,
                    "teacher"
                );

            }

        };

}




if (isTeacher && $("seedCurriculumButton")) {
    $("seedCurriculumButton").onclick = async () => {
        if (!confirm("5–12 sınıf müfredat dersleri, konuları ve hazır testleri Firestore'a yükleyelim mi?")) return;
        try {
            const result = await callFunction("seedCurriculum", {});
            toast(`Müfredat yüklendi: ${result.data?.courses || 0} ders, ${result.data?.lessons || 0} konu, ${result.data?.tests || 0} test.`, "teacher");
            await refreshTeacher();
        } catch (error) {
            console.error("Müfredat yükleme:", error);
            toast(error?.message || "Müfredat yüklenemedi.", "teacher");
        }
    };
}

/* =========================================================
   YARDIMCI
========================================================= */

function stateName() {

    return (
        teacherState
            .profile
            ?.name
        ||
        "Beray Öğretmeni"
    );

}


/* =========================================================
   BERAY PWA - KURULUM
   Mevcut uygulama mantığına dokunmaz.
========================================================= */
let berayDeferredInstallPrompt = null;

function updatePWAInstallButton() {
    const button = $("installPWAButton");
    if (!button) return;

    const isStandalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator.standalone === true;

    if (isStandalone) {
        hide(button);
    } else {
        show(button);
    }
}

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    berayDeferredInstallPrompt = event;
    updatePWAInstallButton();
});

window.addEventListener("appinstalled", () => {
    berayDeferredInstallPrompt = null;
    hide($("installPWAButton"));
    toast("Beray uygulaması yüklendi ✓", "student");
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((error) => {
            console.warn("PWA Service Worker kaydı başarısız:", error);
        });
    });
}

const pwaInstallButton = $("installPWAButton");
pwaInstallButton?.addEventListener("click", async () => {
    if (berayDeferredInstallPrompt) {
        berayDeferredInstallPrompt.prompt();
        const choice = await berayDeferredInstallPrompt.userChoice;
        if (choice?.outcome === "accepted") {
            toast("Uygulama yükleniyor…", "student");
        }
        berayDeferredInstallPrompt = null;
        updatePWAInstallButton();
        return;
    }

    toast("Tarayıcının menüsünden 'Uygulamayı yükle' seçeneğini kullanabilirsin.", "student");
});

window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", updatePWAInstallButton);
updatePWAInstallButton();
