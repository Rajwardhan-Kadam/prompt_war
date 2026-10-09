-- Migration: Add round3_task column to participants table
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS round3_task JSONB;
