// js/dashboard.js
import { supabase } from "./supabase.js";

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const onboarding = document.getElementById("onboarding");
const mainDashboard = document.getElementById("main-dashboard");
const onboardingForm = document.getElementById("onboarding-form");
const onboardingMessage = document.getElementById("onboarding-message");

const fmt = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

const { data: { session } } = await supabase.auth.getSession();
if (!session) { window.location.href = "index.html"; }

const userId = session.user.id;
let { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

if (!profile) {
  await supabase.from("profiles").insert({
    id: userId, name: session.user.user_metadata?.name || "",
    email: session.user.email, income: 0, fixed_costs: 0,
    savings_goal: 0, current_balance: 0, is_premium: false, onboarding_complete: false
  });
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  profile = data;
}

document.getElementById("user-name").textContent = profile.name || "Nutzer";

if (!profile.onboarding_complete) {
  onboarding.classList.remove("hidden");
} else {
  mainDashboard.classList.remove("hidden");
  renderDashboard(profile);
}

loader.classList.add("hidden");
app.classList.remove("hidden");

onboardingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const income = parseFloat(document.getElementById("ob-income").value);
  const fixed_costs = parseFloat(document.getElementById("ob-fixed").value);
  const savings_goal = parseFloat(document.getElementById("ob-savings").value);
  const current_balance = parseFloat(document.getElementById("ob-balance").value);

  if ([income, fixed_costs, savings_goal, current_balance].some(isNaN)) {
    const msg = document.getElementById("onboarding-message");
    msg.textContent = "Bitte alle Felder ausfüllen."; msg.className = "message show error"; return;
  }

  const btn = onboardingForm.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Speichern…";

  await supabase.from("profiles").update({
    income, fixed_costs, savings_goal, current_balance, onboarding_complete: true
  }).eq("id", userId);

  const { data: fresh } = await supabase.from("profiles").select("*").eq("id", userId).single();
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
  else if (income > 0 && budget < income * 0.2) { status = "warning"; budgetEl.style.color = "#F59E0B"; }
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
    badge.innerHTML = `<span class="premium-badge">⭐ Premium</span>`;
    slot.innerHTML = "";
  } else {
    badge.innerHTML = "";
    slot.innerHTML = `
      <div class="premium-card">
        <div class="premium-title">⭐ Premium freischalten</div>
        <p style="color:var(--color-text-secondary);font-size:14px;">Du hast noch <strong>3 kostenlose Prüfungen</strong> pro Monat.</p>
        <ul>
          <li>Unbegrenzte Kaufprüfungen</li>
          <li>Statistiken & Charts</li>
          <li>Monatsübersicht & CSV Export</li>
          <li>Fixkosten-Manager</li>
        </ul>
        <a href="profile.html" class="btn btn-primary" style="margin-top:8px;">Ab 4,99 €/Monat</a>
      </div>`;
  }
}
