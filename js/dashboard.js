// js/dashboard.js
var fmt = function(v) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);
};

sb.auth.getSession().then(function(result) {
  if (!result.data || !result.data.session) {
    window.location.href = "index.html";
    return;
  }
  var userId = result.data.session.user.id;
  var userName = result.data.session.user.user_metadata && result.data.session.user.user_metadata.name
    ? result.data.session.user.user_metadata.name : "Nutzer";
  document.getElementById("user-name").textContent = userName;

  sb.from("profiles").select("*").eq("id", userId).single().then(function(res) {
    var profile = res.data;
    if (!profile) {
      sb.from("profiles").upsert({
        id: userId, name: userName,
        email: result.data.session.user.email,
        income: 0, fixed_costs: 0, savings_goal: 0,
        current_balance: 0, is_premium: false, onboarding_complete: false
      }, { onConflict: "id" }).then(function() { showOnboarding(); });
    } else if (!profile.onboarding_complete) {
      showOnboarding();
    } else {
      showDashboard(profile);
    }
    document.getElementById("loader").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
  });
});

function showOnboarding() {
  document.getElementById("onboarding").classList.remove("hidden");
  document.getElementById("main-dashboard").classList.add("hidden");
}

function showDashboard(profile) {
  document.getElementById("onboarding").classList.add("hidden");
  document.getElementById("main-dashboard").classList.remove("hidden");
  renderDashboard(profile);
}

document.getElementById("onboarding-form").onsubmit = function(e) {
  e.preventDefault();
  var income = parseFloat(document.getElementById("ob-income").value);
  var fixed_costs = parseFloat(document.getElementById("ob-fixed").value);
  var savings_goal = parseFloat(document.getElementById("ob-savings").value);
  var current_balance = parseFloat(document.getElementById("ob-balance").value);

  if ([income, fixed_costs, savings_goal, current_balance].some(isNaN)) {
    var msg = document.getElementById("onboarding-message");
    msg.textContent = "Bitte alle Felder ausfüllen.";
    msg.className = "message show error";
    return;
  }

  var btn = document.querySelector("#onboarding-form button[type=submit]");
  btn.disabled = true; btn.textContent = "Speichern…";

  sb.auth.getSession().then(function(result) {
    var userId = result.data.session.user.id;
    sb.from("profiles").update({
      income: income, fixed_costs: fixed_costs,
      savings_goal: savings_goal, current_balance: current_balance,
      onboarding_complete: true
    }).eq("id", userId).then(function() {
      sb.from("profiles").select("*").eq("id", userId).single().then(function(res) {
        showDashboard(res.data);
      });
    });
  });
};

function renderDashboard(p) {
  var income = p.income || 0;
  var fixed = p.fixed_costs || 0;
  var savings = p.savings_goal || 0;
  var balance = p.current_balance || 0;
  var budget = income - fixed - savings;

  document.getElementById("available-budget").textContent = fmt(budget);
  document.getElementById("display-income").textContent = fmt(income);
  document.getElementById("display-fixed").textContent = fmt(fixed);
  document.getElementById("display-savings").textContent = fmt(savings);
  document.getElementById("display-balance").textContent = fmt(balance);

  var budgetEl = document.getElementById("available-budget");
  var status;
  if (budget < 0) { status = "danger"; budgetEl.style.color = "#EF4444"; }
  else if (income > 0 && budget < income * 0.2) { status = "warning"; budgetEl.style.color = "#F59E0B"; }
  else { status = "safe"; budgetEl.style.color = "#22C55E"; }

  var pct = savings > 0 ? Math.min(100, Math.max(0, (balance / savings) * 100)) : 0;
  var fill = document.getElementById("savings-progress-fill");
  fill.style.width = pct + "%";
  fill.className = "progress-fill " + status;
  document.getElementById("savings-percent").textContent = Math.round(pct) + "%";
  document.getElementById("savings-current").textContent = fmt(balance);
  document.getElementById("savings-target").textContent = "Ziel: " + fmt(savings);

  var slot = document.getElementById("premium-card-slot");
  var badge = document.getElementById("premium-badge-slot");
  if (p.is_premium) {
    badge.innerHTML = '<span class="premium-badge">⭐ Premium</span>';
    slot.innerHTML = "";
  } else {
    badge.innerHTML = "";
    slot.innerHTML = '<div class="premium-card"><div class="premium-title">⭐ Premium freischalten</div><p style="color:var(--color-text-secondary);font-size:14px;">Du hast noch <strong>3 kostenlose Prüfungen</strong> pro Monat.</p><ul><li>Unbegrenzte Kaufprüfungen</li><li>Statistiken &amp; Charts</li><li>CSV Export</li><li>Fixkosten-Manager</li></ul><a href="profile.html" class="btn btn-primary" style="margin-top:8px;">Ab 4,99 €/Monat</a></div>';
  }
}
