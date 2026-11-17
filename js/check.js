// js/check.js
var FREE_LIMIT = 5;
var selectedCategory = "Sonstiges";
var profile = null;
var currentUserId = null;
var checksCount = 0;
var spent = 0;
var periodInfo = null;

var fmt = function(v) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
};

function monthlyBudget() {
  return (profile.income || 0) - (profile.fixed_costs || 0) - (profile.savings_goal || 0);
}

function renderBudgetInfo() {
  var el = document.getElementById("budget-info");
  if (!el || !periodInfo || !profile) return;
  var left = monthlyBudget() - spent;
  var lastDay = new Date(periodInfo.end.getFullYear(), periodInfo.end.getMonth(), periodInfo.end.getDate() - 1);
  el.innerHTML = '<div class="card" style="margin-bottom:16px;">' +
    '<div class="card-row"><span class="label">Zeitraum</span><span class="value">' + fmtDay(periodInfo.start) + ' – ' + fmtDay(lastDay) + '</span></div>' +
    '<div class="card-row"><span class="label">Bereits gekauft</span><span class="value">' + fmt(spent) + '</span></div>' +
    '<div class="card-row"><span class="label">' + (left < 0 ? "Überzogen" : "Noch frei") + '</span><span class="value" style="color:' + (left < 0 ? "#EF4444" : "#22C55E") + ';">' + fmt(Math.abs(left)) + '</span></div></div>';
}

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

    loadSpent(currentUserId, profile.pay_day).then(function(info) {
      spent = info.spent;
      periodInfo = info;

      sb.from("checks").select("*", { count: "exact", head: true })
        .eq("user_id", currentUserId)
        .gte("created_at", info.start.toISOString())
        .then(function(cres) {
          checksCount = cres.count || 0;
          document.getElementById("loader").classList.add("hidden");
          document.getElementById("app").classList.remove("hidden");
          renderBudgetInfo();

          if (!isPremiumActive(profile)) {
            var remaining = Math.max(0, FREE_LIMIT - checksCount);
            var banner = document.getElementById("free-banner");
            if (remaining === 0) {
              banner.innerHTML = '<div class="result-card danger" style="margin-bottom:16px;"><span class="result-icon">🔒</span><div class="result-title">Limit erreicht</div><div class="result-detail">Du hast deine ' + FREE_LIMIT + ' kostenlosen Prüfungen für diesen Monat aufgebraucht.</div><a href="profile.html" class="btn btn-primary" style="margin-top:12px;">Premium freischalten</a></div>';
              document.getElementById("check-btn").disabled = true;
            } else {
              banner.innerHTML = '<div class="live-preview" style="margin-bottom:16px;">Noch <strong>' + remaining + '</strong> kostenlose Prüfung' + (remaining === 1 ? "" : "en") + ' diesen Monat. <a href="profile.html" style="color:var(--color-accent);margin-left:6px;">Upgrade →</a></div>';
            }
          }
        });
    });
  });
});

document.getElementById("check-form").onsubmit = function(e) {
  e.preventDefault();
  var msg = document.getElementById("message");
  msg.className = "message";
  document.getElementById("result-container").innerHTML = "";

  if (!isPremiumActive(profile) && checksCount >= FREE_LIMIT) {
    msg.textContent = "Bitte upgrade auf Premium.";
    msg.className = "message show error";
    return;
  }

  var productName = document.getElementById("product-name").value.trim();
  var amount = parseFloat(document.getElementById("product-price").value);
  if (!productName || isNaN(amount)) {
    msg.textContent = "Bitte alle Felder ausfüllen.";
    msg.className = "message show error";
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
  }).select("id").single().then(function(res) {
    btn.disabled = false; btn.textContent = "Kann ich mir das leisten?";
    if (res.error || !res.data) {
      msg.textContent = "Die Prüfung konnte nicht gespeichert werden.";
      msg.className = "message show error";
      return;
    }
    checksCount++;
    addPurchaseButtons(res.data.id, amount);
    document.getElementById("check-form").reset();
    document.getElementById("live-preview").classList.add("hidden");
    document.querySelectorAll(".category-chip").forEach(function(c) { c.classList.remove("selected"); });
    document.querySelector('.category-chip[data-category="Sonstiges"]').classList.add("selected");
    selectedCategory = "Sonstiges";
  });
};

function addPurchaseButtons(id, amount) {
  var box = document.getElementById("result-container");
  var wrap = document.createElement("div");
  wrap.id = "purchase-actions";
  wrap.style.cssText = "display:flex;gap:10px;margin-bottom:16px;";
  wrap.innerHTML = '<button type="button" class="btn btn-primary" id="btn-bought">✅ Gekauft</button><button type="button" class="btn btn-secondary" id="btn-notbought" style="margin-top:0;">Doch nicht</button>';
  box.appendChild(wrap);
  document.getElementById("btn-bought").onclick = function() { markPurchase(id, true, amount, wrap); };
  document.getElementById("btn-notbought").onclick = function() { markPurchase(id, false, amount, wrap); };
}

function markPurchase(id, bought, amount, wrap) {
  wrap.querySelectorAll("button").forEach(function(b) { b.disabled = true; });
  sb.from("checks").update({ purchased: bought, purchased_at: new Date().toISOString() }).eq("id", id).then(function(res) {
    if (res.error) {
      wrap.innerHTML = '<div class="message show error">Speichern fehlgeschlagen.</div>';
      return;
    }
    if (bought) { spent += amount; renderBudgetInfo(); }
    wrap.innerHTML = '<div class="live-preview">' + (bought ? "Als gekauft gespeichert – dein Budget wurde angepasst." : "Okay, nicht gekauft – dein Budget bleibt unverändert.") + '</div>';
  });
}

function evaluate(amount) {
  var budget = monthlyBudget();
  var remaining = budget - spent - amount;
  var pct = budget > 0 ? remaining / budget : 0;
  var note = spent > 0 ? " (bereits gekauft: " + fmt(spent) + ")" : "";
  if (remaining < 0) return { status: "danger", title: "Lieber nicht.", detail: "Dein Budget würde um " + fmt(Math.abs(remaining)) + " überschritten" + note + ".", budget: budget, remaining: remaining };
  if (pct >= 0.2) return { status: "safe", title: "Ja, problemlos.", detail: "Danach bleiben dir noch " + fmt(remaining) + " (" + Math.round(pct * 100) + "%) deines Monatsbudgets" + note + ".", budget: budget, remaining: remaining };
  return { status: "warning", title: "Machbar, aber knapp.", detail: "Danach bleiben dir nur noch " + fmt(remaining) + " (" + Math.round(pct * 100) + "%) deines Monatsbudgets" + note + ".", budget: budget, remaining: remaining };
}
