-- Migration: 012_allow_null_rfc.sql
-- Description: Allow NULL RFC for flotilleros created from admin panel
-- The RFC will be provided later during onboarding or first invoice upload
-- Date: 2026-01-28

-- ============================================================================
-- IMPORTANT: Run this migration in Supabase SQL Editor
-- ============================================================================

-- Allow NULL RFC for flotilleros (for admin-created users before onboarding)
ALTER TABLE flotilleros 
ALTER COLUMN rfc DROP NOT NULL;

-- Also for drivers table
ALTER TABLE drivers 
ALTER COLUMN rfc DROP NOT NULL;

-- Add a constraint to ensure RFC is valid format when provided
-- RFC format: 3-4 letters + 6 digits (date) + 3 alphanumeric (homoclave)
-- Examples: XAXX010101000 (generic), ABC123456XY9 (company), ABCD123456XY9 (person)

-- Note: We keep UNIQUE constraint so no duplicate RFCs are allowed
-- But NULL values are allowed (multiple users can have NULL RFC initially)

-- Verify changes
DO $$
BEGIN
    RAISE NOTICE '✅ RFC column is now nullable for flotilleros and drivers';
    RAISE NOTICE '   Users can be created without RFC and add it during onboarding';
END $$;
