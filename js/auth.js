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
  messageEl.textContent = text;
  messageEl.className = "message show " + (type || "error");
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
  return "Fehler: " + msg;
}
function showView(view) {
  loginForm.classList.toggle("hidden", view !== "login");
  registerForm.classList.toggle("hidden", view !== "register");
  forgotForm.classList.toggle("hidden", view !== "forgot");
  toggleText.classList.toggle("hidden", view === "forgot");
  if (view === "login") {
    toggleText.innerHTML = 'Noch kein Konto? <button type="button" id="show-register">
    document.getElementById("show-register").addEventListener("click", function() { sh
ch.";
ndet.";
en habe
Registr
owView(
   } else if (view === "register") {
    toggleText.innerHTML = 'Bereits ein Konto? <button type="button" id="show-login">A
    document.getElementById("show-login").addEventListener("click", function() { showV
}
  clearMessage();
}
showRegisterBtn.addEventListener("click", function() { showView("register"); });
forgotLink.addEventListener("click", function() { showView("forgot"); });
backToLoginLink.addEventListener("click", function() { showView("login"); });
// Session prüfen
supabase.auth.getSession().then(function(result) {
  if (result.data && result.data.session) {
    window.location.href = "dashboard.html";
} });
// Login
loginForm.addEventListener("submit", function(e) {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-btn");
  setLoading(btn, true, "Anmelden");
  supabase.auth.signInWithPassword({ email: email, password: password }).then(function
    if (result.error) {
      showMessage(translateError(result.error.message));
      setLoading(btn, false, "Anmelden");
    } else {
      window.location.href = "dashboard.html";
    }
  }).catch(function(err) {
    showMessage("Verbindungsfehler. Bitte versuche es erneut.");
    setLoading(btn, false, "Anmelden");
}); });
// Registrierung
registerForm.addEventListener("submit", function(e) {
  e.preventDefault();
  clearMessage();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
nmelden
iew("lo
(result

   const btn = document.getElementById("register-btn");
  setLoading(btn, true, "Konto erstellen");
  supabase.auth.signUp({
    email: email,
    password: password,
    options: { data: { name: name } }
  }).then(function(result) {
    if (result.error) {
      showMessage(translateError(result.error.message));
      setLoading(btn, false, "Konto erstellen");
      return;
    }
    if (result.data && result.data.user) {
      supabase.from("profiles").upsert({
        id: result.data.user.id,
        name: name,
        email: email,
        income: 0,
        fixed_costs: 0,
        savings_goal: 0,
        current_balance: 0,
        is_premium: false,
        onboarding_complete: false
      }, { onConflict: "id" }).then(function() {
        window.location.href = "dashboard.html";
      }).catch(function() {
        window.location.href = "dashboard.html";
});
} else {
      window.location.href = "dashboard.html";
    }
  }).catch(function(err) {
    showMessage("Verbindungsfehler. Bitte versuche es erneut.");
    setLoading(btn, false, "Konto erstellen");
}); });
// Passwort vergessen
forgotForm.addEventListener("submit", function(e) {
  e.preventDefault();
  clearMessage();
  const email = document.getElementById("forgot-email").value.trim();
  const btn = document.getElementById("forgot-btn");
  setLoading(btn, true, "Link senden");
supabase.auth.resetPasswordForEmail(email, {
 redirectTo: window.location.origin + "/index.html"
  }).then(function(result) {
    if (result.error) {
      showMessage(translateError(result.error.message));
    } else {
      showMessage("Falls ein Konto existiert, wurde eine E-Mail gesendet.", "success")
}
    setLoading(btn, false, "Link zum Zurücksetzen senden");
  });
});
 

 
