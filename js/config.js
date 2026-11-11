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
