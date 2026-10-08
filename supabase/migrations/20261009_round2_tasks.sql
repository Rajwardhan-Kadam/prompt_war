-- Migration: Add round2_task column to participants table
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS round2_task JSONB;
