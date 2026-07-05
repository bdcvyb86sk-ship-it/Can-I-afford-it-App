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
const fmt = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR"
const FREE_LIMIT = 3;
let selectedCategory = "Sonstiges";
let profile = null;
let currentSession = null;
let checksCount = 0;
categoryGrid.addEventListener("click", function(e) {
  const chip = e.target.closest(".category-chip");
  if (!chip) return;
  document.querySelectorAll(".category-chip").forEach(function(c) { c.classList.remove
  chip.classList.add("selected");
  selectedCategory = chip.dataset.category;
});
supabase.auth.getSession().then(function({ data: { session } }) {
  if (!session) { window.location.href = "index.html"; return; }
  currentSession = session;
  supabase.from("profiles").select("*").eq("id", session.user.id).single()
    .then(function({ data }) {
      if (!data || !data.onboarding_complete) {
        window.location.href = "dashboard.html";
        return;
      }
      profile = data;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
}).for
("selec
       supabase.from("checks").select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .gte("created_at", startOfMonth.toISOString())
        .then(function({ count }) {
          checksCount = count || 0;
          loader.classList.add("hidden");
          app.classList.remove("hidden");
          if (!profile.is_premium) {
            const remaining = Math.max(0, FREE_LIMIT - checksCount);
            const banner = document.getElementById("free-banner");
            if (banner) {
              if (remaining === 0) {
                banner.innerHTML = '<div class="result-card danger" style="margin-bott
                checkBtn.disabled = true;
              } else {
                banner.innerHTML = '<div class="live-preview" style="margin-bottom:16p
} }
} });
}); });
priceInput.addEventListener("input", function() {
  if (!profile) return;
  const v = parseFloat(priceInput.value);
  if (isNaN(v) || v < 0) { livePreview.classList.add("hidden"); return; }
  const result = evaluate(v);
const labels = { safe: " Sieht gut aus", warning: " Wird knapp", danger: " Spr livePreview.textContent = labels[result.status];
livePreview.className = "live-preview " + result.status;
});
form.addEventListener("submit", function(e) {
  e.preventDefault();
  messageEl.className = "message";
  resultContainer.innerHTML = "";
  if (!profile.is_premium && checksCount >= FREE_LIMIT) {
    messageEl.textContent = "Bitte upgrade auf Premium für weitere Prüfungen.";
    messageEl.className = "message show error";
    return;
  }
  const productName = document.getElementById("product-name").value.trim();
   om:16px
x;">Noc
engt d
e

   const amount = parseFloat(priceInput.value);
  if (!productName || isNaN(amount) || amount < 0) {
    messageEl.textContent = "Bitte Produktname und Preis eingeben.";
    messageEl.className = "message show error";
    return;
}
  checkBtn.disabled = true;
  checkBtn.textContent = "Prüfe...";
const result = evaluate(amount);
consticons={safe:" ",warning:" ",danger:" "};
  resultContainer.innerHTML = '<div class="result-card ' + result.status + '"><span cl
  supabase.from("checks").insert({
    user_id: currentSession.user.id,
    product_name: productName,
    purchase_amount: amount,
    category: selectedCategory,
    monthly_budget: result.budget,
    remaining_budget: result.remaining,
    status: result.status
  }).then(function() {
    checksCount++;
    checkBtn.disabled = false;
    checkBtn.textContent = "Kann ich mir das leisten?";
    form.reset();
    livePreview.classList.add("hidden");
    document.querySelectorAll(".category-chip").forEach(function(c) { c.classList.remo
    document.querySelector('.category-chip[data-category="Sonstiges"]').classList.add(
    selectedCategory = "Sonstiges";
}); });
function evaluate(amount) {
  const budget = (profile.income || 0) - (profile.fixed_costs || 0) - (profile.savings
  const remaining = budget - amount;
  const pct = budget > 0 ? remaining / budget : 0;
  if (remaining < 0) return { status: "danger", title: "Lieber nicht.", detail: "Dein
  if (pct >= 0.2) return { status: "safe", title: "Ja, problemlos.", detail: "Danach b
  return { status: "warning", title: "Machbar, aber knapp.", detail: "Danach bleiben d
}
