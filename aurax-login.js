import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const AURAX_URL = "https://rzdvezdccgkfzfpizwmj.supabase.co";
const AURAX_KEY = "sb_publishable_yVs-2YKiVpZ2_wOmPZvdag_AzkxdABU";
const $ = (id) => document.getElementById(id);
const msg = (t) => { const b = $("authMessage"); if (b) { b.textContent = t; b.classList.remove("hidden"); } };
const hex = (s) => Array.from(new TextEncoder().encode(s)).map((b) => b.toString(16).padStart(2, "0")).join("");

$("auraxBtn")?.addEventListener("click", () => $("auraxForm").classList.toggle("hidden"));
$("auraxForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn && (btn.disabled = true);
  window.__auraxBusy = true;
  try {
    const username = $("auraxUser").value.trim();
    const pass = $("auraxPass").value;
    const r = await fetch(`${AURAX_URL}/functions/v1/username-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: AURAX_KEY, Authorization: `Bearer ${AURAX_KEY}` },
      body: JSON.stringify({ username, password: pass })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.session?.access_token) throw new Error(j.error || "Aura X hesabı doğrulanamadı.");
    const token = j.session.access_token;
    const meta = j.session.user?.user_metadata || {};
    let first = String(meta.first_name || ""), last = String(meta.last_name || "");
    if (!first || !last) {
      try {
        const pr = await fetch(`${AURAX_URL}/rest/v1/users?id=eq.${encodeURIComponent(username)}&select=data`, { headers: { apikey: AURAX_KEY, Authorization: `Bearer ${token}` } });
        const row = (await pr.json())?.[0]?.data || {};
        first = first || String(row.firstName || ""); last = last || String(row.lastName || "");
      } catch {}
    }
    const name = `${first} ${last}`.trim().slice(0, 80) || username;
    const email = `u${hex(username.toLowerCase())}@aurax.beray.local`;
    const fbPass = `${pass}_aurax`;
    let cred;
    try { cred = await signInWithEmailAndPassword(auth, email, fbPass); }
    catch {
      try { cred = await createUserWithEmailAndPassword(auth, email, fbPass); await updateProfile(cred.user, { displayName: name }); }
      catch (e2) {
        if (e2.code === "auth/email-already-in-use") throw new Error("Aura X şifren değişmiş görünüyor. Beray'da 'Şifremi unuttum' yerine yöneticiye haber ver.");
        throw e2;
      }
    }
    const ref = doc(db, "users", cred.user.uid);
    if (!(await getDoc(ref)).exists()) {
      await setDoc(ref, { uid: cred.user.uid, name, email, role: "student", points: 0, completedLessons: [], completedTests: [], createdAt: serverTimestamp() });
    }
    window.location.href = "./student.html";
  } catch (err) {
    window.__auraxBusy = false;
    msg(err.message || "Aura X ile giriş yapılamadı.");
    btn && (btn.disabled = false);
  }
});
