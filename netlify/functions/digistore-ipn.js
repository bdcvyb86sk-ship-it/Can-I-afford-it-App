// netlify/functions/digistore-ipn.js
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const PRODUCT_IDS = {
  "705081": "monthly",
  "707747": "yearly",
  "707752": "forever"
};

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function parseBody(body) {
  var result = {};
  new URLSearchParams(body).forEach(function(v, k) { result[k] = v; });
  return result;
}

function verifySignature(params, passphrase) {
  var received = params["sha_sign"];
  if (!received) return false;
  var sorted = Object.keys(params).filter(function(k) { return k !== "sha_sign"; }).sort().map(function(k) { return k + "=" + params[k]; }).join("&");
  var expected = crypto.createHmac("sha512", passphrase).update(sorted).digest("hex").toUpperCase();
  try { return crypto.timingSafeEqual(Buffer.from(received.toUpperCase()), Buffer.from(expected)); } catch(e) { return false; }
}

function calcExpiresAt(plan) {
  var d = new Date();
  if (plan === "monthly") { d.setMonth(d.getMonth() + 1); return d.toISOString(); }
  if (plan === "yearly") { d.setFullYear(d.getFullYear() + 1); return d.toISOString(); }
  return null;
}

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  var passphrase = process.env.DS24_IPN_PASSPHRASE;
  if (!passphrase) return { statusCode: 500, body: "Config error" };

  var params = parseBody(event.body || "");
  if (!verifySignature(params, passphrase)) return { statusCode: 403, body: "Invalid signature" };

  var eventType = params["event"] || "";
  var email = (params["customer_email"] || params["billing_email"] || "").toLowerCase().trim();
  var plan = PRODUCT_IDS[params["product_id"]] || "unknown";

  if (!email) return { statusCode: 400, body: "Missing email" };

  var supabase = getSupabase();
  var res = await supabase.from("profiles").select("id").eq("email", email).limit(1);

  if (!res.data || res.data.length === 0) {
    await supabase.from("pending_premiums").insert({ email: email, event_type: eventType, plan: plan });
    return { statusCode: 200, body: "OK (pending)" };
  }

  var userId = res.data[0].id;

  if (["payment","order_completed","on_payment","rebill","recurring_payment"].includes(eventType)) {
    await supabase.from("profiles").update({ is_premium: true, premium_plan: plan, premium_since: new Date().toISOString(), premium_expires_at: calcExpiresAt(plan) }).eq("id", userId);
  } else if (["refund","chargeback","on_refund","cancel","on_cancel"].includes(eventType)) {
    await supabase.from("profiles").update({ is_premium: false, premium_plan: null, premium_expires_at: null }).eq("id", userId);
  }

  return { statusCode: 200, body: "OK" };
};
