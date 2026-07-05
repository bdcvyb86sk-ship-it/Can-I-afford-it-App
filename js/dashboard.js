 // js/dashboard.js
import { supabase } from "./supabase.js";
const loader = document.getElementById("loader");
const app = document.getElementById("app");
const onboarding = document.getElementById("onboarding");
const mainDashboard = document.getElementById("main-dashboard");
const onboardingForm = document.getElementById("onboarding-form");
const fmt = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR"
async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "index.html";
      return;
    }
    const userId = session.user.id;
    // Profil laden
    let { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    // Falls kein Profil vorhanden - anlegen
    if (error || !profile) {
      await supabase.from("profiles").upsert({
        id: userId,
        name: session.user.user_metadata?.name || "",
        email: session.user.email,
        income: 0, fixed_costs: 0, savings_goal: 0,
        current_balance: 0, is_premium: false, onboarding_complete: false
});
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).si
      profile = data;
    }
document.getElementById("user-name").textContent = profile.name || "Nutzer";
}).for
ngle();
     loader.classList.add("hidden");
    app.classList.remove("hidden");
    if (!profile.onboarding_complete) {
      onboarding.classList.remove("hidden");
      mainDashboard.classList.add("hidden");
    } else {
      onboarding.classList.add("hidden");
      mainDashboard.classList.remove("hidden");
      renderDashboard(profile);
}
  } catch (err) {
    console.error("Fehler:", err);
    loader.classList.add("hidden");
    app.classList.remove("hidden");
} }
init();
onboardingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session.user.id;
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
  btn.disabled = true; btn.textContent = "Speichern...";
  const { error } = await supabase.from("profiles").update({
    income, fixed_costs, savings_goal, current_balance, onboarding_complete: true
  }).eq("id", userId);

   if (error) {
    console.error("Update Fehler:", error);
    btn.disabled = false; btn.textContent = "Speichern & los geht's";
    return;
}
  const { data: fresh } = await supabase.from("profiles").select("*").eq("id", userId)
  onboarding.classList.add("hidden");
  mainDashboard.classList.remove("hidden");
  renderDashboard(fresh);
});
function renderDashboard(p) {
  const income = p.income || 0;
  const fixed = p.fixed_costs || 0;
  const savings = p.savings_goal || 0;
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
  fill.style.width = `${pct}%`;
  fill.className = `progress-fill ${status}`;
  document.getElementById("savings-percent").textContent = `${Math.round(pct)}%`;
  document.getElementById("savings-current").textContent = fmt(balance);
  document.getElementById("savings-target").textContent = `Ziel: ${fmt(savings)}`;
  const slot = document.getElementById("premium-card-slot");
  const badge = document.getElementById("premium-badge-slot");
  if (p.is_premium) {
   badge.innerHTML = `<span class="premium-badge">
  slot.innerHTML = "";
} else {
  badge.innerHTML = "";
  slot.innerHTML = `
Premium</span>`;
.single
olor =

 
