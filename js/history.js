// js/history.js
import { supabase } from "./supabase.js";

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const historyList = document.getElementById("history-list");
const emptyState = document.getElementById("empty-state");
const filterTabs = document.getElementById("filter-tabs");

const FREE_LIMIT = 3;
const fmt = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
const fmtDate = (s) => s ? new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(s)) : "";
const statusLabels = { safe: "Problemlos", warning: "Knapp", danger: "Lieber nicht" };
const categoryIcons = { Elektronik:"📱", Kleidung:"👕", Freizeit:"🎮", Reisen:"✈️", Wohnen:"🛋️", Essen:"🍔", Sonstiges:"🧩" };

const { data: { session } } = await supabase.auth.getSession();
if (!session) { window.location.href = "index.html"; }

const { data: profile } = await supabase.from("profiles").select("is_premium").eq("id", session.user.id).single();
const isPremium = profile?.is_premium || false;

const { data: checks } = await supabase.from("checks").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });

let allChecks = checks || [];
let activeFilter = "all";

loader.classList.add("hidden");
app.classList.remove("hidden");
renderList();

filterTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".filter-tab");
  if (!tab) return;
  document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  activeFilter = tab.dataset.filter;
  renderList();
});

function renderList() {
  historyList.innerHTML = "";
  const filtered = activeFilter === "all" ? allChecks : allChecks.filter(c => c.status === activeFilter);
  const limited = isPremium ? filtered : filtered.slice(0, FREE_LIMIT);

  if (allChecks.length === 0) { emptyState.classList.remove("hidden"); return; }
  emptyState.classList.add("hidden");

  if (limited.length === 0) {
    historyList.innerHTML = `<p class="subtitle" style="text-align:center;padding:24px 0;">Keine Einträge in dieser Kategorie.</p>`;
    return;
  }

  limited.forEach(c => {
    const icon = categoryIcons[c.category] || "🧩";
    const el = document.createElement("div");
    el.className = "history-item";
    el.innerHTML = `
      <div class="info">
        <div class="name">${icon} ${esc(c.product_name)}</div>
        <div class="date">${fmtDate(c.created_at)}</div>
        <span class="badge ${c.status}">${statusLabels[c.status] || c.status}</span>
      </div>
      <div class="amount">${fmt(c.purchase_amount)}</div>`;
    historyList.appendChild(el);
  });

  if (!isPremium && filtered.length > FREE_LIMIT) {
    const upsell = document.createElement("div");
    upsell.className = "premium-card"; upsell.style.marginTop = "16px";
    upsell.innerHTML = `
      <div class="premium-title">⭐ ${filtered.length - FREE_LIMIT} weitere Einträge</div>
      <p style="color:var(--color-text-secondary);font-size:14px;margin-bottom:0;">Mit Premium siehst du deine komplette Historie.</p>
      <a href="profile.html" class="btn btn-primary" style="margin-top:12px;">Premium freischalten</a>`;
    historyList.appendChild(upsell);
  }
}

function esc(str) { const d = document.createElement("div"); d.textContent = str; return d.innerHTML; }
