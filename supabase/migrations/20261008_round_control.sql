-- Add round control status columns to event_state table
ALTER TABLE public.event_state
ADD COLUMN IF NOT EXISTS is_round_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS round_statuses JSONB DEFAULT '{"round1": true, "round2": false, "round3": false}'::jsonb;
