import { auth, functions } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

// Güvenli akış: Aura X şifren yalnızca Aura X'in kendi sunucusuna gider.
// Beray, Aura X'in verdiği oturum belirtecini sunucuda (Cloud Function) doğrular; şifren Beray'a/Firebase'e kaydedilmez.
const AURAX_URL = "https://rzdvezdccgkfzfpizwmj.supabase.co";
const AURAX_KEY = "sb_publishable_yVs-2YKiVpZ2_wOmPZvdag_AzkxdABU";
const $ = (id) => document.getElementById(id);
const msg = (t) => { const b = $("authMessage"); if (b) { b.textContent = t; b.classList.remove("hidden"); } };

$("auraxBtn")?.addEventListener("click", () => $("auraxForm").classList.toggle("hidden"));
$("auraxForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn && (btn.disabled = true);
  window.__auraxBusy = true;
  try {
    const username = $("auraxUser").value.trim().slice(0, 60);
    const pass = $("auraxPass").value;
    const r = await fetch(`${AURAX_URL}/functions/v1/username-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: AURAX_KEY, Authorization: `Bearer ${AURAX_KEY}` },
      body: JSON.stringify({ username, password: pass })
    });
    const j = await r.json().catch(() => ({}));
    const accessToken = j.session?.access_token;
    if (!r.ok || !accessToken) throw new Error("Aura X kullanıcı adı veya şifre hatalı.");
    $("auraxPass").value = "";
    const res = await httpsCallable(functions, "auraxSignIn")({ accessToken });
    const { email, password } = res.data || {};
    if (!email || !password) throw new Error("Aura X ile giriş tamamlanamadı.");
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "./student.html";
  } catch (err) {
    window.__auraxBusy = false;
    msg(err?.message || "Aura X ile giriş yapılamadı.");
    btn && (btn.disabled = false);
  }
});
