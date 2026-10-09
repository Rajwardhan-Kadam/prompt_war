-- ================================================================
-- PROMPT WARS 2026 — SUPABASE DATABASE SCHEMA
-- ================================================================
-- Run this script in the Supabase SQL Editor:
-- 1. Creates tables: participants, submissions, event_state
-- 2. Sets up the public storage bucket for screenshots
-- 3. Configures Row Level Security (RLS) policies (Service Role Key access only)
-- 4. Seeds initial tournament event state
-- ================================================================

-- 1. PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY,
  registration_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  college TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face',
  round1_score NUMERIC DEFAULT 0,
  round2_score NUMERIC DEFAULT 0,
  round3_score NUMERIC DEFAULT 0,
  authenticity_bonus_total NUMERIC DEFAULT 0,
  total_score NUMERIC DEFAULT 0,
  rank INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'qualified_r2', 'qualified_r3', 'champion', 'disqualified')),
  submissions_count INTEGER DEFAULT 0,
  round1_task JSONB,
  round2_task JSONB,
  round3_task JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_participants_total_score ON public.participants (total_score DESC);
CREATE INDEX IF NOT EXISTS idx_participants_reg_id ON public.participants (registration_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON public.participants (email);

-- 2. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY,
  round_id INTEGER NOT NULL CHECK (round_id IN (1, 2, 3)),
  participant_id TEXT REFERENCES public.participants(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  college TEXT,
  registration_id TEXT NOT NULL,
  email TEXT NOT NULL,
  assigned_theme_or_chit TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  ai_tool_used TEXT NOT NULL,
  generated_output_summary TEXT,
  screenshot_url TEXT,
  demo_url TEXT,
  repo_url TEXT,
  authenticity JSONB NOT NULL,
  scores JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'evaluated', 'flagged_ai', 'disqualified')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_participant_round UNIQUE (participant_id, round_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_round ON public.submissions (round_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON public.submissions (participant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions (status);

-- 3. EVENT STATE TABLE (Single row configuration)
CREATE TABLE IF NOT EXISTS public.event_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  active_round INTEGER DEFAULT 2 CHECK (active_round IN (1, 2, 3)),
  timer_seconds_remaining INTEGER DEFAULT 600,
  is_timer_running BOOLEAN DEFAULT true,
  current_theme_round1 TEXT DEFAULT 'Bioluminescent Marine Ecosystem on an Alien Ocean Moon',
  scenario_chits_round2 JSONB DEFAULT '[]'::jsonb,
  product_requirements_round3 JSONB DEFAULT '[]'::jsonb,
  announcements JSONB DEFAULT '[]'::jsonb,
  is_leaderboard_published BOOLEAN DEFAULT false,
  published_rounds JSONB DEFAULT '{"round1": false, "round2": false, "round3": false}'::jsonb,
  is_round_active BOOLEAN DEFAULT true,
  round_statuses JSONB DEFAULT '{"round1": true, "round2": false, "round3": false}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Enabling RLS with NO public policies restricts all direct client access via Anon Key.
-- The Express backend accesses Supabase securely via the SUPABASE_SERVICE_ROLE_KEY.
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_state ENABLE ROW LEVEL SECURITY;

-- Remove any existing public policies if previously created
DROP POLICY IF EXISTS "Public Read Participants" ON public.participants;
DROP POLICY IF EXISTS "Public Insert Participants" ON public.participants;
DROP POLICY IF EXISTS "Public Update Participants" ON public.participants;
DROP POLICY IF EXISTS "Public Delete Participants" ON public.participants;

DROP POLICY IF EXISTS "Public Read Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Public Insert Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Public Update Submissions" ON public.submissions;
DROP POLICY IF EXISTS "Public Delete Submissions" ON public.submissions;

DROP POLICY IF EXISTS "Public Read Event State" ON public.event_state;
DROP POLICY IF EXISTS "Public Update Event State" ON public.event_state;
DROP POLICY IF EXISTS "Public Insert Event State" ON public.event_state;

-- 5. STORAGE BUCKET FOR SCREENSHOT ARTIFACTS
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-artifacts', 'submission-artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public Access Artifacts" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Artifacts" ON storage.objects;

CREATE POLICY "Public Access Artifacts" ON storage.objects
  FOR SELECT USING (bucket_id = 'submission-artifacts');

CREATE POLICY "Public Upload Artifacts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'submission-artifacts');

-- 6. SEED INITIAL TOURNAMENT STATE
INSERT INTO public.event_state (id, active_round, timer_seconds_remaining, is_timer_running, current_theme_round1, announcements)
VALUES (
  1,
  2,
  568,
  true,
  'Bioluminescent Marine Ecosystem on an Alien Ocean Moon',
  '[{"id":"ann-1","time":"11:15 AM","message":"Round 02 Scenario Sprint is LIVE! Draw your random 15-word situation chit and convert to prompt.","type":"urgent"}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  active_round = EXCLUDED.active_round,
  updated_at = NOW();
