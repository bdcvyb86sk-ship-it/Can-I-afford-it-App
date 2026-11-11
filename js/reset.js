// js/reset.js – neues Passwort setzen (Link aus der Reset-Mail)
var form = document.getElementById("reset-form");
var info = document.getElementById("reset-info");
var msg = document.getElementById("message");
var ready = false;

function showMessage(text, type) {
  msg.textContent = text;
  msg.className = "message show " + (type || "error");
}

function showForm() {
  if (ready) return;
  ready = true;
  form.classList.remove("hidden");
  info.textContent = "Wähle dein neues Passwort.";
}

sb.auth.onAuthStateChange(function(event) {
  if (event === "PASSWORD_RECOVERY") showForm();
});

// Fallback: Link ungültig/abgelaufen -> Hinweis anzeigen
setTimeout(function() {
  if (ready) return;
  sb.auth.getSession().then(function(res) {
    if (ready) return;
    if (res.data && res.data.session) {
      showForm();
    } else {
      info.textContent = "Dieser Link ist ungültig oder abgelaufen.";
      showMessage("Bitte fordere auf der Login-Seite einen neuen Link an.");
    }
  });
}, 2500);

form.onsubmit = function(e) {
  e.preventDefault();
  var p1 = document.getElementById("new-password").value;
  var p2 = document.getElementById("new-password2").value;
  var btn = document.getElementById("reset-btn");
  if (p1.length < 6) { showMessage("Das Passwort muss mindestens 6 Zeichen haben."); return; }
  if (p1 !== p2) { showMessage("Die Passwörter stimmen nicht überein."); return; }
  btn.disabled = true;
  btn.textContent = "Bitte warten…";
  sb.auth.updateUser({ password: p1 }).then(function(res) {
    if (res.error) {
      showMessage("Fehler: " + res.error.message);
      btn.disabled = false;
      btn.textContent = "Passwort speichern";
      return;
    }
    showMessage("Passwort gespeichert! Du wirst weitergeleitet…", "success");
    setTimeout(function() { window.location.href = "dashboard.html"; }, 1500);
  });
};
