// js/fixkosten.js
import { supabase } from "./supabase.js";

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const premiumLock = document.getElementById("premium-lock");
const fixkostenContent = document.getElementById("fixkosten-content");
const addForm = document.getElementById("add-form");
const fixkostenList = document.getElementById("fixkosten-list");
const fixkostenEmpty = document.getElementById("fixkosten-empty");
const fixkostenTotal = document.getElementById("fixkosten-total");
const syncBtn = document.getElementById("sync-btn");
const messageEl = document.getElementById("message");

const fmt = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

function showToast(text) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = text;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 250); }, 2200);
}

const { data: { session } } = await supabase.auth.getSession();
if (!session) { window.location.href = "index.html"; }

const { data: profile } = await supabase.from("profiles").select("is_premium").eq("id", session.user.id).single();
const isPremium = profile?.is_premium || false;

loader.classList.add("hidden");
app.classList.remove("hidden");

if (!isPremium) {
  premiumLock.classList.remove("hidden");
  fixkostenContent.classList.add("hidden");
} else {
  await loadFixkosten();
}

let fixkostenItems = [];

async function loadFixkosten() {
  const { data } = await supabase.from("fixkosten")
    .select("*").eq("user_id", session.user.id).order("created_at");
  fixkostenItems = data || [];
  renderList();
}

function renderList() {
  fixkostenList.innerHTML = "";
  if (fixkostenItems.length === 0) {
    fixkostenEmpty.classList.remove("hidden"); fixkostenTotal.textContent = "0,00 €"; return;
  }
  fixkostenEmpty.classList.add("hidden");

  let total = 0;
  fixkostenItems.forEach(item => {
    total += item.amount || 0;
    const el = document.createElement("div");
    el.className = "card-row";
    el.innerHTML = `
      <span class="label">${esc(item.name)}</span>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="value">${fmt(item.amount)}</span>
        <button data-id="${item.id}" class="delete-btn" style="background:none;border:none;color:#EF4444;font-size:18px;cursor:pointer;">✕</button>
      </div>`;
    fixkostenList.appendChild(el);
  });

  fixkostenTotal.textContent = fmt(total);

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await supabase.from("fixkosten").delete().eq("id", btn.dataset.id);
      await loadFixkosten();
    });
  });
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("fix-name").value.trim();
  const amount = parseFloat(document.getElementById("fix-amount").value);
  if (!name || isNaN(amount) || amount < 0) return;

  await supabase.from("fixkosten").insert({ user_id: session.user.id, name, amount });
  addForm.reset();
  await loadFixkosten();
});

syncBtn.addEventListener("click", async () => {
  const total = fixkostenItems.reduce((s, i) => s + (i.amount || 0), 0);
  await supabase.from("profiles").update({ fixed_costs: total }).eq("id", session.user.id);
  showToast(`Fixkosten (${fmt(total)}) im Profil übernommen ✓`);
});

function esc(str) { const d = document.createElement("div"); d.textContent = str; return d.innerHTML; }
