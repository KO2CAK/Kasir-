-- ============================================
-- Migration 005: Add QRIS Image Support
-- ============================================

-- Add qris_image_url column to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS qris_image_url TEXT;

-- Update existing row if needed
UPDATE public.store_settings 
SET qris_image_url = NULL 
WHERE qris_image_url IS NULL;

