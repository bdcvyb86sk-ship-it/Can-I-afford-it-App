// js/dashboard.js
import { supabase } from "./supabase.js";
const loader = document.getElementById("loader");
const app = document.getElementById("app");
const onboarding = document.getElementById("onboarding");
const mainDashboard = document.getElementById("main-dashboard");
const onboardingForm = document.getElementById("onboarding-form");
const fmt = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR"
function showOnboarding() {
  onboarding.classList.remove("hidden");
  mainDashboard.classList.add("hidden");
  loader.classList.add("hidden");
  app.classList.remove("hidden");
}
function showDashboard(profile) {
  onboarding.classList.add("hidden");
  mainDashboard.classList.remove("hidden");
  loader.classList.add("hidden");
  app.classList.remove("hidden");
  renderDashboard(profile);
}
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session) {
    window.location.href = "index.html";
return; }
  const userId = session.user.id;
  document.getElementById("user-name").textContent = session.user.user_metadata?.name
  supabase.from("profiles").select("*").eq("id", userId).single()
    .then(({ data: profile, error }) => {
      if (error || !profile) {
        // Profil anlegen
        supabase.from("profiles").upsert({
          id: userId,
          name: session.user.user_metadata?.name || "",
          email: session.user.email,
          income: 0, fixed_costs: 0, savings_goal: 0,
}).for
|| "Nut
           current_balance: 0, is_premium: false, onboarding_complete: false
        }).then(() => {
          showOnboarding();
        });
      } else if (!profile.onboarding_complete) {
        showOnboarding();
      } else {
        showDashboard(profile);
} });
});
onboardingForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const income = parseFloat(document.getElementById("ob-income").value);
  const fixed_costs = parseFloat(document.getElementById("ob-fixed").value);
  const savings_goal = parseFloat(document.getElementById("ob-savings").value);
  const current_balance = parseFloat(document.getElementById("ob-balance").value);
  if ([income, fixed_costs, savings_goal, current_balance].some(isNaN)) {
    const msg = document.getElementById("onboarding-message");
    msg.textContent = "Bitte alle Felder ausfüllen.";
    msg.className = "message show error";
return; }
  const btn = onboardingForm.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Speichern...";
  supabase.auth.getSession().then(({ data: { session } }) => {
    const userId = session.user.id;
    supabase.from("profiles").update({
      income, fixed_costs, savings_goal, current_balance, onboarding_complete: true
    }).eq("id", userId).then(() => {
      supabase.from("profiles").select("*").eq("id", userId).single().then(({ data: fr
        showDashboard(fresh);
}); });
}); });
function renderDashboard(p) {
  const income = p.income || 0;
  const fixed = p.fixed_costs || 0;
  const savings = p.savings_goal || 0;
esh })

 const balance = p.current_balance || 0;
const budget = income - fixed - savings;
document.getElementById("available-budget").textContent = fmt(budget);
document.getElementById("display-income").textContent = fmt(income);
document.getElementById("display-fixed").textContent = fmt(fixed);
document.getElementById("display-savings").textContent = fmt(savings);
document.getElementById("display-balance").textContent = fmt(balance);
const budgetEl = document.getElementById("available-budget");
let status;
if (budget < 0) { status = "danger"; budgetEl.style.color = "#EF4444"; }
else if (income > 0 && budget < income * 0.2) { status = "warning"; budgetEl.style.c
else { status = "safe"; budgetEl.style.color = "#22C55E"; }
const pct = savings > 0 ? Math.min(100, Math.max(0, (balance / savings) * 100)) : 0;
const fill = document.getElementById("savings-progress-fill");
fill.style.width = pct + "%";
fill.className = "progress-fill " + status;
document.getElementById("savings-percent").textContent = Math.round(pct) + "%";
document.getElementById("savings-current").textContent = fmt(balance);
document.getElementById("savings-target").textContent = "Ziel: " + fmt(savings);
const slot = document.getElementById("premium-card-slot");
const badge = document.getElementById("premium-badge-slot");
if (p.is_premium) {
badge.innerHTML = '<span class="premium-badge"> Premium</span>';
  slot.innerHTML = "";
} else {
  badge.innerHTML = "";
  slot.innerHTML = '<div class="premium-card"><div class="premium-title">
Premium
  } }
