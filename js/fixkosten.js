// js/fixkosten.js
var fmt = function(v) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);
};
var fixkostenItems = [];
var currentUserId = null;

function showToast(text) {
  var t = document.createElement("div"); t.className = "toast"; t.textContent = text;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.classList.add("show"); });
  setTimeout(function() { t.classList.remove("show"); setTimeout(function() { t.remove(); }, 250); }, 2200);
}

sb.auth.getSession().then(function(result) {
  if (!result.data || !result.data.session) { window.location.href = "index.html"; return; }
  currentUserId = result.data.session.user.id;

  sb.from("profiles").select("is_premium").eq("id", currentUserId).single().then(function(res) {
    var isPremium = res.data && res.data.is_premium;
    document.getElementById("loader").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    if (!isPremium) {
      document.getElementById("premium-lock").classList.remove("hidden");
      document.getElementById("fixkosten-content").classList.add("hidden");
      return;
    }
    loadFixkosten();
  });
});

function loadFixkosten() {
  sb.from("fixkosten").select("*").eq("user_id", currentUserId).order("created_at").then(function(res) {
    fixkostenItems = res.data || [];
    renderList();
  });
}

function renderList() {
  var list = document.getElementById("fixkosten-list");
  var empty = document.getElementById("fixkosten-empty");
  var total = 0;
  list.innerHTML = "";

  if (fixkostenItems.length === 0) { empty.classList.remove("hidden"); document.getElementById("fixkosten-total").textContent = "0,00 €"; return; }
  empty.classList.add("hidden");

  fixkostenItems.forEach(function(item) {
    total += item.amount || 0;
    var el = document.createElement("div"); el.className = "card-row";
    var d = document.createElement("div"); d.textContent = item.name;
    el.innerHTML = '<span class="label">' + d.innerHTML + '</span><div style="display:flex;align-items:center;gap:12px;"><span class="value">' + fmt(item.amount) + '</span><button data-id="' + item.id + '" style="background:none;border:none;color:#EF4444;font-size:18px;cursor:pointer;">✕</button></div>';
    list.appendChild(el);
  });

  document.getElementById("fixkosten-total").textContent = fmt(total);
  document.querySelectorAll("[data-id]").forEach(function(btn) {
    btn.onclick = function() {
      sb.from("fixkosten").delete().eq("id", btn.dataset.id).then(function() { loadFixkosten(); });
    };
  });
}

document.getElementById("add-form").onsubmit = function(e) {
  e.preventDefault();
  var name = document.getElementById("fix-name").value.trim();
  var amount = parseFloat(document.getElementById("fix-amount").value);
  if (!name || isNaN(amount)) return;
  sb.from("fixkosten").insert({ user_id: currentUserId, name: name, amount: amount }).then(function() {
    document.getElementById("add-form").reset();
    loadFixkosten();
  });
};

document.getElementById("sync-btn").onclick = function() {
  var total = fixkostenItems.reduce(function(s, i) { return s + (i.amount || 0); }, 0);
  sb.from("profiles").update({ fixed_costs: total }).eq("id", currentUserId).then(function() {
    showToast("Fixkosten (" + fmt(total) + ") im Profil übernommen ✓");
  });
};
