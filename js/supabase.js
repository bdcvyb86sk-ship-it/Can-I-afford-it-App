
const { createClient } = window.supabase;

const SUPABASE_URL = "https://frydbeywxltrqwkzfaht.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NlHalOEG7qOXghLjvN4ezQ_WI6WkXNf";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
