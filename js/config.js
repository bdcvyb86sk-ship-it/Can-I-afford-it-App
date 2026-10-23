// js/config.js
// Globaler Supabase Client - kein ES Module Import nötig
const SUPABASE_URL = "https://frydbeywxltrqwkzfaht.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NlHalOEG7qOXghLjvN4ezQ_WI6WkXNf";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
