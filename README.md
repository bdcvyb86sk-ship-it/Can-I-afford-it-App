# Can I Afford It? 💰
### Stack: Supabase + Netlify + Digistore24

---

## 🗂️ Dateistruktur

```
/
├── index.html               → Login / Registrierung
├── dashboard.html            → Onboarding + Budget-Übersicht
├── check.html                → Kauf prüfen (Live-Vorschau + Kategorien)
├── history.html              → Historie mit Filterbar
├── profile.html              → Profil + Premium-Pläne
├── impressum.html
├── datenschutz.html
├── css/style.css
├── js/
│   ├── supabase.js           → Supabase Client (deine URL + Key sind drin)
│   ├── auth.js
│   ├── dashboard.js
│   ├── check.js
│   ├── history.js
│   └── profile.js
├── netlify/functions/
│   ├── digistore-ipn.js      → Webhook: schaltet Premium automatisch frei
│   └── package.json
├── supabase-schema.sql       → Einmal im Supabase SQL-Editor ausführen
└── netlify.toml
```

---

## 🚀 Einrichtung – Schritt für Schritt

---

### SCHRITT 1 – Supabase Datenbank einrichten

**Webseite:** https://supabase.com → dein Projekt → **SQL Editor**

1. Klicke auf **"New query"**
2. Kopiere den gesamten Inhalt der Datei **`supabase-schema.sql`**
3. Füge ihn in den Editor ein
4. Klicke **"Run"** (oder Strg+Enter)

Das erstellt automatisch:
- `profiles` Tabelle (Nutzerprofile + Premium-Status)
- `checks` Tabelle (Kaufprüfungen)
- `pending_premiums` Tabelle (Käufer ohne Konto)
- Alle Sicherheitsregeln (RLS)
- Performance-Indizes

---

### SCHRITT 2 – Supabase Auth konfigurieren

**Supabase → Authentication → Settings**

- **Site URL:** `https://DEINE-NETLIFY-URL.netlify.app`
- **Redirect URLs:** `https://DEINE-NETLIFY-URL.netlify.app/index.html`
- E-Mail-Bestätigung: kannst du für den Start auf **OFF** stellen
  (Authentication → Settings → "Confirm email" deaktivieren)

---

### SCHRITT 3 – Supabase Service Role Key notieren

**Supabase → Settings → API**

Du brauchst zwei Werte für Netlify:
- **Project URL:** `https://frydbeywxltrqwkzfaht.supabase.co` ✅ (bereits in der App eingetragen)
- **service_role** Key (der lange Key unter "Project API keys" → "service_role")
  ⚠️ Nicht öffentlich teilen! Nur in Netlify eintragen.

---

### SCHRITT 4 – Netlify Environment Variables setzen

**Webseite:** https://app.netlify.com → dein Site → **Site configuration → Environment variables**

Klicke je auf "Add a variable" und trage ein:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://frydbeywxltrqwkzfaht.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Dein service_role Key aus Schritt 3 |
| `DS24_IPN_PASSPHRASE` | Selbst gewähltes Passwort (z. B. `MeinPasswort2026!`) |
| `DS24_PRODUCT_ID_MONTHLY` | Produkt-ID aus Digistore24 (nur die Zahl) |
| `DS24_PRODUCT_ID_YEARLY` | Produkt-ID aus Digistore24 |
| `DS24_PRODUCT_ID_LIFETIME` | Produkt-ID aus Digistore24 |

Nach dem Speichern: **Deploys → Trigger deploy**

---

### SCHRITT 5 – Digistore24 Produkte anlegen

**Webseite:** https://www.digistore24.com

3 Produkte anlegen (Produkttyp: **Software**):

| Produkt | Preis | Zahlungstyp |
|---------|-------|-------------|
| Can I Afford It – Monatlich | 4,99 € | Abo (monatlich) |
| Can I Afford It – Jährlich | 39,99 € | Abo (jährlich) |
| Can I Afford It – Lifetime | 69,00 € | Einmalzahlung |

Bei **jedem der 3 Produkte** unter **Erweitert → IPN** eintragen:

- **IPN-URL:**
  ```
  https://DEINE-NETLIFY-URL.netlify.app/.netlify/functions/digistore-ipn
  ```
- **IPN-Passphrase:** dasselbe Passwort wie `DS24_IPN_PASSPHRASE` in Netlify

---

### SCHRITT 6 – Digistore24 Verkaufslinks in App eintragen

Öffne **`js/profile.js`** und suche diesen Block (ganz oben):

```js
const DS24_LINKS = {
  monthly:  "https://www.digistore24.com/product/PRODUKT_ID_MONAT",
  yearly:   "https://www.digistore24.com/product/PRODUKT_ID_JAHR",
  lifetime: "https://www.digistore24.com/product/PRODUKT_ID_LIFETIME"
};
```

Ersetze die 3 Platzhalter-URLs mit deinen echten Digistore24-Checkout-Links.

---

### SCHRITT 7 – Auf Netlify deployen

**Option A: Drag & Drop**
1. ZIP entpacken
2. Den Ordner auf https://app.netlify.com ziehen

**Option B: Git (empfohlen für Updates)**
1. Dateien in GitHub pushen
2. Netlify → "Import an existing project"
3. Build command: *(leer)*
4. Publish directory: `.`

---

## 🔄 So funktioniert der automatische IPN-Webhook

```
Kunde kauft bei Digistore24
        ↓
Digistore24 schickt POST an deine Netlify Function
        ↓
Function prüft Signatur (Sicherheit)
        ↓
Sucht Nutzer per E-Mail in Supabase
        ↓
Setzt is_premium = true (oder false bei Storno)
        ↓
Kunde ist sofort freigeschaltet ✅
```

Unterstützte Events:
- `payment` / `order_completed` → Premium AN
- `rebill` / `recurring_payment` → Abo-Verlängerung (bleibt AN)
- `refund` / `chargeback` / `cancel` → Premium AUS

---

## ✅ Checkliste vor Live-Gang

- [ ] Supabase SQL-Schema ausgeführt (supabase-schema.sql)
- [ ] Supabase Auth Site URL eingetragen
- [ ] Netlify Environment Variables gesetzt (6 Stück)
- [ ] Netlify neu deployt nach Variablen-Änderung
- [ ] Digistore24: 3 Produkte angelegt
- [ ] Digistore24: IPN-URL + Passphrase bei allen 3 Produkten eingetragen
- [ ] js/profile.js: echte Digistore24-Links eingetragen
- [ ] Registrierung, Login, Onboarding, Kauf-Check getestet
- [ ] Testkauf (Digistore24 hat eine Test-Funktion) → Premium wird automatisch freigeschaltet

---

## 🧮 Kernlogik

```
monthlyBudget   = income - fixedCosts - savingsGoal
remainingBudget = monthlyBudget - purchaseAmount

remainingBudget < 0                        → DANGER  🚫 "Lieber nicht."
remainingBudget < monthlyBudget × 20%      → WARNING ⚠️ "Machbar, aber knapp."
sonst                                       → SAFE    ✅ "Ja, problemlos."
```

---

## 🎨 Design

| Element | Wert |
|---------|------|
| Safe | `#22C55E` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |
| Akzent | `#0A84FF` |
| Hintergrund | `#000000` |
| Font | SF Pro / System Sans-Serif |
