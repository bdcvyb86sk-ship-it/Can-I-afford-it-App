// js/auth.js
function showMessage(text, type) {
  var el = document.getElementById("message");
  el.textContent = text;
  el.className = "message show " + (type || "error");
}

function showView(view) {
  document.getElementById("login-form").classList.toggle("hidden", view !== "login");
  document.getElementById("register-form").classList.toggle("hidden", view !== "register");
  document.getElementById("forgot-form").classList.toggle("hidden", view !== "forgot");
  document.getElementById("toggle-text").classList.toggle("hidden", view === "forgot");

  var el = document.getElementById("message");
  el.className = "message";
  el.textContent = "";

  if (view === "login") {
    document.getElementById("toggle-text").innerHTML = 'Noch kein Konto? <button type="button" onclick="showView(\'register\')">Registrieren</button>';
  } else if (view === "register") {
    document.getElementById("toggle-text").innerHTML = 'Bereits ein Konto? <button type="button" onclick="showView(\'login\')">Anmelden</button>';
  }
}

// Bereits eingeloggt?
sb.auth.getSession().then(function(result) {
  if (result.data && result.data.session) {
    window.location.href = "dashboard.html";
  }
});

// Buttons
document.getElementById("show-register").onclick = function() { showView("register"); };
document.getElementById("forgot-password-link").onclick = function() { showView("forgot"); };
document.getElementById("back-to-login-link").onclick = function() { showView("login"); };

// Login
document.getElementById("login-form").onsubmit = function(e) {
  e.preventDefault();
  var email = document.getElementById("login-email").value.trim();
  var password = document.getElementById("login-password").value;
  var btn = document.getElementById("login-btn");
  btn.disabled = true;
  btn.textContent = "Bitte warten…";

  sb.auth.signInWithPassword({ email: email, password: password }).then(function(result) {
    if (result.error) {
      showMessage("E-Mail oder Passwort ist falsch.");
      btn.disabled = false;
      btn.textContent = "Anmelden";
    } else {
      window.location.href = "dashboard.html";
    }
  });
};

// Registrierung
document.getElementById("register-form").onsubmit = function(e) {
  e.preventDefault();
  var name = document.getElementById("register-name").value.trim();
  var email = document.getElementById("register-email").value.trim();
  var password = document.getElementById("register-password").value;
  var btn = document.getElementById("register-btn");
  btn.disabled = true;
  btn.textContent = "Bitte warten…";

  sb.auth.signUp({ email: email, password: password, options: { data: { name: name } } }).then(function(result) {
    if (result.error) {
      showMessage("Fehler: " + result.error.message);
      btn.disabled = false;
      btn.textContent = "Konto erstellen";
      return;
    }
    if (result.data && result.data.user) {
      sb.from("profiles").upsert({
        id: result.data.user.id, name: name, email: email,
        income: 0, fixed_costs: 0, savings_goal: 0,
        current_balance: 0, is_premium: false, onboarding_complete: false
      }, { onConflict: "id" }).then(function() {
        window.location.href = "dashboard.html";
      });
    } else {
      window.location.href = "dashboard.html";
    }
  });
};

// Passwort vergessen
document.getElementById("forgot-form").onsubmit = function(e) {
  e.preventDefault();
  var email = document.getElementById("forgot-email").value.trim();
  var btn = document.getElementById("forgot-btn");
  btn.disabled = true;
  btn.textContent = "Bitte warten…";

  sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/index.html"
  }).then(function(result) {
    if (result.error) {
      showMessage("Fehler: " + result.error.message);
    } else {
      showMessage("Reset-Link wurde gesendet!", "success");
    }
    btn.disabled = false;
    btn.textContent = "Reset-Link senden";
  });
};
