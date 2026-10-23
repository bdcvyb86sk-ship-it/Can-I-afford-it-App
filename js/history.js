// js/history.js
var FREE_LIMIT = 3;
var allChecks = [];
var activeFilter = "all";
var isPremium = false;

var fmt = function(v) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
};
var fmtDate = function(s) {
  if (!s) return "";
  return new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(s));
};
var statusLabels = { safe: "Problemlos", warning: "Knapp", danger: "Lieber nicht" };
var categoryIcons = { Elektronik:"📱", Kleidung:"👕", Freizeit:"🎮", Reisen:"✈️", Wohnen:"🛋️", Essen:"🍔", Sonstiges:"🧩" };

sb.auth.getSession().then(function(result) {
  if (!result.data || !result.data.session) { window.location.href = "index.html"; return; }
  var userId = result.data.session.user.id;

  sb.from("profiles").select("is_premium").eq("id", userId).single().then(function(res) {
    isPremium = res.data && res.data.is_premium ? true : false;

    sb.from("checks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).then(function(res) {
      allChecks = res.data || [];
      document.getElementById("loader").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      renderList();
    });
  });
});

document.getElementById("filter-tabs").onclick = function(e) {
  var tab = e.target.closest(".filter-tab");
  if (!tab) return;
  document.querySelectorAll(".filter-tab").forEach(function(t) { t.classList.remove("active"); });
  tab.classList.add("active");
  activeFilter = tab.dataset.filter;
  renderList();
};

function renderList() {
  var list = document.getElementById("history-list");
  var empty = document.getElementById("empty-state");
  list.innerHTML = "";

  var filtered = activeFilter === "all" ? allChecks : allChecks.filter(function(c) { return c.status === activeFilter; });
  var limited = isPremium ? filtered : filtered.slice(0, FREE_LIMIT);

  if (allChecks.length === 0) { empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");

  if (limited.length === 0) {
    list.innerHTML = '<p class="subtitle" style="text-align:center;padding:24px 0;">Keine Einträge.</p>';
    return;
  }

  limited.forEach(function(c) {
    var icon = categoryIcons[c.category] || "🧩";
    var el = document.createElement("div");
    el.className = "history-item";
    var d = document.createElement("div"); d.textContent = c.product_name;
    el.innerHTML = '<div class="info"><div class="name">' + icon + ' ' + d.innerHTML + '</div><div class="date">' + fmtDate(c.created_at) + '</div><span class="badge ' + c.status + '">' + (statusLabels[c.status] || c.status) + '</span></div><div class="amount">' + fmt(c.purchase_amount) + '</div>';
    list.appendChild(el);
  });

  if (!isPremium && filtered.length > FREE_LIMIT) {
    var upsell = document.createElement("div");
    upsell.className = "premium-card";
    upsell.style.marginTop = "16px";
    upsell.innerHTML = '<div class="premium-title">⭐ ' + (filtered.length - FREE_LIMIT) + ' weitere Einträge</div><p style="color:var(--color-text-secondary);font-size:14px;">Mit Premium siehst du alles.</p><a href="profile.html" class="btn btn-primary" style="margin-top:12px;">Premium freischalten</a>';
    list.appendChild(upsell);
  }
}
