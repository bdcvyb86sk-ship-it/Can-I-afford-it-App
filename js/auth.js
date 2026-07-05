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
function showMessage(text, type) {
  type = type || "error";
  messageEl.textContent = text;
  messageEl.className = "message show " + type;
}
function clearMessage() {
  messageEl.className = "message";
  messageEl.textContent = "";
}
function setLoading(btn, loading, original) {
  btn.disabled = loading;
  btn.textContent = loading ? "Bitte warten..." : original;
}
function translateError(msg) {
  if (!msg) return "Etwas ist schiefgelaufen.";
  if (msg.includes("Invalid login credentials")) return "E-Mail oder Passwort ist fals
  if (msg.includes("User already registered")) return "Diese E-Mail wird bereits verwe
  if (msg.includes("Password should be")) return "Das Passwort muss mindestens 6 Zeich
  return msg;
}
function showView(view) {
  loginForm.classList.toggle("hidden", view !== "login");
  registerForm.classList.toggle("hidden", view !== "register");
  forgotForm.classList.toggle("hidden", view !== "forgot");
  toggleText.classList.toggle("hidden", view === "forgot");
  if (view === "login") {
    toggleText.innerHTML = 'Noch kein Konto? <button type="button" id="show-register">
ch.";
ndet.";
en habe
Registr
     document.getElementById("show-register").addEventListener("click", function() { sh
  } else if (view === "register") {
    toggleText.innerHTML = 'Bereits ein Konto? <button type="button" id="show-login">A
    document.getElementById("show-login").addEventListener("click", function() { showV
  }
  clearMessage();
}
showRegisterBtn.addEventListener("click", function() { showView("register"); });
forgotLink.addEventListener("click", function() { showView("forgot"); });
backToLoginLink.addEventListener("click", function() { showView("login"); });
supabase.auth.getSession().then(function({ data: { session } }) {
  if (session) window.location.href = "dashboard.html";
});
loginForm.addEventListener("submit", function(e) {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-btn");
  setLoading(btn, true, "Anmelden");
  supabase.auth.signInWithPassword({ email, password }).then(function({ error }) {
    if (error) {
      showMessage(translateError(error.message));
      setLoading(btn, false, "Anmelden");
    } else {
      window.location.href = "dashboard.html";
    }
}); });
registerForm.addEventListener("submit", function(e) {
  e.preventDefault();
  clearMessage();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const btn = document.getElementById("register-btn");
  setLoading(btn, true, "Konto erstellen");
  supabase.auth.signUp({ email, password, options: { data: { name } } }).then(function
    if (error) {
      showMessage(translateError(error.message));
      setLoading(btn, false, "Konto erstellen");
owView(
nmelden
iew("lo
({ data

 return; }
    if (data.user) {
      supabase.from("profiles").upsert({
        id: data.user.id, name, email,
        income: 0, fixed_costs: 0, savings_goal: 0,
        current_balance: 0, is_premium: false, onboarding_complete: false
      }, { onConflict: "id" }).then(function() {
        window.location.href = "dashboard.html";
});
} else {
      window.location.href = "dashboard.html";
    }
}); });
forgotForm.addEventListener("submit", function(e) {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById("forgot-email").value.trim();
  const btn = document.getElementById("forgot-btn");
  setLoading(btn, true, "Link senden");
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/index.html"
  }).then(function({ error }) {
    if (error) {
      showMessage(translateError(error.message));
    } else {
      showMessage("Falls ein Konto existiert, wurde eine E-Mail gesendet.", "success")
    }
    setLoading(btn, false, "Link zum Zurücksetzen senden");
  });
});
