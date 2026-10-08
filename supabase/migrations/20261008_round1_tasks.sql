-- Migration: Add round1_task column to participants table
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS round1_task JSONB;
