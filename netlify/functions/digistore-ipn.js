// netlify/functions/digistore-ipn.js
// Digistore24 Webhook/IPN -> schaltet Premium in Supabase frei bzw. wieder ab.
// Nutzt direkt die Supabase-REST-Schnittstelle (fetch), keine zusaetzliche Bibliothek noetig.
//
// Netlify-Variablen:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY   (Secret Key, nur hier!)
//   DS24_WEBHOOK_KEY                      (Zufallswert, steht als ?key=... in der Webhook-URL)
//   DS24_IPN_PASSPHRASE                   (optional, nur falls Digistore eine Signatur mitschickt)

const crypto = require("crypto");

const PRODUCT_PLANS = { "705081": "monthly", "707747": "yearly", "707752": "forever" };
const GRANT_EVENTS = ["on_payment", "payment", "order_completed", "on_rebill_resumed", "rebill", "recurring_payment"];
const REVOKE_EVENTS = ["on_refund", "refund", "on_chargeback", "chargeback"];
const GRACE_DAYS = 3;

function env(name) {
  return String(process.env[name] || "").trim().replace(/^["']+|["']+$/g, "").trim();
}

// Supabase-Adresse tolerant lesen: fehlendes https:// ergaenzen, Schraegstrich/rest-Pfad am Ende entfernen
function supabaseBase() {
  var u = env("SUPABASE_URL");
  if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

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

// Signatur nach Digistore24-Doku: SHA512 ueber "key=value<passphrase>" (Keys sortiert, leere Werte weggelassen)
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
  var passphrase = env("DS24_IPN_PASSPHRASE");
  var sign = params.sha_sign || params.SHASIGN;
  if (sign && passphrase && safeEqual(String(sign).toUpperCase(), digistoreSignature(params, passphrase))) return true;
  var key = env("DS24_WEBHOOK_KEY");
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

// --- Supabase REST ---
async function rest(method, path, body, prefer) {
  var base = supabaseBase();
  var key = env("SUPABASE_SERVICE_KEY");
  var headers = { apikey: key, "Content-Type": "application/json" };
  if (key.indexOf("eyJ") === 0) headers.Authorization = "Bearer " + key; // nur bei alten JWT-Keys
  if (prefer) headers.Prefer = prefer;
  var res = await fetch(base + "/rest/v1/" + path, {
    method: method,
    headers: headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  var text = await res.text();
  if (!res.ok) {
    throw new Error("Supabase " + method + " " + path.split("?")[0] + " -> HTTP " + res.status + ": " + String(text).slice(0, 300));
  }
  return text ? JSON.parse(text) : null;
}

async function findUserId(custom, email) {
  if (/^[0-9a-f-]{36}$/i.test(custom)) {
    var a = await rest("GET", "profiles?select=id&id=eq." + encodeURIComponent(custom) + "&limit=1");
    if (a && a.length) return a[0].id;
  }
  if (email) {
    var b = await rest("GET", "profiles?select=id&email=eq." + encodeURIComponent(email) + "&limit=1");
    if (b && b.length) return b[0].id;
  }
  return null;
}

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    var params = parseBody(event);
    var fieldNames = Object.keys(params).join(",");

    if (!isAuthorized(event, params)) {
      console.warn("IPN abgelehnt (keine gueltige Signatur und kein gueltiger key). Felder:", fieldNames);
      return { statusCode: 403, body: "Forbidden" };
    }

    var eventType = String(params.event || "");
    console.log("IPN:", eventType, "| Felder:", fieldNames);
    if (eventType === "connection_test") return { statusCode: 200, body: "OK" };

    var missing = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter(function (n) { return !env(n); });
    if (missing.length) {
      console.error("Fehlende Netlify-Variablen:", missing.join(", "));
      return { statusCode: 500, body: "Config error" };
    }

    try {
      var host = new URL(supabaseBase()).hostname;
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) throw new Error("ungueltiger Host");
      console.log("Supabase-Host:", host);
    } catch (e) {
      console.error("SUPABASE_URL ist keine gueltige Adresse (Beginn: " + env("SUPABASE_URL").slice(0, 12) + ")");
      return { statusCode: 500, body: "Config error" };
    }

    var email = String(params.email || params.buyer_email || params.customer_email || params.billing_email || "").toLowerCase().trim();
    var plan = PRODUCT_PLANS[String(params.product_id || "")] || null;
    var custom = String(params.custom || "").trim();

    var userId = await findUserId(custom, email);

    if (!userId) {
      try {
        await rest("POST", "pending_premiums", {
          email: email, event_type: eventType, order_id: String(params.order_id || ""), plan: plan, raw: params
        }, "return=minimal");
      } catch (e) {
        console.error("pending_premiums:", e.message);
      }
      console.log("IPN: kein passendes Konto, gespeichert in pending_premiums:", email);
      return { statusCode: 200, body: "OK (pending)" };
    }

    if (GRANT_EVENTS.indexOf(eventType) !== -1) {
      if (!plan) {
        console.warn("IPN: unbekannte product_id:", params.product_id);
        return { statusCode: 200, body: "OK (unknown product)" };
      }
      var now = new Date().toISOString();
      await rest("PATCH", "profiles?id=eq." + encodeURIComponent(userId), {
        is_premium: true, premium_plan: plan, premium_since: now,
        premium_expires_at: expiryFor(plan), premium_updated_at: now
      }, "return=minimal");
      console.log("Premium AN:", userId, plan);
    } else if (REVOKE_EVENTS.indexOf(eventType) !== -1) {
      await rest("PATCH", "profiles?id=eq." + encodeURIComponent(userId), {
        is_premium: false, premium_plan: null, premium_expires_at: null,
        premium_updated_at: new Date().toISOString()
      }, "return=minimal");
      console.log("Premium AUS:", userId);
    } else {
      console.log("IPN: Event ohne Aktion:", eventType);
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("IPN Fehler:", err && err.stack ? err.stack : String(err));
    return { statusCode: 500, body: "Server error" };
  }
};
