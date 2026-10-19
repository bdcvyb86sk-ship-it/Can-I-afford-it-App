
import { supabase } from "./supabase.js";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotForm = document.getElementById("forgot-form");
const messageEl = document.getElementById("message");
const toggleText = document.getElementById("toggle-text");

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = "message show " + (type || "error");
}

function showView(view) {
  loginForm.classList.toggle("hidden", view !== "login");
  registerForm.classList.toggle("hidden", view !== "register");
  forgotForm.classList.toggle("hidden", view !== "forgot");
  toggleText.classList.toggle("hidden", view === "forgot");
  if (view === "login") {
    toggleText.innerHTML = 'Noch kein Konto? <button type="button" id="show-register">Registrieren</button>';
    document.getElementById("show-register").onclick = function() { showView("register"); };
  } else if (view === "register") {
    toggleText.innerHTML = 'Bereits ein Konto? <button type="button" id="show-login">Anmelden</button>';
    document.getElementById("show-login").onclick = function() { showView("login"); };
  }
}

document.getElementById("show-register").onclick = function() { showView("register"); };
document.getElementById("forgot-password-link").onclick = function() { showView("forgot"); };
document.getElementById("back-to-login-link").onclick = function() { showView("login"); };

supabase.auth.getSession().then(function(res) {
  if (res.data && res.data.session) {
    window.location.replace("dashboard.html");
  }
});

loginForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-btn");
  btn.disabled = true;
  btn.textContent = "Bitte warten…";
  supabase.auth.signInWithPassword({ email: email, password: password }).then(function(res) {
    if (res.error) {
      showMessage("E-Mail oder Passwort ist falsch.");
      btn.disabled = false;
      btn.textContent = "Anmelden";
    } else {
      window.location.replace("dashboard.html");
    }
  });
});

registerForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const btn = document.getElementById("register-btn");
  btn.disabled = true;
  btn.textContent = "Bitte warten…";
  supabase.auth.signUp({ email: email, password: password, options: { data: { name: name } } }).then(function(res) {
    if (res.error) {
      showMessage("Fehler: " + res.error.message);
      btn.disabled = false;
      btn.textContent = "Konto erstellen";
      return;
    }
    if (res.data && res.data.user) {
      supabase.from("profiles").upsert({
        id: res.data.user.id, name: name, email: email,
        income: 0, fixed_costs: 0, savings_goal: 0,
        current_balance: 0, is_premium: false, onboarding_complete: false
      }, { onConflict: "id" }).then(function() {
        window.location.replace("dashboard.html");
      });
    }
  });
});

forgotForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("forgot-email").value.trim();
  const btn = document.getElementById("forgot-btn");
  btn.disabled = true;
  btn.textContent = "Bitte warten…";
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/index.html"
  }).then(function(res) {
    if (res.error) {
      showMessage("Fehler: " + res.error.message);
    } else {
      showMessage("Reset-Link wurde gesendet falls die E-Mail existiert.", "success");
    }
    btn.disabled = false;
    btn.textContent = "Link zum Zurücksetzen senden";
  });
});
 
