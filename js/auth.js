
// js/auth.js
import { supabase } from "./supabase.js";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotForm = document.getElementById("forgot-form");
const messageEl = document.getElementById("message");
const toggleText = document.getElementById("toggle-text");
const showRegisterBtn = document.getElementById("show-register");
const forgotLink = document.getElementById("forgot-password-link");
const backToLoginLink = document.getElementById("back-to-login-link");

function showMessage(text, type = "error") {
  messageEl.textContent = text;
  messageEl.className = `message show ${type}`;
}

function clearMessage() {
  messageEl.className = "message";
  messageEl.textContent = "";
}

function setLoading(btn, loading, original) {
  btn.disabled = loading;
  btn.textContent = loading ? "Bitte warten…" : original;
}

function translateError(msg) {
  if (!msg) return "Etwas ist schiefgelaufen.";
  if (msg.includes("Invalid login credentials")) return "E-Mail oder Passwort ist falsch.";
  if (msg.includes("Email not confirmed")) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (msg.includes("User already registered")) return "Diese E-Mail wird bereits verwendet.";
  if (msg.includes("Password should be")) return "Das Passwort muss mindestens 6 Zeichen haben.";
  if (msg.includes("Unable to validate email")) return "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (msg.includes("rate limit")) return "Zu viele Versuche. Bitte später erneut versuchen.";
  return msg;
}

// ── View switching ──
function showView(view) {
  loginForm.classList.toggle("hidden", view !== "login");
  registerForm.classList.toggle("hidden", view !== "register");
  forgotForm.classList.toggle("hidden", view !== "forgot");
  toggleText.classList.toggle("hidden", view === "forgot");

  if (view === "login") {
    toggleText.innerHTML = 'Noch kein Konto? <button type="button" id="show-register">Registrieren</button>';
    document.getElementById("show-register").addEventListener("click", () => showView("register"));
  } else if (view === "register") {
    toggleText.innerHTML = 'Bereits ein Konto? <button type="button" id="show-login">Anmelden</button>';
    document.getElementById("show-login").addEventListener("click", () => showView("login"));
  }
  clearMessage();
}

showRegisterBtn.addEventListener("click", () => showView("register"));
forgotLink.addEventListener("click", () => showView("forgot"));
backToLoginLink.addEventListener("click", () => showView("login"));

// ── Bereits eingeloggt? ──
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) window.location.href = "dashboard.html";
});

// ── Login ──
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-btn");

  setLoading(btn, true, "Anmelden");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage(translateError(error.message));
    setLoading(btn, false, "Anmelden");
  } else {
    window.location.href = "dashboard.html";
  }
});

// ── Registrierung ──
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const btn = document.getElementById("register-btn");

  setLoading(btn, true, "Konto erstellen");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (error) {
    showMessage(translateError(error.message));
    setLoading(btn, false, "Konto erstellen");
    return;
  }

  // Profil sofort anlegen nach Registrierung
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      name,
      email,
      income: 0,
      fixed_costs: 0,
      savings_goal: 0,
      current_balance: 0,
      is_premium: false,
      onboarding_complete: false
    }, { onConflict: "id" });

    if (profileError) {
      console.error("Profil anlegen fehlgeschlagen:", profileError);
    }
  }

  window.location.href = "dashboard.html";
});

// ── Passwort vergessen ──
forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById("forgot-email").value.trim();
  const btn = document.getElementById("forgot-btn");

  setLoading(btn, true, "Link senden");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/index.html"
  });

  if (error) {
    showMessage(translateError(error.message));
  } else {
    showMessage("Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen gesendet.", "success");
  }
  setLoading(btn, false, "Link zum Zurücksetzen senden");
});
