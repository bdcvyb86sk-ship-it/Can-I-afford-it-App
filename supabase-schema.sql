-- ============================================
-- Can I Afford It? – Supabase Datenbankschema
-- Dieses SQL im Supabase SQL-Editor ausführen:
-- supabase.com → dein Projekt → SQL Editor → New Query
-- ============================================

-- 1. Profiles-Tabelle (ersetzt Firestore users-Collection)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  income NUMERIC DEFAULT 0,
  fixed_costs NUMERIC DEFAULT 0,
  savings_goal NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_plan TEXT,
  premium_since TIMESTAMPTZ,
  premium_expires_at TIMESTAMPTZ,
  premium_updated_at TIMESTAMPTZ,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Checks-Tabelle (ersetzt Firestore checks-Subcollection)
CREATE TABLE IF NOT EXISTS public.checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  purchase_amount NUMERIC NOT NULL,
  category TEXT DEFAULT 'Sonstiges',
  monthly_budget NUMERIC,
  remaining_budget NUMERIC,
  status TEXT CHECK (status IN ('safe', 'warning', 'danger')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pending Premiums (für Käufer die noch kein Konto haben)
CREATE TABLE IF NOT EXISTS public.pending_premiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  event_type TEXT,
  order_id TEXT,
  plan TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) aktivieren
-- Nutzer dürfen nur ihre eigenen Daten lesen/schreiben
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_premiums ENABLE ROW LEVEL SECURITY;

-- Profiles: nur eigene Zeile
CREATE POLICY "Eigenes Profil lesen" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Eigenes Profil schreiben" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Eigenes Profil aktualisieren" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Checks: nur eigene Einträge
CREATE POLICY "Eigene Checks lesen" ON public.checks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Eigene Checks erstellen" ON public.checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pending Premiums: kein Client-Zugriff (nur Service Role / Webhook)
CREATE POLICY "Kein Zugriff fuer Clients" ON public.pending_premiums
  FOR ALL USING (FALSE);

-- ============================================
-- INDEX für Performance
-- ============================================

CREATE INDEX IF NOT EXISTS checks_user_id_idx ON public.checks(user_id);
CREATE INDEX IF NOT EXISTS checks_created_at_idx ON public.checks(created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- ============================================
-- ZUSATZ: Fixkosten-Manager Tabelle (NEU)
-- Dieses SQL ZUSÄTZLICH im Supabase SQL-Editor ausführen
-- (nur wenn du bereits das Basis-Schema ausgeführt hast)
-- ============================================

CREATE TABLE IF NOT EXISTS public.fixkosten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fixkosten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eigene Fixkosten lesen" ON public.fixkosten
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Eigene Fixkosten erstellen" ON public.fixkosten
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Eigene Fixkosten loeschen" ON public.fixkosten
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS fixkosten_user_id_idx ON public.fixkosten(user_id);
