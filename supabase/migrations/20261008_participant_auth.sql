-- Migration: Participant Identity, Submission Constraints, and RLS Clean-up
-- Created: 2026-10-08

-- 1. Modify participants table constraints
ALTER TABLE public.participants ALTER COLUMN college DROP NOT NULL;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'participants_email_key'
    ) THEN
        ALTER TABLE public.participants ADD CONSTRAINT participants_email_key UNIQUE (email);
    END IF;
END $$;

-- 2. Modify submissions table constraints
ALTER TABLE public.submissions ALTER COLUMN college DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_participant_round'
    ) THEN
        ALTER TABLE public.participants DELETE FROM public.participants WHERE id LIKE 'p-%';
        ALTER TABLE public.submissions ADD CONSTRAINT unique_participant_round UNIQUE (participant_id, round_id);
    END IF;
END $$;

-- 3. Revoke public RLS policies
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_state ENABLE ROW LEVEL SECURITY;

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
