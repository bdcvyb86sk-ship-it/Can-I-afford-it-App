// js/profile.js
var DS24 = {
  monthly:  "https://www.checkout-ds24.com/product/705081",
  yearly:   "https://www.checkout-ds24.com/product/707747",
  forever:  "https://www.checkout-ds24.com/product/707752"
};

function showToast(text) {
  var t = document.createElement("div");
  t.className = "toast"; t.textContent = text;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.classList.add("show"); });
  setTimeout(function() { t.classList.remove("show"); setTimeout(function() { t.remove(); }, 250); }, 2200);
}

function showMessage(text, type) {
  var el = document.getElementById("message");
  el.textContent = text;
  el.className = "message show " + (type || "error");
  setTimeout(function() { el.className = "message"; }, 3000);
}

sb.auth.getSession().then(function(result) {
  if (!result.data || !result.data.session) { window.location.href = "index.html"; return; }
  var session = result.data.session;
  var userId = session.user.id;

  sb.from("profiles").select("*").eq("id", userId).single().then(function(res) {
    var profile = res.data;
    if (profile) {
      document.getElementById("profile-name").value = profile.name || "";
      document.getElementById("profile-email").value = profile.email || session.user.email || "";
      document.getElementById("profile-income").value = profile.income || 0;
      document.getElementById("profile-fixed").value = profile.fixed_costs || 0;
      document.getElementById("profile-savings").value = profile.savings_goal || 0;
      document.getElementById("profile-balance").value = profile.current_balance || 0;
      renderPremium(profile.is_premium);
    }
    document.getElementById("loader").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
  });

  document.getElementById("profile-form").onsubmit = function(e) {
    e.preventDefault();
    var name = document.getElementById("profile-name").value.trim();
    var income = parseFloat(document.getElementById("profile-income").value);
    var fixed_costs = parseFloat(document.getElementById("profile-fixed").value);
    var savings_goal = parseFloat(document.getElementById("profile-savings").value);
    var current_balance = parseFloat(document.getElementById("profile-balance").value);

    if (!name || [income, fixed_costs, savings_goal, current_balance].some(isNaN)) {
      showMessage("Bitte alle Felder korrekt ausfüllen."); return;
    }

    var btn = document.querySelector("#profile-form button[type=submit]");
    btn.disabled = true; btn.textContent = "Speichern…";

    sb.from("profiles").upsert({
      id: userId, name: name, income: income,
      fixed_costs: fixed_costs, savings_goal: savings_goal, current_balance: current_balance
    }, { onConflict: "id" }).then(function(res) {
      if (res.error) { showMessage("Speichern fehlgeschlagen."); }
      else { showToast("Profil aktualisiert ✓"); }
      btn.disabled = false; btn.textContent = "Änderungen speichern";
    });
  };
});

function renderPremium(isPremium) {
  var section = document.getElementById("premium-section");
  if (isPremium) {
    section.innerHTML = '<div class="premium-card"><div class="premium-title">⭐ Du bist Premium-Mitglied</div><ul><li>Unbegrenzte Kaufprüfungen</li><li>Statistiken &amp; Charts</li><li>CSV Export</li><li>Fixkosten-Manager</li></ul></div>';
  } else {
    section.innerHTML = '<div class="premium-card"><div class="premium-title">⭐ Premium freischalten</div><p style="color:var(--color-text-secondary);font-size:14px;">Erweiterte Funktionen für deine Finanzplanung.</p><ul><li>Unbegrenzte Kaufprüfungen (Free: 3/Monat)</li><li>Statistiken &amp; Charts</li><li>CSV Export</li><li>Fixkosten-Manager</li></ul><div class="plan-grid"><a href="' + DS24.monthly + '" target="_blank" rel="noopener" class="plan-option"><div class="plan-left"><span class="plan-name">Monatlich</span><span class="plan-sub">Jederzeit kündbar</span></div><div class="plan-price">4,99 €<span class="plan-period">/ Monat</span></div></a><a href="' + DS24.yearly + '" target="_blank" rel="noopener" class="plan-option recommended"><div class="plan-left"><span class="plan-name">Jährlich <span class="plan-tag">SPARE 33%</span></span><span class="plan-sub">39,99 € pro Jahr</span></div><div class="plan-price">3,33 €<span class="plan-period">/ Monat</span></div></a><a href="' + DS24.forever + '" target="_blank" rel="noopener" class="plan-option"><div class="plan-left"><span class="plan-name">Forever</span><span class="plan-sub">Einmalzahlung</span></div><div class="plan-price">69 €<span class="plan-period">einmalig</span></div></a></div><p style="font-size:12px;color:var(--color-text-secondary);margin-top:8px;">Sichere Zahlung über Digistore24. Premium wird automatisch freigeschaltet.</p></div>';
  }
}

document.getElementById("logout-btn").onclick = function() {
  document.getElementById("logout-modal").classList.add("show");
};
document.getElementById("logout-cancel").onclick = function() {
  document.getElementById("logout-modal").classList.remove("show");
};
document.getElementById("logout-modal").onclick = function(e) {
  if (e.target === this) this.classList.remove("show");
};
document.getElementById("logout-confirm").onclick = function() {
  sb.auth.signOut().then(function() { window.location.href = "index.html"; });
};
