-- Migration: 012_allow_null_rfc.sql
-- Description: Allow NULL for columns that are completed during onboarding
-- Users created from admin panel only have email and phone initially
-- Date: 2026-01-28

-- ============================================================================
-- IMPORTANT: Run this migration in Supabase SQL Editor
-- ============================================================================

-- ========================================
-- FLOTILLEROS - Make onboarding fields optional
-- ========================================
ALTER TABLE flotilleros ALTER COLUMN rfc DROP NOT NULL;
ALTER TABLE flotilleros ALTER COLUMN fiscal_name DROP NOT NULL;

-- ========================================
-- DRIVERS - Make onboarding fields optional
-- ========================================
ALTER TABLE drivers ALTER COLUMN rfc DROP NOT NULL;
ALTER TABLE drivers ALTER COLUMN fiscal_name DROP NOT NULL;
ALTER TABLE drivers ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE drivers ALTER COLUMN last_name DROP NOT NULL;

-- ========================================
-- Notes:
-- ========================================
-- - UNIQUE constraints are kept (no duplicate RFCs when provided)
-- - NULL values are allowed (multiple users can have NULL initially)
-- - These fields will be completed during:
--   1. User onboarding wizard
--   2. First invoice upload
--   3. Admin manual update

-- Verify changes
DO $$
BEGIN
    RAISE NOTICE '✅ Columns are now nullable for admin-created users';
    RAISE NOTICE '   - flotilleros: rfc, fiscal_name';
    RAISE NOTICE '   - drivers: rfc, fiscal_name, first_name, last_name';
END $$;
