import { auth, functions } from "./firebase.js";
import { signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const AURAX_URL = "https://rzdvezdccgkfzfpizwmj.supabase.co";
const AURAX_KEY = "sb_publishable_yVs-2YKiVpZ2_wOmPZvdag_AzkxdABU";
const $ = (id) => document.getElementById(id);
const msg = (t) => { const b = $("authMessage"); if (b) { b.textContent = t; b.classList.remove("hidden"); } };

$("auraxBtn")?.addEventListener("click", () => $("auraxForm").classList.toggle("hidden"));
$("auraxForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn && (btn.disabled = true);
  try {
    const r = await fetch(`${AURAX_URL}/functions/v1/username-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: AURAX_KEY, Authorization: `Bearer ${AURAX_KEY}` },
      body: JSON.stringify({ username: $("auraxUser").value.trim(), password: $("auraxPass").value })
    });
    const j = await r.json();
    if (!r.ok || !j.session?.access_token) throw new Error(j.error || "Aura X girişi başarısız.");
    const { data } = await httpsCallable(functions, "auraxSignIn")({ accessToken: j.session.access_token });
    await signInWithCustomToken(auth, data.customToken);
    window.location.href = "./student.html";
  } catch (err) {
    msg(err.message || "Aura X ile giriş yapılamadı.");
    btn && (btn.disabled = false);
  }
});
