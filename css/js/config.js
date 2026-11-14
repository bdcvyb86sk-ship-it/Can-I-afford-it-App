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
