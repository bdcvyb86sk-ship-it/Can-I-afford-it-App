// netlify/functions/digistore-ipn.js
// Digistore24 IPN Handler – schaltet Premium in Supabase automatisch frei
// Endpoint: /.netlify/functions/digistore-ipn
//
// Netlify Environment Variables benötigt:
//   SUPABASE_URL         → https://frydbeywxltrqwkzfaht.supabase.co
//   SUPABASE_SERVICE_KEY → service_role Key aus Supabase Settings → API
//   DS24_IPN_PASSPHRASE  → selbst gewähltes Passwort (auch bei Digistore24 eintragen)

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Digistore24 Produkt-IDs
const PRODUCT_IDS = {
  "705081": "monthly",   // Premium Monatlich
  "707747": "yearly",    // Premium Jährlich
  "707752": "forever"    // Premium Forever
};

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function parseBody(body) {
  const result = {};
  for (const [k, v] of new URLSearchParams(body).entries()) result[k] = v;
  return result;
}

function verifySignature(params, passphrase) {
  const received = params["sha_sign"];
  if (!received) return false;
  const sorted = Object.keys(params).filter(k => k !== "sha_sign").sort().map(k => `${k}=${params[k]}`).join("&");
  const expected = crypto.createHmac("sha512", passphrase).update(sorted).digest("hex").toUpperCase();
  try { return crypto.timingSafeEqual(Buffer.from(received.toUpperCase()), Buffer.from(expected)); }
  catch { return false; }
}

function calcExpiresAt(plan) {
  const d = new Date();
  if (plan === "monthly") { d.setMonth(d.getMonth() + 1); return d.toISOString(); }
  if (plan === "yearly") { d.setFullYear(d.getFullYear() + 1); return d.toISOString(); }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const passphrase = process.env.DS24_IPN_PASSPHRASE;
  if (!passphrase) return { statusCode: 500, body: "Config error" };

  const params = parseBody(event.body || "");
  if (!verifySignature(params, passphrase)) {
    console.warn("IPN: Ungültige Signatur");
    return { statusCode: 403, body: "Invalid signature" };
  }

  const eventType = params["event"] || "";
  const email = (params["customer_email"] || params["billing_email"] || "").toLowerCase().trim();
  const productId = params["product_id"] || "";
  const orderId = params["order_id"] || "?";
  const plan = PRODUCT_IDS[productId] || "unknown";

  console.log(`IPN: ${eventType} | Order: ${orderId} | Email: ${email} | Plan: ${plan}`);
  if (!email) return { statusCode: 400, body: "Missing email" };

  const supabase = getSupabase();
  const { data: users } = await supabase.from("profiles").select("id").eq("email", email).limit(1);

  if (!users || users.length === 0) {
    await supabase.from("pending_premiums").insert({ email, event_type: eventType, order_id: orderId, plan, raw: params });
    console.log(`IPN: Kein Nutzer für ${email} – in pending_premiums gespeichert`);
    return { statusCode: 200, body: "OK (pending)" };
  }

  const userId = users[0].id;

  switch (eventType) {
    case "payment": case "order_completed": case "on_payment":
    case "rebill": case "recurring_payment": {
      const expiresAt = calcExpiresAt(plan);
      await supabase.from("profiles").update({
        is_premium: true, premium_plan: plan,
        premium_since: new Date().toISOString(),
        premium_expires_at: expiresAt,
        premium_updated_at: new Date().toISOString()
      }).eq("id", userId);
      console.log(`✅ Premium AN: ${email} | Plan: ${plan}`);
      break;
    }
    case "refund": case "chargeback": case "on_refund":
    case "cancel": case "on_cancel": {
      await supabase.from("profiles").update({
        is_premium: false, premium_plan: null,
        premium_expires_at: null,
        premium_updated_at: new Date().toISOString()
      }).eq("id", userId);
      console.log(`❌ Premium AUS: ${email}`);
      break;
    }
    default: console.log(`IPN: Unbekannter Event: ${eventType}`);
  }

  return { statusCode: 200, body: "OK" };
};
