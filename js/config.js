// js/config.js
// Globaler Supabase Client - kein ES Module Import nötig
const SUPABASE_URL = "https://frydbeywxltrqwkzfaht.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NlHalOEG7qOXghLjvN4ezQ_WI6WkXNf";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Premium nur, wenn aktiv UND (kein Ablaufdatum ODER Ablaufdatum in der Zukunft)
function isPremiumActive(p) {
  if (!p || !p.is_premium) return false;
  if (!p.premium_expires_at) return true;
  return new Date(p.premium_expires_at) > new Date();
}


// ---- iPhone-App (Capacitor): Kauf-Hinweise ausblenden (Apple-Richtlinien) ----
// Auf der normalen Webseite bleibt alles unverändert (isNativeApp ist dort false).
var isNativeApp = false;
try {
  isNativeApp = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
} catch (e) { isNativeApp = false; }

if (isNativeApp) {
  try {
    var hideBuyUi = function () {
      document.querySelectorAll('a[href*="checkout-ds24.com"], .plan-grid').forEach(function (el) { el.style.display = "none"; });
      document.querySelectorAll("a").forEach(function (a) {
        if (/premium freischalten|upgrade|ab 4,99|mehr erfahren|jetzt upgraden/i.test(a.textContent || "")) a.style.display = "none";
      });
      document.querySelectorAll(".premium-card").forEach(function (c) {
        if (!/du bist premium/i.test(c.textContent || "")) c.style.display = "none";
      });
    };
    var hideScheduled = false;
    var scheduleHide = function () {
      if (hideScheduled) return;
      hideScheduled = true;
      setTimeout(function () { hideScheduled = false; hideBuyUi(); }, 50);
    };
    document.addEventListener("DOMContentLoaded", function () {
      hideBuyUi();
      new MutationObserver(scheduleHide).observe(document.body, { childList: true, subtree: true });
    });
  } catch (e) { /* ignorieren */ }
}

// ---- Abrechnungszeitraum ab Zahltag ----
function clampPayDay(v) {
  var n = parseInt(v, 10);
  if (isNaN(n)) return 1;
  return Math.min(Math.max(n, 1), 28);
}
function periodStart(payDay, ref) {
  var d = ref ? new Date(ref) : new Date();
  var pd = clampPayDay(payDay);
  var start = new Date(d.getFullYear(), d.getMonth(), pd, 0, 0, 0, 0);
  if (d < start) start = new Date(d.getFullYear(), d.getMonth() - 1, pd, 0, 0, 0, 0);
  return start;
}
function periodEnd(payDay, ref) {
  var s = periodStart(payDay, ref);
  return new Date(s.getFullYear(), s.getMonth() + 1, s.getDate(), 0, 0, 0, 0);
}
function fmtDay(d) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}
// Summe der als "gekauft" markierten Betraege im aktuellen Zeitraum
function loadSpent(userId, payDay) {
  var start = periodStart(payDay);
  var end = periodEnd(payDay);
  return sb.from("checks").select("purchase_amount, purchased_at, created_at")
    .eq("user_id", userId).eq("purchased", true).limit(1000)
    .then(function (res) {
      var sum = 0;
      (res.data || []).forEach(function (c) {
        var d = new Date(c.purchased_at || c.created_at);
        if (d >= start && d < end) sum += Number(c.purchase_amount) || 0;
      });
      return { spent: sum, start: start, end: end };
    });
}
