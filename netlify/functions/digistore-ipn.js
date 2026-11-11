// netlify/functions/digistore-ipn.js
// Digistore24 Webhook/IPN -> schaltet Premium in Supabase frei bzw. wieder ab.
//
// Netlify-Variablen:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY   (Secret Key, nur hier!)
//   DS24_WEBHOOK_KEY                      (langer Zufallswert, steht als ?key=... in der Webhook-URL)
//   DS24_IPN_PASSPHRASE                   (optional: nur falls Digistore eine Signatur mitschickt)

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const PRODUCT_PLANS = { "705081": "monthly", "707747": "yearly", "707752": "forever" };
const GRANT_EVENTS = ["on_payment", "payment", "order_completed", "on_rebill_resumed", "rebill", "recurring_payment"];
const REVOKE_EVENTS = ["on_refund", "refund", "on_chargeback", "chargeback"];
const GRACE_DAYS = 3;

function parseBody(event) {
  var raw = event.body || "";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
  var result = {};
  var headers = event.headers || {};
  var ct = String(headers["content-type"] || headers["Content-Type"] || "").toLowerCase();
  if (ct.indexOf("json") !== -1 || raw.trim().charAt(0) === "{") {
    try {
      var obj = JSON.parse(raw);
      Object.keys(obj).forEach(function (k) {
        var v = obj[k];
        result[k] = v === null || typeof v === "object" ? "" : String(v);
      });
      return result;
    } catch (e) { /* weiter mit Form-Parsing */ }
  }
  new URLSearchParams(raw).forEach(function (v, k) { result[k] = v; });
  return result;
}

// Signatur nach Digistore24-Dokumentation: SHA512 ueber "key=value<passphrase>" (Keys sortiert, leere Werte ausgelassen)
function digistoreSignature(params, passphrase) {
  var keys = Object.keys(params)
    .filter(function (k) { return k !== "sha_sign" && k !== "SHASIGN"; })
    .sort();
  var str = "";
  keys.forEach(function (k) {
    var v = params[k];
    if (v === undefined || v === null || v === "") return;
    str += k + "=" + v + passphrase;
  });
  return crypto.createHash("sha512").update(str, "utf8").digest("hex").toUpperCase();
}

function safeEqual(a, b) {
  var ba = Buffer.from(String(a));
  var bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function isAuthorized(event, params) {
  var passphrase = process.env.DS24_IPN_PASSPHRASE;
  var sign = params.sha_sign || params.SHASIGN;
  if (sign && passphrase && safeEqual(String(sign).toUpperCase(), digistoreSignature(params, passphrase))) return true;
  var key = process.env.DS24_WEBHOOK_KEY;
  var given = event.queryStringParameters && event.queryStringParameters.key;
  if (key && given && safeEqual(given, key)) return true;
  return false;
}

function expiryFor(plan) {
  if (plan === "forever") return null;
  var d = new Date();
  if (plan === "monthly") d.setMonth(d.getMonth() + 1);
  else if (plan === "yearly") d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() + GRACE_DAYS);
  return d.toISOString();
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  var params = parseBody(event);
  var fieldNames = Object.keys(params).join(",");

  if (!isAuthorized(event, params)) {
    console.warn("IPN abgelehnt (keine gueltige Signatur und kein gueltiger key). Felder:", fieldNames);
    return { statusCode: 403, body: "Forbidden" };
  }

  var eventType = params.event || "";
  console.log("IPN:", eventType, "| Felder:", fieldNames);
  if (eventType === "connection_test") return { statusCode: 200, body: "OK" };

  var email = String(params.email || params.buyer_email || params.customer_email || params.billing_email || "").toLowerCase().trim();
  var plan = PRODUCT_PLANS[String(params.product_id || "")] || null;
  var supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Nutzer finden: erst ueber "custom" (Nutzer-ID aus dem Checkout-Link), dann ueber E-Mail
  var userId = null;
  var custom = String(params.custom || "").trim();
  if (/^[0-9a-f-]{36}$/i.test(custom)) {
    var byId = await supabase.from("profiles").select("id").eq("id", custom).limit(1);
    if (byId.data && byId.data.length) userId = byId.data[0].id;
  }
  if (!userId && email) {
    var byMail = await supabase.from("profiles").select("id").eq("email", email).limit(1);
    if (byMail.data && byMail.data.length) userId = byMail.data[0].id;
  }

  if (!userId) {
    var ins = await supabase.from("pending_premiums").insert({
      email: email, event_type: eventType, order_id: String(params.order_id || ""), plan: plan, raw: params
    });
    if (ins.error) console.error("pending_premiums:", ins.error.message);
    console.log("IPN: kein passendes Konto, gespeichert in pending_premiums:", email);
    return { statusCode: 200, body: "OK (pending)" };
  }

  var res;
  if (GRANT_EVENTS.indexOf(eventType) !== -1) {
    if (!plan) {
      console.warn("IPN: unbekannte product_id:", params.product_id);
      return { statusCode: 200, body: "OK (unknown product)" };
    }
    var now = new Date().toISOString();
    res = await supabase.from("profiles").update({
      is_premium: true, premium_plan: plan, premium_since: now,
      premium_expires_at: expiryFor(plan), premium_updated_at: now
    }).eq("id", userId);
    console.log("Premium AN:", userId, plan, res.error ? "FEHLER " + res.error.message : "ok");
  } else if (REVOKE_EVENTS.indexOf(eventType) !== -1) {
    res = await supabase.from("profiles").update({
      is_premium: false, premium_plan: null, premium_expires_at: null,
      premium_updated_at: new Date().toISOString()
    }).eq("id", userId);
    console.log("Premium AUS:", userId, res.error ? "FEHLER " + res.error.message : "ok");
  } else {
    console.log("IPN: Event ohne Aktion:", eventType);
    return { statusCode: 200, body: "OK" };
  }

  if (res && res.error) return { statusCode: 500, body: "DB error" };
  return { statusCode: 200, body: "OK" };
};
