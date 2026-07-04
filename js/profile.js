// js/profile.js
import { supabase } from "./supabase.js";

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const form = document.getElementById("profile-form");
const messageEl = document.getElementById("message");
const logoutBtn = document.getElementById("logout-btn");
const logoutModal = document.getElementById("logout-modal");
const logoutCancel = document.getElementById("logout-cancel");
const logoutConfirm = document.getElementById("logout-confirm");
const premiumSection = document.getElementById("premium-section");

const DS24_LINKS = {
  monthly:  "https://www.checkout-ds24.com/product/705081",
  yearly:   "https://www.checkout-ds24.com/product/707747",
  forever:  "https://www.checkout-ds24.com/product/707752"
};

function showToast(text) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = text;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 250); }, 2200);
}

function showMessage(text, type = "error") {
  messageEl.textContent = text;
  messageEl.className = `message show ${type}`;
  setTimeout(() => { messageEl.className = "message"; }, 3000);
}

const { data: { session } } = await supabase.auth.getSession();
if (!session) { window.location.href = "index.html"; }

const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();

if (profile) {
  document.getElementById("profile-name").value = profile.name || "";
  document.getElementById("profile-email").value = profile.email || session.user.email || "";
  document.getElementById("profile-income").value = profile.income || 0;
  document.getElementById("profile-fixed").value = profile.fixed_costs || 0;
  document.getElementById("profile-savings").value = profile.savings_goal || 0;
  document.getElementById("profile-balance").value = profile.current_balance || 0;
  renderPremiumSection(profile.is_premium);
}

loader.classList.add("hidden");
app.classList.remove("hidden");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("profile-name").value.trim();
  const income = parseFloat(document.getElementById("profile-income").value);
  const fixed_costs = parseFloat(document.getElementById("profile-fixed").value);
  const savings_goal = parseFloat(document.getElementById("profile-savings").value);
  const current_balance = parseFloat(document.getElementById("profile-balance").value);

  if (!name || [income, fixed_costs, savings_goal, current_balance].some(isNaN)) {
    showMessage("Bitte alle Felder korrekt ausfüllen."); return;
  }

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Speichern…";

  const { error } = await supabase.from("profiles").update({
    name, income, fixed_costs, savings_goal, current_balance
  }).eq("id", session.user.id);

  if (error) { showMessage("Speichern fehlgeschlagen."); }
  else { showToast("Profil aktualisiert ✓"); }
  btn.disabled = false; btn.textContent = "Änderungen speichern";
});

function renderPremiumSection(isPremium) {
  if (isPremium) {
    premiumSection.innerHTML = `
      <div class="premium-card">
        <div class="premium-title">⭐ Du bist Premium-Mitglied</div>
        <ul>
          <li>Unbegrenzte Kaufprüfungen</li>
          <li>Statistiken & Charts</li>
          <li>Monatsübersicht</li>
          <li>CSV Export</li>
          <li>Fixkosten-Manager</li>
        </ul>
      </div>`;
  } else {
    premiumSection.innerHTML = `
      <div class="premium-card">
        <div class="premium-title">⭐ Premium freischalten</div>
        <p style="color:var(--color-text-secondary);font-size:14px;">
          Erweiterte Funktionen für deine Finanzplanung.
        </p>
        <ul>
          <li>Unbegrenzte Kaufprüfungen (Free: 3)</li>
          <li>Statistiken & Charts</li>
          <li>Monatsübersicht</li>
          <li>CSV Export</li>
          <li>Fixkosten-Manager</li>
        </ul>
        <div class="plan-grid">
          <a href="${DS24_LINKS.monthly}" target="_blank" rel="noopener" class="plan-option">
            <div class="plan-left">
              <span class="plan-name">Monatlich</span>
              <span class="plan-sub">Jederzeit kündbar</span>
            </div>
            <div class="plan-price">4,99 €<span class="plan-period">/ Monat</span></div>
          </a>
          <a href="${DS24_LINKS.yearly}" target="_blank" rel="noopener" class="plan-option recommended">
            <div class="plan-left">
              <span class="plan-name">Jährlich <span class="plan-tag">SPARE 33%</span></span>
              <span class="plan-sub">39,99 € pro Jahr</span>
            </div>
            <div class="plan-price">3,33 €<span class="plan-period">/ Monat</span></div>
          </a>
          <a href="${DS24_LINKS.forever}" target="_blank" rel="noopener" class="plan-option">
            <div class="plan-left">
              <span class="plan-name">Forever</span>
              <span class="plan-sub">Einmalzahlung, dauerhafter Zugang</span>
            </div>
            <div class="plan-price">69 €<span class="plan-period">einmalig</span></div>
          </a>
        </div>
        <p style="font-size:12px;color:var(--color-text-secondary);margin-top:8px;">
          Sichere Zahlung über Digistore24. Premium wird automatisch freigeschaltet.
        </p>
      </div>`;
  }
}

logoutBtn.addEventListener("click", () => logoutModal.classList.add("show"));
logoutCancel.addEventListener("click", () => logoutModal.classList.remove("show"));
logoutModal.addEventListener("click", (e) => { if (e.target === logoutModal) logoutModal.classList.remove("show"); });
logoutConfirm.addEventListener("click", async () => {
  logoutConfirm.disabled = true; logoutConfirm.textContent = "Abmelden…";
  await supabase.auth.signOut();
  window.location.href = "index.html";
});
