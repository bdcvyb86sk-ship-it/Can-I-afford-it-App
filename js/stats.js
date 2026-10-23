// js/stats.js
var fmt = function(v) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);
};

sb.auth.getSession().then(function(result) {
  if (!result.data || !result.data.session) { window.location.href = "index.html"; return; }
  var userId = result.data.session.user.id;

  sb.from("profiles").select("is_premium").eq("id", userId).single().then(function(res) {
    var isPremium = res.data && res.data.is_premium ? true : false;
    document.getElementById("loader").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    if (!isPremium) {
      document.getElementById("premium-lock").classList.remove("hidden");
      document.getElementById("stats-content").classList.add("hidden");
      document.getElementById("export-btn").classList.add("hidden");
      return;
    }

    sb.from("checks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).then(function(res) {
      var checks = res.data || [];
      if (checks.length === 0) return;

      var now = new Date();
      var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      var thisMonth = checks.filter(function(c) { return new Date(c.created_at) >= startOfMonth; });

      document.getElementById("stat-total").textContent = thisMonth.length;
      document.getElementById("stat-safe").textContent = thisMonth.filter(function(c) { return c.status === "safe"; }).length;
      document.getElementById("stat-warning").textContent = thisMonth.filter(function(c) { return c.status === "warning"; }).length;
      document.getElementById("stat-danger").textContent = thisMonth.filter(function(c) { return c.status === "danger"; }).length;
      document.getElementById("stat-amount").textContent = fmt(thisMonth.reduce(function(s, c) { return s + (c.purchase_amount || 0); }, 0));

      var catMap = {};
      var catIcons = { Elektronik:"📱", Kleidung:"👕", Freizeit:"🎮", Reisen:"✈️", Wohnen:"🛋️", Essen:"🍔", Sonstiges:"🧩" };
      checks.forEach(function(c) {
        var k = c.category || "Sonstiges";
        catMap[k] = (catMap[k] || 0) + (c.purchase_amount || 0);
      });
      var catLabels = Object.keys(catMap).map(function(k) { return (catIcons[k] || "🧩") + " " + k; });
      new Chart(document.getElementById("category-chart"), {
        type: "doughnut",
        data: { labels: catLabels, datasets: [{ data: Object.values(catMap), backgroundColor: ["#0a84ff","#22c55e","#f59e0b","#ef4444","#a855f7","#ec4899","#14b8a6"], borderWidth: 0 }] },
        options: { plugins: { legend: { labels: { color: "#a1a1a6", font: { size: 12 } } } } }
      });

      var months = [], monthCounts = [];
      for (var i = 5; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        var end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        months.push(d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }));
        monthCounts.push(checks.filter(function(c) { var cd = new Date(c.created_at); return cd >= d && cd < end; }).length);
      }
      new Chart(document.getElementById("trend-chart"), {
        type: "bar",
        data: { labels: months, datasets: [{ label: "Prüfungen", data: monthCounts, backgroundColor: "#0a84ff", borderRadius: 8 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: "#a1a1a6" }, grid: { display: false } }, y: { ticks: { color: "#a1a1a6", stepSize: 1 }, grid: { color: "#2c2c2e" } } } }
      });

      document.getElementById("export-btn").onclick = function() {
        var rows = [["Datum","Produkt","Kategorie","Betrag","Budget","Rest","Ergebnis"]];
        checks.forEach(function(c) {
          rows.push([new Date(c.created_at).toLocaleDateString("de-DE"), c.product_name, c.category||"Sonstiges", (c.purchase_amount||0).toFixed(2), (c.monthly_budget||0).toFixed(2), (c.remaining_budget||0).toFixed(2), c.status]);
        });
        var csv = rows.map(function(r) { return r.join(";"); }).join("\n");
        var blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a"); a.href = url; a.download = "caniaffordit-export.csv"; a.click();
        URL.revokeObjectURL(url);
      };
    });
  });
});
