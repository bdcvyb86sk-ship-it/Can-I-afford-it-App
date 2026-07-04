// js/stats.js
import { supabase } from "./supabase.js";

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const premiumLock = document.getElementById("premium-lock");
const statsContent = document.getElementById("stats-content");
const exportBtn = document.getElementById("export-btn");

const fmt = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

const { data: { session } } = await supabase.auth.getSession();
if (!session) { window.location.href = "index.html"; }

const { data: profile } = await supabase.from("profiles").select("is_premium").eq("id", session.user.id).single();
const isPremium = profile?.is_premium || false;

loader.classList.add("hidden");
app.classList.remove("hidden");

if (!isPremium) {
  premiumLock.classList.remove("hidden");
  statsContent.classList.add("hidden");
  exportBtn.classList.add("hidden");
} else {
  await loadStats();
}

async function loadStats() {
  const { data: checks } = await supabase
    .from("checks").select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (!checks || checks.length === 0) return;

  // Dieser Monat
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = checks.filter(c => new Date(c.created_at) >= startOfMonth);

  document.getElementById("stat-total").textContent = thisMonth.length;
  document.getElementById("stat-safe").textContent = thisMonth.filter(c => c.status === "safe").length;
  document.getElementById("stat-warning").textContent = thisMonth.filter(c => c.status === "warning").length;
  document.getElementById("stat-danger").textContent = thisMonth.filter(c => c.status === "danger").length;
  document.getElementById("stat-amount").textContent = fmt(thisMonth.reduce((s, c) => s + (c.purchase_amount || 0), 0));

  // Kategorie-Chart
  const categoryIcons = { Elektronik:"📱", Kleidung:"👕", Freizeit:"🎮", Reisen:"✈️", Wohnen:"🛋️", Essen:"🍔", Sonstiges:"🧩" };
  const catMap = {};
  checks.forEach(c => { catMap[c.category || "Sonstiges"] = (catMap[c.category || "Sonstiges"] || 0) + (c.purchase_amount || 0); });
  const catLabels = Object.keys(catMap).map(k => `${categoryIcons[k] || "🧩"} ${k}`);
  const catData = Object.values(catMap);

  new Chart(document.getElementById("category-chart"), {
    type: "doughnut",
    data: {
      labels: catLabels,
      datasets: [{ data: catData, backgroundColor: ["#0a84ff","#22c55e","#f59e0b","#ef4444","#a855f7","#ec4899","#14b8a6"], borderWidth: 0 }]
    },
    options: { plugins: { legend: { labels: { color: "#a1a1a6", font: { size: 12 } } } } }
  });

  // Trend letzte 6 Monate
  const months = [];
  const monthCounts = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push(d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }));
    monthCounts.push(checks.filter(c => {
      const cd = new Date(c.created_at);
      return cd >= d && cd < end;
    }).length);
  }

  new Chart(document.getElementById("trend-chart"), {
    type: "bar",
    data: {
      labels: months,
      datasets: [{ label: "Prüfungen", data: monthCounts, backgroundColor: "#0a84ff", borderRadius: 8 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#a1a1a6" }, grid: { display: false } },
        y: { ticks: { color: "#a1a1a6", stepSize: 1 }, grid: { color: "#2c2c2e" } }
      }
    }
  });

  // CSV Export
  exportBtn.addEventListener("click", () => {
    const rows = [["Datum", "Produkt", "Kategorie", "Betrag", "Budget", "Rest", "Ergebnis"]];
    checks.forEach(c => {
      rows.push([
        new Date(c.created_at).toLocaleDateString("de-DE"),
        c.product_name, c.category || "Sonstiges",
        c.purchase_amount?.toFixed(2), c.monthly_budget?.toFixed(2),
        c.remaining_budget?.toFixed(2), c.status
      ]);
    });
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "caniaffordit-export.csv"; a.click();
    URL.revokeObjectURL(url);
  });
}
