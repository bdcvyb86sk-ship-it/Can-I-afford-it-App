// js/check.js
import { supabase } from "./supabase.js";

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const form = document.getElementById("check-form");
const messageEl = document.getElementById("message");
const resultContainer = document.getElementById("result-container");
const checkBtn = document.getElementById("check-btn");
const priceInput = document.getElementById("product-price");
const livePreview = document.getElementById("live-preview");
const categoryGrid = document.getElementById("category-grid");

const fmt = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
const FREE_LIMIT = 3;

let selectedCategory = "Sonstiges";
let profile = null;
let checksCount = 0;

const { data: { session } } = await supabase.auth.getSession();
if (!session) { window.location.href = "index.html"; }

const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
if (!data?.onboarding_complete) { window.location.href = "dashboard.html"; }
profile = data;

// Anzahl Checks diesen Monat zählen
const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
const { count } = await supabase.from("checks")
  .select("*", { count: "exact", head: true })
  .eq("user_id", session.user.id)
  .gte("created_at", startOfMonth.toISOString());
checksCount = count || 0;

loader.classList.add("hidden");
app.classList.remove("hidden");

// Free-Limit Banner
if (!profile.is_premium) {
  const remaining = Math.max(0, FREE_LIMIT - checksCount);
  const banner = document.getElementById("free-banner");
  if (banner) {
    if (remaining === 0) {
      banner.innerHTML = `
        <div class="result-card danger" style="margin-bottom:16px;">
          <span class="result-icon">🔒</span>
          <div class="result-title">Limit erreicht</div>
          <div class="result-detail">Du hast deine 3 kostenlosen Prüfungen diesen Monat aufgebraucht.</div>
          <a href="profile.html" class="btn btn-primary" style="margin-top:12px;">Premium freischalten</a>
        </div>`;
      checkBtn.disabled = true;
    } else {
      banner.innerHTML = `
        <div class="live-preview" style="margin-bottom:16px;">
          Noch <strong>${remaining}</strong> kostenlose Prüfung${remaining === 1 ? "" : "en"} diesen Monat.
          <a href="profile.html" style="color:var(--color-accent);margin-left:6px;">Upgrade →</a>
        </div>`;
    }
  }
}

// Kategorie-Chips
categoryGrid.addEventListener("click", (e) => {
  const chip = e.target.closest(".category-chip");
  if (!chip) return;
  document.querySelectorAll(".category-chip").forEach(c => c.classList.remove("selected"));
  chip.classList.add("selected");
  selectedCategory = chip.dataset.category;
});

function evaluate(amount) {
  const budget = (profile.income || 0) - (profile.fixed_costs || 0) - (profile.savings_goal || 0);
  const remaining = budget - amount;
  const pct = budget > 0 ? remaining / budget : 0;
  if (remaining < 0) return { status: "danger", title: "Lieber nicht.", detail: `Dein Budget würde um ${fmt(Math.abs(remaining))} überschritten.`, budget, remaining };
  if (pct >= 0.2) return { status: "safe", title: "Ja, problemlos.", detail: `Danach bleiben dir noch ${fmt(remaining)} (${Math.round(pct*100)}%) deines Monatsbudgets.`, budget, remaining };
  return { status: "warning", title: "Machbar, aber knapp.", detail: `Danach bleiben dir nur noch ${fmt(remaining)} (${Math.round(pct*100)}%) deines Monatsbudgets.`, budget, remaining };
}

priceInput.addEventListener("input", () => {
  const v = parseFloat(priceInput.value);
  if (!profile || isNaN(v) || v < 0) { livePreview.classList.add("hidden"); return; }
  const { status } = evaluate(v);
  const labels = { safe: "✅ Sieht gut aus", warning: "⚠️ Wird knapp", danger: "🚫 Sprengt dein Budget" };
  livePreview.textContent = labels[status];
  livePreview.className = `live-preview ${status}`;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  messageEl.className = "message";
  resultContainer.innerHTML = "";

  if (!profile.is_premium && checksCount >= FREE_LIMIT) {
    messageEl.textContent = "Bitte upgrade auf Premium für weitere Prüfungen.";
    messageEl.className = "message show error";
    return;
  }

  const productName = document.getElementById("product-name").value.trim();
  const amount = parseFloat(priceInput.value);
  if (!productName || isNaN(amount) || amount < 0) {
    messageEl.textContent = "Bitte Produktname und Preis eingeben.";
    messageEl.className = "message show error";
    return;
  }

  checkBtn.disabled = true; checkBtn.textContent = "Prüfe…";
  const { status, title, detail, budget, remaining } = evaluate(amount);
  const icons = { safe: "✅", warning: "⚠️", danger: "🚫" };

  resultContainer.innerHTML = `
    <div class="result-card ${status}">
      <span class="result-icon">${icons[status]}</span>
      <div class="result-title">${title}</div>
      <div class="result-detail">${detail}</div>
    </div>`;

  await supabase.from("checks").insert({
    user_id: session.user.id,
    product_name: productName,
    purchase_amount: amount,
    category: selectedCategory,
    monthly_budget: budget,
    remaining_budget: remaining,
    status
  });

  checksCount++;
  checkBtn.disabled = false; checkBtn.textContent = "Kann ich mir das leisten?";
  form.reset();
  livePreview.classList.add("hidden");
  document.querySelectorAll(".category-chip").forEach(c => c.classList.remove("selected"));
  document.querySelector('.category-chip[data-category="Sonstiges"]').classList.add("selected");
  selectedCategory = "Sonstiges";
});
