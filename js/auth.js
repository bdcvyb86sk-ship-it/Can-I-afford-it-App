import { supabase } from "./supabase.js";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const messageEl = document.getElementById("message");
const toggleText = document.getElementById("toggle-text");

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = "message show " + (type || "error");
}

supabase.auth.getSession().then(function(res) {
  if (res.data.session) {
    window.location.replace("dashboard.html");
  }
});

document.getElementById("show-register").addEventListener("click", function() {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  toggleText.innerHTML = 'Bereits ein Konto? <button type="button" id="show-login">Anmelden</button>';
  document.getElementById("show-login").addEventListener("click", function() {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  });
});

loginForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-btn");
  btn.disabled = true;
  btn.textContent = "Bitte warten…";

  supabase.auth.signInWithPassword({ email: email, password: password })
    .then(function(res) {
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

  supabase.auth.signUp({ email: email, password: password, options: { data: { name: name } } })
    .then(function(res) {
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

 

 
