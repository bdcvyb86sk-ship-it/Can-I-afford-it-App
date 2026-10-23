// js/check.js
var FREE_LIMIT = 3;
var selectedCategory = "Sonstiges";
var profile = null;
var currentUserId = null;
var checksCount = 0;

var fmt = function(v) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
};

document.getElementById("category-grid").onclick = function(e) {
  var chip = e.target.closest(".category-chip");
  if (!chip) return;
  document.querySelectorAll(".category-chip").forEach(function(c) { c.classList.remove("selected"); });
  chip.classList.add("selected");
  selectedCategory = chip.dataset.category;
};

document.getElementById("product-price").oninput = function() {
  var v = parseFloat(this.value);
  var preview = document.getElementById("live-preview");
  if (!profile || isNaN(v) || v < 0) { preview.classList.add("hidden"); return; }
  var result = evaluate(v);
  var labels = { safe: "✅ Sieht gut aus", warning: "⚠️ Wird knapp", danger: "🚫 Sprengt dein Budget" };
  preview.textContent = labels[result.status];
  preview.className = "live-preview " + result.status;
};

sb.auth.getSession().then(function(result) {
  if (!result.data || !result.data.session) { window.location.href = "index.html"; return; }
  currentUserId = result.data.session.user.id;

  sb.from("profiles").select("*").eq("id", currentUserId).single().then(function(res) {
    if (!res.data || !res.data.onboarding_complete) { window.location.href = "dashboard.html"; return; }
    profile = res.data;

    var startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);

    sb.from("checks").select("*", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .gte("created_at", startOfMonth.toISOString())
      .then(function(res) {
        checksCount = res.count || 0;
        document.getElementById("loader").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");

        if (!profile.is_premium) {
          var remaining = Math.max(0, FREE_LIMIT - checksCount);
          var banner = document.getElementById("free-banner");
          if (remaining === 0) {
            banner.innerHTML = '<div class="result-card danger" style="margin-bottom:16px;"><span class="result-icon">🔒</span><div class="result-title">Limit erreicht</div><div class="result-detail">3 kostenlose Prüfungen aufgebraucht.</div><a href="profile.html" class="btn btn-primary" style="margin-top:12px;">Premium freischalten</a></div>';
            document.getElementById("check-btn").disabled = true;
          } else {
            banner.innerHTML = '<div class="live-preview" style="margin-bottom:16px;">Noch <strong>' + remaining + '</strong> kostenlose Prüfung' + (remaining === 1 ? "" : "en") + ' diesen Monat. <a href="profile.html" style="color:var(--color-accent);margin-left:6px;">Upgrade →</a></div>';
          }
        }
      });
  });
});

document.getElementById("check-form").onsubmit = function(e) {
  e.preventDefault();
  document.getElementById("message").className = "message";
  document.getElementById("result-container").innerHTML = "";

  if (!profile.is_premium && checksCount >= FREE_LIMIT) {
    document.getElementById("message").textContent = "Bitte upgrade auf Premium.";
    document.getElementById("message").className = "message show error";
    return;
  }

  var productName = document.getElementById("product-name").value.trim();
  var amount = parseFloat(document.getElementById("product-price").value);
  if (!productName || isNaN(amount)) {
    document.getElementById("message").textContent = "Bitte alle Felder ausfüllen.";
    document.getElementById("message").className = "message show error";
    return;
  }

  var btn = document.getElementById("check-btn");
  btn.disabled = true; btn.textContent = "Prüfe…";

  var result = evaluate(amount);
  var icons = { safe: "✅", warning: "⚠️", danger: "🚫" };
  document.getElementById("result-container").innerHTML = '<div class="result-card ' + result.status + '"><span class="result-icon">' + icons[result.status] + '</span><div class="result-title">' + result.title + '</div><div class="result-detail">' + result.detail + '</div></div>';

  sb.from("checks").insert({
    user_id: currentUserId, product_name: productName,
    purchase_amount: amount, category: selectedCategory,
    monthly_budget: result.budget, remaining_budget: result.remaining, status: result.status
  }).then(function() {
    checksCount++;
    btn.disabled = false; btn.textContent = "Kann ich mir das leisten?";
    document.getElementById("check-form").reset();
    document.getElementById("live-preview").classList.add("hidden");
    document.querySelectorAll(".category-chip").forEach(function(c) { c.classList.remove("selected"); });
    document.querySelector('.category-chip[data-category="Sonstiges"]').classList.add("selected");
    selectedCategory = "Sonstiges";
  });
};

function evaluate(amount) {
  var budget = (profile.income || 0) - (profile.fixed_costs || 0) - (profile.savings_goal || 0);
  var remaining = budget - amount;
  var pct = budget > 0 ? remaining / budget : 0;
  if (remaining < 0) return { status: "danger", title: "Lieber nicht.", detail: "Dein Budget würde um " + fmt(Math.abs(remaining)) + " überschritten.", budget: budget, remaining: remaining };
  if (pct >= 0.2) return { status: "safe", title: "Ja, problemlos.", detail: "Danach bleiben dir noch " + fmt(remaining) + " (" + Math.round(pct*100) + "%) deines Monatsbudgets.", budget: budget, remaining: remaining };
  return { status: "warning", title: "Machbar, aber knapp.", detail: "Danach bleiben dir nur noch " + fmt(remaining) + " (" + Math.round(pct*100) + "%) deines Monatsbudgets.", budget: budget, remaining: remaining };
}
