-- Migration 008: Add owner_id to profiles for employee management
-- Purpose: Link employees to their admin/owner

-- 1. Add owner_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_owner ON profiles(owner_id);

-- 3. For existing admins, set owner_id to themselves (self-owned)
UPDATE profiles SET owner_id = id WHERE role = 'admin' AND owner_id IS NULL;

-- 4. For existing users who have account_id, link them to the admin of that account
-- This matches cashiers to their admin based on account_id
UPDATE profiles 
SET owner_id = (
    SELECT p.id FROM profiles p 
    WHERE p.account_id = profiles.account_id 
    AND p.role = 'admin' 
    LIMIT 1
)
WHERE role = 'cashier' 
AND owner_id IS NULL 
AND account_id IS NOT NULL;

-- 5. Update RLS policy for profiles to allow admins to see their employees
-- First, let's check existing policies and update them
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Allow users to view their own profile and any profiles they own (their employees)
CREATE POLICY "Users can view own and employee profiles" ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR 
        owner_id = auth.uid()
    );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN profiles.owner_id IS 'The admin user who owns this employee account';

